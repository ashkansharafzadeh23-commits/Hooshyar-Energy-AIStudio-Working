export type EnergyAssetType = 'SOLAR_PV' | 'SOLAR' | 'SOLAR_BATTERY' | 'SOLAR_GENERATOR' | 'HYBRID' | 'GENERATOR' | 'BATTERY_STORAGE';
export type EnergyAssetStatus = 'COMMISSIONING' | 'OPERATIONAL' | 'PARTIALLY_OPERATIONAL' | 'SUSPENDED' | 'UNDER_MAINTENANCE' | 'DECOMMISSIONED';

export interface EnergyAsset {
  id: string;
  assetCode: string;
  projectId?: string;
  ownerId?: string;
  organizationId?: string;
  assetType: EnergyAssetType;
  status?: EnergyAssetStatus;
  operationalStatus?: string;
  gridConnectionStatus?: string;
  name: string;
  location?: string;
  installedCapacityKw: number;
  batteryCapacityKwh?: number;
  generatorCapacityKva?: number;
  technology?: string;
  commissioningDate?: string;
  commercialOperationDate?: string;
  epcOrganizationId?: string;
  primaryContractId?: string;
  financialModelId?: string;
  assetValue?: number;
  expectedAnnualGenerationKwh?: number;
  designLifetimeYears?: number;
  verificationStatus?: string;
  passportVersion?: number;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

export type CommissioningStatus = 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface CommissioningRecord {
  id: string;
  projectId: string;
  assetId?: string;
  status: CommissioningStatus;
  plannedDate?: string;
  actualDate?: string;
  performedByOrganizationId?: string;
  approvedByUserId?: string;
  tests: string[]; // CommissioningTest IDs
  documents: string[]; // Document IDs
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CommissioningTestStatus = 'NOT_STARTED' | 'PASSED' | 'FAILED' | 'WAIVED' | 'REQUIRES_RETEST';
export type CommissioningTestType = 'INSULATION_RESISTANCE' | 'GROUNDING_RESISTANCE' | 'STRING_VOLTAGE' | 'STRING_CURRENT' | 'INVERTER_STARTUP' | 'PROTECTION_RELAY' | 'GRID_SYNCHRONIZATION' | 'BATTERY_CHARGE_DISCHARGE' | 'GENERATOR_LOAD_TEST' | 'MONITORING_COMMUNICATION' | 'METER_VALIDATION' | 'VISUAL_INSPECTION' | 'OTHER';

export interface CommissioningTest {
  id: string;
  commissioningRecordId: string;
  testType: CommissioningTestType;
  status: CommissioningTestStatus;
  measuredValue?: string;
  expectedRange?: string;
  unit?: string;
  performedAt?: string;
  performedBy?: string;
  evidenceDocumentIds?: string[];
  notes?: string;
}

export type AssetComponentType = 'SOLAR_PANEL' | 'INVERTER' | 'BATTERY' | 'GENERATOR' | 'TRANSFORMER' | 'METER' | 'MONITORING_DEVICE' | 'COMBINER_BOX' | 'SWITCHGEAR' | 'PROTECTION_DEVICE' | 'TRACKER' | 'OTHER';
export type AssetComponentStatus = 'INSTALLED' | 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'FAILED' | 'REPLACED' | 'DECOMMISSIONED';

export interface AssetComponent {
  id: string;
  assetId: string;
  projectId?: string;
  componentType: AssetComponentType;
  manufacturer: string;
  brand: string;
  model: string;
  serialNumber?: string;
  quantity: number;
  ratedCapacity?: number;
  capacityUnit?: string;
  installationDate?: string;
  commissioningDate?: string;
  purchaseOrderId?: string;
  vendorId?: string;
  warrantyId?: string;
  status: AssetComponentStatus;
  locationWithinAsset?: string;
  datasheetDocumentId?: string;
  replacedComponentId?: string;
  replacementReason?: string;
  replacementDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentWarrantyStatus = 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'CLAIM_IN_PROGRESS' | 'VOID' | 'INSUFFICIENT_DATA';
export type WarrantyType = 'PRODUCT' | 'PERFORMANCE' | 'WORKMANSHIP' | 'BATTERY' | 'INVERTER' | 'EPC' | 'O_AND_M' | 'MANUFACTURER' | 'OTHER';

export interface EquipmentWarranty {
  id: string;
  assetId: string;
  projectId?: string;
  purchaseOrderId?: string;
  boqItemId?: string;
  componentId?: string;
  equipmentType?: string;
  warrantyProvider?: string;
  provider?: string;
  vendorName?: string;
  warrantyType: WarrantyType;
  startDate: string;
  endDate: string;
  coverageSummary: string;
  claimProcedure?: string;
  documentId?: string;
  status: EquipmentWarrantyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AssetPassportSnapshot {
  id: string;
  assetId: string;
  version: number;
  snapshot: any;
  generatedAt: string;
  generatedBy: string;
  reason?: string;
}

export interface AssetOwnershipRecord {
  id: string;
  assetId: string;
  ownerUserId?: string;
  ownerOrganizationId?: string;
  ownershipType: string;
  sharePercent: number;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceDocumentId?: string;
  verificationStatus?: string;
  createdAt: string;
}

export type HandoverStatus = 'DRAFT' | 'READY' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface ProjectHandover {
  id: string;
  projectId: string;
  assetId?: string;
  status: HandoverStatus;
  handoverDate?: string;
  fromOrganizationId?: string;
  toUserId?: string;
  toOrganizationId?: string;
  documentsComplete: boolean;
  trainingComplete: boolean;
  sparePartsDelivered: boolean;
  warrantyDelivered: boolean;
  manualsDelivered: boolean;
  finalApprovalId?: string;
  notes?: string;
}

export interface AssetPerformanceBaseline {
  id: string;
  assetId: string;
  annualGenerationKwh?: number;
  monthlyGenerationKwh?: number;
  monthlyExpectedKwh?: any;
  expectedDailyAverageKwh?: number;
  expectedPrPercent?: number;
  performanceRatioPercent?: number;
  availabilityPercent?: number;
  degradationPercent?: number;
  source?: string;
  dataSource?: string;
  calculatedAt: string;
  version?: number;
}

export interface FinalProjectCostSummary {
  id: string;
  projectId: string;
  assetId?: string;
  estimatedCapex: number;
  finalCapex: number;
  contractValue: number;
  procurementActuals: number;
  approvedChangeOrders: number;
  otherApprovedCosts: number;
  calculatedAt: string;
}

export type PunchListSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';
export type PunchListStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WAIVED';

export interface PunchListItem {
  id: string;
  projectId: string;
  commissioningRecordId?: string;
  itemNumber: string;
  title: string;
  description: string;
  severity: PunchListSeverity;
  status: PunchListStatus;
  assignedTo?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissioningGatingCheck {
  canApprove: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  criticalPunchListCount: number;
  blockingReasons: string[];
}

export interface HandoverReadinessCheck {
  canApprove: boolean;
  commissioningApproved: boolean;
  documentsComplete: boolean;
  trainingComplete: boolean;
  sparePartsDelivered: boolean;
  warrantyDelivered: boolean;
  manualsDelivered: boolean;
  unresolvedCriticalPunchList: number;
  blockingReasons: string[];
}

