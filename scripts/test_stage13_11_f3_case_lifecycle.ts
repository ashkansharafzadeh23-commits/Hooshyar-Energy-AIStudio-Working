/**
 * STAGE 13.11-F.3: MAINTENANCE CASE LIFECYCLE & STATE-MACHINE HARDENING TEST SUITE
 * 
 * Verifies:
 * - TEST 1: ASSIGNED + no ACCEPTED history -> direct transitionCaseStatus(..., 'IN_PROGRESS', ...) -> MUST FAIL -> remains ASSIGNED
 * - TEST 2: ASSIGNED + ACCEPTED history for current technician -> direct transitionCaseStatus(..., 'IN_PROGRESS', ...) -> MUST SUCCEED
 * - TEST 3: ASSIGNED + ACCEPTED history for FOREIGN technician -> direct transitionCaseStatus(..., 'IN_PROGRESS', ...) -> MUST FAIL
 * - TEST 4: SCHEDULED + no ACCEPTED history -> direct transitionCaseStatus(..., 'IN_PROGRESS', ...) -> MUST FAIL
 * - TEST 5: SCHEDULED + ACCEPTED history for current technician -> direct transitionCaseStatus(..., 'IN_PROGRESS', ...) -> MUST SUCCEED
 * - TEST 6: SCHEDULED + ACCEPTED history for previous/foreign technician -> direct transitionCaseStatus(..., 'IN_PROGRESS', ...) -> MUST FAIL
 * - TEST 7: PENDING_VERIFICATION -> IN_PROGRESS -> MUST remain allowed (legacy rework) without requiring new ACCEPTED history
 * - TEST 8: AWAITING_VERIFICATION -> IN_PROGRESS -> MUST remain allowed (customer rework) without requiring new ACCEPTED history
 * - TEST 9: IN_PROGRESS -> SCHEDULED -> MUST FAIL
 * - TEST 10: HTTP POST /start before /accept still fails (HTTP 409)
 * - TEST 11: HTTP POST /accept persists ACCEPTED history and transitions to IN_PROGRESS without duplicates
 * - TEST 12: HTTP POST /start after /accept succeeds without duplicate histories
 * - TEST 13: F.2 privacy behavior remains intact (customer contact hidden before /accept, released after)
 * - TEST 14: Generic PATCH status injection protection (HTTP 400)
 * - TEST 15: Valid normal end-to-end lifecycle progression (OPEN -> ASSIGNED -> SCHEDULED -> IN_PROGRESS -> AWAITING_VERIFICATION -> COMPLETED -> CLOSED)
 * - TEST 16: Cancellation flow (OPEN/ASSIGNED/IN_PROGRESS -> CANCELLED; CLOSED cannot be cancelled)
 * - Database Immutability: SHA-256 baseline verification
 */

