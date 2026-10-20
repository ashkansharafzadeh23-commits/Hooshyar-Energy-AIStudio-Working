/**
 * Stage D.2-P2B-1: Secure Showcase Data Foundation and Public Read API
 *
 * Strict separation between private administrative records and public DTO projections.
 */

export type ShowcasePublicationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'REJECTED';

export type ShowcaseOperationalStatus = 'OPERATIONAL' | 'COMMISSIONED';

export interface ShowcaseTechnicalEvidence {
  evidenceType: 'COMMISSIONING_REPORT' | 'METER_RECORD' | 'GRID_INTERCONNECTION' | 'SATBA_PPA';
  documentReferenceId: string;
  verifiedAt: string;
  verifiedBy: string;
  isValid: boolean;
}

export interface ShowcaseOwnerConsent {
  isGranted: boolean;
  consentingPartyName: string;
  consentDocumentReferenceId: string;
  consentedAt: string;
  withdrawnAt?: string | null;
}

export interface ShowcaseProjectRecord {
  id: string;
  internalProjectRefId?: string | null;
  internalAssetRefId?: string | null;

  // Presentation fields
  publicTitle: string;
  location: {
    province: string;
    city: string;
  };
  installedCapacityKw: number;
  operationalStatus: ShowcaseOperationalStatus;
  statusLabel?: string;
  commissioningDate?: string;

  measuredProduction?: {
    value: number;
    unit: string;
    period: string;
    source: string;
  } | null;

  timeSeriesData?: {
    label: string;
    value: number;
  }[] | null;

  publicImageUrl?: string | null;
  connectionDescription?: string | null;

  // Private governance and evidence
  ownerConsent: ShowcaseOwnerConsent;
  technicalEvidence: ShowcaseTechnicalEvidence;

  publicationStatus: ShowcasePublicationStatus;
  displayOrder: number;
  rejectionReason?: string | null;
  unpublishReason?: string | null;
  version: number;

