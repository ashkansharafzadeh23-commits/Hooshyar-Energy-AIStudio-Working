
import express from 'express';
import * as http from 'node:http';

import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { projectRepository } from '../src/repositories/projectRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';

const isolation = setupTestDatabaseIsolation('f5_warranty_privacy');

let server: http.Server | undefined;
let passed = 0;
let failed = 0;

const SECRET_COVERAGE = 'F5_WARRANTY_PRIVATE_COVERAGE_731';
const SECRET_PROCEDURE = 'F5_WARRANTY_PRIVATE_CLAIM_842';

function check(condition: boolean, label: string) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${label}`);
  if (condition) passed++;
  else failed++;
}

async function main() {
  const makeUser = (name: string, role: string) =>
    userRepository.createUser({
      name,
      email: `f5-warranty-${name.toLowerCase()}@example.test`,
      role
    } as any);

  const owner = makeUser('WarrantyOwner', 'customer');
  const techA = makeUser('WarrantyTechA', 'technician');
  const techB = makeUser('WarrantyTechB', 'technician');
  const outsider = makeUser('WarrantyOutsider', 'customer');
  const admin = makeUser('WarrantyAdmin', 'ADMIN');

  const project = projectRepository.create({
    projectCode: 'F5-WARRANTY-PRIVACY',
    title: 'F5 Solar Warranty Test',
    projectType: 'SOLAR',
    status: 'OPERATIONAL',
    ownerId: owner.id,
    targetCapacityKw: 50,
    location: {
      country: 'Iran',
      province: 'Tehran',
      city: 'Tehran',
      address: 'ISOLATED TEST LOCATION'
    }
  } as any);

  const asset = assetRepository.createAsset({
    projectId: project.id,
    name: 'F5 Test Solar Inverter',
    assetType: 'SOLAR',
    location: 'TEST LOCATION',
    installedCapacityKw: 50,
    technology: 'Solar Inverter',
    verificationStatus: 'VERIFIED',
    passportVersion: 1,
    status: 'OPERATIONAL'
  } as any);

  const warranty = assetRepository.createEquipmentWarranty({
    assetId: asset.id,
    projectId: project.id,
    warrantyType: 'MANUFACTURER',
    startDate: '2025-01-01',
    endDate: '2035-01-01',
    coverageSummary: SECRET_COVERAGE,
    claimProcedure: SECRET_PROCEDURE,
    status: 'ACTIVE'
  } as any);

  const seeded = assetRepository.getEquipmentWarranties(asset.id);

  check(
    Boolean(
      assetRepository.getAssetById(asset.id) &&
      seeded.some(w =>
        w.id === warranty.id &&
        w.coverageSummary === SECRET_COVERAGE
      )
    ),
    'Real isolated asset and warranty exist'
  );

  if (
    !seeded.some(w => w.id === warranty.id) ||
    !assetRepository.getAssetById(asset.id)
  ) {
    throw new Error('Warranty test fixture invalid; stopping');
  }

  function createCase(title: string, technicianId: string) {
    return maintenanceRepository.createCase({
      title,
      description: 'Solar inverter inspection',
      projectId: project.id,
      assetId: asset.id,
      status: 'ASSIGNED',
      category: 'CORRECTIVE',
      priority: 'MEDIUM',
      alertIds: [],
      reportedBy: owner.id,
      assignedTechnicianId: technicianId
    } as any);
  }

  function accept(caseId: string, technicianId: string) {
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseId,
      technicianId,
      assignedBy: technicianId,
      status: 'ACCEPTED',
      notes: 'F5 isolated test acceptance'
    } as any);

    maintenanceRepository.updateCase(caseId, {
      status: 'IN_PROGRESS'
    } as any);
  }

  const app = express();
  app.use(express.json());
  app.use(maintenanceRouter);

  server = http.createServer(app);

  await new Promise<void>(resolve => {
    server!.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Test server unavailable');
  }

  const base = `http://127.0.0.1:${address.port}`;

  async function readCase(user: any, caseId: string) {
    const token = jwtService.sign({
      userId: user.id,
      role: user.role
    });

    const response = await fetch(`${base}/cases/${caseId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const raw = await response.text();
    let body: any = null;

    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }

    return {
      status: response.status,
      body,
      raw
    };
  }

  const hasWarranty = (result: { body: any }) =>
    result.body?.warranty?.coverageSummary === SECRET_COVERAGE &&
    result.body?.warranty?.claimProcedure === SECRET_PROCEDURE;

  const hidesWarranty = (result: { body: any; raw: string }) =>
    !result.raw.includes(SECRET_COVERAGE) &&
    !result.raw.includes(SECRET_PROCEDURE) &&
    (result.body?.warranty === null ||
      result.body?.warranty === undefined);

  // Current technician: before and after acceptance
  const case1 = createCase('F5 Warranty Access', techA.id);

  const before = await readCase(techA, case1.id);
  check(
    before.status === 200 && hidesWarranty(before),
    'Unaccepted technician cannot read warranty'
  );

  const ownerResult = await readCase(owner, case1.id);
  check(
    ownerResult.status === 200 && hasWarranty(ownerResult),
    'Owner retains warranty access'
  );

  const adminResult = await readCase(admin, case1.id);
  check(
    adminResult.status === 200 && hasWarranty(adminResult),
    'Administrator retains warranty access'
  );

  const outsiderResult = await readCase(outsider, case1.id);
  check(
    outsiderResult.status === 403 ||
    outsiderResult.status === 404,
    'Unrelated user is denied'
  );
  check(
    !outsiderResult.raw.includes(SECRET_COVERAGE) &&
    !outsiderResult.raw.includes(SECRET_PROCEDURE),
    'Unrelated user receives no warranty secrets'
  );

  accept(case1.id, techA.id);

  const acceptedA = await readCase(techA, case1.id);
  check(
    acceptedA.status === 200 && hasWarranty(acceptedA),
    'Accepted current technician receives authorized warranty'
  );

  // Reassignment: previous technician must lose access
  maintenanceRepository.updateCase(case1.id, {
    assignedTechnicianId: techB.id,
    status: 'ASSIGNED'
  } as any);

  maintenanceRepository.createAssignmentHistory({
    maintenanceCaseId: case1.id,
    technicianId: techB.id,
    assignedBy: owner.id,
    status: 'ASSIGNED',
    notes: 'New assignment cycle'
  } as any);

  const former = await readCase(techA, case1.id);
  check(
    !former.raw.includes(SECRET_COVERAGE) &&
    !former.raw.includes(SECRET_PROCEDURE),
    'Former technician cannot read warranty after reassignment'
  );

  const newBefore = await readCase(techB, case1.id);
  check(
    newBefore.status === 200 && hidesWarranty(newBefore),
    'New unaccepted technician cannot inherit old acceptance'
  );

  accept(case1.id, techB.id);

  const acceptedB = await readCase(techB, case1.id);
  check(
    acceptedB.status === 200 && hasWarranty(acceptedB),
    'New technician gains warranty access only after acceptance'
  );

  // Terminal states use separate cases
  const cancelledCase = createCase('F5 Cancelled Warranty', techA.id);
  accept(cancelledCase.id, techA.id);

  maintenanceRepository.updateCase(cancelledCase.id, {
    status: 'CANCELLED'
  } as any);

  const cancelled = await readCase(techA, cancelledCase.id);
  check(
    !cancelled.raw.includes(SECRET_COVERAGE) &&
    !cancelled.raw.includes(SECRET_PROCEDURE),
    'Cancelled case hides warranty from technician'
  );

  const closedCase = createCase('F5 Closed Warranty', techA.id);
  accept(closedCase.id, techA.id);

  maintenanceRepository.updateCase(closedCase.id, {
    status: 'CLOSED'
  } as any);

  const closed = await readCase(techA, closedCase.id);
  check(
    !closed.raw.includes(SECRET_COVERAGE) &&
    !closed.raw.includes(SECRET_PROCEDURE),
    'Closed case hides warranty from technician'
  );

  const ownerClosed = await readCase(owner, closedCase.id);
  check(
    ownerClosed.status === 200 && hasWarranty(ownerClosed),
    'Owner retains access on closed case'
  );

  console.log(
    `WARRANTY PRIVACY SUMMARY: ${passed} PASSED, ${failed} FAILED`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch(error => {
    console.error('TEST ERROR:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      await new Promise<void>(resolve => {
        server!.close(() => resolve());
      });
    }

    try {
      isolation.verifyImmutability();
    } finally {
      isolation.cleanup();
    }
  });
