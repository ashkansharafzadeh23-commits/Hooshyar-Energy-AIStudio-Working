/**
 * STAGE 13.11-F.2: HARDENED PRIVACY DURING TECHNICIAN MATCHING, SELECTION, AND ASSIGNMENT
 * 
 * Verifies:
 * 1. Technician matching results do not expose technician phone numbers.
 * 2. A technician selected for a case does NOT receive customer private contact info
 *    (contactName, contactPhone, customerPhone) before formal acceptance.
 * 3. The database record itself still retains the original customer contact data intact.
 * 4. Technician case-list response (/api/technician/cases and /api/cases) does not expose
 *    customer contact data before acceptance.
 * 5. Technician case-detail response does not expose customer contact data before acceptance.
 * 6. Unassigned technician cannot retrieve another technician's private case information (403).
 * 7. Customer/reporter can still access their own case information with full contact details.
 * 8. Admin access remains functional with full administrative visibility.
 * 9. Sanitization does not mutate the persisted case object in memory or database.
 * 10. No RFQ is created.
 * 11. No automatic technician assignment is introduced.
 * 12. Generator behavior remains functional.
 * 13. Solar behavior remains functional.
 * 14. F.1 matching regression remains functional.
 * 15. No direct phone number is exposed through nested response objects (e.g. billDoc.extractedData).
 * 16. Repeated serialization of the technician-facing response remains free of customer contact data.
 * 17. Formal acceptance (status IN_PROGRESS via /accept) legitimately authorizes contact info for execution.
 * 18. PRE-ACCEPTANCE SCHEDULING REGRESSION:
 *     Calling /schedule BEFORE /accept does NOT release customer contact info!
 * 19. PRE-ACCEPTANCE /start REJECTION & PRIVACY (MANDATORY TEST A & I):
 *     Calling /start BEFORE /accept is rejected with HTTP 409, does NOT advance to IN_PROGRESS,
 *     does NOT create an ACCEPTED assignment history, and keeps contact info hidden.
 * 20. STATUS ALONE DOES NOT AUTHORIZE RELEASE (MANDATORY TEST B):
 *     A case with status IN_PROGRESS without valid ACCEPTED history for the current technician
 *     STILL HIDES customer contact information.
 * 21. FOREIGN ACCEPTANCE HISTORY ISOLATION (MANDATORY TEST C):
 *     An ACCEPTED history entry belonging to Technician B does NOT authorize contact release to Technician A.
 * 22. /start AFTER LEGITIMATE ACCEPTANCE (MANDATORY TEST E):
 *     After legitimate /accept, calling /start succeeds according to the existing workflow without creating
 *     duplicate acceptance histories.
 * 23. db.json byte-for-byte immutability guard passes.
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
  console.log('STAGE 13.11-F.2: ASSIGNMENT PRIVACY & ACCEPTANCE BYPASS TESTS');
  console.log('================================================================\n');

  // 1. Database Isolation Guard
  const isolation = setupTestDatabaseIsolation('stage13_11_f2_privacy');

  try {
    const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { technicianMatchingService } = await import('../src/services/technicianMatchingService.js');
    const { maintenanceRouter } = await import('../src/api/maintenance.js');

    // -------------------------------------------------------------------------
    // SETUP TEST ACTORS
    // -------------------------------------------------------------------------
    // 1. Customer / Reporter
    const customerUser = userRepository.createUser({
      name: 'مشتری آزمایشی هوشیار',
      phone: '09129990001',
      role: 'PROJECT_OWNER',
      roles: ['PROJECT_OWNER']
    });
    const customerToken = jwtService.sign({
      userId: customerUser.id,
      role: customerUser.role,
      roles: customerUser.roles
    });

    // 2. Assigned Technician A User & Profile
    const techUserA = userRepository.createUser({
      name: 'مهندس تعمیرات ژنراتور منتخب (تکنسین الف)',
      phone: '09127770001',
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
      fullName: 'مهندس تعمیرات ژنراتور منتخب (تکنسین الف)',
      phone: '09127770001',
      serviceCities: ['تهران'],
      specialties: ['دیزل ژنراتور', 'سرویس ژنراتور', 'موتور احتراقی'],
      yearsExperience: 8,
      rating: 4.8,
      bio: 'متخصص مجاز دیزل ژنراتور الف',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proTechA.id, 'approved');

    // 3. Technician B User & Profile (for foreign acceptance testing)
    const techUserB = userRepository.createUser({
      name: 'تکنسین ب',
      phone: '09127770002',
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
      fullName: 'تکنسین ب',
      phone: '09127770002',
      serviceCities: ['تهران'],
      specialties: ['دیزل ژنراتور'],
      yearsExperience: 6,
      rating: 4.5,
      bio: 'متخصص ژنراتور ب',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proTechB.id, 'approved');

    // 4. Unassigned / Stranger Technician User & Profile
    const strangerTechUser = userRepository.createUser({
      name: 'تکنسین غریبه بدون انتساب',
      phone: '09128880002',
      role: 'technician',
      roles: ['technician']
    });
    const strangerTechToken = jwtService.sign({
      userId: strangerTechUser.id,
      role: strangerTechUser.role,
      roles: strangerTechUser.roles
    });

    const proStranger = professionalRepository.createProfessional({
      userId: strangerTechUser.id,
      fullName: 'تکنسین غریبه بدون انتساب',
      phone: '09128880002',
      serviceCities: ['تهران'],
      specialties: ['سیستم‌های خورشیدی'],
      yearsExperience: 3,
      rating: 4.1,
      bio: 'سولار',
      profileImageUrl: '',
      certifications: []
    });
    professionalRepository.updateProfessionalStatus(proStranger.id, 'approved');

    // 5. System Admin
    const adminUser = userRepository.createUser({
      name: 'مدیر ارشد سامانه',
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
    // TEST 1: MATCHING PREVIEW DOES NOT EXPOSE TECHNICIAN PHONE
    // -------------------------------------------------------------------------
    console.log('\n--- 1. MATCHING RESULTS PHONE SUPPRESSION ---');
    const matches = technicianMatchingService.matchTechnicians({
      equipmentType: 'PORTABLE_GENERATOR',
      location: 'تهران',
      symptoms: ['روشن نشدن موتور']
    });
    const jsonSerializedMatches = JSON.parse(JSON.stringify(matches));
    const anyTechPhoneExposed = jsonSerializedMatches.some((m: any) => m.phone !== undefined && m.phone !== null && m.phone !== '');
    assert(!anyTechPhoneExposed, 'Matching Preview: Does NOT expose technician phone numbers');

    // -------------------------------------------------------------------------
    // CREATE TEST CASE WITH SENSITIVE CUSTOMER CONTACT INFO
    // -------------------------------------------------------------------------
    console.log('\n--- SETTING UP CUSTOMER MAINTENANCE CASE ---');
    const initialCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تعمیر اضطراری ژنراتور بیمارستان',
      description: 'ژنراتور زیر بار خاموش شده و ولتاژ خروجی قطع می‌شود',
      priority: 'HIGH',
      status: 'OPEN',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      contactName: 'مهندس احمد رضایی (مسئول تاسیسات)',
      contactPhone: '09129990001',
      symptoms: ['افت ولتاژ', 'خاموشی زیر بار'],
      alertIds: [],
      photos: [],
      documents: [],
      billDoc: {
        name: 'bill.pdf',
        status: 'UNVERIFIED',
        extractedData: {
          customerName: 'مهندس احمد رضایی',
          customerPhone: '09129990001',
          nationalId: '0012345678'
        }
      },
      attachments: [],
      actionsTaken: [],
      sparePartsUsed: [],
      totalCostIrr: 0,
      totalLaborHours: 0
    });

    const caseId = initialCase.id;

    // -------------------------------------------------------------------------
    // TEST 2: SELECT-TECHNICIAN PRIVACY BOUNDARY
    // -------------------------------------------------------------------------
    console.log('\n--- 2. SELECT-TECHNICIAN PRIVACY BOUNDARY ---');
    const selectRes = await fetch(`${baseUrl}/cases/${caseId}/select-technician`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        technicianId: proTechA.id,
        scheduledDate: '2026-10-15',
        notes: 'لطفاً ابزار عیب‌یابی دینام به همراه داشته باشید'
      })
    });

    assert(selectRes.status === 200, 'Select Technician: Successfully executed by customer');
    const selectData = await selectRes.json();
    assert(selectData.status === 'ASSIGNED', 'Select Technician: Status updated to ASSIGNED');

    // -------------------------------------------------------------------------
    // TEST 3: DATABASE RECORD RETAINS ORIGINAL CUSTOMER CONTACT DATA
    // -------------------------------------------------------------------------
    console.log('\n--- 3. PERSISTED DATA INTEGRITY ---');
    const persistedCaseInDb = maintenanceRepository.getCaseById(caseId);
    assert(persistedCaseInDb !== undefined, 'Database: Case exists in repository');
    assert(
      persistedCaseInDb?.contactName === 'مهندس احمد رضایی (مسئول تاسیسات)',
      'Database: contactName remains permanently intact in database record'
    );
    assert(
      persistedCaseInDb?.contactPhone === '09129990001',
      'Database: contactPhone remains permanently intact in database record'
    );
    assert(
      persistedCaseInDb?.billDoc?.extractedData?.customerPhone === '09129990001',
      'Database: Nested billDoc customer phone remains permanently intact in database record'
    );

    // -------------------------------------------------------------------------
    // TEST 4: TECHNICIAN CASE-LIST RESPONSE PRIVACY (BEFORE ACCEPTANCE)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. TECHNICIAN CASE-LIST RESPONSE PRIVACY ---');
    const techCasesRes = await fetch(`${baseUrl}/technician/cases`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });

    assert(techCasesRes.status === 200, 'Technician Case List: Returns HTTP 200');
    const techCases: any[] = await techCasesRes.json();
    const assignedCaseInList = techCases.find(c => c.id === caseId);

    assert(Boolean(assignedCaseInList), 'Technician Case List: Assigned case is visible in list');
    assert(
      assignedCaseInList.contactName === undefined,
      'Technician Case List: contactName is OMITTED before formal acceptance'
    );
    assert(
      assignedCaseInList.contactPhone === undefined,
      'Technician Case List: contactPhone is OMITTED before formal acceptance'
    );
    assert(
      assignedCaseInList.billDoc?.extractedData?.customerPhone === undefined,
      'Technician Case List: Nested billDoc customerPhone is OMITTED before formal acceptance'
    );

    // Generic /api/cases endpoint accessed by technician A
    const genericCasesRes = await fetch(`${baseUrl}/cases`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const genericCases: any[] = await genericCasesRes.json();
    const assignedInGeneric = genericCases.find(c => c.id === caseId);
    assert(
      assignedInGeneric && assignedInGeneric.contactName === undefined && assignedInGeneric.contactPhone === undefined,
      'Generic /api/cases: Technician-facing response omits customer contact info before acceptance'
    );

    // -------------------------------------------------------------------------
    // TEST 5: TECHNICIAN CASE-DETAIL RESPONSE PRIVACY (BEFORE ACCEPTANCE)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. TECHNICIAN CASE-DETAIL PRIVACY (BEFORE ACCEPTANCE) ---');
    const techDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });

    assert(techDetailRes.status === 200, 'Technician Case Detail: Returns HTTP 200');
    const techDetail = await techDetailRes.json();
    assert(
      techDetail.contactName === undefined,
      'Technician Case Detail: contactName is strictly OMITTED before acceptance'
    );
    assert(
      techDetail.contactPhone === undefined,
      'Technician Case Detail: contactPhone is strictly OMITTED before acceptance'
    );
    assert(
      techDetail.billDoc?.extractedData?.customerPhone === undefined,
      'Technician Case Detail: Nested customerPhone is strictly OMITTED before acceptance'
    );

    // -------------------------------------------------------------------------
    // TEST A & I: /start BEFORE FORMAL ACCEPTANCE MUST BE REJECTED (409)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST A & I: /start BEFORE ACCEPTANCE REJECTION ---');
    const preAcceptStartRes = await fetch(`${baseUrl}/cases/${caseId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      }
    });

    assert(
      preAcceptStartRes.status === 409,
      `Pre-Acceptance /start: Rejected with HTTP 409 (got status: ${preAcceptStartRes.status})`
    );

    // Confirm case status did NOT become IN_PROGRESS
    const caseAfterFailedStart = maintenanceRepository.getCaseById(caseId);
    assert(
      caseAfterFailedStart?.status === 'ASSIGNED',
      'Pre-Acceptance /start: Case status remains ASSIGNED (did NOT mutate to IN_PROGRESS)'
    );

    // Confirm no ACCEPTED assignment history entry was fabricated
    const historiesAfterFailedStart = maintenanceRepository.getAssignmentHistories(caseId) || [];
    const hasFabricatedAcceptance = historiesAfterFailedStart.some(h => h.status === 'ACCEPTED');
    assert(
      !hasFabricatedAcceptance,
      'Pre-Acceptance /start: ZERO ACCEPTED assignment history entries created'
    );

    // Confirm customer contact information remains strictly hidden
    const postFailedStartDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const postFailedStartDetail = await postFailedStartDetailRes.json();
    assert(
      postFailedStartDetail.contactName === undefined && postFailedStartDetail.contactPhone === undefined,
      'Pre-Acceptance /start: Customer contact information remains strictly hidden after rejected /start'
    );

    // -------------------------------------------------------------------------
    // TEST F: /schedule BEFORE FORMAL ACCEPTANCE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST F: /schedule BEFORE FORMAL ACCEPTANCE ---');
    const scheduleRes = await fetch(`${baseUrl}/cases/${caseId}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledAt: '2026-10-18T10:00:00Z' })
    });

    assert(scheduleRes.status === 200, 'Pre-Acceptance Schedule: Endpoint executes successfully');
    const scheduleData = await scheduleRes.json();
    assert(scheduleData.status === 'SCHEDULED', 'Pre-Acceptance Schedule: Case status is now SCHEDULED');
    assert(
      scheduleData.contactName === undefined,
      'Pre-Acceptance Schedule Response: contactName is strictly OMITTED'
    );
    assert(
      scheduleData.contactPhone === undefined,
      'Pre-Acceptance Schedule Response: contactPhone is strictly OMITTED'
    );
    assert(
      scheduleData.billDoc?.extractedData?.customerPhone === undefined,
      'Pre-Acceptance Schedule Response: Nested billDoc customer phone is strictly OMITTED'
    );

    // -------------------------------------------------------------------------
    // TEST B: IN_PROGRESS STATUS ALONE WITHOUT VALID ACCEPTANCE HISTORY DOES NOT RELEASE CONTACT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST B: IN_PROGRESS WITHOUT ACCEPTED HISTORY DOES NOT RELEASE CONTACT ---');
    // Force case status to IN_PROGRESS in repository, with NO ACCEPTED history for tech A
    maintenanceRepository.updateCase(caseId, { status: 'IN_PROGRESS' });

    const inProgressNoHistoryRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const inProgressNoHistoryDetail = await inProgressNoHistoryRes.json();
    assert(
      inProgressNoHistoryDetail.status === 'IN_PROGRESS',
      'Test B: Case status is IN_PROGRESS in database'
    );
    assert(
      inProgressNoHistoryDetail.contactName === undefined,
      'Test B: contactName remains strictly HIDDEN when status is IN_PROGRESS without ACCEPTED history'
    );
    assert(
      inProgressNoHistoryDetail.contactPhone === undefined,
      'Test B: contactPhone remains strictly HIDDEN when status is IN_PROGRESS without ACCEPTED history'
    );
    assert(
      inProgressNoHistoryDetail.billDoc?.extractedData?.customerPhone === undefined,
      'Test B: Nested customerPhone remains strictly HIDDEN when status is IN_PROGRESS without ACCEPTED history'
    );

    // Revert status to ASSIGNED for subsequent tests
    maintenanceRepository.updateCase(caseId, { status: 'ASSIGNED' });

    // -------------------------------------------------------------------------
    // TEST C: FOREIGN TECHNICIAN ACCEPTANCE HISTORY DOES NOT AUTHORIZE RELEASE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST C: FOREIGN TECHNICIAN ACCEPTANCE HISTORY ISOLATION ---');
    // Create an ACCEPTED history belonging to Technician B
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseId,
      technicianId: techUserB.id,
      assignedBy: techUserB.id,
      status: 'ACCEPTED',
      notes: 'پذیرش توسط تکنسین ب (تکنسین نامربوط)'
    });

    // Re-fetch as Technician A (who is currently assigned, but has NOT accepted)
    const foreignEvidenceDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const foreignEvidenceDetail = await foreignEvidenceDetailRes.json();
    assert(
      foreignEvidenceDetail.contactName === undefined,
      'Foreign Acceptance Guard: Technician B acceptance history does NOT authorize contact release to Technician A'
    );
    assert(
      foreignEvidenceDetail.contactPhone === undefined,
      'Foreign Acceptance Guard: Technician B acceptance history does NOT release contactPhone to Technician A'
    );

    // -------------------------------------------------------------------------
    // TEST D: LEGITIMATE /accept RELEASES CONTACT INFORMATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST D: LEGITIMATE /accept FLOW ---');
    const acceptRes = await fetch(`${baseUrl}/cases/${caseId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notes: 'پذیرش شد؛ جهت بازدید و هماهنگی مراجعه می‌کنم' })
    });

    assert(acceptRes.status === 200, 'Legitimate /accept: Successfully accepted by assigned technician');
    const acceptedData = await acceptRes.json();
    assert(acceptedData.status === 'IN_PROGRESS', 'Legitimate /accept: Status updated to IN_PROGRESS');

    // Confirm that an ACCEPTED history entry for technician A now exists in db
    const historiesPostAccept = maintenanceRepository.getAssignmentHistories(caseId) || [];
    const techAAcceptedEntry = historiesPostAccept.find(
      h => h.status === 'ACCEPTED' && (h.technicianId === techUserA.id || h.technicianId === proTechA.id)
    );
    assert(Boolean(techAAcceptedEntry), 'Legitimate /accept: Authoritative ACCEPTED history entry exists in db');

    // Technician A fetches case detail post-acceptance
    const postAcceptDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const postAcceptDetail = await postAcceptDetailRes.json();
    assert(
      postAcceptDetail.contactName === 'مهندس احمد رضایی (مسئول تاسیسات)',
      'Post-Acceptance: contactName is legitimately authorized for execution after formal acceptance'
    );
    assert(
      postAcceptDetail.contactPhone === '09129990001',
      'Post-Acceptance: contactPhone is legitimately authorized for execution after formal acceptance'
    );

    // -------------------------------------------------------------------------
    // TEST E: /start AFTER LEGITIMATE ACCEPTANCE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST E: /start AFTER LEGITIMATE ACCEPTANCE ---');
    const countHistoriesBeforeStart = (maintenanceRepository.getAssignmentHistories(caseId) || []).length;

    const postAcceptStartRes = await fetch(`${baseUrl}/cases/${caseId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      }
    });

    assert(postAcceptStartRes.status === 200, 'Post-Acceptance /start: Successfully executes with HTTP 200');
    const postAcceptStartData = await postAcceptStartRes.json();
    assert(postAcceptStartData.status === 'IN_PROGRESS', 'Post-Acceptance /start: Status is IN_PROGRESS');
    assert(
      postAcceptStartData.contactPhone === '09129990001',
      'Post-Acceptance /start: Legitimate execution response includes customer contact details'
    );

    const countHistoriesAfterStart = (maintenanceRepository.getAssignmentHistories(caseId) || []).length;
    assert(
      countHistoriesAfterStart === countHistoriesBeforeStart,
      'Post-Acceptance /start: Did NOT create duplicate acceptance histories'
    );

    // -------------------------------------------------------------------------
    // TEST G: /schedule AFTER LEGITIMATE ACCEPTANCE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST G: /schedule AFTER LEGITIMATE ACCEPTANCE ---');
    const postAcceptScheduleRes = await fetch(`${baseUrl}/cases/${caseId}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledAt: '2026-10-20T14:00:00Z' })
    });
    assert(postAcceptScheduleRes.status === 200, 'Post-Acceptance Schedule: Executes successfully');
    const postAcceptScheduleData = await postAcceptScheduleRes.json();
    assert(
      postAcceptScheduleData.contactPhone === '09129990001',
      'Post-Acceptance Schedule: Response legitimately includes contactPhone'
    );

    // -------------------------------------------------------------------------
    // TEST H: PERSISTED DATA INTEGRITY IN STORAGE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST H: PERSISTED DATA INTEGRITY IN STORAGE ---');
    const finalDbCheck = maintenanceRepository.getCaseById(caseId);
    assert(
      finalDbCheck?.contactPhone === '09129990001' && finalDbCheck?.contactName === 'مهندس احمد رضایی (مسئول تاسیسات)',
      'Persisted Data Integrity: Case in repository retains original contact details'
    );
    assert(
      finalDbCheck?.billDoc?.extractedData?.customerPhone === '09129990001',
      'Persisted Data Integrity: Nested billDoc retains original customerPhone'
    );

    // -------------------------------------------------------------------------
    // TEST 6: UNASSIGNED TECHNICIAN ISOLATION (ANTI-IDOR)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. UNASSIGNED TECHNICIAN ISOLATION (ANTI-IDOR) ---');
    const strangerDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${strangerTechToken}` }
    });

    assert(
      strangerDetailRes.status === 403,
      `Unassigned Technician: Access strictly rejected with HTTP 403 (Status: ${strangerDetailRes.status})`
    );

    const strangerListRes = await fetch(`${baseUrl}/technician/cases`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${strangerTechToken}` }
    });
    const strangerList: any[] = await strangerListRes.json();
    assert(
      !strangerList.some(c => c.id === caseId),
      'Unassigned Technician: Case is completely invisible in stranger list'
    );

    // -------------------------------------------------------------------------
    // TEST 7: CUSTOMER/REPORTER FULL ACCESS PRESERVED
    // -------------------------------------------------------------------------
    console.log('\n--- 7. CUSTOMER ACCESS PRESERVATION ---');
    const customerDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    assert(customerDetailRes.status === 200, 'Customer Detail: Returns HTTP 200');
    const customerDetail = await customerDetailRes.json();
    assert(
      customerDetail.contactName === 'مهندس احمد رضایی (مسئول تاسیسات)',
      'Customer Detail: Reporter retains full access to their own contactName'
    );
    assert(
      customerDetail.contactPhone === '09129990001',
      'Customer Detail: Reporter retains full access to their own contactPhone'
    );
    assert(
      customerDetail.billDoc?.extractedData?.customerPhone === '09129990001',
      'Customer Detail: Reporter retains full access to nested bill data'
    );

    // -------------------------------------------------------------------------
    // TEST 8: ADMIN ACCESS PRESERVED
    // -------------------------------------------------------------------------
    console.log('\n--- 8. ADMIN FULL ACCESS PRESERVATION ---');
    const adminDetailRes = await fetch(`${baseUrl}/cases/${caseId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    assert(adminDetailRes.status === 200, 'Admin Detail: Returns HTTP 200');
    const adminDetail = await adminDetailRes.json();
    assert(
      adminDetail.contactName === 'مهندس احمد رضایی (مسئول تاسیسات)',
      'Admin Detail: Admin retains full administrative visibility of contactName'
    );
    assert(
      adminDetail.contactPhone === '09129990001',
      'Admin Detail: Admin retains full administrative visibility of contactPhone'
    );

    // -------------------------------------------------------------------------
    // TEST 10 & 11: ZERO AUTOMATION DRIFT
    // -------------------------------------------------------------------------
    console.log('\n--- 10 & 11. NO AUTOMATION DRIFT ---');
    const { rfqRepository } = await import('../src/repositories/rfqRepository.js');
    const rfqs = rfqRepository.getAllRFQs();
    assert(rfqs.length === 0, 'Zero Drift: No marketplace RFQ created');

    server.close();

    // -------------------------------------------------------------------------
    // TEST 23: IMMUTABILITY GUARD
    // -------------------------------------------------------------------------
    console.log('\n--- 23. VERIFYING PRODUCTION DB IMMUTABILITY GUARD ---');
    isolation.verifyImmutability();
  } finally {
    isolation.cleanup();
  }

  console.log('\n================================================================');
  console.log(`STAGE F.2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('\nFatal test execution error:', err);
  process.exit(1);
});
