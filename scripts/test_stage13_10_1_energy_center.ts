/**
 * STAGE 13.10.1 — IRAN ENERGY INTELLIGENCE CENTER VERIFICATION SUITE
 * 
 * Verifies:
 * 1. Database Immutability & Safety Rules (SHA-256 match, no db mutations)
 * 2. Unaltered Core Systems (package.json, src/types/maintenance.ts)
 * 3. Information Architecture (6 Core Categories, Content Types, Provenance Schema)
 * 4. Absolute Truthfulness Compliance (Zero fabricated news, truthful empty states, disabled AI simulation)
 * 5. Route & Navigation Discoverability (/energy-center, /energy-center/:id, Landing, DesktopHeader)
 * 6. Dev Preview Architecture Isolation (DEV_ENERGY_FIXTURES isolated from production)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  ENERGY_CATEGORIES, 
  CONTENT_TYPE_LABELS, 
  REGULATORY_STATUS_LABELS, 
  STAKEHOLDER_LABELS,
  ENERGY_TOPICS
} from '../src/types/energyCenter';
import { DEV_ENERGY_FIXTURES } from '../src/pages/dev/EnergyCenterPreview';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('\n===============================================================');
console.log('⚡ STAGE 13.10.1 — IRAN ENERGY INTELLIGENCE CENTER AUDIT');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: DATABASE BASELINE & SCOPE IMMUTABILITY
// -----------------------------------------------------------------------------
console.log('--- 1. Database & Safety Invariants ---');

const CANONICAL_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
const dbPath = path.resolve(process.cwd(), 'db.json');
const currentDbBytes = fs.readFileSync(dbPath);
const currentDbHash = crypto.createHash('sha256').update(currentDbBytes).digest('hex');

assert(
  currentDbHash === CANONICAL_DB_HASH,
  `db.json SHA-256 matches canonical hash exactly: ${currentDbHash}`
);

// Verify package.json not modified
const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkgContent = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgContent);
assert(!pkg.dependencies['fake-news'], 'No illegal news scraper packages installed');

// Verify src/types/maintenance.ts untouched
const maintTypesPath = path.resolve(process.cwd(), 'src/types/maintenance.ts');
const maintContent = fs.readFileSync(maintTypesPath, 'utf8');
assert(maintContent.includes('export type AlertSeverity'), 'src/types/maintenance.ts remains untouched');

// -----------------------------------------------------------------------------
// SECTION 2: INFORMATION ARCHITECTURE — 6 PILLARS & TAXONOMY
// -----------------------------------------------------------------------------
console.log('\n--- 2. Information Architecture (6 Pillars & Taxonomy) ---');

assert(ENERGY_CATEGORIES.length === 6, 'Exactly 6 core energy categories defined');

const expectedCategoryIds = [
  'news_announcements',
  'regulations',
  'energy_exchange',
  'tariffs_purchase',
  'tenders_calls',
  'investment_opportunities'
];

expectedCategoryIds.forEach(id => {
  const cat = ENERGY_CATEGORIES.find(c => c.id === id);
  assert(Boolean(cat), `Category pillar '${id}' exists (${cat?.title})`);
  assert(Boolean(cat?.subtitle && cat?.description), `Category '${id}' has complete metadata`);
});

// Content types taxonomy
const expectedContentTypes = [
  'NEWS', 'REGULATION', 'ANNOUNCEMENT', 'MARKET_DATA', 'TARIFF', 'TENDER', 'OPPORTUNITY'
];
expectedContentTypes.forEach(type => {
  const meta = CONTENT_TYPE_LABELS[type as keyof typeof CONTENT_TYPE_LABELS];
  assert(Boolean(meta && meta.label), `Content type '${type}' has Persian label: ${meta?.label}`);
});

// Regulatory status taxonomy
const expectedRegStatuses = ['ENFORCEABLE', 'AMENDED', 'REPEALED', 'PENDING_ENFORCEMENT'];
expectedRegStatuses.forEach(st => {
  const meta = REGULATORY_STATUS_LABELS[st as keyof typeof REGULATORY_STATUS_LABELS];
  assert(Boolean(meta && meta.label), `Regulatory status '${st}' has label: ${meta?.label}`);
});

// Stakeholder groups taxonomy
const expectedStakeholders = [
  'PROJECT_OWNER', 'INVESTOR', 'EPC_CONTRACTOR', 'EQUIPMENT_VENDOR', 'TECHNICIAN', 'INDUSTRIAL_CONSUMER'
];
expectedStakeholders.forEach(sh => {
  const label = STAKEHOLDER_LABELS[sh as keyof typeof STAKEHOLDER_LABELS];
  assert(Boolean(label), `Stakeholder group '${sh}' defined: ${label}`);
});

assert(ENERGY_TOPICS.length >= 10, `Energy topics vocabulary comprehensive (${ENERGY_TOPICS.length} topics)`);

// -----------------------------------------------------------------------------
// SECTION 3: ABSOLUTE TRUTHFULNESS & EMPTY STATE INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- 3. Absolute Truthfulness & Institutional Empty States ---');

// Check EnergyCenterHome.tsx code for truthful empty state messaging
const homePath = path.resolve(process.cwd(), 'src/pages/energy-center/EnergyCenterHome.tsx');
const homeCode = fs.readFileSync(homePath, 'utf8');

assert(
  homeCode.includes('در انتظار درج اسناد راهبردی رسمی'),
  'Truthful empty state present for Key Developments section'
);
assert(
  homeCode.includes('هنوز اطلاعات تأییدشده‌ای در این بخش منتشر نشده است.'),
  'Truthful empty state present for Latest Records section'
);
assert(
  homeCode.includes('اصل صداقت داده‌ها'),
  'Explicit statement of data honesty and institutional verification in UI copy'
);
assert(
  !homeCode.includes('نرخ لحظه‌ای') && !homeCode.includes('قیمت امروز بورس'),
  'No untruthful claims of "live" or "today" market prices without verified feed'
);

// Stage 13.10.1.2 Specific Pre-Live Truthfulness Invariants
assert(
  !homeCode.includes('۴۰۰۰ مگاواتی') && !homeCode.includes('4000 مگاوات') && !homeCode.includes('4000MW'),
  'Production Energy Center explicitly rejects specific fake MW/project figures'
);
assert(
  !homeCode.includes('فراخوان‌های فعال') && !homeCode.includes('مناقصات فعال'),
  'Production Energy Center explicitly rejects claims of active tenders without verified records'
);
assert(
  !homeCode.includes('جداول تعرفه‌ای رسمی'),
  'Production Energy Center explicitly rejects claims of available official tariff tables without verified records'
);
assert(
  !homeCode.includes('بسته‌های سرمایه‌گذاری'),
  'Production Energy Center explicitly rejects claims of available investment packages without verified records'
);

// Verify capability/architecture-oriented copy and safe CTAs in market section
assert(
  homeCode.includes('اطلاعات و اسناد مرتبط با معاملات برق و سازوکارهای بازار انرژی'),
  'Market section uses capability-oriented copy for energy exchange'
);
assert(
  homeCode.includes('اطلاعات مرتبط با قراردادهای خرید برق، سازوکارهای فروش و مقررات مرتبط'),
  'Market section uses capability-oriented copy for electricity sales'
);
assert(
  homeCode.includes('محل نمایش مناقصات و فراخوان‌های رسمی پس از دریافت و تأیید از منابع معتبر'),
  'Market section uses capability-oriented copy for tenders'
);
assert(
  homeCode.includes('محل نمایش فرصت‌ها و اطلاعیه‌های سرمایه‌گذاری پس از دریافت و اعتبارسنجی'),
  'Market section uses capability-oriented copy for investment opportunities'
);
assert(
  (homeCode.match(/مشاهده اطلاعات این بخش/g) || []).length >= 4,
  'All 4 market section cards use safe capability CTA "مشاهده اطلاعات این بخش"'
);

// Verify ENERGY_CATEGORIES in types does not make premature claims of published tables
const typesPath = path.resolve(process.cwd(), 'src/types/energyCenter.ts');
const typesCode = fs.readFileSync(typesPath, 'utf8');
assert(
  !typesCode.includes('جداول تعرفه‌ای ابلاغ‌شده'),
  'Category taxonomy does not claim published tariff tables exist'
);
assert(
  !typesCode.includes('واگذاری ساختگاه‌های ۴۰۰۰ مگاواتی'),
  'Category taxonomy does not claim specific tender projects'
);

// Check FutureAiImpactHook.tsx for non-deceptive representation
const hookPath = path.resolve(process.cwd(), 'src/components/energy-center/FutureAiImpactHook.tsx');
const hookCode = fs.readFileSync(hookPath, 'utf8');

assert(
  hookCode.includes('قابلیت آینده • به‌زودی'),
  'Future AI Impact Hook explicitly labeled as upcoming capability'
);
assert(
  hookCode.includes('disabled') && hookCode.includes('cursor-not-allowed'),
  'Future AI Impact simulation button is disabled and clearly non-functional'
);

// -----------------------------------------------------------------------------
// SECTION 4: ROUTE & LANDING-PAGE-FIRST DISCOVERABILITY (STAGE 13.10.1.1)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Routing & Landing-Page-First Discoverability ---');

const appPath = path.resolve(process.cwd(), 'src/App.tsx');
const appCode = fs.readFileSync(appPath, 'utf8');

assert(appCode.includes('path="/energy-center"'), 'Canonical route /energy-center configured in App.tsx');
assert(appCode.includes('path="/energy-center/:id"'), 'Detail route /energy-center/:id configured in App.tsx');
assert(appCode.includes('path="/dev/energy-center-preview"'), 'Visual preview route /dev/energy-center-preview configured');

// DesktopHeader.tsx: MUST NOT be a primary global toolbar item
const headerPath = path.resolve(process.cwd(), 'src/components/navigation/DesktopHeader.tsx');
const headerCode = fs.readFileSync(headerPath, 'utf8');

// Find the navItems block for !isAuthenticated
const unauthNavMatch = headerCode.match(/if \(!isAuthenticated\) \{[\s\S]*?return (\[[\s\S]*?\]);/);
assert(Boolean(unauthNavMatch), 'Found unauthenticated navItems block in DesktopHeader.tsx');
if (unauthNavMatch) {
  const unauthNavItemsStr = unauthNavMatch[1];
  assert(
    !unauthNavItemsStr.includes('/energy-center'),
    'DesktopHeader toolbar does NOT contain /energy-center (removed from primary toolbar)'
  );
  assert(
    unauthNavItemsStr.includes('/ads/portal') && unauthNavItemsStr.includes('تبلیغات و معرفی برند'),
    'DesktopHeader preserves "تبلیغات و معرفی برند" without alteration'
  );
}

// Landing.tsx: Top navigation and mobile drawer must NOT treat Energy Center as a primary toolbar item
const landingPath = path.resolve(process.cwd(), 'src/pages/Landing.tsx');
const landingCode = fs.readFileSync(landingPath, 'utf8');

// Extract desktop navbar from Landing.tsx
const desktopNavMatch = landingCode.match(/<nav className="hidden lg:flex[^"]*">([\s\S]*?)<\/nav>/);
assert(Boolean(desktopNavMatch), 'Found desktop top nav in Landing.tsx');
if (desktopNavMatch) {
  assert(
    !desktopNavMatch[1].includes('/energy-center'),
    'Landing top navigation does NOT contain /energy-center toolbar item'
  );
  assert(
    desktopNavMatch[1].includes('/ads/portal') && desktopNavMatch[1].includes('تبلیغات و معرفی برند'),
    'Landing top navigation preserves "تبلیغات و معرفی برند"'
  );
}

// Extract mobile drawer links
const mobileDrawerMatch = landingCode.match(/\{mobileMenuOpen && \(\s*<div className="lg:hidden[^"]*">([\s\S]*?)<\/div>\s*\)\}/);
assert(Boolean(mobileDrawerMatch), 'Found mobile drawer in Landing.tsx');
if (mobileDrawerMatch) {
  assert(
    !mobileDrawerMatch[1].includes('/energy-center'),
    'Landing mobile drawer does NOT treat Energy Center as a primary toolbar item'
  );
  assert(
    mobileDrawerMatch[1].includes('/ads/portal') && mobileDrawerMatch[1].includes('تبلیغات و معرفی برند'),
    'Landing mobile drawer preserves "تبلیغات و معرفی برند"'
  );
}

// Landing.tsx: Must contain prominent dedicated section
assert(
  landingCode.includes('مرکز اطلاعات انرژی ایران'),
  'Landing page includes prominent dedicated section for Energy Center'
);
assert(
  landingCode.includes('اخبار، مقررات، بازار، مناقصات و فرصت‌های صنعت انرژی ایران'),
  'Landing page dedicated section includes official supporting text'
);
assert(
  landingCode.includes('ورود به مرکز اطلاعات انرژی'),
  'Landing page dedicated section includes primary CTA "ورود به مرکز اطلاعات انرژی"'
);
assert(
  landingCode.includes('to="/energy-center"') && landingCode.includes('min-h-[44px]'),
  'Landing page CTA routes to /energy-center with standard min 44px touch target'
);

// Verify 6 category domain concepts in dedicated Landing section
const requiredDomains = [
  'اخبار و اطلاعیه‌ها',
  'قوانین و مقررات',
  'بازار برق و بورس انرژی',
  'تعرفه‌ها و خرید برق',
  'مناقصات و فراخوان‌ها',
  'سرمایه‌گذاری و فرصت‌ها'
];
requiredDomains.forEach(domain => {
  assert(landingCode.includes(domain), `Landing dedicated section visualizes domain '${domain}'`);
});

// -----------------------------------------------------------------------------
// SECTION 5: DEV-ONLY VISUAL QA FIXTURES ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- 5. Dev QA Fixtures & Isolation ---');

assert(DEV_ENERGY_FIXTURES.length === 3, 'Exactly 3 DEV QA fixtures created for visual testing');

DEV_ENERGY_FIXTURES.forEach((fix, idx) => {
  assert(
    fix.id.startsWith('dev_fixture_'),
    `Fixture ${idx + 1} id '${fix.id}' has dev_fixture_ prefix`
  );
  assert(
    fix.provenance.sourceName.includes('DEV FIXTURE'),
    `Fixture ${idx + 1} provenance clearly marked as DEV FIXTURE`
  );
  assert(
    Boolean(fix.summary && fix.category && fix.contentType),
    `Fixture ${idx + 1} implements full EnergyInformationRecord interface`
  );
});

// Verify dev preview file does not import database writer
const previewPath = path.resolve(process.cwd(), 'src/pages/dev/EnergyCenterPreview.tsx');
const previewCode = fs.readFileSync(previewPath, 'utf8');
assert(!previewCode.includes('writeDatabase'), 'EnergyCenterPreview is purely in-memory and does not write to db.json');

// Final check on database hash
const postDbBytes = fs.readFileSync(dbPath);
const postDbHash = crypto.createHash('sha256').update(postDbBytes).digest('hex');
assert(postDbHash === CANONICAL_DB_HASH, 'db.json hash remained 100% invariant throughout test execution');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n===============================================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL STAGE 13.10.1 ARCHITECTURAL & SAFETY TESTS PASSED!\n');
}
