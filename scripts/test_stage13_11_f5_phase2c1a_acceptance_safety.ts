/**
 * ============================================================================
 * STAGE 13.11-F.5 PHASE 2C-1A REGRESSION TEST SUITE
 * Technician Acceptance Failure-Safety & Customer Privacy Hardening
 * ============================================================================
 * 
 * Validates:
 * 1. Successful first acceptance by the assigned technician (HTTP 200 -> IN_PROGRESS).
 * 2. Repeated acceptance without duplicate history entries (idempotent).
 * 3. Acceptance after A -> B -> A reassignment requiring a new acceptance cycle.
 * 4. Failed status transition with successful compensating rollback (HTTP 400, CANCELLED history).
 * 5. Failed status transition with failed compensation (HTTP 500, structured diagnostic, fail-closed).
 * 6. Compensation returning an unsuccessful result (null/unverified) without throwing (HTTP 500).
 * 7. Failed acceptance followed by attempted customer contact access (strictly masked/hidden).
 * 8. Failed acceptance followed by attempted attachment access (HTTP 403, sanitized metadata).
 * 9. Failed acceptance followed by attempted /start (HTTP 409) and protected actions (HTTP 403).
 * 10. Unauthorized technician and unrelated customer access (HTTP 403).
 * 11. Cancellation and terminal-state privacy (contact masked, mutations blocked).
 * 12. Legacy assignment-history compatibility (unambiguous legacy cases preserve valid acceptance).
 * 13. Canonical db.json byte-for-byte immutability.
 */

