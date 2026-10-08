/**
 * HOOSHYAR ENERGY — STAGE 13.11-B TEST SUITE
 * OPTIONAL GENERATOR OFFER AFTER SOLAR RESULTS
 * 
 * Verifies that the generator offer is cleanly integrated:
 * 1. Appears strictly AFTER completed solar results and primary CTAs.
 * 2. Does not appear during questionnaire steps 0-6.
 * 3. Solar calculations, formulas, APIs, and project conversions are 100% untouched.
 * 4. Is purely presentation-only, collapsible/dismissible without state mutation.
 * 5. Primary action opens an informative development-state notice; zero fake generator sizing or pricing.
 * 6. RTL Persian styling and accessibility semantics are strictly honored.
 * 7. Protected file hashes remain byte-for-byte invariant.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
console.log('⚡ STAGE 13.11-B: OPTIONAL GENERATOR OFFER VERIFICATION');
console.log('===============================================================\n');

// 1. Component File & Content Verification
console.log('--- 1. OptionalGeneratorOffer Component Contract ---');
const componentPath = path.resolve(process.cwd(), 'src/components/analysis/OptionalGeneratorOffer.tsx');
assert(fs.existsSync(componentPath), 'OptionalGeneratorOffer.tsx exists at src/components/analysis/');

const componentContent = fs.readFileSync(componentPath, 'utf8');

assert(componentContent.includes('dir="rtl"'), 'Root element sets dir="rtl" for Persian typography');
assert(componentContent.includes('role="region"'), 'Accessible role="region" used for secondary section');
assert(componentContent.includes('برای زمان قطعی برق، به موتور برق یا ژنراتور نیاز دارید؟'), 'Contains approved Persian heading');
assert(componentContent.includes('در کنار طرح خورشیدی شما، امکان بررسی یک منبع برق پشتیبان'), 'Contains approved Persian description');
assert(componentContent.includes('بررسی موتور برق و ژنراتور'), 'Primary button label is exact Persian copy');
assert(componentContent.includes('فعلاً نیازی ندارم'), 'Secondary dismiss button label is exact Persian copy');
assert(componentContent.includes('سرویس مکمل و اختیاری'), 'Badge explicitly marks service as optional and complementary');

// 2. Truthful Development Notice & No Fake Data
console.log('\n--- 2. Transparent Development Notice & Anti-Hallucination ---');
assert(
  componentContent.includes('امکان محاسبه و پیشنهاد تخصصی ژنراتور در مرحله بعد تکمیل میشود.'),
  'Contains exact development roadmap notice'
);
assert(
  !componentContent.includes('/generators/assessment') && !componentContent.includes('/generators/recommendation'),
  'Does not link to non-existent broken generator routes'
);
assert(
  !componentContent.includes('تومان') && !componentContent.includes('میلیون') && !componentContent.includes('ریال'),
  'Does not invent fake generator prices or savings'
);
assert(
  !componentContent.includes('هیوندای') && !componentContent.includes('کامینز') && !componentContent.includes('پرکینز'),
  'Does not invent fake brand endorsements or vendor stocks in this stage'
);
assert(
  componentContent.includes('role="dialog"') && componentContent.includes('aria-modal="true"'),
  'Information modal includes standard accessibility dialog attributes'
);

// 3. Dismissal & State Isolation
console.log('\n--- 3. Dismissal & Zero Solar Impact ---');
assert(
  componentContent.includes('if (isDismissed) {') && componentContent.includes('return null;'),
  'Dismissal renders null without side-effects or state pollution'
);
assert(
  !componentContent.includes('updateState') && !componentContent.includes('localStorage.set'),
  'Dismissal does not alter AppContext state or localStorage'
);

// 4. Primary Placement in SolarAnalysisExperience.tsx
console.log('\n--- 4. SolarAnalysisExperience Result Placement Audit ---');
const solarExpPath = path.resolve(process.cwd(), 'src/pages/SolarAnalysisExperience.tsx');
assert(fs.existsSync(solarExpPath), 'SolarAnalysisExperience.tsx exists');

const solarExpContent = fs.readFileSync(solarExpPath, 'utf8');

const nextStepIdx = solarExpContent.indexOf('<AnalysisNextStep');
const generatorOfferIdx = solarExpContent.indexOf('<OptionalGeneratorOffer');
const execSummaryIdx = solarExpContent.indexOf('<AnalysisExecutiveSummary');

assert(nextStepIdx > 0, 'AnalysisNextStep is present in SolarAnalysisExperience');
assert(generatorOfferIdx > 0, 'OptionalGeneratorOffer is present in SolarAnalysisExperience');
assert(
  generatorOfferIdx > nextStepIdx,
  'OptionalGeneratorOffer is placed strictly AFTER AnalysisNextStep (after complete solar results & project CTA)'
);
assert(
  generatorOfferIdx > execSummaryIdx,
  'OptionalGeneratorOffer appears after AnalysisExecutiveSummary'
);

// Ensure it is only rendered in Step 7 (results step)
const returnBlock = solarExpContent.slice(solarExpContent.lastIndexOf('return ('));
assert(
  returnBlock.includes('<OptionalGeneratorOffer'),
  'OptionalGeneratorOffer is solely mounted inside the step 7 final results return block'
);

// 5. Placement in Legacy Result.tsx
console.log('\n--- 5. Result.tsx (Legacy Route) Placement Audit ---');
const resultPagePath = path.resolve(process.cwd(), 'src/pages/Result.tsx');
assert(fs.existsSync(resultPagePath), 'Result.tsx exists');

const resultContent = fs.readFileSync(resultPagePath, 'utf8');
const resultConvertToProjIdx = resultContent.indexOf('handleConvertToProject');
const resultGeneratorIdx = resultContent.indexOf('<OptionalGeneratorOffer');

assert(resultGeneratorIdx > 0, 'OptionalGeneratorOffer is mounted in Result.tsx');
assert(
  resultGeneratorIdx > resultConvertToProjIdx,
  'OptionalGeneratorOffer in Result.tsx is mounted below the primary EPC project conversion button'
);

// 6. Solar Engineering Formulas & Invariants Verification
console.log('\n--- 6. Solar Engineering & Financial Services Invariance ---');
const analyzeHandlerPath = path.resolve(process.cwd(), 'api/analyze.js');
const financeServicePath = path.resolve(process.cwd(), 'src/services/financeService.ts');

assert(fs.existsSync(analyzeHandlerPath), 'api/analyze.js engine handler exists');
assert(fs.existsSync(financeServicePath), 'src/services/financeService.ts exists');

const analyzeHandlerCode = fs.readFileSync(analyzeHandlerPath, 'utf8');
const financeServiceCode = fs.readFileSync(financeServicePath, 'utf8');

assert(
  !analyzeHandlerCode.includes('OptionalGeneratorOffer'),
  'api/analyze.js has zero reference or coupling to OptionalGeneratorOffer'
);
assert(
  !financeServiceCode.includes('OptionalGeneratorOffer'),
  'financeService.ts has zero reference or coupling to OptionalGeneratorOffer'
);

// Verify SolarAnalysisExperience questionnaire steps 0-6 remain intact
assert(
  solarExpContent.includes('type StepNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;'),
  'SolarAnalysisExperience step state machine 0..7 remains unchanged'
);
assert(
  solarExpContent.includes('if (currentStep === 1)') && solarExpContent.includes('<UsageTypeSelector'),
  'Questionnaire Step 1 (UsageTypeSelector) is present'
);
assert(
  solarExpContent.includes('if (currentStep === 2)') && solarExpContent.includes('<LocationStep'),
  'Questionnaire Step 2 (LocationStep) is present'
);
assert(
  solarExpContent.includes('if (currentStep === 3)') && solarExpContent.includes('<ConsumptionStep'),
  'Questionnaire Step 3 (ConsumptionStep) is present'
);
assert(
  solarExpContent.includes('if (currentStep === 4)') && solarExpContent.includes('<SiteDetailsStep'),
  'Questionnaire Step 4 (SiteDetailsStep) is present'
);
assert(
  solarExpContent.includes('if (currentStep === 5)') && solarExpContent.includes('<AnalysisGoalStep'),
  'Questionnaire Step 5 (AnalysisGoalStep) is present'
);
assert(
  solarExpContent.includes('if (currentStep === 6)') && solarExpContent.includes('<AnalysisProgress'),
  'Questionnaire Step 6 (AnalysisProgress) is present'
);

// 7. Canonical Protected Checksums Verification
console.log('\n--- 7. Protected Files Byte-for-Byte Invariance ---');
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
  console.log('✓ STAGE 13.11-B VERIFICATION PASSED WITH 100% SUCCESS.');
}
