/**
 * Hooshyar Energy — Isolated PostgreSQL Maintenance Adapter Foundation (Stage F.5 Phase P2-A Security Closure)
 *
 * Provides an asynchronous persistence adapter foundation for the Smart Maintenance domain.
 *
 * STRICT BOUNDARIES & SECURITY POLICIES:
 * 1. STRICTLY READ-ONLY: Only getCaseById, listCases, and getAssignmentHistories.
 * 2. NO RUNTIME ACTIVATION: Existing runtime controllers and services remain 100% synchronous/decoupled.
 * 3. REUSES EXISTING POOL: Calls getPostgresDB() from ./connection.js without competing pools.
 * 4. PRIVILEGE ESCALATION DEFENSE:
 *    - Never grant administrator privileges solely because auth.isAdmin === true.
 *    - Never trust caller-provided role or roles strings as proof of authorization.
 *    - MaintenanceAuthContext must originate from a trusted, server-verified authentication boundary.
 *    - In Phase P2-A (isolated, pre-runtime integration), broad administrative access is strictly disabled (isUserAdmin returns false).
 *      All queries must be explicitly scoped to caller-owned entities.
 * 5. STRICT ALLOWLIST PRIVACY PROJECTIONS:
 *    - For pre-acceptance, cancelled, and closed cases, uses an explicit allowlist of non-sensitive technical fields.
 *    - Replaces the spread-and-delete pattern to guarantee that private attachments, download URLs, photos, documents,
 *      billing records, raw AI responses, and arbitrary nested metadata cannot leak to technicians.
 * 6. AUTHORITATIVE ACCEPTANCE & CYCLE ISOLATION:
 *    - A -> B -> A cycle isolation: historical acceptances never authorize subsequent assignment cycles.
 *    - Execution status guard: modern cycle acceptance requires active execution state (IN_PROGRESS, etc.).
 *    - Terminal-state privacy: CANCELLED and CLOSED cases permanently mask customer contact and private documents.
 * 7. IDENTITY DEPENDENCY BOUNDARY NOTICE:
 *    - areTechnicianIdentitiesEquivalent delegates to technicianIdentityService, which resolves professional profiles.
 *    - Note: In Phase P3 (production PostgreSQL activation), professional lookups must be migrated to a dedicated
 *      PostgreSQL table rather than depending on legacy JSON repository storage.
 * 8. FAIL-CLOSED TYPED ERRORS:
 *    - Distinguishes MaintenanceAuthError (401), MaintenanceAccessDeniedError (403), MaintenanceNotFoundError (404),
 *      PostgresUnavailableError (503), DataIntegrityError (500), and FinancialPrecisionError (500).
 */

import { eq, and, or, asc, ilike, inArray } from 'drizzle-orm';
import {
  maintenanceCases,
  maintenanceAssignmentHistories
} from './schema.js';
import { getPostgresDB } from './connection.js';
import type {
  MaintenanceCase,
  MaintenanceAssignmentHistory,
  MaintenanceStatus,
  MaintenancePriority,
  CaseAttachment,
  SparePartUsage
} from '../../types/maintenance.js';
import {
  areTechnicianIdentitiesEquivalent,
  getTechnicianIdentities
} from '../../services/technicianIdentityService.js';

// ============================================================================
// Typed Fail-Closed Error Hierarchy
// ============================================================================

export class MaintenanceAuthError extends Error {
  public readonly code = 'MAINTENANCE_AUTH_ERROR';
  public readonly statusCode = 401;
  constructor(message: string = 'Authentication required to access maintenance domain.') {
    super(message);
    this.name = 'MaintenanceAuthError';
  }
}

export class MaintenanceAccessDeniedError extends Error {
  public readonly code = 'MAINTENANCE_ACCESS_DENIED';
  public readonly statusCode = 403;
  constructor(message: string = 'Access to maintenance resource is denied.') {
    super(message);
    this.name = 'MaintenanceAccessDeniedError';
  }
}

export class MaintenanceNotFoundError extends Error {
  public readonly code = 'MAINTENANCE_NOT_FOUND';
  public readonly statusCode = 404;
  constructor(message: string = 'Requested maintenance resource was not found.') {
    super(message);
    this.name = 'MaintenanceNotFoundError';
  }
}

export class PostgresUnavailableError extends Error {
  public readonly code = 'POSTGRES_UNAVAILABLE';
  public readonly statusCode = 503;
  constructor(message: string = 'PostgreSQL database connection is unavailable in this environment.') {
    super(message);
    this.name = 'PostgresUnavailableError';
  }
}

export class DataIntegrityError extends Error {
  public readonly code = 'DATA_INTEGRITY_ERROR';
  public readonly statusCode = 500;
  constructor(message: string) {
    super(message);
    this.name = 'DataIntegrityError';
  }
}

export class FinancialPrecisionError extends Error {
  public readonly code = 'FINANCIAL_PRECISION_ERROR';
  public readonly statusCode = 500;
  constructor(message: string) {
    super(message);
    this.name = 'FinancialPrecisionError';
  }
}

// ============================================================================
// Context & Filter Interfaces
// ============================================================================

/**
 * MaintenanceAuthContext must originate from a trusted, server-verified
 * authentication boundary (e.g., Express verifyAuthToken middleware).
 *
 * Caller-supplied boolean flags (such as isAdmin) or raw string roles are NOT trusted
 * as proof of administrative privilege in isolated adapters.
 */
export interface MaintenanceAuthContext {
  userId: string;
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
}

export interface AuthorizedMaintenanceCaseFilter {
  projectId?: string;
  assetId?: string;
  assignedTechnicianId?: string;
  reportedBy?: string;
  status?: string | string[];
  limit?: number;
  offset?: number;
}

export interface CaseAccessEvaluation {
  allowed: boolean;
  isAdmin: boolean;
  isReporter: boolean;
  isAssignedTech: boolean;
  isFormallyAccepted: boolean;
  error?: string;
}

// ============================================================================
// Domain Constants & Supported Enums
// ============================================================================

export const SUPPORTED_MAINTENANCE_STATUSES: ReadonlySet<string> = new Set([
  'OPEN',
  'DRAFT',
  'DIAGNOSING',
  'AWAITING_ASSIGNMENT',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'AWAITING_VERIFICATION',
  'PENDING_VERIFICATION',
  'VERIFIED',
  'COMPLETED',
  'RESOLVED',
  'CLOSED',
  'CANCELLED'
]);

export const SUPPORTED_MAINTENANCE_PRIORITIES: ReadonlySet<string> = new Set([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
  'CRITICAL'
]);

export const SUPPORTED_ASSIGNMENT_STATUSES: ReadonlySet<string> = new Set([
  'ASSIGNED',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED'
]);

// ============================================================================
// Financial & Data Conversion Utilities
// ============================================================================

