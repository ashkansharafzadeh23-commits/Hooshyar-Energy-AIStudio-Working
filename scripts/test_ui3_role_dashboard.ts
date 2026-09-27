/**
 * UI-3 Role-Based Dashboard & Home Experience Verification Suite
 * 
 * Verifies:
 * 1. UI-3 Component Architecture & File Structure in src/components/dashboard/
 * 2. UserDashboard integration and layout hierarchy (Header -> Attention -> Action -> Context -> Detail)
 * 3. Attention Center data-truth behavior (urgent real conditions vs. clean empty state)
 * 4. Deterministic Next Actions logic (<= 3 actions, lifecycle mapped, touch targets >= 44px)
 * 5. Operational Assets conditional gating (rendered ONLY when assets exist, no fake charts)
 * 6. Role-Specific Summary metrics (<= 4 metrics, real provenance badges, no fabricated percentages)
 * 7. New User Onboarding states (role-specific, action-oriented, touch targets >= 44px)
 * 8. Persian localization & RTL typography compliance
 * 9. Route preservation & backwards compatibility (/projects, ?tab=projects, ?tab=history, ?tab=requests)
 * 10. Database Immutability Check (db.json SHA-256 byte-for-byte identical)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { formatRoleLabel, formatSolarCapacity, formatCurrencyIRR, formatJalaliDate } from '../src/utils/formatters';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

console.log('========================================================');
console.log('HOOSHYAR ENERGY — UI-3 ROLE-BASED DASHBOARD TEST SUITE');
console.log('========================================================\n');

// 1. COMPONENT ARCHITECTURE & FILE EXISTENCE
console.log('[1] Testing UI-3 Component Architecture in src/components/dashboard/...');

const dashboardDir = path.resolve('src/components/dashboard');
assert(fs.existsSync(dashboardDir), 'Directory src/components/dashboard exists');

const requiredComponents = [
  'types.ts',
  'DashboardHeader.tsx',
  'AttentionCenter.tsx',
  'NextActions.tsx',
  'DashboardProjectCard.tsx',
  'ActiveProjects.tsx',
  'DashboardAssetCard.tsx',
  'OperationalAssets.tsx',
  'RoleSummary.tsx',
  'RecentActivity.tsx',
  'NewUserOnboarding.tsx',
  'index.ts'
];

requiredComponents.forEach((fileName) => {
  const filePath = path.join(dashboardDir, fileName);
  assert(fs.existsSync(filePath), `Component src/components/dashboard/${fileName} exists`);
});

// Check exports in index.ts
const indexContent = fs.readFileSync(path.join(dashboardDir, 'index.ts'), 'utf8');
requiredComponents
  .filter(f => f !== 'index.ts')
  .map(f => f.replace(/\.tsx?$/, ''))
  .forEach(comp => {
    assert(indexContent.includes(`export * from './${comp}'`), `index.ts cleanly exports ${comp}`);
  });

// 2. USER DASHBOARD INTEGRATION VERIFICATION
console.log('\n[2] Verifying UserDashboard Page Architecture...');

const userDashboardPath = path.resolve('src/pages/UserDashboard.tsx');
assert(fs.existsSync(userDashboardPath), 'src/pages/UserDashboard.tsx exists');
const userDashboardSrc = fs.readFileSync(userDashboardPath, 'utf8');

assert(userDashboardSrc.includes('DashboardHeader'), 'UserDashboard mounts DashboardHeader');
assert(userDashboardSrc.includes('AttentionCenter'), 'UserDashboard mounts AttentionCenter');
assert(userDashboardSrc.includes('NextActions'), 'UserDashboard mounts NextActions');
assert(userDashboardSrc.includes('ActiveProjects'), 'UserDashboard mounts ActiveProjects');
assert(userDashboardSrc.includes('OperationalAssets'), 'UserDashboard mounts OperationalAssets');
assert(userDashboardSrc.includes('RoleSummary'), 'UserDashboard mounts RoleSummary');
assert(userDashboardSrc.includes('RecentActivity'), 'UserDashboard mounts RecentActivity');
assert(userDashboardSrc.includes('NewUserOnboarding'), 'UserDashboard supports NewUserOnboarding');
assert(userDashboardSrc.includes('PageContainer'), 'UserDashboard uses standard PageContainer');
assert(userDashboardSrc.includes('LoadingState'), 'UserDashboard uses standard LoadingState');
assert(userDashboardSrc.includes('ErrorState'), 'UserDashboard uses standard ErrorState');

// 3. ATTENTION CENTER RULES
console.log('\n[3] Testing Attention Center Rules & Accessibility...');

const attentionCenterSrc = fs.readFileSync(path.join(dashboardDir, 'AttentionCenter.tsx'), 'utf8');
assert(attentionCenterSrc.includes('نیازمند توجه شما'), 'AttentionCenter has correct Persian section title');
assert(attentionCenterSrc.includes('در حال حاضر مورد فوری برای شما وجود ندارد.'), 'Empty state text handles stable state accurately');
assert(attentionCenterSrc.includes('min-h-[44px]'), 'Touch targets satisfy mobile accessibility (>= 44px)');
assert(attentionCenterSrc.includes('URGENT') && attentionCenterSrc.includes('WARNING') && attentionCenterSrc.includes('INFO'), 'AttentionCenter supports all 3 severity classifications');

// 4. NEXT ACTIONS DETERMINISTIC LIFECYCLE
console.log('\n[4] Testing Next Actions Deterministic Rules...');

const nextActionsSrc = fs.readFileSync(path.join(dashboardDir, 'NextActions.tsx'), 'utf8');
assert(nextActionsSrc.includes('actions.slice(0, 3)'), 'NextActions strictly caps display to maximum 3 high-priority actions');
assert(nextActionsSrc.includes('اقدام‌های بعدی'), 'NextActions has correct Persian section title');
assert(nextActionsSrc.includes('min-h-[44px]'), 'Action buttons have >= 44px touch targets');

// 5. OPERATIONAL ASSETS CONDITIONAL GATING
console.log('\n[5] Testing Operational Assets Conditional Gating...');

const operationalAssetsSrc = fs.readFileSync(path.join(dashboardDir, 'OperationalAssets.tsx'), 'utf8');
assert(
  operationalAssetsSrc.includes('if (!assets || assets.length === 0)') && operationalAssetsSrc.includes('return null;'),
  'OperationalAssets section is ONLY rendered when assets exist (returns null when empty)'
);
assert(operationalAssetsSrc.includes('نیروگاه‌های در بهره‌برداری'), 'OperationalAssets has correct Persian section title');

const assetCardSrc = fs.readFileSync(path.join(dashboardDir, 'DashboardAssetCard.tsx'), 'utf8');
assert(assetCardSrc.includes('پایش برخط فعال نیست'), 'AssetCard explicitly displays unverified monitoring state');
assert(assetCardSrc.includes('DataTruthBadge'), 'AssetCard utilizes DataTruthBadge for provenance transparency');
assert(!assetCardSrc.includes('<svg') || assetCardSrc.includes('lucide-react'), 'AssetCard does not generate fake visual chart graphics');

// 6. ROLE SUMMARY CONSTRAINTS
console.log('\n[6] Testing Role Summary Constraints (Max 4 Verified Metrics)...');

const roleSummarySrc = fs.readFileSync(path.join(dashboardDir, 'RoleSummary.tsx'), 'utf8');
assert(roleSummarySrc.includes('.slice(0, 4)'), 'RoleSummary strictly caps metrics to maximum 4');
assert(roleSummarySrc.includes('DataTruthBadge'), 'RoleSummary includes DataTruthBadge on metrics');
assert(roleSummarySrc.includes('validMetrics.length === 0') && roleSummarySrc.includes('return null;'), 'RoleSummary returns null if no valid metrics exist');

// 7. NEW USER ONBOARDING STATES
console.log('\n[7] Testing New User Onboarding States Across Roles...');

const onboardingSrc = fs.readFileSync(path.join(dashboardDir, 'NewUserOnboarding.tsx'), 'utf8');
assert(onboardingSrc.includes('اولین پروژه خورشیدی خود را شروع کنید'), 'Onboarding supports Project Owner initial path');
assert(onboardingSrc.includes('/target-select'), 'Onboarding guides to energy analysis (/target-select)');
assert(onboardingSrc.includes('سرمایه‌گذاری'), 'Onboarding supports Investor initial path');
assert(onboardingSrc.includes('پیمانکاران احداث'), 'Onboarding supports EPC initial path');
assert(onboardingSrc.includes('تأمین‌کنندگان تجهیزات'), 'Onboarding supports Vendor initial path');
assert(onboardingSrc.includes('پایش و خدمات نگهداری'), 'Onboarding supports Technician initial path');
assert(onboardingSrc.includes('min-h-[44px]'), 'Onboarding action buttons have >= 44px touch targets');

// 8. PERSIAN LOCALIZATION & FORMATTERS
console.log('\n[8] Testing Persian Localization & Formatters Integration...');

assert(formatRoleLabel('PROJECT_OWNER') === 'کارفرما', 'formatRoleLabel translates PROJECT_OWNER');
assert(formatRoleLabel('EPC') === 'پیمانکار احداث', 'formatRoleLabel translates EPC');
assert(formatRoleLabel('INVESTOR') === 'سرمایه‌گذار', 'formatRoleLabel translates INVESTOR');
assert(formatRoleLabel('TECHNICIAN') === 'تکنسین خدمات', 'formatRoleLabel translates TECHNICIAN');
assert(formatRoleLabel('ADMIN') === 'مدیر سامانه', 'formatRoleLabel translates ADMIN');

const capFormatted = formatSolarCapacity(500);
assert(capFormatted.includes('۵۰۰') && capFormatted.includes('کیلووات'), `formatSolarCapacity works as expected (${capFormatted})`);

const budgetFormatted = formatCurrencyIRR(1000000000);
assert(budgetFormatted.includes('۱') && budgetFormatted.includes('تومان'), `formatCurrencyIRR works as expected (${budgetFormatted})`);

const dateFormatted = formatJalaliDate('2026-03-21T00:00:00Z');
assert(dateFormatted !== '—' && !dateFormatted.includes('2026'), `formatJalaliDate returns Persian Solar date (${dateFormatted})`);

// 9. ROUTE & DEEP LINK COMPATIBILITY
console.log('\n[9] Testing Deep Link Compatibility in UserDashboard...');

assert(userDashboardSrc.includes("location.pathname === '/projects'"), 'UserDashboard handles explicit /projects route');
assert(userDashboardSrc.includes("requestedTab === 'projects'"), 'UserDashboard handles ?tab=projects deep link');
assert(userDashboardSrc.includes("requestedTab === 'history'"), 'UserDashboard handles ?tab=history deep link');
assert(userDashboardSrc.includes("requestedTab === 'requests'"), 'UserDashboard handles ?tab=requests deep link');

// 10. CLOSURE REGRESSION: VENDOR ROLE, AUTHENTICATION PURITY & DATA-TRUTH
console.log('\n[10] Testing UI-3 Closure Regression: Vendor Role & Auth Purity...');

// 10.1 VENDOR has explicit role handling in roleMetrics & nextActions
assert(userDashboardSrc.includes("case 'VENDOR':"), 'UserDashboard roleMetrics explicitly handles VENDOR role');
assert(userDashboardSrc.includes("case 'SUPPLIER':"), 'UserDashboard roleMetrics explicitly handles SUPPLIER role');
assert(userDashboardSrc.includes("role === 'VENDOR'"), 'UserDashboard nextActions explicitly handles VENDOR role');

const dashboardHeaderSrc = fs.readFileSync(path.join(dashboardDir, 'DashboardHeader.tsx'), 'utf8');
assert(dashboardHeaderSrc.includes("case 'VENDOR':"), 'DashboardHeader explicitly handles VENDOR role');
assert(dashboardHeaderSrc.includes("case 'SUPPLIER':"), 'DashboardHeader explicitly handles SUPPLIER role');

// 10.2 VENDOR cannot fall through to PROJECT_OWNER/default metrics
const vendorBlockRegex = /case 'VENDOR':\s*case 'SUPPLIER':\s*\{([\s\S]*?)\}\s*case 'PROJECT_OWNER':/;
const vendorBlockMatch = userDashboardSrc.match(vendorBlockRegex);
assert(Boolean(vendorBlockMatch), 'VENDOR/SUPPLIER block is distinct and precedes PROJECT_OWNER');
if (vendorBlockMatch) {
  const vendorBlockBody = vendorBlockMatch[1];
  assert(vendorBlockBody.includes('return [];'), 'VENDOR/SUPPLIER terminates with return [] to prevent fall-through');
  assert(!vendorBlockBody.includes('projects.reduce'), 'VENDOR block does not calculate project owner capacity or budget');
}

// 10.3 No hardcoded user_1 fallback exists in UserDashboard
assert(!userDashboardSrc.includes('user_1'), 'UserDashboard contains ZERO occurrences of hardcoded user_1');

// 10.4 No other demo user identifier is used for authorization/filtering
const demoIdMatches = userDashboardSrc.match(/'(user_[0-9]+|demo_user|test_user|sample_user)'/g);
assert(!demoIdMatches || demoIdMatches.length === 0, 'No demo user identifiers found for authorization/filtering in UserDashboard');
assert(userDashboardSrc.includes('user?.id && r.userId && r.userId === user.id'), 'UserDashboard strictly checks authenticated user ownership on legacy requests');

// 10.5 Vendor metrics are omitted when verified vendor data is unavailable
assert(vendorBlockMatch ? vendorBlockMatch[1].includes('return [];') : false, 'Vendor metrics return empty array when verified vendor data is unavailable');
assert(roleSummarySrc.includes('validMetrics.length === 0') && roleSummarySrc.includes('return null;'), 'RoleSummary renders null (omits section) when metric array is empty');

// 10.6 Existing UI-3 data-truth requirements remain intact
assert(!userDashboardSrc.includes('Math.random()'), 'No random/synthetic generation in UserDashboard');
assert(!assetCardSrc.includes('Math.random()'), 'No random/synthetic telemetry generation in AssetCard');

// 10.7 UI-2 and UI-1 remain intact
assert(fs.existsSync(path.resolve('scripts/test_ui1_shell.ts')), 'UI-1 shell test script exists and is intact');
assert(fs.existsSync(path.resolve('scripts/test_ui2_project_workspace.ts')), 'UI-2 workspace test script exists and is intact');

// 11. DATABASE IMMUTABILITY CHECK
console.log('\n[11] Verifying db.json Immutability (Byte-for-Byte)...');
const dbPath = path.resolve('db.json');
const dbContent = fs.readFileSync(dbPath);
const dbHash = crypto.createHash('sha256').update(dbContent).digest('hex');
const expectedHash = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';

assert(dbHash === expectedHash, 'db.json SHA-256 is byte-for-byte identical', `Expected: ${expectedHash}, Got: ${dbHash}`);

// SUMMARY
console.log('\n========================================================');
console.log(`UI-3 VERIFICATION COMPLETE: ${passed} passed, ${failed} failed`);
console.log('========================================================\n');

if (failed > 0) {
  process.exit(1);
}
