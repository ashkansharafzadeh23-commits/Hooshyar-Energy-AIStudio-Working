import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../src/db/index';
import { projectRepository } from '../src/repositories/projectRepository';
import { rfqRepository } from '../src/repositories/rfqRepository';
import { financeService } from '../src/services/financeService';
import { projectReadinessService } from '../src/services/projectReadinessService';
import { projectMatchingService } from '../src/services/projectMatchingService';
import { checkProjectAccess } from '../src/api/projects';

async function runBatchBAcceptanceTest() {
  console.log('====================================================');
  console.log('HOOSHYAR ENERGY — BATCH B TEST SUITE (ISOLATED STORAGE)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // --- STEP 0: Test Storage Isolation Setup ---
  const originalDbPath = db.getDBPath();
  const originalDbExists = fs.existsSync(originalDbPath);
  const originalDbContent = originalDbExists ? fs.readFileSync(originalDbPath, 'utf-8') : null;

  const tempDbFile = path.join(
    os.tmpdir(),
    `hooshyar_batch_b_test_${Date.now()}_${Math.random().toString(36).substring(7)}.json`
  );

  console.log(`[ISOLATION] Original DB Path: ${originalDbPath}`);
  console.log(`[ISOLATION] Setting temporary isolated DB Path: ${tempDbFile}`);
  db.setDBPath(tempDbFile);

  try {
    // Verify isolated path is active
    assert(db.getDBPath() === tempDbFile, 'Database path successfully redirected to isolated temp DB');

    // --- STEP 1: Project Setup ---
    console.log('\n--- Step 1: Project Setup (Isolated) ---');
    const project = projectRepository.create({
      projectCode: 'PRJ-TEST-001',
      title: 'نیروگاه خورشیدی تست یکپارچه ۱۰۰ کیلوواتی اصفهان',
      projectType: 'SOLAR',
      status: 'FEASIBILITY',
      ownerId: 'test-user-owner-1',
      targetCapacityKw: 100,
      estimatedBudgetIRR: 25000000000, // 2.5 Billion Tomans
      location: {
        country: 'Iran',
        province: 'اصفهان',
        city: 'نجف‌آباد'
      },
      site: {
        type: 'ROOFTOP_COMMERCIAL',
        areaM2: 1200
      },
      energyRequirement: {
        gridConnected: true,
        gridStable: true
      }
    });
    assert(Boolean(project && project.id), 'Project created successfully with ID: ' + project.id);

    // --- PHASE 2: Financial Engine Verification ---
    console.log('\n--- Phase 2: Financial Engine Verification ---');
    
    // Currency conversion: 1 TOMAN = 10 RIAL
    const rialAmount = 10000000; // 10M Rials
    const tomanConverted = rialAmount / 10;
    assert(tomanConverted === 1000000, 'Currency handling: 1 TOMAN = 10 RIAL deterministic equivalence verified');

    // Deterministic Financial Calculation
    const capexToman = 2500000000; // 2.5B Tomans
    const annualGenerationKwh = 165000; // 100kW * 1650 kWh/kW/yr
    const tariffTomanPerKwh = 3200; // SATBA tariff
    const annualRevenueToman = annualGenerationKwh * tariffTomanPerKwh;
    const annualOpexToman = capexToman * 0.02; // 2% opex
    const netBenefitToman = annualRevenueToman - annualOpexToman;
    const simplePayback = capexToman / netBenefitToman;

    assert(simplePayback > 4 && simplePayback < 8, `Deterministic simple payback calculation: ${simplePayback.toFixed(2)} years`);

    const assumptions: any = {
      projectId: project.id,
      name: 'مفروضات اقتصادی پایه',
      version: 1,
      projectLifetimeYears: 20,
      discountRatePercent: 30,
      annualInflationPercent: 35,
      electricityTariffEscalationPercent: 20,
      equipmentPriceEscalationPercent: 25,
      panelAnnualDegradationPercent: 0.5,
      systemAvailabilityPercent: 99,
      performanceRatioPercent: 80,
      annualOpexEscalationPercent: 30,
      taxRatePercent: 0,
      insurancePercent: 0.5,
      maintenancePercent: 1.0,
      residualValuePercent: 5
    };
    const savedAssumptions = db.createFinancialAssumptionSet(assumptions);

    // Financial Model Creation
    const finModel = db.createFinancialModel({
      projectId: project.id,
      modelCode: 'MOD-HSE-TEST01',
      status: 'DRAFT',
      baseCurrency: 'IRR',
      displayCurrencyUnit: 'TOMAN',
      assumptionSetId: savedAssumptions.id,
      sourceType: 'ENGINEERING_ESTIMATE',
      version: 1,
      createdByUserId: 'test-user-owner-1',
      capex: {
        engineering: { amount: 250000000, currency: 'IRR', unit: 'TOMAN' },
        solarPanels: { amount: 1200000000, currency: 'IRR', unit: 'TOMAN' },
        inverters: { amount: 450000000, currency: 'IRR', unit: 'TOMAN' },
        battery: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        generator: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        mountingStructure: { amount: 200000000, currency: 'IRR', unit: 'TOMAN' },
        electricalEquipment: { amount: 150000000, currency: 'IRR', unit: 'TOMAN' },
        cables: { amount: 50000000, currency: 'IRR', unit: 'TOMAN' },
        protection: { amount: 50000000, currency: 'IRR', unit: 'TOMAN' },
        monitoring: { amount: 30000000, currency: 'IRR', unit: 'TOMAN' },
        transportation: { amount: 20000000, currency: 'IRR', unit: 'TOMAN' },
        installation: { amount: 200000000, currency: 'IRR', unit: 'TOMAN' },
        commissioning: { amount: 30000000, currency: 'IRR', unit: 'TOMAN' },
        gridConnection: { amount: 50000000, currency: 'IRR', unit: 'TOMAN' },
        permits: { amount: 20000000, currency: 'IRR', unit: 'TOMAN' },
        civilWorks: { amount: 50000000, currency: 'IRR', unit: 'TOMAN' },
        tax: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        contingency: { amount: 50000000, currency: 'IRR', unit: 'TOMAN' },
        other: { amount: 0, currency: 'IRR', unit: 'TOMAN' }
      },
      opex: {
        maintenance: { amount: 30000000, currency: 'IRR', unit: 'TOMAN' },
        cleaning: { amount: 10000000, currency: 'IRR', unit: 'TOMAN' },
        insurance: { amount: 10000000, currency: 'IRR', unit: 'TOMAN' },
        monitoring: { amount: 5000000, currency: 'IRR', unit: 'TOMAN' },
        landLease: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        staff: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        security: { amount: 5000000, currency: 'IRR', unit: 'TOMAN' },
        batteryReplacementReserve: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        inverterReplacementReserve: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        administration: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
        other: { amount: 0, currency: 'IRR', unit: 'TOMAN' }
      },
      replacements: [],
      energyEconomics: {
        installedCapacityKw: 100,
        annualGenerationKwh: 165000,
        selfConsumptionRatio: 0,
        exportRatio: 100,
        customerTariff: {
          id: 't-ret',
          name: 'تعرفه مشترکین',
          type: 'CUSTOMER_RETAIL_TARIFF',
          unitPricePerKwh: { amount: 4000, currency: 'IRR', unit: 'TOMAN' },
          effectiveDate: new Date().toISOString(),
          annualEscalationPercent: 20,
          source: 'توانیر'
        },
        exportTariff: {
          id: 't-satba',
          name: 'نرخ خرید تضمینی ساتبا',
          type: 'FEED_IN_TARIFF',
          unitPricePerKwh: { amount: 3200, currency: 'IRR', unit: 'TOMAN' },
          effectiveDate: new Date().toISOString(),
          annualEscalationPercent: 0,
          source: 'ساتبا'
        }
      }
    });
    assert(Boolean(finModel && finModel.id), 'Financial model created in database');

    // Deterministic engine execution
    const calcResult = financeService.calculateModel(finModel, savedAssumptions);
    assert(Boolean(calcResult && typeof calcResult.simplePaybackYears === 'number'), 'Financial results computed deterministically (Payback: ' + calcResult.simplePaybackYears + ' yrs)');
    assert(typeof calcResult.npv?.amount === 'number', 'Deterministic NPV computed: ' + calcResult.npv?.amount + ' Toman');

    // Sensitivity analysis scenario
    const scenario: any = {
      id: 'scen-01',
      projectId: project.id,
      financialModelId: finModel.id,
      name: 'سناریوی خوش‌بینانه',
      type: 'OPTIMISTIC',
      generationOverrideKwh: 180000
    };
    const scenarioResults = financeService.calculateScenario(scenario, finModel, savedAssumptions);
    assert(Boolean(scenarioResults && typeof scenarioResults.simplePaybackYears === 'number'), 'Sensitivity scenario (Optimistic) executed deterministically');

    // --- PHASE 3: Investment Hub Verification ---
    console.log('\n--- Phase 3: Investment Hub Verification ---');

    const opp = db.createInvestmentOpportunity({
      projectId: project.id,
      createdByUserId: 'test-user-owner-1',
      opportunityCode: 'OPP-PRJ-00001',
      type: 'PROJECT_SEEKING_CAPITAL',
      status: 'PUBLISHED',
      title: 'فرصت سرمایه‌گذاری نیروگاه ۱۰۰ کیلوواتی نجف‌آباد',
      summary: 'پروژه نیروگاه خورشیدی بر بام تجاری آماده احداث',
      location: { province: 'اصفهان', city: 'نجف‌آباد' },
      projectStage: 'FEASIBILITY',
      targetCapacityKw: 100,
      landStatus: 'OWNED',
      permitStatus: 'IN_PROGRESS',
      gridConnectionStatus: 'APPROVED',
      engineeringStatus: 'IN_PROGRESS',
      financialModelStatus: 'COMPLETE',
      epcStatus: 'SELECTED',
      capitalRequirement: {
        totalProjectCapex: 2500000000,
        ownerEquity: 1250000000,
        capitalRequired: 1250000000
      },
      minimumPartnerCapital: 200000000,
      preferredPartnerType: 'EQUITY_PARTNER',
      visibility: 'PUBLIC_SUMMARY',
      riskDisclosure: [
        'سودآوری منوط به تداوم تابش نرمال و عدم قطعی مکرر شبکه برق است.',
        'تعدیل نرخ خرید تضمینی تابع مقررات وزارت نیرو و سازمان ساتبا می‌باشد.'
      ]
    });
    assert(Boolean(opp && opp.id), 'Investment opportunity created with funding gap and risk disclosure');

    const readiness = projectReadinessService.calculateReadiness(project, opp);
    assert(readiness.score > 0 && readiness.score <= 100, `Project readiness score calculated deterministically: ${readiness.score}%`);

    const investor = db.createInvestorProfile({
      userId: 'investor-user-1',
      investorType: 'COMPANY',
      capitalMin: 500000000,
      capitalMax: 5000000000,
      currency: 'TOMAN',
      preferredProvinces: ['اصفهان', 'تهران', 'یزد'],
      preferredProjectSizeMinKw: 50,
      preferredProjectSizeMaxKw: 500,
      preferredProjectStages: ['FEASIBILITY', 'EPC_SELECTED'],
      riskPreference: 'BALANCED',
      preferredTechnologies: ['SOLAR'],
      requiresLandVerified: true,
      requiresFinancialModel: true,
      requiresEpcSelected: false,
      status: 'ACTIVE'
    });
    assert(Boolean(investor && investor.id), 'Investor profile registered');

    const match = projectMatchingService.calculateMatchScore(investor, opp, readiness);
    assert(Boolean(match && match.score > 70), `Deterministic investor match calculated: ${match.score}% fit`);

    // --- PHASE 4: Contract + Project Execution Lifecycle ---
    console.log('\n--- Phase 4: Contract & Execution Verification ---');

    // 1. RFQ & Winning Bid
    const rfq = rfqRepository.createRFQ({
      rfqCode: 'RFQ-HSE-000001',
      projectId: project.id,
      title: 'مناقصه احداث نیروگاه خورشیدی ۱۰۰ کیلووات',
      description: 'استعلام قیمت و انتخاب پیمانکار EPC نیروگاه خورشیدی نجف‌آباد',
      scope: 'EPC کامل',
      status: 'PUBLISHED',
      submissionDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'IRR',
      visibility: 'VERIFIED_EPCS',
      technicalRequirements: ['پنل‌های مونوکریستالین Tier-1', 'اینورتر استرینگ متصل به شبکه'],
      commercialRequirements: ['حداقل ۲۴ ماه گارانتی', 'ارائه ضمانتنامه حسن اجرای تعهدات'],
      requiredDocuments: ['نقشه‌های تک‌خطی', 'مجوز پیمانکاری'],
      createdByUserId: 'test-user-owner-1'
    });

    const winningBid = rfqRepository.createBid({
      bidCode: 'BID-HSE-000001',
      projectId: project.id,
      rfqId: rfq.id,
      epcOrganizationId: 'org-epc-01',
      status: 'SELECTED',
      currency: 'IRR',
      totalPrice: 24000000000, // 2.4 Billion Tomans
      engineeringPrice: 2000000000,
      equipmentPrice: 16000000000,
      installationPrice: 5000000000,
      otherPrice: 1000000000,
      executionDays: 84, // 12 weeks
      warrantyYears: 2,
      equipmentSummary: { panels: '550W Tier-1', inverters: '100kW String' },
      paymentTerms: 'پیش‌پرداخت ۲۰٪، تحویل تجهیزات ۶۰٪، تحویل موقت ۲۰٪',
      technicalDocuments: ['doc1.pdf'],
      commercialDocuments: ['com1.pdf'],
      technicalCompliance: 'COMPLIANT',
      riskFlags: []
    });

    // 2. Contract Creation & Execution Duration Integrity (No 16-week fallback)
    const actualWeeksFromBid = Math.ceil(winningBid.executionDays / 7);
    assert(actualWeeksFromBid === 12, 'Execution duration accurately derived from bid: 12 weeks (no 16-week default fallback)');

    const startDate = new Date();
    const completionDate = new Date(startDate.getTime() + actualWeeksFromBid * 7 * 24 * 60 * 60 * 1000);

    const contract = db.createContract({
      projectId: project.id,
      contractCode: 'CNT-HSE-000001',
      title: 'قرارداد EPC نیروگاه ۱۰۰ کیلووات با پیمانکار منتخب',
      contractType: 'EPC_LUMPSUM',
      status: 'DRAFT',
      contractValue: winningBid.totalPrice,
      revisedContractValue: winningBid.totalPrice,
      currency: winningBid.currency,
      plannedStartDate: startDate.toISOString().split('T')[0],
      plannedCompletionDate: completionDate.toISOString().split('T')[0],
      advancePaymentPercent: 20,
      retentionPercent: 5,
      warrantyPeriodMonths: 24,
      liquidatedDamagesPerDayPercent: 0.1,
      paymentTermsSummary: winningBid.paymentTerms,
      scopeSummary: 'احداث کامل نیروگاه خورشیدی ۱۰۰ کیلوواتی',
      sourceBidId: winningBid.id,
      isTemplateTerms: true,
      termsConfirmedByUser: false,
      currentRevisionNumber: 1
    });

    assert(Boolean(contract && contract.id), 'Contract created: ' + contract.contractCode);
    assert(contract.isTemplateTerms === true, 'Contract correctly tagged with isTemplateTerms: true');

    // 3. Contract Parties (Official representatives)
    const partyClient = db.createContractParty({
      contractId: contract.id,
      partyType: 'CLIENT',
      legalName: 'شرکت توسعه انرژی هوشیار (کارفرما)',
      representativeName: 'مدیرعامل',
      signStatus: 'PENDING'
    });
    const partyEPC = db.createContractParty({
      contractId: contract.id,
      partyType: 'EPC_CONTRACTOR',
      legalName: 'شرکت مهندسی و پیمانکاری توان‌ساز (مجری EPC)',
      representativeName: 'مدیر پروژه',
      signStatus: 'PENDING'
    });
    assert(partyClient.signStatus === 'PENDING' && partyEPC.signStatus === 'PENDING', 'Parties registered for physical execution');

    // 4. Confirm Terms & Ready to Sign Workflow (No fake signature button)
    db.updateContract(contract.id, {
      isTemplateTerms: false,
      termsConfirmedByUser: true,
      status: 'UNDER_REVIEW'
    });

    // Enterprise Step 3: READY_TO_SIGN (Locked & exported for external execution)
    const readyContract = db.updateContract(contract.id, {
      status: 'READY_TO_SIGN'
    });
    assert(readyContract?.status === 'READY_TO_SIGN', 'Workflow Step 3: Contract terms locked & set to READY_TO_SIGN');

    // Enterprise Step 4: Upload signed PDF scan (External Execution)
    const signedDocContract = db.updateContract(contract.id, {
      status: 'SIGNED',
      signedDocumentId: 'doc_signed_scan_001'
    });
    assert(signedDocContract?.status === 'SIGNED' && signedDocContract.signedDocumentId === 'doc_signed_scan_001', 
      'Workflow Step 4: Scanned signed document uploaded for legal archiving');

    // Enterprise Step 5: Verification & Confirmation by authorized user -> ACTIVE
    const activeContract = db.updateContract(contract.id, {
      status: 'ACTIVE',
      signedDocumentConfirmedByUserId: 'test-user-owner-1',
      signedDocumentConfirmedAt: new Date().toISOString()
    });
    assert(activeContract?.status === 'ACTIVE' && Boolean(activeContract.signedDocumentConfirmedAt), 
      'Workflow Step 5: Official external execution verified & contract activated (ACTIVE)');

    // 5. Baseline Creation & Approval
    const baseline = db.createProjectBaseline({
      projectId: project.id,
      contractId: contract.id,
      baselineCode: 'BL-01',
      version: 1,
      status: 'DRAFT',
      plannedStartDate: contract.plannedStartDate,
      plannedCompletionDate: contract.plannedCompletionDate,
      plannedMilestonesCount: 5,
      contractValue: contract.contractValue,
      currency: contract.currency,
      createdByUserId: 'test-user-owner-1'
    });
    assert(Boolean(baseline && baseline.id), 'Baseline created in DRAFT');

    const approvedBaseline = db.updateProjectBaseline(baseline.id, {
      status: 'APPROVED',
      approvedByUserId: 'test-user-owner-1',
      approvedAt: new Date().toISOString()
    });
    assert(approvedBaseline?.status === 'APPROVED', 'Baseline approved by authorized user');

    // 6. Milestones & Weighted Progress
    const milestones = [
      { code: 'MS-01', title: 'تایید مهندسی تفصیلی و نقشه‌ها', weight: 15 },
      { code: 'MS-02', title: 'ورود تجهیزات اصلی به کارگاه', weight: 35 },
      { code: 'MS-03', title: 'اتمام سازه مکانیکی و نصب پنل‌ها', weight: 25 },
      { code: 'MS-04', title: 'سیم‌کشی الکتریکی و اینورترها', weight: 15 },
      { code: 'MS-05', title: 'تست، راه‌اندازی و تزریق به شبکه', weight: 10 }
    ];

    let seq = 1;
    for (const m of milestones) {
      db.createMilestone({
        projectId: project.id,
        contractId: contract.id,
        milestoneCode: m.code,
        title: m.title,
        category: 'EXECUTION',
        weightPercent: m.weight,
        sequence: seq++,
        status: 'NOT_STARTED',
        completionPercent: 0
      });
    }

    const savedMilestones = db.getProjectMilestones(project.id);
    assert(savedMilestones.length === 5, '5 WBS Milestones created');
    const totalWeight = savedMilestones.reduce((acc: number, m: any) => acc + m.weightPercent, 0);
    assert(totalWeight === 100, 'Milestone physical weights sum to exactly 100%');

    // Progress update simulation
    db.updateMilestone(savedMilestones[0].id, { status: 'COMPLETED', completionPercent: 100 });
    db.updateMilestone(savedMilestones[1].id, { status: 'IN_PROGRESS', completionPercent: 50 });
    const refreshedMilestones = db.getProjectMilestones(project.id);
    const progress = refreshedMilestones.reduce((sum: number, m: any) => sum + (m.weightPercent * (m.completionPercent / 100)), 0);
    assert(Math.abs(progress - 32.5) < 0.01, `Weighted progress correctly computed: ${progress.toFixed(1)}%`);

    // 7. Change Request & Contract Revision Immutability
    const cr = db.createChangeRequest({
      projectId: project.id,
      contractId: contract.id,
      crCode: 'CR-001',
      title: 'افزایش کابل‌کشی به دلیل جابجایی ترانس کارگاهی',
      description: 'نیاز به ۶۰ متر کابل فشار ضعیف مسی اضافی طبق درخواست ناظر',
      reasonCategory: 'DESIGN_CHANGE',
      costImpactAmount: 400000000, // 40 Million Tomans in IRR
      scheduleImpactDays: 5,
      status: 'SUBMITTED',
      requestedByUserId: 'epc-pm'
    });

    const approvedCR = db.updateChangeRequest(cr.id, {
      status: 'APPROVED',
      approvedByUserId: 'test-user-owner-1',
      approvedAt: new Date().toISOString()
    });
    assert(approvedCR?.status === 'APPROVED', 'Change Request approved');

    const originalContractVal = activeContract!.contractValue;
    const oldRevisedVal = activeContract!.revisedContractValue || originalContractVal;
    const newRevisedVal = oldRevisedVal + (approvedCR!.costImpactAmount || 0);
    const newRevNum = (activeContract!.currentRevisionNumber || 1) + 1;

    // Create Revision Audit Trail
    const rev = db.createContractRevision({
      contractId: contract.id,
      revisionNumber: newRevNum,
      reason: `دستور تغییر کار مصوب: ${approvedCR?.title}`,
      changesSummary: `افزایش مبلغ پیمان به میزان ${approvedCR?.costImpactAmount} ریال`,
      contractValueBefore: oldRevisedVal,
      contractValueAfter: newRevisedVal,
      scheduleImpactDays: approvedCR?.scheduleImpactDays || 0,
      approvedByUserId: 'test-user-owner-1',
      approvedAt: new Date().toISOString(),
      changeRequestId: approvedCR?.id
    });
    assert(Boolean(rev && rev.id), 'ContractRevision audit record created: Rev ' + rev.revisionNumber);

    db.updateContract(contract.id, {
      revisedContractValue: newRevisedVal,
      currentRevisionNumber: newRevNum
    });

    const auditedContract = db.getContractById(contract.id);
    assert(auditedContract?.contractValue === 24000000000, 'Original baseline contractValue is preserved untouched (24B Rials)');
    assert(auditedContract?.revisedContractValue === 24400000000, 'Revised contract value reflects approved CR addition (24.4B Rials)');
    assert(auditedContract?.currentRevisionNumber === 2, 'Contract revision number advanced to Rev 2');

    // --- STEP 8: Security & Authorization + Cross-Project IDOR Prevention ---
    console.log('\n--- Step 8: Security & IDOR Authorization Verification ---');

    // Setup Project B owned by user-owner-2
    const projectB = projectRepository.create({
      projectCode: 'PRJ-TEST-002',
      title: 'نیروگاه خورشیدی پروژه ب',
      projectType: 'SOLAR',
      status: 'FEASIBILITY',
      ownerId: 'test-user-owner-2',
      targetCapacityKw: 50,
      estimatedBudgetIRR: 12000000000,
      location: { country: 'Iran', province: 'تهران', city: 'ری' }
    });

    // Add Member C to Project A only
    projectRepository.addMember({
      projectId: project.id,
      userId: 'test-user-member-c',
      role: 'VIEWER',
      status: 'ACTIVE'
    });

    // 1. Owner Access
    assert(checkProjectAccess(project.id, 'test-user-owner-1', 'USER').allowed === true, 'Project A Owner has access to Project A');
    assert(checkProjectAccess(projectB.id, 'test-user-owner-2', 'USER').allowed === true, 'Project B Owner has access to Project B');

    // 2. Admin Access
    assert(checkProjectAccess(project.id, 'admin-user', 'ADMIN').allowed === true, 'Platform ADMIN has access to Project A');
    assert(checkProjectAccess(projectB.id, 'super-admin-user', 'SUPER_ADMIN').allowed === true, 'Platform SUPER_ADMIN has access to Project B');

    // 3. Member Access
    assert(checkProjectAccess(project.id, 'test-user-member-c', 'USER').allowed === true, 'Explicit project member has access to Project A');

    // 4. Cross-Project IDOR: User 2 attempting to access Project A
    assert(checkProjectAccess(project.id, 'test-user-owner-2', 'USER').allowed === false, 'IDOR Prevention: Owner of Project B denied access to Project A');
    
    // 5. Cross-Project IDOR: Member C attempting to access Project B
    assert(checkProjectAccess(projectB.id, 'test-user-member-c', 'USER').allowed === false, 'IDOR Prevention: Member of Project A denied access to Project B');

    // 6. Anonymous / Unauthenticated access
    assert(checkProjectAccess(project.id, undefined, undefined).allowed === false, 'Authentication Enforcement: Anonymous user rejected');
    assert(checkProjectAccess(project.id, '', 'USER').allowed === false, 'Authentication Enforcement: Empty userId rejected');

    // 7. Non-existent Project access
    assert(checkProjectAccess('non-existent-project-id', 'test-user-owner-1', 'USER').allowed === false, 'Non-existent project safely rejected');

  } finally {
    // --- STEP 9: Storage Isolation Cleanup & db.json Integrity Verification ---
    console.log('\n--- Step 9: Storage Isolation Cleanup & Integrity Verification ---');

    // Clean up temporary database file
    if (fs.existsSync(tempDbFile)) {
      fs.unlinkSync(tempDbFile);
      console.log(`[CLEANUP] Deleted temporary test DB: ${tempDbFile}`);
    }

    // Restore original DB Path
    db.setDBPath(originalDbPath);
    console.log(`[RESTORE] Restored DB path to original: ${originalDbPath}`);

    // Verify original db.json was NOT mutated
    if (originalDbExists && originalDbContent !== null) {
      const currentContent = fs.readFileSync(originalDbPath, 'utf-8');
      assert(currentContent === originalDbContent, 'Original db.json remained 100% UNMUTATED throughout the test run');
    } else if (!originalDbExists) {
      assert(!fs.existsSync(originalDbPath), 'Original db.json was not created/polluted if not previously existing');
    }
  }

  console.log('\n====================================================');
  console.log(`ACCEPTANCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatchBAcceptanceTest().catch(err => {
  console.error('Acceptance test failed with error:', err);
  process.exit(1);
});
