
import express from 'express';
import * as http from 'node:http';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';

const isolation = setupTestDatabaseIsolation('f5_http_privacy_extended');
let server: http.Server | undefined;
let passed = 0;
let failed = 0;

function check(condition: boolean, name: string) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${name}`);
  if (condition) passed++;
  else failed++;
}

async function main() {
  const makeUser = (name: string, role: string) =>
    userRepository.createUser({
      name,
      email: `f5-${name.toLowerCase()}@example.test`,
      role
    } as any);

  const owner = makeUser('PrivacyOwner', 'customer');
  const techA = makeUser('PrivacyTechA', 'technician');
  const techB = makeUser('PrivacyTechB', 'technician');
  const outsider = makeUser('PrivacyOutsider', 'customer');

  const secretHistory = 'F5_PRIVATE_DISPATCHER_NOTE';
  const secretAction = 'F5_PRIVATE_ACTION_DESCRIPTION';

  const mCase = maintenanceRepository.createCase({
    title: 'Synthetic solar inverter fault',
    description: 'Isolated HTTP security test',
    projectId: 'CUSTOMER_DIRECT',
    assetId: 'F5-PRIVACY-TEST-ASSET',
    status: 'ASSIGNED',
    category: 'INVERTER',
    priority: 'MEDIUM',
    alertIds: [],
    reportedBy: owner.id,
    assignedTechnicianId: techA.id
  } as any);
  const sensitiveFields = {
    phone: 'F5_HTTP_PRIVATE_PHONE',
    photo: 'F5_HTTP_PRIVATE_PHOTO',
    document: 'F5_HTTP_PRIVATE_DOCUMENT',
    diagnosis: 'F5_HTTP_PRIVATE_DIAGNOSIS',
    unknown: 'F5_HTTP_PRIVATE_UNKNOWN',
    address: 'F5_HTTP_PRIVATE_ADDRESS'
  };

  maintenanceRepository.updateCase(mCase.id, {
    title: `Inverter fault ${sensitiveFields.address}`,
    description: `Customer contact ${sensitiveFields.phone}`,
    contactPhone: sensitiveFields.phone,
    photos: [sensitiveFields.photo],
    documents: [sensitiveFields.document],
    diagnosisId: sensitiveFields.diagnosis,
    confidentialGatePin: sensitiveFields.unknown
  } as any);

  const addHistory = (
    technicianId: string,
    status: 'ASSIGNED' | 'ACCEPTED',
    assignedBy: string,
    notes: string
  ) => maintenanceRepository.createAssignmentHistory({
    maintenanceCaseId: mCase.id,
    technicianId,
    assignedBy,
    status,
    notes
  });

  addHistory(techA.id, 'ASSIGNED', owner.id, secretHistory);

  maintenanceRepository.createAction({
    maintenanceCaseId: mCase.id,
    actionType: 'INSPECTION',
    description: secretAction,
    notes: secretAction,
    performedBy: owner.id,
    performedAt: new Date().toISOString()
  } as any);

  const app = express();
  app.use(express.json());
  app.use(maintenanceRouter);

  server = http.createServer(app);
  await new Promise<void>(resolve =>
    server!.listen(0, '127.0.0.1', resolve)
  );

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Cannot obtain local port');
  }

  const base = `http://127.0.0.1:${address.port}`;

  async function request(
    user: any | null,
    path: string
  ): Promise<{ status: number; body: string }> {
    const headers: Record<string, string> = {};
    if (user) {
      headers.Authorization = `Bearer ${jwtService.sign({
        userId: user.id,
        role: user.role
      })}`;
    }

    const response = await fetch(`${base}${path}`, { headers });
    return {
      status: response.status,
      body: await response.text()
    };
  }

  const detail = (user: any | null) =>
    request(user, `/cases/${mCase.id}`);

  const actions = (user: any | null) =>
    request(user, `/cases/${mCase.id}/actions`);

  // 1. Unauthenticated and unrelated access
  const anonymous = await detail(null);
  check(anonymous.status === 401,
    'Unauthenticated caller is denied');

  const unrelated = await detail(outsider);
  check(unrelated.status === 403 || unrelated.status === 404,
    'Unrelated caller is denied');

  // 2. Reporter must preserve legitimate access
  const ownerResponse = await detail(owner);
  check(ownerResponse.status === 200 &&
    ownerResponse.body.includes(secretHistory),
    'Owner retains access to assignment history');

  // 3. Before formal technician acceptance
  // F.5: Audit technician list endpoints before formal acceptance.
  const listEndpoints = [
    '/cases',
    '/maintenance/cases',
    '/technician/cases'
  ];

  for (const endpoint of listEndpoints) {
    const response = await request(techA, endpoint);

    check(
      response.status === 200,
      `Technician can access ${endpoint}`
    );

    if (response.status === 200) {
      const exposedFields = Object.entries(sensitiveFields)
        .filter(([, secret]) => response.body.includes(secret))
        .map(([field]) => field);

      check(
        exposedFields.length === 0,
        `No sensitive data exposed through ${endpoint}` +
        (exposedFields.length
          ? ` [EXPOSED: ${exposedFields.join(', ')}]`
          : '')
      );
    }
  }
  const preAcceptDetail = await detail(techA);
   const sensitiveResponse = preAcceptDetail.body;

  for (const [field, secret] of Object.entries(sensitiveFields)) {
    check(
      !sensitiveResponse.includes(secret),
      `HTTP pre-acceptance: ${field} is not exposed`
    );
  }
   const preAcceptData = JSON.parse(preAcceptDetail.body);

   console.log('PRIVACY_DIAGNOSTIC:', {
  httpStatus: preAcceptDetail.status,
  actionsField: Array.isArray(preAcceptData.actions)
    ? preAcceptData.actions.length
    : 'NOT_ARRAY',
  actionsTakenPresent: Object.prototype.hasOwnProperty.call(
    preAcceptData,
    'actionsTaken'
  ),
  actionsTakenContainsSecret: JSON.stringify(
    preAcceptData.actionsTaken ?? null
  ).includes(secretAction),
  descriptionContainsSecret: JSON.stringify(
    preAcceptData.description ?? null
  ).includes(secretAction),
  privateActionInResponse: preAcceptDetail.body.includes(secretAction)
});
  check(preAcceptDetail.status === 200 &&
    !preAcceptDetail.body.includes(secretHistory),
    'Unaccepted technician cannot see dispatcher notes');

  check(!preAcceptDetail.body.includes(secretAction),
    'Unaccepted technician cannot see private actions in case detail');

  const preAcceptActions = await actions(techA);
  check(preAcceptActions.status !== 200 ||
    !preAcceptActions.body.includes(secretAction),
    'Unaccepted technician cannot retrieve private actions endpoint');

  // 4. Current assignment formal acceptance
  addHistory(
    techA.id, 'ACCEPTED', techA.id,
    'Technician A accepted current assignment'
  );
  maintenanceRepository.updateCase(mCase.id, {
    status: 'IN_PROGRESS'
  });

  const accepted = await detail(techA);
