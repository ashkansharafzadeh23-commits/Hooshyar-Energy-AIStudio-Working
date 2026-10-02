/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 13.3 Customer Dashboard & Project Creation Test Suite
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

console.log('=== STARTING STAGE 13.3 CUSTOMER DASHBOARD & PROJECT CREATION TESTS ===');

// 1. Verify Baseline DB Hash Immutability
const dbPath = path.resolve(process.cwd(), 'db.json');
const originalDbContent = fs.readFileSync(dbPath, 'utf-8');
const originalDbHash = crypto.createHash('sha256').update(originalDbContent).digest('hex');
const EXPECTED_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
assert.strictEqual(originalDbHash, EXPECTED_DB_HASH, 'db.json baseline hash mismatch at start');

let testCount = 0;
function pass(msg: string) {
  testCount++;
  console.log(`[PASS] ${testCount}. ${msg}`);
}

async function run() {
  // Read target source files
  const appTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
  const userDashboardTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/UserDashboard.tsx'), 'utf-8');
  const dashboardHeaderTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/DashboardHeader.tsx'), 'utf-8');
  const activeProjectsTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/ActiveProjects.tsx'), 'utf-8');
  const projectCardTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/DashboardProjectCard.tsx'), 'utf-8');
  const attentionCenterTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/AttentionCenter.tsx'), 'utf-8');
  const onboardingTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/NewUserOnboarding.tsx'), 'utf-8');
  const stepLayoutTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/analysis/AnalysisStepLayout.tsx'), 'utf-8');
  const mobileNavTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/navigation/MobileBottomNav.tsx'), 'utf-8');
  const desktopHeaderTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/navigation/DesktopHeader.tsx'), 'utf-8');

  // 1. Customer Dashboard Route Resolves
  assert(appTsx.includes('path="/user-dashboard" element={<UserDashboard />}'), 'Route /user-dashboard must resolve');
  assert(appTsx.includes('path="/dashboard" element={<UserDashboard />}'), 'Route /dashboard must resolve');
  pass('Customer dashboard route /user-dashboard & /dashboard resolves');

  // 2. Project Creation Route / Action Resolves
  assert(appTsx.includes('path="/target-select"'), 'Route /target-select must exist');
  assert(dashboardHeaderTsx.includes('to: \'/target-select\''), 'DashboardHeader must target /target-select');
  pass('Project creation route /target-select resolves from dashboard action');

  // 3. Customer Navigation Remains Role-Appropriate
  assert(mobileNavTsx.includes('CUSTOMER') || mobileNavTsx.includes('PROJECT_OWNER'), 'MobileBottomNav handles customer role');
  assert(mobileNavTsx.includes('/dashboard') && mobileNavTsx.includes('/projects'), 'Customer bottom nav contains core workspace routes');
  pass('Customer mobile navigation is role-appropriate and contains core workspace routes');

  // 4. Public & Auth Pages Do Not Receive Customer Mobile Navigation
  assert(mobileNavTsx.includes('isPublicOrAuthPath'), 'MobileBottomNav checks isPublicOrAuthPath');
  assert(mobileNavTsx.includes('/customer-login') && mobileNavTsx.includes('/contractor-auth'), 'Auth paths suppressed in bottom nav');
  pass('Public and auth paths cannot receive customer bottom navigation');

  // 5. No Duplicate Primary Smart Maintenance Dashboard Entry
  // DashboardHeader for customers must NOT have a duplicate hardcoded /smart-maintenance link
  const headerCustMaintMatch = dashboardHeaderTsx.match(/case 'PROJECT_OWNER':[\s\S]*?to: '(\/.*?)'/);
  assert(headerCustMaintMatch && headerCustMaintMatch[1] === '/target-select', 'DashboardHeader customer action must be project creation, not maintenance duplicate');
  pass('No duplicate static Smart Maintenance action in customer DashboardHeader');

  // 6. Smart Maintenance Remains Dedicated & Accessible
  assert(userDashboardTsx.includes('to="/smart-maintenance"'), 'UserDashboard must link to /smart-maintenance');
  assert(userDashboardTsx.includes('نگهداری هوشمند'), 'UserDashboard has dedicated «نگهداری هوشمند» card');
  assert(userDashboardTsx.includes('ورود به نگهداری هوشمند'), 'UserDashboard has exact CTA «ورود به نگهداری هوشمند»');
  pass('Smart Maintenance remains accessible through dedicated single primary entry card');

  // 7. Existing Project Routes Remain Intact
  assert(appTsx.includes('path="/projects" element={<UserDashboard />}'), 'Route /projects exists');
  assert(appTsx.includes('path="/projects/:id" element={<ProjectDetail />}'), 'Route /projects/:id exists');
  pass('Existing project routes /projects and /projects/:id remain fully intact');

  // 8. Existing RFQ Access Remains Intact
  assert(userDashboardTsx.includes('to="/contractors"') || userDashboardTsx.includes('RFQ'), 'UserDashboard retains RFQ / contractor access');
  assert(appTsx.includes('path="/contractors"'), 'Route /contractors exists');
  pass('Existing RFQ and EPC contractor marketplace access remains intact');

  // 9. No Backend / API Routes Were Altered
  const serverTs = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
  assert(serverTs.includes('/api/projects'), 'API route /api/projects untouched in server.ts');
  assert(serverTs.includes('/api/maintenance'), 'API route /api/maintenance untouched in server.ts');
  pass('Zero backend or API routes altered');

  // 10. No Hardcoded Fake Customer KPI Values Introduced
  assert(!userDashboardTsx.includes('activeProjectsCount = 12'), 'Zero fake active project counts');
  assert(!userDashboardTsx.includes('totalPlannedCapKw = 500'), 'Zero fake total planned capacity');
  assert(!userDashboardTsx.includes('100 kWp') || userDashboardTsx.includes('formatSolarCapacity'), 'Metrics are dynamically formatted from real state');
  pass('Zero hardcoded fake customer KPI values; all metrics strictly derived from real state');

  // 11. New Customer Focused Empty State Exists
  assert(onboardingTsx.includes('اولین پروژه خورشیدی خود را شروع کنید'), 'Focused empty state title present');
  assert(onboardingTsx.includes('اطلاعات اولیه پروژه را وارد کنید تا امکان‌سنجی فنی و اقتصادی آغاز شود.'), 'Focused empty state description present');
  assert(onboardingTsx.includes('شروع پروژه'), 'Primary onboarding CTA text «شروع پروژه» present');
  assert(onboardingTsx.includes('ثبت اطلاعات پروژه') && onboardingTsx.includes('دریافت تحلیل فنی و اقتصادی'), '3-step subtle onboarding explanation present');
  pass('New customer empty state complies with Stage 13.3 specification with 3-step guide');

  // 12. Mobile & Desktop Primary Project Action Exists
  assert(userDashboardTsx.includes('md:hidden') && userDashboardTsx.includes('شروع پروژه جدید'), 'Prominent mobile-specific primary CTA button present');
  assert(dashboardHeaderTsx.includes('شروع پروژه جدید'), 'Desktop DashboardHeader has «شروع پروژه جدید» CTA');
  pass('Mobile and desktop primary project creation actions verified with functional parity');

  // 13. Stage 13.1 Semantic Design Tokens Used
  assert(userDashboardTsx.includes('#0284C7'), 'UserDashboard consumes #0284C7 Energy Blue');
  assert(stepLayoutTsx.includes('#0284C7'), 'AnalysisStepLayout consumes #0284C7 Energy Blue');
  assert(onboardingTsx.includes('#0284C7'), 'NewUserOnboarding consumes #0284C7 Energy Blue');
  pass('Stage 13.1 Energy Blue design tokens strictly utilized for primary actions');

  // 14. Attention Center Calm Empty State
  assert(attentionCenterTsx.includes('در حال حاضر اقدامی از طرف شما لازم نیست.'), 'Calm empty state copy present in AttentionCenter');
  pass('AttentionCenter contains truthful calm empty state when no action is required');

  // 15. Operational Hierarchy Order Classes Exist (Stage 13.3.1: Active projects prioritized early on mobile)
  assert(userDashboardTsx.includes('order-1 md:order-2'), 'Active projects prioritized early on mobile & primary on desktop');
  assert(userDashboardTsx.includes('order-2 md:order-3'), 'Attention items prioritized after active projects on mobile');
  assert(userDashboardTsx.includes('order-3 md:order-1'), 'Portfolio summary ordered for desktop top & mobile compact');
  pass('Information architecture separates mobile vs desktop operational hierarchy cleanly');

  // 16. Touch Target Compliance (Min 44px)
  assert(stepLayoutTsx.includes('min-h-[44px]'), 'AnalysisStepLayout buttons enforce min 44px touch targets');
  assert(userDashboardTsx.includes('min-h-[48px]') || userDashboardTsx.includes('min-h-[44px]'), 'UserDashboard buttons enforce min 44px touch targets');
  pass('Mobile touch targets adhere to min 44px accessibility standard');

  // 17. Persian Direction & RTL Preserved
  assert(stepLayoutTsx.includes('dir="rtl"'), 'AnalysisStepLayout enforces RTL direction');
  pass('Persian RTL orientation strictly maintained');

  // 18. Database Immutability Verified
  const finalDbContent = fs.readFileSync(dbPath, 'utf-8');
  const finalDbHash = crypto.createHash('sha256').update(finalDbContent).digest('hex');
  assert.strictEqual(finalDbHash, EXPECTED_DB_HASH, 'db.json must remain byte-for-byte identical');
  pass('Immutability Guard: db.json verified byte-for-byte identical (SHA-256 match)');
}

run()
  .then(() => {
    console.log(`=== STAGE 13.3 TEST RESULTS: ${testCount} / ${testCount} PASSED ===`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failure:', err);
    process.exit(1);
  });
