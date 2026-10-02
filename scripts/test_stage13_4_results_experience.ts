import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${passed}. ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const ROOT_DIR = process.cwd();
const EXPECTED_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';

console.log('=== STARTING STAGE 13.4 ENGINEERING RESULTS & ECONOMICS EXPERIENCE TESTS ===\n');

// 1. Immutability & Safety Baseline Check
console.log('--- 1. Database & Production Baseline Safety ---');
const dbPath = path.resolve(ROOT_DIR, 'db.json');
const currentDbHash = computeFileHash(dbPath);
assert(currentDbHash === EXPECTED_DB_HASH, 'db.json is byte-for-byte unmodified');

// 2. Result.tsx File Integrity
console.log('\n--- 2. Result.tsx Structure & Information Architecture ---');
const resultFilePath = path.resolve(ROOT_DIR, 'src/pages/Result.tsx');
assert(fs.existsSync(resultFilePath), 'src/pages/Result.tsx exists');
const resultContent = fs.readFileSync(resultFilePath, 'utf-8');

// 3. Question 1: What system is recommended?
console.log('\n--- 3. Question 1: Recommended System & Truth Invariants ---');
assert(resultContent.includes('AnalysisExecutiveSummary'), 'Result.tsx integrates AnalysisExecutiveSummary');
assert(resultContent.includes('SolarDataSource'), 'Result.tsx integrates SolarDataSource');
assert(resultContent.includes('section-1-recommendation'), 'Result.tsx has explicit Section 1 anchor for recommended system');
assert(resultContent.includes('DataTruthBadge'), 'Result.tsx incorporates DataTruthBadge provenance');

// 4. Question 2: How much energy can it produce?
console.log('\n--- 4. Question 2: Energy Production & Seasonal Profile ---');
assert(resultContent.includes('MonthlyGenerationChart'), 'Result.tsx integrates MonthlyGenerationChart');
assert(resultContent.includes('EnergyEfficiencyChart'), 'Result.tsx integrates EnergyEfficiencyChart');
assert(resultContent.includes('section-2-production'), 'Result.tsx has explicit Section 2 anchor for energy production');
assert(resultContent.includes('savedScenarios'), 'Result.tsx supports scenario comparison tracking');
assert(resultContent.includes('PersianPromptModal'), 'Result.tsx uses PersianPromptModal for saving scenarios');
assert(resultContent.includes('isSaveScenarioModalOpen'), 'Result.tsx controls modal state with isSaveScenarioModalOpen');
assert(resultContent.includes('handleSaveScenarioSubmit'), 'Result.tsx saves scenario via handleSaveScenarioSubmit');
assert(resultContent.includes("typeof result?.solar?.annualGenerationKwh === 'number'"), 'Result.tsx strictly checks annualGenerationKwh type');
assert(resultContent.includes('داده تولید سالانه ثبت نشده است'), 'Result.tsx displays truthful fallback when annual generation is nullish');
assert(!resultContent.includes('* 1.15'), 'Result.tsx contains NO arbitrary * 1.15 multiplier');

// 5. Question 3: What equipment/configuration is recommended?
console.log('\n--- 5. Question 3: Equipment & Engineering Configuration ---');
assert(resultContent.includes('EngineeringDetails'), 'Result.tsx integrates EngineeringDetails specifications');
assert(resultContent.includes('InstallationOptimization'), 'Result.tsx integrates InstallationOptimization for geographic tilt/azimuth');
assert(resultContent.includes('PanelComparisonTable'), 'Result.tsx integrates PanelComparisonTable multi-option matrix');
assert(resultContent.includes('section-3-equipment'), 'Result.tsx has explicit Section 3 anchor for equipment configuration');
assert(resultContent.includes('recommendedProducts'), 'Result.tsx renders authoritative equipment BOM from catalog');
assert(resultContent.includes('requiredAccessories'), 'Result.tsx displays required accessories checklist');
assert(resultContent.includes('SmartWarning'), 'Result.tsx includes SmartWarning');

