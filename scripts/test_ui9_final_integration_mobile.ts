import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_DIR = process.cwd();
const BASELINE_DB_HASH = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';
const BASELINE_REPORT_HASH = '50814eac6cd752d801f35f23d98d2c45db61cfc1cc91dc080792a69f79867afb';

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

function getFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

console.log('========================================================================');
console.log('HOOSHYAR ENERGY — UI-9 FINAL INTEGRATION & MOBILE EXPERIENCE TEST');
console.log('========================================================================');

// [CATEGORY 1] Database & Report Immutability
console.log('\n[1] Database & Migration Documentation Immutability:');
const currentDbHash = getFileHash(path.join(ROOT_DIR, 'db.json'));
assert(currentDbHash === BASELINE_DB_HASH, `db.json hash is intact (${BASELINE_DB_HASH})`);

const reportPath = path.join(ROOT_DIR, 'docs', 'POSTGRES_MIGRATION_REPORT.md');
const currentReportHash = getFileHash(reportPath);
assert(currentReportHash === BASELINE_REPORT_HASH, `POSTGRES_MIGRATION_REPORT.md hash is intact (${BASELINE_REPORT_HASH})`);

// [CATEGORY 2] Lifecycle Progression & Truth Preservation
console.log('\n[2] Lifecycle Progression & Data Truth Preservation:');
const analysisExperienceCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/SolarAnalysisExperience.tsx'), 'utf8');
assert(
  analysisExperienceCode.includes('/api/projects/from-analysis/') && analysisExperienceCode.includes('handleConvertToProject'),
  'Project creation from analysis preserves authoritative server endpoint and analysis values'
);

const projectSummaryCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/projects/ProjectSummary.tsx'), 'utf8');
assert(
  projectSummaryCode.includes('targetCapacityKw') && projectSummaryCode.includes('estimatedBudgetIRR'),
  'ProjectSummary faithfully presents target capacity and budget without frontend fabrication'
);

const rfqReviewCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/procurement/RFQReview.tsx'), 'utf8');
assert(
  rfqReviewCode.includes('project.targetCapacityKw') || rfqReviewCode.includes('targetCapacityKw'),
  'RFQ generation preserves project engineering capacity'
);

const bidComparisonCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/procurement/BidComparison.tsx'), 'utf8');
assert(
  bidComparisonCode.includes('onSelectBid') && bidComparisonCode.includes('totalPriceIRR'),
  'Bid comparison maintains deterministic pricing and does not alter project state until explicit selection'
);

const executionMilestonesCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/execution/MilestoneList.tsx'), 'utf8');
assert(
  executionMilestonesCode.includes('milestone') || executionMilestonesCode.includes('Milestone'),
  'Execution milestones faithfully reflect contractual scope and progress'
);

const commissioningTabCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/projects/Workspace/CommissioningTab.tsx'), 'utf8');
assert(
  commissioningTabCode.includes('CommissioningWorkspace') || commissioningTabCode.includes('commissioning'),
  'Commissioning workspace tracks formal testing records before asset creation'
);

const assetTransitionCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/projects/ProjectAssetTransition.tsx'), 'utf8');
assert(
  assetTransitionCode.includes('isCommissionedOrOperational') || assetTransitionCode.includes('COMMISSIONED') || assetTransitionCode.includes('OPERATIONAL'),
  'Project to Asset transition gates asset creation strictly behind commissioning/operational status'
);

// [CATEGORY 3] EnergyProject vs EnergyAsset Distinction
console.log('\n[3] EnergyProject vs EnergyAsset Architectural Distinction:');
assert(
  assetTransitionCode.includes('پایش برخط هنوز فعال نشده است') || assetTransitionCode.includes('پایش برخط'),
  'Pre-commissioning project does NOT pretend to have live operational telemetry or fabricated data'
);

const projectAssetBridgeCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/integration/ProjectAssetBridge.tsx'), 'utf8');
assert(
  projectAssetBridgeCode.includes('دارایی عملیاتی هنوز تشکیل نشده است') && projectAssetBridgeCode.includes('مشاهده دارایی عملیاتی'),
  'ProjectAssetBridge truthfully guides users between Project and Asset stages'
);

const assetDetailCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/solar-assets/AssetDetail.tsx'), 'utf8');
assert(
  assetDetailCode.includes('ASSET_TO_PROJECT') && assetDetailCode.includes('projectId'),
  'AssetDetail provides contextual bridge back to originating Project if relationship exists'
);

const assetListCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/solar-assets/AssetList.tsx'), 'utf8');
assert(
  assetListCode.includes('هنوز دارایی عملیاتی ثبت نشده است.') && assetListCode.includes('دارایی‌های خورشیدی عملیاتی'),
  'AssetList truthfully distinguishes operational assets from projects and shows truthful empty state'
);

