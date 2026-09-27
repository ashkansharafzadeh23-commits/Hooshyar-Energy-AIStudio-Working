import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../src/db/index.js';
import financingRouter from '../src/api/financing.js';
import { financeReadinessService } from '../src/services/financeReadinessService.js';
import { financialPartnerMatchingService } from '../src/services/financialPartnerMatchingService.js';
import { financingOfferComparisonService } from '../src/services/financingOfferComparisonService.js';
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
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

async function runPhase8Tests() {
  console.log('================================================================');
  console.log('HOOSHYAR ENERGY — PHASE 8 FINANCING LAYER VERIFICATION (ISOLATED)');
  console.log('================================================================');

  const isolation = setupTestDatabaseIsolation('phase8');

  // Setup Express App
  const app = express();
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api', financingRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const serverUrl = `http://localhost:${address.port}`;
  console.log(`[SETUP] Test HTTP server listening on ${serverUrl}`);

  try {
    // Seed users
    const ownerUser = db.createUser({
      name: 'کارفرمای اول',
      email: 'owner1@example.com',
      role: 'project_developer'
    });
    const attackerUser = db.createUser({
      name: 'کاربر مهاجم',
      email: 'attacker@example.com',
      role: 'project_developer'
    });
    const adminUser = db.createUser({
      name: 'مدیر سامانه',
      email: 'admin@example.com',
      role: 'admin'
    });

    const ownerToken = jwt.sign({ userId: ownerUser.id }, JWT_SECRET, { expiresIn: '1h' });
    const attackerToken = jwt.sign({ userId: attackerUser.id }, JWT_SECRET, { expiresIn: '1h' });
    const adminToken = jwt.sign({ userId: adminUser.id }, JWT_SECRET, { expiresIn: '1h' });

    // Seed project
    const project1 = db.createProject({
      title: 'نیروگاه خورشیدی ۱۰۰ کیلوواتی یزد',
      projectCode: 'PRJ-YZD-100',
      ownerId: ownerUser.id,
      organizationId: 'org-owner-1',
      targetCapacityKw: 100,
      status: 'CONTRACTING',
      location: { province: 'یزد', city: 'اشکذر', address: 'شهرک صنعتی' },
      site: { type: 'ملک شخصی', areaM2: 2000 },
      energyRequirement: { gridConnected: true }
    });

    const project2 = db.createProject({
      title: 'نیروگاه خورشیدی اصفهان',
      projectCode: 'PRJ-ESF-200',
      ownerId: 'some-other-user',
      targetCapacityKw: 200,
      status: 'DRAFT',
      location: { province: 'اصفهان', city: 'مبارکه' }
    });

    // Seed financial model for project 1
    (db as any).createFinancialModel({
      id: 'fm-100',
      projectId: project1.id,
      modelCode: 'FM-100-YAZD',
      status: 'CALCULATED',
      results: {
        totalCapex: { amount: 20000000000, currency: 'IRR' }
      }
    });

    // Seed Financial Partner Profiles & Products
    const bankPartner = db.createFinancialPartnerProfile({
      id: 'fp-mellat-solar',
      name: 'بانک ملت - اعتبارات انرژی',
      category: 'COMMERCIAL_BANK',
      isActive: true,
      supportedFinancingTypes: ['PROJECT_LOAN'],
      minimumFinancingAmount: 5000000000, // 5B Rials
      maximumFinancingAmount: 50000000000, // 50B Rials
      minimumProjectCapacityKw: 50,
      maximumProjectCapacityKw: 10000,
      supportedProvinces: ['ALL'],
      minimumEquityRatioPercent: 20,
      contactEmail: 'solar@bankmellat.ir',
      contactPhone: '02188888888',
      description: 'تسهیلات پروژه‌ای انرژی‌های تجدیدپذیر'
    });

    const bankProduct = db.createFinancingProduct({
      financialPartnerProfileId: bankPartner.id,
      name: 'تسهیلات احداث نیروگاه بند الف تبصره ۱۸',
      financingType: 'PROJECT_LOAN',
      interestRateType: 'FIXED',
      indicativeMinInterestRate: 20,
      indicativeMaxInterestRate: 23,
      minTenorMonths: 36,
      maxTenorMonths: 60,
      maxGracePeriodMonths: 12,
      minEquityPercent: 20,
      requiresCollateral: true,
      isActive: true
    });

    const leasingPartner = db.createFinancialPartnerProfile({
      id: 'fp-omid-leasing',
      name: 'لیزینگ صنعت و معدن',
      category: 'LEASING',
      isActive: true,
      supportedFinancingTypes: ['PROJECT_LOAN', 'EQUIPMENT_FINANCING'],
      minimumFinancingAmount: 1000000000,
      maximumFinancingAmount: 20000000000,
      minimumProjectCapacityKw: 20,
      maximumProjectCapacityKw: 500,
      supportedProvinces: ['یزد', 'کرمان', 'اصفهان'],
      minimumEquityRatioPercent: 30,
      contactEmail: 'info@leasing.ir',
      description: 'لیزینگ تجهیزات و اینورتر'
    });

    const fundPartnerInactive = db.createFinancialPartnerProfile({
      id: 'fp-inactive-fund',
      name: 'صندوق غیرفعال سرمایه‌گذاری',
      category: 'INVESTMENT_FUND',
      isActive: false,
      supportedFinancingTypes: ['PROJECT_LOAN'],
      minimumFinancingAmount: 10000000000,
      maximumFinancingAmount: 100000000000,
      supportedProvinces: ['تهران'],
      minimumEquityRatioPercent: 40
    });

    console.log('\n--- TEST 1: STRICT VALIDATION & NO INVENTED VALUES ---');
    // 1.1 Reject missing project cost when no model is available
    const resNoCost = await request(serverUrl, 'POST', `/api/projects/${project2.id}/financing-requests`, {
      ownerEquity: 4000000000,
      requestedAmount: 16000000000
    }, adminToken);
    assert(resNoCost.status === 400, 'Rejects financing request when project cost is missing/zero (HTTP 400)');
    assert(resNoCost.body.error.includes('کل هزینه') || resNoCost.body.error.includes('ساختگی'), 'Clear error: No invented project cost permitted');

    // 1.2 Reject missing owner equity (no default 30% assumption)
    const resNoEquity = await request(serverUrl, 'POST', `/api/projects/${project1.id}/financing-requests`, {
      requestedAmount: 15000000000
    }, ownerToken);
    assert(resNoEquity.status === 400, 'Rejects request with missing ownerEquity without assuming defaults (HTTP 400)');
    assert(resNoEquity.body.error.includes('آورده نقدی'), 'Error highlights ownerEquity is required');

    // 1.3 Reject missing financing requested amount
    const resNoAmount = await request(serverUrl, 'POST', `/api/projects/${project1.id}/financing-requests`, {
      ownerEquity: 5000000000
    }, ownerToken);
    assert(resNoAmount.status === 400, 'Rejects request with missing requestedAmount (HTTP 400)');
    assert(resNoAmount.body.error.includes('مبلغ تسهیلات'), 'Error highlights requestedAmount is required');

    // 1.4 Valid Financing Request Creation
    const resValidReq = await request(serverUrl, 'POST', `/api/projects/${project1.id}/financing-requests`, {
      totalProjectCost: 20000000000, // 20B Rials
      ownerEquity: 5000000000,      // 5B Rials (25%)
      requestedAmount: 15000000000, // 15B Rials (75%)
      financingType: 'PROJECT_LOAN',
      requestedTenorMonths: 48,
      preferredGracePeriodMonths: 6,
      collateralAvailable: true,
      collateralSummary: 'وثیقه ملکی و چک صیادی شرکت'
    }, ownerToken);
    assert(resValidReq.status === 200, 'Creates valid FinancingRequest and computes initial readiness (HTTP 200)');
    const createdReq = resValidReq.body.request;
    assert(createdReq.status === 'DRAFT', 'Initial request status is DRAFT');
    assert(createdReq.requestCode.startsWith('FIN-HSE-'), 'Generates valid requestCode (FIN-HSE-XXXXXX)');
    assert(createdReq.totalProjectCost === 20000000000, 'Persisted exact totalProjectCost without mutation');
    assert(createdReq.ownerEquity === 5000000000, 'Persisted exact ownerEquity');
    assert(createdReq.requestedAmount === 15000000000, 'Persisted exact requestedAmount');
    assert(createdReq.fundingGap === 15000000000, 'Correct funding gap calculated mathematically');

    // 1.5 Get financing requests for project
    const resGetReqs = await request(serverUrl, 'GET', `/api/projects/${project1.id}/financing-requests`, undefined, ownerToken);
    assert(resGetReqs.status === 200, 'Fetches project financing requests (HTTP 200)');
    assert(resGetReqs.body.length === 1, 'Contains exactly 1 financing request');

    console.log('\n--- TEST 2: READINESS ASSESSMENT ENGINE ---');
    // 2.1 Service-level evaluation test
    const readinessSnapshot = financeReadinessService.evaluateReadiness(createdReq, project1, {
      id: 'fm-100',
      projectId: project1.id,
      modelCode: 'FM-100-YAZD',
      status: 'CALCULATED',
      results: { totalCapex: { amount: 20000000000 } }
    } as any, 1, 2);
    assert(readinessSnapshot.totalScore > 70, 'Readiness totalScore calculated deterministically (> 70)');
    assert(readinessSnapshot.breakdown.technicalReadiness.score === 15, 'Technical readiness score is 15 (max)');
    assert(readinessSnapshot.breakdown.financialModel.score === 20, 'Financial model readiness score is 20 (max)');
    assert(readinessSnapshot.breakdown.sponsorContribution.score > 0, 'Sponsor contribution readiness score computed');
    assert(['READY_FOR_PARTNER_REVIEW', 'FINANCE_PREPARED', 'PREPARATION_REQUIRED', 'EARLY'].includes(readinessSnapshot.level), 'Readiness level is properly categorized');

    // 2.2 API-level readiness refresh
    const resRefreshReadiness = await request(serverUrl, 'POST', `/api/financing-requests/${createdReq.id}/readiness`, {}, ownerToken);
    assert(resRefreshReadiness.status === 200, 'Refreshes readiness via API (HTTP 200)');
    assert(resRefreshReadiness.body.totalScore >= 70, 'API returns evaluated totalScore');

    console.log('\n--- TEST 3: FINANCIAL PARTNER MATCHING ---');
    // 3.1 Service-level matching
    const matches = financialPartnerMatchingService.matchRequestWithPartners(
      createdReq,
      project1,
      [bankPartner, leasingPartner, fundPartnerInactive],
      [bankProduct]
    );
    assert(matches.length === 3, 'Evaluated all 3 registered partners');
    const bankMatch = matches.find(m => m.financialPartnerProfileId === bankPartner.id);
    assert(bankMatch?.eligibility === 'ELIGIBLE', 'Bank Mellat matched as ELIGIBLE');
    assert(bankMatch?.matchScore! >= 80, 'Bank Mellat matchScore is high (>=80)');
    assert(bankMatch?.reasons.some(r => r.includes('سرمایه درخواستی')), 'Transparent reason mentions requested amount');

    const inactiveMatch = matches.find(m => m.financialPartnerProfileId === fundPartnerInactive.id);
    assert(inactiveMatch?.eligibility === 'NOT_ELIGIBLE', 'Inactive fund matched as NOT_ELIGIBLE');

    // 3.2 API-level partner matching
    const resApiMatches = await request(serverUrl, 'GET', `/api/financing-requests/${createdReq.id}/matches`, undefined, ownerToken);
    assert(resApiMatches.status === 200, 'Fetches matches via API (HTTP 200)');
    assert(Array.isArray(resApiMatches.body) && resApiMatches.body.length === 3, 'API returns matches array');

    // 3.3 REGRESSION: DATA INTEGRITY & NO INVENTED FINANCING CRITERIA
    console.log('\n--- TEST 3.3: REGRESSION — NO INVENTED FINANCING CRITERIA ---');
    // Partner with completely missing / unspecified criteria
    const partnerWithUnspecifiedCriteria: any = {
      id: 'partner-unspecified-criteria',
      displayName: 'صندوق سرمایه‌گذاری عمومی بدون ضوابط پیش‌فرض',
      partnerType: 'INVESTMENT_FUND',
      status: 'ACTIVE',
      // Explicitly NO minimumEquityPercent, minimumEquityContributionPercent, or minimumEquityRatioPercent
      // Explicitly NO minimumFinancingAmount or maximumFinancingAmount
      // Explicitly NO supportedProvinces or supportedLocations
      // Explicitly NO supportedProjectStages
      // Explicitly NO supportedFinancingProducts or financingTypes
      // Explicitly NO capacity limits
      // Explicitly NO maximumTenorMonths
      // Explicitly NO collateralRequired
    };

    // Applicant with 12% equity (which would fail if a 20% fallback was invented)
    const lowEquityApp: any = {
      financingRequested: 10000000000,
      totalProjectCost: 100000000000,
      ownerEquity: 12000000000, // 12% equity
      financingType: 'PROJECT_LOAN'
    };

    const unspecifiedMatch = financialPartnerMatchingService.matchApplicationWithPartners(
      lowEquityApp,
      project1,
      [partnerWithUnspecifiedCriteria]
    )[0];

    // Assertion 1: missing minimum equity does NOT become 20%
    assert(unspecifiedMatch.details.equityFit.specified === false, 'missing minimum equity is marked as unspecified (specified === false)');
    assert(!unspecifiedMatch.details.equityFit.message.includes('20٪') && !unspecifiedMatch.details.equityFit.message.includes('20%'), 'missing minimum equity does NOT become 20%');
    assert(unspecifiedMatch.details.equityFit.message.includes('نامشخص'), 'missing minimum equity explicitly states not specified / unknown');
    assert(unspecifiedMatch.details.equityFit.eligible === true, 'missing equity criterion does not falsely reject the applicant');

    // Assertion 2: missing partner criteria are not fabricated
    assert(unspecifiedMatch.details.amountFit.specified === false, 'missing amount limit is not fabricated (specified === false)');
    assert(unspecifiedMatch.details.amountFit.message.includes('نامشخص'), 'missing amount declares unknown in message');
    assert(unspecifiedMatch.details.capacityFit.specified === false, 'missing capacity limit is not fabricated (specified === false)');
    assert(unspecifiedMatch.details.capacityFit.message.includes('نامشخص'), 'missing capacity declares unknown in message');
    assert(unspecifiedMatch.details.locationFit.specified === false, 'missing locations are not fabricated into [ALL] (specified === false)');
    assert(unspecifiedMatch.details.locationFit.message.includes('نامشخص'), 'missing locations declare unknown in message');
    assert(unspecifiedMatch.details.stageFit.specified === false, 'missing stages are not fabricated into [ALL] (specified === false)');
    assert(unspecifiedMatch.details.stageFit.message.includes('نامشخص'), 'missing stage declares unknown in message');
    assert(unspecifiedMatch.details.financingTypeFit.specified === false, 'missing financingTypes are not fabricated into [PROJECT_LOAN] (specified === false)');
    assert(unspecifiedMatch.details.financingTypeFit.message.includes('نامشخص'), 'missing financingTypes declare unknown in message');
    assert(unspecifiedMatch.details.tenorFit?.specified === false, 'missing tenor limit is not fabricated (specified === false)');
    assert(unspecifiedMatch.details.collateralFit?.specified === false, 'missing collateral requirement is not fabricated (specified === false)');

    // Assertion 3: unknown criteria do not incorrectly make a project eligible or ineligible
    assert(unspecifiedMatch.eligibilityStatus === 'ELIGIBLE', 'active partner with unknown criteria remains ELIGIBLE without artificial disqualification');
    const partnerInactiveUnspecified: any = {
      ...partnerWithUnspecifiedCriteria,
      id: 'partner-inactive-unspecified',
      status: 'INACTIVE'
    };
    const inactiveUnspecifiedMatch = financialPartnerMatchingService.matchApplicationWithPartners(
      lowEquityApp,
      project1,
      [partnerInactiveUnspecified]
    )[0];
    assert(inactiveUnspecifiedMatch.eligibilityStatus === 'NOT_ELIGIBLE', 'inactive partner correctly marked NOT_ELIGIBLE due to active status, not fabricated criteria');

    // Assertion 4: explicitly supplied partner criteria still work correctly
    const strictPartner: any = {
      id: 'partner-strict-explicit',
      displayName: 'نهاد با شروط صریح و واقعی',
      partnerType: 'BANK',
      status: 'ACTIVE',
      minimumEquityPercent: 25, // Explicitly 25%
      minimumAmount: 20000000000, // Explicitly 20B
      supportedLocations: ['تهران'], // Explicitly only Tehran
      supportedProjectStages: ['DRAFT', 'FEASIBILITY'],
      financingTypes: ['GREEN_BOND']
    };

    const strictMatch = financialPartnerMatchingService.matchApplicationWithPartners(
      lowEquityApp, // 12% equity, requesting 10B, PROJECT_LOAN
      project1, // located in Yazd
      [strictPartner]
    )[0];

    assert(strictMatch.details.equityFit.specified === true, 'explicit equity criterion is flagged as specified === true');
    assert(strictMatch.details.equityFit.eligible === false, 'explicit equity requirement (25%) correctly fails 12% equity applicant');
    assert(strictMatch.details.equityFit.message.includes('25٪'), 'explicit equity message correctly cites declared 25% threshold');
    assert(strictMatch.details.amountFit.specified === true, 'explicit minimum amount is flagged as specified');
    assert(strictMatch.details.amountFit.eligible === false, 'explicit minimum amount (20B) correctly rejects 10B request');
    assert(strictMatch.details.locationFit.specified === true, 'explicit location is flagged as specified');
    assert(strictMatch.details.locationFit.eligible === false, 'explicit location (Tehran) correctly rejects Yazd project');
    assert(strictMatch.details.financingTypeFit.specified === true, 'explicit financing type is flagged as specified');
    assert(strictMatch.details.financingTypeFit.eligible === false, 'explicit financing type (GREEN_BOND) correctly rejects PROJECT_LOAN');
    assert(strictMatch.eligibilityStatus === 'NOT_ELIGIBLE', 'explicit criteria violations correctly make project NOT_ELIGIBLE');

    console.log('\n--- TEST 4: SUBMISSION & DATA ROOM PRIVACY ---');
    // 4.1 Submit request to Bank Partner
    const resSubmit = await request(serverUrl, 'POST', `/api/financing-requests/${createdReq.id}/submit-to-partner`, {
      financialPartnerProfileId: bankPartner.id,
      authorizedDocumentIds: ['doc-solar-permit-1'],
      message: 'تقاضای بررسی و تخصیص تسهیلات احداث نیروگاه'
    }, ownerToken);
    assert(resSubmit.status === 200, 'Submits financing dossier to partner (HTTP 200)');
    const submission = resSubmit.body.submission;
    assert(submission.status === 'SUBMITTED', 'Submission status is SUBMITTED');
    assert(resSubmit.body.requestStatus === 'SUBMITTED', 'Financing request status updated to SUBMITTED');

    // Verify project transitioned from CONTRACTING to FINANCING
    const resCheckProject = db.getProjectById(project1.id);
    assert(resCheckProject?.status === 'FINANCING', 'Project status transitioned to FINANCING upon submission');

    // 4.2 Partner views submission details (marks as UNDER_REVIEW)
    const resPartnerView = await request(serverUrl, 'GET', `/api/financial-partners/requests/${submission.id}`, undefined, adminToken);
    assert(resPartnerView.status === 200, 'Partner accesses submission details (HTTP 200)');
    assert(resPartnerView.body.submission.status === 'UNDER_REVIEW', 'Submission status updated to UNDER_REVIEW upon inspection');

    // 4.3 Partner requests additional information
    const resRequestInfo = await request(serverUrl, 'POST', `/api/financial-partners/requests/${submission.id}/request-info`, {
      title: 'ارسال آخرین اظهارنامه مالیاتی',
      description: 'لطفاً اظهارنامه مالیاتی سال مالی قبل را بارگذاری فرمایید.',
      requiredDocumentTypes: ['TAX_RETURN']
    }, adminToken);
    assert(resRequestInfo.status === 200, 'Partner creates Information Request (HTTP 200)');
    assert(resRequestInfo.body.title === 'ارسال آخرین اظهارنامه مالیاتی', 'Information request title recorded');

    console.log('\n--- TEST 5: OFFER CREATION, VALIDATION & COMPARISON ---');
    // 5.1 Reject offer with missing/invented interest rate
    const resNoRateOffer = await request(serverUrl, 'POST', `/api/financial-partners/requests/${submission.id}/offers`, {
      offeredAmount: 15000000000,
      tenorMonths: 60
    }, adminToken);
    assert(resNoRateOffer.status === 400, 'Rejects offer with missing interestRate (HTTP 400)');
    assert(resNoRateOffer.body.error.includes('نرخ سود'), 'Strict rejection message: No invented interest rate');

    // 5.2 Partner submits valid Offer 1 (Bank)
    const resOffer1 = await request(serverUrl, 'POST', `/api/financial-partners/requests/${submission.id}/offers`, {
      offeredAmount: 15000000000,
      interestRate: 23,
      tenorMonths: 60,
      gracePeriodMonths: 12,
      repaymentType: 'EQUAL_INSTALLMENT',
      fees: [{ name: 'کارمزد بررسی پرونده', percentage: 1 }],
      collateralRequirements: ['رهن سند نیروگاه', 'ضمانت‌نامه شرکتی']
    }, adminToken);
    assert(resOffer1.status === 200, 'Partner submits FinancingOffer 1 (HTTP 200)');
    const offer1 = resOffer1.body;
    assert(offer1.offeredAmount === 15000000000, 'Offer 1 records exact offeredAmount');
    assert(offer1.interestRate === 23, 'Offer 1 records exact interestRate');

    // 5.3 Partner submits valid Offer 2 (Alternative offer with lower rate, shorter tenor)
    const resOffer2 = await request(serverUrl, 'POST', `/api/financial-partners/requests/${submission.id}/offers`, {
      financialPartnerProfileId: leasingPartner.id,
      offeredAmount: 13000000000,
      interestRate: 21,
      tenorMonths: 36,
      gracePeriodMonths: 6,
      repaymentType: 'EQUAL_INSTALLMENT',
      fees: [{ name: 'کارمزد کارشناسی', amount: 50000000 }],
      collateralRequirements: ['مالکیت تجهیزات تا تسویه کامل']
    }, adminToken);
    assert(resOffer2.status === 200, 'Partner submits FinancingOffer 2 (HTTP 200)');
    const offer2 = resOffer2.body;

    // 5.4 Compare offers side-by-side
    const resCompare = await request(serverUrl, 'GET', `/api/financing-requests/${createdReq.id}/compare-offers`, undefined, ownerToken);
    assert(resCompare.status === 200, 'Compares all received offers (HTTP 200)');
    assert(resCompare.body.length === 2, 'Compares both offers side-by-side');
    assert(resCompare.body[0].monthlyPayment > 0, 'Computes deterministic monthly debt service payment');
    assert(resCompare.body[0].totalInterest > 0, 'Computes deterministic total interest');
    assert(resCompare.body[0].keyStrengths.length > 0, 'Highlights objective key strengths without biased winner declaration');

    console.log('\n--- TEST 6: SELECTION, APPROVAL & PROJECT LIFECYCLE ---');
    // 6.1 Owner selects Offer 1
    const resSelect = await request(serverUrl, 'POST', `/api/financing-offers/${offer1.id}/select`, {}, ownerToken);
    assert(resSelect.status === 200, 'Owner selects preferred offer (HTTP 200)');
    assert(resSelect.body.status === 'OFFER_SELECTED', 'Request status moved to OFFER_SELECTED');

    // Verify unselected offer is DECLINED
    const unselected = db.getFinancingOfferById(offer2.id);
    assert(unselected?.status === 'DECLINED', 'Alternative unselected offer automatically marked DECLINED');

    // 6.2 Record partner final approval & create Project Financing Record
    const resApproval = await request(serverUrl, 'POST', `/api/financing-offers/${offer1.id}/record-partner-approval`, {}, adminToken);
    assert(resApproval.status === 200, 'Records partner final approval (HTTP 200)');
    assert(resApproval.body.success === true, 'Partner approval succeeded');
    const finRecord = resApproval.body.financingRecord;
    assert(finRecord.status === 'APPROVED', 'ProjectFinancingRecord created with status APPROVED');
    assert(finRecord.approvedAmount === 15000000000, 'Approved amount matches selected offer');

    // Verify project transitioned from FINANCING to PROCUREMENT
    const finalProject = db.getProjectById(project1.id);
    assert(finalProject?.status === 'PROCUREMENT', 'Project successfully transitioned from FINANCING to PROCUREMENT');

    // 6.3 Project Financing Summary
    const resSummary = await request(serverUrl, 'GET', `/api/projects/${project1.id}/financing`, undefined, ownerToken);
    assert(resSummary.status === 200, 'Fetches project financing summary (HTTP 200)');
    assert(resSummary.body.activeRecord.approvedAmount === 15000000000, 'Summary includes active approved financing record');

    console.log('\n--- TEST 7: SECURITY & IDOR PREVENTION ---');
    // 7.1 Unauthenticated access rejected
    const resUnauth = await request(serverUrl, 'GET', `/api/projects/${project1.id}/financing-requests`);
    assert(resUnauth.status === 401, 'Unauthenticated request rejected with HTTP 401');

    // 7.2 Attacker cannot access victim financing requests
    const resAttackerReqs = await request(serverUrl, 'GET', `/api/projects/${project1.id}/financing-requests`, undefined, attackerToken);
    assert(resAttackerReqs.status === 403, 'Attacker cannot view victim financing requests (HTTP 403 IDOR blocked)');

    // 7.3 Attacker cannot submit request on victim project
    const resAttackerCreate = await request(serverUrl, 'POST', `/api/projects/${project1.id}/financing-requests`, {
      totalProjectCost: 20000000000,
      ownerEquity: 5000000000,
      requestedAmount: 15000000000
    }, attackerToken);
    assert(resAttackerCreate.status === 403, 'Attacker cannot create financing request on victim project (HTTP 403)');

    // 7.4 Attacker cannot select offers on victim project
    const resAttackerSelect = await request(serverUrl, 'POST', `/api/financing-offers/${offer1.id}/select`, {}, attackerToken);
    assert(resAttackerSelect.status === 403, 'Attacker cannot select offer on victim financing (HTTP 403)');

    console.log('================================================================');
    console.log(`PHASE 8 TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } finally {
    server.close();
    isolation.cleanup();
  }
}

runPhase8Tests().catch((err) => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
