export interface ProjectContract {
  id: string;
  contractCode: string;
  projectId: string;
  contractType: 'EPC' | 'O_AND_M' | 'CONSULTING' | 'SUPPLY' | string;
  status: 'DRAFT' | 'UNDER_REVIEW' | 'READY_TO_SIGN' | 'SIGNED' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'COMPLETED' | string;
  title: string;
  clientPartyId?: string;
  contractorPartyId?: string;
  selectedBidId?: string;
  currency: string;
  contractValue: number; // original baseline contract value
  revisedContractValue?: number; // active revised value after approved change requests / revisions
  currentRevisionNumber?: number;
  startDate?: string;
  plannedStartDate?: string;
  plannedCompletionDate?: string;
  effectiveDate?: string;
  signedAt?: string;
  signedDocumentId?: string;
  signedDocumentUploadedAt?: string;
  signedConfirmedByUserId?: string;
  signedConfirmedAt?: string;
  scheduleStatus?: 'CONFIRMED' | 'INSUFFICIENT_DATA' | 'SUGGESTED_TEMPLATE';
  warrantyPeriodMonths?: number;
  scopeSummary?: string;
  paymentTermsSummary?: string;
  advancePaymentPercent?: number;
  retentionPercent?: number;
  liquidatedDamagesPerDayPercent?: number;
  maxLiquidatedDamagesPercent?: number;
  liquidatedDamagesSummary?: string;
  terminationSummary?: string;
  isTemplateTerms?: boolean; // true when terms are suggested defaults rather than agreed
  termsConfirmedByUser?: boolean; // true once explicit user confirmation is given
  documentId?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractParty {
  id: string;
  contractId: string;
  partyType?: 'CLIENT' | 'CONTRACTOR' | 'ENGINEER' | 'SUBCONTRACTOR' | 'OTHER' | 'INDIVIDUAL' | 'ORGANIZATION';
  userId?: string;
  organizationId?: string;
  legalName?: string;
  representativeName?: string;
  role?: 'CLIENT' | 'EPC' | 'SUPPLIER' | 'INVESTOR' | 'CONSULTANT' | 'OTHER';
  displayName?: string;
  signStatus?: 'PENDING' | 'SIGNED' | 'REJECTED';
  signedAt?: string;
  verificationStatus?: string;
}

export interface ContractRevision {
  id: string;
  contractId: string;
  projectId?: string;
  revisionNumber: number;
  changeRequestId?: string;
  reason?: string;
  changeSummary?: string;
  changesSummary?: string;
  contractValueBefore?: number;
  contractValueAfter?: number;
  scheduleImpactDays?: number;
  approvedByUserId?: string;
  approvedAt?: string;
  snapshot?: any;
  documentId?: string;
  createdByUserId?: string;
  createdAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  contractId?: string;
  milestoneCode: string;
  title: string;
  description?: string;
  category: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED_FOR_REVIEW' | 'COMPLETED' | 'REJECTED' | 'BLOCKED' | string;
  sequence: number;
  responsibleUserId?: string;
  responsibleOrganizationId?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  weightPercent: number;
  completionPercent: number;
  requiresApproval: boolean;
  evidenceRequired: boolean;
  isTemplate?: boolean;
  templateNotice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneDependency {
  id: string;
  projectId: string;
  predecessorMilestoneId: string;
  successorMilestoneId: string;
  dependencyType: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH';
}

export interface ApprovalRequest {
  id: string;
  projectId: string;
  entityType: string;
  entityId: string;
  requestedByUserId: string;
  approverUserId?: string;
  approverOrganizationId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  comment?: string;
  requestedAt: string;
  respondedAt?: string;
}

export interface ChangeRequest {
  id: string;
  projectId: string;
  contractId: string;
  crCode?: string;
  title: string;
  description: string;
  reasonCategory?: 'CLIENT_REQUEST' | 'SITE_CONDITIONS' | 'REGULATORY' | 'DESIGN_CHANGE' | 'FORCE_MAJEURE' | 'OTHER';
  requestedBy?: string;
  requestedByUserId?: string;
  costImpact?: number;
  costImpactAmount?: number;
  scheduleImpactDays: number;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  revisionId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectBaseline {
  id: string;
  projectId: string;
  contractId: string;
  baselineCode?: string;
  name?: string;
  status?: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'SUPERSEDED';
  contractValue: number;
  currency?: string;
  plannedStartDate?: string;
  plannedCompletionDate?: string;
  milestonePlan?: any;
  approvedByUserId?: string;
  approvedAt?: string;
  supersededAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ProjectHealthStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'BLOCKED' | 'COMPLETED';
