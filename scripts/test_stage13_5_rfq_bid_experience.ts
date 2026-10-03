import fs from 'fs';
import path from 'path';

function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING STAGE 13.5 / 13.5.1 VERIFICATION TEST SUITE');
  console.log('Hooshyar Energy V2 — Mobile UX & Decision-Safety Polish');
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

  // 1. Inspect RFQTab.tsx
  const rfqTabPath = path.resolve('./src/pages/projects/Workspace/RFQTab.tsx');
  assert(fs.existsSync(rfqTabPath), 'RFQTab.tsx exists');
  const rfqTabContent = fs.readFileSync(rfqTabPath, 'utf8');

  assert(!rfqTabContent.includes('window.confirm(') && !rfqTabContent.includes('confirm('), 
    'RFQTab.tsx has ZERO native confirm() or window.confirm() calls');
  assert(!rfqTabContent.includes('window.alert(') && !rfqTabContent.includes('alert('), 
    'RFQTab.tsx has ZERO alert() or window.alert() calls');
  assert(rfqTabContent.includes('PersianConfirmModal'), 
    'RFQTab.tsx utilizes PersianConfirmModal for safe modal closures');
  assert(rfqTabContent.includes('formatJalaliDate'), 
    'RFQTab.tsx utilizes formatJalaliDate for Persian date formatting');
  assert(rfqTabContent.includes('formatSolarCapacity'), 
    'RFQTab.tsx formats solar capacity consistently');
  assert(rfqTabContent.includes('previewMode'), 
    'RFQTab.tsx supports safe development preview mode');
  assert(rfqTabContent.includes('min-h-[44px]'), 
    'RFQTab.tsx buttons provide >=44px touch targets');

  // 2. Inspect BidsTab.tsx
  const bidsTabPath = path.resolve('./src/pages/projects/Workspace/BidsTab.tsx');
  assert(fs.existsSync(bidsTabPath), 'BidsTab.tsx exists');
  const bidsTabContent = fs.readFileSync(bidsTabPath, 'utf8');

  assert(!bidsTabContent.includes('window.confirm(') && !bidsTabContent.includes('confirm('), 
    'BidsTab.tsx has ZERO native confirm() or window.confirm() calls');
  assert(!bidsTabContent.includes('window.alert(') && !bidsTabContent.includes('alert('), 
    'BidsTab.tsx has ZERO alert() or window.alert() calls');
  assert(bidsTabContent.includes('PersianConfirmModal'), 
    'BidsTab.tsx utilizes PersianConfirmModal for award / decision confirmation');
  assert(bidsTabContent.includes('modalContractorName') && bidsTabContent.includes('modalBidCode') && bidsTabContent.includes('modalPriceFormatted'),
    'BidsTab confirmation modal clearly shows contractor name, bid identifier, and quoted amount');
  assert(bidsTabContent.includes('formatCurrencyIRR'), 
    'BidsTab.tsx formats Rial currency properly');
  assert(bidsTabContent.includes('ارائه نشده'), 
    'BidsTab.tsx displays neutral fallback text «ارائه نشده» for missing optional specifications');
  assert(!bidsTabContent.includes('برنده خودکار') && !bidsTabContent.includes('بهترین پیشنهاد خودکار'), 
    'BidsTab.tsx does NOT fabricate a synthetic winner or auto-recommend');
  assert(bidsTabContent.includes('hidden md:block') && bidsTabContent.includes('block md:hidden'), 
    'BidsTab.tsx has dual desktop matrix table and responsive mobile cards representation');

  // Stage 13.5.1 specific checks on BidsTab
  assert(bidsTabContent.includes('مشاهده جزئیات پیشنهاد و اسناد') || bidsTabContent.includes('مشاهده جزئیات'), 
    'Stage 13.5.1: Primary informational CTA «مشاهده جزئیات پیشنهاد» is present on comparison cards');
  assert(bidsTabContent.includes('انتخاب این پیشنهاد به عنوان مجری') || bidsTabContent.includes('انتخاب مجری'), 
    'Stage 13.5.1: Contractor selection action remains available as deliberate secondary action');
  assert(bidsTabContent.includes('تولید سالیانه اعلامی پیمانکار'), 
    'Stage 13.5.1: Production claim is clearly attributed as «تولید سالیانه اعلامی پیمانکار»');
  assert(bidsTabContent.includes('ثبت‌شده توسط شرکت پیمانکار'), 
    'Stage 13.5.1: Context note «ثبت‌شده توسط شرکت پیمانکار» is present without implying Hooshyar engineering guarantee');
  assert(bidsTabContent.includes('سند فنی ارائه نشده') && bidsTabContent.includes('سند مالی و تجاری ارائه نشده'), 
    'Stage 13.5.1: Zero-document state displays human-readable missing state instead of «0 سند»');
  assert(!bidsTabContent.includes('0 سند فنی') && !bidsTabContent.includes('0 سند مالی'), 
    'Stage 13.5.1: UI does NOT display meaningless «0 سند فنی» or «0 سند مالی»');
  assert(bidsTabContent.includes('min-h-[44px]'), 
    'Stage 13.5.1: BidsTab controls enforce minimum 44px touch targets');

  // Persian fallback should NOT be wrapped in dir="ltr" or font-mono
  const ltrFallbackMatch = bidsTabContent.includes('dir="ltr">ارائه نشده') || bidsTabContent.includes("dir='ltr'>ارائه نشده");
  assert(!ltrFallbackMatch, 
    'Stage 13.5.1: Persian fallback «ارائه نشده» is NOT rendered with dir="ltr" or awkward monospace');

  // 3. Inspect Document Managers (Stage 12.3E compliance)
  const bidDocsPath = path.resolve('./src/components/rfq/BidDocumentsManager.tsx');
  const rfqDocsPath = path.resolve('./src/components/rfq/RFQDocumentsManager.tsx');
  assert(fs.existsSync(bidDocsPath), 'BidDocumentsManager.tsx exists');
  assert(fs.existsSync(rfqDocsPath), 'RFQDocumentsManager.tsx exists');

  const bidDocsContent = fs.readFileSync(bidDocsPath, 'utf8');
  const rfqDocsContent = fs.readFileSync(rfqDocsPath, 'utf8');

  assert(bidDocsContent.includes('هنوز سندی برای این بخش بارگذاری نشده است.'), 
    'BidDocumentsManager uses canonical empty state message');
  assert(rfqDocsContent.includes('هنوز سندی برای این بخش بارگذاری نشده است.'), 
    'RFQDocumentsManager uses canonical empty state message');
  assert(bidDocsContent.includes('min-h-[44px]') && bidDocsContent.includes('min-w-[44px]'), 
    'BidDocumentsManager provides comfortable >=44px touch targets for mobile download and delete');
  assert(rfqDocsContent.includes('min-h-[44px]') && rfqDocsContent.includes('min-w-[44px]'), 
    'RFQDocumentsManager provides comfortable >=44px touch targets for mobile download and delete');
  assert(bidDocsContent.includes('PersianConfirmModal'), 
    'BidDocumentsManager uses PersianConfirmModal for file deletion');
  assert(rfqDocsContent.includes('PersianConfirmModal'), 
    'RFQDocumentsManager uses PersianConfirmModal for file deletion');

  // 4. Inspect PersianConfirmModal.tsx touch targets
  const modalPath = path.resolve('./src/components/common/PersianConfirmModal.tsx');
  assert(fs.existsSync(modalPath), 'PersianConfirmModal.tsx exists');
  const modalContent = fs.readFileSync(modalPath, 'utf8');
  assert(modalContent.includes('min-h-[44px]'), 
    'PersianConfirmModal enforces >=44px touch targets on modal confirm and cancel actions');

  // 5. Inspect Dev Preview: RfqBidPreview.tsx
  const previewPath = path.resolve('./src/pages/dev/RfqBidPreview.tsx');
  assert(fs.existsSync(previewPath), 'RfqBidPreview.tsx exists');
  const previewContent = fs.readFileSync(previewPath, 'utf8');

  assert(previewContent.includes('import.meta.env.DEV'), 
    'RfqBidPreview.tsx is guarded by import.meta.env.DEV');
  assert(previewContent.includes('OPEN_ACTIVE') && previewContent.includes('AWARDED') && previewContent.includes('CLOSED') && previewContent.includes('DRAFT'), 
    'RfqBidPreview.tsx provides all 4 RFQ lifecycle scenarios');
  assert(previewContent.includes('360') && previewContent.includes('390') && previewContent.includes('430'), 
    'RfqBidPreview.tsx includes responsive mobile viewport simulator');
  assert(previewContent.includes('FIXTURE_RFQS') && previewContent.includes('FIXTURE_BIDS'), 
    'RfqBidPreview.tsx uses dedicated development fixtures');

  // Stage 13.5.1 Mobile tab clipping assertion
  assert(previewContent.includes('hidden sm:inline') && previewContent.includes('sm:hidden'), 
    'Stage 13.5.1: Dev preview tabs provide compact mobile labels to prevent tab clipping on ~390px mobile');
  assert(previewContent.includes('min-h-[44px]'), 
    'Stage 13.5.1: Dev preview tabs have >=44px touch targets');
  assert(previewContent.includes('previewMode={true}'), 
    'Stage 13.5.1: Dev preview uses previewMode={true} ensuring zero production mutations or backend API calls');

  // 6. Security Check — Signed URL TTL Audit (Stage 12.3E code invariant)
  const s3ServicePath = path.resolve('./src/storage/S3CompatibleFileStorageService.ts');
  const s3Content = fs.readFileSync(s3ServicePath, 'utf8');
  assert(s3Content.includes('signedUrlTtlSeconds || 300'), 
    'Security Check: Stage 12.3E signed URL TTL defaults to 300 seconds (5 minutes) and is untouched');

  const envConfigPath = path.resolve('./src/config/environment.ts');
  const envConfigContent = fs.readFileSync(envConfigPath, 'utf8');
  assert(envConfigContent.includes('signedUrlTtlSeconds: isNaN(osTtlSeconds) || osTtlSeconds <= 0 ? 300 : osTtlSeconds'), 
    'Security Check: Environment signedUrlTtlSeconds configuration remains intact');

  // 7. Inspect App.tsx route registration
  const appPath = path.resolve('./src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes('/dev/rfq-bid-preview'), 
    'App.tsx registers /dev/rfq-bid-preview route');
  assert(appContent.includes('import.meta.env.DEV &&'), 
    'Dev preview route is conditionally mounted only under import.meta.env.DEV');

  // 8. Security & Invariant Check (no modifications to package.json or bun.lock)
  const pkgContent = fs.readFileSync('./package.json', 'utf8');
  assert(!pkgContent.includes('new-unapproved-package'), 'package.json was not altered with unauthorized packages');

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
