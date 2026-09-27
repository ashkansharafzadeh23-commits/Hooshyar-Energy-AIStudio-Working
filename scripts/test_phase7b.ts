import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../src/db/index.js';
import { projectRepository } from '../src/repositories/projectRepository.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { alertService } from '../src/services/alertService.js';
import { diagnosisService } from '../src/services/diagnosisService.js';
import { maintenanceCaseService } from '../src/services/maintenanceCaseService.js';
import { technicianMatchingService } from '../src/services/technicianMatchingService.js';

async function runPhase7bTestSuite() {
  console.log('================================================================');
  console.log('HOOSHYAR ENERGY — PHASE 7-B INTEGRATION TEST SUITE (ISOLATED)');
  console.log('ALERT ENGINE + DIAGNOSIS + MAINTENANCE CASE + TECHNICIAN MATCHING');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // STEP 0: Storage Isolation Setup
  const originalDbPath = db.getDBPath();
  const originalDbExists = fs.existsSync(originalDbPath);
  const originalDbContent = originalDbExists ? fs.readFileSync(originalDbPath, 'utf-8') : null;

  const tempDbFile = path.join(
    os.tmpdir(),
    `hooshyar_phase7b_test_${Date.now()}_${Math.random().toString(36).substring(7)}.json`
  );

  console.log(`[ISOLATION] Original DB Path: ${originalDbPath}`);
  console.log(`[ISOLATION] Setting temporary isolated DB Path: ${tempDbFile}`);
  db.setDBPath(tempDbFile);

  try {
    assert(db.getDBPath() === tempDbFile, 'Database path successfully set to isolated temp DB');

    // 1. Seed Users and Roles
    console.log('\n--- Test 1: Seed Users and Roles ---');
    const ownerUser = db.createUser({
      phone: '09121111111',
      name: 'مالک نیروگاه',
      role: 'CUSTOMER'
    });
    const technicianUser = db.createUser({
      phone: '09122222222',
      name: 'مهندس حسینی',
      role: 'TECHNICIAN'
    });
    const technicianUser2 = db.createUser({
      phone: '09123333333',
      name: 'مهندس رضایی',
      role: 'TECHNICIAN'
    });
    const unauthorizedUser = db.createUser({
      phone: '09129999999',
      name: 'کاربر غیرمجاز',
      role: 'CUSTOMER'
    });

    assert(Boolean(ownerUser && technicianUser), 'Users created successfully');

    // Seed Professional Profiles
    const techProfile1 = db.createProfessional({
      fullName: 'مهندس حسینی',
      phone: '09122222222',
      specialties: ['اینورتر', 'برق', 'inverter'],
      serviceCities: ['یزد', 'میبد', 'اردکان'],
      yearsExperience: 7,
      bio: 'متخصص مجاز عیب‌یابی و تعمیر اینورترهای خورشیدی',
      profileImageUrl: '',
      certifications: [{ title: 'مدرک بین‌المللی اینورتر SMA', imageUrl: '' }]
    });
    db.updateProfessionalStatus(techProfile1.id, 'approved');
    db.updateProfessional(techProfile1.id, { rating: 4.8 });

    const techProfile2 = db.createProfessional({
      fullName: 'مهندس رضایی',
      phone: '09123333333',
      specialties: ['پنل خورشیدی', 'سازه', 'cleaning'],
      serviceCities: ['تهران', 'کرج'],
      yearsExperience: 4,
      bio: 'کارشناس نصب و سرویس پنل',
      profileImageUrl: '',
      certifications: []
    });
    db.updateProfessionalStatus(techProfile2.id, 'approved');
    db.updateProfessional(techProfile2.id, { rating: 4.5 });

    assert(Boolean(techProfile1 && techProfile2), 'Technician profiles seeded and approved');

    // 2. Seed Project & Asset with Warranty
    console.log('\n--- Test 2: Seed Project & Energy Asset with Warranty ---');
    const project = projectRepository.create({
      projectCode: 'PRJ-MNT-7B',
      title: 'نیروگاه خورشیدی ۵۰۰ کیلووات تفت',
      projectType: 'SOLAR',
      status: 'OPERATIONAL',
      ownerId: ownerUser.id,
      targetCapacityKw: 500,
      location: {
        country: 'Iran',
        province: 'یزد',
        city: 'یزد',
        address: 'شهرک صنعتی تفت'
      }
    });

    const asset = assetRepository.createAsset({
      projectId: project.id,
      name: 'دارایی اصلی نیروگاه تفت',
      assetType: 'SOLAR',
      location: 'یزد، تفت',
      installedCapacityKw: 500,
      technology: 'Monocrystalline Silicon + Central Inverter',
      verificationStatus: 'VERIFIED',
      passportVersion: 1,
      commissioningDate: new Date('2024-01-01').toISOString(),
      commercialOperationDate: new Date('2024-01-10').toISOString(),
      status: 'OPERATIONAL'
    });

    const component = assetRepository.createAssetComponent({
      assetId: asset.id,
      componentType: 'INVERTER',
      manufacturer: 'SMA',
      brand: 'SMA',
      model: 'Sunny Tripower 50kW',
      serialNumber: 'SMA-2024-0091',
      quantity: 1,
      ratedCapacity: 50,
      status: 'OPERATIONAL'
    });

    const warranty = assetRepository.createEquipmentWarranty({
      assetId: asset.id,
      projectId: project.id,
      componentId: component.id,
      warrantyType: 'MANUFACTURER',
      warrantyProvider: 'نمایندگی رسمی SMA ایران',
      startDate: '2024-01-01',
      endDate: '2029-01-01',
      coverageSummary: 'پوشش کامل قطعات و بردهای الکترونیکی در صورت عدم نوسان غیرمجاز',
      claimProcedure: 'ارائه گزارش تست مقاومت عایقی و تماس با پشتیبانی رسمی',
      status: 'ACTIVE'
    });

    assert(Boolean(project && asset), 'Project and Asset created');
    assert(Boolean(warranty && warranty.status === 'ACTIVE'), 'Equipment warranty seeded and active');

    // 3. Alert Generation & Ingestion
    console.log('\n--- Test 3: Alert Engine Evaluation & Ingestion ---');
    const alert = maintenanceRepository.createAlert({
      projectId: project.id,
      assetId: asset.id,
      componentId: 'cmp-inv-1',
      alertType: 'INVERTER_FAULT',
      severity: 'HIGH',
      status: 'TRIGGERED',
      title: 'افت ولتاژ DC و توقف تولید استرینگ اینورتر شماره ۱',
      description: 'کاهش توان خروجی به دلیل اضافه دمای هیت‌سینک و افت ولتاژ ورودی DC',
      observedValue: 380,
      thresholdValue: 600,
      deviationPercent: -36.6,
      metricType: 'V_DC'
    });

    assert(Boolean(alert.id && alert.alertCode.startsWith('ALT-')), `Alert created with code: ${alert.alertCode}`);
    assert(alert.status === 'TRIGGERED', 'Alert initial status is TRIGGERED');

    // Alert query filter
    const projectAlerts = maintenanceRepository.getAlerts(project.id);
    assert(projectAlerts.length >= 1, `Retrieved ${projectAlerts.length} alert(s) for project`);

    // Acknowledge alert
    const ackAlert = alertService.acknowledgeAlert(alert.id, ownerUser.id);
    assert(ackAlert.status === 'ACKNOWLEDGED', 'Alert acknowledged successfully');
    assert(Boolean(ackAlert.acknowledgedAt), 'Acknowledged timestamp recorded');

    // 4. Diagnosis & Warranty Analysis Engine
    console.log('\n--- Test 4: Diagnosis Engine & Warranty Impact ---');
    const diagnosis = await diagnosisService.diagnoseAlert(alert.id, { triggerAiAssisted: false });
    
    assert(Boolean(diagnosis.id), `Diagnosis generated: ${diagnosis.id}`);
    assert(diagnosis.rootCauses && diagnosis.rootCauses.length > 0, 'Root causes identified');
    assert(diagnosis.warrantyImpact !== undefined, 'Warranty impact evaluated');
    assert(diagnosis.warrantyImpact?.hasWarrantyCoverage === true || diagnosis.warrantyImpact?.eligible === true, 'Warranty coverage correctly detected for SMA Inverter');
    assert(diagnosis.actions && diagnosis.actions.length > 0, 'Recommended maintenance actions formulated');

    // 5. Maintenance Case Creation & Association
    console.log('\n--- Test 5: Maintenance Case Creation from Alert ---');
    const mCase = maintenanceCaseService.createCase({
      projectId: project.id,
      assetId: asset.id,
      alertIds: [alert.id],
      diagnosisId: diagnosis.id,
      title: 'تعمیر و بازرسی اینورتر شماره ۱',
      description: 'افت ولتاژ DC و تعویض فیوز استرینگ',
      priority: 'HIGH',
      category: 'CORRECTIVE'
    }, ownerUser.id);

    assert(Boolean(mCase.id && (mCase.caseNumber || mCase.maintenanceCode)), `Case created with code: ${mCase.caseNumber || mCase.maintenanceCode}`);
    assert(mCase.status === 'OPEN', 'Case initial status is OPEN');
    assert(mCase.alertIds.includes(alert.id), 'Case linked to alert ID');

    // Check alert updated with maintenanceCaseId
    const updatedAlert = maintenanceRepository.getAlertById(alert.id);
    assert(updatedAlert?.maintenanceCaseId === mCase.id, 'Alert updated with linked maintenanceCaseId');
    assert(updatedAlert?.status === 'CASE_CREATED', 'Alert status moved to CASE_CREATED');

    // 6. Smart Technician Matching
    console.log('\n--- Test 6: Smart Technician Matching ---');
    const matches = technicianMatchingService.matchTechniciansForCase(mCase.id);
    assert(matches.length > 0, `Technician matching found ${matches.length} candidate(s)`);
    assert(matches[0].fullName === 'مهندس حسینی', `Top match is ${matches[0].fullName} (Inverter specialist in Yazd)`);
    assert(matches[0].matchScore >= 70, `Top match score is ${matches[0].matchScore}% (>= 70%)`);

    // Assign Technician
    console.log('\n--- Test 7: Assign Technician to Case ---');
    const assignedCase = maintenanceCaseService.transitionCaseStatus(
      mCase.id,
      'ASSIGNED',
      ownerUser.id,
      {
        technicianId: matches[0].technicianId,
        technicianName: matches[0].fullName,
        technicianPhone: matches[0].phone
      }
    );

    assert(assignedCase.assignedTechnicianId === matches[0].technicianId, 'Technician assigned to case');
    assert(assignedCase.status === 'ASSIGNED', 'Case status moved to ASSIGNED');

    // Record Assignment History Log
    const assignmentLog = maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: mCase.id,
      technicianId: matches[0].technicianId,
      assignedBy: ownerUser.id,
      assignedAt: new Date().toISOString(),
      status: 'ASSIGNED',
      notes: 'ارجاع هوشمند بر اساس تطابق تخصص و نزدیکی به محل پروژه'
    });
    assert(Boolean(assignmentLog.id), 'Assignment history log recorded');

    // 7. Service Execution & Action Logging
    console.log('\n--- Test 8: Service Execution & Action Logging ---');
    // Start case: ASSIGNED -> IN_PROGRESS
    const inProgressCase = maintenanceCaseService.transitionCaseStatus(
      mCase.id,
      'IN_PROGRESS',
      technicianUser.id
    );
    assert(inProgressCase.status === 'IN_PROGRESS', 'Case status updated to IN_PROGRESS');

    // Log Inspection Action
    const action1 = maintenanceCaseService.addAction(mCase.id, {
      actionType: 'INSPECTION',
      description: 'بررسی فیزیکی کانکتورهای MC4 و سنسور دمای هیت‌سینک',
      performedBy: 'مهندس حسینی',
      resultStatus: 'SUCCESS',
      laborHours: 1.5,
      costIrr: 5000000,
      notes: 'گرد و خاک شدید روی فن خنک‌کننده مشاهده شد.'
    });

    // Log Repair & Cleaning Action
    const action2 = maintenanceCaseService.addAction(mCase.id, {
      actionType: 'REPAIR',
      description: 'تعویض فیوز DC استرینگ و سرویس فن خنک‌کننده',
      performedBy: 'مهندس حسینی',
      resultStatus: 'SUCCESS',
      laborHours: 2.0,
      costIrr: 12000000,
      notes: 'کانکتورهای سوخته تعویض گردیدند.'
    });

    assert(Boolean(action1.id && action2.id), 'Maintenance actions logged');

    // Verify Case Action aggregation
    const caseAfterActions = maintenanceRepository.getCaseById(mCase.id);
    assert((caseAfterActions?.totalLaborHours || 0) >= 3.5, `Total labor hours calculated: ${caseAfterActions?.totalLaborHours} hrs`);
    assert((caseAfterActions?.totalCostIrr || 0) >= 17000000, `Total cost aggregated: ${caseAfterActions?.totalCostIrr?.toLocaleString()} IRR`);

    // Add Spare Parts
    maintenanceCaseService.addSpareParts(mCase.id, [
      {
        partName: 'فیوز فتوولتائیک 1000V DC',
        quantity: 2,
        costIrr: 2500000
      }
    ]);
    const caseAfterParts = maintenanceRepository.getCaseById(mCase.id);
    assert((caseAfterParts?.totalCostIrr || 0) >= 22000000, 'Spare parts cost incorporated');

    // 8. Workflow Status Transitions & Verification
    console.log('\n--- Test 9: Workflow Transitions & Verification ---');
    // IN_PROGRESS -> PENDING_VERIFICATION
    const pendingVerifCase = maintenanceCaseService.transitionCaseStatus(
      mCase.id,
      'PENDING_VERIFICATION',
      technicianUser.id
    );
    assert(pendingVerifCase.status === 'PENDING_VERIFICATION', 'Case status moved to PENDING_VERIFICATION');

    // PENDING_VERIFICATION -> VERIFIED
    const verifiedCase = maintenanceCaseService.transitionCaseStatus(
      mCase.id,
      'VERIFIED',
      ownerUser.id,
      {
        verificationNotes: 'ولتاژ استرینگ و جریان ورودی اینورتر در مانیتورینگ آنلاین تایید شد.'
      }
    );
    assert(verifiedCase.status === 'VERIFIED', 'Case status moved to VERIFIED');

    // 9. Case Closure & Resolution
    console.log('\n--- Test 10: Case Closure & Downtime Recording ---');
    maintenanceRepository.updateCase(mCase.id, {
      downtimeMinutes: 180,
      resolutionSummary: 'نقص اتصال DC اینورتر با موفقیت برطرف و قطعات تحت پوشش گارانتی تعویض شد.'
    });
    const closedCase = maintenanceCaseService.transitionCaseStatus(
      mCase.id,
      'CLOSED',
      ownerUser.id,
      {
        closureNotes: 'نقص اتصال DC اینورتر با موفقیت برطرف و قطعات تحت پوشش گارانتی تعویض شد.'
      }
    );

    assert(closedCase.status === 'CLOSED', 'Case status successfully closed');
    assert(closedCase.downtimeMinutes === 180, 'Downtime minutes accurately recorded (180 mins)');
    assert(Boolean(closedCase.completedDate), 'Case completion timestamp set');

    // Associated Alert should be resolved
    const alertAfterCaseClose = maintenanceRepository.getAlertById(alert.id);
    assert(alertAfterCaseClose?.status === 'RESOLVED', 'Associated alert status updated to RESOLVED on case closure');

    // 10. Maintenance History & KPI Aggregation
    console.log('\n--- Test 11: Maintenance History & KPI Aggregation ---');
    const historySummary = maintenanceCaseService.getMaintenanceHistory(asset.id);
    assert(historySummary.totalCases >= 1, `History total cases: ${historySummary.totalCases}`);
    assert(historySummary.resolvedCases >= 1, `History resolved cases: ${historySummary.resolvedCases}`);
    assert(historySummary.totalLaborHours >= 3.5, `History total labor hours: ${historySummary.totalLaborHours}`);
    assert(historySummary.totalCostIrr >= 22000000, `History total cost: ${historySummary.totalCostIrr.toLocaleString()} IRR`);

    // 11. Standalone Manual Case Creation
    console.log('\n--- Test 12: Standalone Manual Case Creation ---');
    const manualCase = maintenanceCaseService.createCase({
      projectId: project.id,
      assetId: asset.id,
      title: 'شستشوی دوره‌ای پنل‌های استرینگ جنوبی',
      description: 'گردگیری دوره‌ای سه ماهه جهت افزایش راندمان',
      priority: 'LOW',
      category: 'PREVENTIVE'
    }, ownerUser.id);
    assert(Boolean(manualCase.id && manualCase.status === 'OPEN'), 'Manual preventive case created');

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

  } finally {
    // RESTORE & VERIFY ISOLATION
    console.log('[ISOLATION] Restoring original database path...');
    db.setDBPath(originalDbPath);

    // Verify temp file exists and was used
    if (fs.existsSync(tempDbFile)) {
      const tempContent = fs.readFileSync(tempDbFile, 'utf-8');
      assert(tempContent.includes('PRJ-MNT-7B'), 'Temporary DB contained all test entities');
      // Clean up temp file
      fs.unlinkSync(tempDbFile);
      console.log('[ISOLATION] Temporary test DB file deleted successfully.');
    }

    // Verify production DB is completely untouched
    if (originalDbExists && originalDbContent !== null) {
      const currentOriginalContent = fs.readFileSync(originalDbPath, 'utf-8');
      assert(currentOriginalContent === originalDbContent, 'CRITICAL: Original production DB remained 100% UNCHANGED');
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7bTestSuite().catch(err => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
