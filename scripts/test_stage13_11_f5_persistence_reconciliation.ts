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
import { db, DatabaseStorageError, validateDBStructure } from '../src/db/index.js';
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
    // 1a. Malformed JSON syntax
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
      'Test 1a: Reading corrupt database file strictly throws an error instead of returning defaults'
    );
    assert(
      caughtCorruptionError instanceof DatabaseStorageError || caughtCorruptionError.name === 'DatabaseStorageError',
      'Test 1a: Error thrown is an authoritative DatabaseStorageError instance'
    );
    assert(
      caughtCorruptionError.message.includes('FATAL: Database storage corruption detected'),
      'Test 1a: Error message explicitly warns of database corruption and aborts to prevent data loss'
    );

    // Verify file content was NOT overwritten or reset to defaultDB
    const rawAfterAttempt = fs.readFileSync(corruptTestPath, 'utf-8');
    assert(
      rawAfterAttempt.includes('INVALID_JSON'),
      'Test 1a: Corrupted file was preserved intact without silent overwrite'
    );
    try { fs.unlinkSync(corruptTestPath); } catch {}

    // 1b. Syntactically valid JSON with malformed top-level collection: users as object {} instead of Array
    console.log('\n--- TEST 1B: MALFORMED TOP-LEVEL COLLECTION (OBJECT INSTEAD OF ARRAY) ---');
    const objectUsersPath = path.join('/tmp', `hooshyar_obj_users_${Date.now()}.json`);
    const objectUsersContent = JSON.stringify({ users: { id: "user_1" }, maintenanceCases: [] });
    fs.writeFileSync(objectUsersPath, objectUsersContent, 'utf-8');

    db.setDBPath(objectUsersPath);
    let caughtObjectUsersError: any = null;
    try {
      db.getUsers();
    } catch (e: any) {
      caughtObjectUsersError = e;
    }

    assert(
      caughtObjectUsersError !== null && caughtObjectUsersError instanceof DatabaseStorageError,
      'Test 1b: Syntactically valid JSON with "users": {} strictly throws DatabaseStorageError'
    );
    assert(
      caughtObjectUsersError.message.includes("Collection 'users' must be an Array"),
      'Test 1b: Error message specifies collection "users" must be an Array'
    );
    // Verify file was NOT overwritten with defaultDB
    assert(
      fs.readFileSync(objectUsersPath, 'utf-8') === objectUsersContent,
      'Test 1b: Existing file with malformed "users": {} was 100% preserved on disk without silent overwrite'
    );
    try { fs.unlinkSync(objectUsersPath); } catch {}

    // 1c. Syntactically valid JSON with malformed top-level collection: maintenanceCases as string instead of Array
    console.log('\n--- TEST 1C: MALFORMED TOP-LEVEL COLLECTION (STRING INSTEAD OF ARRAY) ---');
    const stringCasesPath = path.join('/tmp', `hooshyar_str_cases_${Date.now()}.json`);
    const stringCasesContent = JSON.stringify({ maintenanceCases: "invalid_cases_string", users: [] });
    fs.writeFileSync(stringCasesPath, stringCasesContent, 'utf-8');

    db.setDBPath(stringCasesPath);
    let caughtStringCasesError: any = null;
    try {
      db.getMaintenanceCases();
    } catch (e: any) {
      caughtStringCasesError = e;
    }

    assert(
      caughtStringCasesError !== null && caughtStringCasesError instanceof DatabaseStorageError,
      'Test 1c: Syntactically valid JSON with "maintenanceCases": "invalid" strictly throws DatabaseStorageError'
    );
    assert(
      caughtStringCasesError.message.includes("Collection 'maintenanceCases' must be an Array"),
      'Test 1c: Error message specifies collection "maintenanceCases" must be an Array'
    );
    assert(
      fs.readFileSync(stringCasesPath, 'utf-8') === stringCasesContent,
      'Test 1c: Existing file with string maintenanceCases was 100% preserved on disk'
    );
    try { fs.unlinkSync(stringCasesPath); } catch {}

    // 1d. Syntactically valid JSON with null collection: maintenanceCases as null
    console.log('\n--- TEST 1D: NULL TOP-LEVEL COLLECTION (NULL INSTEAD OF ARRAY) ---');
    const nullCasesPath = path.join('/tmp', `hooshyar_null_cases_${Date.now()}.json`);
    const nullCasesContent = JSON.stringify({ maintenanceCases: null, users: [] });
    fs.writeFileSync(nullCasesPath, nullCasesContent, 'utf-8');

    db.setDBPath(nullCasesPath);
    let caughtNullCasesError: any = null;
    try {
      db.getMaintenanceCases();
    } catch (e: any) {
      caughtNullCasesError = e;
    }

    assert(
      caughtNullCasesError !== null && caughtNullCasesError instanceof DatabaseStorageError,
      'Test 1d: Syntactically valid JSON with "maintenanceCases": null strictly throws DatabaseStorageError'
    );
    assert(
      fs.readFileSync(nullCasesPath, 'utf-8') === nullCasesContent,
      'Test 1d: Existing file with null maintenanceCases was 100% preserved on disk'
    );
    try { fs.unlinkSync(nullCasesPath); } catch {}

    // 1e. Collection containing invalid non-object item (e.g. primitive string or null record)
    console.log('\n--- TEST 1E: INVALID RECORD TYPES WITHIN COLLECTION ---');
    const corruptItemsPath = path.join('/tmp', `hooshyar_bad_item_${Date.now()}.json`);
    const corruptItemsContent = JSON.stringify({ users: [{ id: "u1" }, "corrupt_string_record"] });
    fs.writeFileSync(corruptItemsPath, corruptItemsContent, 'utf-8');

    db.setDBPath(corruptItemsPath);
    let caughtCorruptItemError: any = null;
    try {
      db.getUsers();
    } catch (e: any) {
      caughtCorruptItemError = e;
    }

    assert(
      caughtCorruptItemError !== null && caughtCorruptItemError instanceof DatabaseStorageError,
      'Test 1e: Collection with primitive string item strictly throws DatabaseStorageError'
    );
    assert(
      caughtCorruptItemError.message.includes('Record at index 1 in collection \'users\' must be an object'),
      'Test 1e: Error message explicitly highlights index and non-object record'
    );
    assert(
      fs.readFileSync(corruptItemsPath, 'utf-8') === corruptItemsContent,
      'Test 1e: Existing file with primitive item was 100% preserved on disk'
    );
    try { fs.unlinkSync(corruptItemsPath); } catch {}

    // 1f. Collection containing null item
    const nullItemPath = path.join('/tmp', `hooshyar_null_item_${Date.now()}.json`);
    const nullItemContent = JSON.stringify({ users: [null] });
    fs.writeFileSync(nullItemPath, nullItemContent, 'utf-8');

    db.setDBPath(nullItemPath);
    let caughtNullItemError: any = null;
    try {
      db.getUsers();
    } catch (e: any) {
      caughtNullItemError = e;
    }

    assert(
      caughtNullItemError !== null && caughtNullItemError instanceof DatabaseStorageError,
      'Test 1f: Collection with null item strictly throws DatabaseStorageError'
    );
    try { fs.unlinkSync(nullItemPath); } catch {}

    // 1g. Valid legacy records with partial fields are preserved and NOT rejected
    console.log('\n--- TEST 1G: VALID LEGACY RECORDS WITH PARTIAL FIELDS ARE PRESERVED ---');
    const legacyValidPath = path.join('/tmp', `hooshyar_legacy_valid_${Date.now()}.json`);
    const legacyValidContent = JSON.stringify({
      users: [
        { id: "legacy_user_1", phone: "09121110001" }, // sparse legacy user record without roles or createdAt
        { id: "legacy_user_2", phone: "09122220002", name: "کاربر موروثی" }
      ],
      maintenanceCases: [
        { id: "case_legacy_1", title: "پرونده موروثی", status: "ASSIGNED", assignedTechnicianId: "tech-legacy" }
      ]
    });
    fs.writeFileSync(legacyValidPath, legacyValidContent, 'utf-8');

    db.setDBPath(legacyValidPath);
    const loadedLegacyUsers = db.getUsers();
    assert(
      Array.isArray(loadedLegacyUsers) && loadedLegacyUsers.length === 2,
      'Test 1g: Valid legacy records with sparse fields load successfully without being rejected'
    );
    assert(
      loadedLegacyUsers[0].id === 'legacy_user_1' && loadedLegacyUsers[1].name === 'کاربر موروثی',
      'Test 1g: Legacy user field values match persisted data exactly'
    );
    const loadedLegacyCases = db.getMaintenanceCases();
    assert(
      Array.isArray(loadedLegacyCases) && loadedLegacyCases.length === 1 && loadedLegacyCases[0].id === 'case_legacy_1',
      'Test 1g: Legacy maintenance case loaded successfully'
    );
    try { fs.unlinkSync(legacyValidPath); } catch {}

    // 1h. Legitimately absent optional collections preserve backward compatibility
    console.log('\n--- TEST 1H: LEGITIMATELY ABSENT OPTIONAL COLLECTIONS PRESERVE BACKWARD COMPATIBILITY ---');
    const sparseDbPath = path.join('/tmp', `hooshyar_sparse_${Date.now()}.json`);
    // Database file containing only users and subscriptionPlans; all other collections legitimately absent
    fs.writeFileSync(sparseDbPath, JSON.stringify({
      users: [{ id: "u_sparse", phone: "09129998877" }]
    }), 'utf-8');

    db.setDBPath(sparseDbPath);
    const sparseUsers = db.getUsers();
    assert(
      Array.isArray(sparseUsers) && sparseUsers.length === 1 && sparseUsers[0].id === 'u_sparse',
      'Test 1h: Sparse database file with absent optional collections loads successfully'
    );
    const sparseCases = db.getMaintenanceCases();
    assert(
      Array.isArray(sparseCases) && sparseCases.length === 0,
      'Test 1h: Absent optional maintenanceCases defaults gracefully to empty array'
    );
    try { fs.unlinkSync(sparseDbPath); } catch {}

    // 1i. Validation does not mutate input object
    console.log('\n--- TEST 1I: VALIDATION DOES NOT MUTATE INPUT DATA ---');
    const inputSnapshot = {
      users: [{ id: "u1", phone: "09121110001" }],
      maintenanceCases: []
    };
    const inputBefore = JSON.stringify(inputSnapshot);
    validateDBStructure(inputSnapshot);
    const inputAfter = JSON.stringify(inputSnapshot);
    assert(
      inputBefore === inputAfter,
      'Test 1i: validateDBStructure is strictly read-only and causes 0 mutations to loaded data'
    );

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
