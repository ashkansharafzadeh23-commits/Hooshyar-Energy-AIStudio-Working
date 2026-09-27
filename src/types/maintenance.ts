export type AlertSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 
  | 'OPEN'
  | 'TRIGGERED'
  | 'ACKNOWLEDGED'
  | 'UNDER_INVESTIGATION'
  | 'MAINTENANCE_REQUIRED'
  | 'CASE_CREATED'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'SUPPRESSED';

export type AlertSource = 'TELEMETRY' | 'RULE' | 'DIAGNOSIS' | 'MANUAL' | 'SYSTEM' | 'EXTERNAL' | 'PERFORMANCE' | 'HEALTH';

export type AlertType = 
  | 'PERFORMANCE_DEVIATION'
  | 'LOW_AVAILABILITY'
  | 'TELEMETRY_LOSS'
  | 'TELEMETRY_QUALITY'
  | 'INVERTER_FAULT'
  | 'COMPONENT_FAULT'
  | 'BATTERY_SOC_ANOMALY'
  | 'GRID_ANOMALY'
  | 'TEMPERATURE_ANOMALY'
  | 'GENERATION_ANOMALY'
  | 'MANUAL'
  | 'OTHER';

export interface AssetAlert {
  id: string;
  alertCode: string; // ALT-HSE-000001
  projectId: string;
  assetId: string;
  componentId?: string;
  sourceId?: string;
  source?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  detectedAt: string;
  firstObservedAt?: string;
  lastObservedAt?: string;
  metricType?: string;
  observedValue?: number;
  metricValue?: number;
  expectedValue?: number;
  deviationPercent?: number;
  thresholdRuleId?: string;
  ruleId?: string;
  thresholdValue?: number;
  performanceSnapshotId?: string;
  healthAssessmentId?: string;
  investigationNotes?: string[];
  maintenanceCaseId?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  resolutionNotes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export type AlertRuleType = 
  | 'VALUE_ABOVE'
  | 'VALUE_BELOW'
  | 'DEVIATION_ABOVE'
  | 'DEVIATION_BELOW'
  | 'TELEMETRY_MISSING'
  | 'HEALTH_SCORE_BELOW'
  | 'TELEMETRY_THRESHOLD'
  | 'THRESHOLD';

export interface AlertRule {
  id: string;
  projectId?: string;
  assetId?: string;
  name: string;
  description?: string;
  metricType?: string;
  ruleType: AlertRuleType;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  thresholdValue?: number;
  thresholdPercent?: number;
  durationMinutes?: number;
  cooldownMinutes?: number;
  severity: AlertSeverity;
  enabled: boolean;
  isEnabled?: boolean;
  condition?: any;
  sourceType?: string;
  createdAt: string;
  updatedAt: string;
}

export type DiagnosisStatus = 
  | 'INSUFFICIENT_DATA'
  | 'POSSIBLE_CAUSE_IDENTIFIED'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'ACTION_RECOMMENDED';

export type DiagnosisRootCause = { cause: string; probability: number; description?: string; componentId?: string };
export type DiagnosisAction = { 
  action: string; 
  priority: string; 
  description?: string; 
  estimatedCost?: number; 
  estimatedCostIrr?: number;
  estimatedHours?: number;
};
export type WarrantyImpact = { 
  eligible?: boolean; 
  summary?: string; 
  provider?: string; 
  hasWarrantyCoverage?: boolean; 
  warrantyNotes?: string;
  warrantyId?: string;
  warrantyType?: string;
  warrantyStatus?: string;
  claimProcedure?: string;
};
export type DiagnosisMethod = 'RULE_BASED' | 'STATISTICAL' | 'AI_ASSISTED' | 'HYBRID' | 'EXPERT_RULESET';

export interface MaintenanceDiagnosis {
  id: string;
  projectId: string;
  assetId: string;
  alertId?: string;
  componentId?: string;
  diagnosisStatus?: DiagnosisStatus;
  facts?: string[];
  inferences?: string[];
  possibleCauses?: string[];
  likelyRootCauses?: any;
  evidence?: string[];
  recommendedActions?: any;
  requiredExpertise?: string[];
  warrantyStatus?: 'ACTIVE' | 'EXPIRED' | 'INSUFFICIENT_DATA';
  warrantyDetails?: string;
  warrantyImpact?: WarrantyImpact;
  symptoms?: string[];
  rootCauses?: DiagnosisRootCause[];
  actions?: DiagnosisAction[];
  method?: DiagnosisMethod;
  diagnosisMethod?: DiagnosisMethod;
  confidence?: number;
  confidenceScore?: number;
  rawAiResponse?: any;
  generatedBy?: string; // 'DETERMINISTIC_ENGINE' | 'AI_ASSISTED' | user ID
  evidenceCategorized?: {
    OBSERVED?: string[];
    USER_REPORTED?: string[];
    PHOTO_OBSERVED?: string[];
    DOCUMENT_EXTRACTED?: string[];
    TELEMETRY_VERIFIED?: string[];
    AI_INFERENCE?: string[];
    NOT_AVAILABLE?: string[];
  };
  requiredTools?: string[];
  requiredParts?: string[];
  safetyGuidance?: string[];
  createdAt: string;
}

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type MaintenanceCasePriority = MaintenancePriority;

export type MaintenanceStatus = 
  | 'OPEN'
  | 'DRAFT'
  | 'DIAGNOSING'
  | 'AWAITING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'AWAITING_VERIFICATION'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';
export type MaintenanceCaseStatus = MaintenanceStatus;

export type MaintenanceCategory = 
  | 'CORRECTIVE' 
  | 'PREVENTIVE' 
  | 'PREDICTIVE' 
  | 'INSPECTION' 
  | 'EMERGENCY' 
  | 'UPGRADE' 
  | 'OTHER';

export interface SparePartUsage {
  partName: string;
  partNumber?: string;
  quantity: number;
  costIrr?: number;
  replacedComponentId?: string;
}

export interface MaintenanceHistorySummary {
  assetId: string;
  projectId: string;
  totalCases: number;
  resolvedCases: number;
  totalCostIrr: number;
  totalLaborHours: number;
  commonFailureCauses: { cause: string; count: number }[];
  cases: MaintenanceCase[];
}

export interface CaseAttachment {
  id: string;
  maintenanceCaseId: string;
  name: string;
  type: 'PHOTO' | 'DOCUMENT' | 'BILL' | 'OTHER';
  url: string;
  data?: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeBytes?: number;
  mimeType?: string;
  status?: 'UPLOADED' | 'PROCESSED' | 'FAILED' | 'UNVERIFIED' | 'NOT_PROVIDED' | 'EXTRACTION_AVAILABLE';
  extractedData?: any;
}

export interface MaintenanceCase {
  id: string;
  maintenanceCode: string; // MNT-HSE-000001
  caseNumber?: string;
  projectId: string;
  assetId: string;
  componentId?: string;
  equipmentType?: string;
  symptoms?: string[];
  alertIds: string[];
  title: string;
  description: string;
  category: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reportedBy: string;
  reportedAt: string;
  contactName?: string;
  contactPhone?: string;
  diagnosisId?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedTechnicianPhone?: string;
  assignedOrganizationId?: string;
  scheduledAt?: string;
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
  completedDate?: string;
  closureNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  verificationPassed?: boolean;
  resolutionSummary?: string;
  rootCause?: string;
  actionsTaken?: any;
  photos?: string[];
  documents?: string[];
  billDoc?: {
    name: string;
    url?: string;
    data?: string;
    status: 'NOT_PROVIDED' | 'UPLOADED_PENDING_EXTRACTION' | 'EXTRACTION_AVAILABLE' | 'EXTRACTION_FAILED' | 'UNVERIFIED';
    extractedData?: any;
    uploadedAt?: string;
  };
  attachments?: CaseAttachment[];
  downtimeMinutes?: number | null;
  laborCost?: number | null;
  partsCost?: number | null;
  totalCost?: number | null;
  totalCostIrr?: number;
  totalLaborHours?: number;
  sparePartsUsed?: SparePartUsage[];
  currency?: string;
  postMaintenanceCheck?: {
    status: 'IMPROVED' | 'UNCHANGED' | 'DEGRADED' | 'INSUFFICIENT_DATA';
    preGenerationKwh?: number | null;
    postGenerationKwh?: number | null;
    evaluatedAt: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceAssignmentHistory {
  id: string;
  maintenanceCaseId: string;
  technicianId: string;
  organizationId?: string;
  assignedBy: string;
  assignedAt: string;
  status: 'ASSIGNED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
}

export type MaintenanceActionType = 
  | 'INSPECTION'
  | 'CLEANING'
  | 'REPAIR'
  | 'RESET'
  | 'CONFIGURATION'
  | 'PART_REPLACEMENT'
  | 'TEST'
  | 'OTHER'
  | string;

export interface MaintenanceAction {
  id: string;
  maintenanceCaseId: string;
  actionType: MaintenanceActionType;
  description: string;
  componentId?: string;
  replacedComponentId?: string;
  newComponentSerial?: string;
  newComponentModel?: string;
  performedBy: string;
  performedAt: string;
  resultStatus?: string;
  notes?: string;
  createdAt: string;
}

export interface TechnicianMatch {
  technicianId: string;
  fullName: string;
  phone: string;
  specialties: string[];
  serviceCities: string[];
  yearsExperience: number;
  rating?: number | null;
  matchScore: number;
  matchReasons: string[];
  status: string;
  profile?: any;
  technician?: any;
}

export interface TechnicianMatchResult {
  technician: {
    id: string;
    fullName: string;
    phone: string;
    specialties: string[];
    serviceCities: string[];
    yearsExperience: number;
    bio: string;
    profileImageUrl?: string;
    certifications: { title: string; imageUrl: string }[];
    status: string;
  profile?: any;
  technician?: any;
    rating?: number | null;
  };
  score: number;
  matchReasons: string[];
  locationMatch: boolean;
  specialtyMatch: boolean;
  experienceMatch: boolean;
}

export interface AssetMaintenanceHistoryItem {
  id: string;
  eventType: 'ALERT' | 'MAINTENANCE_CASE' | 'ACTION' | 'VERIFICATION';
  timestamp: string;
  title: string;
  description: string;
  status: string;
  profile?: any;
  technician?: any;
  severity?: string;
  code?: string;
  technicianName?: string;
  componentName?: string;
  cost?: number | null;
}