/**
 * Safely converts PostgreSQL numeric(20,0) (returned as string or number) to a safe integer Rial number.
 * Enforces non-negative safe integers and rejects floating-point/sub-Rial values, Infinity, NaN, and malformed strings.
 */
export function pgNumericToRial(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;

  if (typeof value === 'boolean' || Array.isArray(value) || (typeof value === 'object')) {
    throw new FinancialPrecisionError(`Invalid monetary data type: ${typeof value}`);
  }

  const str = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new FinancialPrecisionError(`CRITICAL: Malformed monetary numeric string "${str}".`);
  }

  const num = Number(str);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    throw new FinancialPrecisionError(`CRITICAL: Monetary value "${str}" is not finite.`);
  }

  if (num < 0) {
    throw new FinancialPrecisionError(`CRITICAL: Database monetary value "${str}" is negative, violating financial invariants.`);
  }

  if (!Number.isInteger(num)) {
    throw new FinancialPrecisionError(`CRITICAL: Database monetary value "${str}" contains fractional Rial subunits.`);
  }

  if (!Number.isSafeInteger(num)) {
    throw new FinancialPrecisionError(`CRITICAL: Database monetary value "${str}" exceeds JavaScript MAX_SAFE_INTEGER.`);
  }

  return num;
}

/**
 * Validates ISO-8601 or Date timestamps and returns a canonical ISO string.
 * Fails closed if timestamp is invalid or missing when mandatory.
 */
function parseRequiredTimestamp(value: unknown, fieldName: string): string {
  if (value === null || value === undefined) {
    throw new DataIntegrityError(`Mandatory timestamp field "${fieldName}" is missing.`);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new DataIntegrityError(`Mandatory timestamp field "${fieldName}" is an invalid Date object.`);
    }
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new DataIntegrityError(`Mandatory timestamp field "${fieldName}" contains invalid date string "${value}".`);
    }
    return d.toISOString();
  }
  throw new DataIntegrityError(`Mandatory timestamp field "${fieldName}" has invalid type or format.`);
}

function parseOptionalTimestamp(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  }
  return undefined;
}

/**
 * Maps a raw PostgreSQL maintenance_cases row into the authoritative TypeScript MaintenanceCase domain model.
 * Fails closed on missing mandatory fields or invalid enum states.
 */
export function mapPgCaseToDomain(row: any): MaintenanceCase {
  if (!row || typeof row !== 'object') {
    throw new DataIntegrityError('Cannot map null, undefined, or non-object row to MaintenanceCase');
  }

  // Mandatory String Identifiers
  const id = row.id ? String(row.id).trim() : '';
  if (!id) throw new DataIntegrityError('Mandatory column "id" is missing or empty in maintenance_cases record.');

  const maintenanceCode = row.maintenanceCode ? String(row.maintenanceCode).trim() : '';
  if (!maintenanceCode) throw new DataIntegrityError(`Mandatory column "maintenanceCode" is missing for case "${id}".`);

  const projectId = row.projectId ? String(row.projectId).trim() : '';
  if (!projectId) throw new DataIntegrityError(`Mandatory column "projectId" is missing for case "${id}".`);

  const assetId = row.assetId ? String(row.assetId).trim() : '';
  if (!assetId) throw new DataIntegrityError(`Mandatory column "assetId" is missing for case "${id}".`);

  const title = row.title ? String(row.title).trim() : '';
  if (!title) throw new DataIntegrityError(`Mandatory column "title" is missing for case "${id}".`);

  const description = row.description !== null && row.description !== undefined ? String(row.description) : '';

  const category = row.category ? String(row.category).trim() : '';
  if (!category) throw new DataIntegrityError(`Mandatory column "category" is missing for case "${id}".`);

  // Enums Validation (Fail Closed)
  const priority = row.priority ? String(row.priority).trim().toUpperCase() : '';
  if (!SUPPORTED_MAINTENANCE_PRIORITIES.has(priority)) {
    throw new DataIntegrityError(`Invalid maintenance priority "${row.priority}" on case "${id}".`);
  }

  const status = row.status ? String(row.status).trim().toUpperCase() : '';
  if (!SUPPORTED_MAINTENANCE_STATUSES.has(status)) {
    throw new DataIntegrityError(`Invalid maintenance status "${row.status}" on case "${id}". Must be a valid supported status.`);
  }

  const reportedBy = row.reportedBy ? String(row.reportedBy).trim() : '';
  if (!reportedBy) throw new DataIntegrityError(`Mandatory column "reportedBy" is missing for case "${id}".`);

  // Mandatory Timestamps
  const reportedAt = parseRequiredTimestamp(row.reportedAt, 'reportedAt');
  const createdAt = parseRequiredTimestamp(row.createdAt, 'createdAt');

  // Optional Timestamps (Validated without inventing fallback timestamps)
  const scheduledAt = parseOptionalTimestamp(row.scheduledAt);
  const startedAt = parseOptionalTimestamp(row.startedAt);
  const completedAt = parseOptionalTimestamp(row.completedAt);
  const verifiedAt = parseOptionalTimestamp(row.verifiedAt);
  const updatedAt = parseOptionalTimestamp(row.updatedAt);

  // Arrays & Complex JSONB Structures
  const symptoms: string[] = Array.isArray(row.symptoms) ? row.symptoms : [];
  const alertIds: string[] = Array.isArray(row.alertIds) ? row.alertIds : [];
  const photos: string[] = Array.isArray(row.photos) ? row.photos : [];
  const documents: string[] = Array.isArray(row.documents) ? row.documents : [];
  const attachments: CaseAttachment[] = Array.isArray(row.attachments) ? row.attachments : [];
  const sparePartsUsed: SparePartUsage[] = Array.isArray(row.sparePartsUsed) ? row.sparePartsUsed : [];

  return {
    id,
    maintenanceCode,
    caseNumber: row.caseNumber ? String(row.caseNumber) : undefined,
    projectId,
    assetId,
    componentId: row.componentId ? String(row.componentId) : undefined,
    equipmentType: row.equipmentType ? String(row.equipmentType) : undefined,
    symptoms,
    alertIds,
    title,
    description,
    category,
    priority: priority as MaintenancePriority,
    status: status as MaintenanceStatus,
    reportedBy,
    reportedAt,
    contactName: row.contactName ? String(row.contactName) : undefined,
    contactPhone: row.contactPhone ? String(row.contactPhone) : undefined,
    diagnosisId: row.diagnosisId ? String(row.diagnosisId) : undefined,
    assignedTechnicianId: row.assignedTechnicianId ? String(row.assignedTechnicianId) : undefined,
    assignedTechnicianName: row.assignedTechnicianName ? String(row.assignedTechnicianName) : undefined,
    assignedTechnicianPhone: row.assignedTechnicianPhone ? String(row.assignedTechnicianPhone) : undefined,
    assignedOrganizationId: row.assignedOrganizationId ? String(row.assignedOrganizationId) : undefined,
    scheduledAt,
    scheduledDate: row.scheduledDate ? String(row.scheduledDate) : undefined,
    startedAt,
    completedAt,
    completedDate: row.completedDate ? String(row.completedDate) : undefined,
    closureNotes: row.closureNotes ? String(row.closureNotes) : undefined,
    verifiedAt,
    verifiedBy: row.verifiedBy ? String(row.verifiedBy) : undefined,
    verificationNotes: row.verificationNotes ? String(row.verificationNotes) : undefined,
    verificationPassed: row.verificationPassed !== null && row.verificationPassed !== undefined ? Boolean(row.verificationPassed) : undefined,
    resolutionSummary: row.resolutionSummary ? String(row.resolutionSummary) : undefined,
    rootCause: row.rootCause ? String(row.rootCause) : undefined,
    actionsTaken: row.actionsTaken || undefined,
    photos,
    documents,
    billDoc: row.billDoc || undefined,
    attachments,
    downtimeMinutes: row.downtimeMinutes !== null && row.downtimeMinutes !== undefined ? Number(row.downtimeMinutes) : undefined,
    laborCost: row.laborCost !== null && row.laborCost !== undefined ? pgNumericToRial(row.laborCost) : undefined,
    partsCost: row.partsCost !== null && row.partsCost !== undefined ? pgNumericToRial(row.partsCost) : undefined,
    totalCost: row.totalCost !== null && row.totalCost !== undefined ? pgNumericToRial(row.totalCost) : undefined,
    totalCostIrr: row.totalCostIrr !== null && row.totalCostIrr !== undefined ? (pgNumericToRial(row.totalCostIrr) ?? undefined) : undefined,
    totalLaborHours: row.totalLaborHours !== null && row.totalLaborHours !== undefined ? Number(row.totalLaborHours) : undefined,
    sparePartsUsed,
    currency: row.currency ? String(row.currency) : 'IRR',
    postMaintenanceCheck: row.postMaintenanceCheck || undefined,
    createdAt,
    updatedAt
  };
}

