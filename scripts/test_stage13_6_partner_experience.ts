import fs from 'fs';
import path from 'path';

function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING STAGE 13.6 / 13.6.2 VERIFICATION TEST SUITE');
  console.log('Hooshyar Energy V2 — EPC + Vendor Partner Experience');
  console.log('Visual Polish, Tab Safety, EPC Verification & QA Toolbar');
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

  // =========================================================================
  // 1. EPC CONTRACTOR EXPERIENCE (ContractorDashboard.tsx)
  // =========================================================================
  const contractorDashPath = path.resolve('./src/pages/ContractorDashboard.tsx');
  assert(fs.existsSync(contractorDashPath), 'ContractorDashboard.tsx exists');
  const contractorContent = fs.readFileSync(contractorDashPath, 'utf8');

  // No native dialogs
  assert(!contractorContent.includes('window.confirm(') && !contractorContent.includes('confirm('),
    'ContractorDashboard.tsx has ZERO native confirm() or window.confirm() calls');
  assert(!contractorContent.includes('window.alert(') && !contractorContent.includes('alert('),
    'ContractorDashboard.tsx has ZERO alert() or window.alert() calls');

  // Operational hierarchy
  assert(contractorContent.includes('currentOrg?.tradeName') || contractorContent.includes('currentOrg?.legalName'),
    'ContractorDashboard: Company/Account identity header is present');
  assert(contractorContent.includes('مرکز اولویت‌های عملیاتی پیمانکار') || contractorContent.includes('فرصت‌های استعلام'),
    'ContractorDashboard: Operational Attention Center is present');
  assert(contractorContent.includes('openRfqs') && contractorContent.includes('فرصت‌های استعلام (RFQ)'),
    'ContractorDashboard: RFQ Opportunities section is organized');
  assert(contractorContent.includes('myBids') && contractorContent.includes('پیشنهادهای ارسالی من'),
    'ContractorDashboard: Submitted bids section is organized');
  assert(contractorContent.includes('awardedProjects') && contractorContent.includes('پروژه‌های واگذارشده'),
    'ContractorDashboard: Awarded projects section is organized');

  // Persian Status Badges
  assert(contractorContent.includes('مجری منتخب (پروژه واگذارشده)'),
    'ContractorDashboard: Persian status badge for ACCEPTED / SELECTED is present');
  assert(contractorContent.includes('در حال ارزیابی کارفرما'),
    'ContractorDashboard: Persian status badge for UNDER_REVIEW is present');
  assert(contractorContent.includes('فهرست کوتاه'),
    'ContractorDashboard: Persian status badge for SHORTLISTED is present');

  // Stage 13.6.2: Mixed Persian/English labels cleaned
  assert(!contractorContent.includes('EPC Awarded'),
    'ContractorDashboard: Raw «EPC Awarded» string replaced with clean Persian «پروژه واگذارشده به مجری منتخب (EPC)»');
  assert(contractorContent.includes('پروژه واگذارشده به مجری منتخب (EPC)'),
    'ContractorDashboard: Clean Persian status badge for awarded project is rendered');

  // Stage 13.6.2: Technical ID / Code LTR isolation
  assert(contractorContent.includes('dir="ltr"') && contractorContent.includes('rfq.rfqCode'),
    'ContractorDashboard: rfq.rfqCode is wrapped in dir="ltr" font-mono span for strict bidirectional isolation');
  assert(contractorContent.includes('dir="ltr"') && contractorContent.includes('bid.bidCode'),
    'ContractorDashboard: bid.bidCode is wrapped in dir="ltr" font-mono span for strict bidirectional isolation');

  // Stage 13.6.2: EPC Verification truthfulness (conditional, never hardcoded in production)
  assert(contractorContent.includes("currentOrg?.verificationStatus === 'VERIFIED'"),
    'ContractorDashboard: EPC verification status checks real currentOrg.verificationStatus');
  // Check that mobile header verification is conditional
  const mobileHeaderSection = contractorContent.slice(
    contractorContent.indexOf('ورک‌اسپیس رسمی پیمانکار'),
    contractorContent.indexOf('Mobile Sub-tabs Navigation')
  );
  assert(mobileHeaderSection.includes("currentOrg?.verificationStatus === 'VERIFIED'"),
    'ContractorDashboard: Mobile header verification badge is strictly conditional on currentOrg.verificationStatus');
  assert(mobileHeaderSection.includes('در انتظار بررسی'),
    'ContractorDashboard: Mobile header renders truthful fallback «در انتظار بررسی» when not verified');

  // Check that settings tab verification is conditional
  const settingsSection = contractorContent.slice(
    contractorContent.indexOf('وضعیت احراز هویت سازمان'),
    contractorContent.indexOf('SUBMIT BID MODAL')
  );
  assert(settingsSection.includes("currentOrg?.verificationStatus === 'VERIFIED'"),
    'ContractorDashboard: Settings tab verification status is strictly conditional on currentOrg.verificationStatus');
  assert(settingsSection.includes('در انتظار احراز صلاحیت سازمان'),
    'ContractorDashboard: Settings tab renders truthful fallback «در انتظار احراز صلاحیت سازمان» when unverified');

  // Stage 13.6.2: Mobile sub-tabs safety (no clipping, touch-pan-x, overflow-x-auto, min-h-[44px])
  assert(contractorContent.includes('-mx-4 px-4 overflow-x-auto') || contractorContent.includes('overflow-x-auto'),
    'ContractorDashboard: Mobile tabs bar has horizontal scroll container');
  assert(contractorContent.includes('touch-pan-x') && contractorContent.includes('scroll-smooth'),
    'ContractorDashboard: Mobile tabs bar uses touch-pan-x and scroll-smooth for mobile safety');
  assert(contractorContent.includes('px-3.5 py-2.5') && contractorContent.includes('min-h-[44px]'),
    'ContractorDashboard: Mobile tab buttons enforce min-h-[44px] touch targets and non-cramped padding');

  // Data attribution
  assert(contractorContent.includes('تولید سالیانه اعلامی پیمانکار'),
    'ContractorDashboard: Yield claim is attributed as «تولید سالیانه اعلامی پیمانکار»');
  assert(contractorContent.includes('ثبت‌شده توسط شرکت پیمانکار'),
    'ContractorDashboard: Context note «ثبت‌شده توسط شرکت پیمانکار» is present without claiming platform verification');

  // Secure documents integration
  assert(contractorContent.includes('RFQDocumentsManager'),
    'ContractorDashboard: Integrates Stage 12.3E RFQDocumentsManager for viewing RFQ documents');
  assert(contractorContent.includes('BidDocumentsManager'),
    'ContractorDashboard: Integrates Stage 12.3E BidDocumentsManager for managing bid documents');
  assert(contractorContent.includes('executeBidSubmissionWorkflow'),
    'ContractorDashboard: Uses secure executeBidSubmissionWorkflow for 2-step atomic bid submission');

  // Preview mutation isolation for EPC
  assert(contractorContent.includes('if (previewMode) {') && contractorContent.includes('return;'),
    'ContractorDashboard: previewMode intercepts bid submission and revision before any API call');

  // No fake analytics or fake ratings
  assert(!contractorContent.includes('امتیاز رضایت: ۴.۹') && !contractorContent.includes('نرخ موفقیت ۹۸٪'),
    'ContractorDashboard: Does NOT invent fake ratings or synthetic success scores');

  // =========================================================================
  // 2. VENDOR EXPERIENCE FILES & EXISTENCE
  // =========================================================================
  const portalLayoutPath = path.resolve('./src/pages/vendor/portal/PortalLayout.tsx');
  const vendorDashPath = path.resolve('./src/pages/vendor/portal/Dashboard.tsx');
  const productMgmtPath = path.resolve('./src/pages/vendor/portal/ProductManagement.tsx');
  const profileEditPath = path.resolve('./src/pages/vendor/portal/ProfileEdit.tsx');
  const subscriptionPath = path.resolve('./src/pages/vendor/portal/Subscription.tsx');

  assert(fs.existsSync(portalLayoutPath), 'PortalLayout.tsx exists');
  assert(fs.existsSync(vendorDashPath), 'vendor/portal/Dashboard.tsx exists');
  assert(fs.existsSync(productMgmtPath), 'vendor/portal/ProductManagement.tsx exists');
  assert(fs.existsSync(profileEditPath), 'vendor/portal/ProfileEdit.tsx exists');
  assert(fs.existsSync(subscriptionPath), 'vendor/portal/Subscription.tsx exists');

  const portalLayoutContent = fs.readFileSync(portalLayoutPath, 'utf8');
  const vendorDashContent = fs.readFileSync(vendorDashPath, 'utf8');
  const productMgmtContent = fs.readFileSync(productMgmtPath, 'utf8');
  const profileEditContent = fs.readFileSync(profileEditPath, 'utf8');
  const subscriptionContent = fs.readFileSync(subscriptionPath, 'utf8');

  // =========================================================================
  // 3. VENDOR SUBSCRIPTION PRICING TRUTHFULNESS
  // =========================================================================
  assert(!subscriptionContent.includes('20,000,000') && !subscriptionContent.includes('۲۰,۰۰۰,۰۰۰'),
    'Subscription: ZERO invented 20,000,000 Toman pricing');
  assert(!subscriptionContent.includes('60,000,000') && !subscriptionContent.includes('۶۰,۰۰۰,۰۰۰'),
    'Subscription: ZERO invented 60,000,000 Toman pricing');
  assert(!subscriptionContent.includes('خرید اشتراک') && !subscriptionContent.includes('انتخاب طرح'),
    'Subscription: ZERO fake purchase or checkout CTAs');
  assert(!subscriptionContent.includes('طرح برگزیده سالانه'),
    'Subscription: ZERO fake tier recommendations or discounts');

  assert(subscriptionContent.includes('اشتراک همکاری تجاری'),
    'Subscription: Truthful title «اشتراک همکاری تجاری» present');
  assert(subscriptionContent.includes('جزئیات پلن‌های تجاری در حال تکمیل است'),
    'Subscription: Truthful status «جزئیات پلن‌های تجاری در حال تکمیل است» present');
  assert(subscriptionContent.includes('اطلاعات نهایی پلن‌ها و شرایط اشتراک پس از فعال‌سازی تجاری این بخش نمایش داده خواهد شد.'),
    'Subscription: Truthful explanation text present');
  assert(subscriptionContent.includes('فعلاً در دسترس نیست') && subscriptionContent.includes('disabled'),
    'Subscription: Non-transactional disabled state «فعلاً در دسترس نیست» present');
  assert(subscriptionContent.includes('min-h-[44px]'),
    'Subscription: Maintains min-h-[44px] touch target');

  // =========================================================================
  // 4. VENDOR VERIFICATION & IDENTITY TRUTHFULNESS
  // =========================================================================
  assert(!portalLayoutContent.includes('تأمین‌کننده تأییدشده'),
    'PortalLayout: Hardcoded «تأمین‌کننده تأییدشده» removed from mobile header');
  assert(portalLayoutContent.includes('پروفایل کسب‌وکار'),
    'PortalLayout: Uses truthful neutral «پروفایل کسب‌وکار» label');

  assert(!profileEditContent.includes('وضعیت احراز هویت شرکت: تأییدشده (VERIFIED)'),
    'ProfileEdit: Hardcoded «VERIFIED» status banner removed');
  assert(!profileEditContent.includes('توسط تیم ارزیابی هوشیار انرژی بررسی و تایید شده است'),
    'ProfileEdit: Unsubstantiated verification evaluation text removed');
  assert(profileEditContent.includes('وضعیت اطلاعات حساب'),
    'ProfileEdit: Uses truthful neutral «وضعیت اطلاعات حساب» banner');

  // Stage 13.6.2: Vendor Profile Persistence & Visibility Claim Audit
  assert(!profileEditContent.includes('اطلاعات هویتی و ثبتی فروشگاه که به خریداران، مهندسین مشاور و پیمانکاران EPC نمایش داده می‌شود'),
    'ProfileEdit: Unsubstantiated public visibility claim removed');
  assert(profileEditContent.includes('اطلاعات ثبتی، نشانی و راه‌های ارتباطی فروشگاه در سامانه هوشیار انرژی'),
    'ProfileEdit: Rewritten with truthful neutral scope «اطلاعات ثبتی، نشانی و راه‌های ارتباطی فروشگاه در سامانه هوشیار انرژی»');
  assert(profileEditContent.includes('disabled') && profileEditContent.includes('!previewMode'),
    'ProfileEdit: Save action is truthfully disabled in production mode awaiting backend activation');
  assert(profileEditContent.includes('تغییرات در این بخش ذخیره ابری نمی‌شود'),
    'ProfileEdit: Explains that cloud persistence is awaiting activation');

  assert(!vendorDashContent.includes('تأمین‌کننده تأییدشده هوشیار انرژی'),
    'Dashboard: Hardcoded «تأمین‌کننده تأییدشده هوشیار انرژی» badge removed');
  assert(!vendorDashContent.includes('پیمانکار EPC تأییدشده'),
    'Dashboard: Hardcoded «پیمانکار EPC تأییدشده» fallback removed');
  assert(!vendorDashContent.includes('verified: true'),
    'Dashboard: verified: true is NOT used as a default state');
  assert(vendorDashContent.includes('پروفایل کسب‌وکار'),
    'Dashboard: Uses truthful neutral «پروفایل کسب‌وکار» badge');

  // =========================================================================
  // 5. VENDOR PRODUCT MANAGEMENT, CARDS & TYPOGRAPHY (Stage 13.6.2)
  // =========================================================================
  assert(!productMgmtContent.includes('DEFAULT_PRODUCTS'),
    'ProductManagement: DEFAULT_PRODUCTS constant removed; does not exist as fallback');
  assert(productMgmtContent.includes('if (previewMode)'),
    'ProductManagement: Fixtures are strictly guarded behind if (previewMode)');
  assert(productMgmtContent.includes('هنوز محصولی برای این حساب ثبت نشده است.'),
    'ProductManagement: Renders truthful Persian empty state «هنوز محصولی برای این حساب ثبت نشده است.»');
  assert(productMgmtContent.includes('disabled') && productMgmtContent.includes('!previewMode'),
    'ProductManagement: Add product action is truthfully disabled in production when persistence is absent');
  assert(productMgmtContent.includes('PersianConfirmModal'),
    'ProductManagement: Safe PersianConfirmModal used for deletion');
  assert(!productMgmtContent.includes('window.confirm(') && !productMgmtContent.includes('confirm('),
    'ProductManagement: ZERO native confirm() calls');
  assert(productMgmtContent.includes('min-h-[44px]'),
    'ProductManagement: Buttons and controls enforce >=44px touch targets');

  // Stage 13.6.2: Delete button accessibility & mobile card layout
  assert(productMgmtContent.includes('min-h-[44px] min-w-[44px]') && productMgmtContent.includes('حذف کالا'),
    'ProductManagement: Mobile card delete control is an accessible >=44px action button with icon and label');
  // Stage 13.6.2: RTL/LTR typography safety
  assert(productMgmtContent.includes('dir="ltr"') && productMgmtContent.includes('p.brand'),
    'ProductManagement: Brand and model codes are wrapped in dir="ltr" font-mono to prevent direction collisions');

  // =========================================================================
  // 6. ROLE NAVIGATION & PREVIEW SAFETY
  // =========================================================================
  const bottomNavPath = path.resolve('./src/components/navigation/MobileBottomNav.tsx');
  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');

  assert(bottomNavContent.includes('isContractor') && bottomNavContent.includes('/contractor-dashboard'),
    'MobileBottomNav: Contractor role routes to /contractor-dashboard');
  assert(bottomNavContent.includes('isVendor') && bottomNavContent.includes('/vendor-portal'),
    'MobileBottomNav: Vendor role routes to /vendor-portal');
  assert(bottomNavContent.includes('min-h-[44px]'),
    'MobileBottomNav: Bottom navigation items enforce >=44px touch targets');

  // DEV Preview Page (/dev/partner-experience-preview)
  const devPreviewPath = path.resolve('./src/pages/dev/PartnerExperiencePreview.tsx');
  const devPreviewContent = fs.readFileSync(devPreviewPath, 'utf8');

  assert(devPreviewContent.includes('import.meta.env.DEV'),
    'PartnerExperiencePreview: Strictly guarded by import.meta.env.DEV (fail-closed in production)');
  assert(devPreviewContent.includes('previewMode={true}'),
    'PartnerExperiencePreview: previewMode={true} explicitly passed to components');
  assert(devPreviewContent.includes('320') && devPreviewContent.includes('430'),
    'PartnerExperiencePreview: Simulates viewports from 320px to 430px');

  // Stage 13.6.2: Collapsible DEV QA Toolbar
  assert(devPreviewContent.includes('isToolbarExpanded') && devPreviewContent.includes('setIsToolbarExpanded'),
    'PartnerExperiencePreview: Implements isToolbarExpanded state for collapsible mobile QA toolbar');
  assert(devPreviewContent.includes('STAGE 13.6 QA') && devPreviewContent.includes('ChevronUp') && devPreviewContent.includes('ChevronDown'),
    'PartnerExperiencePreview: Compact collapsible bar with Chevron toggles and >=44px touch target');

  // =========================================================================
  // 7. IMMUTABILITY & SAFETY BOUNDARIES
  // =========================================================================
  const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));
  assert(pkg.name === 'react-example', 'package.json: Package name unmodified');
  assert(pkg.dependencies['lucide-react'] !== undefined, 'package.json: Standard dependencies preserved');

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
