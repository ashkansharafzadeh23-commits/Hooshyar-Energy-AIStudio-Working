export type InvestmentOpportunityType = 
  | 'LAND_ONLY'
  | 'PROJECT_SEEKING_CAPITAL'
  | 'PROJECT_SEEKING_EPC'
  | 'PROJECT_SEEKING_PARTNER'
  | 'READY_PROJECT'
  | 'DEVELOPMENT_OPPORTUNITY';

export type InvestmentOpportunityStatus = 
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'PUBLISHED'
  | 'MATCHING'
  | 'PAUSED'
  | 'CLOSED'
  | 'ARCHIVED';

export type InvestmentOpportunityVisibility = 
  | 'PRIVATE_MATCHING'
  | 'VERIFIED_USERS'
  | 'PUBLIC_SUMMARY';

export interface InvestmentOpportunity {
  id: string;
  opportunityCode: string;
  projectId?: string;
  createdByUserId: string;
  createdByOrganizationId?: string;
  type: InvestmentOpportunityType;
  status: InvestmentOpportunityStatus;
  title: string;
  summary: string;
  location: {
    province: string;
    city: string;
  };
  projectStage: string;
  targetCapacityKw?: number;
  landStatus: string;
  permitStatus: string;
  gridConnectionStatus: string;
  engineeringStatus: string;
  financialModelStatus: string;
  epcStatus: string;
  
  capitalRequirement?: {
    totalProjectCapex: number;
    ownerEquity: number;
    capitalRequired: number; // The funding gap
  };

  minimumPartnerCapital?: number;
  preferredPartnerType?: string;
  expectedTimeline?: string;
  visibility: InvestmentOpportunityVisibility;
  riskDisclosure: string[];
  
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type LandOwnershipType = 'OWNED' | 'LEASED' | 'PARTNERSHIP' | 'OTHER';
export type LandUseType = 'INDUSTRIAL' | 'AGRICULTURAL' | 'BARREN' | 'COMMERCIAL' | 'UNKNOWN';
export type LandVerificationStatus = 'NOT_REVIEWED' | 'PENDING' | 'DOCUMENTS_PARTIAL' | 'VERIFIED_BASIC' | 'REJECTED';

export interface LandProfile {
  id: string;
  projectId: string;
  ownershipType: LandOwnershipType;
  areaM2: number;
  province: string;
  city: string;
  addressSummary: string;
  lat?: number;
  lon?: number;
  landUseType: LandUseType;
  roadAccess: boolean;
  distanceToGridKm?: number;
  gridVoltageIfKnown?: string;
  slopePercent?: number;
  terrainType?: string;
  waterRisk?: string;
  environmentalConstraints?: string;
  verificationStatus: LandVerificationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestorType = 'INDIVIDUAL' | 'COMPANY' | 'FUND' | 'FAMILY_OFFICE' | 'FINANCIAL_INSTITUTION' | 'OTHER';
export type RiskPreference = 'CONSERVATIVE' | 'BALANCED' | 'GROWTH';

export interface InvestorProfile {
  id: string;
  userId: string;
  organizationId?: string;
  investorType: InvestorType;
  capitalMin: number;
  capitalMax: number;
  currency: string;
  preferredProvinces: string[];
  preferredProjectSizeMinKw?: number;
  preferredProjectSizeMaxKw?: number;
  preferredProjectStages: string[];
  investmentHorizonYears?: number;
  riskPreference: RiskPreference;
  preferredTechnologies: string[];
  requiresLandVerified: boolean;
  requiresFinancialModel: boolean;
  requiresEpcSelected: boolean;
  targetReturnPreference?: string;
  notes?: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectReadinessScore {
  id: string;
  projectId: string;
  score: number;
  overallScore?: number;
  breakdown?: {
    land: number;
    technical: number;
    grid: number;
    permit: number;
    financial: number;
    epc: number;
    documents: number;
  };
  scoreBreakdown: {
    land: number;
    technical: number;
    grid: number;
    permit: number;
    financial: number;
    epc: number;
    documents: number;
  };
  level: 'EARLY_STAGE' | 'DEVELOPING' | 'INVESTMENT_PREPARATION' | 'INVESTMENT_READY';
  missingItems: string[];
  calculatedAt: string;
  scoringVersion: string;
}

export type MatchStatus = 'SUGGESTED' | 'VIEWED' | 'INTERESTED' | 'INTRO_REQUESTED' | 'CONNECTED' | 'DECLINED' | 'EXPIRED';

export interface ProjectMatch {
  id: string;
  opportunityId: string;
  investorProfileId: string;
  score: number;
  scoreBreakdown: {
    capitalFit: number;
    locationFit: number;
    sizeFit: number;
    stageFit: number;
    riskFit: number;
    technologyFit: number;
    readinessFit: number;
  };
  status: MatchStatus;
  initiatedBy?: string; // e.g. 'INVESTOR' or 'OWNER' or 'SYSTEM'
  createdAt: string;
  updatedAt: string;
}