/**
 * Maps a raw PostgreSQL maintenance_assignment_histories row into the domain model.
 * Fails closed on missing mandatory columns or invalid assignment statuses.
 */
export function mapPgHistoryToDomain(row: any): MaintenanceAssignmentHistory {
  if (!row || typeof row !== 'object') {
    throw new DataIntegrityError('Cannot map null, undefined, or non-object row to MaintenanceAssignmentHistory');
  }

  const id = row.id ? String(row.id).trim() : '';
  if (!id) throw new DataIntegrityError('Mandatory column "id" is missing in maintenance_assignment_histories record.');

  const maintenanceCaseId = row.maintenanceCaseId ? String(row.maintenanceCaseId).trim() : '';
  if (!maintenanceCaseId) throw new DataIntegrityError(`Mandatory column "maintenanceCaseId" is missing in history "${id}".`);

  const technicianId = row.technicianId ? String(row.technicianId).trim() : '';
  if (!technicianId) throw new DataIntegrityError(`Mandatory column "technicianId" is missing in history "${id}".`);

  const assignedBy = row.assignedBy ? String(row.assignedBy).trim() : '';
  if (!assignedBy) throw new DataIntegrityError(`Mandatory column "assignedBy" is missing in history "${id}".`);

  const status = row.status ? String(row.status).trim().toUpperCase() : '';
  if (!SUPPORTED_ASSIGNMENT_STATUSES.has(status)) {
    throw new DataIntegrityError(`Invalid assignment history status "${row.status}" in history "${id}".`);
  }

  const assignedAt = parseRequiredTimestamp(row.assignedAt, 'assignedAt');

  return {
    id,
    maintenanceCaseId,
    technicianId,
    organizationId: row.organizationId ? String(row.organizationId) : undefined,
    assignedBy,
    assignedAt,
    status: status as any,
    notes: row.notes ? String(row.notes) : undefined
  };
}

// ============================================================================
// Authorization & Security Helpers (Privilege Escalation Defense)
// ============================================================================

/**
 * ARCHITECTURAL NOTICE — PRIVILEGE ESCALATION DEFENSE:
 * In Phase P2-A (isolated, pre-runtime integration), the adapter cannot independently
 * verify session tokens, cryptographic JWTs, or server-side RBAC claims.
 *
 * Rules:
 * 1. Never grant administrator privileges solely because auth.isAdmin === true.
 * 2. Never trust caller-provided role or roles values (e.g. role: 'ADMIN', 'SUPER_ADMIN') as proof.
 * 3. MaintenanceAuthContext must originate from a trusted, server-verified authentication boundary in runtime.
 * 4. In this isolated adapter, because no independent server-verification infrastructure is mounted,
 *    administrator-level broad unscoped access is strictly DISABLED (fails closed).
 *    isUserAdmin strictly returns false to prevent any unverified caller from executing
 *    unrestricted database dumps or bypassing customer privacy barriers.
 */
export function isUserAdmin(_auth?: MaintenanceAuthContext): boolean {
  // Broad administrative privilege is strictly disabled in isolated P2-A to eliminate
  // any possibility of unverified privilege escalation.
  return false;
}

export function isTechnicianRole(auth: MaintenanceAuthContext): boolean {
  if (!auth || typeof auth !== 'object') return false;
  const techRoles = ['TECHNICIAN', 'PROFESSIONAL', 'EXPERT'];
  const role = (auth.role || '').toUpperCase();
  if (techRoles.includes(role)) return true;
  const roles = (auth.roles || []).map(r => String(r).toUpperCase());
  return roles.some(r => techRoles.includes(r));
}

/**
 * Validates current-cycle formal acceptance for a maintenance case.
 * Enforces cycle isolation: An ACCEPTED record from a prior assignment cycle (e.g. A -> B -> A)
 * NEVER authorizes a subsequent assignment cycle.
 */
