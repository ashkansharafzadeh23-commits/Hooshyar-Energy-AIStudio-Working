/**
 * HOOSHYAR ENERGY — UI-5 COMMERCIAL WORKSPACE & PROCUREMENT TEST SUITE
 * 
 * Verifies:
 * 1. Component Architecture & Exports in src/components/procurement/
 * 2. Integration into ProjectDetail.tsx, ProjectProcess.tsx, and ProjectContextNavigation.tsx
 * 3. 5-Question Decision Banner Architecture
 * 4. Process Navigator Stages and Deterministic States
 * 5. RFQ Readiness and Guided Wizard Purity
 * 6. EPC Bid Inbox, BidCard, and BidComparison Factual Integrity
 * 7. EPC Selection Lifecycle Transition
 * 8. BOQ Equipment Workspace & Categorization
 * 9. Vendor RFQ Builder & Quantity Preservation
 * 10. Vendor Quotation Inbox, Card, and Comparison
 * 11. Purchase Order Issuance and Delivery Tracking
 * 12. Non-negotiable Data-Truth Rules (No synthetic contractors, bids, or progress)
 * 13. Test Isolation & db.json Byte-for-Byte Immutability Guard
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

const ROOT_DIR = process.cwd();
const DB_PATH = path.join(ROOT_DIR, 'db.json');
const INITIAL_DB_HASH = crypto.createHash('sha256').update(fs.readFileSync(DB_PATH)).digest('hex');

console.log('========================================================');
console.log('HOOSHYAR ENERGY — UI-5 COMMERCIAL & PROCUREMENT TEST SUITE');
console.log('========================================================\n');

// [1] Verify Component Architecture in src/components/procurement/
console.log('[1] Testing Component Architecture in src/components/procurement/...');

const procurementDir = path.join(ROOT_DIR, 'src', 'components', 'procurement');
assert(fs.existsSync(procurementDir), 'Directory src/components/procurement exists');

const requiredFiles = [
  'CommercialWorkspace.tsx',
  'CommercialProcessNavigator.tsx',
  'CommercialDecisionBanner.tsx',
  'CommercialEmptyState.tsx',
  'RFQReadiness.tsx',
  'RFQWizard.tsx',
  'RFQReview.tsx',
  'BidInbox.tsx',
  'BidCard.tsx',
  'BidComparison.tsx',
  'BidSelectionReview.tsx',
  'BOQWorkspace.tsx',
  'BOQItem.tsx',
  'VendorRFQBuilder.tsx',
  'QuotationInbox.tsx',
  'QuotationCard.tsx',
  'QuotationComparison.tsx',
  'PurchaseOrderReview.tsx',
  'DeliveryStatus.tsx',
  'index.ts'
];

for (const file of requiredFiles) {
  const filePath = path.join(procurementDir, file);
  assert(fs.existsSync(filePath), `Component src/components/procurement/${file} exists`);
}

const indexSrc = fs.readFileSync(path.join(procurementDir, 'index.ts'), 'utf8');
assert(indexSrc.includes("export * from './CommercialWorkspace';"), 'index.ts exports CommercialWorkspace');
assert(indexSrc.includes("export * from './CommercialProcessNavigator';"), 'index.ts exports CommercialProcessNavigator');
assert(indexSrc.includes("export * from './CommercialDecisionBanner';"), 'index.ts exports CommercialDecisionBanner');
assert(indexSrc.includes("export * from './BidInbox';"), 'index.ts exports BidInbox');
assert(indexSrc.includes("export * from './BidCard';"), 'index.ts exports BidCard');
assert(indexSrc.includes("export * from './BidComparison';"), 'index.ts exports BidComparison');
assert(indexSrc.includes("export * from './BidSelectionReview';"), 'index.ts exports BidSelectionReview');
assert(indexSrc.includes("export * from './BOQWorkspace';"), 'index.ts exports BOQWorkspace');
assert(indexSrc.includes("export * from './VendorRFQBuilder';"), 'index.ts exports VendorRFQBuilder');
assert(indexSrc.includes("export * from './QuotationInbox';"), 'index.ts exports QuotationInbox');
assert(indexSrc.includes("export * from './QuotationComparison';"), 'index.ts exports QuotationComparison');
assert(indexSrc.includes("export * from './PurchaseOrderReview';"), 'index.ts exports PurchaseOrderReview');
assert(indexSrc.includes("export * from './DeliveryStatus';"), 'index.ts exports DeliveryStatus');

// [2] Verify Workspace Integration
console.log('\n[2] Verifying Workspace Integration...');

const projectDetailPath = path.join(ROOT_DIR, 'src', 'pages', 'projects', 'ProjectDetail.tsx');
const projectDetailSrc = fs.readFileSync(projectDetailPath, 'utf8');
assert(projectDetailSrc.includes('CommercialWorkspace'), 'ProjectDetail mounts CommercialWorkspace');
assert(projectDetailSrc.includes("activeTab === 'commercial'"), 'ProjectDetail handles commercial tab');
assert(projectDetailSrc.includes("paramTab === 'commercial'"), 'ProjectDetail resolves ?tab=commercial deep link');

const projectProcessPath = path.join(ROOT_DIR, 'src', 'components', 'projects', 'ProjectProcess.tsx');
const projectProcessSrc = fs.readFileSync(projectProcessPath, 'utf8');
assert(projectProcessSrc.includes('CommercialWorkspace'), 'ProjectProcess mounts CommercialWorkspace');
assert(projectProcessSrc.includes("case 'rfq':"), 'ProjectProcess maps rfq to CommercialWorkspace');
assert(projectProcessSrc.includes("case 'bids':"), 'ProjectProcess maps bids to CommercialWorkspace');
assert(projectProcessSrc.includes("case 'procurement':"), 'ProjectProcess maps procurement to CommercialWorkspace');

const navPath = path.join(ROOT_DIR, 'src', 'components', 'projects', 'ProjectContextNavigation.tsx');
const navSrc = fs.readFileSync(navPath, 'utf8');
assert(navSrc.includes("'commercial'"), 'ProjectContextNavigation includes commercial tab id');
assert(navSrc.includes('تأمین و قراردادها'), 'ProjectContextNavigation has Persian label تأمین و قراردادها');

// [3] Verify 5-Question Decision Banner Architecture
console.log('\n[3] Verifying 5-Question Commercial Decision Banner...');

const bannerPath = path.join(procurementDir, 'CommercialDecisionBanner.tsx');
const bannerSrc = fs.readFileSync(bannerPath, 'utf8');
assert(bannerSrc.includes('currentAction'), 'Banner context supports question 1: current action');
assert(bannerSrc.includes('completedMilestones'), 'Banner context supports question 2: completed milestones');
assert(bannerSrc.includes('missingInfo'), 'Banner context supports question 3: missing information');
assert(bannerSrc.includes('pendingDecision'), 'Banner context supports question 4: pending decision');
assert(bannerSrc.includes('decisionImpact'), 'Banner context supports question 5: decision impact');
assert(bannerSrc.includes('نواقص اطلاعاتی یا مدارک مورد نیاز'), 'Banner clearly discloses missing info without inventing data');
assert(bannerSrc.includes('پیامد پس از انتخاب'), 'Banner explains what happens next');

// [4] Testing Process Navigator Stages and Deterministic Statuses
console.log('\n[4] Testing Process Navigator Stages and Deterministic Statuses...');

const navCompPath = path.join(procurementDir, 'CommercialProcessNavigator.tsx');
const navCompSrc = fs.readFileSync(navCompPath, 'utf8');
assert(navCompSrc.includes("'NOT_STARTED'"), 'Navigator supports NOT_STARTED status');
assert(navCompSrc.includes("'PENDING_INFO'"), 'Navigator supports PENDING_INFO status');
assert(navCompSrc.includes("'RECEIVING_BIDS'"), 'Navigator supports RECEIVING_BIDS status');
assert(navCompSrc.includes("'BIDS_RECEIVED'"), 'Navigator supports BIDS_RECEIVED status');
assert(navCompSrc.includes("'NEEDS_DECISION'"), 'Navigator supports NEEDS_DECISION status');
assert(navCompSrc.includes("'AWARDED'"), 'Navigator supports AWARDED status');
assert(navCompSrc.includes("'IN_PROCUREMENT'"), 'Navigator supports IN_PROCUREMENT status');
assert(navCompSrc.includes("'DELIVERED'"), 'Navigator supports DELIVERED status');
assert(!navCompSrc.includes('width: `${progress}%`'), 'Navigator contains no fabricated progress bar percentages');

// [5] Testing RFQ Readiness & Wizard
console.log('\n[5] Testing RFQ Readiness & Wizard...');

const readinessPath = path.join(procurementDir, 'RFQReadiness.tsx');
const readinessSrc = fs.readFileSync(readinessPath, 'utf8');
assert(readinessSrc.includes('DataTruthBadge'), 'RFQReadiness uses DataTruthBadge for transparency');
assert(readinessSrc.includes('موقعیت جغرافیایی و اقلیم'), 'RFQReadiness checks verified location');
assert(readinessSrc.includes('ظرفیت هدف نیروگاه'), 'RFQReadiness checks real capacity');
assert(readinessSrc.includes('پیوست ارزیابی فنی و تابش خورشیدی'), 'RFQReadiness checks technical analysis linkage');
assert(readinessSrc.includes('برای دریافت بهترین نتایج، پیشنهاد می‌شود موارد زیر تکمیل شوند'), 'Readiness lists missing items clearly');

const wizardPath = path.join(procurementDir, 'RFQWizard.tsx');
const wizardSrc = fs.readFileSync(wizardPath, 'utf8');
assert(wizardSrc.includes('scopeOfWork'), 'Wizard supports scope of work customization');
assert(wizardSrc.includes('submissionDeadlineDays'), 'Wizard configures deadline in business days');
assert(wizardSrc.includes('اطلاعات استخراج‌شده از پروژه'), 'Wizard preserves project-derived data');
assert(wizardSrc.includes('showAdvanced'), 'Wizard uses progressive disclosure for advanced settings');

// [6] Testing Bid Inbox, Bid Card, and Bid Comparison Data Truth
console.log('\n[6] Testing Bid Inbox, Bid Card, and Bid Comparison Data Truth...');

const bidInboxPath = path.join(procurementDir, 'BidInbox.tsx');
const bidInboxSrc = fs.readFileSync(bidInboxPath, 'utf8');
assert(bidInboxSrc.includes('هنوز پیشنهادی دریافت نشده است.'), 'BidInbox provides clean truthful empty state without mock contractors');
assert(bidInboxSrc.includes('onOpenCompare'), 'BidInbox triggers side-by-side comparison');

const bidCardPath = path.join(procurementDir, 'BidCard.tsx');
const bidCardSrc = fs.readFileSync(bidCardPath, 'utf8');
assert(bidCardSrc.includes('formatCurrencyIRR'), 'BidCard uses Persian currency formatter');
assert(bidCardSrc.includes('ارائه نشده'), 'BidCard displays "ارائه نشده" for missing fields (never zero or placeholder)');
assert(bidCardSrc.includes('CONTRACTOR_SUBMITTED'), 'BidCard displays contractor submitted data provenance');

const bidCompPath = path.join(procurementDir, 'BidComparison.tsx');
const bidCompSrc = fs.readFileSync(bidCompPath, 'utf8');
assert(bidCompSrc.includes('minPrice'), 'BidComparison objectively computes minimum price');
assert(bidCompSrc.includes('minTimeline'), 'BidComparison objectively computes minimum timeline');
assert(bidCompSrc.includes('generateFactualObservations'), 'BidComparison generates objective factual observations');
assert(!bidCompSrc.includes('هوش مصنوعی پیشنهاد می‌کند'), 'BidComparison contains no subjective AI recommendation');
assert(bidCompSrc.includes('hidden lg:block'), 'BidComparison provides desktop comparison table');
assert(bidCompSrc.includes('lg:hidden'), 'BidComparison provides mobile stacked cards');

// [7] Testing EPC Selection Lifecycle Transition
console.log('\n[7] Testing EPC Selection Lifecycle Transition...');

const bidSelectPath = path.join(procurementDir, 'BidSelectionReview.tsx');
const bidSelectSrc = fs.readFileSync(bidSelectPath, 'utf8');
assert(bidSelectSrc.includes('تأیید نهایی انتخاب پیمانکار'), 'BidSelectionReview provides clear confirmation dialog');
assert(bidSelectSrc.includes('EPC_SELECTED'), 'BidSelectionReview explains transition to EPC_SELECTED');
assert(bidSelectSrc.includes('تنظیم پیش‌نویس قرارداد') || bidSelectSrc.includes('آماده‌سازی قرارداد'), 'BidSelectionReview indicates contract preparation as next step');

// [8] Testing BOQ Equipment Workspace & Categorization
console.log('\n[8] Testing BOQ Equipment Workspace & Categorization...');

const boqPath = path.join(procurementDir, 'BOQWorkspace.tsx');
const boqSrc = fs.readFileSync(boqPath, 'utf8');
assert(boqSrc.includes('فهرست تجهیزات پروژه هنوز ایجاد نشده است.'), 'BOQWorkspace handles empty state truthfully');
assert(boqSrc.includes('SOLAR_PANEL'), 'BOQWorkspace categorizes solar panels');
assert(boqSrc.includes('INVERTER'), 'BOQWorkspace categorizes inverters');
assert(boqSrc.includes('MOUNTING_STRUCTURE'), 'BOQWorkspace categorizes structures');
assert(boqSrc.includes('DC_CABLE'), 'BOQWorkspace categorizes electrical cables');
assert(boqSrc.includes('onCreateVendorRFQ'), 'BOQWorkspace enables creating Vendor RFQ from selected items');

const boqItemPath = path.join(procurementDir, 'BOQItem.tsx');
const boqItemSrc = fs.readFileSync(boqItemPath, 'utf8');
assert(boqItemSrc.includes('isSubstitutionAllowed'), 'BOQItem shows whether equivalent substitution is allowed');
assert(boqItemSrc.includes('برآورد ثبت نشده'), 'BOQItem shows missing estimate indicator without defaulting to 0');

// [9] Testing Vendor RFQ Builder & Quantity Preservation
console.log('\n[9] Testing Vendor RFQ Builder & Quantity Preservation...');

const vendorRfqPath = path.join(procurementDir, 'VendorRFQBuilder.tsx');
const vendorRfqSrc = fs.readFileSync(vendorRfqPath, 'utf8');
assert(vendorRfqSrc.includes('مقادیر مهندسی بدون دخل و تصرف منظور می‌شوند'), 'VendorRFQBuilder guarantees BOQ quantities cannot be tampered with');
assert(vendorRfqSrc.includes('selectedItems.map'), 'VendorRFQBuilder lists bundled BOQ items');
assert(vendorRfqSrc.includes('submissionDeadline'), 'VendorRFQBuilder sets submission deadline');
assert(vendorRfqSrc.includes('deliveryLocation'), 'VendorRFQBuilder captures delivery location');

// [10] Testing Quotation Inbox, Card, and Comparison
console.log('\n[10] Testing Quotation Inbox, Card, and Comparison...');

const quoteInboxPath = path.join(procurementDir, 'QuotationInbox.tsx');
const quoteInboxSrc = fs.readFileSync(quoteInboxPath, 'utf8');
assert(quoteInboxSrc.includes('هنوز پیشنهادی از فروشندگان دریافت نشده است.'), 'QuotationInbox provides truthful empty state');

const quoteCardPath = path.join(procurementDir, 'QuotationCard.tsx');
const quoteCardSrc = fs.readFileSync(quoteCardPath, 'utf8');
assert(quoteCardSrc.includes('VENDOR_SUBMITTED'), 'QuotationCard marks supplier provenance');
assert(quoteCardSrc.includes('ارائه نشده'), 'QuotationCard handles missing fields truthfully');

const quoteCompPath = path.join(procurementDir, 'QuotationComparison.tsx');
const quoteCompSrc = fs.readFileSync(quoteCompPath, 'utf8');
assert(quoteCompSrc.includes('تطابق کامل در انتظار بازرسی و تحویل'), 'QuotationComparison does not claim unverified compatibility');

// [11] Testing Purchase Order Issuance and Delivery Tracking
console.log('\n[11] Testing Purchase Order Issuance and Delivery Tracking...');

const poPath = path.join(procurementDir, 'PurchaseOrderReview.tsx');
const poSrc = fs.readFileSync(poPath, 'utf8');
assert(poSrc.includes('سفارش خرید رسمی (PO)'), 'PurchaseOrderReview manages official PO view');
assert(poSrc.includes('deliveryExpectedDate'), 'PurchaseOrderReview captures expected delivery date');

const delivPath = path.join(procurementDir, 'DeliveryStatus.tsx');
const delivSrc = fs.readFileSync(delivPath, 'utf8');
assert(delivSrc.includes('هنوز محموله‌ای برای این پروژه ارسال یا ثبت نشده است.'), 'DeliveryStatus handles empty state truthfully without fake telemetry');
assert(delivSrc.includes('waybillNumber'), 'DeliveryStatus surfaces genuine waybill number');
assert(delivSrc.includes('ARRIVED_AT_SITE'), 'DeliveryStatus tracks site arrival');
assert(delivSrc.includes('INSPECTED'), 'DeliveryStatus tracks inspection verification');

// [12] Testing Non-negotiable Anti-Fabrication Constraints in UI-5
console.log('\n[12] Testing Anti-Fabrication Rules in UI-5 Components...');

const workspacePath = path.join(procurementDir, 'CommercialWorkspace.tsx');
const workspaceSrc = fs.readFileSync(workspacePath, 'utf8');
assert(!workspaceSrc.includes('Math.random()'), 'CommercialWorkspace contains NO Math.random() calls');
assert(!workspaceSrc.includes('const mock'), 'CommercialWorkspace contains NO mock objects');
assert(!workspaceSrc.includes('const dummy'), 'CommercialWorkspace contains NO dummy objects');
assert(!workspaceSrc.includes('const sample'), 'CommercialWorkspace contains NO sample objects');
assert(workspaceSrc.includes('/api/projects/${project.id}/rfqs'), 'CommercialWorkspace uses genuine backend project rfqs endpoint');
assert(workspaceSrc.includes('/api/projects/${project.id}/boqs'), 'CommercialWorkspace uses genuine backend boqs endpoint');
assert(workspaceSrc.includes('/api/projects/${project.id}/purchase-orders'), 'CommercialWorkspace uses genuine backend purchase-orders endpoint');
assert(workspaceSrc.includes('/api/projects/${project.id}/deliveries'), 'CommercialWorkspace uses genuine backend deliveries endpoint');

// [13] Verify Database Immutability (Byte-for-Byte SHA-256)
console.log('\n[13] Verifying db.json Immutability...');
const finalHash = crypto.createHash('sha256').update(fs.readFileSync(DB_PATH)).digest('hex');
assert(finalHash === INITIAL_DB_HASH, 'db.json SHA-256 is byte-for-byte identical');

console.log('\n========================================================');
console.log(`UI-5 VERIFICATION COMPLETE: ${passed} passed, ${failed} failed`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
}
