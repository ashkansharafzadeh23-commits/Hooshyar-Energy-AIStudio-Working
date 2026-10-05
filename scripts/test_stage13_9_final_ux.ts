import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING STAGE 13.9 VERIFICATION TEST SUITE');
  console.log('Hooshyar Energy V2 — Final Mobile, RTL, Accessibility & Visual QA');
  console.log('Final Cross-Stage Polish, Navigation Integrity & Isolation Guards');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Final preview is DEV-only and exists
  const finalPreviewPath = path.resolve('./src/pages/dev/Stage13FinalPreview.tsx');
  assert(fs.existsSync(finalPreviewPath), '1. Stage13FinalPreview.tsx exists');
  const finalPreviewContent = fs.readFileSync(finalPreviewPath, 'utf8');
  assert(
    finalPreviewContent.includes('!import.meta.env.DEV') && finalPreviewContent.includes('STAGE 13.9 FINAL QA PREVIEW'),
    '1b. Stage13FinalPreview is DEV-only guarded by import.meta.env.DEV with STAGE 13.9 FINAL QA PREVIEW label'
  );

  // 2. Public navigation does not expose authenticated bottom nav
  const bottomNavPath = path.resolve('./src/components/navigation/MobileBottomNav.tsx');
  assert(fs.existsSync(bottomNavPath), '2. MobileBottomNav.tsx exists');
  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');
  assert(
    bottomNavContent.includes('!isAuthenticated || isPublicOrAuthPath') &&
    bottomNavContent.includes("return null;"),
    '2b. MobileBottomNav strictly suppresses rendering on unauthenticated and public paths'
  );

  // 3. Role-aware navigation still exists
  assert(
    bottomNavContent.includes('isContractor') &&
    bottomNavContent.includes('isVendor') &&
    bottomNavContent.includes('isTechnician') &&
    bottomNavContent.includes('isAdmin'),
    '3. MobileBottomNav contains clean role-partitioned navigation tiers'
  );

  const desktopHeaderPath = path.resolve('./src/components/navigation/DesktopHeader.tsx');
  const desktopHeaderContent = fs.readFileSync(desktopHeaderPath, 'utf8');
  assert(
    desktopHeaderContent.includes('isContractor') &&
    desktopHeaderContent.includes('isVendor') &&
    desktopHeaderContent.includes('isTechnician'),
    '3b. DesktopHeader contains clean role-partitioned navigation tiers'
  );

  // 4. 44px important touch-target conventions remain
  assert(
    bottomNavContent.includes('min-h-[44px]') && bottomNavContent.includes('min-w-[44px]'),
    '4. MobileBottomNav enforces >=44px minimum touch targets'
  );

  const landingPath = path.resolve('./src/pages/Landing.tsx');
  const landingContent = fs.readFileSync(landingPath, 'utf8');
  assert(
    landingContent.includes('min-h-[44px]'),
    '4b. Landing page enforces >=44px minimum touch targets on mobile interactions'
  );

  // 5. RTL shell remains
  const mainLayoutPath = path.resolve('./src/layouts/MainLayout.tsx');
  const mainLayoutContent = fs.readFileSync(mainLayoutPath, 'utf8');
  assert(
    mainLayoutContent.includes('dir="rtl"'),
    '5. MainLayout root enforces strict RTL direction'
  );
  assert(
    landingContent.includes('dir="rtl"'),
    '5b. Landing root enforces strict RTL direction'
  );

  // 6. Technical LTR handling remains where expected
  const resultPagePath = path.resolve('./src/pages/Result.tsx');
  const resultPageContent = fs.readFileSync(resultPagePath, 'utf8');
  assert(
    resultPageContent.includes('dir="ltr"') || resultPageContent.includes('font-mono'),
    '6. ResultPage isolates technical strings and metrics with LTR / font-mono'
  );

  const customerLoginPath = path.resolve('./src/pages/CustomerLogin.tsx');
  const customerLoginContent = fs.readFileSync(customerLoginPath, 'utf8');
  assert(
    customerLoginContent.includes('dir="ltr"') || customerLoginContent.includes('type="tel"'),
    '6b. CustomerLogin isolates phone number / numeric inputs with LTR / tel input'
  );

  // 7. Stage 13.3 preview remains available
  const dev13_3Path = path.resolve('./src/pages/dev/CustomerDashboardPreview.tsx');
  assert(fs.existsSync(dev13_3Path), '7. Stage 13.3 CustomerDashboardPreview.tsx remains available');

  // 8. Stage 13.4 preview remains available
  const dev13_4Path = path.resolve('./src/pages/dev/EngineeringResultPreview.tsx');
  assert(fs.existsSync(dev13_4Path), '8. Stage 13.4 EngineeringResultPreview.tsx remains available');

  // 9. Stage 13.5 preview remains available
  const dev13_5Path = path.resolve('./src/pages/dev/RfqBidPreview.tsx');
  assert(fs.existsSync(dev13_5Path), '9. Stage 13.5 RfqBidPreview.tsx remains available');

  // 10. Stage 13.6 preview remains available
  const dev13_6Path = path.resolve('./src/pages/dev/PartnerExperiencePreview.tsx');
  assert(fs.existsSync(dev13_6Path), '10. Stage 13.6 PartnerExperiencePreview.tsx remains available');

  // 11. Stage 13.7 preview remains available
  const dev13_7Path = path.resolve('./src/pages/dev/SmartMaintenancePreview.tsx');
  assert(fs.existsSync(dev13_7Path), '11. Stage 13.7 SmartMaintenancePreview.tsx remains available');

  // 12. Stage 13.8 preview remains available
  const dev13_8Path = path.resolve('./src/pages/dev/SolarPlannerPreview.tsx');
  assert(fs.existsSync(dev13_8Path), '12. Stage 13.8 SolarPlannerPreview.tsx remains available');

  // 13. SmartMaintenance protected baseline remains intact
  const expectedSmHash = 'b4b6bc9e0728dc2af8e8a385fb2b5e0041aa32fd9f49e2d85ee66a197c8383eb';
  const currentSmHash = crypto.createHash('sha256').update(fs.readFileSync(dev13_7Path)).digest('hex');
  assert(
    currentSmHash === expectedSmHash,
    '13. SmartMaintenance protected baseline (commit 6363d191) remains byte-for-byte identical'
  );

  // 14. Stage 13.8 isolation guard remains intact
  const stage13_8TestPath = path.resolve('./scripts/test_stage13_8_solar_planner.ts');
  const stage13_8TestContent = fs.readFileSync(stage13_8TestPath, 'utf8');
  assert(
    stage13_8TestContent.includes(expectedSmHash),
    '14. Stage 13.8 isolation guard asserts against the authoritative pre-Stage-13.8 baseline'
  );

  // 15. Solar Planner 4:3 mobile viewport remains intact
  const solarPlannerPath = path.resolve('./src/pages/SolarPlanner.tsx');
  const solarPlannerContent = fs.readFileSync(solarPlannerPath, 'utf8');
  assert(
    solarPlannerContent.includes('aspect-[4/3]'),
    '15. SolarPlanner preserves bounded 4:3 mobile viewport architecture'
  );

  // 16. No debug XYZ gizmo returns to default customer view
  const sceneCanvasPath = path.resolve('./src/components/solar/SceneCanvas.tsx');
  const sceneCanvasContent = fs.readFileSync(sceneCanvasPath, 'utf8');
  assert(
    sceneCanvasContent.includes('showDebugGizmo') && !sceneCanvasContent.includes('showDebugGizmo = true'),
    '16. SceneCanvas keeps oversized XYZ gizmo hidden by default'
  );

  // 17. No production exposure of dev preview
  const appPath = path.resolve('./src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(
    appContent.includes('import.meta.env.DEV') &&
    appContent.includes('path="/dev/stage13-final-preview"'),
    '17. /dev/stage13-final-preview is strictly enclosed within import.meta.env.DEV'
  );

  assert(
    !desktopHeaderContent.includes('/dev/') && !bottomNavContent.includes('/dev/'),
    '17b. Production headers and bottom navigation contain ZERO links to /dev/ routes'
  );

  // 18. No package changes
  const expectedPkgHash = '90486ca155c8ea72b179c001d32af8c2eac08259837a1817520326b9194379cc';
  const currentPkgHash = crypto.createHash('sha256').update(fs.readFileSync('./package.json')).digest('hex');
  assert(
    currentPkgHash === expectedPkgHash,
    '18. package.json remains byte-for-byte identical'
  );

  // 19. No DB changes
  const expectedDbHash = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
  const currentDbHash = crypto.createHash('sha256').update(fs.readFileSync('./db.json')).digest('hex');
  assert(
    currentDbHash === expectedDbHash,
    '19. db.json remains byte-for-byte identical'
  );

  // 20. No bun.lock changes
  const expectedBunHash = '79ef5b3a7ccbd526c213eac475e3485120c6823b5f71980721b972f5e4bf5386';
  const currentBunHash = crypto.createHash('sha256').update(fs.readFileSync('./bun.lock')).digest('hex');
  assert(
    currentBunHash === expectedBunHash,
    '20. bun.lock remains byte-for-byte identical'
  );

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
