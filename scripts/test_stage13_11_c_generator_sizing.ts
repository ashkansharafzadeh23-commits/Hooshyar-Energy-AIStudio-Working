/**
 * HOOSHYAR ENERGY — STAGE 13.11-C TEST SUITE
 * STANDALONE GENERATOR NEEDS ASSESSMENT & PRELIMINARY SIZING ENGINE
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GeneratorSizingService } from '../src/services/generatorSizingService';
import { GeneratorAssessmentInput, LoadItemInput } from '../src/types/generator';

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

console.log('===============================================================');
console.log('⚡ STAGE 13.11-C: GENERATOR SIZING ENGINE & UX CONTRACT AUDIT');
console.log('===============================================================\n');

// 1. Math: Watts to kW conversion
console.log('--- 1. Pure Unit Conversions (Watts to kW, kW to kVA) ---');
const baseLoads: LoadItemInput[] = [
  { id: '1', name: 'Lighting', category: 'LIGHTING', runningWatts: 500, quantity: 2, isMotorDriven: false },
  { id: '2', name: 'IT Equipment', category: 'TELECOM_IT', runningWatts: 1000, quantity: 1, isMotorDriven: false }
];

const input1: GeneratorAssessmentInput = {
  application: 'RESIDENTIAL',
  phase: 'SINGLE_PHASE',
  dutyType: 'STANDBY_EMERGENCY',
  availableFuels: ['GASOLINE'],
  installationEnvironment: 'OUTDOOR_COVERED',
  loads: baseLoads,
  powerFactorAssumption: 0.8,
  engineeringReservePercent: 0 // 0% reserve to verify exact raw conversions
};

const res1 = GeneratorSizingService.calculateSizing(input1);

// Total Watts = (500 * 2) + 1000 = 2000 W
assert(res1.totalRunningWatts === 2000, `Exact totalRunningWatts is 2000 W (got ${res1.totalRunningWatts})`);
// Running kW = 2000 / 1000 = 2.0 kW
assert(res1.totalRunningKw === 2.0, `Exact totalRunningKw is 2.0 kW (got ${res1.totalRunningKw})`);
// Running kVA = 2.0 / 0.8 = 2.5 kVA
assert(res1.runningKva === 2.5, `Exact runningKva is 2.5 kVA (got ${res1.runningKva})`);

// 2. Power Factor bounds & validation
console.log('\n--- 2. Power Factor Validation & Bounds ---');
const inputBadPf: GeneratorAssessmentInput = {
  ...input1,
  powerFactorAssumption: -0.5
};
const resBadPf = GeneratorSizingService.calculateSizing(inputBadPf);
assert(resBadPf.status === 'NEEDS_ADDITIONAL_INFORMATION', 'Invalid explicit power factor results in NEEDS_ADDITIONAL_INFORMATION');
assert(
  resBadPf.missingInputs.some(m => m.includes('ضریب توان نامعتبر است')),
  'Invalid power factor is added to missingInputs instead of being silently accepted'
);
assert(
  resBadPf.warnings.some(w => w.code === 'INVALID_POWER_FACTOR_SUPPLIED'),
  'Invalid power factor produces an explicit INVALID_POWER_FACTOR_SUPPLIED warning'
);

// 2b. Omitted power factor uses disclosed planning assumption
const inputOmittedPf: GeneratorAssessmentInput = {
  ...input1,
  powerFactorAssumption: undefined
};
const resOmittedPf = GeneratorSizingService.calculateSizing(inputOmittedPf);
assert(resOmittedPf.powerFactor === 0.8, 'Omitted power factor uses default 0.8 planning assumption');
assert(
  resOmittedPf.assumptions.some(a => a.includes('ضریب توان پیش‌فرض برنامه‌ریزی: 0.8')),
  'Discloses planning assumption for omitted power factor'
);
assert(resOmittedPf.status === 'PRELIMINARY_ESTIMATE', 'Valid calculation with default planning assumption succeeds');

// 2c. Valid custom power factor
const inputCustomPf: GeneratorAssessmentInput = {
  ...input1,
  powerFactorAssumption: 0.85
};
const resCustomPf = GeneratorSizingService.calculateSizing(inputCustomPf);
assert(resCustomPf.powerFactor === 0.85, 'User-supplied valid power factor (0.85) is respected');
assert(
  resCustomPf.assumptions.some(a => a.includes('ضریب توان واردشده توسط کاربر: 0.85')),
  'Discloses user-supplied power factor'
);

// 3. Simultaneous load aggregation & quantity handling
console.log('\n--- 3. Load Aggregation & Quantities ---');
const multiQtyLoads: LoadItemInput[] = [
  { id: '1', name: 'Fan', category: 'HVAC', runningWatts: 80, quantity: 5, isMotorDriven: true },
  { id: '2', name: 'Bulb', category: 'LIGHTING', runningWatts: 15, quantity: 20, isMotorDriven: false }
];
const resMultiQty = GeneratorSizingService.calculateSizing({
  ...input1,
  loads: multiQtyLoads
});
// (80*5) + (15*20) = 400 + 300 = 700 W = 0.7 kW
assert(resMultiQty.totalRunningWatts === 700, 'Correct multi-quantity aggregation (700 W)');
assert(resMultiQty.totalRunningKw === 0.7, 'Correct kW conversion with quantity (0.7 kW)');

// 4. Zero and negative input rejection
console.log('\n--- 4. Zero and Negative Input Rejection ---');
const negativeLoads: LoadItemInput[] = [
  { id: '1', name: 'Invalid Load', category: 'CUSTOM', runningWatts: -500, quantity: 2, isMotorDriven: false },
  { id: '2', name: 'Zero Qty', category: 'CUSTOM', runningWatts: 1000, quantity: 0, isMotorDriven: false },
  { id: '3', name: 'Valid Item', category: 'CUSTOM', runningWatts: 600, quantity: 1, isMotorDriven: false }
];
const resNegative = GeneratorSizingService.calculateSizing({
  ...input1,
  loads: negativeLoads
});
assert(resNegative.totalRunningWatts === 600, 'Negative and zero loads are safely rejected without crashing');
assert(
  resNegative.warnings.some(w => w.code === 'INVALID_LOAD_ITEM'),
  'Warning generated for invalid load items'
);

// 5. Large-value handling & finite number checks
console.log('\n--- 5. Extreme Values & Finite Checks ---');
const extremeLoads: LoadItemInput[] = [
  { id: '1', name: 'Massive Industrial Unit', category: 'MACHINERY', runningWatts: 2_000_000, quantity: 1, isMotorDriven: true }
];
const resExtreme = GeneratorSizingService.calculateSizing({
  ...input1,
  loads: extremeLoads
});
assert(Number.isFinite(resExtreme.totalRunningKw), 'Extreme kW remains finite');
assert(
  resExtreme.warnings.some(w => w.code === 'EXTREME_LOAD_VALUE'),
  'Extreme power values produce an engineering review warning'
);

// 6. Motor starting dynamics & sequential start assumption
console.log('\n--- 6. Motor-Starting Dynamics & Sequential Starting ---');
const motorLoads: LoadItemInput[] = [
  { id: '1', name: 'Lights', category: 'LIGHTING', runningWatts: 500, quantity: 1, isMotorDriven: false },
  { id: '2', name: 'Small Pump', category: 'PUMP', runningWatts: 750, quantity: 1, isMotorDriven: true, startingMultiplier: 4 },
  { id: '3', name: 'Large AC', category: 'HVAC', runningWatts: 2000, quantity: 1, isMotorDriven: true, startingMultiplier: 3 }
];
// Total running = 500 + 750 + 2000 = 3250 W = 3.25 kW
// Largest motor is Large AC: running=2000W, starting = 2000 * 3 = 6000W (7.5 kVA at 0.8 PF)
// Base other running: Lights (500W) + Small Pump (750W) = 1250W (Notice: Large AC running power 2000W is NOT added to 6000W)
// Sequential start peak: 1250W + 6000W = 7250W = 7.25 kW
// Starting peak kVA (at 0.8 PF) = 7.25 / 0.8 = 9.0625 kVA -> rounds to 9.1 kVA
const resMotor = GeneratorSizingService.calculateSizing({
  ...input1,
  loads: motorLoads
});
assert(resMotor.hasMotorLoads === true, 'Correctly flags presence of motor loads');
assert(resMotor.largestMotorStartingKva !== null && resMotor.largestMotorStartingKva > 0, 'Computes largest motor starting kVA');
assert(resMotor.largestMotorStartingKva === 7.5, `Exact largest motor starting kVA is 7.5 kVA (got ${resMotor.largestMotorStartingKva})`);
assert(resMotor.estimatedPeakStartingKva === 9.1, `Exact sequential starting peak kVA is 9.1 kVA without double-counting (got ${resMotor.estimatedPeakStartingKva})`);
// Verify that double-counted peak would have been (3250 + 6000) / 0.8 = 11.56 kVA != 9.1 kVA
assert(resMotor.estimatedPeakStartingKva !== 11.6, 'Verified: Running load of starting motor is not double-counted in sequential peak');
assert(
  resMotor.assumptions.some(a => a.includes('سناریوی راه‌اندازی متوالی موتورها')),
  'Assumptions explicitly document sequential rather than simultaneous motor starts'
);
assert(
  resMotor.assumptions.some(a => a.includes('عدم فرض قابلیت اضافه بار گذرا عمومی')),
  'Assumptions confirm refusal to assume universal transient overload capacity'
);
assert(
  !resMotor.assumptions.some(a => a.includes('۱۵۰٪ بار لحظه‌ای')),
  'Universal 150% overload assumption has been completely removed'
);
assert(
  resMotor.startingCapabilityStatus === 'UNVERIFIED',
  'Motor starting capability status is explicitly UNVERIFIED'
);
assert(
  resMotor.warnings.some(w => w.code === 'MOTOR_STARTING_CAPABILITY_UNVERIFIED'),
  'Issues MOTOR_STARTING_CAPABILITY_UNVERIFIED warning requiring professional review'
);
assert(
  resMotor.status === 'REQUIRES_PROFESSIONAL_REVIEW',
  'Loads with motors elevate confidence status to REQUIRES_PROFESSIONAL_REVIEW'
);
// Prove generator capacity is NOT reduced by a transient divisor (e.g. 9.1 / 1.5)
// Running load is 3.25 kW (4.06 kVA). With 0% reserve, recommended kVA is exactly runningKva (4.1 kVA).
assert(resMotor.preliminaryRecommendedKva === 4.1, `Generator capacity is strictly running load + reserve, not scaled down by transient divisor (got ${resMotor.preliminaryRecommendedKva} kVA)`);

// 6b. Single motor only - verify no negative subtraction or double-counting
const singleMotorLoad: LoadItemInput[] = [
  { id: '1', name: 'Isolated Motor', category: 'PUMP', runningWatts: 1000, quantity: 1, isMotorDriven: true, startingMultiplier: 4 }
];
const resSingleMotor = GeneratorSizingService.calculateSizing({
  ...input1,
  loads: singleMotorLoad
});
// Total running = 1000W. Other running = 0W. Starting = 4000W. Peak = 4000W -> 4000/1000/0.8 = 5.0 kVA
assert(resSingleMotor.estimatedPeakStartingKva === 5.0, `Single motor peak kVA matches pure starting surge 5.0 kVA (got ${resSingleMotor.estimatedPeakStartingKva})`);

// 6c. Multi-quantity identical motors - verify only one unit starts at a time while others are in running state
const multiMotorLoad: LoadItemInput[] = [
  { id: '1', name: 'Two Identical Pumps', category: 'PUMP', runningWatts: 1000, quantity: 2, isMotorDriven: true, startingMultiplier: 4 }
];
const resMultiMotor = GeneratorSizingService.calculateSizing({
  ...input1,
  loads: multiMotorLoad
});
// Total running = 2000W. Starting surge for 1 unit = 4000W. Other running = 2000 - 1000 = 1000W.
// Sequential peak = 1000W running + 4000W starting = 5000W -> 5000/1000/0.8 = 6.25 kVA -> 6.3 kVA
assert(resMultiMotor.estimatedPeakStartingKva === 6.3, `Multi-quantity motor starts sequentially without starting both simultaneously (got ${resMultiMotor.estimatedPeakStartingKva})`);

// 7. Unknown motor starting behavior handling
console.log('\n--- 7. Unknown Motor Starting Handling ---');
const unknownMotorLoads: LoadItemInput[] = [
  { id: '1', name: 'Mystery Motor', category: 'PUMP', runningWatts: 1500, quantity: 1, isMotorDriven: true }
];
const resUnknownMotor = GeneratorSizingService.calculateSizing({
  ...input1,
  loads: unknownMotorLoads
});
assert(resUnknownMotor.hasUnknownMotorStarting === true, 'Flags unknown motor starting current');
assert(
  resUnknownMotor.warnings.some(w => w.code === 'UNKNOWN_MOTOR_STARTING_SURGE'),
  'Issues warning about unknown motor starting'
);
assert(
  resUnknownMotor.status === 'REQUIRES_PROFESSIONAL_REVIEW',
  'Status elevates to REQUIRES_PROFESSIONAL_REVIEW when motor starting characteristics are unknown'
);

// 8. Phase Handling (Single-phase vs Three-phase)
console.log('\n--- 8. Electrical Phase Handling ---');
const resPhaseUnknown = GeneratorSizingService.calculateSizing({
  ...input1,
  phase: 'UNKNOWN'
});
assert(resPhaseUnknown.missingInputs.includes('تک‌فاز یا سه‌فاز بودن مدار مصرف‌کننده‌ها نامشخص است.'), 'Flags unknown phase');
assert(
  resPhaseUnknown.status === 'REQUIRES_PROFESSIONAL_REVIEW' || resPhaseUnknown.status === 'NEEDS_ADDITIONAL_INFORMATION',
  'Confidence status reflects missing electrical phase data'
);

// 9. Configurable Engineering Reserve
console.log('\n--- 9. Configurable Engineering Reserve ---');
const resReserve20 = GeneratorSizingService.calculateSizing({
  ...input1,
  engineeringReservePercent: 20 // 2.0 kW * 1.2 = 2.4 kW -> 2.4 / 0.8 = 3.0 kVA
});
assert(resReserve20.preliminaryRecommendedKw === 2.4, '20% reserve gives 2.4 kW');
assert(resReserve20.preliminaryRecommendedKva === 3.0, '20% reserve gives 3.0 kVA');
assert(
  resReserve20.assumptions.some(a => a.includes('حاشیه اطمینان مهندسی')),
  'Assumptions document reserve as a planning assumption'
);

// 10. Duty Type Warnings
console.log('\n--- 10. Duty Type Warnings ---');
const resContinuous = GeneratorSizingService.calculateSizing({
  ...input1,
  dutyType: 'CONTINUOUS'
});
assert(
  resContinuous.warnings.some(w => w.code === 'CONTINUOUS_PRIME_DUTY_WARNING'),
  'Generates operating warning for continuous duty generator usage'
);

// 11. Mandatory Safety Notices (CO poisoning, ATS, Grounding)
console.log('\n--- 11. Mandatory Life-Safety Notices ---');
assert(
  res1.safetyNotices.some(sn => sn.includes('مونوکسید کربن (CO)')),
  'Includes mandatory carbon monoxide (CO) poisoning warning'
);
assert(
  res1.safetyNotices.some(sn => sn.includes('ATS') || sn.includes('چنج‌اور')),
  'Includes mandatory ATS / transfer switch electrical isolation warning'
);
assert(
  res1.safetyNotices.some(sn => sn.includes('ارتینگ') || sn.includes('زمین حفاظتی')),
  'Includes mandatory earthing / grounding warning'
);

// 12. Non-fabrication invariants (zero brands, zero vendor pricing)
console.log('\n--- 12. Non-Fabrication Invariants ---');
const resJson = JSON.stringify(res1);
assert(!resJson.includes('تومان') && !resJson.includes('ریال'), 'Zero fabricated prices in sizing result');
assert(!resJson.includes('هیوندای') && !resJson.includes('کامینز'), 'Zero fabricated generator brand names');
assert(
  res1.disclaimers.some(d => d.includes('مصرف ویژه سوخت (SFC)')),
  'Explicitly disclaims fuel consumption calculation without certified manufacturer curves'
);

// 13. UI Components & Integration Audits
console.log('\n--- 13. Component Contract & Integration Audit ---');
const sizingResultPath = path.resolve(process.cwd(), 'src/components/generator/GeneratorSizingResult.tsx');
const assessmentPath = path.resolve(process.cwd(), 'src/components/generator/GeneratorAssessment.tsx');
const offerPath = path.resolve(process.cwd(), 'src/components/analysis/OptionalGeneratorOffer.tsx');

assert(fs.existsSync(sizingResultPath), 'GeneratorSizingResult.tsx exists');
assert(fs.existsSync(assessmentPath), 'GeneratorAssessment.tsx exists');
assert(fs.existsSync(offerPath), 'OptionalGeneratorOffer.tsx exists');

const assessmentCode = fs.readFileSync(assessmentPath, 'utf8');
const offerCode = fs.readFileSync(offerPath, 'utf8');
const sizingResultCode = fs.readFileSync(sizingResultPath, 'utf8');

assert(assessmentCode.includes('dir="rtl"'), 'GeneratorAssessment has dir="rtl"');
assert(assessmentCode.includes('role="dialog"'), 'GeneratorAssessment implements role="dialog"');
assert(assessmentCode.includes('aria-modal="true"'), 'GeneratorAssessment implements aria-modal="true"');
assert(assessmentCode.includes('handleKeyDown') && assessmentCode.includes('Escape'), 'Implements accessible Escape-to-close behavior');
assert(assessmentCode.includes('tabIndex={-1}'), 'Dialog container manages keyboard focus');
assert(offerCode.includes('<GeneratorAssessment'), 'OptionalGeneratorOffer connects to GeneratorAssessment');
assert(sizingResultCode.includes('PRELIMINARY_ESTIMATE'), 'GeneratorSizingResult handles preliminary estimate status');
assert(sizingResultCode.includes('REQUIRES_PROFESSIONAL_REVIEW'), 'GeneratorSizingResult handles professional review status');

// 14. Solar Engineering Invariance
console.log('\n--- 14. Solar Engineering Invariance ---');
const analyzeHandlerPath = path.resolve(process.cwd(), 'api/analyze.js');
const analyzeCode = fs.readFileSync(analyzeHandlerPath, 'utf8');
assert(!analyzeCode.includes('GeneratorSizingService'), 'api/analyze.js is 100% untouched by generator sizing service');

// 15. Protected Files Checksums
console.log('\n--- 15. Protected Files Byte-for-Byte Invariance ---');
const expectedHashes: Record<string, string> = {
  'db.json': '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f',
  'package.json': '90486ca155c8ea72b179c001d32af8c2eac08259837a1817520326b9194379cc',
  'bun.lock': '79ef5b3a7ccbd526c213eac475e3485120c6823b5f71980721b972f5e4bf5386',
  'src/types/maintenance.ts': '3b7702bd6e55fdf7a0fe6d8a3c067a2c0920580f4b0706a8b0c0392dc6ac9c22'
};

for (const [relPath, expectedHash] of Object.entries(expectedHashes)) {
  const fullPath = path.resolve(process.cwd(), relPath);
  assert(fs.existsSync(fullPath), `Protected file exists: ${relPath}`);
  const content = fs.readFileSync(fullPath);
  const actualHash = crypto.createHash('sha256').update(content).digest('hex');
  assert(actualHash === expectedHash, `${relPath} SHA-256 remains 100% invariant (${actualHash.slice(0, 16)}...)`);
}

console.log('\n===============================================================');
console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED`);
console.log('===============================================================');

if (failed > 0) {
  console.error(`✗ ${failed} tests failed!`);
  process.exit(1);
} else {
  console.log('✓ STAGE 13.11-C TEST SUITE PASSED WITH 100% SUCCESS.');
}
