import { Router } from 'express';
import { financingRepository } from '../repositories/financingRepository.js';
import { financeService } from '../services/financeService.js';
import { ProjectFinancialModel, FinancialAssumptionSet, FinancialScenario } from '../types/finance.js';
import { verifyAuthToken } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { ProjectMemberRole } from '../types/project.js';

const router = Router();

// Enforce authentication on financial model routes
router.use(verifyAuthToken);

// Helper for project authorization in finance routes
function requireFinanceAccess(allowedMemberRoles?: ProjectMemberRole[], requireOwnerOrAdmin: boolean = false) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'احراز هویت انجام نشده است (Unauthorized)' });
    }

    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'شناسه پروژه الزامی است' });
    }

    const access = checkProjectAccess(projectId, user.id, user.role, allowedMemberRoles);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    if (requireOwnerOrAdmin && !access.isOwner && user.role !== 'admin') {
      return res.status(403).json({ error: 'تنها مالک پروژه یا مدیر سامانه مجاز به انجام این عملیات است' });
    }

    req.project = access.project;
    req.projectAccess = access;
    next();
  };
}

// Get financial models by project ID
router.get('/projects/:projectId/financial-models', requireFinanceAccess(), (req, res) => {
  const models = financingRepository.getFinancialModelsByProjectId(req.params.projectId);
  res.json(models);
});

// Get financial model by ID with assumptions
router.get('/projects/:projectId/financial-models/:modelId', requireFinanceAccess(), (req, res) => {
  const { projectId, modelId } = req.params;
  const model = financingRepository.getFinancialModelById(modelId);
  if (!model || model.projectId !== projectId) {
    return res.status(404).json({ error: 'مدل مالی متعلق به این پروژه یافت نشد' });
  }

  const assumptions = financingRepository.getFinancialAssumptionSetById(model.assumptionSetId);
  res.json({ model, assumptions });
});

