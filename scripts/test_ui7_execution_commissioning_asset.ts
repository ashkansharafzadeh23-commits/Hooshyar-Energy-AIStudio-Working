import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_DIR = process.cwd();
const BASELINE_HASH = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';

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

function getDbHash(): string {
  const dbPath = path.join(ROOT_DIR, 'db.json');
  const content = fs.readFileSync(dbPath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

console.log('========================================================');
console.log('HOOSHYAR ENERGY — UI-7 EXECUTION & ASSET PASSPORT DATA-TRUTH TEST SUITE');
console.log('========================================================');

const initialDbHash = getDbHash();

// [1] Execution Components
console.log('\n[1] Testing Component Architecture in src/components/execution/...');
const executionFiles = [
  'ExecutionWorkspace.tsx',
  'ExecutionOverview.tsx',
  'ExecutionStageNavigator.tsx',
  'ExecutionNextAction.tsx',
  'ExecutionAttentionItems.tsx',
  'MilestoneList.tsx',
  'MilestoneCard.tsx',
  'MilestoneDetail.tsx',
  'SiteActivityTimeline.tsx',
  'ExecutionDocuments.tsx',
  'EquipmentDeliverySummary.tsx',
  'CommissioningReadiness.tsx',
  'CommissioningChecklist.tsx',
  'CommissioningTestResult.tsx',
  'CommissioningReview.tsx',
  'HandoverReview.tsx',
  'ProjectToAssetTransition.tsx',
  'ExecutionEmptyState.tsx',
  'index.ts'
];

executionFiles.forEach(file => {
  const fullPath = path.join(ROOT_DIR, 'src/components/execution', file);
  assert(fs.existsSync(fullPath), `Execution component exists: ${file}`);
});

// [2] Asset Passport Components
console.log('\n[2] Testing Component Architecture in src/components/assets/passport/...');
const passportFiles = [
  'AssetPassport.tsx',
  'AssetIdentity.tsx',
  'AssetEquipmentRegistry.tsx',
  'AssetWarrantySummary.tsx',
  'AssetDocumentRegistry.tsx',
  'AssetCommissioningRecord.tsx',
  'AssetContractSummary.tsx',
  'AssetMonitoringStatus.tsx',
  'AssetMaintenanceHistory.tsx',
  'AssetHistoryTimeline.tsx',
  'index.ts'
];

passportFiles.forEach(file => {
  const fullPath = path.join(ROOT_DIR, 'src/components/assets/passport', file);
  assert(fs.existsSync(fullPath), `Passport component exists: ${file}`);
});

// [3] Page Integrations
console.log('\n[3] Testing Page Integrations & Workspace Mounting...');
const assetDetailPage = path.join(ROOT_DIR, 'src/pages/solar-assets/AssetDetail.tsx');
assert(fs.existsSync(assetDetailPage), 'SolarAssetDetail.tsx exists');
const assetDetailContent = fs.readFileSync(assetDetailPage, 'utf-8');
assert(assetDetailContent.includes('AssetPassport'), 'SolarAssetDetail mounts AssetPassport component');
assert(!assetDetailContent.includes('mockPerformanceData'), 'SolarAssetDetail removed fabricated mockPerformanceData');

const assetTabFile = path.join(ROOT_DIR, 'src/pages/projects/Workspace/AssetTab.tsx');
assert(fs.existsSync(assetTabFile), 'AssetTab.tsx exists');
const assetTabContent = fs.readFileSync(assetTabFile, 'utf-8');
assert(assetTabContent.includes('ProjectToAssetTransition'), 'AssetTab mounts ProjectToAssetTransition');
assert(assetTabContent.includes('AssetPassport'), 'AssetTab mounts AssetPassport');

const commTabFile = path.join(ROOT_DIR, 'src/pages/projects/Workspace/CommissioningTab.tsx');
assert(fs.existsSync(commTabFile), 'CommissioningTab.tsx exists');
const commTabContent = fs.readFileSync(commTabFile, 'utf-8');
assert(commTabContent.includes('CommissioningReadiness'), 'CommissioningTab mounts CommissioningReadiness');
assert(commTabContent.includes('CommissioningChecklist'), 'CommissioningTab mounts CommissioningChecklist');
assert(commTabContent.includes('CommissioningReview'), 'CommissioningTab mounts CommissioningReview');

const handoverTabFile = path.join(ROOT_DIR, 'src/pages/projects/Workspace/HandoverTab.tsx');
assert(fs.existsSync(handoverTabFile), 'HandoverTab.tsx exists');
const handoverTabContent = fs.readFileSync(handoverTabFile, 'utf-8');
assert(handoverTabContent.includes('HandoverReview'), 'HandoverTab mounts HandoverReview');
assert(handoverTabContent.includes('ProjectToAssetTransition'), 'HandoverTab mounts ProjectToAssetTransition');

const milestonesTabFile = path.join(ROOT_DIR, 'src/pages/projects/Workspace/MilestonesTab.tsx');
assert(fs.existsSync(milestonesTabFile), 'MilestonesTab.tsx exists');
const milestonesTabContent = fs.readFileSync(milestonesTabFile, 'utf-8');
assert(milestonesTabContent.includes('MilestoneList'), 'MilestonesTab mounts MilestoneList');

// [4] Data-Truth Assertions & Closure Gate Requirements
console.log('\n[4] Testing Strict UI-7 Data-Truth Invariants...');

// 4.1 AssetCommissioningRecord.tsx
const commRecordPath = path.join(ROOT_DIR, 'src/components/assets/passport/AssetCommissioningRecord.tsx');
const commRecordCode = fs.readFileSync(commRecordPath, 'utf-8');

assert(!commRecordCode.includes('ثبت سیستمی ناظر'), 'AssetCommissioningRecord: No fake "ثبت سیستمی ناظر" approver invented');
assert(!commRecordCode.includes('تأیید قطعی شده'), 'AssetCommissioningRecord: No unconditional "تأیید قطعی شده" badge');
assert(!commRecordCode.includes('تاریخ تأیید رسمی'), 'AssetCommissioningRecord: No misleading "تاریخ تأیید رسمی" label applied to arbitrary dates');
assert(!commRecordCode.includes('آزمون‌های مصوب'), 'AssetCommissioningRecord: No unverified "آزمون‌های مصوب" wording');
assert(!commRecordCode.includes('مبنای بهره‌برداری تجاری'), 'AssetCommissioningRecord: No unverified commercial operation claim');
assert(commRecordCode.includes("commissioningRecord.status === 'APPROVED'"), 'AssetCommissioningRecord: Explicit backend status equality required for approval');
assert(commRecordCode.includes('تأییدکننده ثبت نشده است'), 'AssetCommissioningRecord: Truthful missing approver fallback present');
assert(commRecordCode.includes('وضعیت تأیید ثبت نشده است') || commRecordCode.includes('وضعیت:'), 'AssetCommissioningRecord: Neutral missing/actual status badge present');
assert(commRecordCode.includes('تاریخ تأیید ثبت نشده است'), 'AssetCommissioningRecord: Truthful missing approval date fallback present');
assert(commRecordCode.includes('نتایج آزمون‌های ثبت‌شده در پرونده'), 'AssetCommissioningRecord: Factual neutral language for recorded tests');

// 4.2 AssetContractSummary.tsx
const contractSummaryPath = path.join(ROOT_DIR, 'src/components/assets/passport/AssetContractSummary.tsx');
const contractSummaryCode = fs.readFileSync(contractSummaryPath, 'utf-8');

assert(!contractSummaryCode.includes('قرارداد معتبر و نافذ'), 'AssetContractSummary: No unverified legal claim "قرارداد معتبر و نافذ"');
assert(!contractSummaryCode.includes('قرارداد مهندسی، تأمین و احداث نیروگاه (EPC)'), 'AssetContractSummary: No fabricated EPC contract title fallback');
assert(contractSummaryCode.includes('عنوان قرارداد ثبت نشده است'), 'AssetContractSummary: Missing contract title truthfully handled');
assert(contractSummaryCode.includes('contract.revisedContractValue ?? contract.contractValue'), 'AssetContractSummary: Nullish coalescing preserves numeric zero for contract value');
assert(contractSummaryCode.includes('پیش‌نویس') && contractSummaryCode.includes('فعال') && contractSummaryCode.includes('تکمیل‌شده'), 'AssetContractSummary: Factual mapped backend status labels');

// 4.3 AssetDocumentRegistry.tsx
const docRegistryPath = path.join(ROOT_DIR, 'src/components/assets/passport/AssetDocumentRegistry.tsx');
const docRegistryCode = fs.readFileSync(docRegistryPath, 'utf-8');

assert(!docRegistryCode.includes('اسناد قانونی، نقشه‌های چون‌ساخت، تأییدیه‌های دیسپاچینگ و کتابچه‌های O&M'), 'AssetDocumentRegistry: No fabricated document categories implied in subtitle');
assert(!docRegistryCode.includes('بایگانی اسناد و مدارک رسمی دارایی'), 'AssetDocumentRegistry: Removed unverified "رسمی" from header');
assert(docRegistryCode.includes('اسناد و مدارک ثبت‌شده مرتبط با این دارایی'), 'AssetDocumentRegistry: Factual neutral subtitle used');
assert(docRegistryCode.includes('اسناد و مدارک دارایی'), 'AssetDocumentRegistry: Neutral header title used');

// 4.4 AssetWarrantySummary.tsx
const warrantySummaryPath = path.join(ROOT_DIR, 'src/components/assets/passport/AssetWarrantySummary.tsx');
const warrantySummaryCode = fs.readFileSync(warrantySummaryPath, 'utf-8');

assert(!warrantySummaryCode.includes('ضمانت‌نامه‌ها و گارانتی‌های معتبر'), 'AssetWarrantySummary: Removed unverified "معتبر" claim');
assert(!warrantySummaryCode.includes('ضمانت‌نامه رسمی'), 'AssetWarrantySummary: Removed unverified "رسمی" claim');
assert(warrantySummaryCode.includes('ضمانت‌نامه‌ها و گارانتی‌های ثبت‌شده'), 'AssetWarrantySummary: Uses factual "ثبت‌شده" phrasing');

// 4.5 AssetIdentity.tsx & AssetEquipmentRegistry.tsx
const identityPath = path.join(ROOT_DIR, 'src/components/assets/passport/AssetIdentity.tsx');
const identityCode = fs.readFileSync(identityPath, 'utf-8');

assert(!identityCode.includes("asset.technology || 'خورشیدی متصل به شبکه (Solar PV)'"), 'AssetIdentity: Missing technology is not replaced with fabricated fallback');
assert(!identityCode.includes('تاریخ راه‌اندازی رسمی (COD)'), 'AssetIdentity: Removed unverified "رسمی" from COD label');
assert(identityCode.includes('asset.installedCapacityKw !== undefined && asset.installedCapacityKw !== null'), 'AssetIdentity: Preserves numeric zero capacity');

const equipRegistryPath = path.join(ROOT_DIR, 'src/components/assets/passport/AssetEquipmentRegistry.tsx');
const equipRegistryCode = fs.readFileSync(equipRegistryPath, 'utf-8');
assert(equipRegistryCode.includes('comp.ratedCapacity !== undefined && comp.ratedCapacity !== null'), 'AssetEquipmentRegistry: Preserves numeric zero ratedCapacity');

// 4.6 AssetMonitoringStatus.tsx
const monitoringPath = path.join(ROOT_DIR, 'src/components/assets/passport/AssetMonitoringStatus.tsx');
const monitoringCode = fs.readFileSync(monitoringPath, 'utf-8');
assert(!monitoringCode.includes('پروتکل Modbus TCP/IP'), 'AssetMonitoringStatus: Removed fabricated fallback Modbus TCP/IP string');

// 4.7 ExecutionOverview.tsx & ProjectToAssetTransition.tsx
const execOverviewPath = path.join(ROOT_DIR, 'src/components/execution/ExecutionOverview.tsx');
const execOverviewCode = fs.readFileSync(execOverviewPath, 'utf-8');
assert(!execOverviewCode.includes('تحویل قطعی'), 'ExecutionOverview: Removed unverified "تحویل قطعی" label');
assert(!execOverviewCode.includes('تأیید قطعی شد'), 'ExecutionOverview: Removed unverified "تأیید قطعی شد" label');
assert(execOverviewCode.includes("commApproved ? 'تأیید شده ✓'"), 'ExecutionOverview: Truthful "تأیید شده ✓" used');
assert(execOverviewCode.includes('project.targetCapacityKw ??'), 'ExecutionOverview: Preserves numeric zero for project capacity');

const transitionPath = path.join(ROOT_DIR, 'src/components/execution/ProjectToAssetTransition.tsx');
const transitionCode = fs.readFileSync(transitionPath, 'utf-8');
assert(!transitionCode.includes('شناسنامه دیجیتال نیروگاه'), 'ProjectToAssetTransition: Removed fabricated fallback title');
assert(transitionCode.includes('existingAsset.installedCapacityKw !== undefined && existingAsset.installedCapacityKw !== null'), 'ProjectToAssetTransition: Preserves numeric zero capacity');

// 4.8 CommissioningChecklist.tsx (No unverified SATBA/Tavanir regulatory claims)
const commChecklistPath = path.join(ROOT_DIR, 'src/components/execution/CommissioningChecklist.tsx');
const commChecklistCode = fs.readFileSync(commChecklistPath, 'utf-8');
assert(!commChecklistCode.includes('استانداردهای ساتبا و توانیر'), 'CommissioningChecklist: Removed unverified SATBA/Tavanir standards claim');
assert(!commChecklistCode.includes('آزمون‌های استاندارد الکتریکی'), 'CommissioningChecklist: Removed unverified standard electrical test claim');
assert(commChecklistCode.includes('آزمون‌های الکتریکی، حفاظتی و اتصال به شبکه ثبت‌شده در پرونده پروژه'), 'CommissioningChecklist: Contains factual project tests description');
assert(commChecklistCode.includes('آزمون‌های راه‌اندازی ثبت‌شده برای پروژه در این بخش نمایش داده می‌شوند'), 'CommissioningChecklist: Contains factual empty state text');

// 4.9 Global UI-7 Forbidden Unsafe/Fabricated Claims Scan
const forbiddenPhrases = [
  'استانداردهای ساتبا',
  'استانداردهای توانیر',
  'استاندارد الکتریکی',
  'تأیید رسمی',
  'تأیید قطعی',
  'مجوز رسمی',
  'مورد تأیید کارفرما',
  'تأیید مهندس ناظر'
];

const allUI7Files = [
  ...executionFiles.map(f => path.join('src/components/execution', f)),
  ...passportFiles.map(f => path.join('src/components/assets/passport', f))
];

allUI7Files.forEach(relPath => {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    forbiddenPhrases.forEach(phrase => {
      assert(!content.includes(phrase), `No unsupported phrase "${phrase}" in ${path.basename(relPath)}`);
    });
  }
});

// 4.10 Zero Math.random() audit
allUI7Files.forEach(relPath => {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert(!content.includes('Math.random()'), `No Math.random() in ${path.basename(relPath)}`);
  }
});

// [5] Database Byte-for-Byte Immutability Guard
console.log('\n[5] Testing Database Byte-for-Byte Immutability Guard...');
const finalDbHash = getDbHash();
assert(initialDbHash === finalDbHash, 'db.json hash unchanged during test execution');
assert(finalDbHash === BASELINE_HASH, `db.json strictly preserves baseline hash (${BASELINE_HASH.substring(0, 16)}...)`);

console.log('========================================================');
console.log(`UI-7 TEST SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
}