import * as http from 'http';
import * as fs from 'fs';
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
  console.log('STAGE 13.11-F.5 PHASE 2C-1A: ACCEPTANCE FAILURE-SAFETY & PRIVACY');
  console.log('================================================================\n');

  const isolation = setupTestDatabaseIsolation('stage13_11_f5_phase2c1a');
  let server: http.Server | null = null;
  let testError: any = null;
  let serverCloseError: any = null;
  let cleanupError: any = null;
  let immutabilityError: any = null;

  try {
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const { maintenanceCaseService, hasCurrentCycleAcceptance } = await import('../src/services/maintenanceCaseService.js');
    const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { projectRepository } = await import('../src/repositories/projectRepository.js');
    const { assetRepository } = await import('../src/repositories/assetRepository.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { maintenanceRouter, hasTechnicianFormallyAccepted } = await import('../src/api/maintenance.js');

    // -------------------------------------------------------------------------
    // SETUP TEST ACTORS
    // -------------------------------------------------------------------------
    const customerUser = userRepository.createUser({
      name: 'کارفرمای نمونه',
      email: 'customer.phase2c1a@example.com',
      role: 'customer',
      phone: '09121110001'
    });

    const adminUser = userRepository.createUser({
      name: 'مدیر سامانه',
      email: 'admin.phase2c1a@example.com',
      role: 'admin',
      phone: '09129990001'
    });

    const techUserA = userRepository.createUser({
      name: 'تکنسین الف',
      email: 'techa.phase2c1a@example.com',
      role: 'technician',
      phone: '09123330001'
    });
    const proTechA = professionalRepository.createProfessional({
      userId: techUserA.id,
      fullName: 'مهندس تکنسین الف',
      phone: '09123330001',
      specialties: ['INVERTER', 'SOLAR_PANELS'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED',
      isAvailable: true
    });

    const techUserB = userRepository.createUser({
      name: 'تکنسین ب',
      email: 'techb.phase2c1a@example.com',
      role: 'technician',
      phone: '09124440001'
    });
    const proTechB = professionalRepository.createProfessional({
      userId: techUserB.id,
      fullName: 'مهندس تکنسین ب',
      phone: '09124440001',
      specialties: ['GENERATOR'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED',
      isAvailable: true
    });

    const unrelatedUser = userRepository.createUser({
      name: 'کاربر متفرقه',
      email: 'unrelated.phase2c1a@example.com',
      role: 'customer',
      phone: '09125550001'
    });

    const customerToken = jwtService.sign({
      userId: customerUser.id,
      role: customerUser.role,
      roles: customerUser.roles
    });
    const adminToken = jwtService.sign({
      userId: adminUser.id,
      role: adminUser.role,
      roles: adminUser.roles
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
    const unrelatedToken = jwtService.sign({
      userId: unrelatedUser.id,
      role: unrelatedUser.role,
      roles: unrelatedUser.roles
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

    // -------------------------------------------------------------------------
    // TEST 1: SUCCESSFUL FIRST ACCEPTANCE BY ASSIGNED TECHNICIAN
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: SUCCESSFUL FIRST ACCEPTANCE ---');
    const case1 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تست پذیرش موفق',
      description: 'شرح عیب',
      priority: 'HIGH',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      assignedTechnicianPhone: '09123330001',
      contactName: 'کارفرمای نمونه',
      contactPhone: '09121110001',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case1.id,
      technicianId: techUserA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص اولیه به تکنسین الف'
    });

    // Before acceptance: customer contact details MUST be hidden from technician A
    const preAcceptDetailRes = await fetch(`${baseUrl}/cases/${case1.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const preAcceptDetail = await preAcceptDetailRes.json();
    assert(preAcceptDetail.contactPhone === undefined, 'Test 1: Pre-acceptance contactPhone is hidden');
    assert(preAcceptDetail.contactName === undefined, 'Test 1: Pre-acceptance contactName is hidden');

    // Execute acceptance
    const acceptRes1 = await fetch(`${baseUrl}/cases/${case1.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش رسمی مسئولیت تعمیرات' })
    });
    assert(acceptRes1.status === 200, 'Test 1: /accept returns HTTP 200 on first acceptance');
    const acceptedCase1 = await acceptRes1.json();
    assert(acceptedCase1.status === 'IN_PROGRESS', 'Test 1: Case transitioned to IN_PROGRESS');

    const histories1 = maintenanceRepository.getAssignmentHistories(case1.id) || [];
    const acceptedHistories1 = histories1.filter(h => h.status === 'ACCEPTED');
    assert(acceptedHistories1.length === 1, 'Test 1: Exactly 1 ACCEPTED history record persisted');
    assert(hasTechnicianFormallyAccepted(acceptedCase1), 'Test 1: hasTechnicianFormallyAccepted evaluates to TRUE');

    // After acceptance: customer contact details released for execution
    const postAcceptDetailRes = await fetch(`${baseUrl}/cases/${case1.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const postAcceptDetail = await postAcceptDetailRes.json();
    assert(postAcceptDetail.contactPhone === '09121110001', 'Test 1: Post-acceptance contactPhone is released');
    assert(postAcceptDetail.contactName === 'کارفرمای نمونه', 'Test 1: Post-acceptance contactName is released');

    // -------------------------------------------------------------------------
    // TEST 2: REPEATED ACCEPTANCE WITHOUT DUPLICATE HISTORY (IDEMPOTENT)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: REPEATED ACCEPTANCE IDEMPOTENCY ---');
    const repeatAcceptRes = await fetch(`${baseUrl}/cases/${case1.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش مجدد' })
    });
    assert(repeatAcceptRes.status === 200, 'Test 2: Repeated /accept returns HTTP 200');
    const historiesRepeat = maintenanceRepository.getAssignmentHistories(case1.id) || [];
    const acceptedRepeat = historiesRepeat.filter(h => h.status === 'ACCEPTED');
    assert(acceptedRepeat.length === 1, 'Test 2: Second /accept does NOT create duplicate ACCEPTED record');

    // -------------------------------------------------------------------------
    // TEST 3: REASSIGNMENT A -> B -> A REQUIRES NEW ACCEPTANCE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: REASSIGNMENT A -> B -> A ISOLATION ---');
    // Reassign to Tech B
    const reassignToBRes = await fetch(`${baseUrl}/cases/${case1.id}/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ technicianId: proTechB.id, notes: 'انتقال به تکنسین ب' })
    });
    assert(reassignToBRes.status === 200, 'Test 3: Reassignment to Tech B succeeds');
    const caseWithB = maintenanceRepository.getCaseById(case1.id)!;
    assert(caseWithB.status === 'ASSIGNED', 'Test 3: Case returned to ASSIGNED status');
    assert(!hasTechnicianFormallyAccepted(caseWithB), 'Test 3: Tech B has NOT accepted yet');

    // Reassign back to Tech A
    const reassignBackToARes = await fetch(`${baseUrl}/cases/${case1.id}/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ technicianId: proTechA.id, notes: 'انتقال مجدد به تکنسین الف' })
    });
    assert(reassignBackToARes.status === 200, 'Test 3: Reassignment back to Tech A succeeds');
    const caseBackWithA = maintenanceRepository.getCaseById(case1.id)!;
    assert(caseBackWithA.status === 'ASSIGNED', 'Test 3: Case back in ASSIGNED status');
    assert(!hasTechnicianFormallyAccepted(caseBackWithA), 'Test 3: Tech A acceptance in Cycle 1 does NOT authorize Cycle 2');

    // Tech A sees masked contact info until accepting Cycle 2
    const cycle2PreAcceptRes = await fetch(`${baseUrl}/cases/${case1.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const cycle2PreAccept = await cycle2PreAcceptRes.json();
    assert(cycle2PreAccept.contactPhone === undefined, 'Test 3: Cycle 2 pre-acceptance contactPhone is hidden');

    // Tech A accepts Cycle 2
    const cycle2AcceptRes = await fetch(`${baseUrl}/cases/${case1.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش رسمی دور ۲' })
    });
    assert(cycle2AcceptRes.status === 200, 'Test 3: Tech A accepts Cycle 2 successfully');
    const cycle2Case = maintenanceRepository.getCaseById(case1.id)!;
    assert(cycle2Case.status === 'IN_PROGRESS', 'Test 3: Case transitioned to IN_PROGRESS for Cycle 2');
    assert(hasTechnicianFormallyAccepted(cycle2Case), 'Test 3: Formal acceptance verified for Cycle 2');

    // -------------------------------------------------------------------------
    // TEST 4: FAILED STATUS TRANSITION WITH SUCCESSFUL COMPENSATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: FAILED TRANSITION WITH SUCCESSFUL ROLLBACK ---');
    const case4 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تست شکست انتقال با بازگردانی موفق',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      assignedTechnicianPhone: '09123330001',
      contactName: 'کارفرمای نمونه',
      contactPhone: '09121110001',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case4.id,
      technicianId: techUserA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص اولیه'
    });

    const originalTransition = maintenanceCaseService.transitionCaseStatus;
    // Inject failure into transitionCaseStatus
    (maintenanceCaseService as any).transitionCaseStatus = () => {
      throw new Error('Simulated failure during state transition to IN_PROGRESS');
    };

    const failRes4 = await fetch(`${baseUrl}/cases/${case4.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'تلاش پذیرش با شکست' })
    });
    assert(failRes4.status === 400, 'Test 4: Controlled HTTP 400 returned when compensation succeeds');
    const failData4 = await failRes4.json();
    assert(failData4.error.includes('Simulated failure'), 'Test 4: Error message propagated accurately');

    // Restore original method
    (maintenanceCaseService as any).transitionCaseStatus = originalTransition;

    // Verify compensation: history record is CANCELLED and case remains ASSIGNED
    const histories4 = maintenanceRepository.getAssignmentHistories(case4.id) || [];
    const latestHist4 = histories4[histories4.length - 1];
    assert(latestHist4.status === 'CANCELLED', 'Test 4: Compensating rollback marked history as CANCELLED');
    const case4After = maintenanceRepository.getCaseById(case4.id)!;
    assert(case4After.status === 'ASSIGNED', 'Test 4: Case status remained ASSIGNED');
    assert(!hasTechnicianFormallyAccepted(case4After), 'Test 4: hasTechnicianFormallyAccepted strictly evaluates to FALSE');

    // -------------------------------------------------------------------------
    // TEST 5: FAILED STATUS TRANSITION WITH FAILED COMPENSATION (THROWING)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: CATASTROPHIC ROLLBACK FAILURE (HTTP 500 & FAIL-CLOSED) ---');
    const case5 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تست شکست همزمان انتقال و بازگردانی',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      assignedTechnicianPhone: '09123330001',
      contactName: 'کارفرمای نمونه',
      contactPhone: '09121110001',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case5.id,
      technicianId: techUserA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص اولیه'
    });

    const originalUpdateHistory = maintenanceRepository.updateAssignmentHistory;

    // Step 1: transition throws
    (maintenanceCaseService as any).transitionCaseStatus = () => {
      throw new Error('State transition failure');
    };
    // Step 2: updateAssignmentHistory throws
    (maintenanceRepository as any).updateAssignmentHistory = () => {
      throw new Error('Fatal I/O failure during compensating history update');
    };

    const failRes5 = await fetch(`${baseUrl}/cases/${case5.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'تلاش پذیرش با شکست کامل' })
    });
    assert(failRes5.status === 500, 'Test 5: Catastrophic rollback failure returns HTTP 500');
    const failData5 = await failRes5.json();
    assert(
      failData5.error === 'خطا در تغییر وضعیت پرونده و عدم موفقیت در بازگردانی سابقه پذیرش. یکپارچگی نیازمند بررسی مدیر سامانه است.',
      'Test 5: Sanitized integrity alert message returned without leaking internals'
    );
    assert(!failData5.error.includes('Fatal I/O failure') && !failData5.stack, 'Test 5: No internal exceptions or stack traces leaked');

    // Restore repository methods
    (maintenanceCaseService as any).transitionCaseStatus = originalTransition;
    (maintenanceRepository as any).updateAssignmentHistory = originalUpdateHistory;

    // Verify fail-closed invariant on case 5:
    // Even though the orphaned ACCEPTED record remained in DB, the case is ASSIGNED
    const case5After = maintenanceRepository.getCaseById(case5.id)!;
    assert(case5After.status === 'ASSIGNED', 'Test 5: Case status remains ASSIGNED');
    assert(
      !hasTechnicianFormallyAccepted(case5After),
      'Test 5: hasTechnicianFormallyAccepted strictly fails closed despite orphaned ACCEPTED history'
    );

    // -------------------------------------------------------------------------
    // TEST 6: COMPENSATION RETURNING NULL / UNSUCCESSFUL RESULT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: COMPENSATION RETURNING NULL RESULT (HTTP 500) ---');
    const case6 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تست بازگردانی با بازگشت نال',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case6.id,
      technicianId: techUserA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص اولیه'
    });

    (maintenanceCaseService as any).transitionCaseStatus = () => {
      throw new Error('Transition failure');
    };
    (maintenanceRepository as any).updateAssignmentHistory = () => {
      // Return null without throwing (e.g. record not found or write unverified)
      return null;
    };

    const failRes6 = await fetch(`${baseUrl}/cases/${case6.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'تست نال' })
    });
    assert(failRes6.status === 500, 'Test 6: Null rollback result triggers HTTP 500 integrity error');
    const failData6 = await failRes6.json();
    assert(
      failData6.error === 'خطا در تغییر وضعیت پرونده و عدم موفقیت در بازگردانی سابقه پذیرش. یکپارچگی نیازمند بررسی مدیر سامانه است.',
      'Test 6: Sanitized server-side integrity message returned on unverified compensation'
    );

    // Restore methods
    (maintenanceCaseService as any).transitionCaseStatus = originalTransition;
    (maintenanceRepository as any).updateAssignmentHistory = originalUpdateHistory;

    const case6After = maintenanceRepository.getCaseById(case6.id)!;
    assert(!hasTechnicianFormallyAccepted(case6After), 'Test 6: Fail-closed guard prevents acceptance authorization');

    // -------------------------------------------------------------------------
    // TEST 7: FAILED ACCEPTANCE PREVENTS CUSTOMER CONTACT ACCESS
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: FAILED ACCEPTANCE CUSTOMER CONTACT PRIVACY ---');
    // Using case5 from Test 5 (where orphaned ACCEPTED record exists on ASSIGNED case)
    const detailAfterFailedAcceptRes = await fetch(`${baseUrl}/cases/${case5.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const detailAfterFailedAccept = await detailAfterFailedAcceptRes.json();
    assert(
      detailAfterFailedAccept.contactPhone === undefined,
      'Test 7: contactPhone remains strictly masked after failed acceptance with orphaned record'
    );
    assert(
      detailAfterFailedAccept.contactName === undefined,
      'Test 7: contactName remains strictly masked after failed acceptance with orphaned record'
    );

    // -------------------------------------------------------------------------
    // TEST 8: FAILED ACCEPTANCE PREVENTS ATTACHMENT DOWNLOAD
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: FAILED ACCEPTANCE ATTACHMENT PRIVACY ---');
    const case8 = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تست دسترسی پیوست',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف',
      contactName: 'کارفرمای محرمانه',
      contactPhone: '09129998877',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: [],
      attachments: [
        {
          id: 'att-secret-1',
          maintenanceCaseId: '',
          name: 'electricity_bill.pdf',
          type: 'BILL',
          url: '/api/storage/files/bill-secret.pdf',
          uploadedBy: customerUser.id,
          uploadedAt: new Date().toISOString(),
          extractedData: {
            customerName: 'کارفرمای محرمانه',
            customerPhone: '09129998877',
            billId: 'BILL-12345'
          }
        }
      ]
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case8.id,
      technicianId: techUserA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص'
    });
    // Add orphaned ACCEPTED record directly into DB to simulate uncompensated failure
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case8.id,
      technicianId: techUserA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED',
      notes: 'سابقه یتیم بدون تکمیل انتقال'
    });

    // Tech A tries to download attachment
    const downloadRes = await fetch(`${baseUrl}/cases/${case8.id}/attachments/att-secret-1/download`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(downloadRes.status === 403, 'Test 8: Attachment download blocked with HTTP 403 on uncompleted acceptance');
    const downloadData = await downloadRes.json();
    assert(
      downloadData.error.includes('پذیرش رسمی پرونده توسط تکنسین'),
      'Test 8: Explicit acceptance requirement message returned on download rejection'
    );

    // Attachment metadata in case detail must be sanitized
    const case8DetailRes = await fetch(`${baseUrl}/cases/${case8.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const case8Detail = await case8DetailRes.json();
    const sanitizedAtt = case8Detail.attachments?.[0];
    assert(sanitizedAtt?.url === undefined, 'Test 8: Attachment direct download URL is stripped');
    assert(sanitizedAtt?.extractedData?.customerPhone === undefined, 'Test 8: Extracted customerPhone in attachment is stripped');

    // -------------------------------------------------------------------------
    // TEST 9: FAILED ACCEPTANCE PREVENTS /START AND ACTION LOGGING
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: FAILED ACCEPTANCE PREVENTS /START AND ACTIONS ---');
    // Using case8 with orphaned acceptance
    const prematureStartRes = await fetch(`${baseUrl}/cases/${case8.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(prematureStartRes.status === 409, 'Test 9: /start rejected with HTTP 409 on orphaned acceptance');
    const startData = await prematureStartRes.json();
    assert(
      startData.error.includes('ابتدا پرونده را رسماً بپذیرید'),
      'Test 9: Clear acceptance mandate returned by /start'
    );

    const prematureActionRes = await fetch(`${baseUrl}/cases/${case8.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام غیرمجاز قبل از پذیرش'
      })
    });
    assert(prematureActionRes.status === 403, 'Test 9: Action logging rejected with HTTP 403 on orphaned acceptance');
    const actionData = await prematureActionRes.json();
    assert(
      actionData.error === 'ثبت اقدامات فنی نیازمند پذیرش رسمی پرونده توسط تکنسین است.',
      'Test 9: Explicit acceptance requirement returned by /actions'
    );

    // -------------------------------------------------------------------------
    // TEST 10: UNAUTHORIZED TECHNICIAN AND UNRELATED CUSTOMER REJECTION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: CROSS-ACTOR REJECTION ---');
    // Tech B attempts /accept on case1 (assigned to Tech A)
    const unauthorizedAcceptRes = await fetch(`${baseUrl}/cases/${case1.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenB}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'تلاش پذیرش توسط تکنسین غیرمجاز' })
    });
    assert(unauthorizedAcceptRes.status === 403, 'Test 10: Unauthorized technician /accept returns HTTP 403');

    // Unrelated customer attempts to access case1
    const unrelatedCaseRes = await fetch(`${baseUrl}/cases/${case1.id}`, {
      headers: { 'Authorization': `Bearer ${unrelatedToken}` }
    });
    assert(unrelatedCaseRes.status === 403, 'Test 10: Unrelated customer case access returns HTTP 403');

    // -------------------------------------------------------------------------
    // TEST 11: CANCELLATION AND TERMINAL-STATE PRIVACY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: CANCELLATION AND TERMINAL PRIVACY ---');
    // Cancel case1 (which is currently IN_PROGRESS)
    const cancelRes = await fetch(`${baseUrl}/cases/${case1.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'لغو توسط کارفرما' })
    });
    assert(cancelRes.status === 200, 'Test 11: Case cancellation succeeds');

    // After cancellation: contact info is strictly revoked even though Tech A accepted previously
    const cancelledDetailRes = await fetch(`${baseUrl}/cases/${case1.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const cancelledDetail = await cancelledDetailRes.json();
    assert(cancelledDetail.contactPhone === undefined, 'Test 11: Cancelled case contactPhone is strictly masked for technician');
    assert(cancelledDetail.contactName === undefined, 'Test 11: Cancelled case contactName is strictly masked for technician');

    // Operational mutations on CANCELLED case are rejected
    const cancelledAcceptRes = await fetch(`${baseUrl}/cases/${case1.id}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'تلاش پذیرش پرونده لغو شده' })
    });
    assert(cancelledAcceptRes.status === 400, 'Test 11: /accept on CANCELLED case returns HTTP 400');

    const cancelledStartRes = await fetch(`${baseUrl}/cases/${case1.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(cancelledStartRes.status === 400, 'Test 11: /start on CANCELLED case returns HTTP 400');

    const cancelledActionRes = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تست' })
    });
    assert(cancelledActionRes.status === 400, 'Test 11: /actions on CANCELLED case returns HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 12: LEGACY ASSIGNMENT-HISTORY COMPATIBILITY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: LEGACY ASSIGNMENT-HISTORY COMPATIBILITY ---');
    // Legitimate unambiguous legacy case without ASSIGNED history records
    const legacyCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده موروثی شفاف با تکنسین یکتا',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: legacyCase.id,
      technicianId: techUserA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED',
      notes: 'پذیرش معتبر موروثی'
    });
    assert(
      hasCurrentCycleAcceptance(legacyCase),
      'Test 12: Legitimate unambiguous legacy case preserves valid acceptance'
    );
    assert(
      hasTechnicianFormallyAccepted(legacyCase),
      'Test 12: Legacy case without ASSIGNED markers maintains formal acceptance compatibility'
    );

  } catch (err: any) {
    testError = err;
  } finally {
    // 1. Close server if active on both success and failure
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
        if (!serverCloseError) {
          serverCloseError = new Error(`Server close failure: ${err?.message || err}`);
        }
      }
    }

    // 2. Clean up temporary test database with explicit error reporting
    if (fs.existsSync(isolation.tempDbPath)) {
      try {
        fs.unlinkSync(isolation.tempDbPath);
      } catch (err: any) {
        console.error(`[CLEANUP FAILURE] Failed to remove temporary database at ${isolation.tempDbPath}:`, err);
        if (!cleanupError) {
          cleanupError = new Error(`Database cleanup failure: ${err?.message || err}`);
        }
      }
    }

    try {
      isolation.cleanup();
    } catch (err: any) {
      console.error('[CLEANUP FAILURE] Failed in isolation.cleanup():', err);
      if (!cleanupError) {
        cleanupError = new Error(`Isolation cleanup failure: ${err?.message || err}`);
      }
    }

    // 3. Database immutability verification executes even if cleanup encountered errors
    try {
      console.log('\n--- TEST 13: PRODUCTION DB IMMUTABILITY GUARD ---');
      isolation.verifyImmutability();
      assert(true, 'Test 13: Repository db.json byte-for-byte identical');
    } catch (err: any) {
      console.error('[CRITICAL IMMUTABILITY FAILURE]:', err);
      immutabilityError = err;
    }

    // 4. Non-masking error propagation
    if (testError) {
      if (serverCloseError) {
        console.error('[SECONDARY SERVER CLOSE ERROR DURING TEST FAILURE]:', serverCloseError);
      }
      if (cleanupError) {
        console.error('[SECONDARY CLEANUP ERROR DURING TEST FAILURE]:', cleanupError);
      }
      if (immutabilityError) {
        console.error('[CRITICAL IMMUTABILITY FAILURE DURING TEST FAILURE]:', immutabilityError);
      }
      throw testError;
    }

    if (serverCloseError) {
      if (cleanupError) console.error('[CLEANUP ERROR WITH SERVER CLOSE ERROR]:', cleanupError);
      if (immutabilityError) console.error('[CRITICAL IMMUTABILITY FAILURE WITH SERVER CLOSE ERROR]:', immutabilityError);
      throw serverCloseError;
    }

    if (cleanupError) {
      if (immutabilityError) {
        console.error('[CRITICAL IMMUTABILITY FAILURE WITH CLEANUP ERROR]:', immutabilityError);
      }
      throw cleanupError;
    }

    if (immutabilityError) {
      throw immutabilityError;
    }
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
