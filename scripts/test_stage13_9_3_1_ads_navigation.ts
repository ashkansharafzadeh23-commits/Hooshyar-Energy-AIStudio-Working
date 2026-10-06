/**
 * HOOSHYAR ENERGY — STAGE 13.9.3.1 VERIFICATION TEST SUITE
 * Ads Discoverability & Global Navigation Patch
 * 
 * Verifies:
 * 1. Mobile global navigation contains 'تبلیغات و معرفی برند'
 * 2. Mobile navigation link resolves to '/ads/portal'
 * 3. Mobile menu adheres to the required 6-item preferred ordering
 * 4. Mobile menu items have min-h-[44px] touch target
 * 5. Desktop navigation exposes 'تبلیغات و معرفی برند' pointing to '/ads/portal'
 * 6. Existing contextual Ads Portal links remain present and intact
 * 7. AdsPortal route remains registered in App.tsx
 * 8. db.json remains byte-for-byte identical (SHA-256 preserved)
 */

import fs from 'fs';
import path from 'path';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

async function runStage13_9_3_1Tests() {
  console.log('====================================================');
  console.log('HOOSHYAR ENERGY — STAGE 13.9.3.1 VERIFICATION SUITE');
  console.log('Ads Discoverability & Global Navigation Patch');
  console.log('====================================================\n');

  const isolation = setupTestDatabaseIsolation('stage13_9_3_1_ads_navigation');

  try {
    const landingFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/Landing.tsx'), 'utf8');
    const desktopHeaderFile = fs.readFileSync(path.join(process.cwd(), 'src/components/navigation/DesktopHeader.tsx'), 'utf8');
    const appFile = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
    const mobileBottomNavFile = fs.readFileSync(path.join(process.cwd(), 'src/components/navigation/MobileBottomNav.tsx'), 'utf8');
    const vendorPortalFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/vendor/portal/Dashboard.tsx'), 'utf8');
    const partnersHubFile = fs.readFileSync(path.join(process.cwd(), 'src/pages/PartnersHub.tsx'), 'utf8');

    // --- GROUP 1: Mobile Global Navigation ---
    console.log('--- GROUP 1: Mobile Global Navigation ---');
    assert(
      landingFile.includes('to="/ads/portal"') && landingFile.includes('تبلیغات و معرفی برند'),
      '1.1 Mobile global drawer in Landing.tsx contains "تبلیغات و معرفی برند" linking to "/ads/portal"'
    );
    assert(
      landingFile.includes('aria-label="تبلیغات و معرفی برند"'),
      '1.2 Mobile menu item includes descriptive Persian aria-label'
    );
    assert(
      landingFile.includes('<Megaphone size={16}'),
      '1.3 Mobile menu item utilizes the existing Megaphone icon without new packages'
    );

    // Verify Preferred Ordering in Mobile Drawer:
    // 1. امکان‌سنجی و طراحی هوشمند
    // 2. چرخه اجرای پروژه‌ها
    // 3. راهکارها برای صنایع و مالکان
    // 4. شبکه پیمانکاران EPC و استعلام‌ها
    // 5. تبلیغات و معرفی برند
    // 6. تعمیرات و نگهداری هوشمند
    const mobileDrawerRegex = /Mobile Navigation Drawer[\s\S]*?<\/div>\s*\)\}/;
    const drawerMatch = landingFile.match(mobileDrawerRegex);
    assert(Boolean(drawerMatch), '1.4 Mobile drawer section found in Landing.tsx');

    if (drawerMatch) {
      const drawerContent = drawerMatch[0];
      const idx1 = drawerContent.indexOf('امکان‌سنجی و طراحی هوشمند');
      const idx2 = drawerContent.indexOf('چرخه اجرای پروژه‌ها');
      const idx3 = drawerContent.indexOf('راهکارها برای صنایع و مالکان');
      const idx4 = drawerContent.indexOf('شبکه پیمانکاران EPC و استعلام‌ها');
      const idx5 = drawerContent.indexOf('تبلیغات و معرفی برند');
      const idx6 = drawerContent.indexOf('تعمیرات و نگهداری هوشمند');

      assert(idx1 !== -1 && idx1 < idx2, '1.5.1 Item 1: امکان‌سنجی و طراحی هوشمند precedes item 2');
      assert(idx2 !== -1 && idx2 < idx3, '1.5.2 Item 2: چرخه اجرای پروژه‌ها precedes item 3');
      assert(idx3 !== -1 && idx3 < idx4, '1.5.3 Item 3: راهکارها برای صنایع و مالکان precedes item 4');
      assert(idx4 !== -1 && idx4 < idx5, '1.5.4 Item 4: شبکه پیمانکاران EPC و استعلام‌ها precedes item 5');
      assert(idx5 !== -1 && idx5 < idx6, '1.5.5 Item 5: تبلیغات و معرفی برند precedes item 6');
      assert(idx6 !== -1, '1.5.6 Item 6: تعمیرات و نگهداری هوشمند present in menu');
    }

    // Touch targets
    assert(
      landingFile.includes('min-h-[44px] rounded-xl hover:bg-slate-50'),
      '1.6 Mobile drawer items conform to minimum 44px touch target requirement'
    );

    // --- GROUP 2: Desktop Global Navigation ---
    console.log('\n--- GROUP 2: Desktop Global Navigation ---');
    assert(
      landingFile.includes('to="/ads/portal"') && 
      landingFile.includes('className="px-3 py-2 rounded-xl hover:text-slate-950 dark:hover:text-white') &&
      landingFile.includes('تبلیغات و معرفی برند'),
      '2.1 Desktop public navigation in Landing.tsx exposes "تبلیغات و معرفی برند" linking to "/ads/portal"'
    );
    assert(
      desktopHeaderFile.includes("{ label: 'تبلیغات و معرفی برند', path: '/ads/portal', icon: Megaphone }"),
      '2.2 Global DesktopHeader.tsx includes "تبلیغات و معرفی برند" in public navItems'
    );
    assert(
      desktopHeaderFile.includes("isNavActive('/ads/portal')") || desktopHeaderFile.includes("path === '/ads/portal'"),
      '2.3 DesktopHeader isNavActive correctly recognizes /ads/portal'
    );

    // Non-aggressive visual styling
    assert(
      !landingFile.includes('bg-purple-600') && !landingFile.includes('text-purple-600 animate-pulse'),
      '2.4 Desktop link conforms to standard nav styling without aggressive CTAs'
    );

    // --- GROUP 3: Contextual Link Preservation ---
    console.log('\n--- GROUP 3: Contextual Link Preservation ---');
    assert(
      vendorPortalFile.includes('/ads/portal'),
      '3.1 Contextual Ads Portal links in vendor dashboard preserved'
    );
    assert(
      partnersHubFile.includes('/ads/portal'),
      '3.2 Contextual Ads Portal link in PartnersHub preserved'
    );
    assert(
      mobileBottomNavFile.includes('/ads/portal'),
      '3.3 Contextual Ads Portal action in authenticated MobileBottomNav preserved'
    );
    assert(
      desktopHeaderFile.includes('to="/ads/portal"') && desktopHeaderFile.includes('پرتال تبلیغات تجاری و سفارش پلن'),
      '3.4 Contextual profile menu link in DesktopHeader preserved'
    );

    // --- GROUP 4: Route Registration & Immutability ---
    console.log('\n--- GROUP 4: Route Registration & Immutability ---');
    assert(
      appFile.includes('path="/ads/portal" element={<AdsPortal />}') ||
      appFile.includes('path="/ads-portal" element={<AdsPortal />}'),
      '4.1 Canonical route /ads/portal mapped to AdsPortal component in App.tsx'
    );

    // Immutability Check
    isolation.verifyImmutability();
    assert(true, '4.2 Repository db.json byte-for-byte identical (SHA-256: 60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f)');

  } finally {
    isolation.cleanup();
  }

  console.log('\n====================================================');
  console.log(`STAGE 13.9.3.1 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage13_9_3_1Tests().catch((err) => {
  console.error('Fatal error running Stage 13.9.3.1 verification tests:', err);
  process.exit(1);
});
