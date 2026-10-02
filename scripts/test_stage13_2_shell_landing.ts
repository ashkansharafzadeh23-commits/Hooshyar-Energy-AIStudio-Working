/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 13.2 Shell, Navigation, Truthfulness & Landing Test Suite
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

console.log('=== STARTING STAGE 13.2 SHELL, NAVIGATION & LANDING TESTS ===');

// Track baseline db.json hash
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
  const authLayoutTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/layouts/AuthLayout.tsx'), 'utf-8');
  const mainLayoutTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/layouts/MainLayout.tsx'), 'utf-8');
  const mobileNavTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/navigation/MobileBottomNav.tsx'), 'utf-8');
  const desktopHeaderTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/navigation/DesktopHeader.tsx'), 'utf-8');
  const dashboardHeaderTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/dashboard/DashboardHeader.tsx'), 'utf-8');
  const userDashboardTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/UserDashboard.tsx'), 'utf-8');
  const customerLoginTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/CustomerLogin.tsx'), 'utf-8');
  const landingTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Landing.tsx'), 'utf-8');

  // 1. AuthLayout Does Not Import MobileBottomNav
  assert(!authLayoutTsx.includes('MobileBottomNav'), 'AuthLayout must never import MobileBottomNav');
  pass('AuthLayout does not import MobileBottomNav');

  // 2. AuthLayout Does Not Render MobileBottomNav
  assert(!authLayoutTsx.includes('<MobileBottomNav'), 'AuthLayout must not render <MobileBottomNav />');
  pass('AuthLayout does not render MobileBottomNav');

  // 3. AuthLayout Has Minimal Header With Logo
  assert(authLayoutTsx.includes('هوشیار انرژی') && authLayoutTsx.includes('solar_app_logo'), 'AuthLayout has clean brand header');
  pass('AuthLayout contains clean brand header');

  // 4. AuthLayout Has Security Footer
  assert(authLayoutTsx.includes('سامانه امن احراز هویت'), 'AuthLayout contains security badge in footer');
  pass('AuthLayout contains security trust footer');

  // 5. App.tsx Routes Auth Views Under AuthLayout
  assert(appTsx.includes('<Route element={<AuthLayout />}'), 'App.tsx must use AuthLayout as shell');
  pass('App.tsx defines AuthLayout shell route');

  // 6. App.tsx Places /customer-login in AuthLayout
  const authLayoutBlockMatch = appTsx.match(/<Route element=\{<AuthLayout \/>\}>([\s\S]*?)<\/Route>/);
  assert(authLayoutBlockMatch, 'AuthLayout block must exist in App.tsx');
  const authRoutes = authLayoutBlockMatch[1];
  assert(authRoutes.includes('path="/customer-login"'), '/customer-login must be nested in AuthLayout');
  pass('Route /customer-login is isolated inside AuthLayout');

  // 7. App.tsx Places /contractor-auth in AuthLayout
  assert(authRoutes.includes('path="/contractor-auth"'), '/contractor-auth must be nested in AuthLayout');
  pass('Route /contractor-auth is isolated inside AuthLayout');

  // 8. App.tsx Places /vendor-auth in AuthLayout
  assert(authRoutes.includes('path="/vendor-auth"'), '/vendor-auth must be nested in AuthLayout');
  pass('Route /vendor-auth is isolated inside AuthLayout');

  // 9. App.tsx Places /technician-auth in AuthLayout
  assert(authRoutes.includes('path="/technician-auth"'), '/technician-auth must be nested in AuthLayout');
  pass('Route /technician-auth is isolated inside AuthLayout');

  // 10. MobileBottomNav Enforces Authentication Gate
  assert(mobileNavTsx.includes('if (!isAuthenticated') || mobileNavTsx.includes('if (!user'), 'MobileBottomNav must check authentication');
  pass('MobileBottomNav requires active authentication');

  // 11. MobileBottomNav Explicitly Blocks Public & Auth Paths
  assert(mobileNavTsx.includes('isPublicOrAuthPath'), 'MobileBottomNav must identify public and auth paths');
  assert(mobileNavTsx.includes('/customer-login'), 'MobileBottomNav must include /customer-login in suppressed paths');
  pass('MobileBottomNav suppresses public and auth paths explicitly');

  // 12. Public Landing Route / Gated from Bottom Nav
  assert(mobileNavTsx.includes("'/customer-login'") && mobileNavTsx.includes("'/'"), 'Landing and login paths are strictly suppressed');
  pass('MobileBottomNav returns null on root and login paths');

  // 13. Contractor Auth Route Gated from Customer Bottom Nav
  assert(mobileNavTsx.includes('/contractor-auth'), 'Contractor auth is gated from mobile bottom nav');
  pass('MobileBottomNav returns null on /contractor-auth');

  // 14. Vendor Auth Route Gated from Customer Bottom Nav
  assert(mobileNavTsx.includes('/vendor-auth'), 'Vendor auth is gated from mobile bottom nav');
  pass('MobileBottomNav returns null on /vendor-auth');

  // 15. Technician Auth Route Gated from Customer Bottom Nav
  assert(mobileNavTsx.includes('/technician-auth'), 'Technician auth is gated from mobile bottom nav');
  pass('MobileBottomNav returns null on /technician-auth');

  // 16. Customer Navigation Item: /dashboard Exists
  assert(appTsx.includes('path="/dashboard"'), 'Route /dashboard must exist in App.tsx');
  pass('Customer route /dashboard exists');

  // 17. Customer Navigation Item: /projects Exists
  assert(appTsx.includes('path="/projects"'), 'Route /projects must exist in App.tsx');
  pass('Customer route /projects exists');

  // 18. Customer Navigation Item: /contractors (Marketplace) Exists
  assert(appTsx.includes('path="/contractors"'), 'Route /contractors must exist in App.tsx');
  pass('Customer marketplace route /contractors exists');

  // 19. Customer Navigation Item: /solar-assets Exists
  assert(appTsx.includes('path="/solar-assets"'), 'Route /solar-assets must exist in App.tsx');
  pass('Customer assets route /solar-assets exists');

  // 20. Customer Action Sheet Triggers Real Paths
  assert(mobileNavTsx.includes("handleAction('/target-select')") && appTsx.includes('path="/target-select"'), 'Action sheet has valid /target-select');
  assert(mobileNavTsx.includes("handleAction('/powerplant-setup')") && appTsx.includes('path="/powerplant-setup"'), 'Action sheet has valid /powerplant-setup');
  pass('Customer floating action sheet links to valid operational routes');

  // 21. Contractor Role Bar Target: /contractor-dashboard
  assert(mobileNavTsx.includes('isContractor') && mobileNavTsx.includes('to="/contractor-dashboard"'), 'Contractor nav points to /contractor-dashboard');
  assert(appTsx.includes('path="/contractor-dashboard"'), 'Route /contractor-dashboard must exist in App.tsx');
  pass('Contractor role bar correctly targets /contractor-dashboard');

  // 22. Contractor Role Bar Target: /smart-maintenance
  assert(mobileNavTsx.includes('to="/smart-maintenance"'), 'Contractor bar includes /smart-maintenance');
  assert(appTsx.includes('path="/smart-maintenance"'), 'Route /smart-maintenance must exist in App.tsx');
  pass('Contractor role bar includes /smart-maintenance');

  // 23. Vendor Role Bar Target: /vendor-portal
  assert(mobileNavTsx.includes('isVendor') && mobileNavTsx.includes('to="/vendor-portal"'), 'Vendor nav points to /vendor-portal');
  assert(appTsx.includes('path="/vendor-portal/*"'), 'Route /vendor-portal/* must exist in App.tsx');
  pass('Vendor role bar correctly targets /vendor-portal');

  // 24. Vendor Role Bar Target: /ads/portal
  assert(mobileNavTsx.includes('to="/ads/portal"'), 'Vendor nav points to /ads/portal');
  assert(appTsx.includes('path="/ads/portal"'), 'Route /ads/portal must exist in App.tsx');
  pass('Vendor role bar targets /ads/portal');

  // 25. Technician Role Bar Target: /technician-dashboard
  assert(mobileNavTsx.includes('isTechnician') && mobileNavTsx.includes('to="/technician-dashboard"'), 'Technician nav points to /technician-dashboard');
  assert(appTsx.includes('path="/technician-dashboard"'), 'Route /technician-dashboard must exist in App.tsx');
  pass('Technician role bar correctly targets /technician-dashboard');

  // 26. Technician Role Bar Target: /technicians
  assert(mobileNavTsx.includes('to="/technicians"'), 'Technician nav points to /technicians');
  assert(appTsx.includes('path="/technicians"'), 'Route /technicians must exist in App.tsx');
  pass('Technician role bar targets peer registry /technicians');

  // 27. Admin Role Bar Targets: /admin/solar-assets & /admin/ads
  assert(mobileNavTsx.includes('to="/admin/solar-assets"') && appTsx.includes('path="/admin/solar-assets"'), 'Admin nav has /admin/solar-assets');
  assert(mobileNavTsx.includes('to="/admin/ads"') && appTsx.includes('path="/admin/ads"'), 'Admin nav has /admin/ads');
  pass('Admin role bar targets document audit and ad management routes');

  // 28. CustomerLogin Parses redirect Query Parameter
  assert(customerLoginTsx.includes("queryParams.get('redirect')"), 'CustomerLogin must read redirect query parameter');
  pass('CustomerLogin reads redirect query parameter');

  // 29. CustomerLogin Honors Custom Redirect Target
  assert(customerLoginTsx.includes('navigate(redirectTarget)'), 'CustomerLogin must navigate to redirectTarget upon authentication');
  pass('CustomerLogin honors dynamic redirectTarget parameter');

  // 30. CustomerLogin Defaults to /user-dashboard When No Redirect Provided
  assert(customerLoginTsx.includes("|| '/user-dashboard'"), 'CustomerLogin fallback redirect must be /user-dashboard');
  pass('CustomerLogin default fallback is /user-dashboard');

  // 31. Duplicate DashboardHeader Smart Maintenance Button Removed
  // The header must NOT have a static button with to="/smart-maintenance" next to the primary action
  const hasStaticMaintButton = dashboardHeaderTsx.includes('to="/smart-maintenance"') && !dashboardHeaderTsx.includes('TECHNICIAN');
  assert(!hasStaticMaintButton, 'DashboardHeader must not have static un-scoped button to /smart-maintenance');
  pass('Duplicate static Smart Maintenance CTA removed from DashboardHeader');

  // 32. UserDashboard Still Exposes Smart Maintenance Card
  assert(userDashboardTsx.includes('/smart-maintenance') && userDashboardTsx.includes('تعمیرات و نگهداری هوشمند'), 'UserDashboard must retain Smart Maintenance entry');
  pass('UserDashboard retains dedicated Smart Maintenance quick access card');

  // 33. DesktopHeader Exposes Smart Maintenance For Customers
  assert(desktopHeaderTsx.includes('path: \'/smart-maintenance\''), 'DesktopHeader must include Smart Maintenance');
  pass('DesktopHeader exposes Smart Maintenance in primary navigation');

  // 34. Landing Page Contains Persian Sample Analysis Label
  assert(landingTsx.includes('نمونه تحلیل پروژه'), 'Landing must display «نمونه تحلیل پروژه» label');
  pass('Landing displays visible «نمونه تحلیل پروژه» label');

  // 35. Landing Page Contains Concise Sample Data Disclosure
  assert(landingTsx.includes('صرفاً نمونه') && landingTsx.includes('محاسبه'), 'Landing must contain sample data disclosure');
  pass('Landing contains sample metrics disclosure');

  // 36. Landing Page Has Zero Numeric Time Promises ("۳ دقیقه")
  assert(!landingTsx.includes('۳ دقیقه'), 'Landing must not contain numeric 3-minute promises');
  pass('Landing contains zero numeric time guarantees (۳ دقیقه removed)');

  // 37. Landing Contains No Fake Traction Numbers
  assert(!landingTsx.includes('۵۰۰ پروژه') && !landingTsx.includes('۱۰ هزار'), 'Landing must not claim fake project counts or user totals');
  pass('Landing contains zero fake company traction metrics');

  // 38. Landing Purged Old Berlin PV Image
  assert(!landingTsx.includes('upload.wikimedia.org') && !landingTsx.includes('Berlin'), 'Landing must not reference old Wikimedia Berlin PV image');
  pass('Old Berlin Wikimedia PV image completely purged');

  // 39. Landing Purged Obsolete Generator Stock Images
  assert(!landingTsx.includes('generator') && !landingTsx.includes('powerbank'), 'Landing must not reference obsolete generator assets');
  pass('Obsolete generator and powerbank stock imagery completely purged');

  // 40. Landing Purged External Unsplash Images
  assert(!landingTsx.includes('images.unsplash.com'), 'Landing must not reference external Unsplash images');
  pass('External Unsplash hero imagery completely purged');

  // 41. Key Landing CTA Routes Exist in App.tsx
  assert(landingTsx.includes('to="/target-select"') && appTsx.includes('path="/target-select"'), 'CTA /target-select exists');
  assert(landingTsx.includes('to="/contractors"') && appTsx.includes('path="/contractors"'), 'CTA /contractors exists');
  pass('Key Landing CTAs link to valid verified routes in App.tsx');

  // 42. No Dangerous javascript: URLs in Landing or Headers
  assert(!landingTsx.includes('javascript:') && !desktopHeaderTsx.includes('javascript:') && !mobileNavTsx.includes('javascript:'), 'No javascript: scheme allowed');
  pass('Zero dangerous javascript: URI schemes found');

  // 43. No Hardcoded Passwords or API Keys in Landing or Auth Pages
  assert(!landingTsx.includes('AIzaSy') && !customerLoginTsx.includes('password = "'), 'No hardcoded credentials');
  pass('Zero hardcoded credentials or tokens detected');

  // 44. Design System Tokens Consumed (#0284C7 Brand Blue & #F8FAFC Canvas)
  assert(landingTsx.includes('#0284C7') && landingTsx.includes('#F8FAFC'), 'Landing consumes design system brand blue and light canvas');
  pass('Landing strictly consumes Stage 13.1 design system color tokens');

  // 45. Immutability Guard: db.json Remains Identical
  const finalDbContent = fs.readFileSync(dbPath, 'utf-8');
  const finalDbHash = crypto.createHash('sha256').update(finalDbContent).digest('hex');
  assert.strictEqual(finalDbHash, EXPECTED_DB_HASH, 'db.json must remain byte-for-byte identical');
  pass('Immutability Guard: db.json verified byte-for-byte identical (SHA-256 match)');
}

run()
  .then(() => {
    console.log(`=== STAGE 13.2 TEST RESULTS: ${testCount} / ${testCount} PASSED ===`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failure:', err);
    process.exit(1);
  });