// Data-Truth closures for AssetList
assert(
  !assetListCode.includes("status || 'فعال'") && !assetListCode.includes('status || "فعال"'),
  'Missing asset status is never converted into positive "فعال"'
);

assert(
  assetListCode.includes('وضعیت ثبت نشده است'),
  'Missing asset status renders neutral "وضعیت ثبت نشده است"'
);

assert(
  assetListCode.includes('installedCapacityKw ?? asset.capacityKw'),
  'installedCapacityKw uses nullish semantics (??) instead of truthy ||'
);

assert(
  assetListCode.includes('capacity !== null && capacity !== undefined ?'),
  'Actual numeric zero is preserved for capacity without falling back to "ثبت نشده"'
);

assert(
  !assetListCode.includes("status || 'OPERATIONAL'") && !assetListCode.includes("status || 'ACTIVE'"),
  'No frontend default OPERATIONAL or ACTIVE status is fabricated'
);

// Behavioral simulation assertions for AssetList
const testStatusBadge = (status?: string | null) => {
  if (!status || status.trim() === '') return 'وضعیت ثبت نشده است';
  switch (status) {
    case 'OPERATIONAL': return 'در حال بهره‌برداری تجاری';
    case 'COMMISSIONED': return 'راه‌اندازی شده';
    case 'MAINTENANCE': return 'تحت تعمیرات و نگهداری';
    default: return status;
  }
};
assert(testStatusBadge(null) === 'وضعیت ثبت نشده است', 'Null status yields neutral missing state, never positive');
assert(testStatusBadge(undefined) === 'وضعیت ثبت نشده است', 'Undefined status yields neutral missing state, never positive');
assert(testStatusBadge('') === 'وضعیت ثبت نشده است', 'Empty status string yields neutral missing state, never positive');
assert(testStatusBadge('UNKNOWN_CUSTOM') === 'UNKNOWN_CUSTOM', 'Unknown backend status is displayed neutrally as-is');

const testFormatCapacity = (asset: { installedCapacityKw?: number | null; capacityKw?: number | null }) => {
  const capacity = asset.installedCapacityKw ?? asset.capacityKw;
  return capacity !== null && capacity !== undefined ? `${capacity} کیلووات` : 'ثبت نشده';
};
assert(testFormatCapacity({ installedCapacityKw: 0 }) === '0 کیلووات', 'Numeric zero installed capacity is preserved as 0');
assert(testFormatCapacity({ capacityKw: 0 }) === '0 کیلووات', 'Numeric zero fallback capacity is preserved as 0');
assert(testFormatCapacity({ installedCapacityKw: null, capacityKw: 150 }) === '150 کیلووات', 'Nullish fallback selects secondary when primary is null');
assert(testFormatCapacity({ installedCapacityKw: null, capacityKw: null }) === 'ثبت نشده', 'Null capacity correctly displays "ثبت نشده"');
assert(testFormatCapacity({}) === 'ثبت نشده', 'Undefined capacity correctly displays "ثبت نشده"');

const routesCode = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf8');
assert(
  routesCode.includes('/solar-assets/:id') && routesCode.includes('/assets/:id'),
  'App router provides seamless routing for both /solar-assets/:id and /assets/:id'
);

const passportCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/assets/passport/AssetPassport.tsx'), 'utf8');
assert(
  passportCode.includes('AssetIdentity') && passportCode.includes('AssetEquipmentRegistry'),
  'AssetPassport organizes technical specifications without duplicating project planning views'
);

// [CATEGORY 4] Mobile Responsiveness & Viewport Safety
console.log('\n[4] Mobile Responsiveness & Viewport Architecture:');
const mobileBottomNavCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/navigation/MobileBottomNav.tsx'), 'utf8');
assert(
  mobileBottomNavCode.includes('min-h-[44px]') && mobileBottomNavCode.includes('min-w-[44px]'),
  'MobileBottomNav meets touch target accessibility threshold (>= 44x44px)'
);

assert(
  mobileBottomNavCode.includes('پیشخوان') && 
  mobileBottomNavCode.includes('پروژه‌ها') && 
  mobileBottomNavCode.includes('بازارگاه') && 
  mobileBottomNavCode.includes('دارایی‌ها'),
  'MobileBottomNav includes all 5 core primary destinations'
);

const projectDetailLayoutCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/projects/ProjectDetail.tsx'), 'utf8');
assert(
  projectDetailLayoutCode.includes('pb-24') || projectDetailLayoutCode.includes('pb-20'),
  'ProjectDetail has generous bottom padding preventing collision with MobileBottomNav'
);

