import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { db } from '../src/db/index.js';
import projectsRouter from '../src/api/projects.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { getSecurityConfig } from '../src/security/config.js';
import { runRuleEngine } from '../api/analyze.js';

const JWT_SECRET = getSecurityConfig().jwt.secret;

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function request(
  serverUrl: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: any,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${serverUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

async function runTestSuite() {
  console.log('=== Starting UI-4 Solar Project Onboarding & Energy Analysis Experience Test Suite ===\n');

  const isolation = setupTestDatabaseIsolation('ui4_analysis_experience');
  console.log('[ISOLATION] Test database isolated successfully from repo db.json');

  const app = express();
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());

  // Mount projectsRouter
  app.use('/api/projects', projectsRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const serverUrl = `http://localhost:${port}`;

  try {
    // -------------------------------------------------------------
    // Test 1: Entry Experience — Verify No Fake Statistics or Testimonials
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Entry Experience Integrity Check ---');
    const welcomeFilePath = path.resolve(process.cwd(), 'src/components/analysis/AnalysisWelcome.tsx');
    assert(fs.existsSync(welcomeFilePath), 'src/components/analysis/AnalysisWelcome.tsx exists');
    const welcomeContent = fs.readFileSync(welcomeFilePath, 'utf-8');

    // Must NOT contain fake statistics or fake testimonials
    assert(!welcomeContent.includes('10,000+') && !welcomeContent.includes('۵۰۰۰+'), 'No fake user count statistics on entry screen');
    assert(!welcomeContent.includes('رضایت ۹۹٪') && !welcomeContent.includes('99% satisfaction'), 'No fake satisfaction rates');
    assert(!welcomeContent.includes('مگاوات تحلیل‌شده') && !welcomeContent.includes('MW analyzed'), 'No fake MW analyzed numbers');
    assert(welcomeContent.includes('نیاز انرژی خود را بررسی کنید'), 'Entry experience has primary Persian title');
    assert(welcomeContent.includes('شروع تحلیل'), 'Entry experience has primary CTA');

    // -------------------------------------------------------------
    // Test 2: Persian Typography and RTL Layout Attributes
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Persian Typography and Layout Constraints ---');
    const layoutFilePath = path.resolve(process.cwd(), 'src/components/analysis/AnalysisStepLayout.tsx');
    assert(fs.existsSync(layoutFilePath), 'src/components/analysis/AnalysisStepLayout.tsx exists');
    const layoutContent = fs.readFileSync(layoutFilePath, 'utf-8');
    assert(layoutContent.includes('dir="rtl"') || layoutContent.includes("dir='rtl'") || layoutContent.includes('rtl'), 'Step layout supports RTL direction');
    assert(layoutContent.includes('مرحله'), 'Step indicator shows step progression');

    // -------------------------------------------------------------
    // Test 3: Usage Type Selection & Non-Exposed Enum Values
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Usage Type Selection ---');
    const usageTypeFilePath = path.resolve(process.cwd(), 'src/components/analysis/UsageTypeSelector.tsx');
    assert(fs.existsSync(usageTypeFilePath), 'src/components/analysis/UsageTypeSelector.tsx exists');
    const usageTypeContent = fs.readFileSync(usageTypeFilePath, 'utf-8');
    assert(usageTypeContent.includes('مسکونی'), 'Usage selector includes residential option');
    assert(usageTypeContent.includes('تجاری'), 'Usage selector includes commercial option');
    assert(usageTypeContent.includes('صنعتی'), 'Usage selector includes industrial option');
    assert(usageTypeContent.includes('کشاورزی'), 'Usage selector includes agricultural option');

    // -------------------------------------------------------------
    // Test 4: Location Step Captures Province & City with Truthful NASA Context
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Location Step Data Provenance ---');
    const locationStepFilePath = path.resolve(process.cwd(), 'src/components/analysis/LocationStep.tsx');
    assert(fs.existsSync(locationStepFilePath), 'src/components/analysis/LocationStep.tsx exists');
    const locationStepContent = fs.readFileSync(locationStepFilePath, 'utf-8');
    assert(locationStepContent.includes('استان'), 'Location step has province selection');
    assert(locationStepContent.includes('شهر'), 'Location step has city selection');
    assert(locationStepContent.includes('تابش خورشیدی'), 'Location step explains solar irradiance purpose');

    // -------------------------------------------------------------
    // Test 5: Consumption Input Validation & Clear Units
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Consumption Input Validation ---');
    const consumptionStepFilePath = path.resolve(process.cwd(), 'src/components/analysis/ConsumptionStep.tsx');
    assert(fs.existsSync(consumptionStepFilePath), 'src/components/analysis/ConsumptionStep.tsx exists');
    const consumptionStepContent = fs.readFileSync(consumptionStepFilePath, 'utf-8');
    assert(consumptionStepContent.includes('کیلووات‌ساعت در ماه') || consumptionStepContent.includes('کیلووات‌ساعت'), 'Consumption step clearly displays kWh/month unit');
    assert(consumptionStepContent.includes('مصرف دوره') || consumptionStepContent.includes('قبض'), 'Consumption step provides bill helper guidance');

    // -------------------------------------------------------------
    // Test 6: Site Details Step & Collapsible Advanced Parameters
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Site Details Step ---');
    const siteStepFilePath = path.resolve(process.cwd(), 'src/components/analysis/SiteDetailsStep.tsx');
    assert(fs.existsSync(siteStepFilePath), 'src/components/analysis/SiteDetailsStep.tsx exists');
    const siteStepContent = fs.readFileSync(siteStepFilePath, 'utf-8');
    assert(siteStepContent.includes('پشت‌بام') || siteStepContent.includes('زمین'), 'Site step includes rooftop/ground options');
    assert(siteStepContent.includes('تنظیمات پیشرفته'), 'Advanced parameters are categorized under collapsible section');

    // -------------------------------------------------------------
    // Test 7: Analysis Goal Step
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Analysis Goal Step ---');
    const goalStepFilePath = path.resolve(process.cwd(), 'src/components/analysis/AnalysisGoalStep.tsx');
    assert(fs.existsSync(goalStepFilePath), 'src/components/analysis/AnalysisGoalStep.tsx exists');
    const goalStepContent = fs.readFileSync(goalStepFilePath, 'utf-8');
    assert(goalStepContent.includes('هدف اصلی'), 'Goal step prompts user intent');

    // -------------------------------------------------------------
    // Test 8: Engineering Calculation Engine Integration & Solar Rule Engine
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Solar Rule Engine Deterministic Execution ---');
    const testInput = {
      targets: ['solar'],
      locationType: 'residential',
      city: 'تهران',
      province: 'تهران',
      area: 120,
      usableArea: 80,
      actualMonthlyKwh: 450,
      appliances: []
    };
    const engineRes: any = await runRuleEngine(testInput);
    assert(!engineRes.error, 'Deterministic rule engine completes without error for solar profile');
    assert(engineRes.engineResult.solar.finalKwp > 0, `Solar capacity computed: ${engineRes.engineResult.solar.finalKwp} kWp`);
    const panelCount = engineRes.engineResult.solar.panelOptions?.default?.panelCount || engineRes.engineResult.solar.panelCount;
    assert(panelCount > 0, `Solar panel count computed: ${panelCount}`);
    assert(engineRes.engineResult.dataSource !== undefined, 'Data source information present in engine result');

    // -------------------------------------------------------------
    // Test 9: Executive Summary Component Answers 6 Core Questions
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Executive Summary Component Requirements ---');
    const execSummaryFilePath = path.resolve(process.cwd(), 'src/components/analysis/AnalysisExecutiveSummary.tsx');
    assert(fs.existsSync(execSummaryFilePath), 'src/components/analysis/AnalysisExecutiveSummary.tsx exists');
    const execSummaryContent = fs.readFileSync(execSummaryFilePath, 'utf-8');
    assert(execSummaryContent.includes('ظرفیت پیشنهادی'), 'Executive summary answers recommended capacity');
    assert(execSummaryContent.includes('پنل'), 'Executive summary answers approximate panel count');
    assert(execSummaryContent.includes('تولید') || execSummaryContent.includes('تولید تقریبی'), 'Executive summary answers annual generation');
    assert(execSummaryContent.includes('فضای') || execSummaryContent.includes('متر مربع'), 'Executive summary answers required area');
    assert(execSummaryContent.includes('اطلاعات کافی موجود نیست'), 'Handles missing values gracefully without defaulting to zero');

    // -------------------------------------------------------------
    // Test 10: DataTruthBadge Provenance Integration
    // -------------------------------------------------------------
    console.log('\n--- Test 10: DataTruthBadge Provenance Classifications ---');
    const badgeFilePath = path.resolve(process.cwd(), 'src/components/common/DataTruthBadge.tsx');
    const badgeContent = fs.readFileSync(badgeFilePath, 'utf-8');
    assert(badgeContent.includes('VERIFIED_SOURCE'), 'DataTruthBadge supports VERIFIED_SOURCE');
    assert(badgeContent.includes('REFERENCE_ESTIMATE'), 'DataTruthBadge supports REFERENCE_ESTIMATE');
    assert(badgeContent.includes('CALCULATED'), 'DataTruthBadge supports CALCULATED');
    assert(badgeContent.includes('USER_PROVIDED'), 'DataTruthBadge supports USER_PROVIDED');
    assert(badgeContent.includes('MISSING'), 'DataTruthBadge supports MISSING');

    // -------------------------------------------------------------
    // Test 11: Engineering Details Expandable Section
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Engineering Details Component ---');
    const engDetailsFilePath = path.resolve(process.cwd(), 'src/components/analysis/EngineeringDetails.tsx');
    assert(fs.existsSync(engDetailsFilePath), 'src/components/analysis/EngineeringDetails.tsx exists');
    const engDetailsContent = fs.readFileSync(engDetailsFilePath, 'utf-8');
    assert(engDetailsContent.includes('جزئیات فنی'), 'Engineering details component has expandable header');

    // -------------------------------------------------------------
    // Test 12: Solar Resource Component Shows Truthful Status
    // -------------------------------------------------------------
    console.log('\n--- Test 12: Solar Resource Component ---');
    const solarResourceFilePath = path.resolve(process.cwd(), 'src/components/analysis/SolarDataSource.tsx');
    assert(fs.existsSync(solarResourceFilePath), 'src/components/analysis/SolarDataSource.tsx exists');
    const solarResourceContent = fs.readFileSync(solarResourceFilePath, 'utf-8');
    assert(solarResourceContent.includes('منبع داده خورشیدی'), 'Solar data source component provides clear provenance card');

    // -------------------------------------------------------------
    // Test 13: Financial Overview Distinguishes Inputs vs Calculations
    // -------------------------------------------------------------
    console.log('\n--- Test 13: Financial Overview Component ---');
    const finOverviewFilePath = path.resolve(process.cwd(), 'src/components/analysis/FinancialOverview.tsx');
    assert(fs.existsSync(finOverviewFilePath), 'src/components/analysis/FinancialOverview.tsx exists');
    const finOverviewContent = fs.readFileSync(finOverviewFilePath, 'utf-8');
    assert(finOverviewContent.includes('داده ورودی') || finOverviewContent.includes('فرض محاسباتی'), 'Distinguishes input data from computational assumptions');
    assert(finOverviewContent.includes('اطلاعات مالی بیشتری مورد نیاز است'), 'Truthfully discloses when deeper financial inputs are needed');

    // -------------------------------------------------------------
    // Test 14: Conversion from Analysis to EnergyProject Backend API Linkage
    // -------------------------------------------------------------
    console.log('\n--- Test 14: Project Conversion API Linkage ---');
    // Prepare a mock customer user and an analysis record in the isolated DB
    const testUserId = 'test_owner_' + Date.now();
    const token = jwt.sign(
      { id: testUserId, email: 'test_owner@hooshyar.energy', role: 'customer', roles: ['PROJECT_OWNER'] },
      JWT_SECRET
    );

    const createdHistory = db.addHistory({
      userId: testUserId,
      input: {
        targets: ['solar'],
        locationType: 'residential',
        city: 'اصفهان',
        province: 'اصفهان',
        area: 150,
        usableArea: 100,
        gridConnected: true,
        gridStable: true
      },
      resultSummary: 'تحلیل نیروگاه خورشیدی ۵ کیلووات مسکونی',
      fullResult: {
        estimatedTotalCost: 1800000000,
        engineResult: {
          dailyConsumptionEstimate: { monthlyKwh: 420 },
          solar: {
            finalKwp: 5.2,
            panelCount: 10,
            estimatedTotalCost: 1800000000
          }
        }
      }
    });

    assert(createdHistory && createdHistory.id, 'Analysis record created in isolated test DB');

    // Call /api/projects/from-analysis/:analysisId
    const convertRes = await request(
      serverUrl,
      'POST',
      `/api/projects/from-analysis/${createdHistory.id}`,
      {},
      token
    );

    assert(convertRes.status === 200, `POST /api/projects/from-analysis returned 200 (Got: ${convertRes.status})`);
    const project = convertRes.body;
    assert(project.id !== undefined, 'Created project has valid id');
    assert(project.projectCode && (project.projectCode.startsWith('HSE-') || project.projectCode.startsWith('PRJ-')), `Project has valid business code: ${project.projectCode}`);
    assert(project.sourceAnalysisId === createdHistory.id, `Project sourceAnalysisId properly linked to ${createdHistory.id}`);
    assert(project.targetCapacityKw === 5.2, `Target capacity preserved accurately: ${project.targetCapacityKw} kW`);
    assert(project.location.city === 'اصفهان', `Project city accurately preserved: ${project.location.city}`);
    assert(project.site.usableAreaM2 === 100, `Project usable area accurately preserved: ${project.site.usableAreaM2}`);

    // Verify Analysis record in DB now references projectId
    const updatedHistory = db.getAnalysisHistoryById(createdHistory.id);
    assert(updatedHistory && updatedHistory.projectId === project.id, 'AnalysisHistory record updated with projectId linkage');

    // -------------------------------------------------------------
    // Test 15: Error States Graceful Handling
    // -------------------------------------------------------------
    console.log('\n--- Test 15: Error and Missing Data States ---');
    const errorStateFilePath = path.resolve(process.cwd(), 'src/components/analysis/AnalysisErrorState.tsx');
    assert(fs.existsSync(errorStateFilePath), 'src/components/analysis/AnalysisErrorState.tsx exists');
    const errorStateContent = fs.readFileSync(errorStateFilePath, 'utf-8');
    assert(errorStateContent.includes('خطا') || errorStateContent.includes('تلاش مجدد'), 'Error state provides user-friendly retry mechanism');

    // -------------------------------------------------------------
    // Test 16: Mobile-First Responsive Constraints
    // -------------------------------------------------------------
    console.log('\n--- Test 16: Mobile Layout Constraints ---');
    // Ensure sticky bottom actions and touch targets of min-h-[44px]
    assert(layoutContent.includes('min-h-[44px]') || layoutContent.includes('py-3') || layoutContent.includes('py-3.5') || layoutContent.includes('py-4'), 'Action buttons satisfy mobile touch-target dimensions');

    // -------------------------------------------------------------
    // Test 17: UI-4 13-Point Data-Truth & Anti-Fabrication Audits
    // -------------------------------------------------------------
    console.log('\n--- Test 17: UI-4 13-Point Data-Truth & Anti-Fabrication Audits ---');
    const expFilePath = path.resolve(process.cwd(), 'src/pages/SolarAnalysisExperience.tsx');
    assert(fs.existsSync(expFilePath), 'SolarAnalysisExperience.tsx exists');
    const expContent = fs.readFileSync(expFilePath, 'utf-8');

    // 1. No silent input defaults in state or automatic 70% calculations
    assert(!expContent.includes("state.province || 'تهران'"), 'Point 1: No silent Tehran province default');
    assert(!expContent.includes("state.city || 'تهران'"), 'Point 1: No silent Tehran city default');
    assert(!expContent.includes('state.monthlyKwh : 350'), 'Point 1: No silent 350 kWh consumption default');
    assert(!expContent.includes('state.area > 0 ? state.area : 100'), 'Point 1: No silent 100 m2 area default');
    assert(!expContent.includes('state.usableArea > 0 ? state.usableArea : 70'), 'Point 1: No silent 70 m2 usable area default');

    // Usable Area Data-Truth: No automatic 70% formula
    const siteDetailsPath = path.resolve(process.cwd(), 'src/components/analysis/SiteDetailsStep.tsx');
    assert(fs.existsSync(siteDetailsPath), 'SiteDetailsStep.tsx exists');
    const siteDetailsContent = fs.readFileSync(siteDetailsPath, 'utf-8');
    assert(!siteDetailsContent.includes('Math.round(num * 0.7)'), 'SiteDetailsStep does not calculate Math.round(num * 0.7)');
    assert(!siteDetailsContent.includes('Math.round(area * 0.7)'), 'SiteDetailsStep does not calculate Math.round(area * 0.7)');
    assert(!siteDetailsContent.includes('۷۰٪'), 'SiteDetailsStep does not suggest 70% in text');
    assert(!expContent.includes('Math.round(area * 0.7)'), 'SolarAnalysisExperience does not calculate Math.round(area * 0.7)');
    assert(!expContent.includes('Math.round(num * 0.7)'), 'SolarAnalysisExperience does not calculate Math.round(num * 0.7)');
    assert(!expContent.includes('calculatedUsable'), 'SolarAnalysisExperience does not compute calculatedUsable');

    // 2. No processing theater
    assert(!expContent.includes('setTimeout'), 'Point 7: No artificial delay loops (processing theater) in executeAnalysis');

    // 3. No frontend engineering calculation formulas
    assert(!expContent.includes('Math.ceil((finalKwp * 1000) / 550)'), 'Point 2: No frontend panelCount formula ceil(finalKwp*1000/550)');
    assert(!expContent.includes('panelOptions?.default?.panelWattage || 550'), 'Point 2: No frontend panelWattage fallback 550');
    assert(!expContent.includes('finalKwp * dataSource.sunHours * 365 * 0.8'), 'Point 2: No frontend annual yield formula * 365 * 0.8');
    assert(!expContent.includes('panelCount * 2.6'), 'Point 2: No frontend requiredArea formula panelCount * 2.6');

    // 4. Persistence verification
    assert(expContent.includes('/api/user/history'), 'Point 8: handleSaveAnalysis verifies analysis presence in server history before confirming save');

    // 5. EngineeringDetails verification
    assert(!engDetailsContent.includes('panelWattage = 550'), 'Point 2/9: EngineeringDetails does not default panelWattage to 550');
    assert(!engDetailsContent.includes('dcCapacityKwp * 0.9'), 'Point 2/9: EngineeringDetails does not calculate inverter AC capacity on frontend');
    assert(engDetailsContent.includes('اطلاعات کافی موجود نیست'), 'Point 2/9: EngineeringDetails displays missing indicator when specs unavailable');

    // 6. SolarDataSource verification
    assert(!solarResourceContent.includes('۴.۸') && !solarResourceContent.includes('۵.۴'), 'Point 3: SolarDataSource contains no fabricated 4.8/5.4 sun hours');
    assert(!solarResourceContent.includes('بیش از ۳۰۰ روز آفتابی'), 'Point 3: SolarDataSource contains no fabricated guaranteed sun days marketing claims');

    // 7. FinancialOverview verification
    assert(!finOverviewContent.includes('۳۵ تا ۴۰ میلیون تومان') && !finOverviewContent.includes('۳۵-۴۰ میلیون'), 'Point 4: FinancialOverview contains no hardcoded 35-40M Toman assumptions');
    assert(!finOverviewContent.includes('Math.round(estimatedCostIRR / annualSavingsIRR)'), 'Point 4: FinancialOverview does not calculate unverified payback periods');

    // 8. AnalysisGoalStep verification
    assert(!goalStepContent.includes('درآمد پایدار تضمین‌شده'), 'Point 5: AnalysisGoalStep does not make false guaranteed revenue promises');

    // 9. AIResultExplanation verification
    const aiExplanationFilePath = path.resolve(process.cwd(), 'src/components/analysis/AIResultExplanation.tsx');
    const aiExplanationContent = fs.readFileSync(aiExplanationFilePath, 'utf-8');
    assert(!aiExplanationContent.includes('اطمینان قطعی') && !aiExplanationContent.includes('قطعاً توصیه می‌شود'), 'Point 6: AIResultExplanation avoids fabricated absolute certainty');

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
    console.log(`Passed: ${passed}, Failed: ${failed}`);
  } finally {
    server.close();
    isolation.verifyImmutability();
    isolation.cleanup();
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
