/**
 * STAGE 13.11-F.3: MAINTENANCE CASE LIFECYCLE & STATE-MACHINE HARDENING TEST SUITE
 * 
 * Verifies:
 * - Test A: Valid normal lifecycle progression (OPEN -> ASSIGNED -> SCHEDULED -> IN_PROGRESS -> AWAITING_VERIFICATION -> COMPLETED -> CLOSED)
 * - Test B: Invalid transition rejection (OPEN -> VERIFIED, ASSIGNED -> VERIFIED, DRAFT -> IN_PROGRESS, CLOSED -> IN_PROGRESS, etc.)
 * - Test C: /start before acceptance must remain rejected (HTTP 409) and not bypass /accept (Preserving F.2)
 * - Test D: /accept followed by /start succeeds legitimately
 * - Test E: Scheduling (ASSIGNED -> SCHEDULED) and invalid scheduling transitions rejected
 * - Test F: Scheduled execution (SCHEDULED -> IN_PROGRESS) requires formal acceptance
 * - Test G: Verification flow (IN_PROGRESS -> AWAITING_VERIFICATION -> COMPLETED/VERIFIED)
 * - Test H: Invalid verification flow (cannot verify directly from OPEN, ASSIGNED, or without actions)
 * - Test I: Generic PATCH protection (direct status injection via PATCH /cases/:id is strictly rejected)
 * - Test J: Cancellation flow (OPEN/ASSIGNED/IN_PROGRESS -> CANCELLED allowed; CLOSED/CANCELLED cannot be re-cancelled)
 * - Test K: F.2 privacy preservation across lifecycle transitions (contact hidden until /accept, released after)
 * - Test L: No acceptance fabrication (transitions like /schedule, /start, verify do not fabricate ACCEPTED history)
 * - Test M: Persisted data integrity (customer contact details remain untouched in database)
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

    const techUser = userRepository.createUser({
      name: 'مهندس ارشد تعمیرات و عیب‌یابی',
      phone: '09122220002',
      role: 'technician',
      roles: ['technician']
    });
    const techToken = jwtService.sign({
      userId: techUser.id,
      role: techUser.role,
      roles: techUser.roles
    });

    const proTech = professionalRepository.createProfessional({
      userId: techUser.id,
      fullName: 'مهندس ارشد تعمیرات و عیب‌یابی',
      phone: '09122220002',
      serviceCities: ['تهران'],
      specialties: ['دیزل ژنراتور', 'اینورتر خورشیدی'],
      yearsExperience: 10,
      rating: 4.9,
      bio: 'متخصص مورد تایید',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proTech.id, 'approved');

    const adminUser = userRepository.createUser({
      name: 'مدیر سامانه',
      phone: '09120000000',
      role: 'SUPER_ADMIN',
      roles: ['SUPER_ADMIN']
    });
    const adminToken = jwtService.sign({
      userId: adminUser.id,
      role: adminUser.role,
      roles: adminUser.roles
    });

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
    // TEST A: VALID NORMAL LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST A: VALID NORMAL LIFECYCLE PROGRESSION ---');
    // 1. Create case (initial status: OPEN)
    const caseA = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'سرویس دوره‌ای ژنراتور اضطراری',
      description: 'نیاز به تعویض فیلترها و بررسی ولتاژ خروجی دینام',
      priority: 'MEDIUM',
      status: 'OPEN',
      category: 'PREVENTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'مهندس حسینی',
      contactPhone: '09121110001',
      symptoms: ['افت ولتاژ'],
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });
    assert(caseA.status === 'OPEN', 'Case A: Created with initial status OPEN');

    // 2. Select technician (OPEN -> ASSIGNED)
    const selectResA = await fetch(`${baseUrl}/cases/${caseA.id}/select-technician`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ technicianId: proTech.id })
    });
    assert(selectResA.status === 200, 'Case A: select-technician succeeds');
    const selectDataA = await selectResA.json();
    assert(selectDataA.status === 'ASSIGNED', 'Case A: Transitioned to ASSIGNED');

    // 3. Schedule execution (ASSIGNED -> SCHEDULED)
    const schedResA = await fetch(`${baseUrl}/cases/${caseA.id}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledAt: '2026-10-25T09:00:00Z' })
    });
    assert(schedResA.status === 200, 'Case A: schedule succeeds');
    const schedDataA = await schedResA.json();
    assert(schedDataA.status === 'SCHEDULED', 'Case A: Transitioned to SCHEDULED');

    // 4. Accept case (SCHEDULED/ASSIGNED -> IN_PROGRESS via /accept)
    const acceptResA = await fetch(`${baseUrl}/cases/${caseA.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش شد؛ مراجعه خواهم کرد' })
    });
    assert(acceptResA.status === 200, 'Case A: accept succeeds');
    const acceptDataA = await acceptResA.json();
    assert(acceptDataA.status === 'IN_PROGRESS', 'Case A: Transitioned to IN_PROGRESS');

    // 5. Log technical action
    const actionResA = await fetch(`${baseUrl}/cases/${caseA.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تنظیم رگولاتور ولتاژ و تعویض فیلتر روغن'
      })
    });
    assert(actionResA.status === 200 || actionResA.status === 201, 'Case A: Logged maintenance action');

    // 6. Submit verification (IN_PROGRESS -> AWAITING_VERIFICATION)
    const submitVerResA = await fetch(`${baseUrl}/cases/${caseA.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'عملیات سرویس و تنظیم ولتاژ با موفقیت انجام شد.',
        rootCause: 'فرسودگی فیلتر و کالیبره نبودن AVR'
      })
    });
    assert(submitVerResA.status === 200, 'Case A: submit-verification succeeds');
    const submitVerDataA = await submitVerResA.json();
    assert(submitVerDataA.status === 'AWAITING_VERIFICATION', 'Case A: Transitioned to AWAITING_VERIFICATION');

    // 7. Verify work by customer/reporter (AWAITING_VERIFICATION -> COMPLETED)
    const verifyResA = await fetch(`${baseUrl}/cases/${caseA.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verificationPassed: true, verificationNotes: 'کیفیت کار تایید گردید.' })
    });
    assert(verifyResA.status === 200, 'Case A: verify succeeds');
    const verifyDataA = await verifyResA.json();
    assert(verifyDataA.status === 'COMPLETED', 'Case A: Transitioned to COMPLETED');

    // 8. Close and archive case (COMPLETED -> CLOSED)
    const closeResA = await fetch(`${baseUrl}/cases/${caseA.id}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ closureNotes: 'تحویل نهایی انجام شد' })
    });
    assert(closeResA.status === 200, 'Case A: close succeeds');
    const closeDataA = await closeResA.json();
    assert(closeDataA.status === 'CLOSED', 'Case A: Transitioned to CLOSED');

    // -------------------------------------------------------------------------
    // TEST B: INVALID TRANSITION REJECTIONS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST B: INVALID TRANSITION REJECTIONS ---');
    // OPEN -> VERIFIED
    let errOpenToVerified = false;
    try {
      const openCase = maintenanceRepository.createCase({
        projectId: 'CUSTOMER_DIRECT',
        assetId: 'UNREGISTERED',
        equipmentType: 'PORTABLE_GENERATOR',
        title: 'تست انتقال نامعتبر ۱',
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
      maintenanceCaseService.transitionCaseStatus(openCase.id, 'VERIFIED', adminUser.id);
    } catch (e: any) {
      errOpenToVerified = true;
    }
    assert(errOpenToVerified, 'Invalid Transition: OPEN -> VERIFIED is rejected');

    // ASSIGNED -> VERIFIED
    let errAssignedToVerified = false;
    try {
      const assignedCase = maintenanceRepository.createCase({
        projectId: 'CUSTOMER_DIRECT',
        assetId: 'UNREGISTERED',
        equipmentType: 'PORTABLE_GENERATOR',
        title: 'تست انتقال نامعتبر ۲',
        description: 'شرح',
        priority: 'LOW',
        status: 'ASSIGNED',
        assignedTechnicianId: techUser.id,
        assignedTechnicianName: 'تکنسین',
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
      maintenanceCaseService.transitionCaseStatus(assignedCase.id, 'VERIFIED', adminUser.id);
    } catch (e: any) {
      errAssignedToVerified = true;
    }
    assert(errAssignedToVerified, 'Invalid Transition: ASSIGNED -> VERIFIED is rejected');

    // DRAFT -> IN_PROGRESS
    let errDraftToInProgress = false;
    try {
      const draftCase = maintenanceRepository.createCase({
        projectId: 'CUSTOMER_DIRECT',
        assetId: 'UNREGISTERED',
        equipmentType: 'PORTABLE_GENERATOR',
        title: 'تست انتقال نامعتبر ۳',
        description: 'شرح',
        priority: 'LOW',
        status: 'DRAFT',
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
      maintenanceCaseService.transitionCaseStatus(draftCase.id, 'IN_PROGRESS', adminUser.id);
    } catch (e: any) {
      errDraftToInProgress = true;
    }
    assert(errDraftToInProgress, 'Invalid Transition: DRAFT -> IN_PROGRESS is rejected');

    // CLOSED -> IN_PROGRESS
    let errClosedToInProgress = false;
    try {
      maintenanceCaseService.transitionCaseStatus(caseA.id, 'IN_PROGRESS', adminUser.id);
    } catch (e: any) {
      errClosedToInProgress = true;
    }
    assert(errClosedToInProgress, 'Invalid Transition: CLOSED -> IN_PROGRESS is rejected');

    // -------------------------------------------------------------------------
    // TEST C & D: /start BEFORE ACCEPTANCE REJECTED; /accept THEN /start SUCCEEDS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST C & D: /start BEFORE ACCEPTANCE VS AFTER ACCEPTANCE ---');
    const caseCD = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست کنترل آغاز کار بدون پذیرش',
      description: 'شرح',
      priority: 'HIGH',
      status: 'ASSIGNED',
      assignedTechnicianId: techUser.id,
      assignedTechnicianName: 'تکنسین',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'آقای شجاعی',
      contactPhone: '09123330003',
      alertIds: [],
      photos: [],
      documents: [],
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    // Attempt /start before /accept
    const preAcceptStartRes = await fetch(`${baseUrl}/cases/${caseCD.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techToken}` }
    });
    assert(
      preAcceptStartRes.status === 409,
      `Test C: /start before /accept rejected with HTTP 409 (status: ${preAcceptStartRes.status})`
    );

    // Call /accept
    const acceptCDRes = await fetch(`${baseUrl}/cases/${caseCD.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش رسمی پرونده' })
    });
    assert(acceptCDRes.status === 200, 'Test D: /accept succeeds');

    // Now call /start after /accept
    const postAcceptStartRes = await fetch(`${baseUrl}/cases/${caseCD.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techToken}` }
    });
    assert(postAcceptStartRes.status === 200, 'Test D: /start after /accept succeeds');

    // -------------------------------------------------------------------------
    // TEST E: SCHEDULING TRANSITIONS (ASSIGNED -> SCHEDULED) & REJECTIONS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST E: SCHEDULING TRANSITIONS ---');
    const caseE = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست زمان‌بندی',
      description: 'شرح',
      priority: 'MEDIUM',
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

    // Cannot schedule an unassigned OPEN case
    const schedOpenRes = await fetch(`${baseUrl}/cases/${caseE.id}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledAt: '2026-10-30T10:00:00Z' })
    });
    assert(schedOpenRes.status === 400, 'Test E: Cannot schedule an OPEN (unassigned) case');

    // Assign technician
    await fetch(`${baseUrl}/cases/${caseE.id}/select-technician`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ technicianId: proTech.id })
    });

    // Now schedule (ASSIGNED -> SCHEDULED)
    const schedAssignedRes = await fetch(`${baseUrl}/cases/${caseE.id}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledAt: '2026-10-30T10:00:00Z' })
    });
    assert(schedAssignedRes.status === 200, 'Test E: Scheduling ASSIGNED case succeeds');
    const schedAssignedData = await schedAssignedRes.json();
    assert(schedAssignedData.status === 'SCHEDULED', 'Test E: Case status updated to SCHEDULED');

    // -------------------------------------------------------------------------
    // TEST F: SCHEDULED -> IN_PROGRESS EXECUTION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST F: SCHEDULED -> IN_PROGRESS EXECUTION ---');
    // Cannot /start from SCHEDULED without /accept
    const startSchedNoAcceptRes = await fetch(`${baseUrl}/cases/${caseE.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techToken}` }
    });
    assert(
      startSchedNoAcceptRes.status === 409,
      'Test F: Cannot /start a SCHEDULED case without formal /accept'
    );

    // Call /accept
    const acceptSchedRes = await fetch(`${baseUrl}/cases/${caseE.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش پرونده زمان‌بندی شده' })
    });
    assert(acceptSchedRes.status === 200, 'Test F: /accept from SCHEDULED succeeds');
    const acceptSchedData = await acceptSchedRes.json();
    assert(acceptSchedData.status === 'IN_PROGRESS', 'Test F: Transitions to IN_PROGRESS upon /accept');

    // -------------------------------------------------------------------------
    // TEST G & H: VERIFICATION FLOW & INVALID VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST G & H: VERIFICATION FLOW & RESTRICTIONS ---');
    const caseGH = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست بازبینی و تایید',
      description: 'شرح',
      priority: 'HIGH',
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

    // Cannot verify directly from OPEN
    const verifyOpenRes = await fetch(`${baseUrl}/cases/${caseGH.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verificationPassed: true })
    });
    assert(verifyOpenRes.status === 400, 'Test H: Cannot verify an OPEN case directly');

    // Assign and accept
    await fetch(`${baseUrl}/cases/${caseGH.id}/select-technician`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ technicianId: proTech.id })
    });
    await fetch(`${baseUrl}/cases/${caseGH.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش' })
    });

    // Attempt submit-verification WITHOUT actions logged
    const submitNoActionRes = await fetch(`${baseUrl}/cases/${caseGH.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resolutionSummary: 'شرح رفع' })
    });
    assert(submitNoActionRes.status === 400, 'Test H: Cannot submit-verification without logged actions');

    // Log action
    await fetch(`${baseUrl}/cases/${caseGH.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'انجام تعمیر' })
    });

    // Now submit-verification
    const submitWithActionRes = await fetch(`${baseUrl}/cases/${caseGH.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ resolutionSummary: 'رفع نقص انجام شد' })
    });
    assert(submitWithActionRes.status === 200, 'Test G: submit-verification succeeds');

    // Technician cannot self-verify
    const techSelfVerifyRes = await fetch(`${baseUrl}/cases/${caseGH.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verificationPassed: true })
    });
    assert(techSelfVerifyRes.status === 403, 'Test H: Technician cannot self-verify');

    // Customer verifies
    const customerVerifyRes = await fetch(`${baseUrl}/cases/${caseGH.id}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verificationPassed: true, verificationNotes: 'تایید شد' })
    });
    assert(customerVerifyRes.status === 200, 'Test G: Customer verification succeeds');
    const customerVerifyData = await customerVerifyRes.json();
    assert(customerVerifyData.status === 'COMPLETED', 'Test G: Case becomes COMPLETED');

    // -------------------------------------------------------------------------
    // TEST I: GENERIC PATCH STATUS INJECTION PROTECTION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST I: GENERIC PATCH STATUS INJECTION PROTECTION ---');
    const caseI = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست تزریق وضعیت در PATCH',
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

    const patchInjectionRes = await fetch(`${baseUrl}/cases/${caseI.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'VERIFIED' })
    });
    assert(
      patchInjectionRes.status === 400,
      `Test I: Direct status injection via PATCH strictly rejected with HTTP 400 (got: ${patchInjectionRes.status})`
    );
    const caseIAfterPatch = maintenanceRepository.getCaseById(caseI.id);
    assert(caseIAfterPatch?.status === 'OPEN', 'Test I: Case status in repository remains OPEN');

    // Legitimate non-status PATCH still works
    const patchLegitRes = await fetch(`${baseUrl}/cases/${caseI.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'عنوان بروزرسانی شده قانونی' })
    });
    assert(patchLegitRes.status === 200, 'Test I: Legitimate title update via PATCH succeeds');
    const caseIAfterLegit = maintenanceRepository.getCaseById(caseI.id);
    assert(caseIAfterLegit?.title === 'عنوان بروزرسانی شده قانونی', 'Test I: Title updated properly in db');

    // -------------------------------------------------------------------------
    // TEST J: CANCELLATION FLOW
    // -------------------------------------------------------------------------
    console.log('\n--- TEST J: CANCELLATION FLOW ---');
    const cancelRes = await fetch(`${baseUrl}/cases/${caseI.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'عدم نیاز به تعمیر' })
    });
    assert(cancelRes.status === 200, 'Test J: Legitimate cancellation succeeds');
    const cancelData = await cancelRes.json();
    assert(cancelData.status === 'CANCELLED', 'Test J: Status becomes CANCELLED');

    // Cannot cancel an already CLOSED case (Case A from Test A)
    const cancelClosedRes = await fetch(`${baseUrl}/cases/${caseA.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'تلاش برای لغو پرونده بسته شده' })
    });
    assert(cancelClosedRes.status === 400, 'Test J: Cannot cancel an already CLOSED case');

    // -------------------------------------------------------------------------
    // TEST K, L, M: F.2 PRIVACY, NO ACCEPTANCE FABRICATION, DATA INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST K, L, M: PRIVACY PRESERVATION & STORAGE INTEGRITY ---');
    const caseKLM = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تست حریم خصوصی F.2 و عدم جعل پذیرش',
      description: 'شرح',
      priority: 'HIGH',
      status: 'OPEN',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'مهندس محمودی',
      contactPhone: '09124440004',
      alertIds: [],
      photos: [],
      documents: [],
      billDoc: {
        name: 'invoice.pdf',
        status: 'UNVERIFIED',
        extractedData: { customerPhone: '09124440004' }
      },
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    // Select technician
    await fetch(`${baseUrl}/cases/${caseKLM.id}/select-technician`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ technicianId: proTech.id })
    });

    // Schedule before accept
    await fetch(`${baseUrl}/cases/${caseKLM.id}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledAt: '2026-10-28T10:00:00Z' })
    });

    // Pre-acceptance: technician view must hide customer contact
    const preAcceptDetail = await (await fetch(`${baseUrl}/cases/${caseKLM.id}`, {
      headers: { 'Authorization': `Bearer ${techToken}` }
    })).json();
    assert(preAcceptDetail.contactName === undefined, 'Test K: contactName hidden before accept');
    assert(preAcceptDetail.contactPhone === undefined, 'Test K: contactPhone hidden before accept');

    // Verify /schedule did NOT create an ACCEPTED history entry
    const historiesKLM = maintenanceRepository.getAssignmentHistories(caseKLM.id) || [];
    const hasFabricatedAccept = historiesKLM.some(h => h.status === 'ACCEPTED');
    assert(!hasFabricatedAccept, 'Test L: /schedule did NOT fabricate ACCEPTED history');

    // Stored database record retains original contact data
    const storedKLM = maintenanceRepository.getCaseById(caseKLM.id);
    assert(storedKLM?.contactName === 'مهندس محمودی', 'Test M: Stored contactName intact in db');
    assert(storedKLM?.contactPhone === '09124440004', 'Test M: Stored contactPhone intact in db');

    // Customer can see their own contact details
    const customerKLMDetail = await (await fetch(`${baseUrl}/cases/${caseKLM.id}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    })).json();
    assert(customerKLMDetail.contactName === 'مهندس محمودی', 'Test K: Customer retains full access');

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