export function evaluateCurrentCycleAcceptance(
  mCase: { id: string; assignedTechnicianId?: string | null; status?: string },
  histories?: MaintenanceAssignmentHistory[]
): boolean {
  if (!mCase || !mCase.id || !mCase.assignedTechnicianId) {
    return false;
  }

  const unassignedOrTerminalStatuses = [
    'CANCELLED',
    'CLOSED',
    'OPEN',
    'DRAFT',
    'DIAGNOSING',
    'AWAITING_ASSIGNMENT'
  ];
  if (!mCase.status || unassignedOrTerminalStatuses.includes(mCase.status)) {
    return false;
  }

  if (!histories || histories.length === 0) {
    return false;
  }

  const assignedTechId = mCase.assignedTechnicianId;

  // Find the index of the latest ASSIGNED event establishing the current assignment cycle
  let latestAssignedIdx = -1;
  for (let i = histories.length - 1; i >= 0; i--) {
    if (histories[i].status === 'ASSIGNED') {
      latestAssignedIdx = i;
      break;
    }
  }

  if (latestAssignedIdx !== -1) {
    const latestAssigned = histories[latestAssignedIdx];
    // The latest assignment event MUST be for the currently assigned technician
    if (!areTechnicianIdentitiesEquivalent(latestAssigned.technicianId, assignedTechId)) {
      return false;
    }

    // Look for an ACCEPTED event strictly AFTER latestAssignedIdx
    for (let i = latestAssignedIdx + 1; i < histories.length; i++) {
      const h = histories[i];
      if (h.status === 'ACCEPTED' && areTechnicianIdentitiesEquivalent(h.technicianId, assignedTechId)) {
        // Ensure no subsequent reassignment, rejection, or cancellation after this acceptance
        const hasSubsequentInvalidation = histories.slice(i + 1).some(sub =>
          sub.status === 'ASSIGNED' || sub.status === 'REJECTED' || sub.status === 'CANCELLED'
        );
        if (!hasSubsequentInvalidation) {
          // Execution status guard: modern cycle must have reached an active execution state
          const executionStatuses = ['IN_PROGRESS', 'AWAITING_VERIFICATION', 'PENDING_VERIFICATION', 'VERIFIED', 'COMPLETED'];
          if (!executionStatuses.includes(mCase.status)) {
            return false;
          }
          return true;
        }
      }
    }
    return false;
  }

  // Legacy fallback: no ASSIGNED records exist
  const hasAmbiguityOrInvalidation = histories.some(h =>
    !areTechnicianIdentitiesEquivalent(h.technicianId, assignedTechId) ||
    h.status !== 'ACCEPTED'
  );
  if (hasAmbiguityOrInvalidation) {
    return false;
  }

  return histories.length > 0;
}

/**
 * Checks authorization and customer privacy bounds for a specific maintenance case.
 */
export function evaluateCaseAccess(
  mCase: MaintenanceCase,
  auth: MaintenanceAuthContext,
  histories?: MaintenanceAssignmentHistory[]
): CaseAccessEvaluation {
  if (!auth || !auth.userId || typeof auth.userId !== 'string' || auth.userId.trim() === '') {
    return {
      allowed: false,
      isAdmin: false,
      isReporter: false,
      isAssignedTech: false,
      isFormallyAccepted: false,
      error: 'AUTHORIZATION_ERROR: Missing or unauthenticated user identity'
    };
  }

  const isAdmin = isUserAdmin(auth); // Strictly false in isolated P2-A
  const isReporter = Boolean(mCase.reportedBy && mCase.reportedBy === auth.userId);
  const isAssignedTech = Boolean(
    mCase.assignedTechnicianId && areTechnicianIdentitiesEquivalent(mCase.assignedTechnicianId, auth.userId)
  );

  const isTerminal = mCase.status === 'CANCELLED' || mCase.status === 'CLOSED';
  let isFormallyAccepted = false;
  if (isAssignedTech && !isTerminal) {
    isFormallyAccepted = evaluateCurrentCycleAcceptance(mCase, histories);
  }

  if (isAdmin || isReporter || isAssignedTech) {
    return {
      allowed: true,
      isAdmin,
      isReporter,
      isAssignedTech,
      isFormallyAccepted
    };
  }

  // Technicians are strictly prohibited from viewing unassigned cases or cases assigned to others
  if (isTechnicianRole(auth)) {
    return {
      allowed: false,
      isAdmin: false,
      isReporter: false,
      isAssignedTech: false,
      isFormallyAccepted: false,
      error: 'ACCESS_DENIED: Technicians may only access cases actively assigned to their identity'
    };
  }

  // Customer direct cases are private to reporter, assigned technician, or system administrator
  if (mCase.projectId === 'CUSTOMER_DIRECT') {
    return {
      allowed: false,
      isAdmin: false,
      isReporter: false,
      isAssignedTech: false,
      isFormallyAccepted: false,
      error: 'ACCESS_DENIED: Unrelated customers cannot access customer direct cases'
    };
  }

  return {
    allowed: false,
    isAdmin: false,
    isReporter: false,
    isAssignedTech: false,
    isFormallyAccepted: false,
    error: 'ACCESS_DENIED: Caller lacks required project or case authorization'
  };
}

// ============================================================================
// Strict Allowlist Privacy Projections
// ============================================================================

/**
 * Resolves all authorized technician identities (both user account ID and professional profile ID)
 * using authoritative server-side resolution.
 * Fails closed if user identity is missing or if no legitimate identity can be established.
 */
export function resolveAuthorizedTechnicianIds(auth: MaintenanceAuthContext): string[] {
  if (!auth || !auth.userId || typeof auth.userId !== 'string' || auth.userId.trim() === '') {
    throw new MaintenanceAuthError('User authentication context is mandatory.');
  }

  const cleanUserId = auth.userId.trim();
  const idSet = getTechnicianIdentities(cleanUserId);
  const ids = Array.from(idSet).filter(id => typeof id === 'string' && id.trim() !== '');

  if (ids.length === 0) {
    throw new MaintenanceAccessDeniedError('Failed to resolve authorized technician identity from server authentication.');
  }

  return ids;
}

/**
 * Formats a safe, generic technical display label derived from an approved category,
/**
 * Approved technical equipment category labels.
 * Strictly maps known technical domain equipment to standardized technical labels.
 * Any unapproved, malformed, or customer-injected text strictly falls back to safe generic labels.
 */
export const APPROVED_EQUIPMENT_LABELS: Readonly<Record<string, string>> = {
  INVERTER: 'INVERTER',
  PANEL: 'PANEL',
  SOLAR_PANEL: 'PANEL',
  BATTERY: 'BATTERY',
  STORAGE: 'BATTERY',
  PORTABLE_GENERATOR: 'PORTABLE GENERATOR',
  STATIONARY_GENSET: 'STATIONARY GENSET',
  GENSET: 'GENSET',
  GENERATOR: 'GENERATOR',
  TRANSFORMER: 'TRANSFORMER',
  COMBINER_BOX: 'COMBINER BOX',
  CHARGE_CONTROLLER: 'CHARGE CONTROLLER',
  CABLING: 'CABLING',
  TRACKER: 'TRACKER',
  SWITCHGEAR: 'SWITCHGEAR',
  METEOROLOGICAL_STATION: 'WEATHER STATION',
  SENSOR: 'SENSOR',
  SYSTEM: 'SYSTEM'
};

export const APPROVED_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  CORRECTIVE: 'Corrective Maintenance',
  PREVENTIVE: 'Preventive Service',
  PREDICTIVE: 'Predictive Service',
  INSPECTION: 'Routine Inspection',
  EMERGENCY: 'Emergency Intervention',
  UPGRADE: 'System Upgrade',
  OTHER: 'Technical Service'
};

