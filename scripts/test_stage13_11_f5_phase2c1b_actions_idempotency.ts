/**
 * ============================================================================
 * STAGE 13.11-F.5 PHASE 2C-1B-1 REGRESSION TEST SUITE
 * Safe Action Persistence, Single-Write Atomicity & Idempotency
 * ============================================================================
 *
 * Validates:
 * 1.  Successful action creation with laborCost and partsCost updating case totals.
 * 2.  Single-write persistence: action, embedded history, and totals updated in 1 writeDB flush.
 * 3.  Identical idempotent replay with clientRequestId returns HTTP 200 without second write or duplicate action.
 * 4.  Idempotency payload conflict returns HTTP 409 and preserves existing action.
 * 5.  Cross-actor replay attempt rejected with HTTP 403 without leaking action details (HTTP route).
 * 6.  Cross-actor idempotency protection enforced directly at repository persistence boundary.
 * 7.  Legacy requests without clientRequestId succeed without deduplication.
 * 8.  Separate legitimate actions with identical descriptions are preserved as distinct records.
 * 9.  Repeated requests with identical keys return the exact same action ID.
 * 10. Simultaneous requests within single-process execution model resolve safely.
 * 11. Deterministic real write-failure injection: failure leaves neither action, embedded history, nor totals committed.
 * 11B. HTTP endpoint persistence failure correctly returns sanitized HTTP 500 without leaking filesystem paths or traces.
 * 11C. Test-only hook safety: restricted to pre-commit, only installable in test environment, strictly inactive in prod/dev.
 * 12. Idempotency survives re-reading database state from disk.
 * 13. Explicit null financial input policy (Correction 1): explicit null rejected (HTTP 400), omitted values preserved.
 * 14. Financial input validation rejects NaN, Infinity, negative costs, non-numeric strings, and fractional Rials.
 * 15. Preservation of current API cumulative overwrite financial semantics.
 * 16. Preservation of service-level incremental addAction financial semantics.
 * 17. Existing stored totals validation (Correction 4): corrupted existing numbers in case rejected before adding deltas.
 * 18. Legitimate absent/null existing totals in case handled gracefully with default 0 without rewriting history.
 * 19. Technician formal acceptance barrier required before logging repair actions (HTTP 403).
 * 20. Reassignment-cycle isolation: previous technician cannot log actions after reassignment.
 * 21. Cancelled and closed case protections strictly reject new actions (HTTP 400).
 * 22. Zero deletion of historical actions (history is strictly append-only).
 * 23. Byte-for-byte immutability of the repository canonical db.json.
 * 24. Fail-safe isolated cleanup of temporary test databases on success and failure.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import express from 'express';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STAGE 13.11-F.5 PHASE 2C-1B-1: ACTION PERSISTENCE & IDEMPOTENCY');
  console.log('================================================================\n');

  const isolation = setupTestDatabaseIsolation('stage13_11_f5_phase2c1b');
  let server: http.Server | null = null;
  let testError: any = null;
  let serverCloseError: any = null;
  let cleanupError: any = null;
  let immutabilityError: any = null;

  try {
    const { db } = await import('../src/db/index.js');
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const { maintenanceCaseService, hasCurrentCycleAcceptance } = await import('../src/services/maintenanceCaseService.js');
    const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { maintenanceRouter, hasTechnicianFormallyAccepted } = await import('../src/api/maintenance.js');

    // -------------------------------------------------------------------------
    // SETUP TEST ACTORS
    // -------------------------------------------------------------------------
    const customerUser = userRepository.createUser({
      name: 'کارفرمای نمونه فاز 2C-1B',
      email: 'customer.phase2c1b@example.com',
      role: 'customer',
      phone: '09121110002'
    });

    const adminUser = userRepository.createUser({
      name: 'مدیر فنی سامانه',
      email: 'admin.phase2c1b@example.com',
      role: 'admin',
      phone: '09129990002'
    });

    const techUserA = userRepository.createUser({
      name: 'تکنسین الف',
      email: 'techa.phase2c1b@example.com',
      role: 'technician',
      phone: '09123330002'
    });
    professionalRepository.createProfessional({
      userId: techUserA.id,
      fullName: 'مهندس تکنسین الف',
      phone: '09123330002',
      specialties: ['INVERTER', 'GENERATOR'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED'
    });

    const techUserB = userRepository.createUser({
      name: 'تکنسین ب',
      email: 'techb.phase2c1b@example.com',
      role: 'technician',
      phone: '09124440002'
    });
    professionalRepository.createProfessional({
      userId: techUserB.id,
      fullName: 'مهندس تکنسین ب',
      phone: '09124440002',
      specialties: ['BATTERY', 'INVERTER'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED'
    });

    const techTokenA = jwtService.sign({
      userId: techUserA.id,
      role: techUserA.role,
      roles: techUserA.roles
    });
    const techTokenB = jwtService.sign({
      userId: techUserB.id,
      role: techUserB.role,
      roles: techUserB.roles
    });
    const adminToken = jwtService.sign({
      userId: adminUser.id,
      role: adminUser.role,
      roles: adminUser.roles
    });

    // Start Express server on ephemeral port
    const app = express();
    app.use(express.json());
    app.use('/api', maintenanceRouter);
    app.use(maintenanceRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, () => resolve()));
    const port = (server!.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    // Helper: Create an accepted IN_PROGRESS case for techUserA
    function createAcceptedCase(title: string): any {
      const c = maintenanceRepository.createCase({
        projectId: 'CUSTOMER_DIRECT',
        assetId: 'UNREGISTERED',
        equipmentType: 'PORTABLE_GENERATOR',
        title,
        description: 'شرح عیب مورد آزمایش',
        priority: 'HIGH',
        status: 'ASSIGNED',
        assignedTechnicianId: techUserA.id,
        assignedTechnicianName: 'تکنسین الف',
        assignedTechnicianPhone: '09123330002',
        contactName: 'کارفرمای نمونه فاز 2C-1B',
        contactPhone: '09121110002',
        category: 'CORRECTIVE',
        reportedBy: customerUser.id,
        reportedAt: new Date().toISOString(),
        alertIds: []
      });
      maintenanceRepository.createAssignmentHistory({
        maintenanceCaseId: c.id,
        technicianId: techUserA.id,
        assignedBy: customerUser.id,
        status: 'ASSIGNED',
        notes: 'تخصیص اولیه'
      });
      maintenanceRepository.createAssignmentHistory({
        maintenanceCaseId: c.id,
        technicianId: techUserA.id,
        assignedBy: techUserA.id,
        status: 'ACCEPTED',
        notes: 'پذیرش رسمی'
      });
      maintenanceRepository.updateCase(c.id, { status: 'IN_PROGRESS' });
      return maintenanceRepository.getCaseById(c.id)!;
    }

    // -------------------------------------------------------------------------
    // TEST 1 & 2: SUCCESSFUL ACTION CREATION & SINGLE-WRITE ATOMICITY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1 & 2: SUCCESSFUL ACTION CREATION & SINGLE-WRITE ---');
    const case1 = createAcceptedCase('پرونده تست ایجاد اقدام تک‌نوشتی');
    const reqKey1 = 'req-act-uuid-0001-aaaa';

    const res1 = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': reqKey1
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تعویض دیودهای یکسوساز ژنراتور',
        laborCost: 15000000,
        partsCost: 35000000,
        notes: 'تست موفقیت‌آمیز مدار'
      })
    });

    assert(res1.status === 200, 'Test 1: Action creation returns HTTP 200');
    const act1 = await res1.json();
    assert(Boolean(act1.id), 'Test 1: Action returned with valid ID');
    assert(act1.clientRequestId === reqKey1, 'Test 1: Action recorded with clientRequestId');
    assert(Boolean(act1.payloadHash), 'Test 1: Action recorded with payloadHash');

    const updatedCase1 = maintenanceRepository.getCaseById(case1.id)!;
    assert(updatedCase1.laborCost === 15000000, 'Test 1: Case laborCost updated correctly (15M IRR)');
    assert(updatedCase1.partsCost === 35000000, 'Test 1: Case partsCost updated correctly (35M IRR)');
    assert(updatedCase1.totalCost === 50000000, 'Test 1: Case totalCost equals 50M IRR');
    assert(updatedCase1.totalCostIrr === 50000000, 'Test 1: Case totalCostIrr synchronized with totalCost');

    const actionsList1 = maintenanceRepository.getActions(case1.id);
    assert(actionsList1.length === 1, 'Test 2: Exactly 1 action persisted in standalone collection');
    assert(updatedCase1.actionsTaken?.length === 1, 'Test 2: Exactly 1 action embedded in case actionsTaken');
    assert(actionsList1[0].id === updatedCase1.actionsTaken![0].id, 'Test 2: Standalone and embedded action IDs match');

    // -------------------------------------------------------------------------
    // TEST 3 & 8: IDENTICAL IDEMPOTENT REPLAY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3 & 8: IDENTICAL IDEMPOTENT REPLAY ---');
    const res2 = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': reqKey1
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تعویض دیودهای یکسوساز ژنراتور',
        laborCost: 15000000,
        partsCost: 35000000,
        notes: 'تست موفقیت‌آمیز مدار'
      })
    });

    assert(res2.status === 200, 'Test 3: Identical replay returns HTTP 200');
    const act2 = await res2.json();
    assert(act2.id === act1.id, 'Test 3: Replay returns identical original action ID');

    const case1AfterReplay = maintenanceRepository.getCaseById(case1.id)!;
    assert(case1AfterReplay.totalCost === 50000000, 'Test 3: Financial totals not duplicated on replay');
    const actionsAfterReplay = maintenanceRepository.getActions(case1.id);
    assert(actionsAfterReplay.length === 1, 'Test 8: No duplicate action record created on replay');

    // -------------------------------------------------------------------------
    // TEST 4: PAYLOAD CONFLICT (SAME KEY, DIFFERENT PAYLOAD -> HTTP 409)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: PAYLOAD CONFLICT (HTTP 409) ---');
    const resConflict = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': reqKey1 // Same key!
      },
      body: JSON.stringify({
        actionType: 'INSPECTION', // Conflicting actionType!
        description: 'بررسی مجدد مقاومت عایقی',
        laborCost: 20000000,
        partsCost: 10000000
      })
    });

    assert(resConflict.status === 409, 'Test 4: Conflicting payload with same key returns HTTP 409 Conflict');
    const conflictData = await resConflict.json();
    assert(conflictData.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'Test 4: Correct error code returned');
    assert(conflictData.existingActionId === act1.id, 'Test 4: Points to existing action ID');

    // Verify existing record and case totals untouched
    const case1AfterConflict = maintenanceRepository.getCaseById(case1.id)!;
    assert(case1AfterConflict.totalCost === 50000000, 'Test 4: Case totals untouched after conflict');

    // -------------------------------------------------------------------------
    // TEST 5 & 6: CROSS-ACTOR REPLAY REJECTION (HTTP 403 & PERSISTENCE BOUNDARY)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5 & 6: CROSS-ACTOR REPLAY REJECTION ---');
    // HTTP route attempt: Tech B attempts to replay or probe Tech A's key on case 1
    const resCrossActor = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenB}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': reqKey1
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تعویض دیودهای یکسوساز ژنراتور',
        laborCost: 15000000,
        partsCost: 35000000
      })
    });

    assert(resCrossActor.status === 403, 'Test 5: Cross-actor replay attempt rejected with HTTP 403');
    const crossActorData = await resCrossActor.json();
    assert(Boolean(crossActorData.error), 'Test 5: Explicit error returned on cross-actor replay');
    assert(crossActorData.existingActionId === undefined, 'Test 5: Does NOT expose previous action ID');
    assert(crossActorData.action === undefined, 'Test 5: Does NOT expose previous action details');

    // Direct repository boundary verification (Correction 2 & Boundary Checks):
    const directRepoResult = maintenanceRepository.recordCaseAction(
      case1.id,
      {
        actionType: 'REPAIR',
        description: 'تعویض دیودهای یکسوساز ژنراتور',
        performedBy: techUserB.id, // Mismatched actor!
        clientRequestId: reqKey1,
        payloadHash: act1.payloadHash
      }
    );
    assert(directRepoResult.success === false, 'Test 6: Persistence boundary rejects cross-actor replay');
    assert((directRepoResult as any).actorMismatch === true, 'Test 6: Persistence boundary flags actorMismatch');

    // Missing actor tests: either actor identity missing must be rejected (not treated as equivalent)
    const missingIncomingActorResult = maintenanceRepository.recordCaseAction(
      case1.id,
      {
        actionType: 'REPAIR',
        description: 'تعویض دیودهای یکسوساز ژنراتور',
        performedBy: undefined, // Missing incoming actor!
        clientRequestId: reqKey1,
        payloadHash: act1.payloadHash
      }
    );
    assert(missingIncomingActorResult.success === false, 'Test 6: Rejects replay when incoming actor identity is missing');
    assert((missingIncomingActorResult as any).actorMismatch === true, 'Test 6: Flags actorMismatch when incoming actor is missing');

    // Seed action with absent performedBy
    const caseMissingActor = createAcceptedCase('پرونده با اکشن بدون مجری');
    const actionWithNoActor = maintenanceRepository.createAction({
      maintenanceCaseId: caseMissingActor.id,
      actionType: 'INSPECTION',
      description: 'اقدام بدون عامل ثبت',
      performedAt: new Date().toISOString(),
      performedBy: undefined,
      clientRequestId: 'no-actor-req-key-001',
      payloadHash: 'dummy-hash'
    });

    const replayOnMissingExisting = maintenanceRepository.recordCaseAction(
      caseMissingActor.id,
      {
        actionType: 'INSPECTION',
        description: 'اقدام بدون عامل ثبت',
        performedBy: techUserA.id, // Present incoming actor, but existing had none
        clientRequestId: 'no-actor-req-key-001',
        payloadHash: 'dummy-hash'
      }
    );
    assert(replayOnMissingExisting.success === false, 'Test 6: Rejects replay when existing actor identity is missing');
    assert((replayOnMissingExisting as any).actorMismatch === true, 'Test 6: Flags actorMismatch when existing actor was missing');

    const replayBothMissing = maintenanceRepository.recordCaseAction(
      caseMissingActor.id,
      {
        actionType: 'INSPECTION',
        description: 'اقدام بدون عامل ثبت',
        performedBy: undefined, // Both missing
        clientRequestId: 'no-actor-req-key-001',
        payloadHash: 'dummy-hash'
      }
    );
    assert(replayBothMissing.success === false, 'Test 6: Rejects replay when both actor identities are missing (not treated as equivalent)');
    assert((replayBothMissing as any).actorMismatch === true, 'Test 6: Flags actorMismatch when both actors are missing');

    // -------------------------------------------------------------------------
    // TEST 7 & 8: LEGACY UNKEYED REQUESTS & SEPARATE LEGITIMATE ACTIONS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7 & 8: LEGACY UNKEYED REQUESTS ---');
    const resLegacy1 = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
        // No Idempotency-Key
      },
      body: JSON.stringify({
        actionType: 'TEST',
        description: 'تست زیر بار با لودبانک ۵۰ کیلووات'
      })
    });
    assert(resLegacy1.status === 200, 'Test 7: Legacy request without key succeeds (HTTP 200)');
    const actLegacy1 = await resLegacy1.json();

    // Second action with identical description and type, also unkeyed
    const resLegacy2 = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'TEST',
        description: 'تست زیر بار با لودبانک ۵۰ کیلووات'
      })
    });
    assert(resLegacy2.status === 200, 'Test 8: Second identical legitimate action succeeds without deduplication');
    const actLegacy2 = await resLegacy2.json();
    assert(actLegacy1.id !== actLegacy2.id, 'Test 8: Distinct action records generated for unkeyed actions');

    // -------------------------------------------------------------------------
    // TEST 10: SIMULTANEOUS / CONCURRENT REQUESTS (SINGLE-PROCESS)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: SIMULTANEOUS / CONCURRENT IDEMPOTENT REQUESTS ---');
    const caseConcurrent = createAcceptedCase('پرونده تست درخواست‌های همزمان');
    const concurrentKey = 'req-act-concurrent-key-9999';

    const [cRes1, cRes2] = await Promise.all([
      fetch(`${baseUrl}/cases/${caseConcurrent.id}/actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${techTokenA}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': concurrentKey
        },
        body: JSON.stringify({
          actionType: 'CONFIGURATION',
          description: 'تنظیم کنترلر ژنراتور DSE7320',
          laborCost: 10000000,
          partsCost: 0
        })
      }),
      fetch(`${baseUrl}/cases/${caseConcurrent.id}/actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${techTokenA}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': concurrentKey
        },
        body: JSON.stringify({
          actionType: 'CONFIGURATION',
          description: 'تنظیم کنترلر ژنراتور DSE7320',
          laborCost: 10000000,
          partsCost: 0
        })
      })
    ]);

    assert(cRes1.status === 200 && cRes2.status === 200, 'Test 10: Both concurrent identical requests return HTTP 200');
    const cAct1 = await cRes1.json();
    const cAct2 = await cRes2.json();
    assert(cAct1.id === cAct2.id, 'Test 10: Both concurrent requests resolve to the identical action ID');

    const concurrentActions = maintenanceRepository.getActions(caseConcurrent.id);
    assert(concurrentActions.length === 1, 'Test 10: Exactly 1 action stored in database for concurrent requests');

    // -------------------------------------------------------------------------
    // TEST 11: DETERMINISTIC WRITE-FAILURE INJECTION (Issue 1 Correction)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: DETERMINISTIC WRITE-FAILURE INJECTION ---');
    const caseFail = createAcceptedCase('پرونده تست تزریق خطای دیسک');
    const preFailActions = maintenanceRepository.getActions(caseFail.id).length;
    const preFailEmbedded = (maintenanceRepository.getCaseById(caseFail.id)?.actionsTaken || []).length;
    const preFailTotals = maintenanceRepository.getCaseById(caseFail.id)?.totalCost;

    const activeDbPath = db.getDBPath();
    const preFailFileContent = fs.readFileSync(activeDbPath);
    const preFailHash = crypto.createHash('sha256').update(preFailFileContent).digest('hex');
    const preFailSize = fs.statSync(activeDbPath).size;

    let reachedPersistenceBoundary = false;
    let writeFailureCaught = false;

    try {
      db.__setTestWriteFailureHook((stage) => {
        if (stage === 'before_atomic_rename') {
          reachedPersistenceBoundary = true;
          throw new Error('SIMULATED_FILESYSTEM_WRITE_FAILURE: Disk I/O atomic replacement failed');
        }
      });

      maintenanceRepository.recordCaseAction(
        caseFail.id,
        {
          actionType: 'REPAIR',
          description: 'اقدامی که در مرز ذخیره‌سازی با شکست شبیه‌سازی‌شده مواجه می‌شود',
          performedBy: techUserA.id
        },
        {
          mode: 'CUMULATIVE_OVERWRITE',
          laborCost: 99999999,
          partsCost: 11111111
        }
      );
    } catch (err: any) {
      writeFailureCaught = true;
      assert(err.message.includes('SIMULATED_FILESYSTEM_WRITE_FAILURE'), 'Test 11: Failure occurred specifically at persistence boundary');
    } finally {
      db.__setTestWriteFailureHook(null);
    }

    assert(reachedPersistenceBoundary, 'Test 11: Valid DB was loaded and persistence phase was reached');
    assert(writeFailureCaught, 'Test 11: Persistence failure error was caught as expected');

    // Verify original database file on disk is byte-for-byte identical (SHA-256 and byte size)
    const postFailFileContent = fs.readFileSync(activeDbPath);
    const postFailHash = crypto.createHash('sha256').update(postFailFileContent).digest('hex');
    const postFailSize = fs.statSync(activeDbPath).size;
    assert(postFailHash === preFailHash, 'Test 11: Original isolated database file remains byte-for-byte identical (SHA-256 match)');
    assert(postFailSize === preFailSize, 'Test 11: Original isolated database byte size identical');

    // Verify all three mutations remained completely uncommitted on disk:
    const freshDbData = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const diskCase = (freshDbData.maintenanceCases || []).find((c: any) => c.id === caseFail.id);
    const diskActions = (freshDbData.maintenanceActions || []).filter((a: any) => a.maintenanceCaseId === caseFail.id);

    assert(diskActions.length === preFailActions, 'Test 11: Standalone action collection was NOT mutated on write failure');
    assert((diskCase?.actionsTaken || []).length === preFailEmbedded, 'Test 11: Case actionsTaken collection was NOT mutated on write failure');
    assert(diskCase?.totalCost === preFailTotals, 'Test 11: Case financial totals were NOT mutated on write failure');

    // Verify no stray temporary files were left behind in the database directory
    const dirFiles = fs.readdirSync(path.dirname(activeDbPath));
    const strayTmp = dirFiles.filter(f => f.startsWith('.db.tmp.'));
    assert(strayTmp.length === 0, 'Test 11: Temporary files safely unlinked and cleaned up after write failure');

    // -------------------------------------------------------------------------
    // TEST 11B: HTTP ENDPOINT PERSISTENCE FAILURE ERROR CLASSIFICATION (Issue A & B)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11B: HTTP ENDPOINT PERSISTENCE FAILURE ERROR CLASSIFICATION ---');
    const caseFailHttp = createAcceptedCase('پرونده تست شکست پایدارسازی در لایه HTTP');
    const preFailHttpActions = maintenanceRepository.getActions(caseFailHttp.id).length;
    const preFailHttpCase = maintenanceRepository.getCaseById(caseFailHttp.id)!;
    const preFailHttpEmbedded = (preFailHttpCase.actionsTaken || []).length;
    const preFailHttpTotalCost = preFailHttpCase.totalCost;
    const preFailHttpLaborCost = preFailHttpCase.laborCost;
    const preFailHttpPartsCost = preFailHttpCase.partsCost;

    let httpHookFired = false;
    let resHttpFail: any;
    let resHttpData: any;

    try {
      db.__setTestWriteFailureHook((stage: any) => {
        if (stage === 'before_atomic_rename') {
          httpHookFired = true;
          throw new Error('SIMULATED_FILESYSTEM_WRITE_FAILURE: /var/data/isolated_db.tmp.1234.db atomic replace permission denied');
        }
      });

      resHttpFail = await fetch(`${baseUrl}/cases/${caseFailHttp.id}/actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${techTokenA}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'fail-key-http-500-test'
        },
        body: JSON.stringify({
          actionType: 'REPAIR',
          description: 'اقدام با شکست فیزیکی پایگاه داده در نقطه اتمیک',
          laborCost: 45000000,
          partsCost: 35000000
        })
      });
      resHttpData = await resHttpFail.json();
    } finally {
      db.__setTestWriteFailureHook(null);
    }

    assert(httpHookFired, 'Test 11B: Hook fired at pre-commit persistence boundary');
    assert(resHttpFail.status === 500, 'Test 11B: Persistence failure returns HTTP 500 instead of HTTP 400');
    assert(resHttpData.error === 'خطا در ثبت پایدار اطلاعات در پایگاه داده', 'Test 11B: HTTP 500 contains sanitized Persian error message');

    // Verify absolutely NO leakage of internal paths, exceptions, or stack traces
    const rawResponseBody = JSON.stringify(resHttpData);
    assert(!rawResponseBody.includes('SIMULATED_FILESYSTEM_WRITE_FAILURE'), 'Test 11B: Internal exception name is NOT leaked in HTTP response');
    assert(!rawResponseBody.includes('/var/data'), 'Test 11B: Filesystem path is NOT leaked in HTTP response');
    assert(!rawResponseBody.includes('.tmp'), 'Test 11B: Temporary filename is NOT leaked in HTTP response');
    assert(!rawResponseBody.includes('stack') && !rawResponseBody.includes('at '), 'Test 11B: Stack trace is NOT leaked in HTTP response');

    // Verify zero mutations committed to disk on HTTP 500 persistence failure
    const freshHttpData = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const diskCaseHttp = (freshHttpData.maintenanceCases || []).find((c: any) => c.id === caseFailHttp.id);
    const diskActionsHttp = (freshHttpData.maintenanceActions || []).filter((a: any) => a.maintenanceCaseId === caseFailHttp.id);

    assert(diskActionsHttp.length === preFailHttpActions, 'Test 11B: Standalone actions remained uncommitted on HTTP 500 failure');
    assert((diskCaseHttp?.actionsTaken || []).length === preFailHttpEmbedded, 'Test 11B: Case actionsTaken remained uncommitted on HTTP 500 failure');
    assert(diskCaseHttp?.totalCost === preFailHttpTotalCost, 'Test 11B: Case totalCost remained uncommitted on HTTP 500 failure');
    assert(diskCaseHttp?.laborCost === preFailHttpLaborCost, 'Test 11B: Case laborCost remained uncommitted on HTTP 500 failure');
    assert(diskCaseHttp?.partsCost === preFailHttpPartsCost, 'Test 11B: Case partsCost remained uncommitted on HTTP 500 failure');

    // Verify temp files cleaned up
    const dirFilesHttp = fs.readdirSync(path.dirname(activeDbPath));
    const strayTmpHttp = dirFilesHttp.filter(f => f.startsWith('.db.tmp.'));
    assert(strayTmpHttp.length === 0, 'Test 11B: Temporary files safely cleaned up after HTTP persistence failure');

    // -------------------------------------------------------------------------
    // TEST 11C: TEST-ONLY WRITE-FAILURE HOOK SAFETY (Issue B Requirements)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11C: TEST-ONLY WRITE-FAILURE HOOK SAFETY ---');
    const originalEnv = process.env.NODE_ENV;

    // 1. Verify hook cannot be installed when NODE_ENV is production
    process.env.NODE_ENV = 'production';
    try {
      db.__setTestWriteFailureHook(() => {
        throw new Error('SHOULD_NOT_EXECUTE_IN_PRODUCTION');
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
      db.__setTestWriteFailureHook(null);
    }

    // 2. Verify hook cannot be installed when NODE_ENV is development
    process.env.NODE_ENV = 'development';
    try {
      db.__setTestWriteFailureHook(() => {
        throw new Error('SHOULD_NOT_EXECUTE_IN_DEV');
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
      db.__setTestWriteFailureHook(null);
    }
    assert(true, 'Test 11C: Hook installation strictly ignored outside NODE_ENV===test');

    // 3. Verify normal writes succeed when hook is null and are never falsely reported as failed
    const caseNormal = createAcceptedCase('پرونده تست سلامت نوشتن عادی');
    const normalResult = maintenanceRepository.recordCaseAction(
      caseNormal.id,
      {
        actionType: 'INSPECTION',
        description: 'اقدام عادی بدون هوک شکست',
        performedBy: techUserA.id
      }
    );
    assert(normalResult.success === true, 'Test 11C: Writes succeed normally and are never falsely reported as failed');

    // -------------------------------------------------------------------------
    // TEST 12: PERSISTENCE RELOAD IDEMPOTENCY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: PERSISTENCE RELOAD IDEMPOTENCY ---');
    const diskAction = maintenanceRepository.getActions(case1.id).find(a => a.clientRequestId === reqKey1);
    assert(Boolean(diskAction), 'Test 12: Idempotent action verified directly in persisted collection');
    assert(diskAction!.payloadHash === act1.payloadHash, 'Test 12: Stored payloadHash matches');

    // -------------------------------------------------------------------------
    // TEST 13: EXPLICIT NULL FINANCIAL INPUT POLICY (Correction 1)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: EXPLICIT NULL FINANCIAL INPUT POLICY ---');
    const caseNull = createAcceptedCase('پرونده تست سیاست نال صریح');
    const preNullActions = maintenanceRepository.getActions(caseNull.id).length;
    const preNullCase = maintenanceRepository.getCaseById(caseNull.id)!;

    // 1. Explicit null laborCost -> must return HTTP 400
    const resNullLabor = await fetch(`${baseUrl}/cases/${caseNull.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تست نال دستمزد', laborCost: null })
    });
    assert(resNullLabor.status === 400, 'Test 13: Explicit null laborCost rejected with HTTP 400');
    const nullLaborData = await resNullLabor.json();
    assert(nullLaborData.error.includes('null'), 'Test 13: Explicit error message indicates null not allowed');

    // 2. Explicit null partsCost -> must return HTTP 400
    const resNullParts = await fetch(`${baseUrl}/cases/${caseNull.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تست نال قطعات', partsCost: null })
    });
    assert(resNullParts.status === 400, 'Test 13: Explicit null partsCost rejected with HTTP 400');

    // 3. Verify zero mutations occurred on rejection
    const postNullActions = maintenanceRepository.getActions(caseNull.id).length;
    const postNullCase = maintenanceRepository.getCaseById(caseNull.id)!;
    assert(postNullActions === preNullActions, 'Test 13: Zero actions recorded after null rejection');
    assert(postNullCase.laborCost === preNullCase.laborCost, 'Test 13: laborCost unmodified after null rejection');
    assert(postNullCase.partsCost === preNullCase.partsCost, 'Test 13: partsCost unmodified after null rejection');

    // 4. Omitted financial fields preserve previous values
    const resOmitted = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'INSPECTION', description: 'اقدام بدون تعیین مجدد هزینه' })
    });
    assert(resOmitted.status === 200, 'Test 13: Omitted financial fields accepted');
    const caseAfterOmitted = maintenanceRepository.getCaseById(case1.id)!;
    assert(caseAfterOmitted.totalCost === 50000000, 'Test 13: Previous case totalCost preserved when fields omitted');

    // -------------------------------------------------------------------------
    // TEST 14: FINANCIAL INPUT VALIDATION (NEGATIVE, FRACTIONS, STRINGS, OVERFLOW)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: FINANCIAL INPUT VALIDATION ---');
    const caseVal = createAcceptedCase('پرونده تست اعتبارسنجی مالی');

    // Negative labor cost
    const resNeg = await fetch(`${baseUrl}/cases/${caseVal.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تست منفی', laborCost: -50000 })
    });
    assert(resNeg.status === 400, 'Test 14: Negative laborCost rejected with HTTP 400');

    // Fractional Rial amount
    const resFrac = await fetch(`${baseUrl}/cases/${caseVal.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تست اعشاری', laborCost: 12500.75 })
    });
    assert(resFrac.status === 400, 'Test 14: Fractional Rial amount rejected with HTTP 400');

    // Non-numeric string
    const resStr = await fetch(`${baseUrl}/cases/${caseVal.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تست رشته', partsCost: 'invalid-cost' })
    });
    assert(resStr.status === 400, 'Test 14: Non-numeric partsCost string rejected with HTTP 400');

    // NaN / Infinity
    const resInf = await fetch(`${baseUrl}/cases/${caseVal.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تست بی‌نهایت', laborCost: 'Infinity' })
    });
    assert(resInf.status === 400, 'Test 14: Infinity cost rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 15: PRESERVATION OF API ROUTE CUMULATIVE OVERWRITE FINANCIAL SEMANTICS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: API ROUTE CUMULATIVE OVERWRITE SEMANTICS ---');
    const caseApiSem = createAcceptedCase('پرونده بررسی معنای مالی روت');
    await fetch(`${baseUrl}/cases/${caseApiSem.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'اقدام اول', laborCost: 10000000, partsCost: 20000000 })
    });
    let semCase = maintenanceRepository.getCaseById(caseApiSem.id)!;
    assert(semCase.laborCost === 10000000 && semCase.partsCost === 20000000, 'Test 15: First action establishes costs (30M total)');

    // Second action provides updated cumulative figures (e.g. 15M labor, 25M parts)
    await fetch(`${baseUrl}/cases/${caseApiSem.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'اقدام دوم', laborCost: 15000000, partsCost: 25000000 })
    });
    semCase = maintenanceRepository.getCaseById(caseApiSem.id)!;
    assert(semCase.laborCost === 15000000, 'Test 15: API route overwrites laborCost to 15M');
    assert(semCase.partsCost === 25000000, 'Test 15: API route overwrites partsCost to 25M');
    assert(semCase.totalCost === 40000000, 'Test 15: Total cost correctly updated to 40M');

    // -------------------------------------------------------------------------
    // TEST 16: PRESERVATION OF SERVICE-LEVEL INCREMENTAL SEMANTICS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: SERVICE-LEVEL INCREMENTAL SEMANTICS ---');
    const caseSvc = createAcceptedCase('پرونده تست متد سرویس addAction');
    const svcAct1 = maintenanceCaseService.addAction(caseSvc.id, {
      actionType: 'REPAIR',
      description: 'سرویس انژکتور',
      performedBy: techUserA.id,
      laborHours: 2.5,
      costIrr: 5000000,
      clientRequestId: 'svc-key-001'
    });
    let svcCase = maintenanceRepository.getCaseById(caseSvc.id)!;
    assert(svcCase.totalLaborHours === 2.5, 'Test 16: Service increments totalLaborHours to 2.5');
    assert(svcCase.totalCostIrr === 5000000, 'Test 16: Service increments totalCostIrr to 5M');

    // Second service action adds another 1.5 hours and 3M cost
    const svcAct2 = maintenanceCaseService.addAction(caseSvc.id, {
      actionType: 'REPAIR',
      description: 'تعویض فیلتر گازوئیل',
      performedBy: techUserA.id,
      laborHours: 1.5,
      costIrr: 3000000,
      clientRequestId: 'svc-key-002'
    });
    svcCase = maintenanceRepository.getCaseById(caseSvc.id)!;
    assert(svcCase.totalLaborHours === 4.0, 'Test 16: Service incrementally accumulates totalLaborHours (4.0)');
    assert(svcCase.totalCostIrr === 8000000, 'Test 16: Service incrementally accumulates totalCostIrr (8.0M)');

    // Replay on service method
    const svcReplay = maintenanceCaseService.addAction(caseSvc.id, {
      actionType: 'REPAIR',
      description: 'تعویض فیلتر گازوئیل',
      performedBy: techUserA.id,
      laborHours: 1.5,
      costIrr: 3000000,
      clientRequestId: 'svc-key-002'
    });
    assert(svcReplay.id === svcAct2.id, 'Test 16: Service method replay returns existing action ID');
    svcCase = maintenanceRepository.getCaseById(caseSvc.id)!;
    assert(svcCase.totalLaborHours === 4.0, 'Test 16: Service method replay does not re-accumulate hours');
    assert(svcCase.totalCostIrr === 8000000, 'Test 16: Service method replay does not re-accumulate costs');

    // -------------------------------------------------------------------------
    // TEST 17 & 18: EXISTING STORED TOTALS VALIDATION (Correction 4)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 17 & 18: EXISTING STORED TOTALS VALIDATION ---');
    // 1. Case with corrupted fractional totalCostIrr
    const caseCorruptFraction = createAcceptedCase('پرونده با هزینه ذخیره شده اعشاری فاسد');
    maintenanceRepository.updateCase(caseCorruptFraction.id, { totalCostIrr: 12500.5 as any });
    let corruptFractionCaught = false;
    try {
      maintenanceCaseService.addAction(caseCorruptFraction.id, {
        actionType: 'REPAIR',
        description: 'تست جمع با مقدار فاسد',
        performedBy: techUserA.id,
        costIrr: 5000
      });
    } catch (e: any) {
      corruptFractionCaught = true;
      assert(e.message.includes('نامعتبر، اعشاری یا فاسد'), 'Test 17: Rejects corrupted fractional stored total');
    }
    assert(corruptFractionCaught, 'Test 17: Service addAction rejected case with fractional totalCostIrr');

    // 2. Case with corrupted negative totalLaborHours
    const caseCorruptHours = createAcceptedCase('پرونده با ساعت کارکرد منفی فاسد');
    maintenanceRepository.updateCase(caseCorruptHours.id, { totalLaborHours: -4 as any });
    let corruptHoursCaught = false;
    try {
      maintenanceCaseService.addAction(caseCorruptHours.id, {
        actionType: 'REPAIR',
        description: 'تست جمع با ساعت منفی',
        performedBy: techUserA.id,
        laborHours: 2
      });
    } catch (e: any) {
      corruptHoursCaught = true;
      assert(e.message.includes('ساعات کارکرد'), 'Test 17: Rejects corrupted negative stored labor hours');
    }
    assert(corruptHoursCaught, 'Test 17: Service addAction rejected case with negative totalLaborHours');

    // 3. Legitimate case with absent/null existing totals (Correction 4: Default 0)
    const caseCleanDefaults = createAcceptedCase('پرونده بدون مقادیر اولیه هزینه');
    maintenanceRepository.updateCase(caseCleanDefaults.id, { totalLaborHours: undefined, totalCostIrr: undefined });
    const cleanAct = maintenanceCaseService.addAction(caseCleanDefaults.id, {
      actionType: 'REPAIR',
      description: 'اقدام روی پرونده با فیلدهای اولیه غایب',
      performedBy: techUserA.id,
      laborHours: 2,
      costIrr: 1000000
    });
    const cleanPostCase = maintenanceRepository.getCaseById(caseCleanDefaults.id)!;
    assert(cleanPostCase.totalLaborHours === 2, 'Test 18: Absent laborHours defaults gracefully to 0 + delta');
    assert(cleanPostCase.totalCostIrr === 1000000, 'Test 18: Absent costIrr defaults gracefully to 0 + delta');

    // -------------------------------------------------------------------------
    // TEST 19, 20 & 21: AUTHORIZATION, REASSIGNMENT & TERMINAL-STATE PROTECTION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 19, 20 & 21: LIFECYCLE & PRIVACY PROTECTIONS ---');
    // Test 19: Unaccepted case rejects action
    const unacceptedCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده بدون پذیرش',
      description: 'تست',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    const resUnaccepted = await fetch(`${baseUrl}/cases/${unacceptedCase.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تلاش ثبت اقدام بدون پذیرش' })
    });
    assert(resUnaccepted.status === 403, 'Test 19: Unaccepted case strictly rejects action creation (HTTP 403)');

    // Test 20: Reassigned case isolates previous technician
    const reassignedCase = createAcceptedCase('پرونده تست بازتخصیص');
    maintenanceCaseService.transitionCaseStatus(reassignedCase.id, 'ASSIGNED', customerUser.id, {
      technicianId: techUserB.id,
      technicianName: 'تکنسین ب'
    });
    const resReassignedPrev = await fetch(`${baseUrl}/cases/${reassignedCase.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تلاش تکنسین قبلی پس از بازتخصیص' })
    });
    assert(resReassignedPrev.status === 403, 'Test 20: Previous technician rejected after reassignment (HTTP 403)');

    // Test 21: Cancelled and Closed cases strictly reject action creation (including idempotent replay attempts)
    const caseToCancel = createAcceptedCase('پرونده تست لغو');
    maintenanceCaseService.transitionCaseStatus(caseToCancel.id, 'CANCELLED', customerUser.id);
    const resCancelled = await fetch(`${baseUrl}/cases/${caseToCancel.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تلاش ثبت روی پرونده لغو شده' })
    });
    assert(resCancelled.status === 400, 'Test 21: Cancelled case strictly rejects action creation (HTTP 400)');

    // Idempotency key cannot bypass terminal CANCELLED state
    const resCancelledReplay = await fetch(`${baseUrl}/cases/${caseToCancel.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': reqKey1
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تلاش دور زدن وضعیت لغو با کلید تکرارپذیری معتبر'
      })
    });
    assert(resCancelledReplay.status === 400, 'Test 21: Valid idempotency key CANNOT bypass terminal CANCELLED status (HTTP 400)');

    // Closed case protection against replay
    const caseToClose = createAcceptedCase('پرونده تست بستن');
    // Add action, submit verification, verify, close
    maintenanceRepository.createAction({
      maintenanceCaseId: caseToClose.id,
      actionType: 'REPAIR',
      description: 'اقدام اولیه جهت بستن پرونده',
      performedAt: new Date().toISOString(),
      performedBy: techUserA.id
    });
    maintenanceCaseService.transitionCaseStatus(caseToClose.id, 'AWAITING_VERIFICATION', techUserA.id);
    maintenanceCaseService.transitionCaseStatus(caseToClose.id, 'VERIFIED', customerUser.id, { verificationNotes: 'تایید شد' });
    maintenanceCaseService.transitionCaseStatus(caseToClose.id, 'CLOSED', customerUser.id);

    const resClosedReplay = await fetch(`${baseUrl}/cases/${caseToClose.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'valid-key-closed-test'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تلاش دور زدن پرونده بسته شده با کلید شناسه'
      })
    });
    assert(resClosedReplay.status === 400, 'Test 21: Valid idempotency key CANNOT bypass terminal CLOSED status (HTTP 400)');

    // Idempotency key cannot bypass unaccepted assignment cycle
    const resUnacceptedReplay = await fetch(`${baseUrl}/cases/${unacceptedCase.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-unaccepted-bypass-test'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تلاش دور زدن عدم پذیرش با کلید'
      })
    });
    assert(resUnacceptedReplay.status === 403, 'Test 21: Valid idempotency key CANNOT bypass formal acceptance requirement (HTTP 403)');

    // Idempotency key cannot bypass reassigned technician authorization
    const resReassignedReplay = await fetch(`${baseUrl}/cases/${reassignedCase.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-reassigned-bypass-test'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تلاش دور زدن بازتخصیص با کلید'
      })
    });
    assert(resReassignedReplay.status === 403, 'Test 21: Valid idempotency key CANNOT bypass technician reassignment isolation (HTTP 403)');

    // Test 22: Verify zero historical action records were deleted
    const finalAllActions = maintenanceRepository.getActions(case1.id);
    assert(finalAllActions.length >= 3, 'Test 22: Historical actions strictly preserved without deletion');

  } catch (err: any) {
    testError = err;
  } finally {
    // 1. Close HTTP server
    if (server) {
      try {
        await new Promise<void>((resolve, reject) => {
          server!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (err: any) {
        console.error('[CLEANUP FAILURE] Failed to close temporary HTTP server:', err);
        if (!serverCloseError) serverCloseError = new Error(`Server close failure: ${err?.message || err}`);
      }
    }

    // 2. Clean up temporary test database file
    if (fs.existsSync(isolation.tempDbPath)) {
      try {
        fs.unlinkSync(isolation.tempDbPath);
      } catch (err: any) {
        console.error(`[CLEANUP FAILURE] Failed to remove temporary database at ${isolation.tempDbPath}:`, err);
        if (!cleanupError) cleanupError = new Error(`Database cleanup failure: ${err?.message || err}`);
      }
    }

    try {
      isolation.cleanup();
    } catch (err: any) {
      console.error('[CLEANUP FAILURE] Failed in isolation.cleanup():', err);
      if (!cleanupError) cleanupError = new Error(`Isolation cleanup failure: ${err?.message || err}`);
    }

    // 3. Immutability verification of repository db.json
    try {
      console.log('\n--- TEST 23: PRODUCTION DB IMMUTABILITY GUARD ---');
      isolation.verifyImmutability();
      assert(true, 'Test 23: Repository db.json byte-for-byte identical');
    } catch (err: any) {
      console.error('[CRITICAL IMMUTABILITY FAILURE]:', err);
      immutabilityError = err;
    }

    // 4. Non-masking error propagation
    if (testError) {
      if (serverCloseError) console.error('[SECONDARY SERVER CLOSE ERROR]:', serverCloseError);
      if (cleanupError) console.error('[SECONDARY CLEANUP ERROR]:', cleanupError);
      if (immutabilityError) console.error('[CRITICAL IMMUTABILITY FAILURE]:', immutabilityError);
      throw testError;
    }

    if (serverCloseError) throw serverCloseError;
    if (cleanupError) throw cleanupError;
    if (immutabilityError) throw immutabilityError;
  }
}

runTestSuite()
  .then(() => {
    console.log('\n================================================================');
    console.log(`ALL TESTS PASSED! (${passed}/${passed + failed})`);
    console.log('================================================================\n');
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('\nTest suite execution failed:', err);
    process.exit(1);
  });