// 6. Question 4: What are the economics and payback?
console.log('\n--- 6. Question 4: Economics & Truthful Investment Appraisal ---');
assert(resultContent.includes('FinancialOverview'), 'Result.tsx integrates FinancialOverview');
assert(resultContent.includes('SavingsCalculator'), 'Result.tsx integrates SavingsCalculator');
assert(resultContent.includes('section-4-economics'), 'Result.tsx has explicit Section 4 anchor for economic appraisal');

// Inspect SavingsCalculator for formula preservation
const savingsCalcPath = path.resolve(ROOT_DIR, 'src/components/SavingsCalculator.tsx');
const savingsContent = fs.readFileSync(savingsCalcPath, 'utf-8');
assert(savingsContent.includes('estimatedPricePerKwh = 1500'), 'SavingsCalculator preserves exact estimatedPricePerKwh = 1500 assumption');
assert(savingsContent.includes('monthlyKwh * estimatedPricePerKwh'), 'SavingsCalculator preserves monthly savings formula');
assert(savingsContent.includes('totalCost / yearlySavingsIRR'), 'SavingsCalculator preserves payback period formula');
assert(savingsContent.includes('DataTruthBadge'), 'SavingsCalculator displays DataTruthBadge');

// Inspect FinancialOverview for 3-tier structure
const finOverviewPath = path.resolve(ROOT_DIR, 'src/components/analysis/FinancialOverview.tsx');
const finOverviewContent = fs.readFileSync(finOverviewPath, 'utf-8');
assert(finOverviewContent.includes('داده ورودی') || finOverviewContent.includes('داده‌های ورودی'), 'FinancialOverview has user input data category');
assert(finOverviewContent.includes('فرض محاسباتی') || finOverviewContent.includes('مفروضات محاسباتی'), 'FinancialOverview has computational assumptions category');
assert(finOverviewContent.includes('اطلاعات مالی بیشتری مورد نیاز است'), 'FinancialOverview truthfully discloses when deeper inputs are required');

// 7. Question 5: What are the next actionable steps?
console.log('\n--- 7. Question 5: Actionable Next Steps & Decision Conversion ---');
assert(resultContent.includes('section-5-action'), 'Result.tsx has explicit Section 5 anchor for next actionable steps');
assert(resultContent.includes('handleConvertToProject'), 'Result.tsx preserves handleConvertToProject conversion handler');
assert(resultContent.includes('/api/projects/from-analysis/'), 'Result.tsx links to authoritative /api/projects/from-analysis endpoint');
assert(resultContent.includes('/solar-planner'), 'Result.tsx provides navigation to 3D Solar Planner');
assert(resultContent.includes('/api/analyze/followup'), 'Result.tsx provides interactive AI follow-up consultation');
assert(resultContent.includes('AdBanner'), 'Result.tsx includes partner AdBanner');

// 8. Mobile Responsiveness, Accessibility & Persian RTL
console.log('\n--- 8. Mobile Responsiveness, Touch Targets & Persian RTL ---');
assert(resultContent.includes('dir="rtl"'), 'Result.tsx layout enforces Persian RTL direction');
assert(resultContent.includes('min-h-[44px]'), 'Result.tsx primary actions enforce minimum 44px touch targets');
assert(resultContent.includes('#0284C7'), 'Result.tsx adheres to Stage 13.1 Energy Blue design tokens');
assert(!resultContent.match(/(\balert\(|window\.alert|window\.prompt|window\.confirm)/), 'Result.tsx contains ZERO native alert/prompt/confirm');
assert(resultContent.includes('showSuccess') && resultContent.includes('showWarning'), 'Result.tsx uses toast notifications for user alerts');

// 9. Final Immutability Verification
console.log('\n--- 9. Concluding Immutability Check ---');
const finalDbHash = computeFileHash(dbPath);
assert(finalDbHash === EXPECTED_DB_HASH, 'db.json verified byte-for-byte identical after all tests');

console.log(`\n=== STAGE 13.4 TEST RESULTS: ${passed} / ${passed + failed} PASSED ===\n`);
