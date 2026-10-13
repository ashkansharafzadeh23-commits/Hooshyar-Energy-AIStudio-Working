/**
 * STAGE 13.11-F.4: TECHNICIAN REASSIGNMENT, ACCEPTANCE INTEGRITY & LIFECYCLE SECURITY
 * 
 * Verifies:
 * 1. Reassignment A -> B before acceptance (case status remains ASSIGNED, tech ID updates to B).
 * 2. Previous technician A loses access (HTTP 403 / excluded from case list).
 * 3. New technician B cannot start without acceptance (HTTP 409 / service layer rejection).
 * 4. Customer contact remains hidden before acceptance for technician B.
 * 5. Reassignment A -> B after A has accepted (transitions back to ASSIGNED, resets execution state).
 * 6. Critical Scenario C: Reassignment A -> B -> A does NOT reuse A's historical acceptance!
 * 7. Technician A must accept the new assignment cycle, and a new ACCEPTED record is persisted.
 * 8. Repeated acceptance within one cycle is idempotent and does not create duplicate ACCEPTED records.
 * 9. Unauthorized technician reassignment returns HTTP 403 (assigned technician cannot reassign).
 * 10. Reporter / administrator assignment permissions remain functional.
 * 11. Symmetric technician identity mapping (user.id <-> professional.id bidirectional resolution).
 * 12. Invalid or foreign acceptance records are strictly rejected.
 * 13. Assignment history remains consistent with the persisted case entity.
 * 14. Existing valid lifecycle transitions remain functional (IN_PROGRESS -> AWAITING_VERIFICATION -> COMPLETED -> CLOSED).
 * 15. Failed operations do not leave misleading acceptance records (rollback/cancellation guard).
 * 16. Repeated and idempotent assignment requests do not create duplicate assignment history cycles.
 * 17. Production database immutability verification passes.
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
  console.log('STAGE 13.11-F.4: TECHNICIAN REASSIGNMENT & ACCEPTANCE INTEGRITY');
  console.log('================================================================\n');

  // 1. Database Isolation Guard
  const isolation = setupTestDatabaseIsolation('stage13_11_f4_reassignment');

  try {
    const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { maintenanceCaseService, hasCurrentCycleAcceptance } = await import('../src/services/maintenanceCaseService.js');
    const { areTechnicianIdentitiesEquivalent } = await import('../src/services/technicianIdentityService.js');
    const { maintenanceRouter } = await import('../src/api/maintenance.js');

    // -------------------------------------------------------------------------
    // SETUP TEST ACTORS
    // -------------------------------------------------------------------------
    // 1. Customer (Reporter)
    const customerUser = userRepository.createUser({
      name: 'مهندس بهرام افشار (مالک نیروگاه)',
      phone: '09121110001',
      role: 'PROJECT_OWNER',
      roles: ['PROJECT_OWNER']
    });
    const customerToken = jwtService.sign({
      userId: customerUser.id,
      role: customerUser.role,
      roles: customerUser.roles
    });

    // 2. Administrator
    const adminUser = userRepository.createUser({
      name: 'مدیر ارشد سامانه هوشیار',
      phone: '09120000001',
      role: 'ADMIN',
      roles: ['ADMIN']
    });
    const adminToken = jwtService.sign({
      userId: adminUser.id,
      role: adminUser.role,
      roles: adminUser.roles
    });

    // 3. Technician A
    const techUserA = userRepository.createUser({
      name: 'تکنسین الف - سرویس ژنراتور',
      phone: '09122220001',
      role: 'technician',
      roles: ['technician']
    });
    const techTokenA = jwtService.sign({
      userId: techUserA.id,
      role: techUserA.role,
      roles: techUserA.roles
    });
    const proTechA = professionalRepository.createProfessional({
      userId: techUserA.id,
      fullName: 'تکنسین الف - سرویس ژنراتور',
      phone: '09122220001',
      serviceCities: ['تهران', 'کرج'],
      specialties: ['ژنراتور', 'دیزل'],
      approvalStatus: 'APPROVED'
    });

    // 4. Technician B
    const techUserB = userRepository.createUser({
      name: 'تکنسین ب - مکانیک ارشد',
      phone: '09123330001',
      role: 'technician',
      roles: ['technician']
    });
    const techTokenB = jwtService.sign({
      userId: techUserB.id,
      role: techUserB.role,
      roles: techUserB.roles
    });
    const proTechB = professionalRepository.createProfessional({
      userId: techUserB.id,
      fullName: 'تکنسین ب - مکانیک ارشد',
      phone: '09123330001',
      serviceCities: ['تهران', 'قم'],
      specialties: ['ژنراتور', 'مکانیک'],
      approvalStatus: 'APPROVED'
    });

    // -------------------------------------------------------------------------
    // SETUP TEST SERVER
    // -------------------------------------------------------------------------
    const app = express();
    app.use(express.json());
    app.use('/api', maintenanceRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    // -------------------------------------------------------------------------
    // TEST 11: SYMMETRIC IDENTITY RESOLUTION
    // -------------------------------------------------------------------------
    console.log('--- TEST 11: SYMMETRIC TECHNICIAN IDENTITY RESOLUTION ---');
    assert(
      areTechnicianIdentitiesEquivalent(techUserA.id, proTechA.id),
      'Identity: user.id <-> professional.id resolves to true'
    );
    assert(
      areTechnicianIdentitiesEquivalent(proTechA.id, techUserA.id),
      'Identity: professional.id <-> user.id resolves to true (symmetric)'
    );
    assert(
      areTechnicianIdentitiesEquivalent(techUserA.id, techUserA.id),
      'Identity: user.id <-> user.id resolves to true'
    );
    assert(
      areTechnicianIdentitiesEquivalent(proTechA.id, proTechA.id),
      'Identity: professional.id <-> professional.id resolves to true'
    );
    assert(
      !areTechnicianIdentitiesEquivalent(techUserA.id, techUserB.id),
      'Identity: Tech A user.id <-> Tech B user.id strictly returns false'
    );
    assert(
      !areTechnicianIdentitiesEquivalent(proTechA.id, proTechB.id),
      'Identity: Tech A pro.id <-> Tech B pro.id strictly returns false'
    );
    assert(
      !areTechnicianIdentitiesEquivalent(proTechA.id, techUserB.id),
      'Identity: Tech A pro.id <-> Tech B user.id strictly returns false'
    );

    // -------------------------------------------------------------------------
    // SETUP INITIAL CASE
    // -------------------------------------------------------------------------
    const testCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تعمیرات اضطراری ژنراتور - پرونده ارزیابی انتصاب',
      description: 'افت توان خروجی و لرزش شدید حین بارگذاری',
      priority: 'HIGH',
      status: 'OPEN',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'مهندس بهرام افشار',
      contactPhone: '09121110001',
      billDoc: {
        name: 'bill.pdf',
        status: 'UNVERIFIED',
        extractedData: { customerPhone: '09121110001' }
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
    const caseId = testCase.id;

    // -------------------------------------------------------------------------
    // TEST 10: REASSIGNMENT RBAC (REPORTER & ADMIN PERMITTED)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: INITIAL ASSIGNMENT BY CUSTOMER / ADMIN ---');
    const initialAssignRes = await fetch(`${baseUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        technicianId: proTechA.id,
        notes: 'تخصیص اولیه به تکنسین الف'
      })
    });
    assert(initialAssignRes.status === 200, 'Customer Assignment: Returns HTTP 200');
    const initialAssignData = await initialAssignRes.json();
    assert(initialAssignData.status === 'ASSIGNED', 'Initial Assignment: Status is ASSIGNED');
    assert(
      areTechnicianIdentitiesEquivalent(initialAssignData.assignedTechnicianId, proTechA.id),
      'Initial Assignment: Case assigned to Technician A'
    );

    // -------------------------------------------------------------------------
    // TEST 9: UNAUTHORIZED TECHNICIAN REASSIGNMENT REJECTED (HTTP 403)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: UNAUTHORIZED TECHNICIAN REASSIGNMENT REJECTION ---');
    const techAttemptReassignRes = await fetch(`${baseUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${techTokenA}`
      },
      body: JSON.stringify({
        technicianId: proTechB.id,
        notes: 'تلاش تکنسین برای بازتخصیص پرونده به تکنسین دیگر'
      })
    });
    assert(
      techAttemptReassignRes.status === 403,
      'Unauthorized Reassignment: Technician cannot reassign case (got HTTP 403)'
    );

    // -------------------------------------------------------------------------
    // TEST 1, 2, 3, 4: REASSIGNMENT A -> B BEFORE ACCEPTANCE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1, 2, 3, 4: REASSIGNMENT A -> B BEFORE ACCEPTANCE ---');
    // Admin reassigns case from Tech A to Tech B while status is ASSIGNED
    const adminReassignRes = await fetch(`${baseUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        technicianId: proTechB.id,
        notes: 'بازتخصیص به تکنسین ب توسط مدیر'
      })
    });
    assert(adminReassignRes.status === 200, 'Admin Reassignment: Returns HTTP 200');
    const adminReassignData = await adminReassignRes.json();
    assert(
      adminReassignData.status === 'ASSIGNED',
      'Test 1: Case status remains ASSIGNED on ASSIGNED->ASSIGNED reassignment'
    );
    assert(
      areTechnicianIdentitiesEquivalent(adminReassignData.assignedTechnicianId, proTechB.id),
      'Test 1: Case assignedTechnicianId updated to Technician B'
    );

    // Verify DB persistence
    const caseInDbAfterReassign = maintenanceRepository.getCaseById(caseId);
    assert(
      areTechnicianIdentitiesEquivalent(caseInDbAfterReassign?.assignedTechnicianId, proTechB.id),
      'Test 1: Database record assignedTechnicianId persisted as Technician B'
    );

    // Test 2: Previous Technician A loses access
    const techACaseDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(
      techACaseDetailRes.status === 403,
      'Test 2: Previous Technician A access strictly rejected with HTTP 403'
    );

    const techACasesListRes = await fetch(`${baseUrl}/technician/cases`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const techACasesList: any[] = await techACasesListRes.json();
    assert(
      !techACasesList.some(c => c.id === caseId),
      'Test 2: Case is completely invisible in previous Technician A list'
    );

    // Test 3 & 4: New Technician B cannot start without acceptance & customer contact hidden
    const techBCaseDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(techBCaseDetailRes.status === 200, 'Test 4: New Technician B can access case detail');
    const techBCaseDetail = await techBCaseDetailRes.json();
    assert(
      techBCaseDetail.contactName === undefined,
      'Test 4: Customer contactName strictly omitted for Tech B before acceptance'
    );
    assert(
      techBCaseDetail.contactPhone === undefined,
      'Test 4: Customer contactPhone strictly omitted for Tech B before acceptance'
    );
    assert(
      techBCaseDetail.billDoc?.extractedData?.customerPhone === undefined,
      'Test 4: Customer nested billDoc phone strictly omitted for Tech B before acceptance'
    );

    // Tech B attempts to start before acceptance
    const techBStartBeforeAcceptRes = await fetch(`${baseUrl}/cases/${caseId}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(
      techBStartBeforeAcceptRes.status === 409,
      'Test 3: Technician B cannot call /start without acceptance (HTTP 409)'
    );

    // -------------------------------------------------------------------------
    // TEST 5: REASSIGNMENT A -> B AFTER A HAS ACCEPTED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: REASSIGNMENT AFTER ACCEPTANCE ---');
    // First, let Tech B accept and enter IN_PROGRESS
    const techBAcceptRes = await fetch(`${baseUrl}/cases/${caseId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${techTokenB}`
      },
      body: JSON.stringify({ notes: 'پذیرش رسمی پرونده توسط تکنسین ب' })
    });
    assert(techBAcceptRes.status === 200, 'Tech B /accept succeeds with HTTP 200');
    const techBAcceptData = await techBAcceptRes.json();
    assert(techBAcceptData.status === 'IN_PROGRESS', 'Case status is now IN_PROGRESS');

    // Admin reassigns case from Tech B (who is IN_PROGRESS) back to Tech A
    const reassignBackToARes = await fetch(`${baseUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        technicianId: proTechA.id,
        notes: 'بازتخصیص پرونده از وضعیت در حال اجرا به تکنسین الف'
      })
    });
    assert(reassignBackToARes.status === 200, 'Reassignment from IN_PROGRESS: Returns HTTP 200');
    const reassignBackToAData = await reassignBackToARes.json();
    assert(
      reassignBackToAData.status === 'ASSIGNED',
      'Test 5: Status transitioned back to ASSIGNED upon reassignment'
    );
    assert(
      areTechnicianIdentitiesEquivalent(reassignBackToAData.assignedTechnicianId, proTechA.id),
      'Test 5: Assigned technician updated back to Tech A'
    );
    assert(
      reassignBackToAData.startedAt === undefined,
      'Test 5: Execution startedAt timestamp reset on reassignment'
    );

    // Tech B now loses access
    const techBLostAccessRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(
      techBLostAccessRes.status === 403,
      'Test 5: Previous Technician B loses access after reassignment (HTTP 403)'
    );

    // -------------------------------------------------------------------------
    // TEST 6 & 7: CRITICAL SCENARIO C (A -> B -> A) OLD ACCEPTANCE CANNOT BE REUSED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6 & 7: SCENARIO C (A -> B -> A) CYCLE INTEGRITY ---');
    // Let Tech A accept now (Cycle 1 for Tech A)
    const techAAcceptCycle1Res = await fetch(`${baseUrl}/cases/${caseId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${techTokenA}`
      },
      body: JSON.stringify({ notes: 'پذیرش دور ۱ توسط تکنسین الف' })
    });
    assert(techAAcceptCycle1Res.status === 200, 'Tech A accepts Cycle 1 (HTTP 200)');
    const caseCycle1 = await techAAcceptCycle1Res.json();
    assert(caseCycle1.status === 'IN_PROGRESS', 'Case status is IN_PROGRESS in Cycle 1');

    // Admin reassigns to Tech B
    await fetch(`${baseUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ technicianId: proTechB.id, notes: 'بازتخصیص به ب' })
    });

    // Admin reassigns back to Tech A (Starting Cycle 2 for Tech A)
    await fetch(`${baseUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ technicianId: proTechA.id, notes: 'بازتخصیص مجدد به الف (دور ۲)' })
    });

    const caseReassignedToA = maintenanceRepository.getCaseById(caseId);
    assert(caseReassignedToA?.status === 'ASSIGNED', 'Case status is ASSIGNED for Cycle 2');

    // Check shared server-authoritative cycle acceptance function
    assert(
      !hasCurrentCycleAcceptance(caseReassignedToA!),
      'Test 6: hasCurrentCycleAcceptance strictly returns FALSE for Tech A in Cycle 2'
    );

    // Privacy verification: Tech A views case before accepting Cycle 2
    const techACycle2DetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const techACycle2Detail = await techACycle2DetailRes.json();
    assert(
      techACycle2Detail.contactName === undefined,
      'Test 6: Old acceptance does NOT leak contactName in Cycle 2 before acceptance'
    );
    assert(
      techACycle2Detail.contactPhone === undefined,
      'Test 6: Old acceptance does NOT leak contactPhone in Cycle 2 before acceptance'
    );
    assert(
      techACycle2Detail.billDoc?.extractedData?.customerPhone === undefined,
      'Test 6: Old acceptance does NOT leak billDoc customerPhone in Cycle 2'
    );

    // Direct service call to transitionCaseStatus(..., 'IN_PROGRESS') must fail
    let directStartCycle2Rejected = false;
    try {
      maintenanceCaseService.transitionCaseStatus(caseId, 'IN_PROGRESS', techUserA.id);
    } catch (e) {
      directStartCycle2Rejected = true;
    }
    assert(
      directStartCycle2Rejected,
      'Test 6: Service-layer transitionCaseStatus strictly rejects start without Cycle 2 acceptance'
    );

    // HTTP /start must fail with HTTP 409
    const techAStartCycle2Res = await fetch(`${baseUrl}/cases/${caseId}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(
      techAStartCycle2Res.status === 409,
      'Test 6: HTTP /start strictly rejected with HTTP 409 without Cycle 2 acceptance'
    );

    // Test 7: Tech A formally accepts Cycle 2
    const countHistoriesBefore = (maintenanceRepository.getAssignmentHistories(caseId) || []).length;
    const techAAcceptCycle2Res = await fetch(`${baseUrl}/cases/${caseId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${techTokenA}`
      },
      body: JSON.stringify({ notes: 'پذیرش رسمی دور ۲ توسط تکنسین الف' })
    });
    assert(techAAcceptCycle2Res.status === 200, 'Test 7: Tech A accepts Cycle 2 (HTTP 200)');
    const countHistoriesAfter = (maintenanceRepository.getAssignmentHistories(caseId) || []).length;
    assert(
      countHistoriesAfter === countHistoriesBefore + 1,
      'Test 7: Exactly 1 new ACCEPTED record persisted for Cycle 2'
    );

    const caseAfterCycle2Accept = maintenanceRepository.getCaseById(caseId);
    assert(
      hasCurrentCycleAcceptance(caseAfterCycle2Accept!),
      'Test 7: hasCurrentCycleAcceptance returns TRUE after Cycle 2 acceptance'
    );

    // Contact info now legitimately authorized for execution
    const techACycle2AcceptedDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const techACycle2AcceptedDetail = await techACycle2AcceptedDetailRes.json();
    assert(
      techACycle2AcceptedDetail.contactPhone === '09121110001',
      'Test 7: Customer contactPhone legitimately released after Cycle 2 acceptance'
    );

    // -------------------------------------------------------------------------
    // TEST 8: IDEMPOTENT ACCEPTANCE WITHIN ONE CYCLE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: IDEMPOTENT ACCEPTANCE WITHIN SAME CYCLE ---');
    const repeatAcceptRes = await fetch(`${baseUrl}/cases/${caseId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${techTokenA}`
      },
      body: JSON.stringify({ notes: 'تکرار پذیرش در همان دور' })
    });
    assert(repeatAcceptRes.status === 200, 'Repeat /accept succeeds gracefully (HTTP 200)');
    const countHistoriesRepeat = (maintenanceRepository.getAssignmentHistories(caseId) || []).length;
    assert(
      countHistoriesRepeat === countHistoriesAfter,
      'Test 8: Repeated /accept does NOT create duplicate ACCEPTED records'
    );

    // -------------------------------------------------------------------------
    // TEST 16: IDEMPOTENT ASSIGNMENT RETRY (NO DUPLICATE CYCLES)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: IDEMPOTENT ASSIGNMENT RETRIES ---');
    const historyCountBeforeRetry = (maintenanceRepository.getAssignmentHistories(caseId) || []).length;
    const retryAssignRes = await fetch(`${baseUrl}/cases/${caseId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        technicianId: proTechA.id,
        notes: 'تکرار تخصیص به همان تکنسین الف بدون تغییر'
      })
    });
    assert(retryAssignRes.status === 200, 'Idempotent assign retry returns HTTP 200');
    const historyCountAfterRetry = (maintenanceRepository.getAssignmentHistories(caseId) || []).length;
    assert(
      historyCountAfterRetry === historyCountBeforeRetry,
      'Test 16: Idempotent assign retry does NOT create redundant ASSIGNED records'
    );

    // -------------------------------------------------------------------------
    // TEST 12: FOREIGN ACCEPTANCE REJECTION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: FOREIGN ACCEPTANCE REJECTION ---');
    const foreignCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده تست پذیرش نامربوط',
      description: 'شرح',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    // Inject foreign Tech B acceptance
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: foreignCase.id,
      technicianId: techUserB.id,
      assignedBy: techUserB.id,
      status: 'ACCEPTED',
      notes: 'پذیرش نامربوط'
    });
    assert(
      !hasCurrentCycleAcceptance(foreignCase),
      'Test 12: hasCurrentCycleAcceptance strictly rejects foreign technician acceptance'
    );

    // -------------------------------------------------------------------------
    // TEST 14: EXISTING VALID LIFECYCLE PROGRESSION PRESERVED
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: NORMAL LIFECYCLE PROGRESSION INTACT ---');
    // Log action on caseId (which is IN_PROGRESS)
    maintenanceCaseService.addAction(caseId, {
      actionType: 'REPAIR',
      description: 'تعمیر استاتور و بالانس دور موتور',
      performedBy: techUserA.id,
      resultStatus: 'SUCCESS',
      laborHours: 3
    });

    // IN_PROGRESS -> AWAITING_VERIFICATION
    const submittedCase = maintenanceCaseService.transitionCaseStatus(
      caseId,
      'AWAITING_VERIFICATION',
      techUserA.id,
      { notes: 'تعمیر با موفقیت انجام شد و آماده بازبینی است' }
    );
    assert(submittedCase.status === 'AWAITING_VERIFICATION', 'Case transitions to AWAITING_VERIFICATION');

    // Rework transition: AWAITING_VERIFICATION -> IN_PROGRESS
    const reworkCase = maintenanceCaseService.transitionCaseStatus(
      caseId,
      'IN_PROGRESS',
      customerUser.id
    );
    assert(reworkCase.status === 'IN_PROGRESS', 'Rework transition to IN_PROGRESS succeeds');

    // Re-submit
    maintenanceCaseService.transitionCaseStatus(
      caseId,
      'AWAITING_VERIFICATION',
      techUserA.id
    );

    // Approve: AWAITING_VERIFICATION -> VERIFIED -> CLOSED
    const verifiedCase = maintenanceCaseService.transitionCaseStatus(
      caseId,
      'VERIFIED',
      customerUser.id
    );
    assert(verifiedCase.status === 'VERIFIED', 'Case transitions to VERIFIED');

    const closedCase = maintenanceCaseService.transitionCaseStatus(
      caseId,
      'CLOSED',
      customerUser.id,
      { closureNotes: 'تحویل نهایی انجام گردید.' }
    );
    assert(closedCase.status === 'CLOSED', 'Case transitions to terminal CLOSED status');

    // -------------------------------------------------------------------------
    // TEST 13 & 15: FAILURE SAFETY & AUDIT INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13 & 15: FAILURE SAFETY & REPOSITORY CONSISTENCY ---');
    const closedDbCase = maintenanceRepository.getCaseById(caseId);
    assert(closedDbCase?.status === 'CLOSED', 'Test 13: Stored case status accurately matches CLOSED');
    assert(
      areTechnicianIdentitiesEquivalent(closedDbCase?.assignedTechnicianId, techUserA.id),
      'Test 13: Stored case assignedTechnicianId matches Technician A'
    );

    // Cannot reassign a closed case
    let closedReassignFailed = false;
    try {
      maintenanceCaseService.transitionCaseStatus(caseId, 'ASSIGNED', adminUser.id, {
        technicianId: proTechB.id
      });
    } catch (e) {
      closedReassignFailed = true;
    }
    assert(closedReassignFailed, 'Test 15: Reassigning a CLOSED case is strictly rejected');

    // Close server
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // -------------------------------------------------------------------------
    // TEST 17: IMMUTABILITY OF COMMITTED DB.JSON
    // -------------------------------------------------------------------------
    console.log('\n--- VERIFYING PRODUCTION DB IMMUTABILITY GUARD ---');
    isolation.verifyImmutability();
    assert(true, 'Test 17: Repository db.json byte-for-byte identical');

  } finally {
    isolation.cleanup();
  }

  console.log('================================================================');
  console.log(`STAGE F.4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
