
import express from 'express';
import * as http from 'node:http';

import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';

const isolation = setupTestDatabaseIsolation(
  'f5_related_data_privacy'
);

let server: http.Server | undefined;
let passed = 0;
let failed = 0;

function check(condition: boolean, label: string) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${label}`);
  if (condition) passed++;
  else failed++;
}

async function main() {
  const makeUser = (name: string, role: string) =>
    userRepository.createUser({
      name,
      email: `f5-related-${name.toLowerCase()}@example.test`,
      role
    } as any);

  const owner = makeUser('RelatedOwner', 'customer');
  const tech = makeUser('RelatedTech', 'technician');

  const mCase = maintenanceRepository.createCase({
    title: 'Inverter fault',
    description: 'Technical inverter inspection',
    projectId: 'CUSTOMER_DIRECT',
    assetId: 'F5-RELATED-ASSET',
    status: 'ASSIGNED',
    category: 'CORRECTIVE',
    priority: 'MEDIUM',
    alertIds: [],
    reportedBy: owner.id,
    assignedTechnicianId: tech.id
  } as any);

  const privateAI = 'F5_PRIVATE_RAW_AI_RESPONSE';
  const privateHash = 'F5_PRIVATE_PAYLOAD_HASH';
  const privateRequest = 'F5_PRIVATE_CLIENT_REQUEST_ID';
  const safeRecommendation = 'F5_SAFE_CHECK_INVERTER';
   const privateNested = 'F5_PRIVATE_NESTED_CUSTOMER_CONTACT_938';

  const diagnosis = maintenanceRepository.createDiagnosis({
    projectId: 'CUSTOMER_DIRECT',
    assetId: mCase.assetId,
    diagnosisStatus: 'COMPLETED',
    method: 'AI_ASSISTED',
    recommendedActions: [
  safeRecommendation,
  {
    action: 'CHECK_INVERTER',
    internalMetadata: {
      customerContact: privateNested
    }
  }
],
    rawAiResponse: {
      confidentialInternalData: privateAI
    },
    generatedBy: owner.id
  } as any);

  maintenanceRepository.updateCase(mCase.id, {
    diagnosisId: diagnosis.id
  } as any);

  maintenanceRepository.createAction({
    maintenanceCaseId: mCase.id,
    actionType: 'INSPECTION',
    description: 'Visual inverter inspection',
    performedBy: owner.id,
    performedAt: new Date().toISOString(),
    payloadHash: privateHash,
    clientRequestId: privateRequest
  } as any);

  const app = express();
  app.use(express.json());
  app.use(maintenanceRouter);

  server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server!.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Test server address unavailable');
  }

  const base = `http://127.0.0.1:${address.port}`;

  async function detail(user: any) {
    const token = jwtService.sign({
      userId: user.id,
      role: user.role
    });

    const response = await fetch(`${base}/cases/${mCase.id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return {
      status: response.status,
      body: await response.text()
    };
  }

  // Before formal acceptance
  const before = await detail(tech);

  check(
    before.status === 200,
    'Unaccepted assigned technician receives restricted case'
  );

  check(
    !before.body.includes(privateAI),
    'Unaccepted technician cannot read raw AI response'
  );

  check(
    !before.body.includes(privateHash),
    'Unaccepted technician cannot read payload hash'
  );

  check(
    !before.body.includes(privateRequest),
    'Unaccepted technician cannot read client request ID'
  );

  // Simulate formal acceptance of the current assignment cycle.
  maintenanceRepository.createAssignmentHistory({
    maintenanceCaseId: mCase.id,
    technicianId: tech.id,
    assignedBy: tech.id,
    status: 'ACCEPTED',
    notes: 'Test formal acceptance'
  } as any);

  maintenanceRepository.updateCase(mCase.id, {
    status: 'IN_PROGRESS'
  } as any);

  const accepted = await detail(tech);

  check(
    accepted.status === 200,
    'Accepted technician receives case'
  );

  check(
    !accepted.body.includes(privateAI),
    'Accepted technician cannot read raw AI response'
  );

  check(
    !accepted.body.includes(privateHash),
    'Accepted technician cannot read payload hash'
  );

  check(
    !accepted.body.includes(privateRequest),
    'Accepted technician cannot read client request ID'
  );

  check(
    accepted.body.includes(safeRecommendation),
    'Accepted technician retains safe technical recommendation'
  );

  const ownerResponse = await detail(owner);

  check(
    ownerResponse.status === 200,
    'Case owner retains access'
  );

  check(
    ownerResponse.body.includes(privateAI),
    'Case owner retains full diagnosis record'
  );

  check(
    !accepted.body.includes(privateNested),
    'Accepted technician cannot read nested private customer metadata'
  );

  check(
    ownerResponse.body.includes(privateNested),
    'Case owner retains nested diagnosis metadata'
  );

  console.log(
    `RELATED DATA PRIVACY SUMMARY: ${passed} PASSED, ${failed} FAILED`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('TEST ERROR:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }

    try {
      isolation.verifyImmutability();
    } finally {
      isolation.cleanup();
    }
  });