// Create financial model from selected EPC bid
router.post('/projects/:projectId/financial-models/from-bid', requireFinanceAccess(['OWNER', 'EPC', 'CONSULTANT', 'INVESTOR'], false), (req: any, res) => {
  const { projectId } = req.params;
  const { bidId } = req.body;
  
  const project = req.project;

  // Look for bid either by bidId or find selected bid for project's RFQ
  const rfqs = financingRepository.getRFQsByProjectId ? financingRepository.getRFQsByProjectId(projectId) : [];
  let bid = null;
  if (bidId && financingRepository.getBidById) {
    bid = financingRepository.getBidById(bidId);
  } else if (rfqs.length > 0 && financingRepository.getBidsByRfqId) {
    const bids = financingRepository.getBidsByRfqId(rfqs[0].id);
    bid = bids.find((b: any) => b.status === 'SELECTED') || bids[0];
  }

  if (!bid) {
    return res.status(400).json({ error: 'پیشنهاد EPC معتبری برای استخراج داده‌های مالی یافت نشد' });
  }

  // Cross-project IDOR check: bid must belong to this project
  if (bid.projectId && bid.projectId !== projectId) {
    return res.status(403).json({ error: 'پیشنهاد مورد نظر متعلق به این پروژه نیست' });
  }

  const capacityKw = bid.technicalProposal?.systemCapacityKw || project.targetCapacityKw || 100;
  const unit = bid.currency === 'TOMAN' ? 'TOMAN' : 'TOMAN'; // Normalize display to TOMAN
  const bidTotalPrice = bid.currency === 'IRR' ? bid.totalPrice / 10 : bid.totalPrice;

  // Breakdown based on actual EPC bid proportions (standard deterministic ratios from engineering practice)
  const equipmentRatio = 0.65;
  const installationRatio = 0.20;
  const engineeringRatio = 0.10;
  const contingencyRatio = 0.05;

  const newModel: Omit<ProjectFinancialModel, 'id' | 'createdAt' | 'updatedAt'> = {
    projectId,
    modelCode: 'MOD-EPC-' + Date.now(),
    status: 'DRAFT',
    baseCurrency: 'IRR',
    displayCurrencyUnit: unit,
    sourceType: 'SELECTED_EPC_BID',
    selectedBidId: bid.id,
    version: 1,
    createdByUserId: req.user?.id || req.body.userId || 'system',
    capex: {
      engineering: { amount: Math.round(bidTotalPrice * engineeringRatio), currency: 'IRR', unit },
      solarPanels: { amount: Math.round(bidTotalPrice * equipmentRatio * 0.65), currency: 'IRR', unit },
      inverters: { amount: Math.round(bidTotalPrice * equipmentRatio * 0.25), currency: 'IRR', unit },
      battery: { amount: 0, currency: 'IRR', unit },
      generator: { amount: 0, currency: 'IRR', unit },
      mountingStructure: { amount: Math.round(bidTotalPrice * equipmentRatio * 0.10), currency: 'IRR', unit },
      electricalEquipment: { amount: 0, currency: 'IRR', unit },
      cables: { amount: 0, currency: 'IRR', unit },
      protection: { amount: 0, currency: 'IRR', unit },
      monitoring: { amount: 0, currency: 'IRR', unit },
      transportation: { amount: 0, currency: 'IRR', unit },
      installation: { amount: Math.round(bidTotalPrice * installationRatio), currency: 'IRR', unit },
      commissioning: { amount: 0, currency: 'IRR', unit },
      gridConnection: { amount: 0, currency: 'IRR', unit },
      permits: { amount: 0, currency: 'IRR', unit },
      civilWorks: { amount: 0, currency: 'IRR', unit },
      tax: { amount: 0, currency: 'IRR', unit },
      contingency: { amount: Math.round(bidTotalPrice * contingencyRatio), currency: 'IRR', unit },
      other: { amount: 0, currency: 'IRR', unit },
      total: { amount: bidTotalPrice, currency: 'IRR', unit }
    },
    opex: {
      maintenance: { amount: Math.round(bidTotalPrice * 0.01), currency: 'IRR', unit }, // standard 1% opex
      cleaning: { amount: Math.round(bidTotalPrice * 0.003), currency: 'IRR', unit },
      insurance: { amount: Math.round(bidTotalPrice * 0.002), currency: 'IRR', unit },
      monitoring: { amount: Math.round(bidTotalPrice * 0.001), currency: 'IRR', unit },
      landLease: { amount: 0, currency: 'IRR', unit },
      staff: { amount: 0, currency: 'IRR', unit },
      security: { amount: 0, currency: 'IRR', unit },
      batteryReplacementReserve: { amount: 0, currency: 'IRR', unit },
      inverterReplacementReserve: { amount: 0, currency: 'IRR', unit },
      administration: { amount: 0, currency: 'IRR', unit },
      other: { amount: 0, currency: 'IRR', unit },
      totalYear1: { amount: Math.round(bidTotalPrice * 0.016), currency: 'IRR', unit }
    },
    replacements: [
      {
        year: 12,
        componentType: 'اینورتر خورشیدی (Inverter Replacement)',
        estimatedCost: { amount: Math.round(bidTotalPrice * equipmentRatio * 0.25 * 0.8), currency: 'IRR', unit }
      }
    ],
    energyEconomics: {
      installedCapacityKw: capacityKw,
      annualGenerationKwh: capacityKw * 1650, // 1650 specific yield (kWh/kWp/year) for Iran average
      selfConsumptionRatio: 0,
      exportRatio: 100,
      customerTariff: {
        id: 'tariff-retail',
        name: 'تعرفه مشترکین (Retail)',
        type: 'CUSTOMER_RETAIL_TARIFF',
        unitPricePerKwh: { amount: 4000, currency: 'IRR', unit },
        effectiveDate: new Date().toISOString(),
        annualEscalationPercent: 25,
        source: 'توانیر'
      },
      exportTariff: {
        id: 'tariff-satba',
        name: 'نرخ خرید تضمینی ساتبا (SATBA FIT)',
        type: 'FEED_IN_TARIFF',
        unitPricePerKwh: { amount: 32000, currency: 'IRR', unit },
        effectiveDate: new Date().toISOString(),
        annualEscalationPercent: 0,
        source: 'ساتبا مصوبه ۱۴۰۳'
      }
    }
  };

  const newAssumptions: Omit<FinancialAssumptionSet, 'id' | 'createdAt' | 'updatedAt'> = {
    projectId,
    name: 'مفروضات اقتصادی مصوب (مبتنی بر پیشنهاد EPC)',
    version: 1,
    projectLifetimeYears: 20,
    discountRatePercent: 30, // نرخ تنزیل پایه ۳۰٪
    annualInflationPercent: 35,
    electricityTariffEscalationPercent: 20,
    equipmentPriceEscalationPercent: 25,
    panelAnnualDegradationPercent: 0.5,
    systemAvailabilityPercent: 99,
    performanceRatioPercent: 80,
    annualOpexEscalationPercent: 30,
    taxRatePercent: 0, // معافیت مالیاتی ماده ۱۳۲ ق.م.م برای نیروگاه‌های تجدیدپذیر
    insurancePercent: 0.5,
    maintenancePercent: 1.0,
    residualValuePercent: 5
  };

  const savedAssumptions = financingRepository.createFinancialAssumptionSet(newAssumptions);
  (newModel as any).assumptionSetId = savedAssumptions.id;

  const savedModel = financingRepository.createFinancialModel(newModel);

  // Calculate results immediately
  const results = financeService.calculateModel(savedModel, savedAssumptions);
  const updatedModel = financingRepository.updateFinancialModel(savedModel.id, {
    results,
    status: 'CALCULATED',
    calculatedAt: new Date().toISOString()
  });

  res.json({ model: updatedModel, assumptions: savedAssumptions });
});