/**
 * Formats a safe, deterministic technical display label derived exclusively from
 * strictly approved categories, known equipment types, and valid alphanumeric maintenance codes.
 *
 * DEFECT 2 SECURITY HARDENING:
 * Eliminates all untrusted customer free-text reflection.
 * - category: strictly validated against APPROVED_CATEGORY_LABELS (fallback: 'Technical Service').
 * - equipmentType: strictly mapped against APPROVED_EQUIPMENT_LABELS (fallback: 'SYSTEM' or 'EQUIPMENT').
 *   Any customer text with embedded PII (phone, address, names) strictly evaluates to fallback.
 * - maintenanceCode: strictly validated against safe alphanumeric pattern `/^[A-Z0-9_-]{3,30}$/i`.
 *   Any maintenanceCode containing spaces, PII, or unexpected characters is strictly omitted.
 */
export function formatTechnicalDisplayTitle(
  category: string,
  equipmentType?: string,
  maintenanceCode?: string
): string {
  const cleanCat = (category || 'CORRECTIVE').trim().toUpperCase();
  const categoryLabel = APPROVED_CATEGORY_LABELS[cleanCat] || 'Technical Service';

  let equipLabel = 'SYSTEM';
  if (equipmentType && typeof equipmentType === 'string') {
    const cleanEquip = equipmentType.trim().toUpperCase();
    equipLabel = APPROVED_EQUIPMENT_LABELS[cleanEquip] || 'EQUIPMENT';
  }

  let codeSuffix = '';
  if (maintenanceCode && typeof maintenanceCode === 'string') {
    const cleanCode = maintenanceCode.trim();
    if (/^[A-Z0-9_-]{3,30}$/i.test(cleanCode)) {
      codeSuffix = ` [${cleanCode.toUpperCase()}]`;
    }
  }

  return `${categoryLabel} — ${equipLabel}${codeSuffix}`;
}

/**
 * Strict allowlist projection for technician-visible case data prior to formal acceptance,
 * as well as for cancelled and closed cases.
 *
 * Excludes:
 * - Free-text fields that may contain personal data (title scrubbed to generic category label, description, symptoms, closureNotes, resolutionSummary, rootCause)
 * - Arbitrary JSON structures and nested technical metadata (actionsTaken, sparePartsUsed, postMaintenanceCheck, alerts, diagnosis)
 * - Customer contact details and identity (contactName, contactPhone, reportedBy, customer phone numbers)
 * - Private attachment content or download references (photos, documents, billDoc, attachments)
 * - Financial cost breakdowns and execution timestamps prior to acceptance
 */
export function projectTechnicalAllowlistCase(mCase: MaintenanceCase): MaintenanceCase {
  return {
    // Explicit minimum safe technical metadata for assignment review
    id: mCase.id,
    maintenanceCode: mCase.maintenanceCode,
    caseNumber: mCase.caseNumber,
    projectId: mCase.projectId,
    assetId: mCase.assetId,
    componentId: mCase.componentId,
    equipmentType: mCase.equipmentType,
    // BLOCKER 1 FIX: Safe, deterministic generic technical label eliminating untrusted customer free text
    title: formatTechnicalDisplayTitle(mCase.category, mCase.equipmentType, mCase.maintenanceCode),
    category: mCase.category,
    priority: mCase.priority,
    status: mCase.status,
    reportedAt: mCase.reportedAt,
    assignedTechnicianId: mCase.assignedTechnicianId,
    assignedTechnicianName: mCase.assignedTechnicianName,
    assignedOrganizationId: mCase.assignedOrganizationId,
    scheduledAt: mCase.scheduledAt,
    scheduledDate: mCase.scheduledDate,
    currency: mCase.currency,
    createdAt: mCase.createdAt,
    updatedAt: mCase.updatedAt,

    // Sensitive free-text, customer identity, and execution fields strictly scrubbed via allowlist:
    description: '',
    symptoms: [],
    alertIds: [],
    reportedBy: '',
    contactName: undefined,
    contactPhone: undefined,
    assignedTechnicianPhone: undefined,
    diagnosisId: undefined,
    photos: [],
    documents: [],
    billDoc: undefined,
    attachments: [],
    actionsTaken: undefined,
    closureNotes: undefined,
    resolutionSummary: undefined,
    rootCause: undefined,
    sparePartsUsed: [],
    postMaintenanceCheck: undefined,
    downtimeMinutes: undefined,
    laborCost: undefined,
    partsCost: undefined,
    totalCost: undefined,
    totalCostIrr: undefined,
    totalLaborHours: undefined,
    startedAt: undefined,
    completedAt: undefined,
    completedDate: undefined,
    verifiedAt: undefined,
    verifiedBy: undefined,
    verificationNotes: undefined,
    verificationPassed: undefined
  };
}

/**
 * Sanitizes an attachment object for an actively accepted technician.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION — BLOCKER 2 FIX:
 * Employs a strict explicit allowlist rather than spread-and-delete.
 * Prohibits leaking:
 * - Arbitrary unknown metadata or internal properties
 * - Storage keys (storageKey), storage providers, checksums, or raw base64 data buffers
 * - Raw extracted OCR/AI data (extractedDetails, customerPhone, internalNotes, unreviewed AI content)
 * - Customer / uploader personal identifiers
 *
 * Only safe, verified numeric technical measurements (e.g., hotspotCelsius, voltage, temperature)
 * are permitted within extractedData.
 */
export function sanitizeAcceptedAttachment(att: CaseAttachment): CaseAttachment {
  if (!att || typeof att !== 'object') {
    throw new DataIntegrityError('Invalid attachment data structure');
  }

  const safe: CaseAttachment = {
    id: String(att.id || '').trim(),
    maintenanceCaseId: String(att.maintenanceCaseId || '').trim(),
    name: String(att.name || '').trim(),
    type: (att.type || 'PHOTO') as any,
    url: String(att.url || '').trim(),
    uploadedBy: 'SYSTEM_VERIFIED',
    uploadedAt: typeof att.uploadedAt === 'string' && att.uploadedAt.trim() !== ''
      ? att.uploadedAt
      : new Date().toISOString(),
    sizeBytes: typeof att.sizeBytes === 'number' && Number.isFinite(att.sizeBytes) ? att.sizeBytes : undefined,
    mimeType: typeof att.mimeType === 'string' ? att.mimeType.trim() : undefined,
    status: att.status
  };

  // Only allow explicitly verified numeric technical telemetry in extractedData
  if (att.extractedData && typeof att.extractedData === 'object' && !Array.isArray(att.extractedData)) {
    const safeExtracted: Record<string, any> = {};
    if (typeof att.extractedData.hotspotCelsius === 'number' && Number.isFinite(att.extractedData.hotspotCelsius)) {
      safeExtracted.hotspotCelsius = att.extractedData.hotspotCelsius;
    }
    if (typeof att.extractedData.temperature === 'number' && Number.isFinite(att.extractedData.temperature)) {
      safeExtracted.temperature = att.extractedData.temperature;
    }
    if (typeof att.extractedData.voltage === 'number' && Number.isFinite(att.extractedData.voltage)) {
      safeExtracted.voltage = att.extractedData.voltage;
    }
    if (typeof att.extractedData.current === 'number' && Number.isFinite(att.extractedData.current)) {
      safeExtracted.current = att.extractedData.current;
    }
    if (typeof att.extractedData.kwhTotal === 'number' && Number.isFinite(att.extractedData.kwhTotal)) {
      safeExtracted.kwhTotal = att.extractedData.kwhTotal;
    }
    if (Object.keys(safeExtracted).length > 0) {
      safe.extractedData = safeExtracted;
    }
  }

  return safe;
}

