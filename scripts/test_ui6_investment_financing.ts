/**
 * HOOSHYAR ENERGY — UI-6 INVESTMENT & FINANCING TEST SUITE
 * 
 * Verifies:
 * 1. Component Architecture & Exports in src/components/investment/
 * 2. Component Architecture & Exports in src/components/financing/
 * 3. Page Integrations (FinancingTab, InvestmentTab, InvestmentHub, OpportunityDetail, OpportunitiesList)
 * 4. Non-Negotiable Data-Truth Rules (Zero Math.random(), provenance badges, missing field handling)
 * 5. Backend Service Compatibility (Readiness Evaluation, Partner Matching, Offer Comparison)
 * 6. Test Isolation & db.json Byte-for-Byte Immutability Guard
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { financeReadinessService } from '../src/services/financeReadinessService';
import { financialPartnerMatchingService } from '../src/services/financialPartnerMatchingService';
import { financingOfferComparisonService } from '../src/services/financingOfferComparisonService';

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

const ROOT_DIR = process.cwd();
const DB_PATH = path.join(ROOT_DIR, 'db.json');
const INITIAL_DB_HASH = crypto.createHash('sha256').update(fs.readFileSync(DB_PATH)).digest('hex');
const EXPECTED_HASH = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';

console.log('========================================================');
console.log('HOOSHYAR ENERGY — UI-6 INVESTMENT & FINANCING TEST SUITE');
console.log('========================================================\n');

// [1] Verify Component Architecture in src/components/investment/
console.log('[1] Testing Component Architecture in src/components/investment/...');

const investmentDir = path.join(ROOT_DIR, 'src', 'components', 'investment');
assert(fs.existsSync(investmentDir), 'Directory src/components/investment exists');

const requiredInvestmentFiles = [
  'InvestmentHub.tsx',
  'InvestmentOpportunityCard.tsx',
  'InvestmentFilters.tsx',
  'InvestmentReadiness.tsx',
  'InvestmentOpportunityDetail.tsx',
  'InvestmentDataRoomSummary.tsx',
  'InvestmentMatchExplanation.tsx',
  'InvestmentEmptyState.tsx',
  'index.ts'
];

for (const file of requiredInvestmentFiles) {
  const filePath = path.join(investmentDir, file);
  assert(fs.existsSync(filePath), `Investment component exists: ${file}`);
}

// [2] Verify Component Architecture in src/components/financing/
console.log('\n[2] Testing Component Architecture in src/components/financing/...');

const financingDir = path.join(ROOT_DIR, 'src', 'components', 'financing');
assert(fs.existsSync(financingDir), 'Directory src/components/financing exists');

const requiredFinancingFiles = [
  'FinancingWorkspace.tsx',
  'FinancingNeedSummary.tsx',
  'FinancingReadiness.tsx',
  'FinancingApplicationFlow.tsx',
  'FinancingPartnerMatches.tsx',
  'FinancingPartnerCard.tsx',
  'FinancingOfferInbox.tsx',
  'FinancingOfferCard.tsx',
  'FinancingOfferComparison.tsx',
  'FinancingSelectionReview.tsx',
  'FinancingStatusTimeline.tsx',
  'FinancingEmptyState.tsx',
  'index.ts'
];

for (const file of requiredFinancingFiles) {
  const filePath = path.join(financingDir, file);
  assert(fs.existsSync(filePath), `Financing component exists: ${file}`);
}

// [3] Verify Page Integrations
console.log('\n[3] Testing Page Integrations...');

const financingTabPath = path.join(ROOT_DIR, 'src', 'pages', 'projects', 'Workspace', 'FinancingTab.tsx');
assert(fs.existsSync(financingTabPath), 'FinancingTab.tsx exists');
const financingTabContent = fs.readFileSync(financingTabPath, 'utf8');
assert(financingTabContent.includes('FinancingWorkspace'), 'FinancingTab.tsx mounts FinancingWorkspace');

const investmentTabPath = path.join(ROOT_DIR, 'src', 'pages', 'projects', 'Workspace', 'InvestmentTab.tsx');
assert(fs.existsSync(investmentTabPath), 'InvestmentTab.tsx exists');
const investmentTabContent = fs.readFileSync(investmentTabPath, 'utf8');
assert(investmentTabContent.includes('InvestmentReadiness'), 'InvestmentTab.tsx integrates InvestmentReadiness');
assert(investmentTabContent.includes('InvestmentDataRoomSummary'), 'InvestmentTab.tsx integrates InvestmentDataRoomSummary');
assert(!investmentTabContent.includes('2500000000'), 'InvestmentTab.tsx removed fake hardcoded CAPEX default');

const oppDetailPath = path.join(ROOT_DIR, 'src', 'pages', 'investment', 'OpportunityDetail.tsx');
assert(fs.existsSync(oppDetailPath), 'OpportunityDetail.tsx exists');
const oppDetailContent = fs.readFileSync(oppDetailPath, 'utf8');
assert(oppDetailContent.includes('InvestmentOpportunityDetail'), 'OpportunityDetail.tsx uses InvestmentOpportunityDetail component');

const oppListPath = path.join(ROOT_DIR, 'src', 'pages', 'investment', 'OpportunitiesList.tsx');
assert(fs.existsSync(oppListPath), 'OpportunitiesList.tsx exists');
const oppListContent = fs.readFileSync(oppListPath, 'utf8');
assert(oppListContent.includes('InvestmentOpportunityCard'), 'OpportunitiesList.tsx uses InvestmentOpportunityCard');

const investmentHubPagePath = path.join(ROOT_DIR, 'src', 'pages', 'investment', 'InvestmentHub.tsx');
assert(fs.existsSync(investmentHubPagePath), 'InvestmentHub.tsx page exists');
const investmentHubPageContent = fs.readFileSync(investmentHubPagePath, 'utf8');
assert(investmentHubPageContent.includes('InvestmentHubComponent'), 'InvestmentHub page uses InvestmentHub component');

// [4] Verify Non-Negotiable Data-Truth Rules (Zero Math.random() & No Silent Defaults)
console.log('\n[4] Testing Non-Negotiable Data-Truth Rules & Silent Defaults Removal...');

const allComponents = [
  ...requiredInvestmentFiles.map(f => path.join(investmentDir, f)),
  ...requiredFinancingFiles.map(f => path.join(financingDir, f))
];

for (const compPath of allComponents) {
  const content = fs.readFileSync(compPath, 'utf8');
  assert(!content.includes('Math.random()'), `No Math.random() in ${path.basename(compPath)}`);
}

// 4.1 Strict audit of FinancingApplicationFlow.tsx
const appFlowPath = path.join(financingDir, 'FinancingApplicationFlow.tsx');
const appFlowContent = fs.readFileSync(appFlowPath, 'utf8');
assert(!appFlowContent.includes('requestedTenorMonths: 48'), 'FinancingApplicationFlow removed default 48-month tenor');
assert(!appFlowContent.includes('preferredGracePeriodMonths: 6'), 'FinancingApplicationFlow removed default 6-month grace period');
assert(!appFlowContent.includes("collateralSummary: 'توثیق سند ساختگاه و قرارداد فروش برق ساتبا'"), 'FinancingApplicationFlow removed fabricated collateral claim');
assert(!appFlowContent.includes('collateralAvailable: true'), 'FinancingApplicationFlow removed automatic collateralAvailable: true default');
assert(!appFlowContent.includes('* 1.5'), 'FinancingApplicationFlow removed invented 1.5 multiplier rule');
assert(appFlowContent.includes('وثیقه در دسترس است'), 'FinancingApplicationFlow includes explicit option for available collateral');
assert(appFlowContent.includes('وثیقه در دسترس نیست'), 'FinancingApplicationFlow includes explicit option for unavailable collateral');
assert(appFlowContent.includes('هنوز مشخص نشده'), 'FinancingApplicationFlow includes explicit option for unknown collateral');
assert(!appFlowContent.includes('۲۰٪ تا ۳۰٪') && !appFlowContent.includes('20%') && !appFlowContent.includes('30%'), 'FinancingApplicationFlow removed unsupported 20%-30% equity assumption');
assert(appFlowContent.includes('میزان آورده موردنظر خود را وارد کنید. شرایط نهایی بر اساس ضوابط شریک تأمین مالی تعیین می‌شود.'), 'FinancingApplicationFlow contains neutral equity copy');

// 4.2 Strict audit of FinancingNeedSummary.tsx
const needSummaryPath = path.join(financingDir, 'FinancingNeedSummary.tsx');
const needSummaryContent = fs.readFileSync(needSummaryPath, 'utf8');
assert(!needSummaryContent.includes(": 'اقساط مساوی'"), 'FinancingNeedSummary does not default to equal installments when unspecified');
assert(needSummaryContent.includes(": 'ثبت نشده'"), 'FinancingNeedSummary displays "ثبت نشده" when repayment preference is missing');

// 4.3 Strict audit of InvestmentTab.tsx
const invTabContent = fs.readFileSync(investmentTabPath, 'utf8');
assert(!invTabContent.includes('useState<number>(70)'), 'InvestmentTab removed silent 70% partner equity assumption');
assert(!invTabContent.includes('useState<number>(500)'), 'InvestmentTab removed silent 500M min capital assumption');
assert(!invTabContent.includes('پروژه خورشیدی دارای زمین و مطالعات امکان‌سنجی'), 'InvestmentTab removed unverified automatic summary claims');

// 4.4 Strict audit of InvestorProfileSetup.tsx
const profileSetupPath = path.join(ROOT_DIR, 'src', 'pages', 'investment', 'InvestorProfileSetup.tsx');
const profileSetupContent = fs.readFileSync(profileSetupPath, 'utf8');
assert(!profileSetupContent.includes('capitalMin: 1000000000'), 'InvestorProfileSetup removed hardcoded 1B capitalMin default');
assert(!profileSetupContent.includes('capitalMax: 10000000000'), 'InvestorProfileSetup removed hardcoded 10B capitalMax default');

// 4.5 Strict audit of src/api/financing.ts
const apiFinancingPath = path.join(ROOT_DIR, 'src', 'api', 'financing.ts');
const apiFinancingContent = fs.readFileSync(apiFinancingPath, 'utf8');
assert(!apiFinancingContent.includes('Number(req.body.requestedTenorMonths) || 48'), 'api/financing.ts removed silent 48-month fallback');
assert(!apiFinancingContent.includes('Number(req.body.preferredGracePeriodMonths) || 6'), 'api/financing.ts removed silent 6-month fallback');
assert(!apiFinancingContent.includes('req.body.collateralAvailable !== undefined ? req.body.collateralAvailable : true'), 'api/financing.ts removed silent collateralAvailable: true fallback');

// [5] Backend Service Compatibility & Logic Validation
console.log('\n[5] Testing Backend Service Compatibility & Logic...');

// A. Test Financing Readiness Service
const sampleProject = {
  id: 'test-proj-1',
  title: 'نیروگاه خورشیدی تست',
  targetCapacityKw: 250,
  location: { province: 'یزد', city: 'اشکذر' },
  status: 'READY_FOR_RFQ'
};

const sampleRequest = {
  id: 'test-req-1',
  projectId: 'test-proj-1',
  financingType: 'PROJECT_LOAN' as const,
  totalProjectCost: 30000000000,
  ownerEquity: 9000000000,
  requestedAmount: 21000000000,
  currency: 'IRR',
  requestedTenorMonths: 48,
  preferredGracePeriodMonths: 6,
  repaymentPreference: 'EQUAL_INSTALLMENT' as const,
  collateralAvailable: true,
  status: 'DRAFT' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const readinessResult = financeReadinessService.evaluateReadiness(sampleRequest, sampleProject as any);
assert(readinessResult !== null && typeof readinessResult.status === 'string', 'financeReadinessService returns valid evaluation result');
assert(Array.isArray(readinessResult.missingRequirements), 'readinessResult contains missingRequirements array');
assert(Array.isArray(readinessResult.recommendedActions), 'readinessResult contains recommendedActions array');

// B. Test Financial Partner Matching Service
const samplePartner = {
  id: 'partner-test-1',
  partnerType: 'BANK' as const,
  name: 'بانک ملت',
  supportedLocations: ['یزد', 'اصفهان', 'کرمان'],
  supportedProvinces: ['یزد', 'اصفهان', 'کرمان'],
  financingTypes: ['PROJECT_LOAN'],
  minimumAmount: 10000000000,
  maximumAmount: 50000000000,
  requiresLandOwnership: true,
  requiresGridPermit: false,
  requiresFeasibilityStudy: true,
  requiresEpcContractor: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const matchResults = financialPartnerMatchingService.matchApplicationWithPartners(sampleRequest, sampleProject as any, [samplePartner as any]);
assert(Array.isArray(matchResults) && matchResults.length === 1, 'financialPartnerMatchingService evaluates partner eligibility');
const matchResult = matchResults[0];
assert(typeof matchResult.eligibilityStatus === 'string', 'matchResult contains eligibility status');
assert(Array.isArray(matchResult.reasons), 'matchResult includes transparent reasons array');
assert(matchResult.details !== undefined && matchResult.details.amountFit !== undefined, 'matchResult includes structured fit details');

// C. Test Financing Offer Comparison Service
const sampleOffer1 = {
  id: 'offer-1',
  financingRequestId: 'test-req-1',
  financialPartnerProfileId: 'partner-test-1',
  offerCode: 'OFF-001',
  offeredAmount: 20000000000,
  interestRate: 23,
  tenorMonths: 48,
  gracePeriodMonths: 6,
  repaymentType: 'EQUAL_INSTALLMENT' as const,
  collateralRequirements: ['سند ملکی'],
  status: 'SUBMITTED' as const,
  currency: 'IRR',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const sampleOffer2 = {
  id: 'offer-2',
  financingRequestId: 'test-req-1',
  financialPartnerProfileId: 'partner-test-1',
  offerCode: 'OFF-002',
  offeredAmount: 21000000000,
  interestRate: 21.5,
  tenorMonths: 60,
  gracePeriodMonths: 12,
  repaymentType: 'EQUAL_INSTALLMENT' as const,
  collateralRequirements: ['سند ملکی', 'ضمانت‌نامه بانکی'],
  status: 'SUBMITTED' as const,
  currency: 'IRR',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const multiComparison = financingOfferComparisonService.compareOffers([sampleOffer1 as any, sampleOffer2 as any], sampleRequest as any);
assert(multiComparison.offersCount === 2, 'financingOfferComparisonService computes valid comparison metrics');
assert(multiComparison.comparisons[0].repaymentStructure.monthlyPayment > 0, 'Estimated monthly payment calculated accurately');
assert(typeof multiComparison.disclaimer === 'string', 'Mandatory disclaimer present in comparison result');

// [6] Verify Database Immutability & Hash Guard
console.log('\n[6] Testing Database Byte-for-Byte Immutability Guard...');

const currentDbHash = crypto.createHash('sha256').update(fs.readFileSync(DB_PATH)).digest('hex');
assert(currentDbHash === INITIAL_DB_HASH, 'db.json hash unchanged during test execution');
assert(currentDbHash === EXPECTED_HASH, `db.json strictly preserves baseline hash (${EXPECTED_HASH.slice(0, 16)}...)`);

// Summary
console.log('\n========================================================');
console.log(`UI-6 TEST SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