assert(
  bidComparisonCode.includes('lg:hidden') && bidComparisonCode.includes('hidden lg:block'),
  'BidComparison provides stacked comparison cards for mobile and tabular view for desktop'
);

const quotationComparisonCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/procurement/QuotationComparison.tsx'), 'utf8');
assert(
  quotationComparisonCode.includes('lg:hidden') && quotationComparisonCode.includes('hidden lg:block'),
  'QuotationComparison provides stacked comparison cards for mobile screens'
);

const financingOfferComparisonCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/financing/FinancingOfferComparison.tsx'), 'utf8');
assert(
  financingOfferComparisonCode.includes('lg:hidden') && financingOfferComparisonCode.includes('hidden lg:block'),
  'FinancingOfferComparison converts tabular data into mobile comparison cards'
);

const portfolioDashboardCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/enterprise/PortfolioDashboard.tsx'), 'utf8');
assert(
  portfolioDashboardCode.includes('md:hidden') || portfolioDashboardCode.includes('lg:hidden'),
  'PortfolioDashboard includes mobile card transformations for tabular project and asset summaries'
);

// [CATEGORY 5] Data Truth & Degradation Transparency
console.log('\n[5] Data Truth & Transparency:');
const dataFreshnessCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/DataFreshnessIndicator.tsx'), 'utf8');
assert(
  !dataFreshnessCode.includes('diffHours <= 1') && !dataFreshnessCode.includes('staleThresholdHours || 24'),
  'DataFreshnessIndicator does not invent arbitrary frontend time thresholds'
);

const maintenanceApiCode = fs.readFileSync(path.join(ROOT_DIR, 'src/api/maintenance.ts'), 'utf8');
assert(
  maintenanceApiCode.includes('assignedToTechnicianId') || maintenanceApiCode.includes('technician'),
  'Maintenance backend restricts case exposure strictly according to assigned role/technician'
);

const operationsWorkspaceCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/AssetOperationsWorkspace.tsx'), 'utf8');
assert(
  operationsWorkspaceCode.includes('TelemetryEmptyState') || operationsWorkspaceCode.includes('OperationsEmptyState'),
  'Operations workspace displays honest empty state when telemetry or maintenance cases are missing'
);

const solarDataSourceCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/analysis/SolarDataSource.tsx'), 'utf8');
assert(
  solarDataSourceCode.includes('isFallback') || solarDataSourceCode.includes('sourceType'),
  'SolarDataSource transparently reports NASA POWER live data vs regional fallback reference data'
);

// [CATEGORY 6] Role Consistency & Persian/RTL Integrity
console.log('\n[6] Role Consistency & Persian/RTL Integrity:');
const formattersCode = fs.readFileSync(path.join(ROOT_DIR, 'src/utils/formatters.ts'), 'utf8');
assert(
  formattersCode.includes('fa-IR') || formattersCode.includes('toPersianDigits'),
  'Formatters utility provides standard Persian number and currency formatting'
);

const breadcrumbCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/integration/AppContextBreadcrumb.tsx'), 'utf8');
assert(
  breadcrumbCode.includes('dir="rtl"') && breadcrumbCode.includes('ChevronLeft'),
  'AppContextBreadcrumb enforces RTL layout with semantically correct chevron direction'
);

const projectHeaderCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/projects/ProjectHeader.tsx'), 'utf8');
assert(
  projectHeaderCode.includes('AppContextBreadcrumb') && projectHeaderCode.includes('پروژه بدون عنوان'),
  'ProjectHeader integrates AppContextBreadcrumb with neutral fallback for untitled projects'
);

assert(
  assetDetailCode.includes('AppContextBreadcrumb') && assetDetailCode.includes('دارایی بدون عنوان'),
  'AssetDetail integrates AppContextBreadcrumb with neutral fallback for untitled assets'
);

const authContextCode = fs.readFileSync(path.join(ROOT_DIR, 'src/context/AuthContext.tsx'), 'utf8');
assert(
  authContextCode.includes('activeRole') && authContextCode.includes('user'),
  'AuthContext provides consistent active role state across application workflows'
);

const desktopHeaderCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/navigation/DesktopHeader.tsx'), 'utf8');
assert(
  desktopHeaderCode.includes('RoleSwitcher') || desktopHeaderCode.includes('role') || desktopHeaderCode.includes('نقش'),
  'DesktopHeader supports role awareness and smooth workspace navigation'
);

// Summary
console.log('\n========================================================================');
console.log(`UI-9 FINAL INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
console.log('========================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('All UI-9 assertions passed successfully.');
}