/**
 * Strict allowlist projection for spare part items used during maintenance.
 * Prevents arbitrary nested metadata leakage.
 */
export function sanitizeSparePart(part: SparePartUsage): SparePartUsage {
  if (!part || typeof part !== 'object') {
    throw new DataIntegrityError('Invalid spare part structure');
  }
  return {
    partName: String(part.partName || '').trim(),
    partNumber: part.partNumber ? String(part.partNumber).trim() : undefined,
    quantity: typeof part.quantity === 'number' && Number.isFinite(part.quantity) ? part.quantity : 1,
    costIrr: typeof part.costIrr === 'number' && Number.isFinite(part.costIrr) ? part.costIrr : undefined,
    replacedComponentId: part.replacedComponentId ? String(part.replacedComponentId).trim() : undefined
  };
}

/**
 * Strict allowlist projection for post-maintenance check metadata.
 */
export function sanitizePostMaintenanceCheck(check: any) {
  if (!check || typeof check !== 'object') return undefined;
  return {
    status: ['IMPROVED', 'UNCHANGED', 'DEGRADED', 'INSUFFICIENT_DATA'].includes(check.status)
      ? check.status
      : 'INSUFFICIENT_DATA',
    preGenerationKwh: typeof check.preGenerationKwh === 'number' && Number.isFinite(check.preGenerationKwh)
      ? check.preGenerationKwh
      : null,
    postGenerationKwh: typeof check.postGenerationKwh === 'number' && Number.isFinite(check.postGenerationKwh)
      ? check.postGenerationKwh
      : null,
    evaluatedAt: parseOptionalTimestamp(check.evaluatedAt) || new Date().toISOString(),
    notes: check.notes ? String(check.notes).trim() : undefined
  };
}

/**
 * Strict allowlist projection for action items taken.
 */
export function sanitizeActionTaken(action: any): any {
  if (!action || typeof action !== 'object') return null;
  return {
    note: action.note ? String(action.note) : '',
    timestamp: parseOptionalTimestamp(action.timestamp),
    actionType: action.actionType ? String(action.actionType) : undefined
  };
}

/**
 * Strict allowlist projection for actively accepted technicians in non-terminal execution states.
 *
 * CRITICAL ARCHITECTURAL CONSTITUTION:
 * Eliminates unrestricted object spreading ({ ...mCase }) to prevent leaking unanticipated properties,
 * internal database columns, billing documents, unreviewed raw AI data, or arbitrary customer metadata.
 * Only properties explicitly permitted for active maintenance execution are emitted.
 */
export function projectAcceptedTechnicianCase(mCase: MaintenanceCase): MaintenanceCase {
  const sanitizedAttachments = Array.isArray(mCase.attachments)
    ? mCase.attachments.map(sanitizeAcceptedAttachment)
    : [];

  const sanitizedSpareParts = Array.isArray(mCase.sparePartsUsed)
    ? mCase.sparePartsUsed.map(sanitizeSparePart)
    : [];

  const sanitizedActions = Array.isArray(mCase.actionsTaken)
    ? mCase.actionsTaken.map(sanitizeActionTaken).filter(Boolean)
    : undefined;

  const sanitizedPostCheck = sanitizePostMaintenanceCheck(mCase.postMaintenanceCheck);

  return {
    id: mCase.id,
    maintenanceCode: mCase.maintenanceCode,
    caseNumber: mCase.caseNumber,
    projectId: mCase.projectId,
    assetId: mCase.assetId,
    componentId: mCase.componentId,
    equipmentType: mCase.equipmentType,
    title: mCase.title,
    description: mCase.description,
    category: mCase.category,
    priority: mCase.priority,
    status: mCase.status,
    reportedBy: mCase.reportedBy,
    reportedAt: mCase.reportedAt,
    contactName: mCase.contactName,
    contactPhone: mCase.contactPhone,
    assignedTechnicianId: mCase.assignedTechnicianId,
    assignedTechnicianName: mCase.assignedTechnicianName,
    assignedTechnicianPhone: mCase.assignedTechnicianPhone,
    assignedOrganizationId: mCase.assignedOrganizationId,
    scheduledAt: mCase.scheduledAt,
    scheduledDate: mCase.scheduledDate,
    startedAt: mCase.startedAt,
    completedAt: mCase.completedAt,
    completedDate: mCase.completedDate,
    closureNotes: mCase.closureNotes,
    resolutionSummary: mCase.resolutionSummary,
    rootCause: mCase.rootCause,
    actionsTaken: sanitizedActions,
    symptoms: Array.isArray(mCase.symptoms) ? [...mCase.symptoms] : [],
    alertIds: Array.isArray(mCase.alertIds) ? [...mCase.alertIds] : [],
    photos: Array.isArray(mCase.photos) ? [...mCase.photos] : [],
    documents: Array.isArray(mCase.documents) ? [...mCase.documents] : [],
    attachments: sanitizedAttachments,
    downtimeMinutes: mCase.downtimeMinutes,
    laborCost: mCase.laborCost,
    partsCost: mCase.partsCost,
    totalCost: mCase.totalCost,
    totalCostIrr: mCase.totalCostIrr,
    totalLaborHours: mCase.totalLaborHours,
    sparePartsUsed: sanitizedSpareParts,
    currency: mCase.currency,
    postMaintenanceCheck: sanitizedPostCheck,
    createdAt: mCase.createdAt,
    updatedAt: mCase.updatedAt,
    // Strictly prohibited fields for technicians
    billDoc: undefined,
    diagnosisId: undefined,
    verifiedBy: undefined,
    verificationNotes: undefined,
    verificationPassed: undefined,
    verifiedAt: undefined
  };
}

/**
 * Projects a maintenance case for the authorized caller.
 * Applies strict allowlist technical projection for pre-acceptance and terminal cases.
 */
