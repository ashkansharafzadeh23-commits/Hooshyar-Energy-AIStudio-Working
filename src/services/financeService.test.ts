import { financeService } from './financeService';
import { FinancialAssumptionSet, ProjectFinancialModel, ReplacementEvent } from '../types/finance';

// Mock data
const mockAssumptions: FinancialAssumptionSet = {
  id: '1', projectId: '1', name: 'Base', version: 1,
  projectLifetimeYears: 20,
  discountRatePercent: 30,
  annualInflationPercent: 40,
  electricityTariffEscalationPercent: 20,
  equipmentPriceEscalationPercent: 30,
  panelAnnualDegradationPercent: 0.5,
  systemAvailabilityPercent: 99,
  performanceRatioPercent: 80,
  annualOpexEscalationPercent: 30,
  taxRatePercent: 0,
  insurancePercent: 0,
  maintenancePercent: 0,
  residualValuePercent: 0,
  createdAt: '', updatedAt: ''
};

const mockModel: ProjectFinancialModel = {
  id: '1', projectId: '1', modelCode: 'MOD-1', status: 'DRAFT',
  baseCurrency: 'IRR', displayCurrencyUnit: 'TOMAN',
  assumptionSetId: '1', sourceType: 'MANUAL_ESTIMATE', version: 1, createdByUserId: '1', createdAt: '', updatedAt: '',
  capex: {
    engineering: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    solarPanels: { amount: 100, currency: 'IRR', unit: 'TOMAN' }, // simplified numbers
    inverters: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    battery: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    generator: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    mountingStructure: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    electricalEquipment: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    cables: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    protection: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    monitoring: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    transportation: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    installation: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    commissioning: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    gridConnection: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    permits: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    civilWorks: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    tax: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    contingency: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    other: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    total: { amount: 0, currency: 'IRR', unit: 'TOMAN' }
  },
  opex: {
    maintenance: { amount: 10, currency: 'IRR', unit: 'TOMAN' },
    cleaning: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    insurance: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    monitoring: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    landLease: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    staff: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    security: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    batteryReplacementReserve: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    inverterReplacementReserve: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    administration: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    other: { amount: 0, currency: 'IRR', unit: 'TOMAN' },
    totalYear1: { amount: 0, currency: 'IRR', unit: 'TOMAN' }
  },
  replacements: [],
  energyEconomics: {
    installedCapacityKw: 10,
    annualGenerationKwh: 100, // keep it simple
    selfConsumptionRatio: 100,
    exportRatio: 0,
    customerTariff: { id: '1', name: 'Retail', type: 'CUSTOMER_RETAIL_TARIFF', unitPricePerKwh: { amount: 1, currency: 'IRR', unit: 'TOMAN' }, effectiveDate: '', annualEscalationPercent: 0, source: '' },
    exportTariff: { id: '2', name: 'Feed-in', type: 'FEED_IN_TARIFF', unitPricePerKwh: { amount: 0, currency: 'IRR', unit: 'TOMAN' }, effectiveDate: '', annualEscalationPercent: 0, source: '' }
  }
};

// Extremely simple tests just to show the structure exists and calculates something
console.log('Testing finance service...');
const results = financeService.calculateModel(mockModel, mockAssumptions);
console.log('Total Capex:', results.totalCapex.amount === 100 ? 'PASS' : 'FAIL');
console.log('Annual Opex Year 1:', results.annualOpexYear1.amount === 10 ? 'PASS' : 'FAIL');
console.log('Year 1 savings:', results.annualSavingsYear1.amount === 100 ? 'PASS' : 'FAIL'); // 100 kWh * 1 Toman
console.log('IRR calculation returns a value:', results.irrPercent !== undefined ? 'PASS' : 'FAIL');
