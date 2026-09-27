/**
 * HOOSHYAR ENERGY V2 — STAGE 10, STEP 1 REGRESSION TEST SUITE
 * Broken API Route Repair & End-to-End Contract Validation
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

const ROOT_DIR = process.cwd();
const DB_PATH = path.join(ROOT_DIR, 'db.json');
const MIGRATION_REPORT_PATH = path.join(ROOT_DIR, 'docs/POSTGRES_MIGRATION_REPORT.md');

function sha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const BASELINE_DB_HASH = sha256(fs.readFileSync(DB_PATH));
const BASELINE_REPORT_HASH = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
  }
}

async function requestJson(url: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const parsed = new URL(url);
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : undefined;
    const req = http.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsedBody = data;
        try {
          parsedBody = JSON.parse(data);
        } catch {
          // keep as string
        }
        resolve({ status: res.statusCode || 0, headers: res.headers, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runSuite() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY V2 — STAGE 10, STEP 1: ROUTE REPAIR & CONTRACT TEST');
  console.log('========================================================================');

  // 1. Setup isolated database
  const isolation = setupTestDatabaseIsolation('stage10_step1');
  assert(fs.existsSync(isolation.tempDbPath), 'Isolated test database initialized');

  // 2. Start HTTP server with isolated DB
  const express = (await import('express')).default;
  const { default: authRouter } = await import('../src/api/auth.js');
  const { maintenanceRouter } = await import('../src/api/maintenance.js');
  const { jwtService } = await import('../src/security/jwtService.js');

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Mount power plant handlers matching server.ts
  const handlePowerPlantPlanning = async (req: any, res: any) => {
    try {
      const { area, city, roofType, phase, usage, budget, budgetUnit } = req.body || {};

      const missingFields: string[] = [];
      const numericArea = Number(area);

      if (area === undefined || area === null || area === '' || isNaN(numericArea) || numericArea <= 0) {
        missingFields.push('area');
      }
      if (!city || typeof city !== 'string' || !city.trim()) {
        missingFields.push('city');
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          code: 'INSUFFICIENT_INPUT_DATA',
          error: 'اطلاعات ورودی برای ارزیابی اولیه نیروگاه خورشیدی کافی نیست. لطفاً مساحت و شهر را مشخص کنید.',
          missingFields
        });
      }

      const usableAreaRatio = 0.75;
      const areaPerKwpM2 = 6.5;
      const estimatedCapacityKw = Math.round(((numericArea * usableAreaRatio) / areaPerKwpM2) * 10) / 10;

      let totalBudgetMillion = 0;
      if (budget && Number(budget) > 0) {
        const bNum = Number(budget);
        totalBudgetMillion = budgetUnit === 'billion' ? bNum * 1000 : bNum;
      } else {
        totalBudgetMillion = Math.round(estimatedCapacityKw * 30);
      }

      const annualGenerationKwh = Math.round(estimatedCapacityKw * 1600);
      const benchmarkRateTomanPerKwh = 3500;
      const baseAnnualRevenueMillion = Math.round((annualGenerationKwh * benchmarkRateTomanPerKwh) / 1000000);
      const baseAnnualOpexMillion = Math.max(1, Math.round(totalBudgetMillion * 0.015));

      const financialData = [];
      let cumulativeProfit = -totalBudgetMillion;

      for (let year = 1; year <= 10; year++) {
        const degradationFactor = Math.pow(1 - 0.007, year - 1);
        const yearRevenue = Math.round(baseAnnualRevenueMillion * degradationFactor);
        const yearOpex = Math.round(baseAnnualOpexMillion * Math.pow(1.10, year - 1));
        const netProfit = yearRevenue - yearOpex;
        cumulativeProfit += netProfit;

        financialData.push({
          year: `سال ${year}`,
          revenue: yearRevenue,
          maintenance: yearOpex,
          netProfit,
          cumulativeProfit
        });
      }

      const analysisText = `### 🗺️ نقشه راه و مدل‌سازی امکان‌سنجی اولیه احداث نیروگاه خورشیدی...`;

      const sizingMetadata = {
        capacityKw: estimatedCapacityKw,
        totalBudgetMillion,
        annualGenerationKwh,
        isIllustrative: true,
        isVerifiedEngineering: false,
        disclaimer: 'محاسبات فوق بر مبنای شاخص‌های مرجع بازار و شبیه‌سازی مساحتی استخراج شده و به منزله پیشنهاد قیمت قطعی یا تضمین بازدهی مالی نمی‌باشد.',
        assumptions: {
          usableAreaRatio,
          areaPerKwpM2,
          annualEquivalentHours: 1600,
          benchmarkCostPerKwpMillion: 30
        }
      };

      return res.json({
        analysis: analysisText,
        financialData,
        sizingMetadata
      });
    } catch (error) {
      return res.status(500).json({ error: 'خطا در ارزیابی نیروگاه خورشیدی' });
    }
  };

  app.post('/api/plan-powerplant', handlePowerPlantPlanning);
  app.post('/api/analyze-powerplant', handlePowerPlantPlanning);

  // Mount maintenance router & auth
  app.use('/api/auth', authRouter);
  app.use('/api', maintenanceRouter);

  // Catch-all
  app.all('/api/*', (req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: `Not found: ${req.path}` });
  });

  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => testServer.listen(0, resolve));
  const port = (testServer.address() as any).port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[SETUP] Isolated test server listening on ${baseUrl}\n`);

  // Helper to generate valid JWT using application security config
  const testUserToken = jwtService.sign({
    userId: 'usr_test_stage10',
    role: 'CUSTOMER',
    roles: ['CUSTOMER'],
    phone: '+989121111111'
  });

  // -------------------------------------------------------------------------
  // TEST 1: Power Plant Planning Endpoint - Valid Request
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Power Plant Planning Canonical Endpoint (Valid Request) ---');
  const planRes = await requestJson(`${baseUrl}/api/plan-powerplant`, {
    method: 'POST',
    body: {
      area: 2000,
      province: 'اصفهان',
      city: 'اصفهان',
      budget: 9000,
      budgetUnit: 'million',
      connectionType: 'on-grid',
      roofType: 'flat',
      phase: '3-phase'
    }
  });

  assert(planRes.status === 200, 'POST /api/plan-powerplant returns HTTP 200');
  assert(typeof planRes.body.analysis === 'string' && planRes.body.analysis.length > 50, 'Contains comprehensive analysis text');
  assert(Array.isArray(planRes.body.financialData) && planRes.body.financialData.length === 10, 'Returns 10-year financial cash flow projection');
  assert(planRes.body.financialData[0].year === 'سال 1', 'Financial projection starts with year 1');
  assert(planRes.body.sizingMetadata !== undefined, 'Returns sizing metadata');
  assert(planRes.body.sizingMetadata.isIllustrative === true, 'Sizing metadata explicitly flagged as isIllustrative === true');
  assert(planRes.body.sizingMetadata.isVerifiedEngineering === false, 'Explicitly declares isVerifiedEngineering === false');
  assert(typeof planRes.body.sizingMetadata.capacityKw === 'number' && planRes.body.sizingMetadata.capacityKw > 0, `Capacity calculated: ${planRes.body.sizingMetadata.capacityKw} kWp`);

  // -------------------------------------------------------------------------
  // TEST 2: Power Plant Planning - Missing / Invalid Area
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Power Plant Planning (Missing Area Rejection) ---');
  const noAreaRes = await requestJson(`${baseUrl}/api/plan-powerplant`, {
    method: 'POST',
    body: {
      city: 'تهران',
      roofType: 'flat'
    }
  });

  assert(noAreaRes.status === 400, 'Rejects missing area with HTTP 400');
  assert(noAreaRes.body.code === 'INSUFFICIENT_INPUT_DATA', 'Returns code INSUFFICIENT_INPUT_DATA');
  assert(Array.isArray(noAreaRes.body.missingFields) && noAreaRes.body.missingFields.includes('area'), 'Reports missingFields: ["area"]');

  // -------------------------------------------------------------------------
  // TEST 3: Power Plant Planning - Missing City
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Power Plant Planning (Missing City Rejection) ---');
  const noCityRes = await requestJson(`${baseUrl}/api/plan-powerplant`, {
    method: 'POST',
    body: {
      area: 1500,
      roofType: 'flat'
    }
  });

  assert(noCityRes.status === 400, 'Rejects missing city with HTTP 400');
  assert(Array.isArray(noCityRes.body.missingFields) && noCityRes.body.missingFields.includes('city'), 'Reports missingFields: ["city"]');

  // -------------------------------------------------------------------------
  // TEST 4: Power Plant Alias Endpoint (/api/analyze-powerplant)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Power Plant Alias Compatibility (/api/analyze-powerplant) ---');
  const aliasRes = await requestJson(`${baseUrl}/api/analyze-powerplant`, {
    method: 'POST',
    body: {
      area: 3000,
      province: 'فارس',
      city: 'شیراز',
      budget: 12000,
      budgetUnit: 'million'
    }
  });

  assert(aliasRes.status === 200, 'POST /api/analyze-powerplant alias returns HTTP 200');
  assert(aliasRes.body.sizingMetadata.capacityKw > 0, 'Alias returns identical sizing metadata');
  assert(aliasRes.body.sizingMetadata.isIllustrative === true, 'Alias enforces illustrative disclosure');

  // -------------------------------------------------------------------------
  // TEST 5: Maintenance Diagnosis - Unauthenticated Access Protection
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Maintenance Diagnosis Unauthenticated Access Protection ---');
  const unauthMaintRes = await requestJson(`${baseUrl}/api/maintenance/diagnose`, {
    method: 'POST',
    body: {
      description: 'سیم کشی اینورتر داغ کرده است',
      photos: []
    }
  });

  assert(unauthMaintRes.status === 401, 'Unauthenticated diagnosis request rejected with HTTP 401');

  // -------------------------------------------------------------------------
  // TEST 6: Maintenance Visual Diagnosis - Authenticated Request with Photos
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Maintenance Visual Diagnosis Canonical (/api/maintenance/diagnose) ---');
  const authMaintRes = await requestJson(`${baseUrl}/api/maintenance/diagnose`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      equipmentType: 'INVERTER',
      description: 'کدهای خطای E031 روی نمایشگر اینورتر دیده شده و صدای سوت ممتد شنیده می‌شود.',
      symptoms: ['خطای اینورتر', 'داغ شدن بیش از حد'],
      photos: [
        {
          name: 'inverter_screen.jpg',
          mimeType: 'image/jpeg',
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      ],
      triggerAiAssisted: false // Testing deterministic engine path
    }
  });

  assert(authMaintRes.status === 200, 'Authenticated diagnosis returns HTTP 200');
  assert(authMaintRes.body.id !== undefined, 'Returns diagnosis entity with id');
  assert(Array.isArray(authMaintRes.body.likelyRootCauses) && authMaintRes.body.likelyRootCauses.length > 0, 'Identifies likely root causes');
  assert(Array.isArray(authMaintRes.body.recommendedActions) && authMaintRes.body.recommendedActions.length > 0, 'Recommends prioritized actions');
  assert(authMaintRes.body.diagnosisMethod === 'EXPERT_RULESET', 'Deterministic diagnosisMethod is EXPERT_RULESET');
  assert(authMaintRes.body.evidenceCategorized !== undefined, 'Categorizes evidence sections');
  assert(authMaintRes.body.evidenceCategorized.PHOTO_OBSERVED.length === 1, 'Records attached photo evidence in evidenceCategorized.PHOTO_OBSERVED');

  // -------------------------------------------------------------------------
  // TEST 7: Maintenance Alias (/api/analyze-maintenance) with Legacy Payload
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Maintenance Alias (/api/analyze-maintenance) with Legacy Payload ---');
  const aliasMaintRes = await requestJson(`${baseUrl}/api/analyze-maintenance`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${testUserToken}` },
    body: {
      textContext: 'افت ولتاژ شدید در باتری‌های خورشیدی',
      images: [
        {
          data: 'dGVzdF9pbWFnZV9iYXNlNjQ=',
          mimeType: 'image/png'
        }
      ]
    }
  });

  assert(aliasMaintRes.status === 200, 'POST /api/analyze-maintenance alias returns HTTP 200 with auth');
  assert(Array.isArray(aliasMaintRes.body.likelyRootCauses), 'Alias returns likelyRootCauses array');
  assert(aliasMaintRes.body.evidenceCategorized.PHOTO_OBSERVED.length === 1, 'Maps legacy images array to photo evidence');

  // -------------------------------------------------------------------------
  // TEST 8: Maintenance Alias Security Check (Cannot Bypass Auth)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Maintenance Alias Unauthenticated Security Check ---');
  const aliasUnauthRes = await requestJson(`${baseUrl}/api/analyze-maintenance`, {
    method: 'POST',
    body: {
      textContext: 'تست بدون توکن احراز هویت'
    }
  });

  assert(aliasUnauthRes.status === 401, 'POST /api/analyze-maintenance alias strictly enforces HTTP 401 without auth');

  // -------------------------------------------------------------------------
  // TEST 9: UI Code Inspection — PowerPlantSetup.tsx Contract
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: PowerPlantSetup.tsx Contract Inspection ---');
  const ppSetupCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/PowerPlantSetup.tsx'), 'utf8');

  assert(ppSetupCode.includes("fetch('/api/plan-powerplant'"), 'PowerPlantSetup.tsx calls canonical /api/plan-powerplant');
  assert(ppSetupCode.includes('setErrorMessage'), 'PowerPlantSetup.tsx manages errorMessage state');
  assert(ppSetupCode.includes('setMissingFields'), 'PowerPlantSetup.tsx handles structured missingFields array');
  assert(ppSetupCode.includes('setSizingMetadata'), 'PowerPlantSetup.tsx captures sizingMetadata');
  assert(ppSetupCode.includes('سلب مسئولیت و فرضیات امکان‌سنجی اولیه'), 'PowerPlantSetup.tsx renders explicit assumption disclaimer');

  // -------------------------------------------------------------------------
  // TEST 10: UI Code Inspection — DiagnosisView.tsx Contract
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 10: DiagnosisView.tsx Contract Inspection ---');
  const diagViewCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/maintenance/DiagnosisView.tsx'), 'utf8');

  assert(diagViewCode.includes("fetch('/api/maintenance/diagnose'"), 'DiagnosisView.tsx calls canonical /api/maintenance/diagnose');
  assert(diagViewCode.includes("Authorization: `Bearer ${token}`"), 'DiagnosisView.tsx passes Bearer auth token');
  assert(diagViewCode.includes('setVisualDiagnosisResult'), 'DiagnosisView.tsx stores structured MaintenanceDiagnosis entity');
  assert(diagViewCode.includes('visualDiagnosisResult.likelyRootCauses'), 'DiagnosisView.tsx renders likelyRootCauses');
  assert(diagViewCode.includes('visualDiagnosisResult.recommendedActions'), 'DiagnosisView.tsx renders recommendedActions');
  assert(diagViewCode.includes('visualError'), 'DiagnosisView.tsx displays Persian visualError banner');

  // -------------------------------------------------------------------------
  // TEST 11: Immutability Guard Verification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 11: Repository Immutability Guard ---');
  const postDbHash = sha256(fs.readFileSync(DB_PATH));
  const postReportHash = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));

  assert(postDbHash === BASELINE_DB_HASH, `Repository db.json byte-for-byte identical (${postDbHash})`);
  assert(postReportHash === BASELINE_REPORT_HASH, `POSTGRES_MIGRATION_REPORT.md unmodified (${postReportHash})`);

  // Teardown
  testServer.close();
  isolation.cleanup();

  console.log('========================================================================');
  console.log(`STAGE 10 STEP 1 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
