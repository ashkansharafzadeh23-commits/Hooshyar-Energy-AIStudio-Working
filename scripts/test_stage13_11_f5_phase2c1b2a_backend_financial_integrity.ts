/**
 * ============================================================================
 * STAGE 13.11-F.5 PHASE 2C-1B-2A DEDICATED REGRESSION TEST SUITE
 * Backend Financial Integrity, Technician Action Data Preservation &
 * Verification Lifecycle Safety
 * ============================================================================
 *
 * Covers:
 * Section A: Technician action fields (hoursSpent, partsReplaced, totalLaborHours, legacy actions)
 * Section B: Idempotency (replay, conflicts, cross-actor, legitimate unkeyed)
 * Section C: Financial integrity (cumulative overwrite, zero, omitted, validation, overflow, stored corruption, spare parts)
 * Section D: Verification lifecycle (authorized submission, acceptance barrier, unauthorized, reassignment, terminal state, failure injection)
 * Section E: Financial PATCH security (prohibited fields, status defense, terminal state protection, valid fields)
 * Section F: Database integrity & isolation (temporary isolated DB, canonical db.json immutability)
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
  console.log('STAGE 13.11-F.5 PHASE 2C-1B-2A: BACKEND FINANCIAL INTEGRITY TESTS');
  console.log('================================================================\n');

  const isolation = setupTestDatabaseIsolation('stage13_11_f5_phase2c1b2a');
  let server: http.Server | null = null;
  let testError: any = null;

  try {
    const { db } = await import('../src/db/index.js');
    const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
    const {
      maintenanceCaseService,
      validateActionLaborHours,
      validatePartsReplaced,
      calculateRecordedPartsCost,
      validateSparePartItem,
      validateCaseFinancialConsistency
    } = await import('../src/services/maintenanceCaseService.js');
    const { professionalRepository } = await import('../src/repositories/professionalRepository.js');
    const { projectRepository } = await import('../src/repositories/projectRepository.js');
    const { userRepository } = await import('../src/repositories/userRepository.js');
    const { jwtService } = await import('../src/security/jwtService.js');
    const { maintenanceRouter, hasTechnicianFormallyAccepted } = await import('../src/api/maintenance.js');

    // -------------------------------------------------------------------------
    // SETUP TEST ACTORS
    // -------------------------------------------------------------------------
    const customerUser = userRepository.createUser({
      name: 'کارفرمای آزمایشی فاز 2C-1B-2A',
      email: 'customer.phase2c1b2a@example.com',
      role: 'customer',
      phone: '09121110099'
    });

    const adminUser = userRepository.createUser({
      name: 'مدیر کل آزمایشی',
      email: 'admin.phase2c1b2a@example.com',
      role: 'admin',
      phone: '09129990099'
    });

    const techUserA = userRepository.createUser({
      name: 'تکنسین الف آزمایشی',
      email: 'techa.phase2c1b2a@example.com',
      role: 'technician',
      phone: '09123330099'
    });
    professionalRepository.createProfessional({
      userId: techUserA.id,
      fullName: 'مهندس تکنسین الف آزمایشی',
      phone: '09123330099',
      specialties: ['INVERTER', 'GENERATOR'],
      serviceCities: ['تهران'],
      status: 'approved',
      approvalStatus: 'APPROVED'
    });

    const techUserB = userRepository.createUser({
      name: 'تکنسین ب آزمایشی',
      email: 'techb.phase2c1b2a@example.com',
      role: 'technician',
      phone: '09124440099'
    });
    professionalRepository.createProfessional({
      userId: techUserB.id,
      fullName: 'مهندس تکنسین ب آزمایشی',
      phone: '09124440099',
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

    // Start Express server on ephemeral port
    const app = express();
    app.use(express.json());
    app.use('/api', maintenanceRouter);
    app.use(maintenanceRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, () => resolve()));
    const port = (server!.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    // Helper to create an accepted IN_PROGRESS case for techUserA
    function createAcceptedCase(title: string, options: { sparePartsCost?: number; initialLaborCost?: number; initialPartsCost?: number } = {}): any {
      const c = maintenanceRepository.createCase({
        projectId: 'CUSTOMER_DIRECT',
        assetId: 'UNREGISTERED',
        equipmentType: 'PORTABLE_GENERATOR',
        title,
        description: 'شرح عیب مورد آزمایش فاز 2C-1B-2A',
        priority: 'HIGH',
        status: 'ASSIGNED',
        assignedTechnicianId: techUserA.id,
        assignedTechnicianName: 'تکنسین الف آزمایشی',
        assignedTechnicianPhone: '09123330099',
        contactName: 'کارفرمای آزمایشی',
        contactPhone: '09121110099',
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
        notes: 'تخصیص به تکنسین الف'
      });
      maintenanceRepository.createAssignmentHistory({
        maintenanceCaseId: c.id,
        technicianId: techUserA.id,
        assignedBy: techUserA.id,
        status: 'ACCEPTED',
        notes: 'پذیرش رسمی پرونده'
      });

      const updateData: any = { status: 'IN_PROGRESS' };
      if (options.sparePartsCost !== undefined && options.sparePartsCost > 0) {
        updateData.sparePartsUsed = [
          {
            partName: 'برد کنترلر اصلی',
            quantity: 1,
            costIrr: options.sparePartsCost
          }
        ];
      }
      if (options.initialLaborCost !== undefined) {
        updateData.laborCost = options.initialLaborCost;
      }
      if (options.initialPartsCost !== undefined) {
        updateData.partsCost = options.initialPartsCost;
      }
      if (options.initialLaborCost !== undefined || options.initialPartsCost !== undefined) {
        const total = (options.initialLaborCost || 0) + (options.initialPartsCost || 0);
        updateData.totalCost = total;
        updateData.totalCostIrr = total;
      }

      maintenanceRepository.updateCase(c.id, updateData);
      return maintenanceRepository.getCaseById(c.id)!;
    }

    // =========================================================================
    // SECTION A: TECHNICIAN ACTION FIELDS
    // =========================================================================
    console.log('\n--- SECTION A: TECHNICIAN ACTION FIELDS ---');

    // A.1: Unit validation for validateActionLaborHours
    assert(validateActionLaborHours(2.5) === 2.5, 'A.1.1: validateActionLaborHours accepts valid fractional hours (2.5)');
    assert(validateActionLaborHours(0.5) === 0.5, 'A.1.2: validateActionLaborHours accepts valid fractional hours (0.5)');
    assert(validateActionLaborHours('3.75') === 3.75, 'A.1.3: validateActionLaborHours accepts valid string hours ("3.75")');
    assert(validateActionLaborHours(0) === 0, 'A.1.4: validateActionLaborHours accepts zero hours');

    let threw = false;
    try { validateActionLaborHours(-1); } catch { threw = true; }
    assert(threw, 'A.2.1: validateActionLaborHours rejects negative hours (-1)');

    threw = false;
    try { validateActionLaborHours('invalid'); } catch { threw = true; }
    assert(threw, 'A.2.2: validateActionLaborHours rejects non-numeric string');

    threw = false;
    try { validateActionLaborHours(Infinity); } catch { threw = true; }
    assert(threw, 'A.2.3: validateActionLaborHours rejects Infinity');

    threw = false;
    try { validateActionLaborHours(1001); } catch { threw = true; }
    assert(threw, 'A.2.4: validateActionLaborHours rejects hours > 1000');

    threw = false;
    try { validateActionLaborHours(null); } catch { threw = true; }
    assert(threw, 'A.3.1: validateActionLaborHours rejects explicit null');

    threw = false;
    try { validateActionLaborHours(true); } catch { threw = true; }
    assert(threw, 'A.3.2: validateActionLaborHours rejects boolean');

    threw = false;
    try { validateActionLaborHours({}); } catch { threw = true; }
    assert(threw, 'A.3.3: validateActionLaborHours rejects object');

    // Unit validation for validatePartsReplaced
    const validParts = validatePartsReplaced(['فن خنک‌کننده ۱۲ ولت', 'فیوز دی‌سی ۱۰۰ آمپر']);
    assert(validParts.length === 2 && validParts[0] === 'فن خنک‌کننده ۱۲ ولت', 'A.4.1: validatePartsReplaced accepts valid string array');

    threw = false;
    try { validatePartsReplaced(null); } catch { threw = true; }
    assert(threw, 'A.5.1: validatePartsReplaced rejects null');

    threw = false;
    try { validatePartsReplaced('فن اینورتر'); } catch { threw = true; }
    assert(threw, 'A.5.2: validatePartsReplaced rejects non-array string');

    threw = false;
    try { validatePartsReplaced(['  ']); } catch { threw = true; }
    assert(threw, 'A.5.3: validatePartsReplaced rejects whitespace-only part name');

    threw = false;
    try { validatePartsReplaced([123 as any]); } catch { threw = true; }
    assert(threw, 'A.5.4: validatePartsReplaced rejects non-string array items');

    threw = false;
    try {
      const hugeArray = Array.from({ length: 51 }, (_, i) => `قطعه ${i}`);
      validatePartsReplaced(hugeArray);
    } catch { threw = true; }
    assert(threw, 'A.5.5: validatePartsReplaced rejects array exceeding 50 items');

    threw = false;
    try { validatePartsReplaced(['A'.repeat(201)]); } catch { threw = true; }
    assert(threw, 'A.5.6: validatePartsReplaced rejects item length exceeding 200 chars');

    // HTTP Route persistence & cumulative totalLaborHours accumulation
    const caseA = createAcceptedCase('پرونده تست فیلدهای تکنسین در اقدام');
    const resA1 = await fetch(`${baseUrl}/cases/${caseA.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تعویض خازن‌های مدار واسط و تنظیم ولتاژ خروجی',
        hoursSpent: 2.5,
        partsReplaced: ['خازن الکترولیتی ۴۷۰ میکروفاراد', 'رله حفاظتی ۲۴ ولت'],
        laborCost: 10000000,
        partsCost: 20000000
      })
    });

    assert(resA1.status === 200, 'A.6.1: POST /actions with hoursSpent and partsReplaced returns 200');
    const actA1 = await resA1.json();
    assert(actA1.hoursSpent === 2.5, 'A.6.2: Action response includes exact hoursSpent (2.5)');
    assert(Array.isArray(actA1.partsReplaced) && actA1.partsReplaced.length === 2, 'A.6.3: Action response includes partsReplaced array');

    const updatedCaseA1 = maintenanceRepository.getCaseById(caseA.id)!;
    assert(updatedCaseA1.totalLaborHours === 2.5, 'A.6.4: Case totalLaborHours accumulated to 2.5');
    assert(updatedCaseA1.actionsTaken?.length === 1, 'A.6.5: Case actionsTaken contains exactly 1 embedded action');
    assert(updatedCaseA1.actionsTaken![0].hoursSpent === 2.5, 'A.6.6: Embedded action retains hoursSpent');
    assert(updatedCaseA1.actionsTaken![0].partsReplaced?.length === 2, 'A.6.7: Embedded action retains partsReplaced');

    // Second action with additional hours
    const resA2 = await fetch(`${baseUrl}/cases/${caseA.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'TEST',
        description: 'تست زیر بار و کالیبراسیون سنسور دما',
        hoursSpent: 1.75
      })
    });
    assert(resA2.status === 200, 'A.6.8: Second action with fractional hours succeeds (200)');
    const updatedCaseA2 = maintenanceRepository.getCaseById(caseA.id)!;
    assert(updatedCaseA2.totalLaborHours === 4.25, 'A.6.9: Case totalLaborHours accumulated correctly (2.5 + 1.75 = 4.25)');

    // Legacy action omitting hoursSpent and partsReplaced
    const resLegacy = await fetch(`${baseUrl}/cases/${caseA.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'INSPECTION',
        description: 'بازرسی چشمی نهایی اتصالات کابل‌ها'
      })
    });
    assert(resLegacy.status === 200, 'A.6.10: Legacy action omitting new fields succeeds without error');
    const updatedCaseLegacy = maintenanceRepository.getCaseById(caseA.id)!;
    assert(updatedCaseLegacy.totalLaborHours === 4.25, 'A.6.11: Legacy action without hours does not alter totalLaborHours');

    // Malformed hours in HTTP request
    const resBadHours = await fetch(`${baseUrl}/cases/${caseA.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام با ساعات نامعتبر',
        hoursSpent: -5
      })
    });
    assert(resBadHours.status === 400, 'A.7.1: Action with negative hours returns HTTP 400');

    const resNullHours = await fetch(`${baseUrl}/cases/${caseA.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام با ساعات null',
        hoursSpent: null
      })
    });
    assert(resNullHours.status === 400, 'A.7.2: Action with null hoursSpent returns HTTP 400');

    // =========================================================================
    // SECTION B: IDEMPOTENCY
    // =========================================================================
    console.log('\n--- SECTION B: IDEMPOTENCY ---');

    const caseB = createAcceptedCase('پرونده تست پایایی و Idempotency');
    const idemKeyB = 'req-key-phase2c1b2a-idem-0001';

    const resB1 = await fetch(`${baseUrl}/cases/${caseB.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKeyB
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'سیم‌پیچی مجدد استاتور ژنراتور',
        hoursSpent: 5.0,
        partsReplaced: ['سیم لاکی مسی ۰.۸ میلی‌متر', 'وارنیش عایق کلاس H'],
        laborCost: 25000000,
        partsCost: 15000000
      })
    });
    assert(resB1.status === 200, 'B.1.1: Initial action with idempotency key returns 200');
    const actB1 = await resB1.json();
    assert(actB1.clientRequestId === idemKeyB, 'B.1.2: Action saved with clientRequestId');

    const caseBAfter1 = maintenanceRepository.getCaseById(caseB.id)!;
    assert(caseBAfter1.totalLaborHours === 5.0, 'B.1.3: totalLaborHours is 5.0 after initial action');
    assert(caseBAfter1.laborCost === 25000000, 'B.1.4: laborCost is 25M IRR');
    assert(caseBAfter1.partsCost === 15000000, 'B.1.5: partsCost is 15M IRR');

    // B.1: Identical replay
    const resBReplay = await fetch(`${baseUrl}/cases/${caseB.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKeyB
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'سیم‌پیچی مجدد استاتور ژنراتور',
        hoursSpent: 5.0,
        partsReplaced: ['سیم لاکی مسی ۰.۸ میلی‌متر', 'وارنیش عایق کلاس H'],
        laborCost: 25000000,
        partsCost: 15000000
      })
    });
    assert(resBReplay.status === 200, 'B.1.6: Identical replay returns HTTP 200');
    const actBReplay = await resBReplay.json();
    assert(actBReplay.id === actB1.id, 'B.1.7: Replay returns identical action ID');

    const caseBAfterReplay = maintenanceRepository.getCaseById(caseB.id)!;
    assert(caseBAfterReplay.totalLaborHours === 5.0, 'B.1.8: totalLaborHours did not duplicate on replay');
    assert(caseBAfterReplay.totalCost === 40000000, 'B.1.9: totalCost did not duplicate on replay');
    const actionsB = maintenanceRepository.getActions(caseB.id);
    assert(actionsB.length === 1, 'B.1.10: Exactly 1 action stored in database after replay');

    // B.2: Conflicting replay with different hoursSpent
    const resBConflictHours = await fetch(`${baseUrl}/cases/${caseB.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKeyB
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'سیم‌پیچی مجدد استاتور ژنراتور',
        hoursSpent: 8.0, // Different hours!
        partsReplaced: ['سیم لاکی مسی ۰.۸ میلی‌متر', 'وارنیش عایق کلاس H'],
        laborCost: 25000000,
        partsCost: 15000000
      })
    });
    assert(resBConflictHours.status === 409, 'B.2.1: Replay with conflicting hoursSpent returns HTTP 409');
    const conflictErr = await resBConflictHours.json();
    assert(conflictErr.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'B.2.2: Conflict error code is IDEMPOTENCY_PAYLOAD_CONFLICT');

    // B.3: Cross-actor replay rejection
    const resBCrossActor = await fetch(`${baseUrl}/cases/${caseB.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenB}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idemKeyB
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'سیم‌پیچی مجدد استاتور ژنراتور',
        hoursSpent: 5.0,
        partsReplaced: ['سیم لاکی مسی ۰.۸ میلی‌متر', 'وارنیش عایق کلاس H'],
        laborCost: 25000000,
        partsCost: 15000000
      })
    });
    assert(resBCrossActor.status === 403, 'B.3.1: Cross-actor replay attempt returns HTTP 403');

    // B.4: Separate legitimate unkeyed requests
    const resUnkeyed1 = await fetch(`${baseUrl}/cases/${caseB.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'TEST',
        description: 'تست عملکرد بی‌باری'
      })
    });
    assert(resUnkeyed1.status === 200, 'B.4.1: First unkeyed action succeeds (200)');
    const actU1 = await resUnkeyed1.json();

    const resUnkeyed2 = await fetch(`${baseUrl}/cases/${caseB.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'TEST',
        description: 'تست عملکرد بی‌باری'
      })
    });
    assert(resUnkeyed2.status === 200, 'B.4.2: Second unkeyed action with same description succeeds (200)');
    const actU2 = await resUnkeyed2.json();
    assert(actU1.id !== actU2.id, 'B.4.3: Two separate unkeyed actions have distinct IDs');

    // =========================================================================
    // SECTION C: FINANCIAL INTEGRITY
    // =========================================================================
    console.log('\n--- SECTION C: FINANCIAL INTEGRITY ---');

    const caseC = createAcceptedCase('پرونده تست درستی و محاسبات مالی');

    // C.1: Cumulative overwrite semantics (not incremental accumulation!)
    const resC1 = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام اولیه جهت ارزیابی هزینه‌ها',
        laborCost: 10000000,
        partsCost: 20000000
      })
    });
    assert(resC1.status === 200, 'C.1.1: Initial action with financial costs returns 200');
    const caseC1 = maintenanceRepository.getCaseById(caseC.id)!;
    assert(caseC1.laborCost === 10000000, 'C.1.2: Case laborCost is 10M IRR');
    assert(caseC1.partsCost === 20000000, 'C.1.3: Case partsCost is 20M IRR');
    assert(caseC1.totalCost === 30000000, 'C.1.4: Case totalCost is 30M IRR');

    const resC2 = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام دوم با هزینه تجمعی نهایی بازنگری شده',
        laborCost: 15000000,
        partsCost: 25000000
      })
    });
    assert(resC2.status === 200, 'C.1.5: Subsequent action with updated costs returns 200');
    const caseC2 = maintenanceRepository.getCaseById(caseC.id)!;
    assert(caseC2.laborCost === 15000000, 'C.1.6: Case laborCost overwritten to 15M IRR (NOT 25M)');
    assert(caseC2.partsCost === 25000000, 'C.1.7: Case partsCost overwritten to 25M IRR (NOT 45M)');
    assert(caseC2.totalCost === 40000000, 'C.1.8: Case totalCost overwritten to 40M IRR (NOT 70M)');

    // C.2: Explicit zero
    const resCZero = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'INSPECTION',
        description: 'اقدام بدون هزینه اضافی قطعات',
        laborCost: 0,
        partsCost: 0
      })
    });
    assert(resCZero.status === 200, 'C.2.1: Action with explicit zero costs returns 200');
    const caseCZero = maintenanceRepository.getCaseById(caseC.id)!;
    assert(caseCZero.laborCost === 0 && caseCZero.partsCost === 0 && caseCZero.totalCost === 0, 'C.2.2: Case costs updated to 0 IRR');

    // C.3: Omitted financial fields preserve existing values
    // First set costs back to positive
    await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تنظیم مجدد هزینه',
        laborCost: 12000000,
        partsCost: 18000000
      })
    });
    const resCOmit = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'CLEANING',
        description: 'تمیزکاری بدنه ژنراتور'
        // omitted laborCost and partsCost
      })
    });
    assert(resCOmit.status === 200, 'C.3.1: Action with omitted financial fields returns 200');
    const caseCOmit = maintenanceRepository.getCaseById(caseC.id)!;
    assert(caseCOmit.laborCost === 12000000, 'C.3.2: Omitted laborCost preserves existing case laborCost');
    assert(caseCOmit.partsCost === 18000000, 'C.3.3: Omitted partsCost preserves existing case partsCost');

    // C.4: Invalid & fractional Rial amounts rejected
    const resCFractional = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام با هزینه اعشاری ریال',
        laborCost: 10000000.5
      })
    });
    assert(resCFractional.status === 400, 'C.4.1: Fractional Rial amount rejected with HTTP 400');

    const resCNegative = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام با هزینه منفی',
        laborCost: -50000
      })
    });
    assert(resCNegative.status === 400, 'C.4.2: Negative Rial amount rejected with HTTP 400');

    const resCNaN = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام با هزینه رشته‌ای نامعتبر',
        laborCost: 'abc'
      })
    });
    assert(resCNaN.status === 400, 'C.4.3: Non-numeric string cost rejected with HTTP 400');

    // C.5: Overflow prevention
    const resCOverflow = await fetch(`${baseUrl}/cases/${caseC.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام با هزینه بیش از سقف امن محاسبات',
        laborCost: 100000000000001
      })
    });
    assert(resCOverflow.status === 400, 'C.5.1: Excessive cost exceeding 1e14 rejected with HTTP 400');

    // C.6: Stored corruption detection
    const caseCorrupt = createAcceptedCase('پرونده تست خرابی ذخیره‌شده');
    // Inject invalid negative laborCost directly into DB
    const activeDbPath = db.getDBPath();
    const rawData = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const targetCaseIdx = rawData.maintenanceCases.findIndex((x: any) => x.id === caseCorrupt.id);
    rawData.maintenanceCases[targetCaseIdx].laborCost = -99999;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawData, null, 2), 'utf8');

    const resCorrupt = await fetch(`${baseUrl}/cases/${caseCorrupt.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تلاش برای ثبت اقدام بر روی پرونده با داده فاسد ذخیره شده',
        laborCost: 10000000
      })
    });
    assert(resCorrupt.status === 400, 'C.6.1: Action on case with corrupt stored laborCost safely rejected with HTTP 400');

    // C.7: Spare-parts cost preservation (on submit-verification)
    const caseSpare = createAcceptedCase('پرونده تست حفاظت از بهای قطعات یدکی', { sparePartsCost: 50000000 });
    // Log an action first so submit-verification can proceed
    await fetch(`${baseUrl}/cases/${caseSpare.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام اولیه جهت بررسی قطعات یدکی'
      })
    });

    const resSpareViolate = await fetch(`${baseUrl}/cases/${caseSpare.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش برای کاهش هزینه قطعات به کمتر از قطعات یدکی',
        partsCost: 30000000 // Less than 50,000,000 spare parts!
      })
    });
    assert(resSpareViolate.status === 400, 'C.7.1: submit-verification with partsCost < recorded sparePartsUsed rejected with HTTP 400');
    const spareErr = await resSpareViolate.json();
    assert(spareErr.error && spareErr.error.includes('کمتر از بهای قطعات یدکی'), 'C.7.2: Error message explicitly mentions spare parts floor');

    const resSpareValid = await fetch(`${baseUrl}/cases/${caseSpare.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'ثبت نهایی با هزینه قطعات معتبر',
        partsCost: 50000000 // Equal to recorded spare parts
      })
    });
    assert(resSpareValid.status === 200, 'C.7.3: submit-verification with partsCost >= recorded sparePartsUsed accepted (200)');

    // C.8: Spare-parts quantity validation & calculations
    let zeroQtyErr = false;
    try {
      validateSparePartItem({ partName: 'فیوز', quantity: 0, costIrr: 1000000 });
    } catch (e: any) {
      zeroQtyErr = true;
    }
    assert(zeroQtyErr, 'C.8.1: validateSparePartItem rejects zero quantity for new additions');

    let negQtyErr = false;
    try {
      validateSparePartItem({ partName: 'فیوز', quantity: -2, costIrr: 1000000 });
    } catch (e: any) {
      negQtyErr = true;
    }
    assert(negQtyErr, 'C.8.2: validateSparePartItem rejects negative quantity');

    let fracQtyErr = false;
    try {
      validateSparePartItem({ partName: 'فیوز', quantity: 1.5, costIrr: 1000000 });
    } catch (e: any) {
      fracQtyErr = true;
    }
    assert(fracQtyErr, 'C.8.3: validateSparePartItem rejects fractional quantity');

    let excessiveQtyErr = false;
    try {
      validateSparePartItem({ partName: 'فیوز', quantity: 500000, costIrr: 1000000 });
    } catch (e: any) {
      excessiveQtyErr = true;
    }
    assert(excessiveQtyErr, 'C.8.4: validateSparePartItem rejects excessive quantity (>100k)');

    let emptyNameErr = false;
    try {
      validateSparePartItem({ partName: '   ', quantity: 1, costIrr: 1000000 });
    } catch (e: any) {
      emptyNameErr = true;
    }
    assert(emptyNameErr, 'C.8.5: validateSparePartItem rejects empty partName');

    const costZeroQty = calculateRecordedPartsCost([{ partName: 'قدیمی', quantity: 0, costIrr: 5000000 }]);
    assert(costZeroQty === 0, 'C.8.6: calculateRecordedPartsCost calculates 0 IRR for stored zero quantity (never coerces 0 to 1)');

    const costLegacyOmitted = calculateRecordedPartsCost([{ partName: 'قدیمی', costIrr: 4000000 }]);
    assert(costLegacyOmitted === 4000000, 'C.8.7: calculateRecordedPartsCost defaults omitted quantity to 1 for legitimate legacy records');

    let storedNegQtyErr = false;
    try {
      calculateRecordedPartsCost([{ partName: 'قدیمی', quantity: -1, costIrr: 1000000 }]);
    } catch (e: any) {
      storedNegQtyErr = true;
    }
    assert(storedNegQtyErr, 'C.8.8: calculateRecordedPartsCost fails closed on corrupt negative stored quantity');

    let storedFracQtyErr = false;
    try {
      calculateRecordedPartsCost([{ partName: 'قدیمی', quantity: 2.2, costIrr: 1000000 }]);
    } catch (e: any) {
      storedFracQtyErr = true;
    }
    assert(storedFracQtyErr, 'C.8.9: calculateRecordedPartsCost fails closed on corrupt fractional stored quantity');

    // C.9: Spare-parts cost validation & calculations
    let negCostErr = false;
    try {
      validateSparePartItem({ partName: 'فن خنک‌کننده', quantity: 1, costIrr: -5000 });
    } catch (e: any) {
      negCostErr = true;
    }
    assert(negCostErr, 'C.9.1: validateSparePartItem rejects negative cost');

    let fracCostErr = false;
    try {
      validateSparePartItem({ partName: 'فن خنک‌کننده', quantity: 1, costIrr: 1000.5 });
    } catch (e: any) {
      fracCostErr = true;
    }
    assert(fracCostErr, 'C.9.2: validateSparePartItem rejects fractional Rial cost');

    let strCostErr = false;
    try {
      validateSparePartItem({ partName: 'فن خنک‌کننده', quantity: 1, costIrr: 'invalid_price' });
    } catch (e: any) {
      strCostErr = true;
    }
    assert(strCostErr, 'C.9.3: validateSparePartItem rejects non-numeric string cost');

    let infCostErr = false;
    try {
      validateSparePartItem({ partName: 'فن خنک‌کننده', quantity: 1, costIrr: Infinity });
    } catch (e: any) {
      infCostErr = true;
    }
    assert(infCostErr, 'C.9.4: validateSparePartItem rejects Infinity cost');

    let excessiveCostErr = false;
    try {
      validateSparePartItem({ partName: 'فن خنک‌کننده', quantity: 1, costIrr: 1e15 });
    } catch (e: any) {
      excessiveCostErr = true;
    }
    assert(excessiveCostErr, 'C.9.5: validateSparePartItem rejects excessive cost (>1e13)');

    let multOverflowErr = false;
    try {
      validateSparePartItem({ partName: 'فن خنک‌کننده', quantity: 10000, costIrr: 1e11 });
    } catch (e: any) {
      multOverflowErr = true;
    }
    assert(multOverflowErr, 'C.9.6: validateSparePartItem rejects multiplication exceeding safe computation bounds');

    let storedNegCostErr = false;
    try {
      calculateRecordedPartsCost([{ partName: 'تست', quantity: 1, costIrr: -50000 }]);
    } catch (e: any) {
      storedNegCostErr = true;
    }
    assert(storedNegCostErr, 'C.9.7: calculateRecordedPartsCost fails closed on corrupt negative stored cost');

    // C.10: Stored contradictory totals detection (Fail Closed)
    const caseContradict = createAcceptedCase('پرونده تست تناقض ریاضی مقادیر ذخیره‌شده');
    await fetch(`${baseUrl}/cases/${caseContradict.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام اولیه قبل از تزریق داده متناقض'
      })
    });

    // Inject contradictory totals: laborCost(10M) + partsCost(20M) != totalCost(50M)
    const rawDataContradict = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const cIdxContradict = rawDataContradict.maintenanceCases.findIndex((x: any) => x.id === caseContradict.id);
    rawDataContradict.maintenanceCases[cIdxContradict].laborCost = 10000000;
    rawDataContradict.maintenanceCases[cIdxContradict].partsCost = 20000000;
    rawDataContradict.maintenanceCases[cIdxContradict].totalCost = 50000000; // Contradiction! (10M + 20M = 30M != 50M)
    rawDataContradict.maintenanceCases[cIdxContradict].totalCostIrr = 50000000;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataContradict, null, 2), 'utf8');

    const resSubmitContradict = await fetch(`${baseUrl}/cases/${caseContradict.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش برای تایید پرونده با مجموع متناقض ذخیره شده'
      })
    });
    assert(resSubmitContradict.status === 400, 'C.10.1: submit-verification fails closed on contradictory stored totals (HTTP 400)');
    const errContradict = await resSubmitContradict.json();
    assert(errContradict.error && errContradict.error.includes('تناقض'), 'C.10.2: Error message explicitly reports contradictory stored totals');

    const resActionContradict = await fetch(`${baseUrl}/cases/${caseContradict.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'تلاش برای ثبت اقدام روی پرونده با داده متناقض',
        laborCost: 15000000
      })
    });
    assert(resActionContradict.status === 400, 'C.10.3: recordCaseAction fails closed on contradictory stored totals (HTTP 400)');

    // Inject totalCost != totalCostIrr mismatch
    rawDataContradict.maintenanceCases[cIdxContradict].laborCost = 10000000;
    rawDataContradict.maintenanceCases[cIdxContradict].partsCost = 20000000;
    rawDataContradict.maintenanceCases[cIdxContradict].totalCost = 30000000;
    rawDataContradict.maintenanceCases[cIdxContradict].totalCostIrr = 40000000; // Mismatch!
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataContradict, null, 2), 'utf8');

    const resSubmitMismatch = await fetch(`${baseUrl}/cases/${caseContradict.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش برای تایید پرونده با عدم تطابق totalCost و totalCostIrr'
      })
    });
    assert(resSubmitMismatch.status === 400, 'C.10.4: submit-verification fails closed on totalCost vs totalCostIrr mismatch (HTTP 400)');

    // C.11: Valid sparse legacy financial records preservation
    const caseSparse = createAcceptedCase('پرونده تست رکوردهای پراکنده قدیمی');
    // Inject valid sparse legacy record: totalCostIrr = 7,500,000, no laborCost or partsCost
    const rawDataSparse = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const cIdxSparse = rawDataSparse.maintenanceCases.findIndex((x: any) => x.id === caseSparse.id);
    delete rawDataSparse.maintenanceCases[cIdxSparse].laborCost;
    delete rawDataSparse.maintenanceCases[cIdxSparse].partsCost;
    delete rawDataSparse.maintenanceCases[cIdxSparse].totalCost;
    rawDataSparse.maintenanceCases[cIdxSparse].totalCostIrr = 7500000;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataSparse, null, 2), 'utf8');

    // Add action without financial parameters
    await fetch(`${baseUrl}/cases/${caseSparse.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'INSPECTION',
        description: 'بازدید روتین بر روی پرونده قدیمی'
      })
    });

    const resSubmitSparse = await fetch(`${baseUrl}/cases/${caseSparse.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تایید پرونده با حفظ مبلغ کل تاریخی'
      })
    });
    assert(resSubmitSparse.status === 200, 'C.11.1: submit-verification succeeds on valid sparse legacy record (HTTP 200)');
    const caseSparseAfter = maintenanceRepository.getCaseById(caseSparse.id)!;
    assert(caseSparseAfter.status === 'AWAITING_VERIFICATION', 'C.11.2: Sparse legacy case status transitioned to AWAITING_VERIFICATION');
    assert(caseSparseAfter.totalCostIrr === 7500000, 'C.11.3: Sparse legacy totalCostIrr preserved at 7,500,000 IRR without silent wipe');

    // C.12: Spare-parts idempotency and conflict detection
    const caseSpareDedupe = createAcceptedCase('پرونده تست عدم تکرار هزینه قطعات یدکی');
    const partsToAdd = [
      {
        partName: 'خازن قدرت ۴۰۰ ولت',
        quantity: 2,
        costIrr: 1500000
      }
    ];

    const dedupe1 = maintenanceCaseService.addSpareParts(caseSpareDedupe.id, partsToAdd, {
      clientRequestId: 'SPARE_DEDUPE_001'
    });
    assert(dedupe1.sparePartsUsed?.length === 1, 'C.12.1: First addSpareParts call records 1 spare part item');
    assert(dedupe1.partsCost === 3000000, 'C.12.2: First call calculates partsCost = 3,000,000 IRR');
    assert(dedupe1.totalCostIrr === 3000000, 'C.12.3: First call sets totalCostIrr = 3,000,000 IRR');

    // Identical retry with same clientRequestId
    const dedupe2 = maintenanceCaseService.addSpareParts(caseSpareDedupe.id, partsToAdd, {
      clientRequestId: 'SPARE_DEDUPE_001'
    });
    assert(dedupe2.sparePartsUsed?.length === 1, 'C.12.4: Retried addSpareParts call does not duplicate spare part item');
    assert(dedupe2.partsCost === 3000000, 'C.12.5: Retried call does not double partsCost (remains 3M IRR)');
    assert(dedupe2.totalCostIrr === 3000000, 'C.12.6: Retried call does not double totalCostIrr (remains 3M IRR)');

    // Replay with changed partName
    let conflictNameErr: any = null;
    try {
      maintenanceCaseService.addSpareParts(caseSpareDedupe.id, [
        { partName: 'خازن قدرت متفاوت', quantity: 2, costIrr: 1500000 }
      ], { clientRequestId: 'SPARE_DEDUPE_001' });
    } catch (e: any) {
      conflictNameErr = e;
    }
    assert(conflictNameErr !== null, 'C.12.7: Same request ID with changed partName throws conflict error');
    assert(conflictNameErr?.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'C.12.8: Conflict error has code IDEMPOTENCY_PAYLOAD_CONFLICT');

    // Replay with changed quantity
    let conflictQtyErr: any = null;
    try {
      maintenanceCaseService.addSpareParts(caseSpareDedupe.id, [
        { partName: 'خازن قدرت ۴۰۰ ولت', quantity: 3, costIrr: 1500000 }
      ], { clientRequestId: 'SPARE_DEDUPE_001' });
    } catch (e: any) {
      conflictQtyErr = e;
    }
    assert(conflictQtyErr !== null, 'C.12.9: Same request ID with changed quantity throws conflict error');
    assert(conflictQtyErr?.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'C.12.10: Changed quantity error has code IDEMPOTENCY_PAYLOAD_CONFLICT');

    // Replay with changed costIrr
    let conflictCostErr: any = null;
    try {
      maintenanceCaseService.addSpareParts(caseSpareDedupe.id, [
        { partName: 'خازن قدرت ۴۰۰ ولت', quantity: 2, costIrr: 2000000 }
      ], { clientRequestId: 'SPARE_DEDUPE_001' });
    } catch (e: any) {
      conflictCostErr = e;
    }
    assert(conflictCostErr !== null, 'C.12.11: Same request ID with changed costIrr throws conflict error');
    assert(conflictCostErr?.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'C.12.12: Changed costIrr error has code IDEMPOTENCY_PAYLOAD_CONFLICT');

    // Replay with changed multi-part batch
    let conflictBatchErr: any = null;
    try {
      maintenanceCaseService.addSpareParts(caseSpareDedupe.id, [
        { partName: 'خازن قدرت ۴۰۰ ولت', quantity: 2, costIrr: 1500000 },
        { partName: 'مقاومت ترمز', quantity: 1, costIrr: 500000 }
      ], { clientRequestId: 'SPARE_DEDUPE_001' });
    } catch (e: any) {
      conflictBatchErr = e;
    }
    assert(conflictBatchErr !== null, 'C.12.13: Same request ID with changed multi-part batch length throws conflict error');
    assert(conflictBatchErr?.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'C.12.14: Batch conflict error has code IDEMPOTENCY_PAYLOAD_CONFLICT');

    // Verify persisted case remained completely untouched after conflicts
    const caseAfterConflicts = maintenanceRepository.getCaseById(caseSpareDedupe.id)!;
    assert(caseAfterConflicts.sparePartsUsed?.length === 1, 'C.12.15: Persisted case sparePartsUsed length unchanged after conflicts');
    assert(caseAfterConflicts.partsCost === 3000000, 'C.12.16: Persisted case partsCost unchanged at 3M IRR');
    assert(caseAfterConflicts.totalCostIrr === 3000000, 'C.12.17: Persisted case totalCostIrr unchanged at 3M IRR');

    // Adding unrelated parts with a different request ID succeeds
    const addUnrelated = maintenanceCaseService.addSpareParts(caseSpareDedupe.id, [
      { partName: 'دیود یکسوساز', quantity: 4, costIrr: 500000 }
    ], { clientRequestId: 'SPARE_UNRELATED_002' });
    assert(addUnrelated.sparePartsUsed?.length === 2, 'C.12.18: Unrelated parts with distinct request ID successfully added');
    assert(addUnrelated.partsCost === 5000000, 'C.12.19: partsCost incremented to 5M IRR (3M + 2M)');
    assert(addUnrelated.totalCostIrr === 5000000, 'C.12.20: totalCostIrr incremented to 5M IRR');

    // Legacy entry with request ID but unprovable equivalence (missing partName) fails closed
    const rawDataLegacy = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const cIdxLegacy = rawDataLegacy.maintenanceCases.findIndex((x: any) => x.id === caseSpareDedupe.id);
    rawDataLegacy.maintenanceCases[cIdxLegacy].sparePartsUsed.push({
      clientRequestId: 'SPARE_LEGACY_UNPROVABLE',
      // partName missing!
      quantity: 1,
      costIrr: 1000000
    });
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataLegacy, null, 2), 'utf8');

    let legacyConflictErr: any = null;
    try {
      maintenanceCaseService.addSpareParts(caseSpareDedupe.id, [
        { partName: 'قطعه جدید با شناسه قدیمی ناقص', quantity: 1, costIrr: 1000000 }
      ], { clientRequestId: 'SPARE_LEGACY_UNPROVABLE' });
    } catch (e: any) {
      legacyConflictErr = e;
    }
    assert(legacyConflictErr !== null, 'C.12.21: Legacy request ID with unprovable payload equivalence fails closed');
    assert(legacyConflictErr?.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'C.12.22: Unprovable legacy replay classified as IDEMPOTENCY_PAYLOAD_CONFLICT');

    // HTTP Route: POST /cases/:id/spare-parts conflict mapping to HTTP 409
    const caseHttpSpare = createAcceptedCase('پرونده تست HTTP قطعات یدکی');
    const resHttp1 = await fetch(`${baseUrl}/cases/${caseHttpSpare.id}/spare-parts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'idempotency-key': 'HTTP_SPARE_KEY_001'
      },
      body: JSON.stringify({
        parts: [{ partName: 'رله ولتاژ', quantity: 1, costIrr: 2500000 }]
      })
    });
    assert(resHttp1.status === 200, 'C.12.23: Initial HTTP POST spare-parts returns HTTP 200');

    // Replay identical via HTTP
    const resHttpReplay = await fetch(`${baseUrl}/cases/${caseHttpSpare.id}/spare-parts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'idempotency-key': 'HTTP_SPARE_KEY_001'
      },
      body: JSON.stringify({
        parts: [{ partName: 'رله ولتاژ', quantity: 1, costIrr: 2500000 }]
      })
    });
    assert(resHttpReplay.status === 200, 'C.12.24: Identical HTTP replay returns HTTP 200 without duplication');

    // Conflicting replay via HTTP -> HTTP 409
    const resHttpConflict = await fetch(`${baseUrl}/cases/${caseHttpSpare.id}/spare-parts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json',
        'idempotency-key': 'HTTP_SPARE_KEY_001'
      },
      body: JSON.stringify({
        parts: [{ partName: 'رله ولتاژ متفاوت', quantity: 1, costIrr: 2500000 }]
      })
    });
    assert(resHttpConflict.status === 409, 'C.12.25: Conflicting HTTP spare-parts replay returns HTTP 409');
    const httpConflictBody = await resHttpConflict.json();
    assert(httpConflictBody.code === 'IDEMPOTENCY_PAYLOAD_CONFLICT', 'C.12.26: HTTP 409 response contains code IDEMPOTENCY_PAYLOAD_CONFLICT');
    assert(!JSON.stringify(httpConflictBody).includes('/'), 'C.12.27: HTTP 409 response does not leak internal filesystem paths');

    // C.13: Cumulative action costs followed by verification submission
    const caseCumul = createAcceptedCase('پرونده تست توالی اقدامات تجمعی و ارسال به تایید');
    await fetch(`${baseUrl}/cases/${caseCumul.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام اول: ثبت دستمزد و قطعات',
        laborCost: 12000000,
        partsCost: 8000000
      })
    });

    await fetch(`${baseUrl}/cases/${caseCumul.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام دوم: بازنگری تجمعی نهایی هزینه‌ها',
        laborCost: 16000000,
        partsCost: 10000000
      })
    });

    const caseCumulMid = maintenanceRepository.getCaseById(caseCumul.id)!;
    assert(caseCumulMid.laborCost === 16000000 && caseCumulMid.partsCost === 10000000 && caseCumulMid.totalCost === 26000000, 'C.13.1: Cumulative overwrite established 16M labor + 10M parts = 26M total');

    // submit-verification with omitted costs preserves established action costs
    const resCumulSubmit = await fetch(`${baseUrl}/cases/${caseCumul.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تایید با حفظ هزینه‌های تجمعی ثبت شده در اقدامات'
      })
    });
    assert(resCumulSubmit.status === 200, 'C.13.2: submit-verification succeeds with omitted costs on cumulative action case');
    const caseCumulFinal = maintenanceRepository.getCaseById(caseCumul.id)!;
    assert(caseCumulFinal.laborCost === 16000000, 'C.13.3: Final laborCost preserved at 16,000,000 IRR');
    assert(caseCumulFinal.partsCost === 10000000, 'C.13.4: Final partsCost preserved at 10,000,000 IRR');
    assert(caseCumulFinal.totalCost === 26000000, 'C.13.5: Final totalCost preserved at 26,000,000 IRR');
    assert(caseCumulFinal.totalCostIrr === 26000000, 'C.13.6: Final totalCostIrr preserved at 26,000,000 IRR');

    // =========================================================================
    // C.14: SPARSE LEGACY FINANCIAL INTEGRITY SCENARIOS
    // =========================================================================
    // Scenario 1: partsCost exists, but totalCostIrr and totalCost are missing
    const caseScen1 = createAcceptedCase('سناریو ۱: وجود partsCost و فقدان فیلدهای مجموع');
    const rawDataScen1 = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const idxScen1 = rawDataScen1.maintenanceCases.findIndex((x: any) => x.id === caseScen1.id);
    delete rawDataScen1.maintenanceCases[idxScen1].laborCost;
    delete rawDataScen1.maintenanceCases[idxScen1].totalCost;
    delete rawDataScen1.maintenanceCases[idxScen1].totalCostIrr;
    rawDataScen1.maintenanceCases[idxScen1].partsCost = 5000000;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataScen1, null, 2), 'utf8');

    const resScen1 = maintenanceCaseService.addSpareParts(caseScen1.id, [
      { partName: 'سنسور دما', quantity: 1, costIrr: 2000000 }
    ]);
    assert(resScen1.partsCost === 7000000, 'C.14.1: Scenario 1 preserves existing 5M partsCost, incrementing to 7M IRR');
    assert(resScen1.totalCost === 7000000, 'C.14.2: Scenario 1 reconstructs totalCost as 7M IRR (not 2M)');
    assert(resScen1.totalCostIrr === 7000000, 'C.14.3: Scenario 1 reconstructs totalCostIrr as 7M IRR (not 2M)');

    // Scenario 2: laborCost and partsCost exist, but both totals are missing
    const caseScen2 = createAcceptedCase('سناریو ۲: وجود دستمزد و قطعات و فقدان مجموع');
    const rawDataScen2 = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const idxScen2 = rawDataScen2.maintenanceCases.findIndex((x: any) => x.id === caseScen2.id);
    delete rawDataScen2.maintenanceCases[idxScen2].totalCost;
    delete rawDataScen2.maintenanceCases[idxScen2].totalCostIrr;
    rawDataScen2.maintenanceCases[idxScen2].laborCost = 10000000;
    rawDataScen2.maintenanceCases[idxScen2].partsCost = 5000000;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataScen2, null, 2), 'utf8');

    const resScen2 = maintenanceCaseService.addSpareParts(caseScen2.id, [
      { partName: 'سنسور فشار', quantity: 1, costIrr: 2000000 }
    ]);
    assert(resScen2.laborCost === 10000000, 'C.14.4: Scenario 2 preserves existing 10M laborCost');
    assert(resScen2.partsCost === 7000000, 'C.14.5: Scenario 2 increments partsCost from 5M to 7M IRR');
    assert(resScen2.totalCost === 17000000, 'C.14.6: Scenario 2 reconstructs totalCost as 17M IRR (10M labor + 7M parts)');
    assert(resScen2.totalCostIrr === 17000000, 'C.14.7: Scenario 2 reconstructs totalCostIrr as 17M IRR');

    // Scenario 3: totalCost exists, but totalCostIrr is missing
    const caseScen3 = createAcceptedCase('سناریو ۳: وجود totalCost و فقدان totalCostIrr');
    const rawDataScen3 = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const idxScen3 = rawDataScen3.maintenanceCases.findIndex((x: any) => x.id === caseScen3.id);
    delete rawDataScen3.maintenanceCases[idxScen3].totalCostIrr;
    rawDataScen3.maintenanceCases[idxScen3].totalCost = 15000000;
    rawDataScen3.maintenanceCases[idxScen3].partsCost = 5000000;
    rawDataScen3.maintenanceCases[idxScen3].laborCost = 10000000;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataScen3, null, 2), 'utf8');

    const resScen3 = maintenanceCaseService.addSpareParts(caseScen3.id, [
      { partName: 'سنسور جریان', quantity: 1, costIrr: 2000000 }
    ]);
    assert(resScen3.totalCost === 17000000, 'C.14.8: Scenario 3 increments totalCost to 17M IRR');
    assert(resScen3.totalCostIrr === 17000000, 'C.14.9: Scenario 3 synchronizes missing totalCostIrr to 17M IRR');

    // Scenario 4: totalCostIrr exists, but totalCost is missing
    const caseScen4 = createAcceptedCase('سناریو ۴: وجود totalCostIrr و فقدان totalCost');
    const rawDataScen4 = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const idxScen4 = rawDataScen4.maintenanceCases.findIndex((x: any) => x.id === caseScen4.id);
    delete rawDataScen4.maintenanceCases[idxScen4].totalCost;
    rawDataScen4.maintenanceCases[idxScen4].totalCostIrr = 20000000;
    rawDataScen4.maintenanceCases[idxScen4].partsCost = 5000000;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataScen4, null, 2), 'utf8');

    const resScen4 = maintenanceCaseService.addSpareParts(caseScen4.id, [
      { partName: 'واشر عایق', quantity: 1, costIrr: 2000000 }
    ]);
    assert(resScen4.totalCostIrr === 22000000, 'C.14.10: Scenario 4 increments totalCostIrr to 22M IRR');
    assert(resScen4.totalCost === 22000000, 'C.14.11: Scenario 4 synchronizes missing totalCost to 22M IRR');

    // Scenario 5: Valid stored sparePartsUsed exists while partsCost is absent
    const caseScen5 = createAcceptedCase('سناریو ۵: وجود sparePartsUsed و فقدان partsCost');
    const rawDataScen5 = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const idxScen5 = rawDataScen5.maintenanceCases.findIndex((x: any) => x.id === caseScen5.id);
    delete rawDataScen5.maintenanceCases[idxScen5].partsCost;
    delete rawDataScen5.maintenanceCases[idxScen5].totalCost;
    delete rawDataScen5.maintenanceCases[idxScen5].totalCostIrr;
    rawDataScen5.maintenanceCases[idxScen5].sparePartsUsed = [
      { partName: 'قطعه ثبت‌شده قبلی', quantity: 2, costIrr: 2000000 }
    ];
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataScen5, null, 2), 'utf8');

    const resScen5 = maintenanceCaseService.addSpareParts(caseScen5.id, [
      { partName: 'قطعه جدید', quantity: 1, costIrr: 2000000 }
    ]);
    assert(resScen5.partsCost === 6000000, 'C.14.12: Scenario 5 reconstructs partsCost from existing sparePartsUsed (4M + 2M = 6M IRR)');
    assert(resScen5.totalCost === 6000000, 'C.14.13: Scenario 5 sets totalCost to 6M IRR');
    assert(resScen5.totalCostIrr === 6000000, 'C.14.14: Scenario 5 sets totalCostIrr to 6M IRR');

    // Scenario 6: Explicit zero total with nonzero partsCost fails closed
    const caseScen6 = createAcceptedCase('سناریو ۶: مجموع صفر متناقض با قطعات nonzero');
    const rawDataScen6 = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const idxScen6 = rawDataScen6.maintenanceCases.findIndex((x: any) => x.id === caseScen6.id);
    rawDataScen6.maintenanceCases[idxScen6].partsCost = 5000000;
    rawDataScen6.maintenanceCases[idxScen6].totalCost = 0; // Contradiction! (total 0 with partsCost 5M)
    rawDataScen6.maintenanceCases[idxScen6].totalCostIrr = 0;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataScen6, null, 2), 'utf8');

    let scen6Err: any = null;
    try {
      maintenanceCaseService.addSpareParts(caseScen6.id, [
        { partName: 'قطعه دیگر', quantity: 1, costIrr: 1000000 }
      ]);
    } catch (e: any) {
      scen6Err = e;
    }
    assert(scen6Err !== null, 'C.14.15: Inconsistent explicit zero total with nonzero components fails closed');

    // Scenario 6b: Consistent explicit zero total (all fields 0) succeeds
    const caseScen6b = createAcceptedCase('سناریو ۶ب: کلیه مبالغ صفر');
    const rawDataScen6b = JSON.parse(fs.readFileSync(activeDbPath, 'utf8'));
    const idxScen6b = rawDataScen6b.maintenanceCases.findIndex((x: any) => x.id === caseScen6b.id);
    rawDataScen6b.maintenanceCases[idxScen6b].laborCost = 0;
    rawDataScen6b.maintenanceCases[idxScen6b].partsCost = 0;
    rawDataScen6b.maintenanceCases[idxScen6b].totalCost = 0;
    rawDataScen6b.maintenanceCases[idxScen6b].totalCostIrr = 0;
    fs.writeFileSync(activeDbPath, JSON.stringify(rawDataScen6b, null, 2), 'utf8');

    const resScen6b = maintenanceCaseService.addSpareParts(caseScen6b.id, [
      { partName: 'قطعه جدید صفر', quantity: 1, costIrr: 2000000 }
    ]);
    assert(resScen6b.partsCost === 2000000, 'C.14.16: Consistent zero base increments partsCost to 2M IRR');
    assert(resScen6b.totalCost === 2000000, 'C.14.17: Consistent zero base increments totalCost to 2M IRR');
    assert(resScen6b.totalCostIrr === 2000000, 'C.14.18: Consistent zero base increments totalCostIrr to 2M IRR');

    // Persistence failure during spare-parts update confirms no partial update or duplicated charge
    const caseSpareFail = createAcceptedCase('پرونده تست خطای دیسک در ثبت قطعات یدکی');
    try {
      db.__setTestWriteFailureHook((stage) => {
        if (stage === 'before_atomic_rename') {
          throw new Error('EIO: injected disk failure during spare parts atomic write');
        }
      });

      let spareFailThrew = false;
      try {
        maintenanceCaseService.addSpareParts(caseSpareFail.id, [
          { partName: 'قطعه حین خرابی', quantity: 1, costIrr: 1000000 }
        ]);
      } catch (e: any) {
        spareFailThrew = true;
      }
      assert(spareFailThrew, 'C.14.19: Persistence failure during addSpareParts correctly threw');
    } finally {
      db.__setTestWriteFailureHook(null);
    }

    const caseAfterSpareFail = maintenanceRepository.getCaseById(caseSpareFail.id)!;
    assert((caseAfterSpareFail.sparePartsUsed || []).length === 0, 'C.14.20: No partial spare parts written on persistence failure');

    // =========================================================================
    // SECTION D: VERIFICATION LIFECYCLE
    // =========================================================================
    console.log('\n--- SECTION D: VERIFICATION LIFECYCLE ---');

    // D.1: Authorized verification submission by assigned technician
    const caseD = createAcceptedCase('پرونده تست چرخه تایید کارشناس');
    // Log an action first (required for submit-verification)
    await fetch(`${baseUrl}/cases/${caseD.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام اولیه جهت انجام تعمیرات قبل از درخواست تایید',
        laborCost: 20000000,
        partsCost: 30000000,
        hoursSpent: 3.5,
        partsReplaced: ['شیر برقی گازوئیل']
      })
    });

    const resDSubmit = await fetch(`${baseUrl}/cases/${caseD.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'عملیات تعمیرات و کالیبراسیون با موفقیت انجام شد',
        rootCause: 'فرسودگی شیر برقی سوخت',
        laborCost: 22000000,
        partsCost: 32000000
      })
    });

    assert(resDSubmit.status === 200, 'D.1.1: Assigned technician submit-verification returns HTTP 200');
    const caseDUpdated = await resDSubmit.json();
    assert(caseDUpdated.status === 'AWAITING_VERIFICATION', 'D.1.2: Case status transitioned to AWAITING_VERIFICATION');
    assert(caseDUpdated.laborCost === 22000000, 'D.1.3: Case laborCost updated to 22M IRR');
    assert(caseDUpdated.partsCost === 32000000, 'D.1.4: Case partsCost updated to 32M IRR');
    assert(caseDUpdated.totalCost === 54000000, 'D.1.5: Case totalCost updated to 54M IRR');
    assert(Array.isArray(caseDUpdated.actionsTaken) && caseDUpdated.actionsTaken.length > 0, 'D.1.6: Historical actions preserved in actionsTaken');

    // D.2: Formal acceptance barrier
    const caseNoAccept = maintenanceRepository.createCase({
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'پرونده بدون پذیرش رسمی',
      description: 'پرونده تست پذیرش رسمی',
      priority: 'MEDIUM',
      status: 'ASSIGNED',
      assignedTechnicianId: techUserA.id,
      assignedTechnicianName: 'تکنسین الف آزمایشی',
      assignedTechnicianPhone: '09123330099',
      contactName: 'کارفرما',
      contactPhone: '09121110099',
      category: 'CORRECTIVE',
      reportedBy: customerUser.id,
      reportedAt: new Date().toISOString(),
      alertIds: []
    });
    // Create an assignment history record with only ASSIGNED, no ACCEPTED
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseNoAccept.id,
      technicianId: techUserA.id,
      assignedBy: customerUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص اولیه'
    });

    const resDNoAccept = await fetch(`${baseUrl}/cases/${caseNoAccept.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش برای ثبت تایید بدون پذیرش پرونده'
      })
    });
    assert(resDNoAccept.status === 403, 'D.2.1: submit-verification rejected with HTTP 403 if technician has not formally accepted');

    // D.3: Unauthorized technician rejection
    const caseD3 = createAcceptedCase('پرونده تست تکنسین غیرمجاز');
    await fetch(`${baseUrl}/cases/${caseD3.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام معتبر تکنسین مجاز'
      })
    });

    const resD3Unauth = await fetch(`${baseUrl}/cases/${caseD3.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenB}`, // Tech B is NOT assigned
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش تکنسین ب برای ارسال به تایید پرونده تکنسین الف'
      })
    });
    assert(resD3Unauth.status === 403, 'D.3.1: submit-verification by unassigned technician rejected with HTTP 403');

    // D.4: Reassignment-cycle restrictions
    const caseD4 = createAcceptedCase('پرونده تست انتساب مجدد');
    await fetch(`${baseUrl}/cases/${caseD4.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام تکنسین الف قبل از سلب انتساب'
      })
    });
    // Reassign case to Tech B
    maintenanceRepository.updateCase(caseD4.id, {
      assignedTechnicianId: techUserB.id,
      assignedTechnicianName: 'تکنسین ب آزمایشی',
      assignedTechnicianPhone: '09124440099',
      status: 'ASSIGNED'
    });
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseD4.id,
      technicianId: techUserB.id,
      assignedBy: adminUser.id,
      status: 'ASSIGNED',
      notes: 'تخصیص مجدد به تکنسین ب'
    });

    // Tech A attempts submit-verification after reassignment
    const resD4Former = await fetch(`${baseUrl}/cases/${caseD4.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش تکنسین قبلی برای ارسال به تایید'
      })
    });
    assert(resD4Former.status === 403, 'D.4.1: Former technician submit-verification rejected with HTTP 403 after reassignment');

    // D.5: Terminal-state restrictions
    const caseClosed = createAcceptedCase('پرونده بسته شده');
    maintenanceRepository.updateCase(caseClosed.id, { status: 'CLOSED' });
    const resClosed = await fetch(`${baseUrl}/cases/${caseClosed.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش بر روی پرونده بسته شده'
      })
    });
    assert(resClosed.status === 400, 'D.5.1: submit-verification on CLOSED case returns HTTP 400');

    const caseCancelled = createAcceptedCase('پرونده لغو شده');
    maintenanceRepository.updateCase(caseCancelled.id, { status: 'CANCELLED' });
    const resCancelled = await fetch(`${baseUrl}/cases/${caseCancelled.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش بر روی پرونده لغو شده'
      })
    });
    assert(resCancelled.status === 400, 'D.5.2: submit-verification on CANCELLED case returns HTTP 400');

    // D.6: Action requirement for submit-verification
    const caseNoAction = createAcceptedCase('پرونده بدون اقدام');
    const resNoAction = await fetch(`${baseUrl}/cases/${caseNoAction.id}/submit-verification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resolutionSummary: 'تلاش برای تایید پرونده بدون ثبت هیچ اقدام'
      })
    });
    assert(resNoAction.status === 400, 'D.6.1: submit-verification without any recorded actions returns HTTP 400');

    // D.7: Persistence failure injection returns 500 without corruption
    const caseFail = createAcceptedCase('پرونده تست خطای دیسک در ارسال به تایید');
    await fetch(`${baseUrl}/cases/${caseFail.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام قبل از تزریق خطا'
      })
    });

    try {
      db.__setTestWriteFailureHook((stage) => {
        if (stage === 'before_atomic_rename') {
          throw new Error('EIO: injected disk failure during atomic write');
        }
      });

      const resFail = await fetch(`${baseUrl}/cases/${caseFail.id}/submit-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${techTokenA}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resolutionSummary: 'ارسال با خطای ذخیره‌سازی'
        })
      });

      assert(resFail.status === 500, 'D.8.1: Injected write failure in submit-verification returns sanitized HTTP 500');
      const err500 = await resFail.json();
      assert(!JSON.stringify(err500).includes('/'), 'D.8.2: HTTP 500 response does not leak internal filesystem paths');
    } finally {
      db.__setTestWriteFailureHook(null);
    }

    const caseFailAfter = maintenanceRepository.getCaseById(caseFail.id)!;
    assert(caseFailAfter.status === 'IN_PROGRESS', 'D.8.3: Case status remained IN_PROGRESS after write failure');

    // D.9: Failure in secondary activity logging after the authoritative write
    const caseSecondary = createAcceptedCase('پرونده تست خطای لاگ فعالیت ثانویه');
    // Ensure case is linked to a project so addActivity is invoked
    maintenanceRepository.updateCase(caseSecondary.id, { projectId: 'PRJ-TEST-PROJECT-123' });

    await fetch(`${baseUrl}/cases/${caseSecondary.id}/actions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${techTokenA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actionType: 'REPAIR',
        description: 'اقدام اولیه جهت آماده‌سازی برای تست خطای لاگ ثانویه'
      })
    });

    const origAddActivity = projectRepository.addActivity;
    let addActivityAttempted = false;
    try {
      projectRepository.addActivity = () => {
        addActivityAttempted = true;
        throw new Error('SIMULATED_SECONDARY_ACTIVITY_FAILURE: Disk error or project missing');
      };

      const resSecondaryFail = await fetch(`${baseUrl}/cases/${caseSecondary.id}/submit-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${techTokenA}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resolutionSummary: 'ارسال جهت تایید علیرغم خطای ثبت در لاگ ثانویه پروژه'
        })
      });

      assert(resSecondaryFail.status === 200, 'D.9.1: Secondary activity failure does not fail the authoritative submission (HTTP 200)');
      assert(addActivityAttempted, 'D.9.2: Secondary activity write was attempted and threw');
      const caseSecAfter = maintenanceRepository.getCaseById(caseSecondary.id)!;
      assert(caseSecAfter.status === 'AWAITING_VERIFICATION', 'D.9.3: Authoritative case status committed to AWAITING_VERIFICATION');
    } finally {
      projectRepository.addActivity = origAddActivity;
    }

    // =========================================================================
    // SECTION E: FINANCIAL PATCH SECURITY
    // =========================================================================
    console.log('\n--- SECTION E: FINANCIAL PATCH SECURITY ---');

    const caseE = createAcceptedCase('پرونده تست امنیت ویرایش مستقیم');

    // E.1: Prohibited financial fields in PATCH
    const prohibitedTests = [
      { field: 'laborCost', value: 5000000 },
      { field: 'partsCost', value: 8000000 },
      { field: 'totalCost', value: 13000000 },
      { field: 'totalCostIrr', value: 13000000 },
      { field: 'totalLaborHours', value: 20 }
    ];

    for (const test of prohibitedTests) {
      const resPatchProhibited = await fetch(`${baseUrl}/cases/${caseE.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${customerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [test.field]: test.value
        })
      });
      assert(resPatchProhibited.status === 400, `E.1: Direct PATCH with prohibited field '${test.field}' returns HTTP 400`);
      const patchBody = await resPatchProhibited.json();
      assert(Array.isArray(patchBody.prohibitedFields) && patchBody.prohibitedFields.includes(test.field),
        `E.1: PATCH response identifies '${test.field}' as prohibited`);
    }

    // E.2: Direct status manipulation defense
    const resPatchStatus = await fetch(`${baseUrl}/cases/${caseE.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'RESOLVED'
      })
    });
    assert(resPatchStatus.status === 400, 'E.2.1: Direct PATCH status change returns HTTP 400');

    // E.3: PATCH on terminal cases
    const caseTerminal = createAcceptedCase('پرونده پایانی جهت ویرایش');
    maintenanceRepository.updateCase(caseTerminal.id, { status: 'CANCELLED' });
    const resPatchTerminal = await fetch(`${baseUrl}/cases/${caseTerminal.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'تغییر عنوان پرونده لغو شده'
      })
    });
    assert(resPatchTerminal.status === 400, 'E.3.1: PATCH on CANCELLED case returns HTTP 400');

    // E.4: Authorized allowed fields update
    const resPatchAllowed = await fetch(`${baseUrl}/cases/${caseE.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'عنوان به‌روزرسانی شده معتبر',
        description: 'شرح عیب به‌روزرسانی شده',
        priority: 'CRITICAL'
      })
    });
    assert(resPatchAllowed.status === 200, 'E.4.1: Authorized PATCH with allowed fields returns HTTP 200');
    const updatedAllowedCase = maintenanceRepository.getCaseById(caseE.id)!;
    assert(updatedAllowedCase.title === 'عنوان به‌روزرسانی شده معتبر', 'E.4.2: Case title updated correctly');
    assert(updatedAllowedCase.priority === 'CRITICAL', 'E.4.3: Case priority updated correctly');

    // =========================================================================
    // SECTION F: DATABASE INTEGRITY & ISOLATION
    // =========================================================================
    console.log('\n--- SECTION F: DATABASE INTEGRITY & ISOLATION ---');

    // F.1: Verify isolation
    assert(db.getDBPath().includes(path.sep), 'F.1.1: Active database path is isolated');
    assert(db.getDBPath() !== isolation.repoDbPath, 'F.1.2: Active database path is strictly separate from repo db.json');

    console.log('\n================================================================');
    console.log(`ALL PHASE 2C-1B-2A TESTS PASSED! (${passed} assertions)`);
    console.log('================================================================\n');

  } catch (err: any) {
    testError = err;
    console.error('\n[FATAL TEST FAILURE]:', err);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    isolation.cleanup();
  }

  if (testError) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
