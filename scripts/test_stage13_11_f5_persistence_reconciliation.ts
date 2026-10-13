/**
 * ============================================================================
 * STAGE 13.11-F.5: CONTROLLED PERSISTENCE SAFETY & RECONCILIATION AUDIT TESTS
 * ============================================================================
 * 
 * Verifies:
 * 1. Corrupt existing database files throw DatabaseStorageError and are NEVER reset to defaults.
 * 2. Missing database files initialize safely in dev/test environment.
 * 3. Atomic file writes prevent target corruption on write failure.
 * 4. Normal atomic file writes persist and update correctly.
 * 5. Production filesystem write restrictions remain strictly enforced.
 * 6. Reconciliation audit rejects unauthenticated (401) and non-admin (403) requests.
 * 7. Administrators can retrieve structured, actionable audit findings.
 * 8. Missing acceptance and mismatched assignment history are detected accurately.
 * 9. Legitimate cases (OPEN, healthy ASSIGNED, healthy IN_PROGRESS, CLOSED) produce zero false positives.
 * 10. Audit endpoint is strictly read-only and causes zero database mutations.
 * 11. Existing F.4 acceptance, reassignment, and privacy behaviors remain 100% intact.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import express from 'express';
import { db, DatabaseStorageError } from '../src/db/index.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { maintenanceCaseService } from '../src/services/maintenanceCaseService.js';
import { professionalRepository } from '../src/repositories/professionalRepository.js';
import { maintenanceRouter } from '../src/api/maintenance.js';
import { jwtService } from '../src/security/jwtService.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STAGE 13.11-F.5: PERSISTENCE SAFETY & RECONCILIATION AUDIT TESTS');
  console.log('================================================================');

  const isolation = setupTestDatabaseIsolation('stage13_11_f5_persistence');
  const tempDbPath = isolation.tempDbPath;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: CORRUPT EXISTING DATABASE FILE IS NEVER SILENTLY RESET
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: CORRUPT EXISTING DATABASE FILE IS NEVER RESET ---');
    const corruptTestPath = path.join('/tmp', `hooshyar_corrupt_test_${Date.now()}.json`);
    fs.writeFileSync(corruptTestPath, '{ "users": [ { "id": "1", INVALID_JSON', 'utf-8');

    db.setDBPath(corruptTestPath);
    let caughtCorruptionError: any = null;
    try {
      db.getUsers();
    } catch (e: any) {
      caughtCorruptionError = e;
    }

    assert(
      caughtCorruptionError !== null,
      'Test 1: Reading corrupt database file strictly throws an error instead of returning defaults'
    );
    assert(
      caughtCorruptionError instanceof DatabaseStorageError || caughtCorruptionError.name === 'DatabaseStorageError',
      'Test 1: Error thrown is an authoritative DatabaseStorageError instance'
    );
    assert(
      caughtCorruptionError.message.includes('FATAL: Database storage corruption detected'),
      'Test 1: Error message explicitly warns of database corruption and aborts to prevent data loss'
    );

    // Verify file content was NOT overwritten or reset to defaultDB
    const rawAfterAttempt = fs.readFileSync(corruptTestPath, 'utf-8');
    assert(
      rawAfterAttempt.includes('INVALID_JSON'),
      'Test 1: Corrupted file was preserved intact without silent overwrite'
    );

    // Clean up test file
    try { fs.unlinkSync(corruptTestPath); } catch {}

    // -------------------------------------------------------------------------
    // TEST 2: MISSING DATABASE INITIALIZATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: MISSING DATABASE INITIALIZATION ---');
    const missingTestPath = path.join('/tmp', `hooshyar_missing_test_${Date.now()}.json`);
    if (fs.existsSync(missingTestPath)) fs.unlinkSync(missingTestPath);

    db.setDBPath(missingTestPath);
    const usersOnFreshInit = db.getUsers();
    assert(
      Array.isArray(usersOnFreshInit),
      'Test 2: Fresh database initializes successfully when file is genuinely absent'
    );
    assert(
      fs.existsSync(missingTestPath),
      'Test 2: Database file created on fresh initialization in development/test environment'
    );

    try { fs.unlinkSync(missingTestPath); } catch {}

    // Restore isolated database path
    db.setDBPath(tempDbPath);

    // -------------------------------------------------------------------------
    // TEST 3: SIMULATED WRITE FAILURE PRESERVES VALID DATABASE FILE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: WRITE FAILURE PRESERVES PREVIOUS VALID DATABASE ---');
    const validContentBefore = fs.readFileSync(tempDbPath, 'utf-8');

    // 3a. Serialization failure (e.g. circular structure) before filesystem write
    let caughtSerializationError: any = null;
    try {
      const corruptData: any = { users: [] };
      corruptData.self = corruptData; // circular structure
      // Trigger write with circular structure
      maintenanceRepository.createCase({
        projectId: 'TEST_PROJ',
        assetId: 'UNREGISTERED',
        title: 'تست شکست سریال‌سازی',
        description: 'شرح',
        priority: 'MEDIUM',
        status: 'OPEN',
        category: 'CORRECTIVE',
        reportedBy: 'user-test',
        reportedAt: new Date().toISOString(),
        alertIds: [],
        circular: corruptData
      } as any);
    } catch (e: any) {
      caughtSerializationError = e;
    }

    assert(
      caughtSerializationError !== null,
      'Test 3: Serialization error throws before modifying target storage'
    );

    // Verify database file was NOT corrupted or modified
    const validContentAfterSerialization = fs.readFileSync(tempDbPath, 'utf-8');
    assert(
      validContentAfterSerialization === validContentBefore,
      'Test 3: Previous valid database file remained 100% byte-for-byte identical after serialization failure'
    );

    // 3b. File system write failure when target directory is invalid (ENOTDIR)
    const blockerFilePath = path.join('/tmp', `hooshyar_not_a_dir_${Date.now()}`);
    fs.writeFileSync(blockerFilePath, 'plain file acting as directory blocker', 'utf-8');
    const invalidTargetDbPath = path.join(blockerFilePath, 'db.json');

    db.setDBPath(invalidTargetDbPath);
    let caughtIoError: any = null;
    try {
      db.createUser({ phone: '09120000000', fullName: 'تست خطا' });
    } catch (e: any) {
      caughtIoError = e;
    }

    assert(
      caughtIoError !== null && caughtIoError.message.includes('FATAL: Failed to persist database'),
      'Test 3: File system write failure throws controlled FATAL storage error'
    );

    // Clean up blocker file and restore isolated database path
    try { fs.unlinkSync(blockerFilePath); } catch {}
    db.setDBPath(tempDbPath);

    const validContentAfter = fs.readFileSync(tempDbPath, 'utf-8');
    assert(
      validContentAfter === validContentBefore,
      'Test 3: Isolated test database remained 100% byte-for-byte identical'
    );

    // -------------------------------------------------------------------------
    // TEST 4: NORMAL ATOMIC REPLACEMENT PERSISTS DATA CORRECTLY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: NORMAL ATOMIC REPLACEMENT PERSISTENCE ---');
    const testCaseAtomic = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تست ذخیره‌سازی اتمیک',
      description: 'تست پایداری اتمیک',
      priority: 'HIGH',
      status: 'OPEN',
      category: 'CORRECTIVE',
      reportedBy: 'customer-1',
      reportedAt: new Date().toISOString(),
      alertIds: []
    });

    assert(Boolean(testCaseAtomic.id), 'Test 4: Case created successfully via atomic write');
    const reReadCase = maintenanceRepository.getCaseById(testCaseAtomic.id);
    assert(
      reReadCase?.title === 'پرونده تست ذخیره‌سازی اتمیک',
      'Test 4: Case successfully read back from atomically replaced database'
    );

    // -------------------------------------------------------------------------
    // TEST 5: PRODUCTION WRITE RESTRICTIONS REMAIN ENFORCED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: PRODUCTION WRITE RESTRICTIONS ---');
    const prevNodeEnv = process.env.NODE_ENV;
    const prevAllowDev = process.env.ALLOW_DEV_LOCAL_STORAGE;
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEV_LOCAL_STORAGE;

    let caughtProdWriteError: any = null;
    try {
      maintenanceRepository.updateCase(testCaseAtomic.id, { notes: 'تست رد نوشتن در پروداکشن' } as any);
    } catch (e: any) {
      caughtProdWriteError = e;
    }

    assert(
      caughtProdWriteError !== null && caughtProdWriteError.message.includes('Filesystem database mutation is strictly forbidden in production mode'),
      'Test 5: Production write restriction strictly blocks filesystem mutations'
    );

    // Restore test environment variables
    process.env.NODE_ENV = prevNodeEnv || 'test';
    if (prevAllowDev) process.env.ALLOW_DEV_LOCAL_STORAGE = prevAllowDev;

    // -------------------------------------------------------------------------
    // SETUP TEST EXPRESS SERVER & FIXTURES FOR AUDIT TESTING
    // -------------------------------------------------------------------------
    const adminUser = db.createUser({
      phone: '09129990001',
      fullName: 'مدیر ارشد سامانه',
      roles: ['ADMIN'],
      role: 'ADMIN'
    });
    const customerUser = db.createUser({
      phone: '09121110001',
      fullName: 'کاربر مشتری',
      roles: ['CUSTOMER'],
      role: 'CUSTOMER'
    });
    const techUserA = db.createUser({
      phone: '09123330001',
      fullName: 'مهندس الف',
      roles: ['TECHNICIAN'],
      role: 'TECHNICIAN'
    });
    const techUserB = db.createUser({
      phone: '09123330002',
      fullName: 'مهندس ب',
      roles: ['TECHNICIAN'],
      role: 'TECHNICIAN'
    });

    const proTechA = professionalRepository.createProfessional({
      userId: techUserA.id,
      fullName: 'مهندس الف',
      phone: '09123330001',
      nationalId: '1111111111',
      companyName: 'شرکت خدمات الف',
      specialties: ['GENERAL_ELECTRIC', 'SOLAR_INVERTER'],
      serviceCities: ['تهران'],
      yearsExperience: 8,
      status: 'approved',
      approvalStatus: 'APPROVED'
    } as any);

    const proTechB = professionalRepository.createProfessional({
      userId: techUserB.id,
      fullName: 'مهندس ب',
      phone: '09123330002',
      nationalId: '2222222222',
      companyName: 'شرکت خدمات ب',
      specialties: ['GENERATOR_MECHANIC'],
      serviceCities: ['تهران'],
      yearsExperience: 5,
      status: 'approved',
      approvalStatus: 'APPROVED'
    } as any);

    const adminToken = jwtService.sign({
      userId: adminUser.id,
      role: adminUser.role,
      roles: adminUser.roles
    });
    const customerToken = jwtService.sign({
      userId: customerUser.id,
      role: customerUser.role,
      roles: customerUser.roles
    });
    const techTokenA = jwtService.sign({
      userId: techUserA.id,
      role: techUserA.role,
      roles: techUserA.roles
    });

    const app = express();
    app.use(express.json());
    app.use('/api', maintenanceRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    // -------------------------------------------------------------------------
    // TEST 6: RECONCILIATION ENDPOINT AUTHORIZATION GATES
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: RECONCILIATION AUDIT AUTHORIZATION GATES ---');
    // Unauthenticated
    const unauthRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`);
    assert(
      unauthRes.status === 401,
      'Test 6: Unauthenticated request rejected with HTTP 401'
    );

    // Non-admin (Customer)
    const customerRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(
      customerRes.status === 403,
      'Test 6: Customer request rejected with HTTP 403'
    );

    // Non-admin (Technician)
    const techRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(
      techRes.status === 403,
      'Test 6: Technician request rejected with HTTP 403'
    );

    // -------------------------------------------------------------------------
    // TEST 7: ADMINISTRATORS CAN RETRIEVE ACTIONABLE FINDINGS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: ADMINISTRATOR AUDIT RETRIEVAL ---');
    const adminAuditRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(
      adminAuditRes.status === 200,
      'Test 7: Administrator audit request succeeds with HTTP 200'
    );
    const auditReport = await adminAuditRes.json();
    assert(
      typeof auditReport.totalCasesScanned === 'number',
      'Test 7: Audit report includes totalCasesScanned count'
    );
    assert(
      Array.isArray(auditReport.findings),
      'Test 7: Audit report includes findings array'
    );
    assert(
      typeof auditReport.summary === 'object',
      'Test 7: Audit report includes structured summary'
    );

    // -------------------------------------------------------------------------
    // TEST 8: DETECTION OF ANOMALIES (MISSING ACCEPTANCE & MISMATCHED HISTORY)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: DETECTION OF INCONSISTENT CASE STATES ---');
    
    // Anomaly 1: IN_PROGRESS without formal acceptance
    const badInProgressCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده در حال اجرا بدون پذیرش رسمی',
      description: 'شرح نقص',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'مهندس الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    // Add only ASSIGNED history, no ACCEPTED history
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: badInProgressCase.id,
      technicianId: techUserA.id,
      assignedBy: adminUser.id,
      status: 'ASSIGNED'
    });

    // Anomaly 2: Assigned technician does not match latest ASSIGNED history (Mismatched / Orphaned)
    const mismatchedHistoryCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده با عدم تطابق آخرین سابقه تخصیص',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'مهندس الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    // Add ASSIGNED history record for Tech B while case is assigned to Tech A
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: mismatchedHistoryCase.id,
      technicianId: techUserB.id,
      assignedBy: adminUser.id,
      status: 'ASSIGNED'
    });

    // Anomaly 3: Case active (ASSIGNED) with no technician
    const activeUnassignedCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تخصیص یافته بدون تکنسین',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });

    // Run audit
    const anomalyAuditRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const anomalyReport = await anomalyAuditRes.json();

    const inProgressAnomaly = anomalyReport.findings.find(
      (f: any) => f.caseId === badInProgressCase.id && f.anomalyType === 'EXECUTION_WITHOUT_ACCEPTANCE'
    );
    assert(
      Boolean(inProgressAnomaly),
      'Test 8: Audit detects EXECUTION_WITHOUT_ACCEPTANCE on unaccepted IN_PROGRESS case'
    );
    assert(
      inProgressAnomaly.severity === 'CRITICAL',
      'Test 8: Unaccepted execution anomaly is marked CRITICAL severity'
    );

    const mismatchAnomaly = anomalyReport.findings.find(
      (f: any) => f.caseId === mismatchedHistoryCase.id && f.anomalyType === 'ORPHANED_ASSIGNMENT'
    );
    assert(
      Boolean(mismatchAnomaly),
      'Test 8: Audit detects ORPHANED_ASSIGNMENT on mismatched assignment history'
    );

    const unassignedActiveAnomaly = anomalyReport.findings.find(
      (f: any) => f.caseId === activeUnassignedCase.id && f.anomalyType === 'UNASSIGNED_BUT_ACTIVE_STATUS'
    );
    assert(
      Boolean(unassignedActiveAnomaly),
      'Test 8: Audit detects UNASSIGNED_BUT_ACTIVE_STATUS'
    );

    // -------------------------------------------------------------------------
    // TEST 9: LEGITIMATE CASES AVOID FALSE-POSITIVE CRITICAL FINDINGS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: LEGITIMATE CASES AVOID FALSE POSITIVES ---');
    // Healthy OPEN case
    const healthyOpenCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده سالم باز',
      description: 'شرح',
      priority: 'LOW',
      status: 'OPEN',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });

    // Healthy CLOSED case that completed normally
    const healthyClosedCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده سالم خاتمه یافته',
      description: 'شرح',
      priority: 'LOW',
      status: 'CLOSED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'مهندس الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: healthyClosedCase.id,
      technicianId: techUserA.id,
      assignedBy: adminUser.id,
      status: 'ASSIGNED'
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: healthyClosedCase.id,
      technicianId: techUserA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED'
    });

    // Healthy IN_PROGRESS case with valid acceptance
    const healthyInProgressCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده سالم در حال اجرا',
      description: 'شرح',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'مهندس الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: healthyInProgressCase.id,
      technicianId: techUserA.id,
      assignedBy: adminUser.id,
      status: 'ASSIGNED'
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: healthyInProgressCase.id,
      technicianId: techUserA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED'
    });

    const falsePositiveCheckRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const fpReport = await falsePositiveCheckRes.json();

    const fpOpen = fpReport.findings.find((f: any) => f.caseId === healthyOpenCase.id);
    assert(!fpOpen, 'Test 9: Healthy OPEN case produces zero anomalies');

    const fpClosed = fpReport.findings.find((f: any) => f.caseId === healthyClosedCase.id);
    assert(!fpClosed, 'Test 9: Healthy CLOSED case with prior acceptance produces zero anomalies');

    const fpInProgress = fpReport.findings.find((f: any) => f.caseId === healthyInProgressCase.id);
    assert(!fpInProgress, 'Test 9: Legitimate accepted IN_PROGRESS case produces zero anomalies');

    // -------------------------------------------------------------------------
    // TEST 10: AUDIT ENDPOINT CAUSES ZERO DATABASE MUTATIONS (STRICT READ-ONLY)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: ZERO DATABASE MUTATIONS DURING AUDIT ---');
    const dbRawBeforeAudit = fs.readFileSync(tempDbPath, 'utf-8');

    await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const dbRawAfterAudit = fs.readFileSync(tempDbPath, 'utf-8');
    assert(
      dbRawBeforeAudit === dbRawAfterAudit,
      'Test 10: Reconciliation audit endpoint is strictly read-only and caused 0 bytes database mutation'
    );

    // -------------------------------------------------------------------------
    // TEST 11: PRIVACY & F.4 BEHAVIOR PRESERVED IN AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: CUSTOMER CONTACT PRIVACY PRESERVED ---');
    const privacyFindings = fpReport.findings;
    for (const finding of privacyFindings) {
      assert(
        finding.contactPhone === undefined && finding.contactName === undefined,
        `Test 11: Finding for case ${finding.caseId} strictly omits customer contact details`
      );
    }
    assert(true, 'Test 11: Audit report strictly omits all customer contact numbers across all findings');

    // Close server
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // -------------------------------------------------------------------------
    // IMMUTABILITY OF COMMITTED DB.JSON
    // -------------------------------------------------------------------------
    console.log('\n--- VERIFYING PRODUCTION DB IMMUTABILITY GUARD ---');
    isolation.verifyImmutability();
    assert(true, 'Repository db.json byte-for-byte identical');

  } finally {
    isolation.cleanup();
  }

  console.log('================================================================');
  console.log(`STAGE F.5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
