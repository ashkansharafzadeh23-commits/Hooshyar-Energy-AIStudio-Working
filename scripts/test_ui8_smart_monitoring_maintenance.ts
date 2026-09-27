import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const ROOT_DIR = process.cwd();
const BASELINE_DB_HASH = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';
const BASELINE_REPORT_HASH = '50814eac6cd752d801f35f23d98d2c45db61cfc1cc91dc080792a69f79867afb';

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

function getFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

console.log('========================================================================');
console.log('HOOSHYAR ENERGY — UI-8 SMART MONITORING & OPERATIONS DATA-TRUTH TEST');
console.log('========================================================================');

const initialDbHash = getFileHash(path.join(ROOT_DIR, 'db.json'));
assert(initialDbHash === BASELINE_DB_HASH, `Initial db.json hash matches baseline (${BASELINE_DB_HASH})`);

const reportPath = path.join(ROOT_DIR, 'docs', 'POSTGRES_MIGRATION_REPORT.md');
const initialReportHash = getFileHash(reportPath);
assert(initialReportHash === BASELINE_REPORT_HASH, `Initial POSTGRES_MIGRATION_REPORT.md hash matches baseline (${BASELINE_REPORT_HASH})`);

// [1] Component Architecture
console.log('\n[1] Testing Component Architecture in src/components/operations/...');
const operationsFiles = [
  'OperationsNavigation.tsx',
  'MonitoringConnectionStatus.tsx',
  'TelemetrySourceCard.tsx',
  'TelemetrySourceList.tsx',
  'TelemetryMetricCard.tsx',
  'TelemetryChart.tsx',
  'TelemetryTimeRangeSelector.tsx',
  'TelemetryEmptyState.tsx',
  'DataFreshnessIndicator.tsx',
  'OperationalHealthCard.tsx',
  'AlertCard.tsx',
  'AlertDetails.tsx',
  'AlertEmptyState.tsx',
  'AnomalyCard.tsx',
  'AnomalyEvidence.tsx',
  'AnomalyDiagnosis.tsx',
  'AlertCenter.tsx',
  'MaintenanceTimeline.tsx',
  'MaintenanceEmptyState.tsx',
  'MaintenanceCaseCard.tsx',
  'MaintenanceCaseDetails.tsx',
  'TechnicianMatchCard.tsx',
  'TechnicianMatchList.tsx',
  'TechnicianAssignmentReview.tsx',
  'MaintenanceCenter.tsx',
  'AssetMaintenanceHistory.tsx',
  'AssetOperationsOverview.tsx',
  'OperationsEmptyState.tsx',
  'AssetOperationsWorkspace.tsx',
  'index.ts'
];

operationsFiles.forEach(file => {
  const fullPath = path.join(ROOT_DIR, 'src/components/operations', file);
  assert(fs.existsSync(fullPath), `Operations component exists: ${file}`);
});

// [2] Data-Truth Principle in Monitoring & Telemetry
console.log('\n[2] Testing Data-Truth Principle in Monitoring & Telemetry...');
const monitoringStatusContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/MonitoringConnectionStatus.tsx'), 'utf-8');
assert(monitoringStatusContent.includes('پایش برخط هنوز فعال نشده است'), 'Truthful unconfigured monitoring state');
assert(monitoringStatusContent.includes('برای این دارایی هنوز منبع داده پایش برخط ثبت یا تأیید نشده است'), 'Truthful unconfigured explanation');
assert(monitoringStatusContent.includes('وضعیت اتصال منبع پایش مشخص نیست'), 'Truthful unknown connection state');

const emptyTelemetryContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/TelemetryEmptyState.tsx'), 'utf-8');
assert(emptyTelemetryContent.includes('داده کافی برای نمایش نمودار وجود ندارد'), 'Truthful empty chart message');
assert(emptyTelemetryContent.includes('برای نمایش داده‌های عملیاتی، ابتدا منبع پایش نیروگاه باید متصل شود'), 'Truthful source required message');

const metricCardContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/TelemetryMetricCard.tsx'), 'utf-8');
assert(metricCardContent.includes('داده در دسترس نیست'), 'Metric card renders truthful missing state instead of fake zero');

// [3] Telemetry Source Transparency
console.log('\n[3] Testing Telemetry Source Transparency...');
const sourceCardContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/TelemetrySourceCard.tsx'), 'utf-8');
assert(sourceCardContent.includes('پروتکل ثبت نشده است'), 'Protocol fallback is truthful, not fabricated Modbus');
assert(!sourceCardContent.includes('Modbus TCP/IP'), 'No hardcoded fake Modbus protocol');

// [4] Data Freshness Classifications & Elimination of Invented Thresholds
console.log('\n[4] Testing Data Freshness Classifications & Elimination of Invented Thresholds...');
const freshnessContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/DataFreshnessIndicator.tsx'), 'utf-8');

