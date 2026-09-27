import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../src/db/index.js';
import enterpriseRouter from '../src/api/enterprise.js';
import { portfolioAggregationService } from '../src/services/portfolioAggregationService.js';
import { lifecycleIntelligenceService } from '../src/services/lifecycleIntelligenceService.js';
import { platformIntelligenceEngine } from '../src/services/platformIntelligenceEngine.js';
import { enterpriseAccessService } from '../src/services/enterpriseAccessService.js';
import { aiExecutiveAssistantService } from '../src/services/aiExecutiveAssistantService.js';
import { getSecurityConfig } from '../src/security/config.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

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

  return {
    status: res.status,
    body: json,
  };
}

async function runPhase9Tests() {
  console.log('================================================================');
  console.log('HOOSHYAR ENERGY — PHASE 9 PLATFORM & PORTFOLIO INTELLIGENCE (ISOLATED)');
  console.log('================================================================');

  const isolation = setupTestDatabaseIsolation('phase9');

  // Setup Express App
  const app = express();
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/enterprise', enterpriseRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const serverUrl = `http://localhost:${address.port}`;
  console.log(`[SETUP] Test HTTP server listening on ${serverUrl}`);

  try {
    // 1. Seed Users
    const userAlice = db.createUser({
      name: 'آلیس مدیر سازمان الف',
      email: 'alice@alpha-energy.ir',
      role: 'project_developer'
    });
    const userBob = db.createUser({
      name: 'باب مدیر مالی سازمان الف',
      email: 'bob@alpha-energy.ir',
      role: 'investor'
    });
    const userCharlie = db.createUser({
      name: 'چارلی کاربر سازمان ب',
      email: 'charlie@beta-energy.ir',
      role: 'project_developer'
    });
    const globalAdmin = db.createUser({
      name: 'مدیر کل سیستم',
      email: 'admin@hooshyar.energy',
      role: 'admin'
    });

    const tokenAlice = jwt.sign({ id: userAlice.id, email: userAlice.email, role: 'project_developer' }, JWT_SECRET);
    const tokenBob = jwt.sign({ id: userBob.id, email: userBob.email, role: 'investor' }, JWT_SECRET);
    const tokenCharlie = jwt.sign({ id: userCharlie.id, email: userCharlie.email, role: 'project_developer' }, JWT_SECRET);
    const tokenAdmin = jwt.sign({ id: globalAdmin.id, email: globalAdmin.email, role: 'admin' }, JWT_SECRET);

    // 2. Seed Organizations
    const orgAlpha = db.createOrganization({
      name: 'شرکت سرمایه‌گذاری انرژی آلفا',
      legalType: 'CORPORATION' as any
    });
    const orgBeta = db.createOrganization({
      name: 'هلدینگ توسعه انرژی بتا',
      legalType: 'CORPORATION' as any
    });

    // 3. Organization Members (Enterprise RBAC)
    db.createOrganizationMember({
      organizationId: orgAlpha.id,
      userId: userAlice.id,
      role: 'OWNER',
      status: 'ACTIVE'
    });
    db.createOrganizationMember({
      organizationId: orgAlpha.id,
      userId: userBob.id,
      role: 'FINANCE',
      status: 'ACTIVE'
    });
    db.createOrganizationMember({
      organizationId: orgBeta.id,
      userId: userCharlie.id,
      role: 'OWNER',
      status: 'ACTIVE'
    });

    // Test 1: Organization Authorization & Access
    console.log('\n--- SECTION 1: ORGANIZATION ACCESS & RBAC ---');
    const accessAlice = enterpriseAccessService.checkOrganizationAccess(orgAlpha.id, userAlice);
    assert(accessAlice.allowed === true, 'Alice has access to Org Alpha as OWNER');
    assert(accessAlice.member?.role === 'OWNER', 'Alice role is OWNER');

    const accessBob = enterpriseAccessService.checkOrganizationAccess(orgAlpha.id, userBob);
    assert(accessBob.allowed === true, 'Bob has access to Org Alpha as FINANCE');

    const accessCharlieToAlpha = enterpriseAccessService.checkOrganizationAccess(orgAlpha.id, userCharlie);
    assert(accessCharlieToAlpha.allowed === false, 'Charlie from Org Beta is DENIED access to Org Alpha (403)');
    assert(accessCharlieToAlpha.status === 403, 'Charlie receives 403 Forbidden');

    const accessAdmin = enterpriseAccessService.checkOrganizationAccess(orgAlpha.id, globalAdmin);
    assert(accessAdmin.allowed === true, 'Global Admin has access to any organization');

    // Test 2: Role Permission Checks
    const ownerOnlyCheck = enterpriseAccessService.checkOrganizationAccess(orgAlpha.id, userBob, ['OWNER']);
    assert(ownerOnlyCheck.allowed === false, 'Bob (FINANCE) is denied OWNER-only action');

    // 4. Seed Projects for Org Alpha
    console.log('\n--- SECTION 2: SEEDING REAL PROJECTS & ASSETS ---');
    // Project 1: Operational Solar Plant (complete data)
    const prj1 = db.createEnergyProject({
      projectCode: 'PRJ-ALP-001',
      title: 'نیروگاه خورشیدی ۵ مگاواتی کهریزک',
      ownerId: userAlice.id,
      organizationId: orgAlpha.id,
      status: 'OPERATIONAL',
      targetCapacityKw: 5000,
      estimatedBudgetIRR: 150000000000,
      location: { city: 'کهریزک', province: 'تهران' }
    });

    // Project 2: Construction Phase Solar Plant (has milestones, contract)
    const prj2 = db.createEnergyProject({
      projectCode: 'PRJ-ALP-002',
      title: 'نیروگاه خورشیدی ۱۰ مگاواتی دامغان',
      ownerId: userAlice.id,
      organizationId: orgAlpha.id,
      status: 'CONSTRUCTION',
      targetCapacityKw: 10000,
      estimatedBudgetIRR: 280000000000,
      location: { city: 'دامغان', province: 'سمنان' }
    });

    // Project 3: Early Stage Project (missing budget and capacity - data incomplete!)
    const prj3 = db.createEnergyProject({
      projectCode: 'PRJ-ALP-003',
      title: 'طرح توسعه خورشیدی یزد',
      ownerId: userAlice.id,
      organizationId: orgAlpha.id,
      status: 'FEASIBILITY',
      // Explicitly NO targetCapacityKw or estimatedBudgetIRR to test missing-data handling!
      location: { city: 'یزد', province: 'یزد' }
    });

    // Project 4: Stalled Project (last update > 45 days ago)
    const prj4 = db.createEnergyProject({
      projectCode: 'PRJ-ALP-004',
      title: 'پروژه راکد خورشیدی کاشان',
      ownerId: userAlice.id,
      organizationId: orgAlpha.id,
      status: 'RFQ_OPEN',
      targetCapacityKw: 2000,
      location: { city: 'کاشان', province: 'اصفهان' }
    });
    // Manually set older updatedAt on stalled project
    const pastDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    db.updateEnergyProject(prj4.id, { updatedAt: pastDate });

    // Seed Operational Asset for Prj 1
    const asset1 = db.createAsset({
      assetCode: 'AST-KHR-001',
      name: 'دارایی عملیاتی نیروگاه کهریزک',
      projectId: prj1.id,
      organizationId: orgAlpha.id,
      status: 'OPERATIONAL',
      operationalStatus: 'OPERATIONAL',
      installedCapacityKw: 5000
    });

    // Seed Telemetry Source & Readings for Asset 1 (ONLINE)
    const source1 = db.createTelemetrySource({
      assetId: asset1.id,
      projectId: prj1.id,
      sourceType: 'INVERTER',
      name: 'اینورتر مرکزی ۱',
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    });
    db.createTelemetryReading({
      assetId: asset1.id,
      sourceId: source1.id,
      metricType: 'POWER_KW',
      value: 4620,
      unit: 'kW',
      quality: 'VALID',
      timestamp: new Date().toISOString()
    });

    // Seed Asset 2 (OFFLINE / NOT CONNECTED)
    const asset2 = db.createAsset({
      assetCode: 'AST-DMG-002',
      name: 'دارایی در حال راه‌اندازی دامغان',
      projectId: prj2.id,
      organizationId: orgAlpha.id,
      status: 'COMMISSIONING',
      operationalStatus: 'COMMISSIONING',
      installedCapacityKw: 10000
    });

    // Seed Milestones for Project 2 (One Overdue Milestone!)
    const overdueDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    db.createMilestone({
      projectId: prj2.id,
      title: 'تحویل و نصب استراکچرها',
      name: 'تحویل و نصب استراکچرها',
      status: 'IN_PROGRESS',
      dueDate: overdueDate
    } as any);

    // Seed Contract for Project 2
    db.createContract({
      projectId: prj2.id,
      contractTitle: 'قرارداد پیمانکاری EPC نیروگاه دامغان',
      status: 'ACTIVE',
      contractValueIRR: 260000000000
    } as any);

    // Seed Procurement Package & Inspection for Project 2
    db.createProcurementPackage({
      projectId: prj2.id,
      packageCode: 'PKG-MOD-01',
      title: 'خرید ماژول‌های مونوکریستال ۵۵۰ وات',
      status: 'OPEN'
    });
    db.createDeliveryInspection({
      projectId: prj2.id,
      inspectionNumber: 'INS-MOD-001',
      status: 'PENDING'
    });

    // Seed Financing Request for Project 2
    db.createFinancingRequest({
      projectId: prj2.id,
      requestedAmount: 180000000000,
      ownerEquity: 80000000000,
      status: 'SUBMITTED'
    });

    // Seed Active Financing Agreement for Project 1
    db.createProjectFinancingRecord({
      projectId: prj1.id,
      approvedAmount: 100000000000,
      status: 'APPROVED'
    });

    // Seed Critical Maintenance Case for Project 1
    db.createMaintenanceCase({
      projectId: prj1.id,
      assetId: asset1.id,
      title: 'نقص بحرانی در ترانسفورماتور پست اختصاصی',
      priority: 'CRITICAL',
      status: 'OPEN'
    });

    // 5. Create Portfolio
    console.log('\n--- SECTION 3: PORTFOLIO CREATION & REFERENCES ---');
    const portfolioAlpha = db.createPortfolio({
      organizationId: orgAlpha.id,
      name: 'پرتفوی توسعه نیروگاه‌های مقیاس بزرگ آلفا',
      description: 'نیروگاه‌های خورشیدی بالای ۲ مگاوات هلدینگ آلفا',
      projectIds: [prj1.id, prj2.id, prj3.id, prj4.id],
      assetIds: [asset1.id, asset2.id]
    });
    assert(portfolioAlpha.id !== undefined, 'Portfolio created successfully');
    assert(portfolioAlpha.projectIds.length === 4, 'Portfolio references 4 existing project IDs');
    assert(portfolioAlpha.assetIds.length === 2, 'Portfolio references 2 existing asset IDs');

    // Test 3: Portfolio Aggregation Overview
    console.log('\n--- SECTION 4: PORTFOLIO OVERVIEW AGGREGATION ---');
    const overview = portfolioAggregationService.getPortfolioOverview(portfolioAlpha.id);
    assert(overview !== null, 'Portfolio overview generated');
    assert(overview!.totalProjects === 4, 'Total projects equals 4');
    assert(overview!.projectsUnderConstruction === 1, '1 project under construction (PRJ-ALP-002)');
    assert(overview!.totalOperationalAssets === 1, '1 operational asset (AST-KHR-001)');
    assert(overview!.activeContracts === 1, '1 active contract detected');
    assert(overview!.openFinancingApplications === 1, '1 open financing application');
    assert(overview!.activeFinancingAgreements === 1, '1 active financing agreement');
    assert(overview!.openMaintenanceCases === 1, '1 open maintenance case');

    // Verify Missing-Data Handling (Capacity)
    // Planned capacity = prj1 (5000) + prj2 (10000) + prj4 (2000) = 17000 kW. Prj 3 has missing capacity!
    assert(overview!.plannedSolarCapacity.knownCapacityKw === 17000, 'Planned solar capacity correctly sums only known values (17,000 kW)');
    assert(overview!.plannedSolarCapacity.projectsWithKnownCapacity === 3, '3 projects have known capacity');
    assert(overview!.plannedSolarCapacity.projectsWithMissingCapacity === 1, '1 project explicitly marked with missing capacity (no fake zero)');
    assert(overview!.plannedSolarCapacity.isFullyKnown === false, 'Planned capacity is NOT marked fully known');

    // Operational capacity = asset 1 (5000 kW)
    assert(overview!.operationalCapacity.knownCapacityKw === 5000, 'Operational capacity equals 5000 kW');
    assert(overview!.operationalCapacity.assetsWithKnownCapacity === 1, '1 asset with known capacity');

    // Test 4: Lifecycle Intelligence & Explicit Stalled Threshold Enforcement
    console.log('\n--- SECTION 5: LIFECYCLE INTELLIGENCE & STALLED THRESHOLD INTEGRITY ---');
    // Regression Test 1: No configured threshold anywhere => project is NOT classified as stalled!
    const lifecycleNoThreshold = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioAlpha.id);
    assert(lifecycleNoThreshold !== null, 'Lifecycle intelligence generated');
    assert(lifecycleNoThreshold!.stalledProjects.length === 0, 'No configured threshold => project is NOT classified as stalled (0 stalled)');
    
    // Regression Test 2: Verify no stalled insight is generated when no threshold is configured
    const insightsNoThreshold = platformIntelligenceEngine.generatePortfolioInsights(portfolioAlpha.id);
    const stalledInsightNoThreshold = insightsNoThreshold.find(i => i.type === 'LIFECYCLE_STALLED');
    assert(stalledInsightNoThreshold === undefined, 'No configured threshold => NO stalled insight generated');

    // Regression Test 3: Explicit 30-day threshold via option works
    const lifecycleOpt30 = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioAlpha.id, { stalledThresholdDays: 30 });
    assert(lifecycleOpt30!.stalledProjects.length === 1, 'Explicit 30-day threshold via option works (detected 1 stalled project)');
    assert(lifecycleOpt30!.stalledProjects[0].projectId === prj4.id, 'Stalled project matches PRJ-ALP-004');
    assert(lifecycleOpt30!.stalledProjects[0].thresholdDays === 30, 'Stalled item exposes explicit 30 threshold');

    // Regression Test 4: Explicit 45-day threshold works (diffDays is ~45, >= 45 passes)
    const lifecycleOpt45 = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioAlpha.id, { stalledThresholdDays: 45 });
    assert(lifecycleOpt45!.stalledProjects.length === 1, 'Explicit 45-day threshold works (diffDays >= 45)');
    
    // Explicit higher threshold (e.g. 60 days) does NOT falsely classify a 45-day project as stalled
    const lifecycleOpt60 = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioAlpha.id, { stalledThresholdDays: 60 });
    assert(lifecycleOpt60!.stalledProjects.length === 0, 'Explicit 60-day threshold correctly excludes 45-day inactive project');

    // Regression Test 5: Project-level configuration works
    const pastDateStr = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    db.updateEnergyProject(prj4.id, { stalledThresholdDays: 40, updatedAt: pastDateStr });
    const lifecyclePrjConfig = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioAlpha.id);
    assert(lifecyclePrjConfig!.stalledProjects.length === 1, 'Project-level stalledThresholdDays=40 configuration works');
    assert(lifecyclePrjConfig!.stalledProjects[0].thresholdDays === 40, 'Project-level threshold recorded as 40');
    // Reset project-level threshold
    db.updateEnergyProject(prj4.id, { stalledThresholdDays: undefined, updatedAt: pastDateStr });

    // Regression Test 6: Portfolio-level configuration works
    db.updatePortfolio(portfolioAlpha.id, { settings: { stalledThresholdDays: 35 } });
    const lifecyclePortfolioConfig = lifecycleIntelligenceService.getLifecycleIntelligence(portfolioAlpha.id);
    assert(lifecyclePortfolioConfig!.stalledProjects.length === 1, 'Portfolio-level settings.stalledThresholdDays=35 configuration works');
    assert(lifecyclePortfolioConfig!.stalledProjects[0].thresholdDays === 35, 'Portfolio-level threshold recorded as 35');

    // Regression Test 7: Confirm no arbitrary time threshold remains (leave portfolio configured with 35 days for downstream tests)
    const lifecycle = lifecyclePortfolioConfig;

    assert(lifecycle!.overdueMilestones.length === 1, 'Detected 1 overdue milestone with explicit date');
    assert(lifecycle!.overdueMilestones[0].projectId === prj2.id, 'Overdue milestone belongs to Project 2');
    assert(lifecycle!.overdueMilestones[0].daysOverdue >= 9, 'Overdue days calculated accurately');

    assert(lifecycle!.missingNextSteps.length >= 1, 'Identified projects with missing next-step data');
    const prj3Missing = lifecycle!.missingNextSteps.find(m => m.projectId === prj3.id);
    assert(prj3Missing !== undefined, 'Project 3 flagged for missing feasibility data');

    // Test 5: Asset Portfolio Intelligence & Telemetry Unavailable State
    console.log('\n--- SECTION 6: ASSET INTELLIGENCE & TELEMETRY ---');
    const assetIntel = portfolioAggregationService.getAssetPortfolioIntelligence(portfolioAlpha.id);
    assert(assetIntel !== null, 'Asset intelligence generated');
    assert(assetIntel!.totalAssets === 2, 'Total assets equals 2');
    assert(assetIntel!.telemetryBreakdown.reporting === 1, '1 asset reporting live telemetry (Asset 1)');
    assert(assetIntel!.telemetryBreakdown.notConnected === 1, '1 asset with telemetry NOT_CONNECTED (Asset 2)');

    const a1 = assetIntel!.assets.find(a => a.assetId === asset1.id);
    assert(a1?.telemetryStatus === 'REPORTING', 'Asset 1 telemetry status is REPORTING');
    assert(a1?.performanceState === 'NORMAL', 'Asset 1 performance state is NORMAL');

    const a2 = assetIntel!.assets.find(a => a.assetId === asset2.id);
    assert(a2?.telemetryStatus === 'NOT_CONNECTED', 'Asset 2 telemetry status is NOT_CONNECTED (never fake telemetry)');

    // Test 6: Financial Portfolio View (Strict No-Fake-Zeros)
    console.log('\n--- SECTION 7: FINANCIAL PORTFOLIO VIEW (NO FAKE ZEROS) ---');
    const finIntel = portfolioAggregationService.getFinancialPortfolioView(portfolioAlpha.id);
    assert(finIntel !== null, 'Financial portfolio view generated');
    // Total known capex = prj1 (150B) + prj2 (280B) = 430B. Prj 3 & 4 have no capex!
    assert(finIntel!.aggregations.totalKnownCapexIRR === 430000000000, 'Total known CAPEX strictly aggregates real values (430B IRR)');
    assert(finIntel!.aggregations.projectsWithCapexCount === 2, 'Exactly 2 projects have known CAPEX');
    assert(finIntel!.knownFinancialRecords >= 2, 'Known financial records count tracked');
    assert(finIntel!.aggregations.totalKnownFinancingRequestedIRR === 180000000000, 'Financing requested = 180B IRR');
    assert(finIntel!.aggregations.totalKnownOwnerEquityIRR === 80000000000, 'Owner equity = 80B IRR');
    assert(finIntel!.aggregations.totalKnownContractValueIRR === 260000000000, 'Contract value = 260B IRR');

    const prj3Fin = finIntel!.projectFinancialDetails.find(p => p.projectId === prj3.id);
    assert(prj3Fin?.capexIRR === null, 'Project 3 CAPEX is NULL, NOT zero');
    assert(prj3Fin?.financingRequestedIRR === null, 'Project 3 financing is NULL, NOT zero');

    // Test 7: Procurement & Operations Intelligence
    console.log('\n--- SECTION 8: PROCUREMENT & OPERATIONS ---');
    const procIntel = portfolioAggregationService.getProcurementIntelligence(portfolioAlpha.id);
    assert(procIntel !== null, 'Procurement intelligence generated');
    assert(procIntel!.openProcurementPackages === 1, '1 open procurement package');
    assert(procIntel!.pendingInspections === 1, '1 pending equipment inspection');
    assert(procIntel!.activeContracts === 1, '1 active contract');

    const opsIntel = portfolioAggregationService.getOperationsIntelligence(portfolioAlpha.id);
    assert(opsIntel !== null, 'Operations intelligence generated');
    assert(opsIntel!.openMaintenanceCasesCount === 1, '1 open maintenance case');
    assert(opsIntel!.openMaintenanceCasesByPriority.CRITICAL === 1, '1 critical priority maintenance case');

    // Test 8: Platform Intelligence Engine (Deterministic, Zero Hallucinations)
    console.log('\n--- SECTION 9: PLATFORM INTELLIGENCE INSIGHTS ---');
    const insights = platformIntelligenceEngine.generatePortfolioInsights(portfolioAlpha.id);
    assert(insights.length > 0, 'Platform insights generated');
    
    const overdueInsight = insights.find(i => i.type === 'OVERDUE_MILESTONE');
    assert(overdueInsight !== undefined, 'Generated OVERDUE_MILESTONE insight from verified date');
    assert(overdueInsight?.evidence.milestoneId !== undefined, 'Insight contains concrete evidence milestoneId');

    const stalledInsight = insights.find(i => i.type === 'LIFECYCLE_STALLED');
    assert(stalledInsight !== undefined, 'Generated LIFECYCLE_STALLED insight from verified days');
    assert(stalledInsight?.evidence.daysSinceLastUpdate >= 45, 'Insight evidence contains verified daysSinceLastUpdate');

    const maintInsight = insights.find(i => i.type === 'MAINTENANCE_CRITICAL');
    assert(maintInsight !== undefined, 'Generated MAINTENANCE_CRITICAL insight');

    const inspectionInsight = insights.find(i => i.type === 'DELIVERY_INSPECTION_PENDING');
    assert(inspectionInsight !== undefined, 'Generated DELIVERY_INSPECTION_PENDING insight');

    // Test 9: AI Executive Assistant
    console.log('\n--- SECTION 10: AI EXECUTIVE ASSISTANT ---');
    const execSummary = await aiExecutiveAssistantService.generateExecutiveSummary(portfolioAlpha.id);
    assert(execSummary !== null, 'Executive summary generated');
    assert(execSummary!.verifiedFacts.totalProjects === 4, 'Executive summary facts contain 4 total projects');
    assert(execSummary!.verifiedFacts.knownPlannedCapacityKw === 17000, 'Executive summary facts contain 17,000 kW');
    assert(execSummary!.attentionItems.length > 0, 'Executive summary highlights real attention items');

    // Test 10: REST APIs & Cross-Organization IDOR Protection
    console.log('\n--- SECTION 11: HTTP REST API & CROSS-ORG IDOR PROTECTION ---');

    // GET /api/enterprise/organizations (Alice sees Org Alpha)
    const resAliceOrgs = await request(serverUrl, 'GET', '/api/enterprise/organizations', undefined, tokenAlice);
    assert(resAliceOrgs.status === 200, 'Alice GET /organizations returns 200');
    assert(resAliceOrgs.body.some((o: any) => o.id === orgAlpha.id), 'Alice sees Org Alpha');
    assert(!resAliceOrgs.body.some((o: any) => o.id === orgBeta.id), 'Alice does NOT see Org Beta');

    // GET /api/enterprise/portfolios/:id/overview (Alice allowed)
    const resAliceOverview = await request(serverUrl, 'GET', `/api/enterprise/portfolios/${portfolioAlpha.id}/overview`, undefined, tokenAlice);
    assert(resAliceOverview.status === 200, 'Alice GET portfolio overview returns 200');
    assert(resAliceOverview.body.totalProjects === 4, 'Returned overview has totalProjects = 4');

    // IDOR TEST: Charlie (from Org Beta) attempts to read Org Alpha portfolio overview
    const resCharlieIdor = await request(serverUrl, 'GET', `/api/enterprise/portfolios/${portfolioAlpha.id}/overview`, undefined, tokenCharlie);
    assert(resCharlieIdor.status === 403, 'Charlie access to Org Alpha portfolio is BLOCKED with 403 Forbidden (IDOR Prevented!)');

    // IDOR TEST: Charlie attempts to read Org Alpha members
    const resCharlieMembersIdor = await request(serverUrl, 'GET', `/api/enterprise/organizations/${orgAlpha.id}/members`, undefined, tokenCharlie);
    assert(resCharlieMembersIdor.status === 403, 'Charlie access to Org Alpha members is BLOCKED with 403 Forbidden');

    // IDOR TEST: Charlie attempts to create a portfolio in Org Alpha
    const resCharlieCreateIdor = await request(serverUrl, 'POST', `/api/enterprise/organizations/${orgAlpha.id}/portfolios`, {
      name: 'پرتفوی هک شده'
    }, tokenCharlie);
    assert(resCharlieCreateIdor.status === 403, 'Charlie cannot create portfolio in Org Alpha (403 Forbidden)');

    // Role Permission API Test: Bob (FINANCE) attempts to add a new organization member (OWNER/ADMIN only)
    const resBobAddMember = await request(serverUrl, 'POST', `/api/enterprise/organizations/${orgAlpha.id}/members`, {
      userId: userCharlie.id,
      role: 'VIEWER'
    }, tokenBob);
    assert(resBobAddMember.status === 403, 'Bob (FINANCE) cannot add members (403 Forbidden)');

    // Alice (OWNER) adds a new member
    const resAliceAddMember = await request(serverUrl, 'POST', `/api/enterprise/organizations/${orgAlpha.id}/members`, {
      userId: 'new-engineer-user',
      role: 'ENGINEER'
    }, tokenAlice);
    assert(resAliceAddMember.status === 201, 'Alice (OWNER) successfully adds new ENGINEER member');

    // GET /api/enterprise/portfolios/:id/financial
    const resFinApi = await request(serverUrl, 'GET', `/api/enterprise/portfolios/${portfolioAlpha.id}/financial`, undefined, tokenAlice);
    assert(resFinApi.status === 200, 'Financial API returns 200');
    assert(resFinApi.body.aggregations.totalKnownCapexIRR === 430000000000, 'Financial API returns accurate verified CAPEX');

    // GET /api/enterprise/portfolios/:id/insights
    const resInsApi = await request(serverUrl, 'GET', `/api/enterprise/portfolios/${portfolioAlpha.id}/insights`, undefined, tokenAlice);
    assert(resInsApi.status === 200, 'Insights API returns 200');
    assert(Array.isArray(resInsApi.body) && resInsApi.body.length > 0, 'Insights API returns list of insights');

    // POST /api/enterprise/portfolios/:id/executive-summary
    const resSummaryApi = await request(serverUrl, 'POST', `/api/enterprise/portfolios/${portfolioAlpha.id}/executive-summary`, {}, tokenAlice);
    assert(resSummaryApi.status === 200, 'Executive summary API returns 200');
    assert(resSummaryApi.body.verifiedFacts.totalProjects === 4, 'Executive summary facts verified via API');

    console.log('\n================================================================');
    console.log('ALL PHASE 9 VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log(`Passed: ${passed}, Failed: ${failed}`);
    console.log('================================================================');

  } finally {
    server.close();
    isolation.cleanup();
  }
}

runPhase9Tests().catch((err) => {
  console.error('[FATAL] Phase 9 test execution failed:', err);
  process.exit(1);
});