export function projectCaseForCaller(
  mCase: MaintenanceCase,
  access: CaseAccessEvaluation
): MaintenanceCase {
  // Case reporters (customers) receive their own full case data
  if (access.isReporter) {
    return { ...mCase };
  }

  const isTerminal = mCase.status === 'CANCELLED' || mCase.status === 'CLOSED';
  const allowFullTechnicalExecution = access.isAssignedTech && access.isFormallyAccepted && !isTerminal;

  if (allowFullTechnicalExecution) {
    return projectAcceptedTechnicianCase(mCase);
  }

  // Pre-acceptance, unaccepted, or terminal (CLOSED/CANCELLED):
  // Return ONLY explicitly allowlisted non-sensitive technical fields.
  return projectTechnicalAllowlistCase(mCase);
}

/**
 * Evaluates and projects a collection of maintenance cases for the authorized caller.
 *
 * DEFECT 1 FIX:
 * Accepts an optional lookup map of case assignment histories.
 * For technician callers, cases that have achieved formal acceptance in the current active
 * execution cycle are projected with full operational execution data (projectAcceptedTechnicianCase).
 * Unaccepted, unassigned, or terminal (CLOSED/CANCELLED) cases are strictly projected with
 * minimum technical metadata and masked customer privacy fields (projectTechnicalAllowlistCase).
 */
export function evaluateAndProjectCasesForCaller(
  cases: MaintenanceCase[],
  auth: MaintenanceAuthContext,
  historiesByCaseId?: Map<string, MaintenanceAssignmentHistory[]>
): MaintenanceCase[] {
  const results: MaintenanceCase[] = [];
  for (const c of cases) {
    const caseHistories = historiesByCaseId?.get(c.id);
    const access = evaluateCaseAccess(c, auth, caseHistories);
    if (access.allowed) {
      results.push(projectCaseForCaller(c, access));
    }
  }
  return results;
}

/**
 * Validates that a list query provides an explicit authorized scope to prevent silent table scans.
 * In Phase P2-A, broad unscoped queries are strictly rejected (fails closed).
 */
export function validateListCaseFilter(
  filter: AuthorizedMaintenanceCaseFilter,
  auth: MaintenanceAuthContext
): void {
  if (!auth || !auth.userId || typeof auth.userId !== 'string' || auth.userId.trim() === '') {
    throw new MaintenanceAuthError('User authentication context is mandatory for list operations.');
  }

  // In Phase P2-A, broad unscoped queries are strictly prohibited (no trusted admin bypass)
  const hasScope = Boolean(filter.projectId || filter.assetId || filter.assignedTechnicianId || filter.reportedBy);
  if (!hasScope) {
    throw new MaintenanceAccessDeniedError('Unscoped list queries are prohibited. An explicit query scope (projectId, assetId, reporterId, or technicianId) is mandatory.');
  }

  if (isTechnicianRole(auth)) {
    const authorizedIds = resolveAuthorizedTechnicianIds(auth);
    if (filter.assignedTechnicianId) {
      const requestedId = filter.assignedTechnicianId.trim();
      const isMatch = authorizedIds.some(id => areTechnicianIdentitiesEquivalent(id, requestedId));
      if (!isMatch) {
        throw new MaintenanceAccessDeniedError('Technicians are strictly restricted to filtering by their own assigned identity.');
      }
    }
  } else {
    // Customer role: filtering by projectId or assetId alone does not prove ownership
    if (filter.reportedBy !== auth.userId) {
      throw new MaintenanceAccessDeniedError('Customers are restricted to viewing cases reported by their own account (reportedBy match required).');
    }
  }
}

/**
 * Projects an assignment history record with strict cross-user privacy controls.
 *
 * Case reporters (customers) see the full assignment history for their own case.
 * Technicians only see history records relating to their own identity, and notes authored
 * by other parties (such as dispatch chatter, customer phone/address, or internal notes)
 * are masked to safe status descriptions, preventing cross-user data leakage.
 */
export function projectSafeAssignmentHistory(
  history: MaintenanceAssignmentHistory,
  auth: MaintenanceAuthContext,
  isReporter: boolean
): MaintenanceAssignmentHistory {
  if (isReporter) {
    return {
      id: history.id,
      maintenanceCaseId: history.maintenanceCaseId,
      technicianId: history.technicianId,
      organizationId: history.organizationId,
      assignedBy: history.assignedBy,
      assignedAt: history.assignedAt,
      status: history.status,
      notes: history.notes
    };
  }

  const isAuthor = history.assignedBy === auth.userId;
  // If not authored by this technician, mask the notes to safe generic status label
  const safeNotes = isAuthor
    ? history.notes
    : (history.status ? `Status transition: ${history.status}` : undefined);

  return {
    id: history.id,
    maintenanceCaseId: history.maintenanceCaseId,
    technicianId: history.technicianId,
    organizationId: history.organizationId,
    assignedBy: isAuthor ? history.assignedBy : 'DISPATCHER',
    assignedAt: history.assignedAt,
    status: history.status,
    notes: safeNotes
  };
}

// ============================================================================
// Asynchronous PostgreSQL Maintenance Adapter
// ============================================================================

