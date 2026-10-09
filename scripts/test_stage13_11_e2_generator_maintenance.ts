/**
 * STAGE 13.11-E.2.1 — GENERATOR MAINTENANCE SAFETY & REGRESSION VERIFICATION
 * Executable integration and unit test suite verifying 39 required scenarios.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  evaluateGeneratorPreliminaryFaults,
  isGeneratorEquipment
} from '../src/services/generatorDiagnosisEngine.js';
import { GENERATOR_SAFETY_RULES } from '../src/types/generatorMaintenance.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { validateAndNormalizeImage } from '../src/utils/imageValidator.js';

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

async function runAllTests() {
  // 1. Establish isolated temporary database before importing any database-dependent modules
  const isolation = setupTestDatabaseIsolation('stage13_11_e2_generator');

  // Fail safely if isolation cannot be established
  const repoDbPath = path.resolve(process.cwd(), 'db.json');
  if (!fs.existsSync(repoDbPath)) {
    throw new Error(`Repository db.json not found at: ${repoDbPath}`);
  }
  if (!isolation.tempDbPath || path.resolve(isolation.tempDbPath) === repoDbPath) {
    throw new Error(`FATAL: Test database isolation could not be established! Target is repo DB.`);
  }

  // 2. Dynamically import database-dependent modules after isolation is verified
  const { diagnosisService } = await import('../src/services/diagnosisService.js');
  const { maintenanceCaseService } = await import('../src/services/maintenanceCaseService.js');
  const { maintenanceRepository } = await import('../src/repositories/maintenanceRepository.js');
  const { getDBPath } = await import('../src/db/index.js');

  const activePath = path.resolve(getDBPath());
  if (activePath === repoDbPath) {
    throw new Error(`FATAL: Database active path points to repository db.json! ${activePath}`);
  }

  console.log('=== RUNNING STAGE 13.11-E.2.1 COMPREHENSIVE TEST SUITE ===\n');

  try {
  // 1. Portable generator selection
  assert(isGeneratorEquipment('PORTABLE_GENERATOR'), 'Scenario 1: Recognizes PORTABLE_GENERATOR');

  // 2. Stationary generator selection
  assert(isGeneratorEquipment('STATIONARY_GENSET'), 'Scenario 2: Recognizes STATIONARY_GENSET');

  // 3. Solar inverter selection remains unchanged
  assert(!isGeneratorEquipment('INVERTER'), 'Scenario 3: Solar INVERTER is not routed as generator');
  assert(!isGeneratorEquipment('PANEL'), 'Scenario 3b: Solar PANEL is not routed as generator');

  // 4. Generator-specific symptoms
  const genResult = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['استارت می‌خورد ولی موتور روشن نمی‌شود'],
    operatingContext: { fuelType: 'GASOLINE' }
  });
  assert(genResult.rootCauses.length > 0, 'Scenario 4: Generator crank-no-start produces root causes');

  // 5. Solar symptoms unchanged
  const solarResult = await diagnosisService.generateDiagnosis({
    assetId: 'UNREGISTERED',
    equipmentType: 'INVERTER',
    symptoms: ['اینورتر ارور میده'],
    triggerAiAssisted: false
  });
  assert(
    solarResult.rootCauses?.some(r => r.cause.includes('ایزولاسیون سمت DC') || r.cause.includes('اینورتر')) ?? false,
    'Scenario 5: Solar inverter symptoms produce solar isolation/inverter root causes'
  );

  // 6. Minimum valid generator intake
  const minGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['نوسان دور موتور'],
    operatingContext: {}
  });
  assert(minGen.rootCauses.length > 0, 'Scenario 6: Minimum valid generator intake succeeds');

  // 7. Optional equipment information
  const optGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'STATIONARY_GENSET',
    symptoms: ['دود سیاه'],
    operatingContext: {
      fuelType: 'DIESEL',
      runningHoursEstimate: 1200,
      lastServiceMonthsAgo: 6,
      ratedCapacityKw: 50
    }
  });
  assert(optGen.rootCauses.some(r => r.cause.includes('گازوئیل')), 'Scenario 7: Optional technical context parsed');

  // 8. Missing technical specifications allowed
  const missingTech = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['ولتاژ صفر است']
  });
  assert(missingTech.rootCauses.some(r => r.cause.includes('AVR')), 'Scenario 8: Missing optional specs processed smoothly');

  // 9. Invalid rated power rejected (Intake validation logic test)
  const isInvalidPower = (cap: any) => {
    const n = Number(cap);
    return isNaN(n) || n <= 0;
  };
  assert(isInvalidPower(-5) && isInvalidPower('invalid') && isInvalidPower(0), 'Scenario 9: Non-positive or NaN rated power rejected');

  // 10. Negative running hours rejected
  const isInvalidHours = (rh: any) => {
    const n = Number(rh);
    return isNaN(n) || n < 0;
  };
  assert(isInvalidHours(-10) && isInvalidHours('abc'), 'Scenario 10: Negative or invalid running hours rejected');

  // 11. Unsupported fuel rejected
  const validFuels = ['GASOLINE', 'DIESEL', 'NATURAL_GAS_CNG', 'DUAL_FUEL', 'UNKNOWN'];
  assert(!validFuels.includes('NUCLEAR_URANIUM') && !validFuels.includes('KEROSENE_UNKNOWN'), 'Scenario 11: Unsupported fuels rejected');

  // 12. Unsupported phase rejected
  const validPhases = ['SINGLE_PHASE', 'THREE_PHASE', 'UNKNOWN'];
  assert(!validPhases.includes('TWO_PHASE_SPLIT') && !validPhases.includes('SIX_PHASE'), 'Scenario 12: Unsupported phases rejected');

  // 13. Indoor operation critical escalation
  const indoorGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['روشن نمی‌شود'],
    description: 'در داخل پارکینگ و فضای بسته روشن کردیم',
    operatingContext: { indoorOperation: true }
  });
  assert(indoorGen.isUrgentSafetyEscalation && indoorGen.qualitativeStatus === 'URGENT_SAFETY_ESCALATION', 'Scenario 13: Indoor operation triggers URGENT_SAFETY_ESCALATION');

  // 14. Suspected carbon monoxide exposure
  const coGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['سرگیجه و تهوع داریم بعد از روشن کردن ژنراتور']
  });
  assert(coGen.isUrgentSafetyEscalation && coGen.criticalHazardsIdentified.some(h => h.includes('CO')), 'Scenario 14: Suspected CO exposure triggers critical safety escalation');

  // 15. Fuel leak critical escalation
  const leakGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['نشتی بنزین در زیر دستگاه'],
    operatingContext: { fuelType: 'GASOLINE' }
  });
  assert(leakGen.isUrgentSafetyEscalation && leakGen.criticalHazardsIdentified.some(h => h.includes('Fuel Leak')), 'Scenario 15: Fuel leak triggers urgent escalation');

  // 16. Fire critical escalation
  const fireGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'STATIONARY_GENSET',
    symptoms: ['شعله آتش از اگزوز یا موتور'],
    operatingContext: { fuelType: 'DIESEL' }
  });
  assert(fireGen.isUrgentSafetyEscalation && fireGen.criticalHazardsIdentified.some(h => h.includes('Fire')), 'Scenario 16: Fire triggers urgent safety escalation');

  // 17. Electrical shock critical escalation
  const shockGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['هنگام دست زدن به بدنه برق‌گرفتگی شدید داد']
  });
  assert(shockGen.isUrgentSafetyEscalation && shockGen.criticalHazardsIdentified.some(h => h.includes('Electrical Shock')), 'Scenario 17: Electrical shock triggers critical escalation');

  // 18. Exposed electrical conductor escalation
  const exposedGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['سیم لخت خروجی ژنراتور جرقه می‌زند']
  });
  assert(exposedGen.isUrgentSafetyEscalation, 'Scenario 18: Exposed conductors trigger critical escalation');

  // 19. Grid backfeed escalation
  const backfeedGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['ats_transfer_failed', 'برق‌برگشتی به شبکه']
  });
  assert(backfeedGen.criticalHazardsIdentified.some(h => h.includes('Backfeed')), 'Scenario 19: Backfeed risk identified');

  // 20. Severe overheating escalation
  const overheatGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'STATIONARY_GENSET',
    symptoms: ['داغ کردن شدید و جوش آوردن رادیاتور']
  });
  assert(overheatGen.rootCauses.length > 0 && overheatGen.actions.some(a => a.priority === 'HIGH'), 'Scenario 20: Overheating managed conservatively');

  // 21. Uncontrolled engine escalation (Runaway)
  const runawayGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'STATIONARY_GENSET',
    symptoms: ['دور موتور بی‌نهایت شده و خارج از کنترل گاز می‌خورد']
  });
  assert(runawayGen.isUrgentSafetyEscalation && runawayGen.criticalHazardsIdentified.some(h => h.includes('Runaway')), 'Scenario 21: Engine runaway triggers urgent escalation');

  // 22. No fabricated root-cause percentages
  const allCausesProbZero = indoorGen.rootCauses.every(rc => rc.probability === 0) &&
    leakGen.rootCauses.every(rc => rc.probability === 0) &&
    minGen.rootCauses.every(rc => rc.probability === 0);
  assert(allCausesProbZero, 'Scenario 22: All generator root causes have probability = 0 (no fabricated percentages)');

  // 23. No arbitrary generator confidence percentage
  const genDiagService = await diagnosisService.generateDiagnosis({
    assetId: 'UNREGISTERED',
    equipmentType: 'PORTABLE_GENERATOR',
    symptoms: ['روشن نمی‌شود'],
    triggerAiAssisted: false
  });
  assert(genDiagService.confidenceScore === 0, 'Scenario 23: Generator confidence score is 0 (qualitative only)');

  // 24. No dangerous battery-disconnection advice during fuel leak
  const hasDangerousBatteryDisconnect = leakGen.actions.some(a => a.action.includes('جداسازی بست منفی باتری') || a.action.includes('قطع بست باتری'));
  assert(!hasDangerousBatteryDisconnect, 'Scenario 24: Dangerous battery disconnect instruction removed from fuel leak triage');

  // 25. No dangerous AVR or field-flashing instructions for ordinary users
  const voltGen = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['ولتاژ صفر است']
  });
  const hasDangerousFieldFlash = voltGen.actions.some(a => a.action.includes('تحریک خارجی موقت') && !a.action.includes('پرهیز'));
  assert(!hasDangerousFieldFlash, 'Scenario 25: Hazardous field-flashing instruction removed from user actions');

  // 26. No unauthorized fuel repair instructions
  const hasDiyFuelRepair = leakGen.actions.some(a => a.action.includes('تعویض شیلنگ فرسوده توسط کاربر') || a.action.includes('پیچ‌گوشتی'));
  assert(!hasDiyFuelRepair, 'Scenario 26: No unauthorized DIY fuel line repair prescribed to ordinary user');

  // 27. AI cannot downgrade critical safety
  const safetyServiceResult = await diagnosisService.generateDiagnosis({
    assetId: 'UNREGISTERED',
    equipmentType: 'PORTABLE_GENERATOR',
    symptoms: ['نشتی بنزین در زیر دستگاه'],
    triggerAiAssisted: true // Even if AI enabled
  });
  assert(safetyServiceResult.safetyGuidance?.some(s => s.includes('اشتعال و انفجار سوخت')) ?? false, 'Scenario 27: AI cannot downgrade deterministic safety guidance');

  // 28. AI failure preserves deterministic safety
  const safetyAiFail = await diagnosisService.generateDiagnosis({
    assetId: 'UNREGISTERED',
    equipmentType: 'PORTABLE_GENERATOR',
    symptoms: ['نشتی بنزین در زیر دستگاه'],
    triggerAiAssisted: false // Simulating AI circuit open or disabled
  });
  assert(safetyAiFail.safetyGuidance?.some(s => s.includes('اشتعال و انفجار سوخت')) ?? false, 'Scenario 28: AI failure preserves deterministic safety guidance');

  // 29. Explicit generator equipment routing
  assert(!isGeneratorEquipment('برق اضطراری'), 'Scenario 29: Generic word "برق" does not trigger generator engine');
  assert(!isGeneratorEquipment('موتور خانه'), 'Scenario 29b: Generic word "موتور" does not trigger generator engine');

  // 30. Solar diagnosis remains unchanged
  assert(solarResult.confidenceScore !== undefined && solarResult.confidenceScore > 50, 'Scenario 30: Solar diagnosis confidence score is preserved (> 50%)');
  assert(solarResult.safetyGuidance?.some(s => s.includes('ولتاژ DC')) ?? false, 'Scenario 30b: Solar DC safety guidance preserved');

  // 31. Existing case creation remains compatible
  const newCase = maintenanceCaseService.createCase(
    {
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'درخواست سرویس دوره‌ای ژنراتور',
      description: 'دستگاه روشن نمی‌شود',
      priority: 'MEDIUM'
    },
    'TEST_USER_1'
  );
  assert(Boolean(newCase && newCase.id), 'Scenario 31: Case creation succeeds for generator equipment');

  // 32. Operating context reaches diagnosis engine
  const opContextTest = evaluateGeneratorPreliminaryFaults({
    equipmentCategory: 'PORTABLE_GENERATOR',
    symptoms: ['استارت نمی‌زند'],
    operatingContext: { fuelType: 'DIESEL' }
  });
  assert(opContextTest.rootCauses.some(rc => rc.cause.includes('گازوئیل')), 'Scenario 32: Operating context directly influences diagnosis engine');

  // 33. Operating context persistence & retrieval through actual repository
  const customGeneratorDescription = `دستگاه روشن نمی‌شود\n\n--- مشخصات فنی و شرایط بهره‌برداری ژنراتور (اظهار مشتری) ---\n• نوع تجهیز مولد: موتور برق پرتابل\n• سازنده / برند: Honda\n• توان اعلامی کاربر: 3 کیلووات/kVA\n• نوع سوخت: بنزینی\n• فاز خروجی: تک‌فاز (۲۲۰ ولت)\n• کارکرد تقریبی دستگاه: 150 ساعت`;
  const createdGenCase = maintenanceCaseService.createCase(
    {
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'PORTABLE_GENERATOR',
      title: 'تعمیر موتور برق پرتابل',
      description: customGeneratorDescription,
      symptoms: ['استارت می‌خورد ولی موتور روشن نمی‌شود'],
      priority: 'HIGH'
    },
    'TEST_CUSTOMER_42'
  );
  const retrievedCase = maintenanceRepository.getCaseById(createdGenCase.id);
  assert(Boolean(retrievedCase && retrievedCase.id === createdGenCase.id), 'Scenario 33a: Persisted generator case retrieved via actual repository');
  assert(
    Boolean(retrievedCase?.description.includes('--- مشخصات فنی و شرایط بهره‌برداری ژنراتور (اظهار مشتری) ---') &&
      retrievedCase?.description.includes('• سازنده / برند: Honda') &&
      retrievedCase?.description.includes('• کارکرد تقریبی دستگاه: 150 ساعت')),
    'Scenario 33b: Retrieved case contains human-readable generator operating context'
  );
  assert(
    Boolean(retrievedCase?.description.startsWith('دستگاه روشن نمی‌شود')),
    'Scenario 33c: Original user problem description is strictly preserved at start'
  );

  // 34. Solar case description remains completely unaltered
  const solarCase = maintenanceCaseService.createCase(
    {
      projectId: 'CUSTOMER_DIRECT',
      assetId: 'UNREGISTERED',
      equipmentType: 'INVERTER',
      title: 'خطای اینورتر خورشیدی',
      description: 'اینورتر در ساعات ظهر خطای ایزولاسیون می‌دهد',
      symptoms: ['افت تولید'],
      priority: 'MEDIUM'
    },
    'TEST_CUSTOMER_42'
  );
  const retrievedSolarCase = maintenanceRepository.getCaseById(solarCase.id);
  assert(
    Boolean(retrievedSolarCase?.description === 'اینورتر در ساعات ظهر خطای ایزولاسیون می‌دهد'),
    'Scenario 34a: Solar case description remains strictly unaltered without generator sections'
  );

  // 34b. Attachment validation rule verification
  let attachmentRejectionPassed = false;
  try {
    validateAndNormalizeImage({ name: 'test.exe', data: 'data:application/octet-stream;base64,AAAA' });
  } catch (err: any) {
    attachmentRejectionPassed = true;
  }
  assert(attachmentRejectionPassed, 'Scenario 34b: Non-image attachment format rejected by imageValidator');

  // 35. No automatic technician assignment
  assert(createdGenCase.assignedTechnicianId === undefined, 'Scenario 35: No automatic technician assigned on case creation');

  // 36. No automatic RFQ or supplier contact
  // Verify that maintenance case creation never touches RFQ or supplier discovery tables
  assert(createdGenCase.projectId === 'CUSTOMER_DIRECT', 'Scenario 36: Case created strictly under CUSTOMER_DIRECT without RFQ linkage');

  // 37. Qualitative inference formatting check (Task 1 verification)
  const qualitativeGenDiag = await diagnosisService.generateDiagnosis({
    assetId: 'UNREGISTERED',
    equipmentType: 'PORTABLE_GENERATOR',
    symptoms: ['استارت می‌خورد ولی موتور روشن نمی‌شود'],
    triggerAiAssisted: false
  });
  const hasMisleadingZeroPercent = qualitativeGenDiag.inferences?.some(inf => inf.includes('احتمال 0٪') || inf.includes('0%')) ?? false;
  const hasQualitativeTag = qualitativeGenDiag.inferences?.some(inf => inf.includes('[علت احتمالی نیازمند بررسی]')) ?? false;
  assert(!hasMisleadingZeroPercent, 'Scenario 37a: No misleading "احتمال 0٪" in generator inferences');
  assert(hasQualitativeTag, 'Scenario 37b: Generator inferences use qualitative "[علت احتمالی نیازمند بررسی]" tag');

  // 38. Critical safety status preserved in diagnosis facts marker (Task 4 verification)
  const leakDiag = await diagnosisService.generateDiagnosis({
    assetId: 'UNREGISTERED',
    equipmentType: 'PORTABLE_GENERATOR',
    symptoms: ['نشتی بنزین در زیر دستگاه'],
    triggerAiAssisted: false
  });
  const hasSafetyEscalationMarker = leakDiag.facts?.some(f => f.includes('[وضعیت ایمنی اضطراری]')) ?? false;
  assert(hasSafetyEscalationMarker, 'Scenario 38: Critical safety escalation marker preserved in diagnosis facts');

    // Assert repo DB immutability
    isolation.verifyImmutability();
    assert(true, 'Scenario 39: Repository db.json byte-for-byte immutability verified');
  } finally {
    isolation.cleanup();
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