import http from 'http';
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
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STAGE 13.11-F.3: CASE LIFECYCLE & STATE MACHINE HARDENING TESTS');
  console.log('================================================================\n');

  // 1. Database Isolation Guard
  const isolation = setupTestDatabaseIsolation('stage13_11_f3_lifecycle');

  try {
    const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { maintenanceCaseService } = await import('../src/services/maintenanceCaseService.js');
    const { maintenanceRouter } = await import('../src/api/maintenance.js');

    // -------------------------------------------------------------------------
    // SETUP TEST ACTORS
    // -------------------------------------------------------------------------
    const customerUser = userRepository.createUser({
      name: 'کارفرما نیروگاه آزمایشی',
      phone: '09121110001',
      role: 'PROJECT_OWNER',
      roles: ['PROJECT_OWNER']
    });
    const customerToken = jwtService.sign({
      userId: customerUser.id,
      role: customerUser.role,
      roles: customerUser.roles
    });

    const techUserA = userRepository.createUser({
      name: 'مهندس ارشد تعمیرات و عیب‌یابی الف',
      phone: '09122220002',
      role: 'technician',
      roles: ['technician']
    });
    const techTokenA = jwtService.sign({
      userId: techUserA.id,
      role: techUserA.role,
      roles: techUserA.roles
    });

    const techUserB = userRepository.createUser({
      name: 'تکنسین ثانویه ب',
      phone: '09122220003',
      role: 'technician',
      roles: ['technician']
    });

    const proTechA = professionalRepository.createProfessional({
      userId: techUserA.id,
      fullName: 'مهندس ارشد تعمیرات و عیب‌یابی الف',
      phone: '09122220002',
      serviceCities: ['تهران'],
      specialties: ['دیزل ژنراتور', 'اینورتر خورشیدی'],
      yearsExperience: 10,
      rating: 4.9,
      bio: 'متخصص مورد تایید',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proTechA.id, 'approved');

    // -------------------------------------------------------------------------
    // SETUP TEST EXPRESS SERVER
    // -------------------------------------------------------------------------
    const app = express();
    app.use(express.json());
    app.use('/api', maintenanceRouter);
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    // -------------------------------------------------------------------------
    // TEST 1: ASSIGNED + NO ACCEPTED HISTORY -> DIRECT SERVICE REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: ASSIGNED + NO ACCEPTED HISTORY -> DIRECT SERVICE CALL ---');
    const case1 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست ۱: پرونده تخصیص یافته بدون پذیرش',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    let serviceAssignedWithoutAcceptRejected = false;
    try {
      maintenanceCaseService.transitionCaseStatus(case1.id, 'IN_PROGRESS', techUserA.id);
    } catch (e: any) {
      serviceAssignedWithoutAcceptRejected = true;
    }
    assert(
      serviceAssignedWithoutAcceptRejected,
      'Test 1: Direct call transitionCaseStatus(..., IN_PROGRESS) without ACCEPTED history strictly throws Error'
    );
    const case1Db = maintenanceRepository.getCaseById(case1.id);
    assert(case1Db?.status === 'ASSIGNED', 'Test 1: Case status in database remains ASSIGNED');
    const histories1 = maintenanceRepository.getAssignmentHistories(case1.id) || [];
    assert(histories1.length === 0, 'Test 1: Zero assignment history entries created');

    // -------------------------------------------------------------------------
    // TEST 2: ASSIGNED + ACCEPTED HISTORY FOR CURRENT TECH -> DIRECT SERVICE SUCCEEDS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: ASSIGNED + ACCEPTED HISTORY FOR CURRENT TECH -> DIRECT SERVICE CALL ---');
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case1.id,
      technicianId: techUserA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED',
      notes: 'پذیرش رسمی تکنسین الف'
    });

    const transitionedCase1 = maintenanceCaseService.transitionCaseStatus(case1.id, 'IN_PROGRESS', techUserA.id);
    assert(
      transitionedCase1.status === 'IN_PROGRESS',
      'Test 2: Direct call transitionCaseStatus(..., IN_PROGRESS) with valid ACCEPTED history for CURRENT tech succeeds'
    );

    // -------------------------------------------------------------------------
    // TEST 3: ASSIGNED + ACCEPTED HISTORY FOR FOREIGN TECH -> DIRECT SERVICE REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: ASSIGNED + ACCEPTED HISTORY FOR FOREIGN TECH -> DIRECT SERVICE CALL ---');
    const case3 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست ۳: پذیرش توسط تکنسین غیرمنصوب',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    // Inject ACCEPTED history belonging to Technician B (foreign)
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case3.id,
      technicianId: techUserB.id,
      assignedBy: techUserB.id,
      status: 'ACCEPTED',
      notes: 'پذیرش توسط تکنسین ب (نامربوط)'
    });

    let foreignAcceptRejected = false;
    try {
      maintenanceCaseService.transitionCaseStatus(case3.id, 'IN_PROGRESS', techUserA.id);
    } catch (e: any) {
      foreignAcceptRejected = true;
    }
    assert(
      foreignAcceptRejected,
      'Test 3: Direct transition to IN_PROGRESS rejected when ACCEPTED history belongs to a FOREIGN technician'
    );
    const case3Db = maintenanceRepository.getCaseById(case3.id);
    assert(case3Db?.status === 'ASSIGNED', 'Test 3: Case status remains ASSIGNED in database');

    // -------------------------------------------------------------------------
    // TEST 4: SCHEDULED + NO ACCEPTED HISTORY -> DIRECT SERVICE REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: SCHEDULED + NO ACCEPTED HISTORY -> DIRECT SERVICE CALL ---');
    const case4 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست ۴: زمان‌بندی شده بدون پذیرش',
      description: 'شرح',
      priority: 'HIGH',
      status: 'SCHEDULED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      scheduledDate: '2026-10-25',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    let scheduledWithoutAcceptRejected = false;
    try {
      maintenanceCaseService.transitionCaseStatus(case4.id, 'IN_PROGRESS', techUserA.id);
    } catch (e: any) {
      scheduledWithoutAcceptRejected = true;
    }
    assert(
      scheduledWithoutAcceptRejected,
      'Test 4: Direct service transition SCHEDULED -> IN_PROGRESS without ACCEPTED history strictly rejected'
    );
    const case4Db = maintenanceRepository.getCaseById(case4.id);
    assert(case4Db?.status === 'SCHEDULED', 'Test 4: Case status remains SCHEDULED in database');

    // -------------------------------------------------------------------------
    // TEST 5: SCHEDULED + ACCEPTED HISTORY FOR CURRENT TECH -> DIRECT SERVICE SUCCEEDS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: SCHEDULED + ACCEPTED HISTORY FOR CURRENT TECH -> DIRECT SERVICE CALL ---');
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case4.id,
      technicianId: techUserA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED',
      notes: 'پذیرش رسمی پرونده زمان‌بندی شده'
    });

    const transitionedCase4 = maintenanceCaseService.transitionCaseStatus(case4.id, 'IN_PROGRESS', techUserA.id);
    assert(
      transitionedCase4.status === 'IN_PROGRESS',
      'Test 5: Direct service transition SCHEDULED -> IN_PROGRESS with valid ACCEPTED history for CURRENT tech succeeds'
    );

    // -------------------------------------------------------------------------
    // TEST 6: SCHEDULED + ACCEPTED HISTORY FOR FOREIGN TECH -> DIRECT SERVICE REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: SCHEDULED + ACCEPTED HISTORY FOR FOREIGN TECH -> DIRECT SERVICE CALL ---');
    const case6 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست ۶: زمان‌بندی شده با پذیرش تکنسین خارجی',
      description: 'شرح',
      priority: 'HIGH',
      status: 'SCHEDULED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      scheduledDate: '2026-10-25',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    // Foreign technician B acceptance
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case6.id,
      technicianId: techUserB.id,
      assignedBy: techUserB.id,
      status: 'ACCEPTED',
      notes: 'پذیرش توسط تکنسین نامربوط'
    });

    let scheduledForeignAcceptRejected = false;
    try {
      maintenanceCaseService.transitionCaseStatus(case6.id, 'IN_PROGRESS', techUserA.id);
    } catch (e: any) {
      scheduledForeignAcceptRejected = true;
    }
    assert(
      scheduledForeignAcceptRejected,
      'Test 6: Direct service transition SCHEDULED -> IN_PROGRESS with foreign technician ACCEPTED history strictly rejected'
    );
    const case6Db = maintenanceRepository.getCaseById(case6.id);
    assert(case6Db?.status === 'SCHEDULED', 'Test 6: Case status remains SCHEDULED in database');

    // -------------------------------------------------------------------------
    // TEST 7: PENDING_VERIFICATION -> IN_PROGRESS (LEGACY REWORK) SUCCEEDS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: PENDING_VERIFICATION -> IN_PROGRESS (LEGACY REWORK) ---');
    const case7 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست ۷: وضعیت قدیمی PENDING_VERIFICATION',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'PENDING_VERIFICATION',
      assignedTechnicianId: techUserA.id,
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    const reworkCase7 = maintenanceCaseService.transitionCaseStatus(case7.id, 'IN_PROGRESS', customerUser.id);
    assert(
      reworkCase7.status === 'IN_PROGRESS',
      'Test 7: PENDING_VERIFICATION -> IN_PROGRESS succeeds for legacy compatibility without new acceptance record'
    );

    // -------------------------------------------------------------------------
    // TEST 8: AWAITING_VERIFICATION -> IN_PROGRESS (CUSTOMER REWORK) SUCCEEDS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: AWAITING_VERIFICATION -> IN_PROGRESS (CUSTOMER REWORK) ---');
    const case8 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست ۸: رد تایید کارفرما و بازگشت به در حال اجرا',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'AWAITING_VERIFICATION',
      assignedTechnicianId: techUserA.id,
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    const reworkCase8 = maintenanceCaseService.transitionCaseStatus(case8.id, 'IN_PROGRESS', customerUser.id, {
      verificationNotes: 'نقص فنی رفع نشده است؛ نیاز به اصلاح'
    });
    assert(
      reworkCase8.status === 'IN_PROGRESS',
      'Test 8: AWAITING_VERIFICATION -> IN_PROGRESS succeeds without requiring new acceptance record (rework allowed)'
    );

    // -------------------------------------------------------------------------
    // TEST 9: IN_PROGRESS -> SCHEDULED IS STRICTLY REJECTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: IN_PROGRESS -> SCHEDULED IS REJECTED ---');
    let inProgressToScheduledRejected = false;
    try {
      maintenanceCaseService.transitionCaseStatus(transitionedCase4.id, 'SCHEDULED', techUserA.id);
    } catch (e: any) {
      inProgressToScheduledRejected = true;
    }
    assert(
      inProgressToScheduledRejected,
      'Test 9: Transition IN_PROGRESS -> SCHEDULED is strictly rejected by central state machine'
    );

    // -------------------------------------------------------------------------
    // TEST 10, 11, 12: HTTP LEVEL WORKFLOW AND ACCEPTANCE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10, 11, 12: HTTP LEVEL WORKFLOW AND ACCEPTANCE ---');
    const case10 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست ۱۰، ۱۱، ۱۲: گردش کار HTTP',
      description: 'شرح',
      priority: 'HIGH',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'مهندس حسینی',
      contactPhone: '09121110001',
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    // Test 10: /start before /accept fails with 409
    const preAcceptStartRes = await fetch(`${baseUrl}/cases/${case10.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(
      preAcceptStartRes.status === 409,
      `Test 10: HTTP POST /start before /accept rejected with HTTP 409 (got: ${preAcceptStartRes.status})`
    );
    const case10DbAfterFail = maintenanceRepository.getCaseById(case10.id);
    assert(case10DbAfterFail?.status === 'ASSIGNED', 'Test 10: Case status remains ASSIGNED');

    // Test 11: /accept succeeds and creates ACCEPTED history without duplicates on second call
    const acceptRes1 = await fetch(`${baseUrl}/cases/${case10.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش رسمی' })
    });
    assert(acceptRes1.status === 200, 'Test 11: HTTP POST /accept succeeds with HTTP 200');
    const case10DbAfterAccept = maintenanceRepository.getCaseById(case10.id);
    assert(case10DbAfterAccept?.status === 'IN_PROGRESS', 'Test 11: Case transitioned to IN_PROGRESS');

    const historiesCase10 = maintenanceRepository.getAssignmentHistories(case10.id) || [];
    const countAccepted1 = historiesCase10.filter(h => h.status === 'ACCEPTED').length;
    assert(countAccepted1 === 1, 'Test 11: Exactly 1 ACCEPTED assignment history entry persisted');

    // Repeat /accept call (duplicate suppression)
    const acceptRes2 = await fetch(`${baseUrl}/cases/${case10.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش مجدد' })
    });
    assert(acceptRes2.status === 200, 'Test 11: Calling /accept again succeeds gracefully');
    const historiesCase10AfterRepeat = maintenanceRepository.getAssignmentHistories(case10.id) || [];
    const countAccepted2 = historiesCase10AfterRepeat.filter(h => h.status === 'ACCEPTED').length;
    assert(countAccepted2 === 1, 'Test 11: Second /accept call does NOT create duplicate ACCEPTED records');

    // Test 12: /start after /accept succeeds
    const postAcceptStartRes = await fetch(`${baseUrl}/cases/${case10.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(postAcceptStartRes.status === 200, 'Test 12: HTTP POST /start after /accept succeeds with HTTP 200');
    const historiesCase10AfterStart = maintenanceRepository.getAssignmentHistories(case10.id) || [];
    const countAccepted3 = historiesCase10AfterStart.filter(h => h.status === 'ACCEPTED').length;
    assert(countAccepted3 === 1, 'Test 12: /start did NOT create duplicate ACCEPTED history');

    // -------------------------------------------------------------------------
    // TEST 13: F.2 PRIVACY BEHAVIOR INTACT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: F.2 PRIVACY BEHAVIOR INTACT ---');
    const case13 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست حریم خصوصی',
      description: 'شرح',
      priority: 'HIGH',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'مهندس رضایی',
      contactPhone: '09121110001',
      billDoc: {
        name: 'bill.pdf',
        status: 'UNVERIFIED',
        extractedData: { customerPhone: '09121110001', customerName: 'مهندس رضایی' }
      },
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    const preDetail = await (await fetch(`${baseUrl}/cases/${case13.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    })).json();
    assert(preDetail.contactName === undefined, 'Test 13: Pre-acceptance contactName is strictly hidden');
    assert(preDetail.contactPhone === undefined, 'Test 13: Pre-acceptance contactPhone is strictly hidden');
    assert(
      preDetail.billDoc?.extractedData?.customerPhone === undefined,
      'Test 13: Pre-acceptance nested bill customerPhone is strictly hidden'
    );

    // After /accept, contact is released
    await fetch(`${baseUrl}/cases/${case13.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش' })
    });
    const postDetail = await (await fetch(`${baseUrl}/cases/${case13.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    })).json();
    assert(postDetail.contactPhone === '09121110001', 'Test 13: Post-acceptance contactPhone is released for execution');

    // -------------------------------------------------------------------------
    // TEST 14: GENERIC PATCH STATUS INJECTION PROTECTION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: GENERIC PATCH STATUS INJECTION PROTECTION ---');
    const patchRes = await fetch(`${baseUrl}/cases/${case13.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    assert(patchRes.status === 400, 'Test 14: Direct status injection via PATCH strictly rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 15: VALID NORMAL LIFECYCLE (END TO END)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: VALID NORMAL LIFECYCLE PROGRESSION ---');
    const case15 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'سرویس ژنراتور کامل چرخه',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'OPEN',
      category: 'PREVENTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'مهندس حسینی',
      contactPhone: '09121110001',
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    // 1. OPEN -> ASSIGNED
    await fetch(`${baseUrl}/cases/${case15.id}/select-technician`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ technicianId: proTechA.id })
    });
    // 2. ASSIGNED -> SCHEDULED
    await fetch(`${baseUrl}/cases/${case15.id}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledAt: '2026-10-25T09:00:00Z' })
    });
    // 3. SCHEDULED -> IN_PROGRESS via /accept
    await fetch(`${baseUrl}/cases/${case15.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش' })
    });
    // 4. Log Action
    await fetch(`${baseUrl}/cases/${case15.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'انجام تعویض فیلترها' })
    });
    // 5. IN_PROGRESS -> AWAITING_VERIFICATION
    await fetch(`${baseUrl}/cases/${case15.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resolutionSummary: 'اتمام سرویس کامل' })
    });
    // 6. AWAITING_VERIFICATION -> COMPLETED
    await fetch(`${baseUrl}/cases/${case15.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verificationPassed: true, verificationNotes: 'تایید کیفیت عملکرد' })
    });
    // 7. COMPLETED -> CLOSED
    const closeRes = await fetch(`${baseUrl}/cases/${case15.id}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ closureNotes: 'بایگانی نهایی پرونده' })
    });
    assert(closeRes.status === 200, 'Test 15: End-to-end lifecycle progression succeeds');
    const case15Final = maintenanceRepository.getCaseById(case15.id);
    assert(case15Final?.status === 'CLOSED', 'Test 15: Final case status is CLOSED');

    // -------------------------------------------------------------------------
    // TEST 16: CANCELLATION FLOW
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: CANCELLATION FLOW ---');
    const case16 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست لغو پرونده',
      description: 'شرح',
      priority: 'LOW',
      status: 'OPEN',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    const cancelRes = await fetch(`${baseUrl}/cases/${case16.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'لغو تستی' })
    });
    assert(cancelRes.status === 200, 'Test 16: Case cancellation succeeds');
    const case16Final = maintenanceRepository.getCaseById(case16.id);
    assert(case16Final?.status === 'CANCELLED', 'Test 16: Case status becomes CANCELLED');

    // Cannot cancel already closed case
    const cancelClosedRes = await fetch(`${baseUrl}/cases/${case15.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'لغو پرونده بسته شده' })
    });
    assert(cancelClosedRes.status === 400, 'Test 16: Cannot cancel an already CLOSED case');

    server.close();

    // -------------------------------------------------------------------------
    // IMMUTABILITY GUARD
    // -------------------------------------------------------------------------
    console.log('\n--- VERIFYING PRODUCTION DB IMMUTABILITY GUARD ---');
    isolation.verifyImmutability();
  } finally {
    isolation.cleanup();
  }

  console.log('\n================================================================');
  console.log(`STAGE F.3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('\nFatal test execution error:', err);
  process.exit(1);
});
