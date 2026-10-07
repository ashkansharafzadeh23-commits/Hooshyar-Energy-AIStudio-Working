/**
 * HOOSHYAR ENERGY — INGESTION PIPELINE SERVICE
 * Stage 13.10.2 Secure Ingestion Foundation
 * 
 * Coordinates ingestion of energy information candidates:
 * - Validates source provenance and domain matching
 * - Canonicalizes URLs and enforces SSRF boundaries
 * - Normalizes Persian text without altering legal semantics
 * - Computes deterministic hashes (contentHash, canonicalHash)
 * - Executes deduplication check before queuing
 * - STRICT POLICY: NO AUTOMATIC PUBLICATION. Candidates require editorial review.
 */

import { randomUUID } from 'node:crypto';
import { 
  EnergyIngestionCandidate, 
  EnergyContentType, 
  EnergyCategory, 
  DeduplicationCheckResult 
} from '../../types/energyCenter.js';
import { canonicalizeSourceUrl, isPrivateOrInternalAddress } from '../../utils/urlCanonicalizer.js';
import { 
  normalizePersianDisplay, 
  stripHtmlToPlainText 
} from '../../utils/persianNormalizer.js';
import { 
  calculateRawContentHash, 
  calculateCanonicalHash, 
  checkCandidateDeduplication 
} from './deduplicationEngine.js';
import { getEnergySourceById } from './energySourceRegistry.js';
import { isAllowedHostnameForSource } from './secureEnergyFetcher.js';
import { energyCenterRepository } from '../../repositories/energyCenterRepository.js';

export interface IngestCandidatePayload {
  sourceId: string;
  sourceUrl: string;
  rawTitle: string;
  rawContent: string;
  contentType: EnergyContentType;
  category: EnergyCategory;
  topics?: string[];
  externalId?: string;
  publishedAtOriginal?: string;
  attachmentUrls?: string[];
  documentType?: 'HTML' | 'PDF' | 'IMAGE';
}

export interface IngestionResult {
  candidate: EnergyIngestionCandidate;
  deduplication: DeduplicationCheckResult;
}

export class IngestionValidationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'INGESTION_VALIDATION_ERROR', statusCode = 400) {
    super(message);
    this.name = 'IngestionValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Ingests a new candidate into the editorial review queue.
 */
export async function ingestEnergyCandidate(
  payload: IngestCandidatePayload
): Promise<IngestionResult> {
  // 1. Source verification
  if (!payload.sourceId) {
    throw new IngestionValidationError('شناسه منبع رسمی الزامی است.', 'MISSING_SOURCE_ID');
  }

  const source = getEnergySourceById(payload.sourceId);
  if (!source) {
    throw new IngestionValidationError(`منبع با شناسه '${payload.sourceId}' یافت نشد.`, 'SOURCE_NOT_FOUND', 404);
  }

  if (!source.enabled) {
    throw new IngestionValidationError(`منبع '${source.name}' در وضعیت غیرفعال قرار دارد.`, 'SOURCE_DISABLED', 403);
  }

  // 2. URL validation & Canonicalization
  if (!payload.sourceUrl) {
    throw new IngestionValidationError('نشانی منبع (URL) الزامی است.', 'MISSING_SOURCE_URL');
  }

  const canonicalResult = canonicalizeSourceUrl(payload.sourceUrl);
  if (!canonicalResult.isValid || !canonicalResult.canonicalUrl || !canonicalResult.hostname) {
    throw new IngestionValidationError(
      canonicalResult.error || 'نشانی منبع نامعتبر است.',
      'INVALID_CANONICAL_URL'
    );
  }

  const hostname = canonicalResult.hostname;
  if (isPrivateOrInternalAddress(hostname)) {
    throw new IngestionValidationError(
      'نشانی ارائه‌شده مربوط به شبکه داخلی بوده و مجاز نمی‌باشد.',
      'SSRF_INTERNAL_ADDRESS_BLOCKED',
      403
    );
  }

  // Domain whitelist check (strict, no substring vulnerabilities)
  const domainMatches = isAllowedHostnameForSource(hostname, source.officialDomain);
  if (!domainMatches) {
    throw new IngestionValidationError(
      `دامنه نشانی (${hostname}) با دامنه رسمی منبع (${source.officialDomain}) مطابقت ندارد.`,
      'DOMAIN_MISMATCH',
      403
    );
  }

  // 3. Payload sanity checks
  const rawTitle = (payload.rawTitle || '').trim();
  const rawContent = (payload.rawContent || '').trim();

  if (!rawTitle) {
    throw new IngestionValidationError('عنوان خام الزامی است.', 'EMPTY_TITLE');
  }

  if (!rawContent) {
    throw new IngestionValidationError('متن یا بدنه سند الزامی است.', 'EMPTY_CONTENT');
  }

  // 4. Content Normalization
  const cleanTitle = normalizePersianDisplay(rawTitle);
  const plainBody = stripHtmlToPlainText(rawContent);
  const cleanSummary = plainBody.slice(0, 320) + (plainBody.length > 320 ? '...' : '');

  // 5. Hashing
  const contentHash = calculateRawContentHash(rawContent);
  const canonicalHash = calculateCanonicalHash(cleanTitle, plainBody);

  // 6. Deduplication Check
  const existingCandidates = energyCenterRepository.getAllCandidates();
  const deduplication = checkCandidateDeduplication({
    sourceId: source.id,
    canonicalUrl: canonicalResult.canonicalUrl,
    canonicalHash,
    contentHash,
    title: cleanTitle,
    category: payload.category,
    externalId: payload.externalId
  }, existingCandidates);

  // 7. Determine Review Status
  let reviewStatus: EnergyIngestionCandidate['reviewStatus'] = 'PENDING_REVIEW';
  let duplicateOfCandidateId: string | undefined;

  if (deduplication.classification === 'EXACT_DUPLICATE') {
    reviewStatus = 'DUPLICATE';
    duplicateOfCandidateId = deduplication.existingCandidateId;
  }

  // 8. Construct Candidate Record (Immutable raw fields preserved)
  const candidateId = `cand_${randomUUID()}`;
  const now = new Date().toISOString();

  const candidate: EnergyIngestionCandidate = {
    id: candidateId,
    sourceId: source.id,
    externalId: payload.externalId,
    sourceUrl: payload.sourceUrl,
    canonicalUrl: canonicalResult.canonicalUrl,
    title: cleanTitle,
    rawTitle,
    summary: cleanSummary,
    rawContent,
    contentType: payload.contentType,
    category: payload.category,
    topics: payload.topics || [],
    publishedAtOriginal: payload.publishedAtOriginal,
    fetchedAt: now,
    contentHash,
    canonicalHash,
    documentType: payload.documentType || 'HTML',
    attachmentUrls: payload.attachmentUrls || [],
    reviewStatus,
    duplicateOfCandidateId,
    reviewNotes: deduplication.reason,
    createdAt: now,
    updatedAt: now
  };

  const saved = energyCenterRepository.saveCandidate(candidate);

  return {
    candidate: saved,
    deduplication
  };
}