export const maintenancePostgresAdapter = {
  /**
   * Retrieves a single maintenance case by internal ID, caseNumber, or maintenanceCode.
   * Enforces caller authorization, fail-closed error handling, and strict allowlist privacy projections.
   */
  async getCaseById(id: string, auth: MaintenanceAuthContext, dbOverride?: any): Promise<MaintenanceCase | null> {
    if (!auth || !auth.userId || typeof auth.userId !== 'string' || auth.userId.trim() === '') {
      throw new MaintenanceAuthError('Authentication context is required.');
    }

    if (!id || typeof id !== 'string') return null;
    const cleanId = id.trim();
    if (cleanId === '') return null;

    const db = dbOverride || getPostgresDB();
    if (!db) {
      throw new PostgresUnavailableError('PostgreSQL database connection is not available in this environment.');
    }

    let rows: any[];
    try {
      rows = await db
        .select()
        .from(maintenanceCases)
        .where(
          or(
            eq(maintenanceCases.id, cleanId),
            ilike(maintenanceCases.caseNumber, cleanId),
            ilike(maintenanceCases.maintenanceCode, cleanId)
          )
        )
        .limit(1);
    } catch {
      throw new PostgresUnavailableError('Failed to execute query on PostgreSQL database.');
    }

    if (!rows || rows.length === 0) {
      return null;
    }

    const rawCase = mapPgCaseToDomain(rows[0]);

    let histories: MaintenanceAssignmentHistory[] = [];
    try {
      const historyRows = await db
        .select()
        .from(maintenanceAssignmentHistories)
        .where(eq(maintenanceAssignmentHistories.maintenanceCaseId, rawCase.id))
        .orderBy(asc(maintenanceAssignmentHistories.assignedAt));

      histories = (historyRows || []).map(mapPgHistoryToDomain);
    } catch (histErr) {
      if (histErr instanceof DataIntegrityError) throw histErr;
      throw new PostgresUnavailableError('Failed to query assignment history from PostgreSQL database.');
    }

    const access = evaluateCaseAccess(rawCase, auth, histories);
    if (!access.allowed) {
      throw new MaintenanceAccessDeniedError(access.error || 'Access to maintenance case is denied.');
    }

    return projectCaseForCaller(rawCase, access);
  },

  /**
   * Lists maintenance cases using explicit authorized query filters.
   * Strictly prevents unfiltered database dumps with in-database pre-filtering.
   */
  async listCases(
    filter: AuthorizedMaintenanceCaseFilter,
    auth: MaintenanceAuthContext,
    dbOverride?: any
  ): Promise<MaintenanceCase[]> {
    validateListCaseFilter(filter, auth);

    const db = dbOverride || getPostgresDB();
    if (!db) {
      throw new PostgresUnavailableError('PostgreSQL database connection is not available in this environment.');
    }

    const conditions: any[] = [];

    // Apply strict in-database role boundaries with fail-closed identity resolution
    if (isTechnicianRole(auth)) {
      const authorizedIds = resolveAuthorizedTechnicianIds(auth);
      if (filter.assignedTechnicianId) {
        conditions.push(eq(maintenanceCases.assignedTechnicianId, filter.assignedTechnicianId.trim()));
      } else {
        if (authorizedIds.length === 1) {
          conditions.push(eq(maintenanceCases.assignedTechnicianId, authorizedIds[0]));
        } else {
          conditions.push(or(...authorizedIds.map(id => eq(maintenanceCases.assignedTechnicianId, id))));
        }
      }
    } else {
      conditions.push(eq(maintenanceCases.reportedBy, auth.userId));
    }

    if (filter.projectId) {
      conditions.push(eq(maintenanceCases.projectId, filter.projectId));
    }
    if (filter.assetId) {
      conditions.push(eq(maintenanceCases.assetId, filter.assetId));
    }
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        conditions.push(or(...filter.status.map(s => eq(maintenanceCases.status, s))));
      } else {
        conditions.push(eq(maintenanceCases.status, filter.status));
      }
    }

    const limit = Math.min(Math.max(1, filter.limit || 50), 200);
    const offset = Math.max(0, filter.offset || 0);

    let rows: any[];
    try {
      rows = await db
        .select()
        .from(maintenanceCases)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset);
    } catch {
      throw new PostgresUnavailableError('Failed to execute list query on PostgreSQL database.');
    }

    const domainCases = rows.map(mapPgCaseToDomain);

    const historiesByCaseId = new Map<string, MaintenanceAssignmentHistory[]>();

    // DEFECT 1 FIX:
    // Identify non-terminal cases assigned to the caller that require active execution cycle evaluation
    const activeTechCaseIds = domainCases
      .filter(c =>
        c.status !== 'CLOSED' &&
        c.status !== 'CANCELLED' &&
        c.assignedTechnicianId &&
        areTechnicianIdentitiesEquivalent(c.assignedTechnicianId, auth.userId)
      )
      .map(c => c.id);

    const uniqueActiveTechCaseIds = Array.from(new Set(activeTechCaseIds));

    if (uniqueActiveTechCaseIds.length > 0) {
      let historyRows: any[];
      try {
        historyRows = await db
          .select()
          .from(maintenanceAssignmentHistories)
          .where(
            uniqueActiveTechCaseIds.length === 1
              ? eq(maintenanceAssignmentHistories.maintenanceCaseId, uniqueActiveTechCaseIds[0])
              : inArray(maintenanceAssignmentHistories.maintenanceCaseId, uniqueActiveTechCaseIds)
          )
          .orderBy(asc(maintenanceAssignmentHistories.assignedAt));
      } catch (histErr) {
        if (histErr instanceof DataIntegrityError) throw histErr;
        throw new PostgresUnavailableError('Failed to query assignment histories for list query from PostgreSQL database.');
      }

      for (const r of historyRows || []) {
        const hist = mapPgHistoryToDomain(r);
        const list = historiesByCaseId.get(hist.maintenanceCaseId) || [];
        list.push(hist);
        historiesByCaseId.set(hist.maintenanceCaseId, list);
      }
    }

    return evaluateAndProjectCasesForCaller(domainCases, auth, historiesByCaseId);
  },

  /**
   * Retrieves the assignment history for a maintenance case.
   * Requires caller authorization on the parent maintenance case.
   * Enforces role-specific history privacy: Assigned technicians can only view their own assignment history.
   * Former technicians and unrelated users are strictly rejected with 403.
   */
  async getAssignmentHistories(
    caseId: string,
    auth: MaintenanceAuthContext,
    dbOverride?: any
  ): Promise<MaintenanceAssignmentHistory[]> {
    if (!auth || !auth.userId || typeof auth.userId !== 'string' || auth.userId.trim() === '') {
      throw new MaintenanceAuthError('Authentication context is required.');
    }

    if (!caseId || typeof caseId !== 'string') return [];
    const cleanId = caseId.trim();
    if (cleanId === '') return [];

    const db = dbOverride || getPostgresDB();
    if (!db) {
      throw new PostgresUnavailableError('PostgreSQL database connection is not available in this environment.');
    }

    // Verify parent case exists and evaluate caller access
    let caseRows: any[];
    try {
      caseRows = await db
        .select()
        .from(maintenanceCases)
        .where(eq(maintenanceCases.id, cleanId))
        .limit(1);
    } catch {
      throw new PostgresUnavailableError('Failed to execute case lookup query on PostgreSQL database.');
    }

    if (!caseRows || caseRows.length === 0) {
      return [];
    }

    const parentCase = mapPgCaseToDomain(caseRows[0]);
    const access = evaluateCaseAccess(parentCase, auth);
    if (!access.allowed) {
      throw new MaintenanceAccessDeniedError('ACCESS_DENIED: Caller lacks permission to view assignment history for this case.');
    }

    let rows: any[];
    try {
      rows = await db
        .select()
        .from(maintenanceAssignmentHistories)
        .where(eq(maintenanceAssignmentHistories.maintenanceCaseId, parentCase.id))
        .orderBy(asc(maintenanceAssignmentHistories.assignedAt));
    } catch {
      throw new PostgresUnavailableError('Failed to query assignment histories from PostgreSQL database.');
    }

    const allHistories = rows.map(mapPgHistoryToDomain);

    // Apply role-specific history privacy:
    // Case reporters (customers) see complete assignment history for their own case.
    // Currently assigned technicians only see history records relating to their own identity with cross-user notes masked.
    if (access.isReporter) {
      return allHistories.map(h => projectSafeAssignmentHistory(h, auth, true));
    }

    if (access.isAssignedTech) {
      return allHistories
        .filter(h => areTechnicianIdentitiesEquivalent(h.technicianId, auth.userId))
        .map(h => projectSafeAssignmentHistory(h, auth, false));
    }

    throw new MaintenanceAccessDeniedError('ACCESS_DENIED: History access restricted.');
  }
};