  createdByUserId: string;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  publishedByUserId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicShowcaseDTO {
  id: string;
  title: string;
  location: string;
  capacityKw: number;
  status: 'OPERATIONAL' | 'COMMISSIONED';
  statusLabel: string;
  commissioningDate?: string;
  measuredProduction?: {
    value: number;
    unit: string;
    period: string;
    source: string;
  };
  timeSeriesData?: {
    label: string;
    value: number;
  }[];
  imageUrl?: string;
  connectionDescription?: string;
}

/**
 * Fail-closed publication eligibility validator.
 * A record is public ONLY if all criteria are strictly satisfied.
 */
export function isRecordEligibleForPublicShowcase(record: unknown): record is ShowcaseProjectRecord {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const r = record as ShowcaseProjectRecord;

  // 1. Publication status must be strictly PUBLISHED
  if (r.publicationStatus !== 'PUBLISHED') {
    return false;
  }

  // 2. Owner consent must exist, be granted, and NOT withdrawn
  if (!r.ownerConsent || typeof r.ownerConsent !== 'object') {
    return false;
  }
  if (r.ownerConsent.isGranted !== true) {
    return false;
  }
  if (typeof r.ownerConsent.consentingPartyName !== 'string' || r.ownerConsent.consentingPartyName.trim().length === 0) {
    return false;
  }
  if (r.ownerConsent.withdrawnAt) {
    return false;
  }

  // 3. Technical verification evidence must exist, be valid, and referenced
  if (!r.technicalEvidence || typeof r.technicalEvidence !== 'object') {
    return false;
  }
  if (r.technicalEvidence.isValid !== true) {
    return false;
  }
  if (typeof r.technicalEvidence.documentReferenceId !== 'string' || r.technicalEvidence.documentReferenceId.trim().length === 0) {
    return false;
  }

  // 4. Operational status must be OPERATIONAL or COMMISSIONED
  if (r.operationalStatus !== 'OPERATIONAL' && r.operationalStatus !== 'COMMISSIONED') {
    return false;
  }

  // 5. Public presentation fields must pass validation
  if (typeof r.id !== 'string' || r.id.trim().length === 0) {
    return false;
  }
  if (typeof r.publicTitle !== 'string' || r.publicTitle.trim().length === 0) {
    return false;
  }
  if (!r.location || typeof r.location !== 'object') {
    return false;
  }
  if (typeof r.location.province !== 'string' || r.location.province.trim().length === 0) {
    return false;
  }
  if (typeof r.location.city !== 'string' || r.location.city.trim().length === 0) {
    return false;
  }
  if (typeof r.installedCapacityKw !== 'number' || !Number.isFinite(r.installedCapacityKw) || r.installedCapacityKw <= 0) {
    return false;
  }

  // Optional measuredProduction validation: if present, must be valid
  if (r.measuredProduction !== undefined && r.measuredProduction !== null) {
    if (typeof r.measuredProduction !== 'object') return false;
    const mp = r.measuredProduction;
    if (typeof mp.value !== 'number' || !Number.isFinite(mp.value) || mp.value <= 0) return false;
    if (typeof mp.unit !== 'string' || mp.unit.trim().length === 0) return false;
    if (typeof mp.period !== 'string' || mp.period.trim().length === 0) return false;
    if (typeof mp.source !== 'string' || mp.source.trim().length === 0) return false;
  }

  // Optional timeSeriesData validation: if present, must be bounded and non-negative
  if (r.timeSeriesData !== undefined && r.timeSeriesData !== null) {
    if (!Array.isArray(r.timeSeriesData)) return false;
    if (r.timeSeriesData.length > 48) return false;
    for (const pt of r.timeSeriesData) {
      if (!pt || typeof pt !== 'object') return false;
      if (typeof pt.label !== 'string' || pt.label.trim().length === 0) return false;
      if (typeof pt.value !== 'number' || !Number.isFinite(pt.value) || pt.value < 0) return false;
    }
  }

  return true;
}

/**
 * Deliberate public projection function.
 * Explicit allowlist mapping: NO object spreading (...record).
 * Prevents any accidental exposure of internal or private fields.
 */
export function toPublicShowcaseDTO(record: ShowcaseProjectRecord): PublicShowcaseDTO {
  const province = record.location.province.trim();
  const city = record.location.city.trim();
  const locationStr = province === city ? province : `${province}، ${city}`;

  const defaultStatusLabel = record.operationalStatus === 'OPERATIONAL'
    ? 'بهره‌برداری تأییدشده'
    : 'متصل به شبکه';

  const dto: PublicShowcaseDTO = {
    id: record.id.trim(),
    title: record.publicTitle.trim(),
    location: locationStr,
    capacityKw: record.installedCapacityKw,
    status: record.operationalStatus,
    statusLabel: (record.statusLabel && record.statusLabel.trim()) ? record.statusLabel.trim() : defaultStatusLabel
  };

  if (record.commissioningDate && typeof record.commissioningDate === 'string' && record.commissioningDate.trim()) {
    dto.commissioningDate = record.commissioningDate.trim();
  }

  if (record.measuredProduction &&
      typeof record.measuredProduction.value === 'number' &&
      Number.isFinite(record.measuredProduction.value) &&
      record.measuredProduction.value > 0 &&
      record.measuredProduction.unit &&
      record.measuredProduction.period &&
      record.measuredProduction.source) {
    dto.measuredProduction = {
      value: record.measuredProduction.value,
      unit: record.measuredProduction.unit.trim(),
      period: record.measuredProduction.period.trim(),
      source: record.measuredProduction.source.trim()
    };
  }

  if (Array.isArray(record.timeSeriesData) &&
      record.timeSeriesData.length >= 2 &&
      record.timeSeriesData.length <= 48 &&
      record.timeSeriesData.every(pt => pt && typeof pt.label === 'string' && pt.label.trim() && typeof pt.value === 'number' && Number.isFinite(pt.value) && pt.value >= 0)) {
    dto.timeSeriesData = record.timeSeriesData.map(pt => ({
      label: pt.label.trim(),
      value: pt.value
    }));
  }

  if (record.connectionDescription && typeof record.connectionDescription === 'string' && record.connectionDescription.trim()) {
    dto.connectionDescription = record.connectionDescription.trim();
  }

  return dto;
}
