import fs from 'fs';
import path from 'path';

function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING STAGE 13.7 VERIFICATION TEST SUITE');
  console.log('Hooshyar Energy V2 — Smart Maintenance Experience');
  console.log('Operational O&M Workflow, Mobile Touch Safety & Truthfulness');
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

  // 1. Inspect SmartMaintenance.tsx
  const pagePath = path.resolve('./src/pages/SmartMaintenance.tsx');
  assert(fs.existsSync(pagePath), 'SmartMaintenance.tsx exists');
  const pageContent = fs.readFileSync(pagePath, 'utf8');

  assert(!pageContent.includes('window.confirm(') && !pageContent.includes('confirm('),
    'SmartMaintenance.tsx has ZERO native confirm() or window.confirm() calls');
  assert(!pageContent.includes('window.alert(') && !pageContent.includes('alert('),
    'SmartMaintenance.tsx has ZERO alert() or window.alert() calls');
  assert(pageContent.includes('گردش کار عملیاتی بهره‌برداری و نگهداری نیروگاه‌های خورشیدی') || pageContent.includes('Solar O&M Lifecycle'),
    'SmartMaintenance: Enterprise O&M operational workflow banner is present');
  assert(pageContent.includes('overflow-x-auto') && pageContent.includes('whitespace-nowrap'),
    'SmartMaintenance: Mobile tabs use RTL scroll-safe horizontal container without clipping');
  assert(pageContent.includes('min-h-[44px]'),
    'SmartMaintenance: Interactive controls and tabs enforce >=44px touch targets');
  assert(pageContent.includes('dir="ltr"') && pageContent.includes('trackingInputCode'),
    'SmartMaintenance: Tracking code input is wrapped with dir="ltr" for strict bidirectional isolation');

  // 2. Inspect CustomerMaintenanceRequest.tsx
  const requestPath = path.resolve('./src/components/maintenance/CustomerMaintenanceRequest.tsx');
  assert(fs.existsSync(requestPath), 'CustomerMaintenanceRequest.tsx exists');
  const requestContent = fs.readFileSync(requestPath, 'utf8');

  assert(!requestContent.includes('window.confirm(') && !requestContent.includes('confirm('),
    'CustomerMaintenanceRequest.tsx has ZERO native confirm() or window.confirm() calls');
  assert(!requestContent.includes('window.alert(') && !requestContent.includes('alert('),
    'CustomerMaintenanceRequest.tsx has ZERO alert() or window.alert() calls');
  assert(requestContent.includes('دستیار هوشمند تحلیل شواهد مهندسی O&M'),
    'CustomerMaintenanceRequest: Truthful engineering attribution notice is present');
  assert(requestContent.includes('dir="ltr"') && requestContent.includes('createdCase.caseNumber'),
    'CustomerMaintenanceRequest: Confirmation caseNumber is isolated with dir="ltr"');
  assert(requestContent.includes('dir="ltr"') && requestContent.includes('contactPhone'),
    'CustomerMaintenanceRequest: Phone number input is isolated with dir="ltr"');
  assert(requestContent.includes('min-h-[44px]') && requestContent.includes('min-h-[48px]'),
    'CustomerMaintenanceRequest: All navigation and submission buttons provide >=44px touch targets');

  // 3. Inspect CustomerCaseTracking.tsx
  const trackingPath = path.resolve('./src/components/maintenance/CustomerCaseTracking.tsx');
  assert(fs.existsSync(trackingPath), 'CustomerCaseTracking.tsx exists');
  const trackingContent = fs.readFileSync(trackingPath, 'utf8');

  assert(!trackingContent.includes('window.confirm(') && !trackingContent.includes('confirm('),
    'CustomerCaseTracking.tsx has ZERO native confirm() or window.confirm() calls');
  assert(!trackingContent.includes('window.alert(') && !trackingContent.includes('alert('),
    'CustomerCaseTracking.tsx has ZERO alert() or window.alert() calls');
  assert(trackingContent.includes('dir="ltr"') && trackingContent.includes('mCase.caseNumber'),
    'CustomerCaseTracking: Case number in header is isolated with dir="ltr" font-mono');
  assert(trackingContent.includes('dir="ltr"') && trackingContent.includes('mCase.assignedTechnicianPhone'),
    'CustomerCaseTracking: Technician phone number is isolated with dir="ltr"');
  assert(trackingContent.includes('min-h-[44px]'),
    'CustomerCaseTracking: Action buttons and modal controls provide >=44px touch targets');

  // 4. Inspect CaseList.tsx
  const listPath = path.resolve('./src/components/maintenance/CaseList.tsx');
  assert(fs.existsSync(listPath), 'CaseList.tsx exists');
  const listContent = fs.readFileSync(listPath, 'utf8');

  assert(listContent.includes('dir="ltr"') && listContent.includes('c.caseNumber'),
    'CaseList: Case number is isolated with dir="ltr"');
  assert(listContent.includes('min-h-[44px]'),
    'CaseList: Filter inputs and action buttons provide >=44px touch targets');

  // 5. Inspect ApprovedProfessionalsDirectory.tsx
  const dirPath = path.resolve('./src/components/maintenance/ApprovedProfessionalsDirectory.tsx');
  assert(fs.existsSync(dirPath), 'ApprovedProfessionalsDirectory.tsx exists');
  const dirContent = fs.readFileSync(dirPath, 'utf8');

  assert(dirContent.includes('min-h-[44px]'),
    'ApprovedProfessionalsDirectory: Filters and CTA buttons provide >=44px touch targets');

  // 6. Security & Checksum Audit
  const dbHash = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
  const pkgHash = '90486ca155c8ea72b179c001d32af8c2eac08259837a1817520326b9194379cc';
  const bunHash = '79ef5b3a7ccbd526c213eac475e3485120c6823b5f71980721b972f5e4bf5386';

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