// Create financial model (custom inputs)
router.post('/projects/:projectId/financial-models', requireFinanceAccess(['OWNER', 'EPC', 'CONSULTANT'], false), (req: any, res) => {
  const { model, assumptions } = req.body;
  if (!model) return res.status(400).json({ error: 'داده‌های مدل مالی ارسال نشده است' });
  
  const newAssumptions = financingRepository.createFinancialAssumptionSet({
    ...assumptions,
    projectId: req.params.projectId
  });
  model.assumptionSetId = newAssumptions.id;
  model.projectId = req.params.projectId;
  model.createdByUserId = req.user?.id || model.createdByUserId;
  
  const newModel = financingRepository.createFinancialModel(model);
  
  // Auto-calculate if inputs permit
  try {
    const results = financeService.calculateModel(newModel, newAssumptions);
    const updatedModel = financingRepository.updateFinancialModel(newModel.id, {
      results,
      status: 'CALCULATED',
      calculatedAt: new Date().toISOString()
    });
    return res.json({ model: updatedModel, assumptions: newAssumptions });
  } catch (err) {
    return res.json({ model: newModel, assumptions: newAssumptions });
  }
});

// Calculate financial model
router.post('/projects/:projectId/financial-models/:modelId/calculate', requireFinanceAccess(), (req, res) => {
  const { projectId, modelId } = req.params;
  const model = financingRepository.getFinancialModelById(modelId);
  if (!model || model.projectId !== projectId) {
    return res.status(404).json({ error: 'مدل مالی متعلق به این پروژه یافت نشد' });
  }
  
  const assumptions = financingRepository.getFinancialAssumptionSetById(model.assumptionSetId);
  if (!assumptions) return res.status(404).json({ error: 'مفروضات مالی مدل یافت نشد' });
  
  const results = financeService.calculateModel(model, assumptions);
  
  const updatedModel = financingRepository.updateFinancialModel(model.id, { 
    results, 
    status: 'CALCULATED',
    calculatedAt: new Date().toISOString() 
  });
  res.json(updatedModel);
});

// Create scenario
router.post('/projects/:projectId/financial-models/:modelId/scenarios', requireFinanceAccess(['OWNER', 'EPC', 'CONSULTANT', 'INVESTOR'], false), (req, res) => {
  const { projectId, modelId } = req.params;
  const model = financingRepository.getFinancialModelById(modelId);
  if (!model || model.projectId !== projectId) {
    return res.status(404).json({ error: 'مدل مالی متعلق به این پروژه یافت نشد' });
  }
  
  const assumptions = financingRepository.getFinancialAssumptionSetById(model.assumptionSetId);
  if (!assumptions) return res.status(404).json({ error: 'مفروضات مالی مدل یافت نشد' });
  
  const scenarioData = req.body;
  scenarioData.projectId = projectId;
  scenarioData.financialModelId = modelId;
  
  // Calculate scenario results before saving
  const results = financeService.calculateScenario(scenarioData, model, assumptions);
  scenarioData.results = results;
  
  const newScenario = financingRepository.createFinancialScenario(scenarioData);
  res.json(newScenario);
});

// Get scenarios
router.get('/projects/:projectId/financial-models/:modelId/scenarios', requireFinanceAccess(), (req, res) => {
  const { projectId, modelId } = req.params;
  const model = financingRepository.getFinancialModelById(modelId);
  if (!model || model.projectId !== projectId) {
    return res.status(404).json({ error: 'مدل مالی متعلق به این پروژه یافت نشد' });
  }

  const scenarios = financingRepository.getFinancialScenariosByModelId(modelId);
  res.json(scenarios);
});

export default router;
