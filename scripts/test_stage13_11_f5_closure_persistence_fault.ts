/**
 * F.5 targeted closure persistence fault regression.
 * Test-only isolated DB; no application source mutations.
 */
import * as fs from 'node:fs';
import * as http from 'node:http';
import express from 'express';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { db } from '../src/db/index.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';

const isolation = setupTestDatabaseIsolation('f5_closure_persistence_fault');
let server: http.Server | undefined;
let passed = 0;
let failed = 0;
const assertCheck = (condition: boolean, label: string) => {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${label}`);
  if (condition) passed++;
  else failed++;
};

async function main() {
  const owner = userRepository.createUser({
    name: 'Closure Persistence Owner',
    email: 'f5-closure-persistence-owner@example.test',
    role: 'customer'
  } as any);
  const stranger = userRepository.createUser({
    name: 'Closure Persistence Stranger',
    email: 'f5-closure-persistence-stranger@example.test',
    role: 'customer'
  } as any);
  const caseRecord = maintenanceRepository.createCase({
    title: 'Closure Persistence Fault Test',
    description: 'Isolated F.5 test',
    projectId: 'CUSTOMER_DIRECT',
    assetId: 'F5-CLOSURE-TEST-ASSET',
    status: 'VERIFIED',
    category: 'CORRECTIVE',
    priority: 'MEDIUM',
    alertIds: [],
    reportedBy: owner.id
  } as any);
  const alert = db.createAssetAlert({
    projectId: 'CUSTOMER_DIRECT',
    assetId: caseRecord.assetId,
    alertType: 'MANUAL',
    severity: 'HIGH',
    status: 'OPEN',
    title: 'Test inverter alert',
    description: 'Isolated linked alert',
    maintenanceCaseId: caseRecord.id
  });
  const linked = maintenanceRepository.updateCase(caseRecord.id, {
    alertIds: [alert.id]
  } as any);
  assertCheck(Boolean(linked?.alertIds?.includes(alert.id)), 'Verified case references the persisted alert');
  assertCheck(db.getAssetAlertById(alert.id)?.status === 'OPEN', 'Linked alert begins OPEN');

  const tokenFor = (user: any) => jwtService.sign({ userId: user.id, role: user.role });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = jwtService.verify(authorization.slice(7));
        (req as any).user = { ...payload, id: payload.userId };
      } catch { /* fail closed in router */ }
    }
    next();
  });
  app.use(maintenanceRouter);
  server = http.createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server unavailable');
  const url = `http://127.0.0.1:${address.port}`;
  const close = (bearer: string) => fetch(`${url}/cases/${caseRecord.id}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ closureNotes: 'F5 test closure' })
  });

  const beforeCase = maintenanceRepository.getCaseById(caseRecord.id);
  const beforeAlert = db.getAssetAlertById(alert.id);
  const outsider = await close(tokenFor(stranger));
  assertCheck(outsider.status === 403 || outsider.status === 404, 'Unrelated customer denied closure');
  assertCheck(
    maintenanceRepository.getCaseById(caseRecord.id)?.status === beforeCase?.status &&
    db.getAssetAlertById(alert.id)?.status === beforeAlert?.status,
    'Unauthorized close leaves case and alert states unchanged'
  );

  const beforeBytes = fs.readFileSync(isolation.tempDbPath);
  let hookCalls = 0;
  let failureResponse: Response | undefined;
  try {
    db.__setTestWriteFailureHook(() => {
      hookCalls++;
      // Fail after temporary file creation but before rename/commit.
      throw new Error('F5_INJECTED_BEFORE_RENAME');
    });
    failureResponse = await close(tokenFor(owner));
  } finally {
    db.__setTestWriteFailureHook(null);
  }
  assertCheck(hookCalls > 0, 'Failure hook reached actual persistence boundary');
  assertCheck(failureResponse?.status === 500, 'Closure persistence failure returns HTTP 500');
  assertCheck(
    fs.readFileSync(isolation.tempDbPath).equals(beforeBytes),
    'Failed closure leaves isolated database byte-for-byte unchanged'
  );
  const failedCase = maintenanceRepository.getCaseById(caseRecord.id);
  const failedAlert = db.getAssetAlertById(alert.id);
  assertCheck(
    failedCase?.status === 'VERIFIED' && !failedCase.postMaintenanceCheck,
    'Failed closure leaves case VERIFIED without assessment'
  );
  assertCheck(
    failedAlert?.status === 'OPEN' && !failedAlert.resolvedAt,
    'Failed closure leaves linked alert OPEN'
  );

  const success = await close(tokenFor(owner));
  const closedCase = maintenanceRepository.getCaseById(caseRecord.id);
  const closedAlert = db.getAssetAlertById(alert.id);
  assertCheck(success.status === 200, 'Retry after removing fault returns HTTP 200');
  assertCheck(
    closedCase?.status === 'CLOSED' && Boolean(closedCase.postMaintenanceCheck?.evaluatedAt),
    'Retry persists CLOSED state and post-maintenance assessment'
  );
  assertCheck(
    closedAlert?.status === 'RESOLVED' && closedAlert.resolvedBy === owner.id,
    'Retry resolves linked alert with authenticated actor'
  );

  const repeat = await close(tokenFor(owner));
  const repeatedCase = maintenanceRepository.getCaseById(caseRecord.id);
  const repeatedAlert = db.getAssetAlertById(alert.id);
  assertCheck(repeat.status === 200, 'Repeat closure returns successful idempotent response');
  assertCheck(
    repeatedCase?.completedDate === closedCase?.completedDate &&
    repeatedAlert?.resolvedAt === closedAlert?.resolvedAt,
    'Repeat closure does not overwrite committed case and alert timestamps'
  );
  console.log(`CLOSURE PERSISTENCE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  if (failed) process.exitCode = 1;
}

main().catch(error => {
  console.error('TEST ERROR:', error);
  process.exitCode = 1;
}).finally(async () => {
  db.__setTestWriteFailureHook(null);
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  try { isolation.verifyImmutability(); }
  finally { isolation.cleanup(); }
});
