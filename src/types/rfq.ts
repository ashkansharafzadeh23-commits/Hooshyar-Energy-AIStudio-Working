export type RFQStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'CANCELLED' | 'AWARDED';

export type RFQ = ProjectRFQ;
export type EpcBid = EPCBid;

export type RFQVisibility = 'INVITED_ONLY' | 'VERIFIED_EPCS';

export interface ProjectRFQ {
  id: string;
  rfqCode: string; // RFQ-HSE-000001
  projectId: string;
  createdByUserId: string;
  status: RFQStatus;
  title: string;
  description: string;
  scope: string;
  submissionDeadline: string;
  currency: string;
  visibility: RFQVisibility;
  technicalRequirements: string[];
  commercialRequirements: string[];
  requiredDocuments: string[];
  invitedContractorIds?: string[];
  scopeDescription?: string;
  requiredGuarantees?: string[];
  commercialTerms?: {
    minWarrantyYears?: number;
    penaltyPerDayLateIRR?: number;
    preferredWarrantyYears?: number;
    maxExecutionDays?: number;
    lowPriceThresholdRatio?: number;
    highPriceThresholdRatio?: number;
  };
  scoringConfig?: RFQScoringThresholds;
  createdAt: string;
  publishedAt?: string;
  closedAt?: string;
  awardedAt?: string;
  selectedBidId?: string;
  selectedEpcOrganizationId?: string;
}

export interface RFQScoringThresholds {
  minWarrantyYears?: number;
  preferredWarrantyYears?: number;
  longExecutionThresholdDays?: number;
  lowPriceOutlierRatio?: number;
  highPriceOutlierRatio?: number;
}

export type RFQInvitationStatus = 'INVITED' | 'VIEWED' | 'DECLINED' | 'BID_SUBMITTED' | 'EXPIRED';

export interface RFQInvitation {
  id: string;
  rfqId: string;
  epcOrganizationId: string;
  status: RFQInvitationStatus;
  invitedAt: string;
  viewedAt?: string;
  respondedAt?: string;
}

export type EPCBidStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'SELECTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type TechnicalComplianceStatus = 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_REVIEW';

export type BidRiskFlagType = 
  | 'PRICE_OUTLIER' 
  | 'MISSING_DOCUMENTS' 
  | 'SHORT_WARRANTY' 
  | 'LONG_EXECUTION' 
  | 'UNVERIFIED_EPC' 
  | 'UNUSUAL_PAYMENT_TERMS' 
  | 'TECHNICAL_DEVIATION';

export interface BidRiskFlag {
  type: BidRiskFlagType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  message?: string;
}

export interface BidScoreBreakdown {
  priceScore: number;       // Max 25
  technicalScore: number;   // Max 25
  equipmentScore: number;   // Max 15
  warrantyScore: number;    // Max 10
  timelineScore: number;    // Max 10
  experienceScore: number;  // Max 10
  commercialScore: number;  // Max 5
  totalScore: number;       // Max 100
}

export interface EPCBidEquipmentSummary {
  panels?: string;
  inverters?: string;
  structures?: string;
  storage?: string;
  transformers?: string;
  monitoring?: string;
}

export interface EPCBid {
  id: string;
  bidCode: string; // BID-HSE-000001
  projectId: string;
  rfqId: string;
  epcOrganizationId: string;
  status: EPCBidStatus;
  currency: string;
  totalPrice: number;
  totalPriceIRR?: number;
  downPaymentPercent?: number;
  validUntil?: string;
  warrantyTerms?: string;
  epcOrganizationName?: string;
  epcCompanyName?: string;
  technicalProposalNotes?: string;
  technicalDeviations?: string;
  engineeringPrice: number;
  equipmentPrice: number;
  installationPrice: number;
  otherPrice: number;
  executionDays: number;
  warrantyYears: number;
  equipmentSummary: EPCBidEquipmentSummary;
  paymentTerms: string;
  assumptions?: string;
  exclusions?: string;
  commercialTerms?: {
    advancePaymentPercent?: number;
    retentionPercent?: number;
    warrantyPeriodMonths?: number;
    executionDurationWeeks?: number;
    liquidatedDamagesPerDayPercent?: number;
    maxLiquidatedDamagesPercent?: number;
    paymentTermsSummary?: string;
    paymentTerms?: string;
  };
  technicalDocuments: string[];
  commercialDocuments: string[];
  technicalCompliance: TechnicalComplianceStatus;
  complianceNotes?: string;
  riskFlags: BidRiskFlag[];
  scoreBreakdown?: BidScoreBreakdown;
  normalizedScore?: number;
  currentRevisionNumber: number;
  createdAt: string;
  submittedAt?: string;

  // Frontend & integration convenience fields
  proposedPriceIRR?: number;
  timelineDays?: number;
  guaranteedAnnualYieldMwh?: number;
  equipmentSpecs?: {
    panelBrand?: string;
    inverterBrand?: string;
    rackingType?: string;
    monitoringIncluded?: boolean;
  };
  epcOrganization?: any;
  epcName?: string;
  epcVerificationStatus?: string;
  score?: {
    totalScore: number;
    breakdown: BidScoreBreakdown;
    riskFlags: any[];
  };
  revisions?: any[];
}

export interface EPCBidRevision {
  id: string;
  bidId: string;
  revisionNumber: number;
  snapshot: Omit<EPCBid, "scoreBreakdown" | "normalizedScore">;
  reason: string;
  createdAt: string;
  createdByUserId: string;
}

export interface ScoringWeights {
  price: number;        // default 25
  technical: number;    // default 25
  equipment: number;    // default 15
  warranty: number;     // default 10
  timeline: number;     // default 10
  experience: number;   // default 10
  commercial: number;   // default 5
}

export interface RankedBidEntry {
  bid: EPCBid;
  epcName: string;
  epcVerified: boolean;
  scoreBreakdown: BidScoreBreakdown;
  rank: number;
  highlights: string[];
  riskFlags: BidRiskFlag[];
}

export interface BidComparison {
  rfqId: string;
  projectId: string;
  generatedAt: string;
  weights: ScoringWeights;
  rankedBids: RankedBidEntry[];
  aiExplanation?: string;
}
