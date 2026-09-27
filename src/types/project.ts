import { UserRole } from './roles';

export type ProjectStatus = 
  | 'DRAFT'
  | 'ANALYSIS'
  | 'FEASIBILITY'
  | 'READY_FOR_RFQ'
  | 'RFQ_OPEN'
  | 'BIDS_RECEIVED'
  | 'EPC_SELECTED'
  | 'CONTRACTING'
  | 'FINANCING'
  | 'PROCUREMENT'
  | 'CONSTRUCTION'
  | 'COMMISSIONING'
  | 'OPERATIONAL'
  | 'MAINTENANCE'
  | 'CANCELLED';

export type ProjectType = 
  | 'SOLAR'
  | 'SOLAR_BATTERY'
  | 'SOLAR_GENERATOR'
  | 'HYBRID'
  | 'GENERATOR'
  | 'BATTERY_STORAGE';

export interface EnergyProject {
  id: string;
  projectCode: string;
  ownerId: string;
  organizationId?: string | null;
  title: string;
  projectType: ProjectType;
  status: ProjectStatus;

  location: {
    country: string;
    province: string;
    city: string;
    address?: string;
    lat?: number;
    lon?: number;
  };

  site?: {
    type: string;
    areaM2: number;
    usableAreaM2?: number;
  };

  energyRequirement?: {
    monthlyConsumptionKwh?: number;
    peakLoadKw?: number;
    backupHours?: number;
    gridConnected: boolean;
    gridStable: boolean;
  };

  targetCapacityKw?: number;
  stalledThresholdDays?: number;
  estimatedBudgetIRR?: number;
  estimatedBudget?: {
    amount: number;
    currency: string;
  };
  sourceAnalysisId?: string;
  contractId?: string;
  engineeringDesignId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberRole = 'OWNER' | 'LAND_OWNER' | 'INVESTOR' | 'EPC' | 'VENDOR' | 'TECHNICIAN' | 'CONSULTANT' | 'FINANCIAL_PARTNER' | 'VIEWER';
export type ProjectMemberStatus = 'INVITED' | 'ACTIVE' | 'REMOVED';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  organizationId?: string;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
  createdAt: string;
}

export type ProjectDocumentType = 
  | 'LAND_DEED'
  | 'GRID_DOCUMENT'
  | 'PERMIT'
  | 'ENGINEERING'
  | 'FINANCIAL_MODEL'
  | 'RFQ'
  | 'BID'
  | 'CONTRACT'
  | 'INVOICE'
  | 'EQUIPMENT_DATASHEET'
  | 'INSPECTION'
  | 'COMMISSIONING'
  | 'OTHER';

export type DocumentVerificationStatus = 'NOT_REVIEWED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface ProjectDocument {
  id: string;
  projectId: string;
  uploadedByUserId: string;
  type: ProjectDocumentType;
  fileUrl: string;
  version: number;
  verificationStatus: DocumentVerificationStatus;
  createdAt: string;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  actorUserId?: string;
  userId?: string;
  actorOrganizationId?: string;
  eventType?: string; // PROJECT_CREATED, PROJECT_UPDATED, STATUS_CHANGED, MEMBER_ADDED, DOCUMENT_UPLOADED, ANALYSIS_ATTACHED
  type?: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
  createdAt: string;
}