// Strict anti-fabrication assertions for freshness:
assert(!freshnessContent.includes('Date.now()'), 'NO Date.now() in DataFreshnessIndicator (no invented freshness clock)');
assert(!freshnessContent.includes('diffHours <= 1'), 'NO hardcoded 1-hour freshness threshold');
assert(!freshnessContent.includes('|| 24'), 'NO arbitrary 24-hour fallback threshold');
assert(!freshnessContent.includes('diffHours'), 'NO timestamp-arithmetic classification in frontend');

// Authoritative classification support
assert(freshnessContent.includes('داده زنده و همگام'), 'Supports authoritative CONNECTED badge');
assert(freshnessContent.includes('تأخیر در دریافت داده'), 'Supports authoritative DEGRADED badge');
assert(freshnessContent.includes('داده متوقف / فاقد تله‌متری'), 'Supports authoritative STALE badge');
assert(freshnessContent.includes('داده تستی شبیه‌سازی‌شده'), 'Explicitly flags test/synthetic data');
assert(freshnessContent.includes('داده تله‌متری ثبت نشده است'), 'Truthful no-telemetry badge when missing');
assert(freshnessContent.includes('تازگی داده قابل ارزیابی نیست'), 'Truthful unknown badge when classification is missing');

// [5] Operational Health & Alerts Truthfulness
console.log('\n[5] Testing Operational Health & Alerts Truthfulness...');
const alertEmptyContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/AlertEmptyState.tsx'), 'utf-8');
assert(alertEmptyContent.includes('هشدار ثبت‌شده‌ای برای این بازه نمایش داده نمی‌شود'), 'Truthful empty alert message (not "سیستم هیچ مشکلی ندارد")');
assert(!alertEmptyContent.includes('نیروگاه هیچ مشکلی ندارد'), 'Does NOT claim zero problems when alert list is empty');

const anomalyCardContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/AnomalyCard.tsx'), 'utf-8');
assert(anomalyCardContent.includes('مشاهده ثبت‌شده:'), 'Anomaly headline explicitly states observed fact');
assert(anomalyCardContent.includes('بر اساس داده‌های موجود، این وضعیت می‌تواند نیازمند بررسی باشد'), 'Truthful anomaly interpretation wording');
assert(!anomalyCardContent.includes('اینورتر خراب است'), 'Does not claim definite equipment failure without verified evidence');

// [6] Maintenance Center & Technician Matching Truthfulness
console.log('\n[6] Testing Maintenance Center & Technician Matching Truthfulness...');
const maintenanceEmptyContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/MaintenanceEmptyState.tsx'), 'utf-8');
assert(maintenanceEmptyContent.includes('پرونده تعمیراتی ثبت‌شده‌ای برای این دارایی وجود ندارد'), 'Truthful empty maintenance state');

const matchCardContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/TechnicianMatchCard.tsx'), 'utf-8');
assert(!matchCardContent.includes('بهترین تکنسین'), 'Does not claim subjective "بهترین تکنسین"');
assert(matchCardContent.includes('معیارهای انطباق ثبت‌شده:'), 'Factual match criteria heading');

const matchListContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/TechnicianMatchList.tsx'), 'utf-8');
assert(matchListContent.includes('تکنسین‌های پیشنهادی بر اساس معیارهای ثبت‌شده'), 'Truthful list title');

const maintenanceCaseContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/MaintenanceCaseCard.tsx'), 'utf-8');
assert(maintenanceCaseContent.includes('هزینه ثبت نشده است'), 'Truthful missing cost phrasing (never 0 or رایگان)');
assert(maintenanceCaseContent.includes('تکنسین تخصیص داده نشده است'), 'Truthful missing technician phrasing');

const historyContent = fs.readFileSync(path.join(ROOT_DIR, 'src/components/operations/AssetMaintenanceHistory.tsx'), 'utf-8');
assert(historyContent.includes('نتیجه تعمیر ثبت نشده است'), 'Truthful missing resolution phrasing');
assert(historyContent.includes('سابقه نگهداری ثبت‌شده‌ای برای این دارایی وجود ندارد'), 'Truthful empty history message');

// [7] Technician Dashboard Refactoring Verification
console.log('\n[7] Testing Technician Dashboard Refactoring...');
const techDashboardContent = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/technician/Dashboard.tsx'), 'utf-8');
assert(!techDashboardContent.includes('mockRequests'), 'All hardcoded mockRequests removed from Dashboard.tsx');
assert(!techDashboardContent.includes('شرکت آریان مهر'), 'Fake customer removed');
assert(!techDashboardContent.includes('۱۲,۵۰۰,۰۰۰'), 'Hardcoded fake income removed');
assert(techDashboardContent.includes('/api/technician/cases'), 'Fetches real maintenance cases from API');

