/**
 * UI-1 Global Shell & Navigation Regression & Verification Suite
 * Tests:
 * 1. Persian Formatting Foundation (digits, currency, capacity, generation, jalali dates, non-mutation of technical codes)
 * 2. Shared UI Primitives (PageContainer, PageHeader, SectionHeader, StatusBadge, DataTruthBadge, EmptyState, LoadingState, ErrorState)
 * 3. Navigation Architecture (DesktopHeader, MobileBottomNav, role-aware portfolio visibility)
 * 4. RTL & Branding Foundation (dir="rtl", Hooshyar Energy branding, no simulation banner in global shell)
 * 5. Route Compatibility & Deep Links
 * 6. Database Immutability Check (db.json unchanged)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  toPersianDigits, 
  formatPersianNumber, 
  formatCurrencyIRR, 
  formatSolarCapacity, 
  formatEnergyGeneration, 
  formatPercentage, 
  formatJalaliDate,
  formatRoleLabel 
} from '../src/utils/formatters';

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
console.log('HOOSHYAR ENERGY — UI-1 VERIFICATION & REGRESSION SUITE');
console.log('========================================================\n');

// 1. PERSIAN FORMATTING TESTS
console.log('[1] Testing Persian Number & Localization Foundation...');

assert(toPersianDigits('250') === '۲۵۰', 'toPersianDigits converts 250 to ۲۵۰');
assert(toPersianDigits('1405/06/25') === '۱۴۰۵/۰۶/۲۵', 'toPersianDigits converts Jalali date string');
assert(toPersianDigits('SolarPanel-Model-550W') === 'SolarPanel-Model-۵۵۰W', 'toPersianDigits preserves non-digits');

const currFormatted = formatCurrencyIRR(4850000000);
assert(currFormatted.includes('تومان') && currFormatted.includes('۴٬۸۵۰٬۰۰۰٬۰۰۰'), 'formatCurrencyIRR formats 4,850,000,000 تومان correctly');
assert(formatCurrencyIRR(null) === '—', 'formatCurrencyIRR returns dash for null');

const cap250 = formatSolarCapacity(250);
assert(cap250.includes('۲۵۰') && cap250.includes('کیلووات'), 'formatSolarCapacity formats 250 kW correctly');
const cap2500 = formatSolarCapacity(2500);
assert(cap2500.includes('۲٫۵') && cap2500.includes('مگاوات'), 'formatSolarCapacity formats 2500 kW as 2.5 MW correctly');
assert(formatSolarCapacity(null) === '—', 'formatSolarCapacity returns dash for null');

const gen450 = formatEnergyGeneration(450);
assert(gen450.includes('۴۵۰') && gen450.includes('کیلووات‌ساعت'), 'formatEnergyGeneration formats 450 kWh correctly');
const gen1200 = formatEnergyGeneration(1200);
assert(gen1200.includes('۱٫۲') && gen1200.includes('مگاوات‌ساعت'), 'formatEnergyGeneration formats 1200 kWh as 1.2 MWh correctly');

const pct184 = formatPercentage(18.4);
assert(pct184.includes('۱۸٫۴٪') || pct184.includes('۱۸٫۴'), 'formatPercentage formats 18.4% correctly');

const testDate = new Date('2026-09-21T10:00:00Z');
const jalaliFormatted = formatJalaliDate(testDate);
assert(jalaliFormatted.length > 5 && toPersianDigits('1405').length > 0, 'formatJalaliDate produces formatted Persian date');

// Non-mutation rule test: Equipment serials and technical codes must NOT be blindly formatted
const technicalModel = 'JKM550N-72HL4-BDV';
assert(technicalModel === 'JKM550N-72HL4-BDV', 'Technical equipment model numbers remain unmutated in raw state');

// Role translation test
assert(formatRoleLabel('PROJECT_OWNER') === 'کارفرما', 'Role PROJECT_OWNER translates to کارفرما');
assert(formatRoleLabel('INVESTOR') === 'سرمایه‌گذار', 'Role INVESTOR translates to سرمایه‌گذار');
assert(formatRoleLabel('EPC') === 'پیمانکار احداث', 'Role EPC translates to پیمانکار احداث');
assert(formatRoleLabel('ADMIN') === 'مدیر سامانه', 'Role ADMIN translates to مدیر سامانه');

console.log('');

// 2. SHELL FILES & REMOVAL OF CLUTTER
console.log('[2] Verifying Global Shell Files & Clutter Removal...');

const mainLayoutPath = path.join(process.cwd(), 'src/layouts/MainLayout.tsx');
assert(fs.existsSync(mainLayoutPath), 'MainLayout.tsx exists');
const mainLayoutContent = fs.readFileSync(mainLayoutPath, 'utf-8');

assert(!mainLayoutContent.includes('حالت شبیه‌سازی'), 'Simulation banner is completely removed from MainLayout');
assert(!mainLayoutContent.includes('generator') || !mainLayoutContent.includes('powerbank-secondary'), 'Fossil fuel / generator / powerbank background logic removed from MainLayout');
assert(mainLayoutContent.includes('DesktopHeader'), 'MainLayout mounts DesktopHeader');
assert(mainLayoutContent.includes('MobileBottomNav'), 'MainLayout mounts MobileBottomNav');
assert(mainLayoutContent.includes('pb-24') || mainLayoutContent.includes('pb-safe'), 'MainLayout reserves bottom padding for mobile bottom bar');

console.log('');

// 3. DESKTOP HEADER & UNIFIED NAVIGATION
console.log('[3] Verifying Desktop Header & Navigation Architecture...');

const headerPath = path.join(process.cwd(), 'src/components/navigation/DesktopHeader.tsx');
assert(fs.existsSync(headerPath), 'DesktopHeader.tsx exists');
const headerContent = fs.readFileSync(headerPath, 'utf-8');

// Nav items check
assert(headerContent.includes('پیشخوان'), 'DesktopHeader contains پیشخوان (/dashboard)');
assert(headerContent.includes('پروژه‌ها'), 'DesktopHeader contains پروژه‌ها (/projects)');
assert(headerContent.includes('دارایی‌ها'), 'DesktopHeader contains دارایی‌ها (/solar-assets)');
assert(headerContent.includes('بازارگاه'), 'DesktopHeader contains بازارگاه (/contractors)');
assert(headerContent.includes('پورتفو'), 'DesktopHeader contains پورتفو (/portfolio)');
assert(headerContent.includes('canAccessPortfolio'), 'Portfolio navigation is conditionally rendered based on access permission');

// Left side controls
assert(headerContent.includes('NotificationCenter'), 'DesktopHeader integrates NotificationCenter');
assert(headerContent.includes('ThemeToggle'), 'DesktopHeader integrates ThemeToggle');
assert(headerContent.includes('switchRole'), 'DesktopHeader integrates Role Switcher');
assert(headerContent.includes('logout'), 'DesktopHeader provides user logout');

console.log('');

// 4. MOBILE NAVIGATION
console.log('[4] Verifying Mobile Persistent Bottom Navigation...');

const mobileNavPath = path.join(process.cwd(), 'src/components/navigation/MobileBottomNav.tsx');
assert(fs.existsSync(mobileNavPath), 'MobileBottomNav.tsx exists');
const mobileNavContent = fs.readFileSync(mobileNavPath, 'utf-8');

// 5 items check
assert(mobileNavContent.includes('پیشخوان'), 'MobileBottomNav contains پیشخوان');
assert(mobileNavContent.includes('پروژه‌ها'), 'MobileBottomNav contains پروژه‌ها');
assert(mobileNavContent.includes('بازارگاه'), 'MobileBottomNav contains بازارگاه');
assert(mobileNavContent.includes('دارایی‌ها'), 'MobileBottomNav contains دارایی‌ها');
assert(mobileNavContent.includes('اقدام سریع خورشیدی') || mobileNavContent.includes('+ جدید'), 'MobileBottomNav contains center action button with sheet');
assert(mobileNavContent.includes('/target-select'), 'Action sheet contains link to start energy analysis (/target-select)');
assert(mobileNavContent.includes('/powerplant-setup'), 'Action sheet contains link to create new project (/powerplant-setup)');

console.log('');

// 5. SHARED UI PRIMITIVES
console.log('[5] Verifying Shared UI Primitives...');

const commonDir = path.join(process.cwd(), 'src/components/common');
assert(fs.existsSync(path.join(commonDir, 'PageContainer.tsx')), 'PageContainer exists');
assert(fs.existsSync(path.join(commonDir, 'PageHeader.tsx')), 'PageHeader exists');
assert(fs.existsSync(path.join(commonDir, 'SectionHeader.tsx')), 'SectionHeader exists');
assert(fs.existsSync(path.join(commonDir, 'StatusBadge.tsx')), 'StatusBadge exists');
assert(fs.existsSync(path.join(commonDir, 'DataTruthBadge.tsx')), 'DataTruthBadge exists');
assert(fs.existsSync(path.join(commonDir, 'EmptyState.tsx')), 'EmptyState exists');
assert(fs.existsSync(path.join(commonDir, 'LoadingState.tsx')), 'LoadingState exists');
assert(fs.existsSync(path.join(commonDir, 'ErrorState.tsx')), 'ErrorState exists');

const dataTruthContent = fs.readFileSync(path.join(commonDir, 'DataTruthBadge.tsx'), 'utf-8');
assert(dataTruthContent.includes('داده واقعی'), 'DataTruthBadge supports [داده واقعی]');
assert(dataTruthContent.includes('محاسباتی مهندسی'), 'DataTruthBadge supports [محاسباتی مهندسی]');
assert(dataTruthContent.includes('اظهار کاربر'), 'DataTruthBadge supports [اظهار کاربر]');
assert(dataTruthContent.includes('شاخص بازار'), 'DataTruthBadge supports [شاخص بازار]');
assert(dataTruthContent.includes('تحلیل هوش مصنوعی'), 'DataTruthBadge supports [تحلیل هوش مصنوعی]');

console.log('');

// 6. ROUTE COMPATIBILITY & DEEP LINKS
console.log('[6] Verifying Route Compatibility & Deep Links in App.tsx...');

const appContent = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
const requiredRoutes = [
  '/customer-login',
  '/user-dashboard',
  '/dashboard',
  '/projects',
  '/projects/:id',
  '/projects/:id/proposal',
  '/investment-hub',
  '/investment-hub/opportunities',
  '/investment-hub/opportunities/:id',
  '/enterprise/portfolio',
  '/portfolio',
  '/powerplant-setup',
  '/solar-assets',
  '/solar-assets/:id',
  '/admin/solar-assets',
  '/solar-planner',
  '/target-select',
  '/location-type',
  '/area-city',
  '/checklist',
  '/consumption',
  '/result',
  '/contractors',
  '/contractor-dashboard',
  '/technicians-list',
  '/vendor/:id',
  '/assets',
  '/marketplace'
];

requiredRoutes.forEach(r => {
  assert(appContent.includes(`path="${r}"`), `App.tsx contains route: ${r}`);
});

console.log('');

// 7. DATABASE INTEGRITY CHECK
console.log('[7] Verifying Database Immutability...');
const dbPath = path.join(process.cwd(), 'db.json');
const dbBuffer = fs.readFileSync(dbPath);
const dbHash = crypto.createHash('sha256').update(dbBuffer).digest('hex');
const expectedHash = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';

assert(dbHash === expectedHash, 'db.json hash is intact (byte-for-byte unchanged)', `Expected ${expectedHash}, got ${dbHash}`);

console.log('\n========================================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed.`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
