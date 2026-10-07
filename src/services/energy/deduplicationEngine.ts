/**
 * HOOSHYAR ENERGY — CONTENT HASHING & DEDUPLICATION ENGINE
 * Stage 13.10.2 Secure Ingestion Foundation
 * 
 * Provides deterministic hashing, exact duplicate detection, revision detection,
 * and near-duplicate similarity analysis for Persian energy content.
 */

import crypto from 'crypto';
import { 
  EnergyIngestionCandidate, 
  DeduplicationCheckResult, 
  DeduplicationClassification,
  EnergyCategory
} from '../../types/energyCenter.js';
import { 
  normalizePersianForComparison, 
  calculateTextSimilarity 
} from '../../utils/persianNormalizer.js';

/**
 * Computes deterministic SHA-256 hash of raw input content.
 */
export function calculateRawContentHash(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return crypto.createHash('sha256').update('').digest('hex');
  }
  return crypto.createHash('sha256').update(raw.trim(), 'utf8').digest('hex');
}

/**
 * Computes deterministic SHA-256 hash of normalized Persian title and body.
 * Normalizes text to ensure whitespace, punctuation, diacritics, and Yeh/Kaf
 * variations do not produce false unique hashes.
 */
export function calculateCanonicalHash(title: string, content: string): string {
  const normTitle = normalizePersianForComparison(title || '');
  const normContent = normalizePersianForComparison(content || '');
  const combined = `${normTitle}\n---\n${normContent}`;
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}

export { calculateTextSimilarity };

export interface CandidateDeduplicationQuery {
  id?: string;
  sourceId: string;
  canonicalUrl: string;
  canonicalHash: string;
  contentHash: string;
  title: string;
  category?: EnergyCategory;
  externalId?: string;
}

/**
 * Evaluates candidate against existing candidates for deduplication.
 */
export function checkCandidateDeduplication(
  query: CandidateDeduplicationQuery,
  existingCandidates: EnergyIngestionCandidate[]
): DeduplicationCheckResult {
  if (!existingCandidates || existingCandidates.length === 0) {
    return {
      classification: 'UNIQUE',
      reason: 'کاندیدای جدید و فاقد سابقه در سیستم.',
      confidence: 1.0
    };
  }

  // Exclude current candidate if querying an existing one by id
  const candidatesToCheck = query.id
    ? existingCandidates.filter(c => c.id !== query.id)
    : existingCandidates;

  // 1. EXACT DUPLICATE CHECK: Canonical Hash or Raw Content Hash match
  for (const existing of candidatesToCheck) {
    if (existing.canonicalHash === query.canonicalHash) {
      return {
        classification: 'EXACT_DUPLICATE',
        reason: `محتوای نرمال‌شده دقیقاً با کاندیدای '${existing.id}' تطابق دارد.`,
        existingCandidateId: existing.id,
        confidence: 1.0
      };
    }

    if (existing.contentHash === query.contentHash && query.contentHash.length > 0) {
      return {
        classification: 'EXACT_DUPLICATE',
        reason: `محتوای خام دقیقاً با کاندیدای '${existing.id}' همسان است.`,
        existingCandidateId: existing.id,
        confidence: 1.0
      };
    }
  }

  // 2. REVISION CHECK: Same canonical URL or same externalId from same source, but changed hash
  for (const existing of candidatesToCheck) {
    const isSameSource = existing.sourceId === query.sourceId;
    const isSameUrl = existing.canonicalUrl === query.canonicalUrl;
    const isSameExtId = query.externalId && existing.externalId && existing.externalId === query.externalId;

    if (isSameSource && (isSameUrl || isSameExtId)) {
      return {
        classification: 'REVISION',
        reason: `نسخه بازبینی‌شده یا به‌روزشده از محتوای کاندیدای '${existing.id}' در نشانی یکسان.`,
        existingCandidateId: existing.id,
        confidence: 0.95
      };
    }
  }

  // 3. POSSIBLE DUPLICATE CHECK: High Title & Category Similarity
  let highestSimilarity = 0;
  let mostSimilarCandidateId: string | undefined;

  for (const existing of candidatesToCheck) {
    const titleSim = calculateTextSimilarity(query.title, existing.title);
    const categoryMatches = !query.category || !existing.category || query.category === existing.category;

    if (categoryMatches && titleSim > highestSimilarity) {
      highestSimilarity = titleSim;
      mostSimilarCandidateId = existing.id;
    }
  }

  if (highestSimilarity >= 0.82 && mostSimilarCandidateId) {
    return {
      classification: 'POSSIBLE_DUPLICATE',
      reason: `تشابه اسمی بالا (${Math.round(highestSimilarity * 100)}٪) با کاندیدای '${mostSimilarCandidateId}'. نیازمند بررسی تحریریه.`,
      existingCandidateId: mostSimilarCandidateId,
      confidence: highestSimilarity
    };
  }

  return {
    classification: 'UNIQUE',
    reason: 'محتوای متمایز و بدون همپوشانی در پایگاه اسناد.',
    confidence: 1.0
  };
}