// [8] Integration in SolarAssetDetail
console.log('\n[8] Testing SolarAssetDetail Integration...');
const assetDetailContent = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/solar-assets/AssetDetail.tsx'), 'utf-8');
assert(assetDetailContent.includes('AssetOperationsWorkspace'), 'AssetOperationsWorkspace integrated into SolarAssetDetail');
assert(assetDetailContent.includes('مرکز عملیات و پایش (Operations Center)'), 'Operations switcher integrated');
assert(assetDetailContent.includes('شناسنامه فنی دارایی (Asset Passport)'), 'Asset Passport switcher preserved');

// [9] Backend Security & Authorization of /api/technician/cases
console.log('\n[9] Testing Backend Security & Authorization of /api/technician/cases in maintenance.ts...');
const maintenanceApiContent = fs.readFileSync(path.join(ROOT_DIR, 'src/api/maintenance.ts'), 'utf-8');

assert(maintenanceApiContent.includes("maintenanceRouter.get('/technician/cases'"), 'Technician cases endpoint exists');
assert(maintenanceApiContent.includes("isTechRole"), 'Technician role check enforced');
assert(maintenanceApiContent.includes("!isAdmin && !isTechRole"), 'Non-technicians blocked with 403');
assert(!maintenanceApiContent.includes("['admin', 'manager', 'developer'].includes(userRole)"), 'NO blanket global access for manager/developer');
assert(!maintenanceApiContent.includes("(!c.assignedTechnicianId && c.status === 'REPORTED')"), 'NO global unassigned-case exposure');
assert(maintenanceApiContent.includes("c.assignedTechnicianId === userId"), 'Technician can ONLY view explicitly assigned cases');

// [10] Live Runtime API Authorization & IDOR Tests for /api/technician/cases
console.log('\n[10] Running Live Runtime API Authorization & IDOR Tests...');

async function runLiveSecurityTests() {
  const { maintenanceRouter } = await import('../src/api/maintenance.js');
  const { jwtService } = await import('../src/security/jwtService.js');
  
  const app = express();
  app.use(express.json());
  app.use('/api', maintenanceRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api/technician/cases`;

  try {
    // 1. Unauthenticated request -> 401
    const res1 = await fetch(baseUrl);
    assert(res1.status === 401, 'Unauthenticated request to /api/technician/cases rejected with 401');

    // 2. Non-technician user (e.g. investor) -> 403
    const investorToken = jwtService.sign({ userId: 'usr-investor-001', role: 'investor' });
    const res2 = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${investorToken}` }
    });
    assert(res2.status === 403, 'Non-technician user rejected with 403 Forbidden');

    // Manager without tech/admin role -> 403
    const managerToken = jwtService.sign({ userId: 'usr-manager-001', role: 'manager' });
    const res2b = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(res2b.status === 403, 'Manager without tech/admin role rejected with 403 Forbidden');

    // Developer without tech/admin role -> 403
    const devToken = jwtService.sign({ userId: 'usr-dev-001', role: 'developer' });
    const res2c = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${devToken}` }
    });
    assert(res2c.status === 403, 'Developer without tech/admin role rejected with 403 Forbidden');

    // 3. Technician A only sees cases explicitly assigned to Tech A (NOT Tech B, NOT unassigned, NOT cross-project)
    const techAToken = jwtService.sign({ userId: 'tech-user-alice', role: 'technician' });
    const res3 = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${techAToken}` }
    });
    assert(res3.status === 200, 'Authorized technician request succeeds with 200');
    const cases3 = await res3.json();
    assert(Array.isArray(cases3), 'Returns array of cases');
    const hasUnassignedOrOther = cases3.some((c: any) => c.assignedTechnicianId !== 'tech-user-alice');
    assert(!hasUnassignedOrOther, 'Technician A CANNOT view Technician B cases or unassigned cases (No IDOR / No Cross-project leakage)');

    // 4. Admin sees authoritative case list
    const adminToken = jwtService.sign({ userId: 'usr-admin-root', role: 'admin' });
    const res4 = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(res4.status === 200, 'Authorized admin request succeeds with 200');
    const cases4 = await res4.json();
    assert(Array.isArray(cases4), 'Admin retrieves authoritative case list');

  } finally {
    server.close();
  }
}

await runLiveSecurityTests();

// [11] Database and Migration Report Immutability Guard
console.log('\n[11] Checking Immutability of db.json & POSTGRES_MIGRATION_REPORT.md...');
const finalDbHash = getFileHash(path.join(ROOT_DIR, 'db.json'));
assert(finalDbHash === BASELINE_DB_HASH, `Final db.json hash matches baseline (${BASELINE_DB_HASH})`);

const finalReportHash = getFileHash(reportPath);
assert(finalReportHash === BASELINE_REPORT_HASH, `Final POSTGRES_MIGRATION_REPORT.md hash matches baseline (${BASELINE_REPORT_HASH})`);

console.log('\n========================================================');
console.log(`UI-8 TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
}
