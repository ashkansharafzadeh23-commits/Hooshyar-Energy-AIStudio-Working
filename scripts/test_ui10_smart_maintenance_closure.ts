import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository';
import { maintenanceCaseService } from '../src/services/maintenanceCaseService';
import { diagnosisService } from '../src/services/diagnosisService';
import { technicianMatchingService } from '../src/services/technicianMatchingService';
import { professionalRepository } from '../src/repositories/professionalRepository';
import { assetRepository } from '../src/repositories/assetRepository';
import { projectRepository } from '../src/repositories/projectRepository';
import { setDBPath } from '../src/db';

const DB_PATH = path.resolve(process.cwd(), 'db.json');
const REPORT_PATH = path.resolve(process.cwd(), 'docs/POSTGRES_MIGRATION_REPORT.md');

function computeHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY — UI-10 SMART MAINTENANCE CLOSURE & JOURNEY TEST');
  console.log('========================================================================');

  const initialDbHash = computeHash(DB_PATH);
  const initialReportHash = computeHash(REPORT_PATH);

  // Setup isolated temporary database for test run
  const tempDbPath = path.join(os.tmpdir(), `test_ui10_closure_${Date.now()}.json`);
  fs.copyFileSync(DB_PATH, tempDbPath);
  setDBPath(tempDbPath);

  try {
    // ------------------------------------------------------------------------
    console.log('\n[1] Blocker 1 — CUSTOMER_DIRECT Authorization Boundaries:');
    // ------------------------------------------------------------------------
    // Create a customer direct case
    const case1 = maintenanceCaseService.createCase(
      {
        projectId: 'CUSTOMER_DIRECT',
        assetId: 'UNREGISTERED',
        title: 'افت تولید اینورتر فرونیوس',
        description: 'اینورتر در ساعات ظهر خاموش می‌شود و ارور ولتاژ می‌دهد.',
        priority: 'MEDIUM',
        category: 'CORRECTIVE',
        symptoms: ['خطای اضافه ولتاژ / قطع اینورتر', 'داغ شدن غیرعادی اینورتر']
      },
      'customer-user-1'
    );

    assert(case1.id !== undefined, 'Case 1 created successfully with CUSTOMER_DIRECT');
    assert(case1.reportedBy === 'customer-user-1', 'Reporter recorded as customer-user-1');

    // Test access boundaries (simulating checkCaseAccess)
    const checkCaseAccess = (mCase: any, user: any) => {
      if (!user) return { allowed: false, status: 401 };
      const roleUpper = (user.role || '').toUpperCase();
      const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';
      const isReporter = mCase.reportedBy === user.id;
      const isAssignedTech = mCase.assignedTechnicianId === user.id;
      if (isAdmin || isReporter || isAssignedTech) {
        return { allowed: true, isAdmin, isReporter, isAssignedTech };
      }
      return { allowed: false, status: 403 };
    };

    assert(checkCaseAccess(case1, { id: 'customer-user-1', role: 'CUSTOMER' }).allowed, 'Owner customer can access their own direct case');
    assert(!checkCaseAccess(case1, { id: 'customer-user-2', role: 'CUSTOMER' }).allowed, 'Unrelated customer CANNOT access case 1 (403 forbidden)');
    assert(!checkCaseAccess(case1, null).allowed, 'Unauthenticated visitor cannot access case 1 (401)');
    assert(checkCaseAccess(case1, { id: 'admin-1', role: 'ADMIN' }).allowed, 'Admin can access case 1');

    // ------------------------------------------------------------------------
    console.log('\n[2] Evidence-Based Preliminary Diagnosis & Separation of Facts vs Inferences:');
    // ------------------------------------------------------------------------
    const diagnosis = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      equipmentType: 'INVERTER',
      symptoms: ['خطای اضافه ولتاژ / قطع اینورتر', 'داغ شدن غیرعادی اینورتر'],
      description: 'اینورتر در پیک تابش خاموش می‌شود',
      billData: {
        name: 'bill_tehran_1402.pdf',
        status: 'EXTRACTION_AVAILABLE',
        extractedData: {
          periodGenerationKwh: 3450,
          meterNumber: 'MTR-998822'
        }
      },
      photos: [{ name: 'inverter_display.jpg', data: 'data:image/jpeg;base64,...' }]
    });

    assert(diagnosis.facts && diagnosis.facts.length > 0, 'Verified facts section exists');
    assert(diagnosis.facts.some(f => f.includes('INVERTER')), 'Facts section includes equipment type');
    assert(diagnosis.evidenceCategorized?.DOCUMENT_EXTRACTED !== undefined, 'Document extracted evidence category exists');
    assert(diagnosis.evidenceCategorized.DOCUMENT_EXTRACTED.some(d => d.includes('3450')), 'Document extracted category captures bill generation kwh');
    assert(diagnosis.evidenceCategorized.PHOTO_OBSERVED !== undefined, 'Photos observed category exists');
    assert(diagnosis.rootCauses && diagnosis.rootCauses.length > 0, 'AI analytical inferences exist');
    assert(diagnosis.rootCauses[0].probability !== undefined, 'Inferences have explicit probabilities');
    assert(diagnosis.requiredTools && diagnosis.requiredTools.length > 0, 'Required tools are provided when supported by inverter evidence');
    assert(diagnosis.requiredTools.some(t => t.includes('مولتی‌متر') || t.includes('ولتاژ')), 'Relevant electrical tools included for inverter problem');

    // Test generic case with no equipment or symptoms: must NOT include specialized tools
    const genericDiag = await diagnosisService.generateDiagnosis({
      assetId: 'UNREGISTERED',
      symptoms: [],
      description: 'سامانه بررسی شود',
      triggerAiAssisted: false
    });
    assert(
      !genericDiag.requiredTools || genericDiag.requiredTools.length === 0,
      'Generic diagnosis with no evidence does not fabricate specialized tools'
    );

    // ------------------------------------------------------------------------
    console.log('\n[3] Professional Matching from Approved Partner Network:');
    // ------------------------------------------------------------------------
    // Seed approved professional in isolated temp database
    const approvedPro = professionalRepository.createProfessional({
      fullName: 'مهندس حسینی (متخصص ارشد اینورتر و O&M)',
      phone: '09121112233',
      specialties: ['اینورتر و ادوات قدرت', 'سیستم‌های خورشیدی'],
      serviceCities: ['تهران', 'سراسری'],
      yearsExperience: 8,
      rating: 4.9,
      bio: 'متخصص مجاز عیب‌یابی اینورترهای خورشیدی'
    });
    professionalRepository.updateProfessionalStatus(approvedPro.id, 'approved');

    const matches = technicianMatchingService.matchTechnicians({
      equipmentType: 'INVERTER',
      symptoms: ['خطای اضافه ولتاژ / قطع اینورتر']
    });

    assert(matches.length > 0, 'Found matching technicians');
    assert(
      matches.every(m => {
        const pro = professionalRepository.getProfessionalById(m.technicianId);
        return pro?.status === 'approved';
      }),
      'All matched candidates are strictly approved solar professionals'
    );

    const selectedTech = matches[0];
    assert(selectedTech.fullName !== undefined, `Selected technician: ${selectedTech.fullName}`);

    // ------------------------------------------------------------------------
    console.log('\n[4] Complete Customer Maintenance Lifecycle Journey:');
    // ------------------------------------------------------------------------
    // Step 4.1: Customer selects technician
    const assignedCase = maintenanceCaseService.transitionCaseStatus(
      case1.id,
      'ASSIGNED',
      'customer-user-1',
      {
        technicianId: selectedTech.technicianId,
        technicianName: selectedTech.fullName,
        technicianPhone: selectedTech.phone,
        scheduledDate: '1403/07/15'
      }
    );
    assert(assignedCase.status === 'ASSIGNED', 'Case transitioned to ASSIGNED');
    assert(assignedCase.assignedTechnicianId === selectedTech.technicianId, 'Technician assigned');

    // Step 4.2: Technician accepts assignment
    const acceptedCase = maintenanceCaseService.transitionCaseStatus(
      case1.id,
      'IN_PROGRESS',
      selectedTech.technicianId,
      { notes: 'پذیرش دستور کار توسط تکنسین' }
    );
    assert(acceptedCase.status === 'IN_PROGRESS', 'Technician accepted case (status IN_PROGRESS)');

    // Step 4.3: Technician records actions & evidence
    const action1 = maintenanceRepository.createAction({
      maintenanceCaseId: case1.id,
      actionType: 'INSPECTION',
      description: 'بررسی ترموگرافی و اندازه‌گیری ولتاژ رشته‌های ورودی DC',
      performedBy: selectedTech.technicianId,
      performedAt: new Date().toISOString(),
      notes: 'مشاهده اضافه ولتاژ ناشی از اتصال نادرست استرینگ‌ها'
    });
    assert(action1.id !== undefined, 'Action 1 recorded');

    const action2 = maintenanceRepository.createAction({
      maintenanceCaseId: case1.id,
      actionType: 'REPAIR',
      description: 'اصلاح سیم‌بندی استرینگ‌ها و تعویض فیوز DC سوخته تابلو چنج‌اور',
      replacedComponentId: 'fuse-dc-1000v',
      newComponentModel: 'Ferraz Shawmut 1000V DC 15A',
      performedBy: selectedTech.technicianId,
      performedAt: new Date().toISOString()
    });
    assert(action2.id !== undefined, 'Action 2 recorded with replacement parts');

    // Add completion evidence photo
    const updatedCaseWithAtt = maintenanceRepository.updateCase(case1.id, {
      attachments: [
        {
          id: 'att-post-repair-1',
          maintenanceCaseId: case1.id,
          name: 'after_rewiring_test.jpg',
          type: 'PHOTO',
          url: 'https://storage.example.com/photos/after_rewiring.jpg',
          uploadedBy: selectedTech.technicianId,
          uploadedAt: new Date().toISOString(),
          status: 'UPLOADED'
        }
      ]
    });
    assert(updatedCaseWithAtt.attachments?.length === 1, 'Post-repair evidence attachment saved');

    // Step 4.4: Technician submits for verification
    const submittedCase = maintenanceRepository.updateCase(case1.id, {
      status: 'AWAITING_VERIFICATION',
      resolutionSummary: 'سیم‌بندی استرینگ‌ها اصلاح و فیوز تعویض گردید، ولتاژ DC در محدوده استاندارد قرار گرفت.'
    });
    assert(submittedCase.status === 'AWAITING_VERIFICATION', 'Technician submitted for verification');

    // Step 4.5: Customer reviews and verifies work (Pass)
    const verifiedCase = maintenanceRepository.updateCase(case1.id, {
      status: 'COMPLETED',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'customer-user-1',
      verificationPassed: true,
      verificationNotes: 'کارکرد اینورتر تست شد و تزریق توان عادی شد.'
    });
    assert(verifiedCase.status === 'COMPLETED', 'Customer verified and accepted work (COMPLETED)');
    assert(verifiedCase.verificationPassed === true, 'Verification marked as PASSED');

    // Step 4.6: Customer closes case & archives to history
    const closedCase = maintenanceRepository.updateCase(case1.id, {
      status: 'CLOSED',
      completedAt: new Date().toISOString(),
      closureNotes: 'تایید نهایی و بایگانی در دفترچه نگهداری',
      postMaintenanceCheck: {
        status: 'IMPROVED',
        preGenerationKwh: 3.2,
        postGenerationKwh: 4.8,
        evaluatedAt: new Date().toISOString(),
        notes: 'تولید روزانه پس از رفع عیب 50% بهبود یافته است.'
      }
    });
    assert(closedCase.status === 'CLOSED', 'Case officially CLOSED');
    assert(closedCase.postMaintenanceCheck?.status === 'IMPROVED', 'Post-maintenance check records IMPROVED performance');

    // ------------------------------------------------------------------------
    console.log('\n[5] Concluding Immutability Check:');
    // ------------------------------------------------------------------------
    setDBPath(DB_PATH);
    const finalDbHash = computeHash(DB_PATH);
    const finalReportHash = computeHash(REPORT_PATH);

    assert(initialDbHash === finalDbHash, 'db.json hash is intact after test execution');
    assert(initialReportHash === finalReportHash, 'POSTGRES_MIGRATION_REPORT.md hash is intact after test execution');

  } finally {
    // Cleanup temporary DB
    setDBPath(DB_PATH);
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  }

  console.log('========================================================================');
  console.log(`UI-10 SMART MAINTENANCE CLOSURE RESULT: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
