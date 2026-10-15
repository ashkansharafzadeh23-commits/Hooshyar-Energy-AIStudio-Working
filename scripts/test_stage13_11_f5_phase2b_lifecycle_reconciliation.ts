/**
 * ============================================================================
 * STAGE 13.11-F.5: PHASE 2B REGRESSION TEST SUITE
 * Maintenance Lifecycle, Cancellation Privacy, Reassignment & Reconciliation
 * ============================================================================
 * 
 * Validates:
 * 1. Cancellation history recording with active assignment
 * 2. Safe cancellation of unassigned cases without ghost history
 * 3. Cancellation privacy barrier (post-cancellation customer contact info strictly masked)
 * 4. Closed case privacy barrier (closed case customer contact info strictly masked for technicians)
 * 5. Terminal state immutability (operational mutations rejected on CANCELLED / CLOSED cases)
 * 6. Idempotent cancellation and closure (safe HTTP 200, no duplicate history entries)
 * 7. Reassignment metadata cleanup (stale phone, name, startedAt never persist to new technician)
 * 8. A -> B -> A cycle metadata and acceptance isolation
 * 9. Reconciliation audit accuracy (detects true anomalies, avoids false positives on healthy/legacy cases)
 * 10. Reconciliation audit read-only invariant (0 mutations to disk)
 * 11. Immutability guard on repository db.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import express from 'express';
import { db } from '../src/db/index.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { maintenanceCaseService, hasCurrentCycleAcceptance } from '../src/services/maintenanceCaseService.js';
import { professionalRepository } from '../src/repositories/professionalRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { maintenanceRouter, sanitizeCaseForTechnician, sanitizeAttachmentForTechnician } from '../src/api/maintenance.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { projectRepository } from '../src/repositories/projectRepository.js';
import { jwtService } from '../src/security/jwtService.js';
import { getFileStorageService } from '../src/storage/index.js';
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
  console.log('STAGE 13.11-F.5 PHASE 2B: LIFECYCLE & RECONCILIATION REGRESSION');
  console.log('================================================================');

  const isolation = setupTestDatabaseIsolation('stage13_11_f5_phase2b');
  const tempDbPath = isolation.tempDbPath;

  try {
    // -------------------------------------------------------------------------
    // TEST ENVIRONMENT SETUP
    // -------------------------------------------------------------------------
    const customerUser = userRepository.createUser({
      name: 'کارفرمای محترم',
      email: 'customer.phase2b@example.com',
      role: 'customer',
      phone: '09121111111'
    });

    const adminUser = userRepository.createUser({
      name: 'مدیر ارشد سامانه',
      email: 'admin.phase2b@example.com',
      role: 'admin',
      phone: '09129999999'
    });

    const techUserA = userRepository.createUser({
      name: 'تکنسین الف',
      email: 'techA.phase2b@example.com',
      role: 'technician',
      phone: '09123333333'
    });

    const techProA = professionalRepository.createProfessional({
      userId: techUserA.id,
      fullName: 'مهندس تکنسین الف',
      phone: '09123333333',
      specialties: ['INVERTER', 'SOLAR_PANELS', 'GENERATOR'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED',
      isAvailable: true
    });

    const techUserB = userRepository.createUser({
      name: 'تکنسین ب',
      email: 'techB.phase2b@example.com',
      role: 'technician',
      phone: '09124444444'
    });

    const techProB = professionalRepository.createProfessional({
      userId: techUserB.id,
      fullName: 'مهندس تکنسین ب',
      phone: '09124444444',
      specialties: ['BATTERY', 'INVERTER'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED',
      isAvailable: true
    });

    const techUserC = userRepository.createUser({
      name: 'تکنسین ج (فاقد تلفن)',
      email: 'techC.phase2b@example.com',
      role: 'technician'
    });

    const techProC = professionalRepository.createProfessional({
      userId: techUserC.id,
      fullName: 'مهندس تکنسین ج',
      specialties: ['SOLAR_PANELS'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED',
      isAvailable: true
    });

    const customerToken = jwtService.sign({ userId: customerUser.id, role: 'customer' });
    const adminToken = jwtService.sign({ userId: adminUser.id, role: 'admin' });
    const techTokenA = jwtService.sign({ userId: techUserA.id, role: 'technician' });
    const techTokenB = jwtService.sign({ userId: techUserB.id, role: 'technician' });
    const techTokenC = jwtService.sign({ userId: techUserC.id, role: 'technician' });

    // Launch Express test server
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      const auth = req.headers.authorization;
      if (auth && auth.startsWith('Bearer ')) {
        const token = auth.substring(7);
        try {
          const payload = jwtService.verify(token);
          (req as any).user = {
            ...payload,
            id: payload.userId
          };
        } catch {
          // ignore
        }
      }
      next();
    });
    app.use(maintenanceRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    // -------------------------------------------------------------------------
    // TEST 1: CANCELLATION HISTORY RECORDING WITH ACTIVE ASSIGNMENT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: CANCELLATION HISTORY RECORDING WITH ACTIVE ASSIGNMENT ---');
    const case1 = maintenanceCaseService.createCase({
      title: 'پرونده تست لغو با تکنسین فعال',
      description: 'شرح عیب اینورتر',
      contactName: 'علی رضایی',
      contactPhone: '09121111111',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    }, customerUser.id);

    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case1.id,
      technicianId: techProA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص اولیه'
    });

    const cancelRes1 = await fetch(`${baseUrl}/cases/${case1.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'لغو به درخواست مشتری' })
    });

    assert(cancelRes1.status === 200, 'Test 1: Cancel endpoint returns HTTP 200 for assigned case');
    const cancelledCase1 = await cancelRes1.json();
    assert(cancelledCase1.status === 'CANCELLED', 'Test 1: Case status updated to CANCELLED');

    const histories1 = maintenanceRepository.getAssignmentHistories(case1.id);
    assert(histories1.length === 2, 'Test 1: Preserves initial ASSIGNED event and adds exactly 1 CANCELLED event');
    assert(histories1[0].status === 'ASSIGNED', 'Test 1: First event remains ASSIGNED');
    assert(histories1[1].status === 'CANCELLED', 'Test 1: Second event is recorded as CANCELLED');
    assert(histories1[1].technicianId === techProA.id, 'Test 1: CANCELLED event records correct assigned technician');
    assert(histories1[1].assignedBy === customerUser.id, 'Test 1: CANCELLED event records correct actor user ID');
    assert(histories1[1].notes === 'لغو به درخواست مشتری', 'Test 1: CANCELLED event records closure notes');

    // -------------------------------------------------------------------------
    // TEST 2: SAFE CANCELLATION OF UNASSIGNED CASES WITHOUT GHOST HISTORY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: SAFE CANCELLATION OF UNASSIGNED CASES ---');
    const case2 = maintenanceCaseService.createCase({
      title: 'پرونده تست لغو بدون تکنسین',
      description: 'شرح پرونده باز',
      contactName: 'مریم احمدی',
      contactPhone: '09122222222'
    }, customerUser.id);

    assert(case2.status === 'OPEN', 'Test 2: Case initially OPEN without technician');
    assert(!case2.assignedTechnicianId, 'Test 2: Case has no assignedTechnicianId');

    const cancelRes2 = await fetch(`${baseUrl}/cases/${case2.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'لغو پرونده باز قبل از انتساب' })
    });

    assert(cancelRes2.status === 200, 'Test 2: Cancel endpoint returns HTTP 200 for unassigned case');
    const cancelledCase2 = await cancelRes2.json();
    assert(cancelledCase2.status === 'CANCELLED', 'Test 2: Unassigned case successfully transitioned to CANCELLED');

    const histories2 = maintenanceRepository.getAssignmentHistories(case2.id);
    assert(histories2.length === 0, 'Test 2: Zero ghost assignment histories recorded for unassigned case cancellation');

    // -------------------------------------------------------------------------
    // TEST 3: CANCELLATION PRIVACY BARRIER
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: CANCELLATION PRIVACY BARRIER ---');
    // Create case, assign to Tech A, Tech A accepts (so contact details were unmasked during active execution)
    const case3 = maintenanceCaseService.createCase({
      title: 'پرونده حریم خصوصی پس از لغو',
      description: 'تست عدم دسترسی تکنسین پس از لغو',
      contactName: 'حسین محمدی',
      contactPhone: '09125555555',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone,
      billDoc: {
        name: 'bill.pdf',
        status: 'EXTRACTION_AVAILABLE',
        extractedData: {
          customerName: 'حسین محمدی',
          customerPhone: '09125555555',
          nationalId: '0012345678'
        }
      }
    }, customerUser.id);

    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case3.id,
      technicianId: techProA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED'
    });

    // Tech A accepts case
    const acceptRes3 = await fetch(`${baseUrl}/cases/${case3.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(acceptRes3.status === 200, 'Test 3: Tech A accepted case initially');

    // Verify contact info was accessible while active
    const activeViewRes = await fetch(`${baseUrl}/cases/${case3.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const activeView = await activeViewRes.json();
    assert(activeView.contactPhone === '09125555555', 'Test 3: Contact phone was accessible while actively executing');

    // Now Customer cancels case
    const cancelRes3 = await fetch(`${baseUrl}/cases/${case3.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'پروژه لغو شد' })
    });
    assert(cancelRes3.status === 200, 'Test 3: Case cancelled');

    // Post-cancellation: Tech A requests case detail
    const postCancelTechRes = await fetch(`${baseUrl}/cases/${case3.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(postCancelTechRes.status === 200, 'Test 3: Tech A can still view record for audit');
    const postCancelTechView = await postCancelTechRes.json();
    assert(postCancelTechView.status === 'CANCELLED', 'Test 3: Case shows status CANCELLED');
    assert(postCancelTechView.contactName === undefined, 'Test 3: Customer contactName strictly masked for Tech A after cancellation');
    assert(postCancelTechView.contactPhone === undefined, 'Test 3: Customer contactPhone strictly masked for Tech A after cancellation');
    assert(postCancelTechView.billDoc?.extractedData?.customerPhone === undefined, 'Test 3: billDoc customerPhone masked after cancellation');
    assert(postCancelTechView.billDoc?.extractedData?.nationalId === undefined, 'Test 3: billDoc nationalId masked after cancellation');

    // Post-cancellation: Tech A requests /technician/cases list
    const techCasesListRes = await fetch(`${baseUrl}/technician/cases`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const techCasesList = await techCasesListRes.json();
    const listedCase3 = techCasesList.find((c: any) => c.id === case3.id);
    assert(Boolean(listedCase3), 'Test 3: Case appears in technician history list');
    assert(listedCase3.contactPhone === undefined, 'Test 3: Contact phone strictly masked in /technician/cases list');

    // Customer requests case detail: complete contact info intact
    const customerViewRes = await fetch(`${baseUrl}/cases/${case3.id}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const customerView = await customerViewRes.json();
    assert(customerView.contactPhone === '09125555555', 'Test 3: Customer contactPhone preserved intact for customer/reporter');

    // -------------------------------------------------------------------------
    // TEST 4: CLOSED CASE PRIVACY BARRIER
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: CLOSED CASE PRIVACY BARRIER ---');
    const case4 = maintenanceCaseService.createCase({
      title: 'پرونده تست خاتمه و حریم خصوصی',
      description: 'شرح تکمیل کار',
      contactName: 'زهرا موسوی',
      contactPhone: '09126666666',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    }, customerUser.id);

    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case4.id,
      technicianId: techProA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED'
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case4.id,
      technicianId: techProA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED'
    });

    // Move case to IN_PROGRESS -> add action -> submit-verification -> verify -> close
    maintenanceCaseService.transitionCaseStatus(case4.id, 'IN_PROGRESS', techUserA.id);
    maintenanceRepository.createAction({
      maintenanceCaseId: case4.id,
      actionType: 'REPAIR',
      description: 'تعمیر کامل',
      performedBy: techUserA.id,
      performedAt: new Date().toISOString()
    });
    maintenanceCaseService.transitionCaseStatus(case4.id, 'AWAITING_VERIFICATION', techUserA.id);
    maintenanceCaseService.transitionCaseStatus(case4.id, 'VERIFIED', customerUser.id);
    const closedCase4 = maintenanceCaseService.transitionCaseStatus(case4.id, 'CLOSED', customerUser.id);
    assert(closedCase4.status === 'CLOSED', 'Test 4: Case successfully moved to CLOSED');

    // Tech A views closed case
    const techClosedViewRes = await fetch(`${baseUrl}/cases/${case4.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const techClosedView = await techClosedViewRes.json();
    assert(techClosedView.contactPhone === undefined, 'Test 4: Customer contactPhone strictly masked for Tech A on CLOSED case');
    assert(techClosedView.contactName === undefined, 'Test 4: Customer contactName strictly masked for Tech A on CLOSED case');

    // Direct sanitizeCaseForTechnician test: cannot bypass with options.isAccepted
    const directSanitized = sanitizeCaseForTechnician(closedCase4, { isAccepted: true });
    assert(directSanitized.contactPhone === undefined, 'Test 4: sanitizeCaseForTechnician refuses to unmask closed cases even with { isAccepted: true }');

    // -------------------------------------------------------------------------
    // TEST 5: TERMINAL STATE IMMUTABILITY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: TERMINAL STATE IMMUTABILITY ---');
    // Using cancelledCase1 (CANCELLED):
    const assignCancelled = await fetch(`${baseUrl}/cases/${case1.id}/assign`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: techProB.id })
    });
    assert(assignCancelled.status === 400, 'Test 5: /assign rejected on CANCELLED case (HTTP 400)');

    const selectCancelled = await fetch(`${baseUrl}/cases/${case1.id}/select-technician`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: techProB.id })
    });
    assert(selectCancelled.status === 400, 'Test 5: /select-technician rejected on CANCELLED case (HTTP 400)');

    const acceptCancelled = await fetch(`${baseUrl}/cases/${case1.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(acceptCancelled.status === 400, 'Test 5: /accept rejected on CANCELLED case (HTTP 400)');

    const startCancelled = await fetch(`${baseUrl}/cases/${case1.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(startCancelled.status === 400, 'Test 5: /start rejected on CANCELLED case (HTTP 400)');

    const schedCancelled = await fetch(`${baseUrl}/cases/${case1.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-01' })
    });
    assert(schedCancelled.status === 400, 'Test 5: /schedule rejected on CANCELLED case (HTTP 400)');

    const submitVerifCancelled = await fetch(`${baseUrl}/cases/${case1.id}/submit-verification`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(submitVerifCancelled.status === 400, 'Test 5: /submit-verification rejected on CANCELLED case (HTTP 400)');

    const verifCancelled = await fetch(`${baseUrl}/cases/${case1.id}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationPassed: true })
    });
    assert(verifCancelled.status === 400, 'Test 5: /verify rejected on CANCELLED case (HTTP 400)');

    const actionCancelled = await fetch(`${baseUrl}/cases/${case1.id}/actions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType: 'REPAIR', description: 'تلاش ثبت اقدام روی پرونده لغو شده' })
    });
    assert(actionCancelled.status === 400, 'Test 5: /actions rejected on CANCELLED case (HTTP 400)');

    const patchCancelled = await fetch(`${baseUrl}/cases/${case1.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'تغییر عنوان پرونده لغو شده' })
    });
    assert(patchCancelled.status === 400, 'Test 5: PATCH rejected on CANCELLED case (HTTP 400)');

    const closeCancelled = await fetch(`${baseUrl}/cases/${case1.id}/close`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(closeCancelled.status === 400, 'Test 5: /close rejected on CANCELLED case (HTTP 400)');

    // On CLOSED case (case4):
    const cancelClosed = await fetch(`${baseUrl}/cases/${case4.id}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(cancelClosed.status === 400, 'Test 5: /cancel rejected on CLOSED case (HTTP 400)');

    const assignClosed = await fetch(`${baseUrl}/cases/${case4.id}/assign`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ technicianId: techProB.id })
    });
    assert(assignClosed.status === 400, 'Test 5: /assign rejected on CLOSED case (HTTP 400)');

    const acceptClosed = await fetch(`${baseUrl}/cases/${case4.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(acceptClosed.status === 400, 'Test 5: /accept rejected on CLOSED case (HTTP 400)');

    // -------------------------------------------------------------------------
    // TEST 6: IDEMPOTENT CANCELLATION & CLOSURE
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: IDEMPOTENT CANCELLATION & CLOSURE ---');
    const historiesCountBefore = maintenanceRepository.getAssignmentHistories(case1.id).length;
    const initialClosureNotes = maintenanceRepository.getCaseById(case1.id)?.closureNotes;

    // Repeat /cancel on already CANCELLED case
    const repeatCancelRes = await fetch(`${baseUrl}/cases/${case1.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'تلاش مجدد برای لغو' })
    });
    assert(repeatCancelRes.status === 200, 'Test 6: Repeat /cancel on CANCELLED case returns safe HTTP 200');
    const historiesCountAfter = maintenanceRepository.getAssignmentHistories(case1.id).length;
    assert(historiesCountAfter === historiesCountBefore, 'Test 6: Repeat /cancel does NOT create duplicate history records');
    const currentNotes = maintenanceRepository.getCaseById(case1.id)?.closureNotes;
    assert(currentNotes === initialClosureNotes, 'Test 6: Repeat /cancel does NOT overwrite prior closure notes');

    // Repeat /close on already CLOSED case
    const repeatCloseRes = await fetch(`${baseUrl}/cases/${case4.id}/close`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(repeatCloseRes.status === 200, 'Test 6: Repeat /close on CLOSED case returns safe HTTP 200 idempotently');

    // -------------------------------------------------------------------------
    // TEST 7: REASSIGNMENT METADATA CLEANUP (A -> B)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: REASSIGNMENT METADATA CLEANUP (A -> B) ---');
    const case7 = maintenanceCaseService.createCase({
      title: 'پرونده تست بازتخصیص و پاکسازی متادیتا',
      description: 'تست حذف داده‌های تکنسین قبلی',
      contactName: 'رضا کمالی',
      contactPhone: '09127777777',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone,
      scheduledDate: '2026-10-20'
    }, customerUser.id);

    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case7.id,
      technicianId: techProA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED'
    });

    // Tech A accepts and starts case
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: case7.id,
      technicianId: techProA.id,
      assignedBy: techUserA.id,
      status: 'ACCEPTED'
    });
    const startedCase7 = maintenanceCaseService.transitionCaseStatus(case7.id, 'IN_PROGRESS', techUserA.id);
    assert(Boolean(startedCase7.startedAt), 'Test 7: startedAt initially populated for Tech A');

    // Tech A logs an action in Cycle 1
    const cycle1ActionRes = await fetch(`${baseUrl}/cases/${case7.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'INSPECTION',
        description: 'بازرسی اولیه اتصالات تابلو برق و مبدل',
        notes: 'اقدام ثبت شده در چرخه ۱ توسط تکنسین الف'
      })
    });
    assert(cycle1ActionRes.status === 200, 'Test 7: Action logged in Cycle 1 by Tech A');
    const cycle1Action = await cycle1ActionRes.json();
    assert(cycle1Action.performedBy === techUserA.id, 'Test 7: Action performedBy matches Tech A user ID');

    // Admin reassigns case from Tech A to Tech B
    const reassignRes7 = await fetch(`${baseUrl}/cases/${case7.id}/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        technicianId: techProB.id,
        scheduledAt: '2026-10-25',
        notes: 'بازتخصیص به تکنسین ب به دلیل در دسترس نبودن تکنسین الف'
      })
    });

    assert(reassignRes7.status === 200, 'Test 7: Admin reassignment returned HTTP 200');
    const reassignedCase7 = await reassignRes7.json();

    assert(reassignedCase7.status === 'ASSIGNED', 'Test 7: Status transitioned back to ASSIGNED');
    assert(reassignedCase7.assignedTechnicianId === techProB.id, 'Test 7: assignedTechnicianId updated to Tech B');
    assert(reassignedCase7.assignedTechnicianName === techProB.fullName, 'Test 7: assignedTechnicianName updated to Tech B');
    assert(reassignedCase7.assignedTechnicianPhone === techProB.phone, 'Test 7: assignedTechnicianPhone updated to Tech B');
    assert(reassignedCase7.startedAt === undefined, 'Test 7: execution startedAt timestamp cleanly reset/undefined');
    assert(reassignedCase7.scheduledDate === '2026-10-25' || reassignedCase7.scheduledAt === '2026-10-25', 'Test 7: scheduled date updated to new schedule');

    // Read directly from DB record to ensure disk persistence has no stale startedAt
    const dbCase7 = maintenanceRepository.getCaseById(case7.id)!;
    assert(dbCase7.startedAt === undefined, 'Test 7: Stored DB record does NOT retain Tech A startedAt');
    assert(dbCase7.assignedTechnicianPhone !== techProA.phone, 'Test 7: Stored DB record does NOT retain Tech A phone');

    // Reassignment to an authorized technician without a phone number does not preserve the previous technician's phone
    // And reassignment without an explicit schedule removes the previous assignment cycle's scheduling metadata
    const reassignNoPhoneRes = await fetch(`${baseUrl}/cases/${case7.id}/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        technicianId: techProC.id,
        notes: 'بازتخصیص به تکنسین ج فاقد شماره تماس و بدون تعیین زمان‌بندی'
      })
    });
    assert(reassignNoPhoneRes.status === 200, 'Test 7: Reassignment to tech without phone returns HTTP 200');
    const reassignNoPhoneCase = await reassignNoPhoneRes.json();
    assert(reassignNoPhoneCase.assignedTechnicianId === techProC.id, 'Test 7: assignedTechnicianId updated to Tech C');
    assert(reassignNoPhoneCase.assignedTechnicianPhone === undefined, 'Test 7: Reassignment to tech without phone does not preserve previous phone');
    assert(reassignNoPhoneCase.scheduledDate === undefined && reassignNoPhoneCase.scheduledAt === undefined, 'Test 7: Reassignment without explicit schedule clears previous cycle schedule');

    const dbCaseNoPhone = maintenanceRepository.getCaseById(case7.id)!;
    assert(dbCaseNoPhone.assignedTechnicianPhone === undefined, 'Test 7: Stored DB record omits phone for tech without phone');
    assert(dbCaseNoPhone.scheduledDate === undefined && dbCaseNoPhone.scheduledAt === undefined, 'Test 7: Stored DB record omits schedule when omitted');

    // -------------------------------------------------------------------------
    // TEST 8: SCENARIO C (A -> B -> A) CYCLE METADATA AND ACCEPTANCE ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: A -> B -> A CYCLE METADATA AND ACCEPTANCE ISOLATION ---');
    // Case was assigned to A, then B, then C. Now reassign back to A!
    const reassignBackRes = await fetch(`${baseUrl}/cases/${case7.id}/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        technicianId: techProA.id,
        scheduledAt: '2026-10-28',
        notes: 'بازتخصیص مجدد به تکنسین الف'
      })
    });
    assert(reassignBackRes.status === 200, 'Test 8: Reassigning back to Tech A returns HTTP 200');
    const cycle2Case = await reassignBackRes.json();

    assert(cycle2Case.status === 'ASSIGNED', 'Test 8: Case status is ASSIGNED for Cycle 2');
    assert(cycle2Case.assignedTechnicianId === techProA.id, 'Test 8: Assigned technician is Tech A in Cycle 2');
    assert(cycle2Case.startedAt === undefined, 'Test 8: startedAt is undefined for Tech A in Cycle 2');

    // In Cycle 2, hasCurrentCycleAcceptance MUST be false before Tech A accepts again
    assert(hasCurrentCycleAcceptance(cycle2Case) === false, 'Test 8: hasCurrentCycleAcceptance strictly returns false for Tech A in Cycle 2 before acceptance');

    // Tech A viewing case before acceptance: contact info is masked
    const cycle2TechViewRes = await fetch(`${baseUrl}/cases/${case7.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const cycle2TechView = await cycle2TechViewRes.json();
    assert(cycle2TechView.contactPhone === undefined, 'Test 8: Cycle 1 acceptance does NOT leak contactPhone in Cycle 2 before new acceptance');

    // Tech A cannot start without accepting Cycle 2
    const prematureStartRes = await fetch(`${baseUrl}/cases/${case7.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(prematureStartRes.status === 409, 'Test 8: /start rejected with HTTP 409 without Cycle 2 acceptance');

    // Tech A formally accepts Cycle 2
    const cycle2AcceptRes = await fetch(`${baseUrl}/cases/${case7.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(cycle2AcceptRes.status === 200, 'Test 8: Tech A accepts Cycle 2 successfully');
    const acceptedCase = maintenanceRepository.getCaseById(case7.id)!;
    assert(hasCurrentCycleAcceptance(acceptedCase) === true, 'Test 8: hasCurrentCycleAcceptance returns true after Cycle 2 acceptance');

    // Historical maintenance actions and original actor IDs survive across reassignment cycles
    const actionsListRes = await fetch(`${baseUrl}/cases/${case7.id}/actions`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(actionsListRes.status === 200, 'Test 8: GET /cases/:id/actions returns HTTP 200');
    const actionsList = await actionsListRes.json();
    const preservedAction = actionsList.find((act: any) => act.id === cycle1Action.id);
    assert(Boolean(preservedAction), 'Test 8: Historical maintenance action survived across reassignment cycles');
    assert(preservedAction.performedBy === techUserA.id, 'Test 8: Original actor ID preserved intact on historical action');

    // Historical assignment histories survive across cycles in repository
    const allAssignmentHistories = maintenanceRepository.getAssignmentHistories(case7.id);
    assert(allAssignmentHistories.length >= 4, 'Test 8: All assignment histories preserved across reassignment cycles');
    assert(allAssignmentHistories.some(h => h.technicianId === techProA.id && h.status === 'ASSIGNED'), 'Test 8: Cycle 1 ASSIGNED history preserved');
    assert(allAssignmentHistories.some(h => h.technicianId === techProB.id && h.status === 'ASSIGNED'), 'Test 8: Intermediate Tech B ASSIGNED history preserved');
    assert(allAssignmentHistories.some(h => h.technicianId === techProC.id && h.status === 'ASSIGNED'), 'Test 8: Intermediate Tech C ASSIGNED history preserved');
    assert(allAssignmentHistories.some(h => h.technicianId === techProA.id && h.status === 'ACCEPTED'), 'Test 8: Initial ACCEPTED history preserved');

    // -------------------------------------------------------------------------
    // TEST 9: RECONCILIATION AUDIT ACCURACY & FALSE POSITIVE ELIMINATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: RECONCILIATION AUDIT ACCURACY ---');
    // Anomaly 1: CANCELLED case with active uncancelled assignment
    const uncancelledAssignmentCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده لغو شده با تخصیص بدون تاریخچه لغو',
      description: 'تست کشف عدم تطابق لغو',
      priority: 'MEDIUM',
      status: 'CANCELLED',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: uncancelledAssignmentCase.id,
      technicianId: techProA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED'
    });

    // Anomaly 2: CANCELLED case with contradictory verificationPassed
    const contradictoryVerifCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده لغو شده با وضعیت متناقض تایید',
      description: 'تست تضاد منطقی',
      priority: 'LOW',
      status: 'CANCELLED',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    maintenanceRepository.updateCase(contradictoryVerifCase.id, {
      verificationPassed: true
    });

    // Healthy legacy CLOSED case without history (must NOT produce false positive)
    const legacyClosedCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده موروثی بسته شده بدون تاریخچه',
      description: 'مربوط به سال‌های قبل',
      priority: 'LOW',
      status: 'CLOSED',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });

    // Healthy legacy CANCELLED case without history (must NOT produce false positive)
    const legacyCancelledCase = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      title: 'پرونده موروثی لغو شده بدون تاریخچه',
      description: 'مربوط به سال‌های قبل',
      priority: 'LOW',
      status: 'CANCELLED',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });

    const auditRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(auditRes.status === 200, 'Test 9: Admin audit endpoint returns HTTP 200');
    const auditReport = await auditRes.json();

    // Verify detection of uncancelled assignment anomaly
    const foundUncancelled = auditReport.findings.find((f: any) => f.caseId === uncancelledAssignmentCase.id);
    assert(Boolean(foundUncancelled), 'Test 9: Audit accurately identifies CANCELLED case with active uncancelled assignment');
    assert(
      foundUncancelled.anomalyType === 'CANCELLED_CASE_ACTIVE_ASSIGNMENT' || foundUncancelled.anomalyType === 'CANCELLED_CASE_WITH_ACTIVE_ACCEPTANCE',
      'Test 9: Anomaly type accurately flags uncancelled assignment'
    );

    // Verify detection of contradictory state anomaly
    const foundContradictory = auditReport.findings.find((f: any) => f.caseId === contradictoryVerifCase.id);
    assert(Boolean(foundContradictory), 'Test 9: Audit accurately identifies contradictory verification on CANCELLED case');

    // Verify ZERO false positives on legitimate legacy cases
    const foundLegacyClosed = auditReport.findings.find((f: any) => f.caseId === legacyClosedCase.id);
    assert(!foundLegacyClosed, 'Test 9: Legitimate legacy CLOSED case produces ZERO false-positive anomalies');

    const foundLegacyCancelled = auditReport.findings.find((f: any) => f.caseId === legacyCancelledCase.id);
    assert(!foundLegacyCancelled, 'Test 9: Legitimate legacy CANCELLED case produces ZERO false-positive anomalies');

    // Verify properly completed and cancelled cases from earlier tests produce 0 anomalies
    const foundProperlyCancelled = auditReport.findings.find((f: any) => f.caseId === case1.id);
    assert(!foundProperlyCancelled, 'Test 9: Properly cancelled case with CANCELLED history produces ZERO anomalies');

    // Verify privacy in audit findings: no customer phone numbers
    for (const finding of auditReport.findings) {
      assert(finding.contactPhone === undefined, 'Test 9: Finding strictly omits contactPhone');
      assert(finding.contactName === undefined, 'Test 9: Finding strictly omits contactName');
    }

    // -------------------------------------------------------------------------
    // TEST 12: CANCELLATION FAILURE INJECTION & COMPENSATING ROLLBACK INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 12: CANCELLATION FAILURE INJECTION & COMPENSATING ROLLBACK ---');
    // Scenario 1: Failure during history creation triggers rollback
    const caseFail1 = maintenanceRepository.createCase({
      title: 'Rollback Invariant Case 1',
      description: 'Testing compensating rollback when history persistence fails',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });

    const origCreateAssignmentHistory = maintenanceRepository.createAssignmentHistory;
    // Monkey-patch history persistence to throw
    (maintenanceRepository as any).createAssignmentHistory = () => {
      throw new Error('SIMULATED_HISTORY_WRITE_FAILURE');
    };

    let rollbackErrorCaught = false;
    try {
      await maintenanceCaseService.transitionCaseStatus(caseFail1.id, 'CANCELLED', 'admin-actor', {
        closureNotes: 'This cancellation should be rolled back'
      });
    } catch (err: any) {
      rollbackErrorCaught = true;
      assert(err.message.includes('تغییرات پرونده بازگردانده شد'), 'Test 12: Caught expected rollback notice on history failure');
    }
    assert(rollbackErrorCaught, 'Test 12: History persistence failure triggered compensating error flow');

    // Restore createAssignmentHistory
    (maintenanceRepository as any).createAssignmentHistory = origCreateAssignmentHistory;

    // Verify DB state: case status was restored to ASSIGNED
    const restoredCase = maintenanceRepository.getCaseById(caseFail1.id);
    assert(restoredCase?.status === 'ASSIGNED', 'Test 12: Compensating rollback restored case status to ASSIGNED');
    assert(restoredCase?.assignedTechnicianId === techProA.id, 'Test 12: Preserved assignedTechnicianId after rollback');

    // Scenario 2: Double failure where rollback write also fails
    const caseFail2 = maintenanceRepository.createCase({
      title: 'Double Failure Invariant Case 2',
      description: 'Testing catastrophic double failure error reporting',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'BATTERY',
      priority: 'HIGH',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id
    });

    const origUpdateCase = maintenanceRepository.updateCase;
    (maintenanceRepository as any).createAssignmentHistory = () => {
      throw new Error('SIMULATED_HISTORY_WRITE_FAILURE');
    };

    let updateCount = 0;
    (maintenanceRepository as any).updateCase = (id: string, patch: any) => {
      updateCount++;
      if (updateCount === 1) {
        // First update sets status: 'CANCELLED' - allow it to succeed
        return origUpdateCase.call(maintenanceRepository, id, patch);
      }
      // Second update is the rollback call - simulate failure
      throw new Error('SIMULATED_ROLLBACK_WRITE_FAILURE');
    };

    let doubleFailureCaught = false;
    try {
      await maintenanceCaseService.transitionCaseStatus(caseFail2.id, 'CANCELLED', 'admin-actor');
    } catch (err: any) {
      doubleFailureCaught = true;
      assert(err.message.includes('عدم موفقیت در بازگردانی وضعیت پرونده'), 'Test 12: Throws critical unrecoverable rollback warning');
    }
    assert(doubleFailureCaught, 'Test 12: Double failure caught and reported');

    // Restore methods after Scenario 2
    (maintenanceRepository as any).createAssignmentHistory = origCreateAssignmentHistory;
    (maintenanceRepository as any).updateCase = origUpdateCase;

    // Scenario 3: Cancellation rollback failure via HTTP returns HTTP 500 and preserves sufficient evidence for reconciliation
    const caseFailHttp = maintenanceRepository.createCase({
      title: 'Rollback HTTP 500 Case',
      description: 'Verifying HTTP 500 and database state following rollback failure',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'HIGH',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName
    });

    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseFailHttp.id,
      technicianId: techProA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص اولیه قبل از تلاش لغو'
    });

    (maintenanceRepository as any).createAssignmentHistory = () => {
      throw new Error('SIMULATED_HISTORY_WRITE_FAILURE');
    };

    let updateCountHttp = 0;
    (maintenanceRepository as any).updateCase = (id: string, patch: any) => {
      updateCountHttp++;
      if (updateCountHttp === 1) {
        // Initial transition to CANCELLED succeeds
        return origUpdateCase.call(maintenanceRepository, id, patch);
      }
      // Rollback write fails
      throw new Error('SIMULATED_ROLLBACK_WRITE_FAILURE');
    };

    const cancelFailHttpRes = await fetch(`${baseUrl}/cases/${caseFailHttp.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'تست شکست بازگردانی در لغو' })
    });

    assert(cancelFailHttpRes.status === 500, 'Test 12: Cancellation rollback failure returns HTTP 500');
    const cancelFailBody = await cancelFailHttpRes.json();
    assert(cancelFailBody.error.includes('مدیر سامانه'), 'Test 12: Rollback failure notifies administrative reconciliation required');

    // Restore methods
    (maintenanceRepository as any).createAssignmentHistory = origCreateAssignmentHistory;
    (maintenanceRepository as any).updateCase = origUpdateCase;

    // Verify persisted database state: case is CANCELLED with assignedTechnicianId preserved (anomaly evidence)
    const dbCaseRollbackFailed = maintenanceRepository.getCaseById(caseFailHttp.id)!;
    assert(dbCaseRollbackFailed.status === 'CANCELLED', 'Test 12: Persisted DB state retains CANCELLED after rollback failure');
    assert(dbCaseRollbackFailed.assignedTechnicianId === techProA.id, 'Test 12: Persisted DB state retains assignedTechnicianId as audit evidence');

    // Verify reconciliation audit flags this case
    const auditEvidenceRes = await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(auditEvidenceRes.status === 200, 'Test 12: Reconciliation audit endpoint accessible for rollback failure evidence');
    const auditEvidenceReport = await auditEvidenceRes.json();
    const anomalyFinding = auditEvidenceReport.findings.find((f: any) => f.caseId === caseFailHttp.id);
    assert(Boolean(anomalyFinding), 'Test 12: Reconciliation audit detects uncancelled assignment evidence on rollback-failed case');

    // -------------------------------------------------------------------------
    // TEST 13: CROSS-TECHNICIAN UNAUTHORIZED ACCESS AND ISOLATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 13: CROSS-TECHNICIAN ACCESS BARRIERS & ISOLATION ---');
    // Case assigned to Tech A
    const caseTechA = maintenanceRepository.createCase({
      title: 'Tech A Exclusive Case',
      description: 'Protected case belonging to Tech A',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'HIGH',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });

    // Tech B tries to GET case details
    const getResB = await fetch(`${baseUrl}/cases/${caseTechA.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(getResB.status === 403, 'Test 13: Tech B receives 403 accessing Tech A case');

    // Tech B tries to accept case
    const acceptResB = await fetch(`${baseUrl}/cases/${caseTechA.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(acceptResB.status === 403, 'Test 13: Tech B receives 403 attempting to accept Tech A case');

    // Tech B tries to schedule case
    const scheduleResB = await fetch(`${baseUrl}/cases/${caseTechA.id}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenB}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scheduledDate: new Date().toISOString() })
    });
    assert(scheduleResB.status === 403, 'Test 13: Tech B receives 403 attempting to schedule Tech A case');

    // Tech B tries to start case
    const startResB = await fetch(`${baseUrl}/cases/${caseTechA.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(startResB.status === 403, 'Test 13: Tech B receives 403 attempting to start Tech A case');

    // Tech B lists cases: Tech A's case must NOT be included
    const listResB = await fetch(`${baseUrl}/cases`, {
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    const listB = await listResB.json();
    const foundInB = listB.find((c: any) => c.id === caseTechA.id);
    assert(!foundInB, 'Test 13: Tech B case list strictly excludes Tech A cases');

    // -------------------------------------------------------------------------
    // TEST 14: MULTIPART ATTACHMENT UPLOAD REJECTION ON TERMINAL CASES
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 14: MULTIPART UPLOAD REJECTION ON TERMINAL CASES ---');
    const storageService = getFileStorageService();
    let putObjectCalls = 0;
    let deleteObjectCalls = 0;
    const origPutObject = storageService.putObject;
    const origDeleteObject = storageService.deleteObject;
    (storageService as any).putObject = async (...args: any[]) => {
      putObjectCalls++;
      return origPutObject ? origPutObject.apply(storageService, args as any) : { key: 'mock', size: 0, etag: 'mock' };
    };
    (storageService as any).deleteObject = async (...args: any[]) => {
      deleteObjectCalls++;
      return origDeleteObject ? origDeleteObject.apply(storageService, args as any) : true;
    };

    // Upload on CANCELLED case
    const caseCancelledForUpload = maintenanceRepository.createCase({
      title: 'Cancelled Case for Upload Test',
      description: 'Attempting upload after cancellation',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'LOW',
      status: 'CANCELLED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id
    });

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const dummyImagePayload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="evidence.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const uploadCancelledRes = await fetch(`${baseUrl}/cases/${caseCancelledForUpload.id}/attachments/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: dummyImagePayload
    });
    assert(uploadCancelledRes.status === 400, 'Test 14: Multipart upload on CANCELLED case rejected with 400');
    const uploadCancelledBody = await uploadCancelledRes.json();
    assert(uploadCancelledBody.error.includes('لغو شده یا بسته شده'), 'Test 14: Correct Persian error message on terminal upload');

    // Verify DB case attachments did not grow
    const dbCaseCancelled = maintenanceRepository.getCaseById(caseCancelledForUpload.id);
    assert(!dbCaseCancelled?.attachments || dbCaseCancelled.attachments.length === 0, 'Test 14: Zero attachments persisted on CANCELLED case');
    assert(putObjectCalls === 0, 'Test 14: Zero storage put operations invoked on rejected CANCELLED upload');

    // Upload on CLOSED case
    const caseClosedForUpload = maintenanceRepository.createCase({
      title: 'Closed Case for Upload Test',
      description: 'Attempting upload after closure',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'BATTERY',
      priority: 'LOW',
      status: 'CLOSED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id
    });

    const uploadClosedRes = await fetch(`${baseUrl}/cases/${caseClosedForUpload.id}/attachments/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: dummyImagePayload
    });
    assert(uploadClosedRes.status === 400, 'Test 14: Multipart upload on CLOSED case rejected with 400');

    const dbCaseClosed = maintenanceRepository.getCaseById(caseClosedForUpload.id);
    assert(!dbCaseClosed?.attachments || dbCaseClosed.attachments.length === 0, 'Test 14: Zero attachments persisted on CLOSED case');
    assert(putObjectCalls === 0, 'Test 14: Zero storage put operations invoked on rejected CLOSED upload');

    // -------------------------------------------------------------------------
    // TEST 15: ATTACHMENT DELETION REJECTION ON TERMINAL CASES
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 15: ATTACHMENT DELETION REJECTION ON TERMINAL CASES ---');
    const caseWithAtt = maintenanceRepository.createCase({
      title: 'Terminal Deletion Resistance Case',
      description: 'Testing deletion guard on terminal cases',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'MEDIUM',
      status: 'CANCELLED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      attachments: [{
        id: 'att-term-del-1',
        maintenanceCaseId: 'placeholder',
        name: 'site_photo.jpg',
        type: 'PHOTO',
        storageProvider: 'S3_COMPATIBLE',
        storageKey: 'maintenance/test/site_photo.jpg',
        url: 'https://example.com/photo.jpg',
        uploadedBy: techUserA.id,
        uploadedAt: new Date().toISOString()
      }]
    });

    caseWithAtt.attachments![0].maintenanceCaseId = caseWithAtt.id;
    maintenanceRepository.updateCase(caseWithAtt.id, { attachments: caseWithAtt.attachments });

    const deleteRes = await fetch(`${baseUrl}/cases/${caseWithAtt.id}/attachments/att-term-del-1`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(deleteRes.status === 400, 'Test 15: Attachment DELETE on CANCELLED case rejected with 400');
    const deleteBody = await deleteRes.json();
    assert(deleteBody.error.includes('لغو شده یا بسته شده'), 'Test 15: Correct Persian error message on terminal delete');

    // Verify attachment still exists in DB
    const checkCaseAtt = maintenanceRepository.getCaseById(caseWithAtt.id);
    assert(checkCaseAtt?.attachments?.length === 1, 'Test 15: Attachment was preserved in database after rejected deletion');

    // Deletion on CLOSED case
    const caseClosedWithAtt = maintenanceRepository.createCase({
      title: 'Closed Case Deletion Resistance',
      description: 'Testing deletion guard on closed case',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'BATTERY',
      priority: 'LOW',
      status: 'CLOSED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      attachments: [{
        id: 'att-term-del-closed',
        maintenanceCaseId: 'placeholder',
        name: 'closed_photo.jpg',
        type: 'PHOTO',
        storageProvider: 'S3_COMPATIBLE',
        storageKey: 'maintenance/test/closed_photo.jpg',
        url: '/api/cases/placeholder/attachments/att-term-del-closed/download',
        uploadedBy: techUserA.id,
        uploadedAt: new Date().toISOString()
      }]
    });
    caseClosedWithAtt.attachments![0].maintenanceCaseId = caseClosedWithAtt.id;
    maintenanceRepository.updateCase(caseClosedWithAtt.id, { attachments: caseClosedWithAtt.attachments });

    const deleteClosedRes = await fetch(`${baseUrl}/cases/${caseClosedWithAtt.id}/attachments/att-term-del-closed`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(deleteClosedRes.status === 400, 'Test 15: Attachment DELETE on CLOSED case rejected with 400');
    const deleteClosedBody = await deleteClosedRes.json();
    assert(deleteClosedBody.error.includes('لغو شده یا بسته شده'), 'Test 15: Correct Persian error message on closed delete');

    const checkClosedAtt = maintenanceRepository.getCaseById(caseClosedWithAtt.id);
    assert(checkClosedAtt?.attachments?.length === 1, 'Test 15: Attachment was preserved on CLOSED case after rejected deletion');
    assert(deleteObjectCalls === 0, 'Test 15: Zero storage delete operations invoked on terminal deletions');

    // Restore storage methods
    (storageService as any).putObject = origPutObject;
    (storageService as any).deleteObject = origDeleteObject;

    // -------------------------------------------------------------------------
    // TEST 16: ATTACHMENT PRIVACY PROJECTION & METADATA SANITIZATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 16: ATTACHMENT PRIVACY & PROJECTION ON TERMINAL CASES ---');
    const testAttachment = {
      id: 'att-privacy-test-1',
      maintenanceCaseId: 'placeholder',
      name: 'bill_scan.pdf',
      type: 'BILL' as const,
      url: '/private/downloads/secret-bill.pdf',
      data: 'data:application/pdf;base64,SECRET_DATA',
      storageKey: 'private-s3-key-not-for-techs',
      uploadedBy: customerUser.id,
      uploadedAt: new Date().toISOString(),
      sizeBytes: 1024,
      mimeType: 'application/pdf',
      status: 'UPLOADED' as const,
      checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      extractedData: {
        customerPhone: '09123334444',
        customerName: 'محرمانه کارفرما',
        nationalId: '0012345678',
        contactPhone: '09123334444',
        contactName: 'محرمانه کارفرما',
        meterNumber: 'M-12345'
      }
    };

    const casePrivacy = maintenanceRepository.createCase({
      title: 'Attachment Privacy Test Case',
      description: 'Testing technician attachment projection',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'HIGH',
      status: 'CANCELLED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      contactName: 'کارفرما شخصی',
      contactPhone: '09123334444',
      attachments: [testAttachment]
    });

    testAttachment.maintenanceCaseId = casePrivacy.id;
    maintenanceRepository.updateCase(casePrivacy.id, { attachments: [testAttachment] });

    // Tech A queries case details
    const techCaseRes = await fetch(`${baseUrl}/cases/${casePrivacy.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techCaseRes.status === 200, 'Test 16: Tech A can query assigned cancelled case');
    const techCase = await techCaseRes.json();

    assert(techCase.contactPhone === undefined, 'Test 16: Case contactPhone strictly scrubbed');
    assert(techCase.contactName === undefined, 'Test 16: Case contactName strictly scrubbed');

    assert(Array.isArray(techCase.attachments) && techCase.attachments.length === 1, 'Test 16: Attachments array present');
    const projAtt = techCase.attachments[0];
    assert(projAtt.storageKey === undefined, 'Test 16: storageKey strictly scrubbed from technician payload');
    assert(projAtt.data === undefined, 'Test 16: raw data strictly scrubbed from technician payload');
    assert(projAtt.url === undefined, 'Test 16: private download url scrubbed in terminal state');
    assert(projAtt.extractedData?.customerPhone === undefined, 'Test 16: extractedData.customerPhone scrubbed');
    assert(projAtt.extractedData?.customerName === undefined, 'Test 16: extractedData.customerName scrubbed');
    assert(projAtt.extractedData?.nationalId === undefined, 'Test 16: extractedData.nationalId scrubbed');
    assert(projAtt.extractedData?.meterNumber === 'M-12345', 'Test 16: Safe technical audit metadata preserved in extractedData');
    assert(projAtt.name === 'bill_scan.pdf', 'Test 16: Safe attachment name preserved');
    assert(projAtt.status === 'UPLOADED', 'Test 16: Safe attachment status preserved');

    // Tech A queries dedicated attachments endpoint
    const techAttListRes = await fetch(`${baseUrl}/cases/${casePrivacy.id}/attachments`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techAttListRes.status === 200, 'Test 16: GET /cases/:id/attachments returns 200');
    const techAttList = await techAttListRes.json();
    assert(techAttList[0].storageKey === undefined, 'Test 16: GET attachments scrubs storageKey');
    assert(techAttList[0].url === undefined, 'Test 16: GET attachments scrubs url in terminal state');
    assert(techAttList[0].extractedData?.customerPhone === undefined, 'Test 16: GET attachments scrubs customerPhone');

    // Verify underlying database was NOT mutated (projection only)
    const rawDbCase = maintenanceRepository.getCaseById(casePrivacy.id);
    assert(rawDbCase?.attachments?.[0]?.storageKey === 'private-s3-key-not-for-techs', 'Test 16: Database storageKey remains intact on disk');
    assert(rawDbCase?.attachments?.[0]?.extractedData?.customerPhone === '09123334444', 'Test 16: Database customerPhone remains intact on disk');

    // -------------------------------------------------------------------------
    // TEST 17: ATTACHMENT DOWNLOAD ENDPOINT AUTHORIZATION & TERMINAL PRIVACY
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 17: ATTACHMENT DOWNLOAD AUTHORIZATION & PRIVACY ---');
    // Tech A download on CANCELLED case -> 403 Forbidden
    const downloadCancelledRes = await fetch(`${baseUrl}/cases/${casePrivacy.id}/attachments/${testAttachment.id}/download`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(downloadCancelledRes.status === 403, 'Test 17: Technician download on CANCELLED case rejected with 403');
    const downloadCancelledBody = await downloadCancelledRes.json();
    assert(downloadCancelledBody.error.includes('لغو شده یا بسته شده'), 'Test 17: Download returns terminal error message');

    // Tech A download on CLOSED case -> 403 Forbidden
    const closedAtt = { ...testAttachment, id: 'att-closed-dl' };
    const caseClosedDownload = maintenanceRepository.createCase({
      title: 'Closed Download Guard Case',
      description: 'Testing download protection on closed cases',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'LOW',
      status: 'CLOSED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      attachments: [closedAtt]
    });
    closedAtt.maintenanceCaseId = caseClosedDownload.id;
    maintenanceRepository.updateCase(caseClosedDownload.id, { attachments: [closedAtt] });

    const downloadClosedRes = await fetch(`${baseUrl}/cases/${caseClosedDownload.id}/attachments/${closedAtt.id}/download`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(downloadClosedRes.status === 403, 'Test 17: Technician download on CLOSED case rejected with 403');

    // Tech A download on unaccepted ASSIGNED case -> 403 Forbidden
    const unacceptedAtt = { ...testAttachment, id: 'att-unaccepted-dl' };
    const caseUnaccepted = maintenanceRepository.createCase({
      title: 'Unaccepted Download Guard Case',
      description: 'Testing download protection before formal acceptance',
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'asset-test-p2b',
      alertIds: [],
      category: 'INVERTER',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      assignedTechnicianId: techProA.id,
      attachments: [unacceptedAtt]
    });
    unacceptedAtt.maintenanceCaseId = caseUnaccepted.id;
    maintenanceRepository.updateCase(caseUnaccepted.id, { attachments: [unacceptedAtt] });

    const downloadUnacceptedRes = await fetch(`${baseUrl}/cases/${caseUnaccepted.id}/attachments/${unacceptedAtt.id}/download`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(downloadUnacceptedRes.status === 403, 'Test 17: Technician download before formal acceptance rejected with 403');
    const downloadUnacceptedBody = await downloadUnacceptedRes.json();
    assert(downloadUnacceptedBody.error.includes('پذیرش رسمی'), 'Test 17: Download returns acceptance requirement error message');

    // Customer download on CANCELLED case -> Allowed
    const externalAtt = {
      id: 'att-ext-customer-dl',
      maintenanceCaseId: casePrivacy.id,
      name: 'external_diagram.png',
      type: 'PHOTO' as const,
      url: 'https://example.com/files/diagram.png',
      storageProvider: 'EXTERNAL_URL' as const,
      uploadedBy: customerUser.id,
      uploadedAt: new Date().toISOString()
    };
    maintenanceRepository.updateCase(casePrivacy.id, {
      attachments: [...(casePrivacy.attachments || []), externalAtt]
    });

    const downloadCustomerRes = await fetch(`${baseUrl}/cases/${casePrivacy.id}/attachments/${externalAtt.id}/download`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(downloadCustomerRes.status === 200, 'Test 17: Customer retains legitimate access to download their case files');
    const dlBody = await downloadCustomerRes.json();
    assert(dlBody.downloadUrl === 'https://example.com/files/diagram.png', 'Test 17: Customer receives valid download URL');

    // Alternate alias: /maintenance/:caseId/attachments/:attId/download on CANCELLED case
    const downloadCancelledAliasRes = await fetch(`${baseUrl}/maintenance/${casePrivacy.id}/attachments/${testAttachment.id}/download`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(downloadCancelledAliasRes.status === 403, 'Test 17: Alternate alias /maintenance/ rejected with 403 on CANCELLED case');

    // Alternate alias on CLOSED case
    const downloadClosedAliasRes = await fetch(`${baseUrl}/maintenance/${caseClosedDownload.id}/attachments/${closedAtt.id}/download`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(downloadClosedAliasRes.status === 403, 'Test 17: Alternate alias /maintenance/ rejected with 403 on CLOSED case');

    // Alternate alias on unaccepted case
    const downloadUnacceptedAliasRes = await fetch(`${baseUrl}/maintenance/${caseUnaccepted.id}/attachments/${unacceptedAtt.id}/download`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(downloadUnacceptedAliasRes.status === 403, 'Test 17: Alternate alias /maintenance/ rejected with 403 on unaccepted case');

    // Cross-case rejection on alternate alias
    const downloadCrossCaseRes = await fetch(`${baseUrl}/maintenance/${caseClosedDownload.id}/attachments/${testAttachment.id}/download`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(downloadCrossCaseRes.status === 404, 'Test 17: Cross-case attachment access rejected with 404 on alternate alias');

    // Customer download on CANCELLED case via alternate alias -> Allowed
    const downloadCustomerAliasRes = await fetch(`${baseUrl}/maintenance/${casePrivacy.id}/attachments/${externalAtt.id}/download`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(downloadCustomerAliasRes.status === 200, 'Test 17: Customer retains legitimate access via alternate alias /maintenance/...');
    const dlBodyAlias = await downloadCustomerAliasRes.json();
    assert(dlBodyAlias.downloadUrl === 'https://example.com/files/diagram.png', 'Test 17: Customer receives valid download URL via alternate alias');

    // -------------------------------------------------------------------------
    // TEST 18: TARGETED AUTHORIZATION & PRIVACY HARDENING
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 18: TARGETED AUTHORIZATION & PRIVACY HARDENING ---');

    // Setup test project and asset
    const projAuth = projectRepository.create({
      projectCode: 'PRJ-AUTH-001',
      title: 'پروژه تست دسترسی دارایی و پرونده',
      ownerId: customerUser.id,
      projectType: 'SOLAR',
      status: 'OPERATIONAL',
      location: { country: 'ایران', province: 'تهران', city: 'تهران' }
    });

    const assetAuth = assetRepository.createAsset({
      name: 'اینورتر مرکزی پروژه آلفا',
      assetCode: 'AST-AUTH-001',
      assetType: 'SOLAR_PV',
      projectId: projAuth.id,
      installedCapacityKw: 100
    });

    // 1. Create cases on the asset:
    // Case A: Assigned to Tech A
    const caseA = maintenanceRepository.createCase({
      title: 'خرابی ترانسفورماتور اینورتر',
      description: 'افت ولتاژ خروجی اینورتر الف',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'HIGH',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای محرمانه الف',
      contactPhone: '09121111111',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });

    // Case B: Assigned to Tech B
    const caseB = maintenanceRepository.createCase({
      title: 'تعویض فن خنک‌کننده',
      description: 'افزایش دمای داخلی اینورتر ب',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای محرمانه ب',
      contactPhone: '09122222222',
      assignedTechnicianId: techProB.id,
      assignedTechnicianName: techProB.fullName,
      assignedTechnicianPhone: techProB.phone
    });

    // Case Open: Unassigned
    const caseOpen = maintenanceRepository.createCase({
      title: 'سرویس فصلی فیلتر گرد و غبار',
      description: 'سرویس پیشگیرانه فصلی',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'LOW',
      status: 'OPEN',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای عمومی',
      contactPhone: '09123333333'
    });

    // Subtest 18.1: GET /assets/:assetId/maintenance
    // Tech A queries asset maintenance cases:
    const techARes = await fetch(`${baseUrl}/assets/${assetAuth.id}/maintenance`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techARes.status === 200, 'Test 18.1: Assigned Tech A accesses asset maintenance with HTTP 200');
    const techACases = await techARes.json();
    assert(Array.isArray(techACases) && techACases.length === 1, 'Test 18.1: Tech A sees strictly ONLY their 1 assigned case');
    assert(techACases[0].id === caseA.id, 'Test 18.1: Returned case matches Tech A assigned case');
    assert(techACases[0].contactPhone === undefined, 'Test 18.1: Customer contactPhone strictly sanitized in asset route');
    assert(techACases[0].contactName === undefined, 'Test 18.1: Customer contactName strictly sanitized in asset route');
    assert(!techACases.some((c: any) => c.id === caseB.id), 'Test 18.1: Case assigned to Tech B strictly excluded for Tech A');
    assert(!techACases.some((c: any) => c.id === caseOpen.id), 'Test 18.1: Unassigned case strictly excluded for Tech A');

    // Tech B queries asset maintenance cases:
    const techBRes = await fetch(`${baseUrl}/assets/${assetAuth.id}/maintenance`, {
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(techBRes.status === 200, 'Test 18.1: Assigned Tech B accesses asset maintenance with HTTP 200');
    const techBCases = await techBRes.json();
    assert(Array.isArray(techBCases) && techBCases.length === 1, 'Test 18.1: Tech B sees strictly ONLY their 1 assigned case');
    assert(techBCases[0].id === caseB.id, 'Test 18.1: Returned case matches Tech B assigned case');
    assert(techBCases[0].contactPhone === undefined, 'Test 18.1: Customer contactPhone strictly sanitized for Tech B');
    assert(!techBCases.some((c: any) => c.id === caseA.id), 'Test 18.1: Case assigned to Tech A strictly excluded for Tech B');

    // Stranger Tech C queries asset maintenance cases:
    const techCRes = await fetch(`${baseUrl}/assets/${assetAuth.id}/maintenance`, {
      headers: { 'Authorization': `Bearer ${techTokenC}` }
    });
    assert(techCRes.status === 403, 'Test 18.1: Stranger Tech C with no assigned cases rejected with HTTP 403');

    // Customer / Project Owner queries asset maintenance cases:
    const custAssetRes = await fetch(`${baseUrl}/assets/${assetAuth.id}/maintenance`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(custAssetRes.status === 200, 'Test 18.1: Project Owner accesses asset maintenance with HTTP 200');
    const custAssetCases = await custAssetRes.json();
    assert(custAssetCases.length === 3, 'Test 18.1: Project Owner sees all 3 cases for their asset');
    const foundCaseA = custAssetCases.find((c: any) => c.id === caseA.id);
    assert(foundCaseA?.contactPhone === '09121111111', 'Test 18.1: Project Owner retains legitimate unmasked contact info');

    // Admin queries asset maintenance cases:
    const adminAssetRes = await fetch(`${baseUrl}/assets/${assetAuth.id}/maintenance`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminAssetRes.status === 200, 'Test 18.1: Admin accesses asset maintenance with HTTP 200');
    const adminAssetCases = await adminAssetRes.json();
    assert(adminAssetCases.length === 3, 'Test 18.1: Admin sees all 3 cases for the asset');

    // Non-existent asset ID:
    const notFoundAssetRes = await fetch(`${baseUrl}/assets/asset-non-existent-999/maintenance`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(notFoundAssetRes.status === 404, 'Test 18.1: Non-existent asset returns HTTP 404');

    // Subtest 18.2: PATCH /cases/:id Separation of View & Edit permissions
    // Tech A has VIEW permission to caseA, but MUST NOT have EDIT permission:
    const techPatchRes = await fetch(`${baseUrl}/cases/${caseA.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'دستکاری عنوان توسط تکنسین غیرمجاز' })
    });
    assert(techPatchRes.status === 403, 'Test 18.2: Assigned Tech A PATCH rejected with HTTP 403 (view != edit permission)');
    const techPatchErr = await techPatchRes.json();
    assert(techPatchErr.error.includes('تنها ثبت‌کننده پرونده یا مدیر سامانه'), 'Test 18.2: Correct Persian authorization error message on PATCH');

    // Stored DB record remains unmutated:
    const checkCaseAUnchanged = maintenanceRepository.getCaseById(caseA.id);
    assert(checkCaseAUnchanged?.title === 'خرابی ترانسفورماتور اینورتر', 'Test 18.2: Case title remained unmodified in database after rejected PATCH');

    // Unassigned Tech B attempts to PATCH caseA:
    const strangerPatchRes = await fetch(`${baseUrl}/cases/${caseA.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${techTokenB}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'تلاش تکنسین ب برای ویرایش پرونده تکنسین الف' })
    });
    assert(strangerPatchRes.status === 403, 'Test 18.2: Stranger Tech B PATCH rejected with HTTP 403');

    // Customer (reporter) legitimately PATCHes caseA:
    const custPatchRes = await fetch(`${baseUrl}/cases/${caseA.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title: 'ویرایش مجاز عنوان توسط کارفرما' })
    });
    assert(custPatchRes.status === 200, 'Test 18.2: Customer reporter successfully PATCHes case (HTTP 200)');
    const checkCaseAUpdated = maintenanceRepository.getCaseById(caseA.id);
    assert(checkCaseAUpdated?.title === 'ویرایش مجاز عنوان توسط کارفرما', 'Test 18.2: Case title successfully updated by reporter in DB');

    // Admin legitimately PATCHes caseA:
    const adminPatchRes = await fetch(`${baseUrl}/cases/${caseA.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ priority: 'URGENT' })
    });
    assert(adminPatchRes.status === 200, 'Test 18.2: Admin successfully PATCHes case (HTTP 200)');
    const checkCaseAPriority = maintenanceRepository.getCaseById(caseA.id);
    assert(checkCaseAPriority?.priority === 'URGENT', 'Test 18.2: Priority successfully updated by admin in DB');

    // Subtest 18.3: GET /assets/:assetId/maintenance-history technician restriction
    const techHistoryRes = await fetch(`${baseUrl}/assets/${assetAuth.id}/maintenance-history`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techHistoryRes.status === 403, 'Test 18.3: Technician rejected from full asset maintenance history with HTTP 403');

    const custHistoryRes = await fetch(`${baseUrl}/assets/${assetAuth.id}/maintenance-history`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(custHistoryRes.status === 200, 'Test 18.3: Project Owner accesses asset maintenance history with HTTP 200');

    // Subtest 18.4: GET /cases/:id/technician-matches technician restriction
    const techMatchRes = await fetch(`${baseUrl}/cases/${caseA.id}/technician-matches`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techMatchRes.status === 403, 'Test 18.4: Assigned Tech A rejected from case technician matches with HTTP 403');

    const custMatchRes = await fetch(`${baseUrl}/cases/${caseA.id}/technician-matches`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(custMatchRes.status === 200, 'Test 18.4: Customer reporter accesses case technician matches with HTTP 200');

    // Subtest 18.5: Attachment Deletion Ownership Isolation
    // Add customer-owned attachment to caseA
    const custAtt: any = {
      id: 'att-cust-ownership-test',
      maintenanceCaseId: caseA.id,
      name: 'customer_site_map.pdf',
      type: 'DOCUMENT',
      url: 'https://example.com/map.pdf',
      storageProvider: 'EXTERNAL_URL',
      uploadedBy: customerUser.id,
      uploadedAt: new Date().toISOString()
    };
    maintenanceRepository.updateCase(caseA.id, {
      attachments: [...(checkCaseAPriority?.attachments || []), custAtt]
    });

    // Tech A attempts to delete customer-uploaded attachment:
    const techDelAttRes = await fetch(`${baseUrl}/cases/${caseA.id}/attachments/${custAtt.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techDelAttRes.status === 403, 'Test 18.5: Tech A rejected with HTTP 403 deleting customer-uploaded attachment');
    const caseAfterRejectedDel = maintenanceRepository.getCaseById(caseA.id);
    assert(caseAfterRejectedDel?.attachments?.some((a: any) => a.id === custAtt.id), 'Test 18.5: Attachment preserved intact in database');

    // Customer deletes their own attachment:
    const custDelAttRes = await fetch(`${baseUrl}/cases/${caseA.id}/attachments/${custAtt.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(custDelAttRes.status === 200, 'Test 18.5: Customer successfully deletes their own attachment (HTTP 200)');
    const caseAfterCustDel = maintenanceRepository.getCaseById(caseA.id);
    assert(!caseAfterCustDel?.attachments?.some((a: any) => a.id === custAtt.id), 'Test 18.5: Attachment removed from database by owner');

    // Subtest 18.6: POST /actions Formal Acceptance Barrier
    // caseB is ASSIGNED to Tech B, but Tech B has NOT formally accepted it yet:
    const techBActionRes = await fetch(`${baseUrl}/cases/${caseB.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenB}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام پیش از پذیرش رسمی'
      })
    });
    assert(techBActionRes.status === 403, 'Test 18.6: POST /actions rejected with HTTP 403 before formal acceptance');
    const dbActionsCaseB = maintenanceRepository.getActions(caseB.id);
    assert(dbActionsCaseB.length === 0, 'Test 18.6: Zero actions persisted in database when rejected before acceptance');

    // -------------------------------------------------------------------------
    // Subtest 18.7: Defect A — Alert Detail Privacy (GET /alerts/:alertId)
    // -------------------------------------------------------------------------
    console.log('\n--- SUBTEST 18.7: DEFECT A — ALERT DETAIL PRIVACY (GET /alerts/:alertId) ---');

    // Setup viewer user (project member with VIEWER role, not reporter, not technician, not admin)
    const viewerUser = userRepository.createUser({
      name: 'مهندس ناظر پروژه',
      email: 'viewer.alert@example.com',
      role: 'viewer'
    });
    const viewerToken = jwtService.sign({ userId: viewerUser.id, role: 'viewer' });
    projectRepository.addMember({
      projectId: projAuth.id,
      userId: viewerUser.id,
      role: 'VIEWER' as any,
      status: 'ACTIVE' as any
    });
    projectRepository.addMember({
      projectId: projAuth.id,
      userId: techUserA.id,
      role: 'CONTRACTOR' as any,
      status: 'ACTIVE' as any
    });
    projectRepository.addMember({
      projectId: projAuth.id,
      userId: techUserB.id,
      role: 'CONTRACTOR' as any,
      status: 'ACTIVE' as any
    });

    // Unrelated customer (not a member of projAuth)
    const unrelatedCust = userRepository.createUser({
      name: 'کارفرمای پروژه دیگر',
      email: 'unrelated.cust@example.com',
      role: 'customer'
    });
    const unrelatedCustToken = jwtService.sign({ userId: unrelatedCust.id, role: 'customer' });

    // 1. Alert linked to caseA (active, assigned to Tech A, reported by customerUser)
    const alertLinkedA = maintenanceRepository.createAlert({
      projectId: projAuth.id,
      assetId: assetAuth.id,
      severity: 'HIGH',
      status: 'OPEN',
      title: 'دمای بالای اینورتر الف',
      description: 'افزایش دمای ماژول قدرت اینورتر',
      maintenanceCaseId: caseA.id
    });

    // 2. Alert with no linked case
    const alertNoCase = maintenanceRepository.createAlert({
      projectId: projAuth.id,
      assetId: assetAuth.id,
      severity: 'INFO',
      status: 'OPEN',
      title: 'هشدار ولتاژ جزئی',
      description: 'نوسان ولتاژ ورودی'
    });

    // Test A1: Authorized administrator viewing linked case
    const adminAlertRes = await fetch(`${baseUrl}/alerts/${alertLinkedA.id}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminAlertRes.status === 200, 'Test 18.7.1: Authorized admin retrieves alert with HTTP 200');
    const adminAlertData = await adminAlertRes.json();
    assert(adminAlertData.maintenanceCase !== null && adminAlertData.maintenanceCase.id === caseA.id, 'Test 18.7.1: Admin receives full linked maintenanceCase');
    assert(adminAlertData.maintenanceCase.contactPhone === '09121111111', 'Test 18.7.1: Admin retains legitimate access to contactPhone');

    // Test A2: Authorized reporter viewing their own case
    const reporterAlertRes = await fetch(`${baseUrl}/alerts/${alertLinkedA.id}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(reporterAlertRes.status === 200, 'Test 18.7.2: Authorized reporter retrieves alert with HTTP 200');
    const reporterAlertData = await reporterAlertRes.json();
    assert(reporterAlertData.maintenanceCase !== null && reporterAlertData.maintenanceCase.id === caseA.id, 'Test 18.7.2: Reporter receives full linked maintenanceCase');
    assert(reporterAlertData.maintenanceCase.contactPhone === '09121111111', 'Test 18.7.2: Reporter retains legitimate access to contactPhone');

    // Test A3: Assigned technician BEFORE formal acceptance
    const techPreAcceptAlertRes = await fetch(`${baseUrl}/alerts/${alertLinkedA.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techPreAcceptAlertRes.status === 200, 'Test 18.7.3: Assigned Tech A retrieves alert with HTTP 200');
    const techPreAcceptData = await techPreAcceptAlertRes.json();
    assert(techPreAcceptData.maintenanceCase !== null && techPreAcceptData.maintenanceCase.id === caseA.id, 'Test 18.7.3: Tech A receives linked case object');
    assert(techPreAcceptData.maintenanceCase.contactPhone === undefined, 'Test 18.7.3: Pre-acceptance contactPhone strictly scrubbed from alert response');
    assert(techPreAcceptData.maintenanceCase.contactName === undefined, 'Test 18.7.3: Pre-acceptance contactName strictly scrubbed from alert response');
    assert(!techPreAcceptData.maintenanceCase.attachments?.some((a: any) => a.storageKey || a.data || a.url), 'Test 18.7.3: Attachment storageKey and URL scrubbed for pre-acceptance technician');

    // Test A4: Assigned technician AFTER formal acceptance
    // Tech A accepts caseA:
    await fetch(`${baseUrl}/cases/${caseA.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    const techPostAcceptAlertRes = await fetch(`${baseUrl}/alerts/${alertLinkedA.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techPostAcceptAlertRes.status === 200, 'Test 18.7.4: Assigned Tech A retrieves alert after acceptance with HTTP 200');
    const techPostAcceptData = await techPostAcceptAlertRes.json();
    assert(techPostAcceptData.maintenanceCase !== null && techPostAcceptData.maintenanceCase.id === caseA.id, 'Test 18.7.4: Tech A receives linked case after acceptance');
    assert(techPostAcceptData.maintenanceCase.contactPhone === '09121111111', 'Test 18.7.4: Contact phone legitimately released after formal acceptance');

    // Test A5: Assigned technician after cancellation or closure
    const caseTerminalForAlert = maintenanceRepository.createCase({
      title: 'پرونده لغو شده متصل به هشدار',
      description: 'پرونده با سابقه پذیرش اما لغو شده',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'MEDIUM',
      status: 'CANCELLED',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای محرمانه پایانه',
      contactPhone: '09127777777',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });
    // Record past accepted history in caseTerminalForAlert
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseTerminalForAlert.id,
      technicianId: techProA.id,
      assignedBy: customerUser.id,
      status: 'ACCEPTED',
      notes: 'پذیرش قبلی'
    });
    const alertTerminal = maintenanceRepository.createAlert({
      projectId: projAuth.id,
      assetId: assetAuth.id,
      severity: 'WARNING',
      status: 'RESOLVED',
      title: 'هشدار پرونده لغو شده',
      description: 'هشدار تست پرونده لغو شده',
      maintenanceCaseId: caseTerminalForAlert.id
    });
    const techTerminalAlertRes = await fetch(`${baseUrl}/alerts/${alertTerminal.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });
    assert(techTerminalAlertRes.status === 200, 'Test 18.7.5: Tech A retrieves terminal alert with HTTP 200');
    const techTerminalData = await techTerminalAlertRes.json();
    assert(techTerminalData.maintenanceCase !== null, 'Test 18.7.5: Tech receives terminal case record');
    assert(techTerminalData.maintenanceCase.contactPhone === undefined, 'Test 18.7.5: Contact phone strictly scrubbed on terminal case even with past acceptance');
    assert(techTerminalData.maintenanceCase.contactName === undefined, 'Test 18.7.5: Contact name strictly scrubbed on terminal case');

    // Test A6: Project viewer with alert access but NO case-specific rights
    const viewerAlertRes = await fetch(`${baseUrl}/alerts/${alertLinkedA.id}`, {
      headers: { 'Authorization': `Bearer ${viewerToken}` }
    });
    assert(viewerAlertRes.status === 200, 'Test 18.7.6: Project viewer accesses alert with HTTP 200');
    const viewerAlertData = await viewerAlertRes.json();
    assert(viewerAlertData.maintenanceCase === null, 'Test 18.7.6: Project viewer receives maintenanceCase: null (case suppressed)');
    const viewerRawStr = JSON.stringify(viewerAlertData);
    assert(!viewerRawStr.includes('09121111111'), 'Test 18.7.6: Denied case access reveals zero customer phone data');
    assert(!viewerRawStr.includes('کارفرمای محرمانه الف'), 'Test 18.7.6: Denied case access reveals zero customer identity');
    assert(!viewerRawStr.includes('storageKey'), 'Test 18.7.6: Denied case access reveals zero storage key');

    // Test A7: Technician assigned to another case (Tech B accessing alert linked to caseA)
    const techBOtherAlertRes = await fetch(`${baseUrl}/alerts/${alertLinkedA.id}`, {
      headers: { 'Authorization': `Bearer ${techTokenB}` }
    });
    assert(techBOtherAlertRes.status === 200, 'Test 18.7.7: Tech B queries alert with HTTP 200');
    const techBOtherAlertData = await techBOtherAlertRes.json();
    assert(techBOtherAlertData.maintenanceCase === null, 'Test 18.7.7: Unassigned Tech B receives maintenanceCase: null');
    const techBRawStr = JSON.stringify(techBOtherAlertData);
    assert(!techBRawStr.includes('09121111111'), 'Test 18.7.7: Unassigned Tech B receives zero customer phone data');
    assert(!techBRawStr.includes('customer_site_map.pdf'), 'Test 18.7.7: Unassigned Tech B receives zero attachment names/URLs');

    // Test A8: Alert with no linked case
    const alertNoCaseRes = await fetch(`${baseUrl}/alerts/${alertNoCase.id}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(alertNoCaseRes.status === 200, 'Test 18.7.8: Alert with no linked case returns HTTP 200');
    const alertNoCaseData = await alertNoCaseRes.json();
    assert(alertNoCaseData.maintenanceCase === null, 'Test 18.7.8: maintenanceCase is null when alert has no linked case');

    // -------------------------------------------------------------------------
    // Subtest 18.8: Defect B — Scheduling Permission Escalation
    // -------------------------------------------------------------------------
    console.log('\n--- SUBTEST 18.8: DEFECT B — SCHEDULING PERMISSION ESCALATION ---');

    // Create fresh test cases for scheduling
    const schedCaseReporter = maintenanceRepository.createCase({
      title: 'پرونده زمان‌بندی کارفرما',
      description: 'تست زمان‌بندی توسط ثبت‌کننده',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای محترم',
      contactPhone: '09121111111',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });

    const schedCaseAdmin = maintenanceRepository.createCase({
      title: 'پرونده زمان‌بندی ادمین',
      description: 'تست زمان‌بندی توسط مدیر سامانه',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'HIGH',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای محترم',
      contactPhone: '09121111111',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });

    const schedCaseTech = maintenanceRepository.createCase({
      title: 'پرونده زمان‌بندی تکنسین',
      description: 'تست چرخه زمان‌بندی تکنسین',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای محترم',
      contactPhone: '09121111111',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });

    // 1. Reporter scheduling succeeds
    const reporterSchedRes = await fetch(`${baseUrl}/cases/${schedCaseReporter.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-20T10:00:00Z' })
    });
    assert(reporterSchedRes.status === 200, 'Test 18.8.1: Reporter scheduling succeeds with HTTP 200');
    const dbSchedReporter = maintenanceRepository.getCaseById(schedCaseReporter.id);
    assert(dbSchedReporter?.status === 'SCHEDULED', 'Test 18.8.1: Case status transitioned to SCHEDULED by reporter');
    assert(dbSchedReporter?.scheduledAt === '2026-11-20T10:00:00Z', 'Test 18.8.1: Case scheduledAt persisted by reporter');

    // 2. Administrator scheduling succeeds
    const adminSchedRes = await fetch(`${baseUrl}/maintenance/${schedCaseAdmin.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-22T14:00:00Z' })
    });
    assert(adminSchedRes.status === 200, 'Test 18.8.2: Administrator scheduling succeeds with HTTP 200');
    const dbSchedAdmin = maintenanceRepository.getCaseById(schedCaseAdmin.id);
    assert(dbSchedAdmin?.status === 'SCHEDULED', 'Test 18.8.2: Case status transitioned to SCHEDULED by admin');
    assert(dbSchedAdmin?.scheduledAt === '2026-11-22T14:00:00Z', 'Test 18.8.2: Case scheduledAt persisted by admin');

    // 3. Assigned technician follows intended acceptance policy:
    // 3a. Pre-acceptance schedule succeeds and masks contact info
    const techPreAcceptSchedRes = await fetch(`${baseUrl}/cases/${schedCaseTech.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-25T08:00:00Z' })
    });
    assert(techPreAcceptSchedRes.status === 200, 'Test 18.8.3: Assigned Tech A pre-acceptance schedule succeeds with HTTP 200');
    const techPreAcceptSchedData = await techPreAcceptSchedRes.json();
    assert(techPreAcceptSchedData.status === 'SCHEDULED', 'Test 18.8.3: Pre-acceptance case status is SCHEDULED');
    assert(techPreAcceptSchedData.contactPhone === undefined, 'Test 18.8.3: Pre-acceptance schedule response masks contactPhone');
    assert(techPreAcceptSchedData.contactName === undefined, 'Test 18.8.3: Pre-acceptance schedule response masks contactName');

    // 3b. Formal acceptance transitions to IN_PROGRESS
    await fetch(`${baseUrl}/cases/${schedCaseTech.id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}` }
    });

    // 3c. Post-acceptance appointment update on IN_PROGRESS case
    const techPostAcceptSchedRes = await fetch(`${baseUrl}/cases/${schedCaseTech.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-26T09:30:00Z' })
    });
    assert(techPostAcceptSchedRes.status === 200, 'Test 18.8.3: Assigned Tech A post-acceptance appointment update succeeds (HTTP 200)');
    const techPostAcceptSchedData = await techPostAcceptSchedRes.json();
    assert(techPostAcceptSchedData.status === 'IN_PROGRESS', 'Test 18.8.3: Case remains IN_PROGRESS after appointment update');
    assert(techPostAcceptSchedData.scheduledAt === '2026-11-26T09:30:00Z', 'Test 18.8.3: Updated scheduledAt persisted');
    assert(techPostAcceptSchedData.contactPhone === '09121111111', 'Test 18.8.3: Contact phone legitimately released in response after acceptance');

    // Target case for negative scheduling tests
    const schedTargetCase = maintenanceRepository.createCase({
      title: 'پرونده هدف برای آزمون‌های رد دسترسی زمان‌بندی',
      description: 'پرونده با تکنسین الف جهت تست رد دسترسی',
      projectId: projAuth.id,
      assetId: assetAuth.id,
      alertIds: [],
      category: 'INVERTER',
      priority: 'LOW',
      status: 'ASSIGNED',
      reportedBy: customerUser.id,
      contactName: 'کارفرمای محترم',
      contactPhone: '09121111111',
      assignedTechnicianId: techProA.id,
      assignedTechnicianName: techProA.fullName,
      assignedTechnicianPhone: techProA.phone
    });

    // Capture DB baseline before denied scheduling attempts
    const dbBeforeDenials = maintenanceRepository.getCaseById(schedTargetCase.id);
    const historiesBeforeDenials = maintenanceRepository.getAssignmentHistories(schedTargetCase.id).length;

    // 4. Unassigned technician receives HTTP 403
    const unassignedTechSchedRes = await fetch(`${baseUrl}/cases/${schedTargetCase.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${techTokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-27T10:00:00Z' })
    });
    assert(unassignedTechSchedRes.status === 403, 'Test 18.8.4: Unassigned technician receives HTTP 403 attempting to schedule');

    // 5. Unrelated project viewer receives HTTP 403
    const viewerSchedRes = await fetch(`${baseUrl}/cases/${schedTargetCase.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${viewerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-27T10:00:00Z' })
    });
    assert(viewerSchedRes.status === 403, 'Test 18.8.5: Unrelated project viewer receives HTTP 403 attempting to schedule');

    // 6. An unrelated customer receives HTTP 403
    const unrelatedCustSchedRes = await fetch(`${baseUrl}/cases/${schedTargetCase.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${unrelatedCustToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-27T10:00:00Z' })
    });
    assert(unrelatedCustSchedRes.status === 403, 'Test 18.8.6: Unrelated customer receives HTTP 403 attempting to schedule');

    // 7. Terminal-case scheduling is rejected
    const schedTerminalRes = await fetch(`${baseUrl}/cases/${caseTerminalForAlert.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-28T10:00:00Z' })
    });
    assert(schedTerminalRes.status === 400, 'Test 18.8.7: Scheduling on terminal (CANCELLED) case rejected with HTTP 400');

    // 8. Both route aliases have identical authorization behavior
    const aliasViewerRes = await fetch(`${baseUrl}/maintenance/${schedTargetCase.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${viewerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-27T10:00:00Z' })
    });
    assert(aliasViewerRes.status === 403, 'Test 18.8.8: Alternate alias /maintenance/:id/schedule rejects project viewer with HTTP 403');

    const aliasTerminalRes = await fetch(`${baseUrl}/maintenance/${caseTerminalForAlert.id}/schedule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: '2026-11-28T10:00:00Z' })
    });
    assert(aliasTerminalRes.status === 400, 'Test 18.8.8: Alternate alias /maintenance/:id/schedule rejects terminal case with HTTP 400');

    // 9. Denied requests cause ZERO persisted changes
    const dbAfterDenials = maintenanceRepository.getCaseById(schedTargetCase.id);
    const historiesAfterDenials = maintenanceRepository.getAssignmentHistories(schedTargetCase.id).length;
    assert(dbAfterDenials?.status === dbBeforeDenials?.status, 'Test 18.8.9: Zero status modification on denied scheduling attempts');
    assert(dbAfterDenials?.scheduledAt === dbBeforeDenials?.scheduledAt, 'Test 18.8.9: Zero scheduledAt modification on denied scheduling attempts');
    assert(dbAfterDenials?.scheduledDate === dbBeforeDenials?.scheduledDate, 'Test 18.8.9: Zero scheduledDate modification on denied scheduling attempts');
    assert(historiesAfterDenials === historiesBeforeDenials, 'Test 18.8.9: Zero new assignment histories generated on denied scheduling attempts');

    // -------------------------------------------------------------------------
    // TEST 10: ZERO DATABASE MUTATIONS DURING AUDIT (STRICT READ-ONLY)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: RECONCILIATION AUDIT READ-ONLY INVARIANT ---');
    const rawBeforeAudit = fs.readFileSync(tempDbPath, 'utf-8');
    await fetch(`${baseUrl}/admin/maintenance/reconciliation-audit`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const rawAfterAudit = fs.readFileSync(tempDbPath, 'utf-8');
    assert(rawBeforeAudit === rawAfterAudit, 'Test 10: Reconciliation audit caused exactly 0 bytes database modification');

    // -------------------------------------------------------------------------
    // TEST 11: REPOSITORY DB.JSON IMMUTABILITY GUARD
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: REPOSITORY IMMUTABILITY GUARD ---');
    isolation.verifyImmutability();
    assert(true, 'Test 11: Repository db.json byte-for-byte identical to baseline');

    await new Promise<void>((resolve) => server.close(() => resolve()));

    console.log('\n================================================================');
    console.log(`STAGE F.5 PHASE 2B TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

  } catch (err) {
    console.error('\nTest execution failed:', err);
    process.exit(1);
  } finally {
    isolation.cleanup();
  }
}

runTestSuite();
