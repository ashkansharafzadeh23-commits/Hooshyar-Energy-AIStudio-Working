/**
 * Stage 13.11-F.5 / LOCAL-SNAPSHOT privacy regression (test only).
 * This is a security-specification test: it FAILS if seeded private data leak.
 * Requires scripts/test_isolation_guard.ts; never writes repository db.json.
 * No production files or Git operations are modified.
 */
import * as http from 'node:http';
import express from 'express';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';

const isolation = setupTestDatabaseIsolation('f5_local_freeform_privacy_gate');
let server: http.Server | undefined;
let passed = 0;
let failed = 0;
function check(ok: boolean, name: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (ok) passed++; else failed++;
}

async function main() {
  const owner = userRepository.createUser({name:'F5TestOwner',email:'f5-local-owner@example.test',role:'customer'} as any);
  const tech = userRepository.createUser({name:'F5TestTech',email:'f5-local-tech@example.test',role:'technician'} as any);
  const outsider = userRepository.createUser({name:'F5TestOutsider',email:'f5-local-outsider@example.test',role:'customer'} as any);
  const mCase = maintenanceRepository.createCase({
    title:'Solar inverter test',description:'Isolated technical investigation',
    projectId:'CUSTOMER_DIRECT', assetId:'F5-LOCAL-SECURITY-TEST-ASSET',
    status:'ASSIGNED',category:'INVERTER',priority:'MEDIUM',alertIds:[],
    reportedBy:owner.id,assignedTechnicianId:tech.id
  } as any);
  const markers = {
    raw:'F5_LOCAL_SECRET_RAW_AI_PROMPT',
    facts:'F5_LOCAL_SECRET_CUSTOMER_NATIONAL_ID',
    nested:'F5_LOCAL_SECRET_NESTED_BILL_ACCOUNT',
    evidence:'F5_LOCAL_SECRET_GATE_ACCESS_CODE',
    tools:'F5_LOCAL_SECRET_TOOL_METADATA'
  };
  const technical='F5_LOCAL_SAFE_INSPECT_DC_ISOLATOR';
  const diagnosis=maintenanceRepository.createDiagnosis({
    projectId:'CUSTOMER_DIRECT',assetId:mCase.assetId,
    diagnosisStatus:'COMPLETED',method:'AI_ASSISTED',confidence:0.91,
    facts:[technical,`Customer national ID: ${markers.facts}`],
    inferences:[{description:technical,privateAccount:markers.nested}],
    possibleCauses:['Inverter overload'],
    evidence:[`Site entry pin: ${markers.evidence}`],
    symptoms:['DC-side undervoltage'],
    requiredTools:['Digital multimeter',{name:'Meter',internalCustomerInfo:markers.tools}],
    requiredParts:['Approved DC fuse'],
    safetyGuidance:['Isolate the DC circuit before servicing'],
    rawAiResponse:{systemPrompt:markers.raw}
  } as any);
  maintenanceRepository.updateCase(mCase.id,{diagnosisId:diagnosis.id} as any);
  maintenanceRepository.createAssignmentHistory({
    maintenanceCaseId:mCase.id,technicianId:tech.id,
    assignedBy:owner.id,status:'ASSIGNED',notes:'Assigned for isolated test'
  } as any);
  const app=express();
  app.use(express.json());
  app.use(maintenanceRouter);
  server=http.createServer(app);
  await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
  const addr=server.address();
  if(!addr || typeof addr==='string') throw new Error('Test HTTP port unavailable');
   const port = addr.port;
  async function detail(user:typeof owner) {
    const token=jwtService.sign({userId:user.id,role:user.role});
    const response=await fetch(`http://127.0.0.1:${port}/cases/${mCase.id}`,{
      headers:{Authorization:`Bearer ${token}`}
    });
    const body=await response.text();
    return {status:response.status,body};
  }
  const before=await detail(tech);
  check(before.status===200,'Assigned technician can view restricted case');
  check(!before.body.includes(technical),'Unaccepted technician cannot access diagnosis guidance');
  const unrelated=await detail(outsider);
  check(unrelated.status===403 || unrelated.status===404,'Unrelated customer denied case');
  maintenanceRepository.createAssignmentHistory({
    maintenanceCaseId:mCase.id,technicianId:tech.id,
    assignedBy:tech.id,status:'ACCEPTED',notes:'Accepted current cycle'
  } as any);
  maintenanceRepository.updateCase(mCase.id,{status:'IN_PROGRESS'} as any);
  const accepted=await detail(tech);
  check(accepted.status===200,'Formally accepted technician can view case');
  check(accepted.body.includes(technical),'Safe diagnostic guidance preserved');
  check(!accepted.body.includes(markers.raw),'Raw AI response never exposed');
  check(!accepted.body.includes(markers.facts),'Customer ID in freeform facts withheld');
  check(!accepted.body.includes(markers.nested),'Nested private account withheld');
  check(!accepted.body.includes(markers.evidence),'Gate access code in evidence withheld');
  check(!accepted.body.includes(markers.tools),'Nested tool metadata withheld');
  const reporter=await detail(owner);
  check(reporter.status===200,'Reporter retains case access');
  check(reporter.body.includes(markers.raw),'Reporter raw diagnosis record unchanged');
  console.log(`F5 LOCAL FREEFORM PRIVACY GATE: ${passed} PASSED, ${failed} FAILED`);
  if(failed) process.exitCode=1;
}
main().catch(err=>{console.error('TEST ERROR',err);process.exitCode=1;})
  .finally(async()=>{
    if(server) await new Promise<void>(resolve=>server!.close(()=>resolve()));
    isolation.cleanup();
  });
