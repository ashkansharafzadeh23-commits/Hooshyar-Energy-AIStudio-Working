export type ModelStatus = 'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'LOCKED' | 'SUPERSEDED';
export type SourceType = 'MANUAL_ESTIMATE' | 'ENGINEERING_ESTIMATE' | 'SELECTED_EPC_BID' | 'HYBRID';
export type ScenarioType = 'BASE' | 'CONSERVATIVE' | 'OPTIMISTIC' | 'CUSTOM';
export type ProposalStatus = 'DRAFT' | 'GENERATED' | 'SHARED' | 'SUPERSEDED';

export interface MoneyAmount {
  amount: number;
  currency: 'IRR';
  unit: 'RIAL' | 'TOMAN';
}

export interface FinancialAssumptionSet {
  id: string;
  projectId: string;
  name: string;
  version: number;
  
  projectLifetimeYears: number;
  discountRatePercent: number;
  annualInflationPercent: number;
  electricityTariffEscalationPercent: number;
  equipmentPriceEscalationPercent: number;
  panelAnnualDegradationPercent: number;
  systemAvailabilityPercent: number;
  performanceRatioPercent: number;
  annualOpexEscalationPercent: number;
  
  taxRatePercent: number;
  insurancePercent: number;
  maintenancePercent: number;
  residualValuePercent: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface TariffProfile {
  id: string;
  name: string;
  type: 'CUSTOMER_RETAIL_TARIFF' | 'FEED_IN_TARIFF' | 'PPA' | 'GREEN_MARKET' | 'CUSTOM';
  unitPricePerKwh: MoneyAmount;
  effectiveDate: string;
  expiryDate?: string;
  annualEscalationPercent: number;
  source: string;
  notes?: string;
}

export interface ReplacementEvent {
  year: number;
  componentType: string;
  estimatedCost: MoneyAmount;
  notes?: string;
}

export interface FinancialResults {
  totalCapex: MoneyAmount;
  annualOpexYear1: MoneyAmount;
  annualGenerationYear1Kwh: number;
  annualSavingsYear1: MoneyAmount;
  annualExportRevenueYear1: MoneyAmount;
  annualNetBenefitYear1: MoneyAmount;
  
  simplePaybackYears: number | 'NO_PAYBACK_WITHIN_PROJECT_LIFE';
  discountedPaybackYears: number | 'NO_PAYBACK_WITHIN_PROJECT_LIFE';
  npv: MoneyAmount;
  irrPercent: number | 'IRR_NOT_AVAILABLE';
  lifetimeRoiPercent: number;
  lcoePerKwh: MoneyAmount;
  
  totalLifetimeRevenue: MoneyAmount;
  totalLifetimeOpex: MoneyAmount;
  totalLifetimeNetCashFlow: MoneyAmount;
  breakEvenYear?: number;
}

export interface FinancialScenario {
  id: string;
  projectId: string;
  financialModelId: string;
  name: string;
  type: ScenarioType;
  
  // Overrides
  capexOverride?: MoneyAmount;
  opexOverride?: MoneyAmount;
  generationOverrideKwh?: number;
  tariffOverride?: MoneyAmount;
  discountRateOverridePercent?: number;
  projectLifetimeOverrideYears?: number;
  
  results?: FinancialResults;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFinancialModel {
  id: string;
  projectId: string;
  modelCode: string;
  status: ModelStatus;
  
  baseCurrency: 'IRR';
  displayCurrencyUnit: 'RIAL' | 'TOMAN';
  
  assumptionSetId?: string;
  sourceType: SourceType;
  selectedBidId?: string;
  engineeringDesignId?: string;
  
  capex: {
    engineering: MoneyAmount;
    solarPanels: MoneyAmount;
    inverters: MoneyAmount;
    battery: MoneyAmount;
    generator: MoneyAmount;
    mountingStructure: MoneyAmount;
    electricalEquipment: MoneyAmount;
    cables: MoneyAmount;
    protection: MoneyAmount;
    monitoring: MoneyAmount;
    transportation: MoneyAmount;
    installation: MoneyAmount;
    commissioning: MoneyAmount;
    gridConnection: MoneyAmount;
    permits: MoneyAmount;
    civilWorks: MoneyAmount;
    tax: MoneyAmount;
    contingency: MoneyAmount;
    other: MoneyAmount;
    total: MoneyAmount;
  };
  
  opex: {
    maintenance: MoneyAmount;
    cleaning: MoneyAmount;
    insurance: MoneyAmount;
    monitoring: MoneyAmount;
    landLease: MoneyAmount;
    staff: MoneyAmount;
    security: MoneyAmount;
    batteryReplacementReserve: MoneyAmount;
    inverterReplacementReserve: MoneyAmount;
    administration: MoneyAmount;
    other: MoneyAmount;
    totalYear1: MoneyAmount;
  };
  
  replacements: ReplacementEvent[];
  
  energyEconomics: {
    installedCapacityKw: number;
    annualGenerationKwh: number;
    selfConsumptionRatio: number;
    exportRatio: number;
    customerTariff: TariffProfile;
    exportTariff: TariffProfile;
  };
  
  results?: FinancialResults;
  
  version: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  calculatedAt?: string;
}

export interface ProjectProposal {
  id: string;
  projectId: string;
  proposalCode: string;
  financialModelId: string;
  scenarioId?: string;
  version: number;
  status: ProposalStatus;
  createdAt: string;
  generatedByUserId: string;
}