const acceptedData = JSON.parse(accepted.body);

check(
  accepted.status === 200 &&
  acceptedData.description ===
    `Customer contact ${sensitiveFields.phone}`,
  'Accepted technician retains operational description'
);

check(
  acceptedData.contactPhone === sensitiveFields.phone,
  'Accepted technician receives authorized customer contact'
);

check(
  !Object.prototype.hasOwnProperty.call(
    acceptedData,
    'confidentialGatePin'
  ),
  'Accepted technician cannot read unknown private field'
);

check(
  acceptedData.billDoc === undefined &&
  acceptedData.diagnosisId === undefined,
  'Accepted technician cannot read bill document or diagnosis ID'
);
  check(accepted.status === 200 &&
    !accepted.body.includes(secretHistory),
    'Accepted technician still cannot see dispatcher private notes');

  // 5. Reassignment to technician B
  maintenanceRepository.updateCase(mCase.id, {
    assignedTechnicianId: techB.id,
    status: 'ASSIGNED'
  });
  addHistory(techB.id, 'ASSIGNED', owner.id,
    'F5_PRIVATE_NEW_ASSIGNMENT_NOTE');

  const formerA = await detail(techA);
  check(formerA.status === 403 || formerA.status === 404,
    'Former technician A loses case detail access');

  const formerAActions = await actions(techA);
  check(formerAActions.status === 403 || formerAActions.status === 404,
    'Former technician A loses actions access');

  const newB = await detail(techB);
  check(newB.status === 200 &&
    !newB.body.includes(secretHistory) &&
    !newB.body.includes('F5_PRIVATE_NEW_ASSIGNMENT_NOTE'),
    'New unaccepted technician B sees no private assignment notes');

  // 6. Reassignment B -> A: old acceptance must not count
  maintenanceRepository.updateCase(mCase.id, {
    assignedTechnicianId: techA.id,
    status: 'ASSIGNED'
  });
  addHistory(techA.id, 'ASSIGNED', owner.id,
    'F5_PRIVATE_REASSIGNMENT_NOTE');

  const returnedA = await detail(techA);
  check(returnedA.status === 200 &&
    !returnedA.body.includes(secretAction),
    'Previous acceptance does not unlock private actions in new cycle');

  // 7. Terminal privacy
  maintenanceRepository.updateCase(mCase.id, {
    status: 'CANCELLED'
  });

  const cancelled = await detail(techA);
for (const [field, secret] of Object.entries(sensitiveFields)) {
  check(
    !cancelled.body.includes(secret),
    `HTTP CANCELLED: ${field} is not exposed`
  );
}
  check(cancelled.status === 200 &&
    !cancelled.body.includes(secretHistory) &&
    !cancelled.body.includes(secretAction),
    'Cancelled case hides private information in case detail');

  const cancelledActions = await actions(techA);
  check(cancelledActions.status !== 200 ||
    !cancelledActions.body.includes(secretAction),
    'Cancelled case does not expose private actions endpoint');

  maintenanceRepository.updateCase(mCase.id, {
    status: 'CLOSED'
  });

  const closed = await detail(techA);
for (const [field, secret] of Object.entries(sensitiveFields)) {
  check(
    !closed.body.includes(secret),
    `HTTP CLOSED: ${field} is not exposed`
  );
}
  check(closed.status === 200 &&
    !closed.body.includes(secretHistory) &&
    !closed.body.includes(secretAction),
    'Closed case hides private information in case detail');

  const closedActions = await actions(techA);
  check(closedActions.status !== 200 ||
    !closedActions.body.includes(secretAction),
    'Closed case does not expose private actions endpoint');

  console.log(`SECURITY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch(err => {
    console.error('TEST ERROR:', err);
    process.exitCode = 2;
  })
  .finally(async () => {
    if (server) {
      await new Promise<void>(resolve =>
        server!.close(() => resolve())
      );
    }
    try {
      isolation.verifyImmutability();
    } finally {
      isolation.cleanup();
    }
  });
