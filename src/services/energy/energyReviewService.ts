/**
 * HOOSHYAR ENERGY — EDITORIAL & REVIEW WORKFLOW SERVICE
 * Stage 13.10.2 Secure Ingestion Foundation
 * 
 * Enforces human-in-the-loop review before publication:
 * - Candidates can be APPROVED or REJECTED by authorized editors
 * - FAIL-SAFE: NO candidate can be PUBLISHED without prior approval
 * - Automatic publication is strictly forbidden
 * - Complete audit trail (reviewedBy, reviewedAt, rejectionReason, targetRecordId)
 */

import { 
  EnergyIngestionCandidate, 
  EnergyInformationRecord, 
  StakeholderGroup, 
  RegulatoryStatus 
} from '../../types/energyCenter.js';
import { energyCenterRepository } from '../../repositories/energyCenterRepository.js';
import { getEnergySourceById } from './energySourceRegistry.js';

export class ReviewWorkflowError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'REVIEW_WORKFLOW_ERROR', statusCode = 400) {
    super(message);
    this.name = 'ReviewWorkflowError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface ApproveCandidateOptions {
  approvedTitle?: string;
  approvedSummary?: string;
  notes?: string;
}

export interface PublishCandidateOptions {
  affectedStakeholders?: StakeholderGroup[];
  regulatoryStatus?: RegulatoryStatus;
  keyPoints?: string[];
  isFeatured?: boolean;
}

/**
 * Approves a candidate document for publication readiness.
 */
export function approveCandidate(
  candidateId: string,
  reviewerId: string,
  options: ApproveCandidateOptions = {}
): EnergyIngestionCandidate {
  if (!reviewerId) {
    throw new ReviewWorkflowError('شناسه بازبین الزامی است.', 'MISSING_REVIEWER_ID');
  }

  const candidate = energyCenterRepository.getCandidateById(candidateId);
  if (!candidate) {
    throw new ReviewWorkflowError(`کاندیدا با شناسه '${candidateId}' یافت نشد.`, 'CANDIDATE_NOT_FOUND', 404);
  }

  if (candidate.reviewStatus === 'DUPLICATE') {
    throw new ReviewWorkflowError(
      'سند تکراری نمی‌تواند بدون ابهام‌زدایی تأیید شود.',
      'CANNOT_APPROVE_DUPLICATE'
    );
  }

  const now = new Date().toISOString();
  candidate.reviewStatus = 'APPROVED';
  candidate.reviewedBy = reviewerId;
  candidate.reviewedAt = now;
  candidate.rejectionReason = undefined;

  if (options.approvedTitle) candidate.title = options.approvedTitle.trim();
  if (options.approvedSummary) candidate.summary = options.approvedSummary.trim();
  if (options.notes) candidate.reviewNotes = options.notes.trim();

  return energyCenterRepository.saveCandidate(candidate);
}

/**
 * Rejects a candidate document with an explicit rationale.
 */
export function rejectCandidate(
  candidateId: string,
  reviewerId: string,
  reason: string
): EnergyIngestionCandidate {
  if (!reviewerId) {
    throw new ReviewWorkflowError('شناسه بازبین الزامی است.', 'MISSING_REVIEWER_ID');
  }

  if (!reason || !reason.trim()) {
    throw new ReviewWorkflowError('علت رد سند الزامی است.', 'MISSING_REJECTION_REASON');
  }

  const candidate = energyCenterRepository.getCandidateById(candidateId);
  if (!candidate) {
    throw new ReviewWorkflowError(`کاندیدا با شناسه '${candidateId}' یافت نشد.`, 'CANDIDATE_NOT_FOUND', 404);
  }

  const now = new Date().toISOString();
  candidate.reviewStatus = 'REJECTED';
  candidate.reviewedBy = reviewerId;
  candidate.reviewedAt = now;
  candidate.rejectionReason = reason.trim();

  return energyCenterRepository.saveCandidate(candidate);
}

/**
 * Publishes an approved candidate to the public Energy Center.
 * CRITICAL RULE (Stage 13.10.2-B.1 Scope Correction):
 * Production publication capability is strictly DISABLED in this stage.
 * The ingestion lifecycle stops at APPROVED.
 */
export function publishCandidate(
  _candidateId: string,
  _publisherId: string,
  _options: PublishCandidateOptions = {}
): EnergyInformationRecord {
  throw new ReviewWorkflowError(
    'انتشار عمومی در Stage 13.10.2 غیرفعال است. گردش‌کار این فاز منحصراً در مرحله تأیید (APPROVED) متوقف می‌شود و هیچ متد یا اندپوینت انتشاری فعال نیست.',
    'PUBLICATION_DISABLED_IN_STAGE_13_10_2',
    403
  );
}
