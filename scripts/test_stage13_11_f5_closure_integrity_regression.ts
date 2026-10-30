/**
 * Stage 13.11-F.5 — closure partial-failure audit (diagnostic, not a fix).
 * Copy into project's scripts/ folder and execute with:
 * npx --no-install tsx scripts/test_stage13_11_f5_closure_audit.ts
 * Uses temporary isolated DB, never edits application source.
 */
import * as fs from 'fs';
import * as http from 'http';
import express from 'express';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { db } from '../src/db/index.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { jwtService } from '../src/security/jwtService.js';

const isolation = setupTestDatabaseIsolation('f5_closure_audit');
const tempDbPath = isolation.tempDbPath;
let server: http.Server | undefined;
let checks = 0;
let failures = 0;
function check(condition: boolean, message: string) {
  console.log(`${condition ? 'PASS' : 'FAIL'}: ${message}`);
  checks++;
  if (!condition) failures++;
}

async function main() {
  const owner = userRepository.createUser({name: 'Closure Audit Owner', email: 'closure-audit-owner@example.test', role: 'customer'} as any);
  const stranger = userRepository.createUser({name: 'Closure Audit Stranger', email: 'closure-audit-stranger@example.test', role: 'customer'} as any);
  const token = jwtService.sign({userId: owner.id, role: 'customer'});
  const strangerToken = jwtService.sign({userId: stranger.id, role: 'customer'});
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try { const payload = jwtService.verify(auth.substring(7)); (req as any).user = {...payload, id: payload.userId}; } catch { /* invalid token */ }
    }
    next();
  });
  app.use(maintenanceRouter);
  server = http.createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const createVerifiedCase = (title: string) => maintenanceRepository.createCase({
    title, description: 'Isolated closure audit', projectId: 'CUSTOMER_DIRECT', assetId: 'f5-audit-asset',
    status: 'VERIFIED', category: 'INVERTER', priority: 'MEDIUM', alertIds: [], reportedBy: owner.id
  } as any);
  const close = (id: string, bearer = token, route = 'cases') => fetch(`${url}/${route}/${id}/close`, {
    method: 'POST', headers: {Authorization: `Bearer ${bearer}`, 'Content-Type':'application/json'},
    body: JSON.stringify({closureNotes: 'Audit closure'})
  });

  // 1. Baseline denial, no changes.
  const forbiddenCase = createVerifiedCase('Access-control test');
  const before = JSON.stringify(maintenanceRepository.getCaseById(forbiddenCase.id));
  const denial = await close(forbiddenCase.id, strangerToken, 'maintenance');
  check(denial.status === 403 || denial.status === 404, 'Unrelated customer denied closure on alternate route');
  check(before === JSON.stringify(maintenanceRepository.getCaseById(forbiddenCase.id)), 'Denied attempt leaves case unchanged');

  // 2. One rejected atomic write must preserve the case and linked alert.
  const c = createVerifiedCase('Atomic closure write failure');
  const alert = maintenanceRepository.createAlert({
    assetId: 'f5-audit-asset', projectId: 'CUSTOMER_DIRECT', source: 'PERFORMANCE',
    severity: 'HIGH', status: 'TRIGGERED', title: 'Isolated test alert',
    description: 'Alarm before closure'
  } as any);
  maintenanceRepository.updateCase(c.id, { alertIds: [alert.id] });
  const beforeClosure = maintenanceRepository.getCaseById(c.id)!;
  check(beforeClosure.status === 'VERIFIED', 'Fixture is verified before closure');
  check(maintenanceRepository.getAlertById(alert.id)?.status === 'TRIGGERED', 'Fixture alert is active');
  let injected = 0;
  let response: Response;
  try {
    db.__setTestWriteFailureHook((stage) => {
      if (stage === 'before_atomic_rename') {
        injected++;
        throw new Error('SIMULATED_CLOSURE_ATOMIC_WRITE_FAILURE');
      }
    });
    response = await close(c.id);
  } finally {
    db.__setTestWriteFailureHook(null);
  }
  const caseAfter = maintenanceRepository.getCaseById(c.id);
  const alertAfter = maintenanceRepository.getAlertById(alert.id);
  console.log(`OBSERVED: closure write failure: HTTP=${response.status}; status=${caseAfter?.status}; alert=${alertAfter?.status}; injected=${injected}`);
  check(injected === 1, 'Exactly one atomic persistence attempt during closure');
  check(response.status === 500, 'Storage failure returns sanitized HTTP 500');
  const body = await response.text();
  check(!body.includes('SIMULATED_') && !body.includes('\\') && !body.includes('FATAL:'), 'HTTP error does not leak storage internals');
  check(caseAfter?.status === 'VERIFIED' && !caseAfter?.postMaintenanceCheck, 'Failure leaves case unchanged');
  check(alertAfter?.status === 'TRIGGERED', 'Failure does not prematurely resolve linked alert');

  // 3. Clean retry must atomically persist case, assessment, and alert resolution.
  const retry = await close(c.id);
  const afterRetry = maintenanceRepository.getCaseById(c.id);
  const alertAfterRetry = maintenanceRepository.getAlertById(alert.id);
  check(retry.status === 200, 'Clean retry succeeds');
  check(afterRetry?.status === 'CLOSED' && Boolean(afterRetry?.postMaintenanceCheck), 'Closed case includes post-check');
  check(alertAfterRetry?.status === 'RESOLVED', 'Linked alert resolved upon successful closure');

  // 4. Repeated closure must not change historical timestamps or metadata.
  const snapshotBeforeReplay = JSON.stringify({
    c: maintenanceRepository.getCaseById(c.id), a: maintenanceRepository.getAlertById(alert.id)
  });
  const replay = await close(c.id);
  const snapshotAfterReplay = JSON.stringify({
    c: maintenanceRepository.getCaseById(c.id), a: maintenanceRepository.getAlertById(alert.id)
  });
  check(replay.status === 200, 'Identical close replay returns HTTP 200');
  check(snapshotBeforeReplay === snapshotAfterReplay, 'Identical replay performs zero changes to case and alert');

  // 5. Legacy CLOSED records without completedDate or post-check are preserved without rewriting.
  const legacy = createVerifiedCase('Legacy closed case');
  maintenanceRepository.updateCase(legacy.id, {status: 'CLOSED'});
  const legacyBefore = JSON.stringify(maintenanceRepository.getCaseById(legacy.id));
  const legacyRes = await close(legacy.id);
  check(legacyRes.status === 200, 'Legacy closed case receives safe read-only replay');
  check(JSON.stringify(maintenanceRepository.getCaseById(legacy.id)) === legacyBefore, 'Legacy record remains unchanged');

  // 6. Interrupted historical modern closure is never falsely reported as fully complete.
  const partial = createVerifiedCase('Interrupted modern closure');
  maintenanceRepository.updateCase(partial.id, {status: 'CLOSED', completedDate: new Date().toISOString()});
  const partialBefore = JSON.stringify(maintenanceRepository.getCaseById(partial.id));
  const partialRes = await close(partial.id);
  check(partialRes.status === 409, 'Incomplete modern closure returns explicit reconciliation conflict');
  check(JSON.stringify(maintenanceRepository.getCaseById(partial.id)) === partialBefore, 'Incomplete modern closure remains untouched');

  isolation.verifyImmutability();
  check(fs.existsSync(tempDbPath), 'Temporary test database still present before cleanup');
  console.log(`AUDIT SUMMARY: ${checks - failures}/${checks} invariants satisfied; ${failures} failures`);
  if (failures) process.exitCode = 1;
}

main().catch(e => { console.error('TEST HARNESS ERROR:', e); process.exitCode = 2; })
.finally(async () => {
  (db as any).__setTestWriteFailureHook?.(null);
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  isolation.cleanup();
});
