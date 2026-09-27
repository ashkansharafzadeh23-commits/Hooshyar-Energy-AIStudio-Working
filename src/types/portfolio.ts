import { ProjectStatus } from './project.js';
import { EnergyAssetStatus } from './asset.js';

export type EnterpriseRole = 
  | 'OWNER' 
  | 'ADMIN' 
  | 'PROJECT_MANAGER' 
  | 'FINANCE' 
  | 'ENGINEER' 
  | 'VIEWER';

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: EnterpriseRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  createdAt: string;
  updatedAt?: string;
}

export interface Portfolio {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  projectIds: string[]; // References to existing EnergyProject IDs
  assetIds: string[];   // References to existing EnergyAsset IDs
  stalledThresholdDays?: number;
  settings?: {
    stalledThresholdDays?: number;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PortfolioOverviewSummary {
  portfolioId: string;
  portfolioName: string;
  organizationId: string;
  totalProjects: number;
  projectsByLifecycleStage: Record<ProjectStatus | string, number>;
  plannedSolarCapacity: {
    knownCapacityKw: number;
    projectsWithKnownCapacity: number;
    projectsWithMissingCapacity: number;
    isFullyKnown: boolean;
  };
  operationalCapacity: {
    knownCapacityKw: number;
    assetsWithKnownCapacity: number;
    assetsWithMissingCapacity: number;
    isFullyKnown: boolean;
  };
  projectsUnderConstruction: number;
  totalOperationalAssets: number;
  activeProcurementProcesses: number;
  activeContracts: number;
  openFinancingApplications: number;
  activeFinancingAgreements: number;
  openMaintenanceCases: number;
  activeAlerts: number;
  calculatedAt: string;
}

export interface StalledProjectItem {
  projectId: string;
  projectCode: string;
  title: string;
  status: ProjectStatus;
  daysSinceLastUpdate: number;
  thresholdDays?: number;
  reason: string;
}

export interface MissingNextStepItem {
  projectId: string;
  projectCode: string;
  title: string;
  currentStatus: ProjectStatus;
  missingFields: string[];
  recommendedAction: string;
}

export interface OverdueMilestoneItem {
  projectId: string;
  projectCode: string;
  projectTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

export interface BlockedWorkflowItem {
  projectId: string;
  projectCode: string;
  title: string;
  blockReason: string;
  blockedEntity: 'CHANGE_REQUEST' | 'COMMISSIONING' | 'FINANCING' | 'INSPECTION' | 'OTHER';
  entityId: string;
}

export interface LifecycleIntelligenceSummary {
  portfolioId: string;
  totalProjects: number;
  stageDistribution: Record<string, number>;
  stalledProjects: StalledProjectItem[];
  missingNextSteps: MissingNextStepItem[];
  overdueMilestones: OverdueMilestoneItem[];
  blockedWorkflows: BlockedWorkflowItem[];
  calculatedAt: string;
}

export interface AssetIntelligenceItem {
  assetId: string;
  assetCode: string;
  name: string;
  projectId?: string;
  projectCode?: string;
  installedCapacityKw: number | null;
  operationalStatus: string;
  telemetryStatus: 'REPORTING' | 'DATA_UNAVAILABLE' | 'NOT_CONNECTED';
  lastTelemetryTimestamp?: string | null;
  performanceState: string; // 'NORMAL' | 'WARNING' | 'CRITICAL' | 'DATA_UNAVAILABLE'
  healthState: string;      // 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'DATA_UNAVAILABLE'
  activeAlertsCount: number;
  openMaintenanceCasesCount: number;
  warrantyStatus: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'DATA_UNAVAILABLE';
  warrantyDetails?: {
    provider?: string;
    endDate?: string;
  } | null;
}

export interface AssetPortfolioSummary {
  portfolioId: string;
  totalAssets: number;
  operationalAssetsCount: number;
  nonOperationalAssetsCount: number;
  knownOperationalCapacityKw: number;
  assetsWithMissingCapacityCount: number;
  telemetryBreakdown: {
    reporting: number;
    notConnected: number;
    dataUnavailable: number;
  };
  healthBreakdown: {
    healthy: number;
    degraded: number;
    critical: number;
    dataUnavailable: number;
  };
  warrantyBreakdown: {
    active: number;
    expiring: number;
    expired: number;
    dataUnavailable: number;
  };
  assets: AssetIntelligenceItem[];
  calculatedAt: string;
}

export interface FinancialMetricRecord<T = number> {
  value: T;
  isKnown: boolean;
}

export interface ProjectFinancialDetail {
  projectId: string;
  projectCode: string;
  title: string;
  capexIRR: number | null;
  financingRequestedIRR: number | null;
  financingSecuredIRR: number | null;
  ownerEquityIRR: number | null;
  contractValueIRR: number | null;
  hasCompleteFinancials: boolean;
}

export interface FinancialPortfolioSummary {
  portfolioId: string;
  totalProjectsInPortfolio: number;
  knownFinancialRecords: number;
  missingFinancialRecords: number;
  dataCoveragePercent: number;
  aggregations: {
    totalKnownCapexIRR: number;
    projectsWithCapexCount: number;
    totalKnownFinancingRequestedIRR: number;
    projectsWithFinancingRequestedCount: number;
    totalKnownFinancingSecuredIRR: number;
    projectsWithFinancingSecuredCount: number;
    totalKnownOwnerEquityIRR: number;
    projectsWithOwnerEquityCount: number;
    totalKnownContractValueIRR: number;
    projectsWithContractValueCount: number;
  };
  projectFinancialDetails: ProjectFinancialDetail[];
  notes: string[];
  calculatedAt: string;
}

export interface ProcurementIntelligenceSummary {
  portfolioId: string;
  totalBOQs: number;
  totalProcurementPackages: number;
  openProcurementPackages: number;
  totalSupplierRFQs: number;
  activeSupplierRFQs: number;
  totalPurchaseOrders: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  pendingInspections: number;
  totalContracts: number;
  activeContracts: number;
  totalContractRevisions: number;
  approvedChangeRequests: number;
  pendingChangeRequests: number;
  calculatedAt: string;
}

export interface OperationsIntelligenceSummary {
  portfolioId: string;
  totalOperationalAssets: number;
  telemetryAvailability: {
    reporting: number;
    withoutTelemetry: number;
  };
  activeAlertsCount: number;
  activeAlertsBySeverity: {
    INFO: number;
    WARNING: number;
    HIGH: number;
    CRITICAL: number;
  };
  openMaintenanceCasesCount: number;
  openMaintenanceCasesByPriority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  warrantyCoverage: {
    coveredWithActiveWarranty: number;
    warrantyUnavailableOrMissing: number;
  };
  calculatedAt: string;
}

export type InsightType = 
  | 'LIFECYCLE_STALLED'
  | 'EPC_SELECTION_PENDING'
  | 'TELEMETRY_OFFLINE'
  | 'DELIVERY_INSPECTION_PENDING'
  | 'FINANCING_INFO_REQUIRED'
  | 'OVERDUE_MILESTONE'
  | 'MAINTENANCE_CRITICAL'
  | 'WARRANTY_EXPIRING'
  | 'FINANCING_GAP'
  | 'DATA_INCOMPLETE';

export type InsightSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export interface PlatformInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  entityType: 'PROJECT' | 'ASSET' | 'PROCUREMENT' | 'FINANCING' | 'MAINTENANCE' | 'PORTFOLIO';
  entityId: string;
  projectId?: string;
  title: string;
  message: string;
  evidence: Record<string, any>;
  generatedAt: string;
}
