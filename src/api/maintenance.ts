import express, { Request, Response } from 'express';
import { verifyAuthToken, requireAuth } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { monitoringRepository } from '../repositories/monitoringRepository.js';
import { alertService } from '../services/alertService.js';
import { diagnosisService } from '../services/diagnosisService.js';
import {
  maintenanceCaseService,
  hasCurrentCycleAcceptance,
  validateFinancialAmount,
  validateClientRequestId,
  computeActionPayloadHash
} from '../services/maintenanceCaseService.js';
import { technicianMatchingService } from '../services/technicianMatchingService.js';
import { isCaseAssignedToTechnician, getTechnicianIdentities, resolveTechnicianProfile, areTechnicianIdentitiesEquivalent } from '../services/technicianIdentityService.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { validateAndNormalizeImage, ImageValidationError, ValidatedImage } from '../utils/imageValidator.js';
import {
  AssetAlert,
  AlertRule,
  MaintenanceCase,
  MaintenanceAction,
  MaintenancePriority,
  MaintenanceStatus,
  AssetMaintenanceHistoryItem,
  CaseAttachment,
  MaintenanceAssignmentHistory,
  RecordCaseActionResult
} from '../types/maintenance.js';
import {
  getFileStorageService,
  handleMultipartUpload,
  validateBinaryFile,
  generateStorageKey,
  sanitizeOriginalFilename,
  FileValidationError
} from '../storage/index.js';
import { DatabaseStorageError } from '../db/index.js';

export function isPersistenceError(err: any): boolean {
  if (!err) return false;
  if (err instanceof DatabaseStorageError || err.isPersistenceError === true || err.name === 'DatabaseStorageError') {
    return true;
  }
  const msg = typeof err.message === 'string' ? err.message : '';
  return (
    msg.includes('FATAL: Failed to persist database') ||
    msg.includes('Storage write error') ||
    msg.includes('SIMULATED_FILESYSTEM_WRITE_FAILURE') ||
    msg.includes('ENOSPC') ||
    msg.includes('EACCES') ||
    msg.includes('EPERM') ||
    msg.includes('EROFS') ||
    msg.includes('EIO')
  );
}

export const maintenanceRouter = express.Router();

maintenanceRouter.use(verifyAuthToken);
maintenanceRouter.use(requireAuth);

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

/**
 * Authoritative case permission checker.
 * Strictly enforces project boundary, reporter ownership, and assigned technician isolation.
 * CUSTOMER_DIRECT cases are private to the reporter, assigned technician, or system admin.
 */
export function checkCaseAccess(
  mCase: MaintenanceCase,
  user: { id?: string; role?: string } | undefined,
  options?: { requireReporterOrAdmin?: boolean; requireTechnicianOrAdmin?: boolean }
): { allowed: boolean; status?: number; error?: string; isReporter: boolean; isAssignedTech: boolean; isAdmin: boolean } {
  if (!user || !user.id) {
    return { allowed: false, status: 401, error: 'احراز هویت الزامی است.', isReporter: false, isAssignedTech: false, isAdmin: false };
  }
  const userRoles: string[] = Array.isArray((user as any).roles) ? (user as any).roles : (user.role ? [user.role] : []);
  const roleUpper = user.role?.toUpperCase() || (userRoles[0] ? userRoles[0].toUpperCase() : '');
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || user.role === 'admin' || userRoles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
  const isReporter = Boolean(mCase.reportedBy && mCase.reportedBy === user.id);
  const isAssignedTech = Boolean(mCase.assignedTechnicianId && (mCase.assignedTechnicianId === user.id || isCaseAssignedToTechnician(mCase.assignedTechnicianId, user.id)));

  if (isAdmin) {
    return { allowed: true, isReporter, isAssignedTech, isAdmin: true };
  }

  if (options?.requireReporterOrAdmin && !isReporter) {
    return { allowed: false, status: 403, error: 'تنها ثبت‌کننده پرونده یا مدیر سیستم مجاز به این عملیات است.', isReporter, isAssignedTech, isAdmin };
  }

  if (options?.requireTechnicianOrAdmin && !isAssignedTech) {
    return { allowed: false, status: 403, error: 'تنها تکنسین منتسب به این پرونده مجاز به این عملیات است.', isReporter, isAssignedTech, isAdmin };
  }

  if (isReporter || isAssignedTech) {
    return { allowed: true, isReporter, isAssignedTech, isAdmin: false };
  }

  const techRoles = ['technician', 'professional', 'expert'];
  const isTechRole = techRoles.includes(user.role?.toLowerCase() || '') || userRoles.some(r => techRoles.includes(r.toLowerCase()));
  if (isTechRole) {
    return { allowed: false, status: 403, error: 'شما به عنوان تکنسین تنها به پرونده‌های محول شده به خودتان دسترسی دارید.', isReporter, isAssignedTech, isAdmin };
  }

  if (mCase.projectId === 'CUSTOMER_DIRECT') {
    return { allowed: false, status: 403, error: 'شما دسترسی به این پرونده را ندارید.', isReporter, isAssignedTech, isAdmin };
  }

  const projAccess = checkProjectAccess(mCase.projectId, user.id, user.role);
  if (!projAccess.allowed) {
    return { allowed: false, status: projAccess.status || 403, error: projAccess.error, isReporter, isAssignedTech, isAdmin };
  }

  return { allowed: true, isReporter, isAssignedTech, isAdmin: false };
}

/**
 * Sanitizes a maintenance case representation for technician-facing responses.
 * Enforces customer privacy boundary:
 * Until formal technician acceptance (status 'IN_PROGRESS', 'SCHEDULED', 'AWAITING_VERIFICATION',
 * 'PENDING_VERIFICATION', 'VERIFIED', 'COMPLETED', 'RESOLVED', 'CLOSED' or an ACCEPTED assignment history),
 * private customer contact info (contactName, contactPhone, and any customer phone numbers)
 * MUST NOT be exposed to the technician.
 * 
 * Never mutates the original database record. Returns a safe cloned/projected object.
 */
/**
 * Checks server-authoritative evidence whether the currently assigned technician
 * has formally accepted the maintenance case for the CURRENT assignment cycle.
 * 
 * Rules:
 * 1. Checks server-persisted assignment histories for status === 'ACCEPTED'.
 * 2. Matches technicianId strictly against the currently assigned technician.
 * 3. An ACCEPTED entry for another/previous technician or a PREVIOUS assignment cycle
 *    NEVER authorizes the current assignment cycle.
 * 4. SCHEDULED alone does NOT constitute formal acceptance.
 */
export function hasTechnicianFormallyAccepted(mCase: MaintenanceCase): boolean {
  return hasCurrentCycleAcceptance(mCase, undefined, { requireExecutionStatusForModern: true });
}

export function sanitizeAttachmentForTechnician(
  att: CaseAttachment,
  options?: { isAccepted?: boolean; isTerminal?: boolean }
): Record<string, any> {
  const isTerminal = options?.isTerminal ?? false;
  const isAccepted = options?.isAccepted ?? false;

  // Clone attachment shallowly to prevent database mutation
  const safe: Record<string, any> = { ...att };

  // Storage internals and raw buffers must never leak
  delete safe.storageKey;
  delete safe.data;

  // Redact direct download URLs and scrub extracted customer data in terminal or unaccepted states
  if (isTerminal || !isAccepted) {
    delete safe.url;

    if (safe.extractedData && typeof safe.extractedData === 'object') {
      const safeExtracted = { ...safe.extractedData };
      delete safeExtracted.customerPhone;
      delete safeExtracted.phone;
      delete safeExtracted.customerName;
      delete safeExtracted.nationalId;
      delete safeExtracted.contactPhone;
      delete safeExtracted.contactName;
      delete safeExtracted.address;
      delete (safeExtracted as any).rawPhone;
      if (isTerminal || safe.type === 'BILL') {
        delete safeExtracted.billIdentifier;
        delete safeExtracted.billId;
        delete safeExtracted.paymentId;
      }
      safe.extractedData = safeExtracted;
    }
  }

  // Preserve safe historical audit metadata (id, maintenanceCaseId, name, type, uploadedBy, uploadedAt, sizeBytes, mimeType, status, checksumSha256)
  return safe;
}

export function sanitizeCaseForTechnician(
  mCase: MaintenanceCase,
  options?: { isAccepted?: boolean }
): Record<string, any> {
  const isTerminal = mCase.status === 'CANCELLED' || mCase.status === 'CLOSED';
  // If formally accepted and not terminal, customer contact details are authorized for technical execution.
  // Terminal cases (CANCELLED or CLOSED) MUST NEVER expose customer contact info to technicians,
  // even if the technician previously accepted the case during its active execution lifecycle.
  const isAccepted = !isTerminal && (options?.isAccepted !== undefined
    ? options.isAccepted
    : hasTechnicianFormallyAccepted(mCase));

  // Shallow clone top-level
  const safe: Record<string, any> = { ...mCase };

  // Always sanitize attachments for technicians
  if (Array.isArray(safe.attachments)) {
    safe.attachments = safe.attachments.map(att =>
      sanitizeAttachmentForTechnician(att, { isAccepted, isTerminal })
    );
  }

  if (!isAccepted) {
    // Strictly omit customer private contact information
    delete safe.contactName;
    delete safe.contactPhone;
    delete (safe as any).customerPhone;
    delete (safe as any).customerName;
    delete (safe as any).rawPhone;

    // Check nested structures if any
    if (safe.billDoc && typeof safe.billDoc === 'object') {
      const safeBill = { ...safe.billDoc };
      delete (safeBill as any).customerPhone;
      delete (safeBill as any).phone;
      delete (safeBill as any).customerName;
      delete (safeBill as any).contactName;
      delete (safeBill as any).contactPhone;
      delete (safeBill as any).url;
      delete (safeBill as any).storageKey;
      delete (safeBill as any).data;

      if (safeBill.extractedData && typeof safeBill.extractedData === 'object') {
        const safeExtracted = { ...safeBill.extractedData };
        delete safeExtracted.customerPhone;
        delete safeExtracted.phone;
        delete safeExtracted.customerName;
        delete safeExtracted.nationalId;
        delete safeExtracted.contactPhone;
        delete safeExtracted.contactName;
        delete safeExtracted.address;
        delete (safeExtracted as any).rawPhone;
        safeBill.extractedData = safeExtracted;
      }
      safe.billDoc = safeBill;
    }
  }

  return safe;
}


// ==========================================
// 1. ALERT ENDPOINTS
// ==========================================

/**
 * GET /api/projects/:projectId/alerts
 * List all alerts for a project with optional filters (severity, status, assetId)
 */
maintenanceRouter.get('/projects/:projectId/alerts', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  let alerts = maintenanceRepository.getAlerts(projectId);

  const { severity, status, assetId, componentId } = req.query;
  if (severity) {
    alerts = alerts.filter(a => a.severity === severity);
  }
  if (status) {
    alerts = alerts.filter(a => a.status === status);
  }
  if (assetId) {
    alerts = alerts.filter(a => a.assetId === assetId);
  }
  if (componentId) {
    alerts = alerts.filter(a => a.componentId === componentId);
  }

  return res.json(alerts);
});

/**
 * GET /api/assets/:assetId/alerts
 * List all alerts for a specific asset
 */
maintenanceRouter.get('/assets/:assetId/alerts', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const alerts = maintenanceRepository.getAlerts(asset.projectId, assetId);
  return res.json(alerts);
});

/**
 * GET /api/alerts/:alertId
 * Retrieve detailed info for a single alert
 */
maintenanceRouter.get('/alerts/:alertId', (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  // Also include linked diagnosis, maintenance case, and warranties if available
  const diagnoses = maintenanceRepository.getDiagnoses(alert.assetId, alert.id);
  const warranties = assetRepository.getEquipmentWarranties(alert.assetId);

  // Authoritative case-level authorization and field-level privacy for linked maintenance case
  let authorizedCase: Record<string, any> | null = null;
  if (alert.maintenanceCaseId) {
    const rawCase = maintenanceRepository.getCaseById(alert.maintenanceCaseId);
    if (rawCase) {
      const caseAccess = checkCaseAccess(rawCase, req.user);
      if (caseAccess.allowed) {
        const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
        if (isReporterOrAdmin) {
          authorizedCase = rawCase;
        } else if (caseAccess.isAssignedTech) {
          const isTerminal = rawCase.status === 'CANCELLED' || rawCase.status === 'CLOSED';
          const isAccepted = !isTerminal && hasTechnicianFormallyAccepted(rawCase);
          authorizedCase = sanitizeCaseForTechnician(rawCase, { isAccepted });
        } else if (access.isOwner) {
          // Project owner who is neither reporter nor administrator:
          // Consistent with direct case-detail privacy policy, receives privacy-sanitized case omitting customer PII
          authorizedCase = sanitizeCaseForTechnician(rawCase, { isAccepted: false });
        } else {
          // Project viewer/member with alert access but no case-specific rights
          authorizedCase = null;
        }
      }
    }
  }

  return res.json({
    ...alert,
    diagnoses,
    maintenanceCase: authorizedCase,
    warranties
  });
});

/**
 * POST /api/assets/:assetId/alerts/evaluate
 * Trigger on-demand telemetry & rule evaluation for an asset
 */
maintenanceRouter.post('/assets/:assetId/alerts/evaluate', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  try {
    const readings = monitoringRepository.getTelemetryReadings(assetId);
    const generatedAlerts: AssetAlert[] = [];

    // Evaluate latest readings for each metric
    const latestByMetric: Record<string, typeof readings[0]> = {};
    for (const r of readings) {
      if (!latestByMetric[r.metricType] || new Date(r.timestamp) > new Date(latestByMetric[r.metricType].timestamp)) {
        latestByMetric[r.metricType] = r;
      }
    }

    for (const reading of Object.values(latestByMetric)) {
      const evAlerts = alertService.evaluateTelemetryReading(reading, assetId, asset.projectId);
      generatedAlerts.push(...evAlerts);
    }

    // Evaluate telemetry loss
    const lossAlerts = alertService.evaluateTelemetryLoss(assetId, asset.projectId);
    generatedAlerts.push(...lossAlerts);

    const currentAlerts = maintenanceRepository.getAlerts(asset.projectId, assetId);
    return res.json({
      evaluatedAt: new Date().toISOString(),
      readingsEvaluated: Object.keys(latestByMetric).length,
      newAlertsCount: generatedAlerts.length,
      newAlerts: generatedAlerts,
      currentActiveAlerts: currentAlerts.filter(a => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED')
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ارزیابی هشدارهای تله‌متری' });
  }
});

/**
 * POST /api/alerts/:alertId/acknowledge
 * Acknowledge an open alert
 */
maintenanceRouter.post('/alerts/:alertId/acknowledge', (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = maintenanceRepository.updateAlert(alertId, {
    status: 'ACKNOWLEDGED',
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: req.user.id
  });

  projectRepository.addActivity({
    projectId: alert.projectId,
    userId: req.user.id,
    type: 'ALERT_ACKNOWLEDGED',
    description: `تأیید مشاهده هشدار: ${alert.title}`
  });

  return res.json(updated);
});

/**
 * POST /api/alerts/:alertId/investigate
 * Mark alert as under investigation
 */
maintenanceRouter.post('/alerts/:alertId/investigate', (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const note = req.body?.note || 'آغاز فرآیند بررسی و ریشه‌یابی نقص فنی';
  const investigationNotes = [...(alert.investigationNotes || []), `[${new Date().toISOString()}] ${note}`];

  const updated = maintenanceRepository.updateAlert(alertId, {
    status: 'UNDER_INVESTIGATION',
    investigationNotes
  });

  projectRepository.addActivity({
    projectId: alert.projectId,
    userId: req.user.id,
    type: 'ALERT_INVESTIGATION_STARTED',
    description: `شروع بررسی هشدار ${alert.alertCode || alert.id}: ${note}`
  });

  return res.json(updated);
});

/**
 * POST /api/alerts/:alertId/maintenance-required
 * Flag that alert requires on-site / workshop maintenance
 */
maintenanceRouter.post('/alerts/:alertId/maintenance-required', (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = maintenanceRepository.updateAlert(alertId, {
    status: 'MAINTENANCE_REQUIRED'
  });

  projectRepository.addActivity({
    projectId: alert.projectId,
    userId: req.user.id,
    type: 'ALERT_MAINTENANCE_FLAGGED',
    description: `نیاز به ثبت پرونده تعمیراتی برای هشدار ${alert.title}`
  });

  return res.json(updated);
});

/**
 * POST /api/alerts/:alertId/resolve
 * Resolve alert directly
 */
maintenanceRouter.post('/alerts/:alertId/resolve', (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const resolutionNote = req.body?.resolutionNote || req.body?.notes || 'رفع هشدار توسط کارشناس بهره‌برداری';

  const updated = maintenanceRepository.updateAlert(alertId, {
    status: 'RESOLVED',
    resolvedAt: new Date().toISOString(),
    resolvedBy: req.user.id,
    resolutionNote
  });

  projectRepository.addActivity({
    projectId: alert.projectId,
    userId: req.user.id,
    type: 'ALERT_RESOLVED',
    description: `حل و بسته شدن هشدار ${alert.title}: ${resolutionNote}`
  });

  return res.json(updated);
});

/**
 * POST /api/alerts/:alertId/dismiss
 * Dismiss / suppress false alarm
 */
maintenanceRouter.post('/alerts/:alertId/dismiss', (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const reason = req.body?.reason || 'عدم نیاز به اقدام / هشدار کاذب';

  const updated = maintenanceRepository.updateAlert(alertId, {
    status: 'DISMISSED',
    resolutionNote: `رد هشدار: ${reason}`,
    resolvedAt: new Date().toISOString(),
    resolvedBy: req.user.id
  });

  projectRepository.addActivity({
    projectId: alert.projectId,
    userId: req.user.id,
    type: 'ALERT_DISMISSED',
    description: `رد هشدار ${alert.title}: ${reason}`
  });

  return res.json(updated);
});

/**
 * PATCH /api/alerts/:alertId
 * Update alert details while strictly rejecting or ignoring parent identity tampering (assetId, projectId, id)
 */
maintenanceRouter.patch('/alerts/:alertId', (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  // Strictly sanitize updates to prevent parent identity tampering
  const safeUpdates: any = { ...req.body };
  delete safeUpdates.id;
  delete safeUpdates.assetId;
  delete safeUpdates.projectId;
  delete safeUpdates.alertCode;
  delete safeUpdates.createdAt;

  const updated = maintenanceRepository.updateAlert(alertId, safeUpdates);
  return res.json(updated);
});

/**
 * POST /api/alerts/:alertId/diagnose
 * Run deterministic + AI-assisted root-cause diagnosis on alert
 */
maintenanceRouter.post('/alerts/:alertId/diagnose', async (req: Request, res: Response) => {
  const alertId = getParam(req.params.alertId);
  const alert = maintenanceRepository.getAlertById(alertId);
  if (!alert) {
    return res.status(404).json({ error: 'هشدار مورد نظر یافت نشد.' });
  }

  const access = checkProjectAccess(alert.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  try {
    const diagnosis = await diagnosisService.generateDiagnosis({
      assetId: alert.assetId,
      alertId: alert.id,
      componentId: alert.componentId,
      symptoms: [alert.title, alert.description, ...(req.body?.symptoms || [])]
    });

    projectRepository.addActivity({
      projectId: alert.projectId,
      userId: req.user.id,
      type: 'DIAGNOSIS_GENERATED',
      description: `تولید تحلیل عیب‌یابی برای هشدار ${alert.title}`
    });

    return res.status(201).json(diagnosis);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در اجرای فرآیند عیب‌یابی' });
  }
});

// ==========================================
// 2. MAINTENANCE CASES ENDPOINTS
// ==========================================

/**
 * GET /api/assets/:assetId/maintenance
 * List maintenance cases for an asset
 */
maintenanceRouter.get('/assets/:assetId/maintenance', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  const userId = req.user?.id;
  const userRolesList: string[] = Array.isArray((req.user as any)?.roles)
    ? (req.user as any).roles
    : (req.user?.role ? [req.user.role] : []);
  const roleUpper = req.user?.role?.toUpperCase() || (userRolesList[0] ? userRolesList[0].toUpperCase() : '');
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || req.user?.role === 'admin' || userRolesList.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
  const isTech = ['technician', 'professional', 'expert'].includes(req.user?.role?.toLowerCase() || '') || userRolesList.some(r => ['technician', 'professional', 'expert'].includes(r.toLowerCase()));

  // 1. Admin access: full visibility across all cases
  if (isAdmin) {
    const cases = maintenanceRepository.getCases(asset.projectId, assetId);
    return res.json(cases);
  }

  // Check baseline project access
  const access = checkProjectAccess(asset.projectId, userId, req.user?.role);

  // 2. Technician access: strictly isolated to cases assigned to this technician
  if (isTech) {
    const allAssetCases = maintenanceRepository.getCases(asset.projectId, assetId);
    const assignedCases = allAssetCases.filter(c => isCaseAssignedToTechnician(c.assignedTechnicianId, userId) || c.assignedTechnicianId === userId);

    if (!access.allowed && assignedCases.length === 0) {
      return res.status(403).json({ error: 'شما به عنوان تکنسین تنها به پرونده‌های محول شده به خودتان دسترسی دارید.' });
    }

    // Sanitize all cases for technician view (masks customer contact info before acceptance and on terminal cases)
    const sanitized = assignedCases.map(c => sanitizeCaseForTechnician(c));
    return res.json(sanitized);
  }

  // 3. Customer / Project Member access: requires project access
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  let cases = maintenanceRepository.getCases(asset.projectId, assetId);
  if (!access.isOwner && asset.projectId === 'CUSTOMER_DIRECT') {
    cases = cases.filter(c => c.reportedBy === userId);
  }

  return res.json(cases);
});

/**
 * POST /api/assets/:assetId/maintenance
 * Create a new maintenance case
 */
maintenanceRouter.post('/assets/:assetId/maintenance', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { title, description, priority, category, alertIds, componentId, diagnosisId } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'عنوان و شرح پرونده تعمیراتی الزامی است.' });
  }

  try {
    const created = maintenanceCaseService.createCase(
      {
        projectId: asset.projectId,
        assetId,
        alertIds: alertIds || [],
        componentId,
        diagnosisId,
        title,
        description,
        priority: priority || 'MEDIUM',
        category: category || 'CORRECTIVE',
        scheduledDate: req.body?.scheduledDate || req.body?.scheduledAt
      },
      req.user.id
    );

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ثبت تیکت تعمیرات' });
  }
});

/**
 * GET /api/cases, /api/maintenance/cases
 * List maintenance cases with role-aware and customer filtering
 */
maintenanceRouter.get(['/cases', '/maintenance/cases'], (req: Request, res: Response) => {
  const userId = req.user?.id;
  const reqRoles: string[] = Array.isArray((req.user as any)?.roles) ? (req.user as any).roles : (req.user?.role ? [req.user.role] : []);
  const roleUpper = req.user?.role?.toUpperCase() || (reqRoles[0] ? reqRoles[0].toUpperCase() : '');
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || req.user?.role === 'admin' || reqRoles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
  const isTech = ['technician', 'professional', 'expert'].includes(req.user?.role?.toLowerCase() || '') || reqRoles.some(r => ['technician', 'professional', 'expert'].includes(r.toLowerCase()));

  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
  const assetId = req.query.assetId ? String(req.query.assetId) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  let allCases = maintenanceRepository.getAllCases();

  if (isTech && !isAdmin) {
    allCases = allCases.filter(c => isCaseAssignedToTechnician(c.assignedTechnicianId, userId) || c.assignedTechnicianId === userId);
  } else if (!isAdmin && userId) {
    const userProjects = projectRepository.findAll().filter(p => p.ownerId === userId);
    const userProjectIds = new Set(userProjects.map(p => p.id));
    allCases = allCases.filter(c => c.reportedBy === userId || (c.projectId !== 'CUSTOMER_DIRECT' && userProjectIds.has(c.projectId)));
  }

  if (projectId) {
    allCases = allCases.filter(c => c.projectId === projectId);
  }
  if (assetId) {
    allCases = allCases.filter(c => c.assetId === assetId);
  }
  if (status && status !== 'ALL') {
    allCases = allCases.filter(c => c.status === status);
  }

  allCases.sort((a, b) => new Date(b.createdAt || b.reportedAt).getTime() - new Date(a.createdAt || a.reportedAt).getTime());
  if (isTech && !isAdmin) {
    const sanitized = allCases.map(c => sanitizeCaseForTechnician(c));
    return res.json(sanitized);
  }
  return res.json(allCases);
});

/**
 * POST /api/cases, /api/maintenance/cases
 * Create customer maintenance request (with optional asset linkage or unregistered equipment)
 */
maintenanceRouter.post(['/cases', '/maintenance/cases'], async (req: Request, res: Response) => {
  // Operational maintenance operations require authentication
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'برای ثبت رسمی پرونده تعمیراتی، ورود به حساب کاربری الزامی است.' });
  }

  const {
    assetId,
    componentId,
    equipmentType,
    title,
    description,
    priority,
    category,
    symptoms,
    diagnosisId,
    assignedTechnicianId,
    assignedTechnicianName,
    assignedTechnicianPhone,
    scheduledDate,
    contactName,
    contactPhone,
    photos,
    documents,
    billDoc,
    billData,
    attachments
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'عنوان و شرح پرونده تعمیراتی الزامی است.' });
  }

  let finalProjectId = 'CUSTOMER_DIRECT';
  let finalAssetId = 'UNREGISTERED';

  if (assetId && assetId !== 'UNREGISTERED' && assetId !== 'STANDALONE') {
    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      return res.status(404).json({ error: 'دارایی انرژی انتخاب شده یافت نشد.' });
    }
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
    finalProjectId = asset.projectId;
    finalAssetId = asset.id;
  }

  try {
    const initialAttachments: any[] = Array.isArray(attachments) ? attachments.map((att: any) => {
      const sanitized = { ...att };
      delete sanitized.data;
      if (typeof sanitized.url === 'string' && sanitized.url.startsWith('data:')) {
        sanitized.url = '';
      }
      return sanitized;
    }) : [];

    if (Array.isArray(photos)) {
      photos.forEach((p: any, idx: number) => {
        initialAttachments.push({
          id: `att-photo-${Date.now()}-${idx}`,
          maintenanceCaseId: '',
          name: p.name || `photo_${idx + 1}.jpg`,
          type: 'PHOTO',
          mimeType: p.mimeType,
          sizeBytes: p.sizeBytes,
          uploadedBy: req.user?.id || 'CUSTOMER',
          uploadedAt: new Date().toISOString(),
          status: 'UPLOADED'
        });
      });
    }

    const effectiveBill = billDoc || billData;
    if (effectiveBill) {
      initialAttachments.push({
        id: `att-bill-${Date.now()}`,
        maintenanceCaseId: '',
        name: effectiveBill.name || 'electricity_bill.pdf',
        type: 'BILL',
        uploadedBy: req.user?.id || 'CUSTOMER',
        uploadedAt: new Date().toISOString(),
        status: effectiveBill.status || 'UNVERIFIED',
        extractedData: effectiveBill.extractedData
      });
    }

    const created = maintenanceCaseService.createCase(
      {
        projectId: finalProjectId,
        assetId: finalAssetId,
        componentId,
        equipmentType,
        symptoms: Array.isArray(symptoms) ? symptoms : [],
        diagnosisId,
        title,
        description,
        priority: priority || 'MEDIUM',
        category: category || 'CORRECTIVE',
        assignedTechnicianId,
        assignedTechnicianName,
        assignedTechnicianPhone,
        scheduledDate,
        contactName,
        contactPhone,
        photos: Array.isArray(photos) ? photos.map((p: any) => p.name || 'photo.jpg') : [],
        documents: Array.isArray(documents) ? documents.map((d: any) => d.name || 'document.pdf') : [],
        billDoc: effectiveBill ? {
          name: effectiveBill.name || 'electricity_bill.pdf',
          status: effectiveBill.status || 'UNVERIFIED',
          extractedData: effectiveBill.extractedData,
          uploadedAt: new Date().toISOString()
        } : undefined,
        attachments: initialAttachments
      },
      req.user?.id || 'CUSTOMER'
    );

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ثبت درخواست تعمیرات' });
  }
});

/**
 * POST /api/diagnose, /api/maintenance/diagnose, /api/analyze-maintenance
 * Evidence-based preliminary AI diagnosis for customer problem reports and visual inspections
 */
maintenanceRouter.post(['/diagnose', '/maintenance/diagnose', '/analyze-maintenance'], async (req: Request, res: Response) => {
  try {
    const {
      assetId,
      componentId,
      equipmentType,
      symptoms,
      locationCity,
      triggerAiAssisted,
      aiImageConsent,
      operatingContext
    } = req.body || {};

    if (aiImageConsent !== undefined && typeof aiImageConsent !== 'boolean') {
      return res.status(400).json({
        error: 'INVALID_AI_IMAGE_CONSENT',
        message: 'aiImageConsent must be a boolean.'
      });
    }

    const description = req.body?.description || req.body?.textContext;
    const rawPhotos = req.body?.photos || req.body?.images;
    const documents = req.body?.documents;
    const billData = req.body?.billData;

    // Strict validation and normalization of generator operatingContext if provided
    let normalizedOperatingContext: any = undefined;
    if (operatingContext && typeof operatingContext === 'object') {
      const {
        fuelType,
        phase,
        coolingType,
        startingMethod,
        storageDuration,
        runningHoursEstimate,
        lastServiceMonthsAgo,
        ratedCapacityKw,
        indoorOperation,
        loadStateWhenFaultOccurred
      } = operatingContext;

      // Validate enums
      const validFuels = ['GASOLINE', 'DIESEL', 'NATURAL_GAS_CNG', 'DUAL_FUEL', 'UNKNOWN'];
      if (fuelType && !validFuels.includes(fuelType)) {
        return res.status(400).json({ error: 'نوع سوخت انتخاب‌شده نامعتبر است.' });
      }

      const validPhases = ['SINGLE_PHASE', 'THREE_PHASE', 'UNKNOWN'];
      if (phase && !validPhases.includes(phase)) {
        return res.status(400).json({ error: 'نوع فاز انتخاب‌شده نامعتبر است.' });
      }

      const validCooling = ['AIR_COOLED', 'WATER_COOLED_RADIATOR', 'UNKNOWN'];
      if (coolingType && !validCooling.includes(coolingType)) {
        return res.status(400).json({ error: 'نوع خنک‌کاری نامعتبر است.' });
      }

      const validStarting = ['RECOIL_MANUAL', 'ELECTRIC_KEY', 'ATS_AUTOMATIC', 'UNKNOWN'];
      if (startingMethod && !validStarting.includes(startingMethod)) {
        return res.status(400).json({ error: 'روش استارت نامعتبر است.' });
      }

      const validStorage = ['ACTIVE_WEEKLY', 'STORED_UNDER_3_MO', 'STORED_OVER_3_MO', 'UNKNOWN'];
      if (storageDuration && !validStorage.includes(storageDuration)) {
        return res.status(400).json({ error: 'مدت انبارش نامعتبر است.' });
      }

      // Numerical validations (must not be negative or NaN)
      if (runningHoursEstimate !== undefined && runningHoursEstimate !== null && runningHoursEstimate !== '') {
        const rh = Number(runningHoursEstimate);
        if (isNaN(rh) || rh < 0) {
          return res.status(400).json({ error: 'ساعت کارکرد ژنراتور نمی‌تواند منفی یا مقدار غیرعددی باشد.' });
        }
      }

      if (lastServiceMonthsAgo !== undefined && lastServiceMonthsAgo !== null && lastServiceMonthsAgo !== '') {
        const sm = Number(lastServiceMonthsAgo);
        if (isNaN(sm) || sm < 0) {
          return res.status(400).json({ error: 'فاصله آخرین سرویس دوره‌ای نمی‌تواند منفی باشد.' });
        }
      }

      if (ratedCapacityKw !== undefined && ratedCapacityKw !== null && ratedCapacityKw !== '') {
        const cap = Number(ratedCapacityKw);
        if (isNaN(cap) || cap <= 0) {
          return res.status(400).json({ error: 'توان نامی ژنراتور باید یک عدد مثبت باشد.' });
        }
      }

      normalizedOperatingContext = {
        fuelType: fuelType || undefined,
        phase: phase || undefined,
        coolingType: coolingType || undefined,
        startingMethod: startingMethod || undefined,
        storageDuration: storageDuration || undefined,
        runningHoursEstimate: runningHoursEstimate ? Number(runningHoursEstimate) : undefined,
        lastServiceMonthsAgo: lastServiceMonthsAgo ? Number(lastServiceMonthsAgo) : undefined,
        ratedCapacityKw: ratedCapacityKw ? Number(ratedCapacityKw) : undefined,
        indoorOperation: Boolean(indoorOperation),
        loadStateWhenFaultOccurred: loadStateWhenFaultOccurred || undefined
      };
    }

    // Validate and normalize photos (MIME, size, base64)
    let validatedPhotos: ValidatedImage[] | undefined = undefined;
    if (Array.isArray(rawPhotos) && rawPhotos.length > 0) {
      validatedPhotos = rawPhotos.map((p: any, idx: number) => {
        return validateAndNormalizeImage(p, idx);
      });
    }

    const diagnosis = await diagnosisService.generateDiagnosis({
      assetId,
      componentId,
      equipmentType,
      symptoms: Array.isArray(symptoms) ? symptoms : typeof symptoms === 'string' ? [symptoms] : undefined,
      description,
      photos: validatedPhotos,
      documents,
      billData,
      locationCity,
      triggerAiAssisted: triggerAiAssisted ?? true,
      aiImageConsent: aiImageConsent === true ? true : (aiImageConsent === false ? false : undefined),
      operatingContext: normalizedOperatingContext
    });

    return res.json(diagnosis);
  } catch (err: any) {
    const statusCode = err?.statusCode || (err instanceof ImageValidationError ? err.statusCode : 400);
    return res.status(statusCode).json({ error: err.message || 'خطا در انجام عیب‌یابی هوشمند' });
  }
});

/**
 * GET/POST /api/technicians/matching, /api/maintenance/technicians/matching
 * Match verified approved technicians based on location and symptoms
 */
const handleTechnicianMatching = (req: Request, res: Response) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const symptoms = Array.isArray(params.symptoms)
      ? params.symptoms
      : params.symptoms
        ? String(params.symptoms).split(',')
        : [];
    const location = params.location ? String(params.location) : undefined;
    const equipmentType = params.equipmentType ? String(params.equipmentType) : undefined;
    const category = params.category ? String(params.category) : undefined;
    const projectId = params.projectId ? String(params.projectId) : undefined;
    const assetId = params.assetId ? String(params.assetId) : undefined;

    const matches = technicianMatchingService.matchTechnicians({
      projectId,
      assetId,
      location,
      equipmentType,
      category,
      symptoms
    });

    return res.json(matches);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در انطباق متخصصان مجاز' });
  }
};
maintenanceRouter.get(['/technicians/matching', '/maintenance/technicians/matching'], handleTechnicianMatching);
maintenanceRouter.post(['/technicians/matching', '/maintenance/technicians/matching'], handleTechnicianMatching);

/**
 * Executes a compensating rollback for case assignment/reassignment.
 * Verifies that the case state was successfully restored in the repository.
 * If rollback fails or cannot be verified, returns a server error warning that
 * administrative reconciliation is required, without leaking internal system details.
 */
function executeCompensatingRollback(
  caseId: string,
  previousCaseSnapshot: Partial<MaintenanceCase>,
  res: Response
): Response {
  let rollbackSucceeded = false;
  try {
    const restored = maintenanceRepository.updateCase(caseId, previousCaseSnapshot);
    const techMatches = (!restored?.assignedTechnicianId && !previousCaseSnapshot.assignedTechnicianId) ||
      areTechnicianIdentitiesEquivalent(restored?.assignedTechnicianId, previousCaseSnapshot.assignedTechnicianId);

    if (restored && restored.status === previousCaseSnapshot.status && techMatches) {
      rollbackSucceeded = true;
    }
  } catch (rbErr) {
    rollbackSucceeded = false;
  }

  if (rollbackSucceeded) {
    return res.status(500).json({
      error: 'خطا در ثبت تاریخچه تخصیص - تغییرات پرونده بازگردانده شد.'
    });
  } else {
    return res.status(500).json({
      error: 'خطا در ثبت تاریخچه تخصیص و عدم موفقیت در بازگردانی وضعیت پرونده. یکپارچگی تخصیص نیازمند بررسی مدیر سامانه است.'
    });
  }
}

/**
 * POST /api/maintenance/:maintenanceCaseId/select-technician, /api/cases/:maintenanceCaseId/select-technician
 * Customer selects or requests an approved technician for their maintenance case
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/select-technician', '/cases/:maintenanceCaseId/select-technician'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  if (!caseAccess.isReporter && !caseAccess.isAdmin) {
    return res.status(403).json({ error: 'تنها ثبت‌کننده پرونده یا مدیر سامانه مجاز به انتخاب متخصص هستند.' });
  }

  // Terminal-state mutation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان تخصیص تکنسین برای پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  const { technicianId, scheduledDate, notes } = req.body;
  if (!technicianId) {
    return res.status(400).json({ error: 'شناسه متخصص الزامی است.' });
  }

  const pro = professionalRepository.getProfessionalById(technicianId) || (typeof professionalRepository.getProfessionalByUserId === 'function' ? professionalRepository.getProfessionalByUserId(technicianId) : undefined);
  if (!pro) {
    return res.status(404).json({ error: 'متخصص مورد نظر یافت نشد.' });
  }

  if (pro.status !== 'approved' && (pro as any).approvalStatus !== 'APPROVED') {
    return res.status(400).json({ error: 'تنها متخصصان دارای تاییدیه رسمی صلاحیت ارزیابی مجاز به پذیرش پرونده هستند.' });
  }

  const isSameTech = Boolean(
    mCase.assignedTechnicianId &&
    areTechnicianIdentitiesEquivalent(mCase.assignedTechnicianId, pro.id)
  );

  // Idempotent retry: if already assigned to this technician, do not reset status or invalidate valid acceptance
  if (isSameTech && (mCase.status === 'ASSIGNED' || mCase.status === 'SCHEDULED' || mCase.status === 'IN_PROGRESS')) {
    const updates: Partial<MaintenanceCase> = {};
    if (scheduledDate) updates.scheduledDate = scheduledDate;
    if (pro.phone) updates.assignedTechnicianPhone = pro.phone;
    const updatedCase = Object.keys(updates).length > 0
      ? maintenanceRepository.updateCase(caseId, updates)
      : mCase;

    const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
    const isAccepted = hasTechnicianFormallyAccepted(updatedCase!);
    const responseData = (isReporterOrAdmin || isAccepted)
      ? updatedCase
      : sanitizeCaseForTechnician(updatedCase!, { isAccepted: false });

    return res.json(responseData);
  }

  const previousCaseSnapshot: Partial<MaintenanceCase> = {
    ...mCase,
    status: mCase.status,
    assignedTechnicianId: mCase.assignedTechnicianId ?? (undefined as any),
    assignedTechnicianName: mCase.assignedTechnicianName ?? (undefined as any),
    assignedTechnicianPhone: mCase.assignedTechnicianPhone ?? (undefined as any),
    scheduledDate: mCase.scheduledDate ?? (undefined as any),
    scheduledAt: mCase.scheduledAt ?? (undefined as any),
    startedAt: mCase.startedAt ?? (undefined as any)
  };

  try {
    const updated = maintenanceCaseService.transitionCaseStatus(caseId, 'ASSIGNED', req.user?.id || 'CUSTOMER', {
      technicianId: pro.id,
      technicianName: pro.fullName || 'متخصص انرژی خورشیدی',
      technicianPhone: pro.phone,
      scheduledDate
    });

    try {
      maintenanceRepository.createAssignmentHistory({
        maintenanceCaseId: caseId,
        technicianId: pro.id,
        assignedBy: req.user?.id || 'CUSTOMER',
        assignedAt: new Date().toISOString(),
        status: 'ASSIGNED',
        notes: notes || 'تخصیص از طریق درگاه هوشمند تعمیرات و نگهداری'
      });
    } catch (histErr: any) {
      return executeCompensatingRollback(caseId, previousCaseSnapshot, res);
    }

    const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
    const responseData = isReporterOrAdmin ? updated : sanitizeCaseForTechnician(updated, { isAccepted: false });

    return res.json(responseData);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در تخصیص متخصص' });
  }
});

/**
 * GET /api/technician/cases
 * Retrieve maintenance cases for technician workspace
 */
maintenanceRouter.get('/technician/cases', (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'احراز هویت الزامی است.' });
  }

  const userRolesList: string[] = Array.isArray((req.user as any)?.roles) ? (req.user as any).roles : (req.user?.role ? [req.user.role] : []);
  const roleUpper = req.user?.role?.toUpperCase() || (userRolesList[0] ? userRolesList[0].toUpperCase() : '');
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || req.user?.role === 'admin' || userRolesList.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
  const techRoles = ['technician', 'professional', 'expert'];
  const isTechRole = techRoles.includes(req.user?.role?.toLowerCase() || '') || userRolesList.some(r => techRoles.includes(r.toLowerCase()));

  // Only authorized technicians or system administrators can use this endpoint
  if (!isAdmin && !isTechRole) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز: تنها تکنسین‌های دارای صلاحیت یا مدیران سامانه به این بخش دسترسی دارند.' });
  }

  const allCases = maintenanceRepository.getAllCases();

  if (isAdmin) {
    return res.json(allCases);
  }

  // Technicians can ONLY access cases explicitly assigned to them (strict project/organization boundary preservation)
  const myAssignedCases = allCases.filter((c) => isCaseAssignedToTechnician(c.assignedTechnicianId, userId) || c.assignedTechnicianId === userId);
  const sanitized = myAssignedCases.map(c => sanitizeCaseForTechnician(c));
  return res.json(sanitized);
});

/**
 * GET /api/maintenance/:maintenanceCaseId, /api/cases/:maintenanceCaseId
 * Retrieve single maintenance case with actions, history, and diagnosis
 */
maintenanceRouter.get(['/maintenance/:maintenanceCaseId', '/cases/:maintenanceCaseId'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Use authoritative canonical internal ID for fetching sub-resources
  const actions = maintenanceRepository.getActions(mCase.id);
  const assignmentHistories = maintenanceRepository.getAssignmentHistories(mCase.id);
  const diagnosis = mCase.diagnosisId ? maintenanceRepository.getDiagnosisById(mCase.diagnosisId) : undefined;
  const asset = assetRepository.getAssetById(mCase.assetId);

  // Warranty inspection for the asset and component
  let warrantyInfo: any = null;
  if (asset) {
    const warranties = assetRepository.getEquipmentWarranties(asset.id);
    const relevant = warranties.find(w => !mCase.componentId || w.componentId === mCase.componentId);
    if (relevant) {
      const isExpired = new Date(relevant.endDate) < new Date();
      warrantyInfo = {
        status: isExpired ? 'EXPIRED' : relevant.status === 'ACTIVE' ? 'ACTIVE' : 'INSUFFICIENT_DATA',
        coverageSummary: relevant.coverageSummary,
        endDate: relevant.endDate,
        claimProcedure: relevant.claimProcedure
      };
    } else {
      warrantyInfo = { status: 'INSUFFICIENT_DATA', coverageSummary: 'فاقد پرونده گارانتی ثبت‌شده' };
    }
  }

  const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
  const isTerminal = mCase.status === 'CANCELLED' || mCase.status === 'CLOSED';
  const isAccepted = !isTerminal && caseAccess.isAssignedTech && hasTechnicianFormallyAccepted(mCase);

  const baseCaseData = isReporterOrAdmin
    ? mCase
    : sanitizeCaseForTechnician(mCase, { isAccepted });

  return res.json({
    ...baseCaseData,
    actions,
    assignmentHistories,
    diagnosis,
    warranty: warrantyInfo
  });
});

/**
 * PATCH /api/maintenance/:maintenanceCaseId, /api/cases/:maintenanceCaseId
 * Update details of a maintenance case
 */
maintenanceRouter.patch(['/maintenance/:maintenanceCaseId', '/cases/:maintenanceCaseId'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Separation of view and edit permissions:
  // Having view access (e.g. assigned technician) does NOT grant edit rights to case definitions.
  // Only the reporter (customer) or system admin may update case details.
  if (!caseAccess.isReporter && !caseAccess.isAdmin) {
    return res.status(403).json({
      error: 'تنها ثبت‌کننده پرونده یا مدیر سامانه مجاز به ویرایش اطلاعات پرونده هستند.'
    });
  }

  // Terminal-state mutation protection:
  // Ordinary operational mutations on CANCELLED or CLOSED cases are strictly rejected.
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان ویرایش پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  // Direct status manipulation defense:
  // Status transitions MUST go through authoritative transitionCaseStatus or dedicated lifecycle endpoints.
  if (req.body.status !== undefined) {
    return res.status(400).json({
      error: 'تغییر مستقیم وضعیت پرونده از طریق ویرایش مجاز نیست. لطفاً از فرآیند رسمی و نقاط پایانی مجاز چرخه عمر پرونده استفاده فرمایید.'
    });
  }

  const allowedUpdates = [
    'title',
    'description',
    'priority',
    'category',
    'componentId',
    'scheduledAt',
    'scheduledDate',
    'downtimeMinutes',
    'laborCost',
    'partsCost',
    'totalCost',
    'totalCostIrr',
    'totalLaborHours'
  ];

  const patchData: any = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      patchData[key] = req.body[key];
    }
  }

  const updated = maintenanceRepository.updateCase(caseId, patchData);
  return res.json(updated);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/assign
 * Assign technician to maintenance case
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/assign', '/cases/:maintenanceCaseId/assign'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Authorization Policy: An assigned technician must NOT be able to reassign a case.
  // Reassignment is strictly restricted to authorized reporters (customers) or system administrators.
  if (!caseAccess.isReporter && !caseAccess.isAdmin) {
    return res.status(403).json({ error: 'تنها ثبت‌کننده پرونده یا مدیر سامانه مجاز به تخصیص یا تغییر تکنسین هستند.' });
  }

  // Terminal-state mutation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان تخصیص تکنسین برای پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  const { technicianId, notes, scheduledAt } = req.body;
  if (!technicianId) {
    return res.status(400).json({ error: 'شناسه تکنسین الزامی است.' });
  }

  // Lookup professional
  const pro = (professionalRepository.getProfessionalById && professionalRepository.getProfessionalById(technicianId)) || (professionalRepository.getProfessionalByUserId && professionalRepository.getProfessionalByUserId(technicianId)) || (professionalRepository.getProfessionals() || []).find(p => p.id === technicianId || p.userId === technicianId);
  const techName = pro?.fullName || req.body.technicianName || 'تکنسین تخصصی';
  const techPhone = pro?.phone || req.body.technicianPhone || '';

  const isSameTech = Boolean(
    mCase.assignedTechnicianId &&
    areTechnicianIdentitiesEquivalent(mCase.assignedTechnicianId, technicianId)
  );

  // Idempotent retry: if already assigned to this technician, do not reset status or invalidate valid acceptance
  if (isSameTech && (mCase.status === 'ASSIGNED' || mCase.status === 'SCHEDULED' || mCase.status === 'IN_PROGRESS')) {
    const updates: Partial<MaintenanceCase> = {};
    if (scheduledAt) updates.scheduledAt = scheduledAt;
    if (techPhone) updates.assignedTechnicianPhone = techPhone;
    const updatedCase = Object.keys(updates).length > 0
      ? maintenanceRepository.updateCase(caseId, updates)
      : mCase;

    const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
    const isAccepted = hasTechnicianFormallyAccepted(updatedCase!);
    const responseData = (isReporterOrAdmin || isAccepted)
      ? updatedCase
      : sanitizeCaseForTechnician(updatedCase!, { isAccepted: false });

    return res.json(responseData);
  }

  const previousCaseSnapshot: Partial<MaintenanceCase> = {
    ...mCase,
    status: mCase.status,
    assignedTechnicianId: mCase.assignedTechnicianId ?? (undefined as any),
    assignedTechnicianName: mCase.assignedTechnicianName ?? (undefined as any),
    assignedTechnicianPhone: mCase.assignedTechnicianPhone ?? (undefined as any),
    scheduledDate: mCase.scheduledDate ?? (undefined as any),
    scheduledAt: mCase.scheduledAt ?? (undefined as any),
    startedAt: mCase.startedAt ?? (undefined as any)
  };

  // Transition via canonical state machine
  let updated: MaintenanceCase;
  try {
    updated = maintenanceCaseService.transitionCaseStatus(caseId, 'ASSIGNED', req.user.id, {
      technicianId,
      technicianName: techName,
      technicianPhone: techPhone,
      scheduledDate: scheduledAt
    });
    if (scheduledAt) {
      maintenanceRepository.updateCase(caseId, { scheduledAt });
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در تخصیص پرونده' });
  }

  // Record assignment history with compensating rollback on failure
  try {
    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseId,
      technicianId,
      organizationId: pro?.companyName,
      assignedBy: req.user.id,
      status: 'ASSIGNED',
      notes: notes || 'تخصیص اولیه به تکنسین'
    });
  } catch (histErr: any) {
    return executeCompensatingRollback(caseId, previousCaseSnapshot, res);
  }

  try {
    projectRepository.addActivity({
      projectId: mCase.projectId,
      userId: req.user.id,
      type: 'MAINTENANCE_CASE_ASSIGNED',
      description: `تخصیص پرونده ${mCase.maintenanceCode || mCase.id} به تکنسین ${techName}`
    });
  } catch (actErr) {
    // Non-critical activity log failure must not fail the completed assignment
  }

  const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
  const responseData = isReporterOrAdmin ? updated : sanitizeCaseForTechnician(updated, { isAccepted: false });

  return res.json(responseData);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/accept
 * Assigned technician accepts the case
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/accept', '/cases/:maintenanceCaseId/accept'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user, { requireTechnicianOrAdmin: true });
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Terminal-state mutation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان پذیرش پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  // Check if case is already formally accepted by this technician for the CURRENT assignment cycle
  const alreadyAccepted = hasTechnicianFormallyAccepted(mCase);

  let newHistoryRecord: MaintenanceAssignmentHistory | null = null;
  // Authoritative action: persist the ACCEPTED assignment history for this cycle if not already accepted
  if (!alreadyAccepted) {
    newHistoryRecord = maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseId,
      technicianId: req.user.id,
      assignedBy: req.user.id,
      status: 'ACCEPTED',
      notes: req.body?.notes || 'پذیرش مسئولیت انجام تعمیرات توسط تکنسین'
    });
  }

  // Now transition the case status through the central state machine
  let updated: MaintenanceCase;
  try {
    updated = maintenanceCaseService.transitionCaseStatus(caseId, 'IN_PROGRESS', req.user.id, {
      notes: req.body?.notes
    });
  } catch (err: any) {
    // Failure Safety: If status transition fails and we just persisted an ACCEPTED record,
    // mark that record CANCELLED so it does not leave an active-looking orphaned acceptance
    if (newHistoryRecord) {
      let rollbackVerified = false;
      try {
        const restored = maintenanceRepository.updateAssignmentHistory(newHistoryRecord.id, {
          status: 'CANCELLED',
          notes: 'خطا در تغییر وضعیت پرونده - پذیرش لغو شد'
        });
        if (restored && restored.status === 'CANCELLED') {
          rollbackVerified = true;
        }
      } catch (rollbackErr) {
        rollbackVerified = false;
      }

      if (!rollbackVerified) {
        // Structured server-side diagnostic without leaking customer information or stack traces
        console.error(JSON.stringify({
          event: 'MAINTENANCE_ACCEPTANCE_ROLLBACK_FAILURE',
          caseId,
          historyId: newHistoryRecord.id,
          technicianId: req.user.id,
          timestamp: new Date().toISOString(),
          error: 'Failed to compensate acceptance history after status transition failure'
        }));
        return res.status(500).json({
          error: 'خطا در تغییر وضعیت پرونده و عدم موفقیت در بازگردانی سابقه پذیرش. یکپارچگی نیازمند بررسی مدیر سامانه است.'
        });
      }
    }
    return res.status(400).json({ error: err.message || 'خطا در پذیرش پرونده' });
  }

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_ACCEPTED',
    description: `پذیرش پرونده تعمیراتی ${mCase.maintenanceCode || mCase.id} توسط تکنسین`
  });

  return res.json(updated);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/schedule
 * Schedule execution date
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/schedule', '/cases/:maintenanceCaseId/schedule'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Explicit scheduling authorization policy:
  // Administrator: permitted.
  // Case reporter / customer: permitted for existing supported scheduling operations.
  // Currently assigned technician: permitted under existing approved scheduling workflow.
  // Unassigned technician / technician assigned to another case: denied (403).
  // Project viewer / member without scheduling authority: denied (403).
  // Unauthenticated or unrelated user: denied (401/403).
  const isAuthorizedScheduler = caseAccess.isAdmin || caseAccess.isReporter || caseAccess.isAssignedTech;
  if (!isAuthorizedScheduler) {
    return res.status(403).json({
      error: 'شما مجاز به زمان‌بندی این پرونده تعمیراتی نیستید. تنها ثبت‌کننده، تکنسین منتسب یا مدیر سیستم مجاز به زمان‌بندی هستند.'
    });
  }

  // Terminal-state mutation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان زمان‌بندی پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  const scheduledAt = req.body?.scheduledAt || req.body?.scheduledDate;
  if (!scheduledAt) {
    return res.status(400).json({ error: 'تاریخ زمان‌بندی (scheduledAt یا scheduledDate) الزامی است.' });
  }

  let updated: MaintenanceCase;
  // If already IN_PROGRESS (executing), updating the schedule is an appointment update,
  // not a backward state transition.
  if (mCase.status === 'IN_PROGRESS') {
    const updatedCase = maintenanceRepository.updateCase(caseId, { scheduledAt });
    if (!updatedCase) {
      return res.status(500).json({ error: 'خطا در بروزرسانی تاریخ زمان‌بندی' });
    }
    updated = updatedCase;
  } else {
    try {
      updated = maintenanceCaseService.transitionCaseStatus(caseId, 'SCHEDULED', req.user.id, {
        scheduledDate: scheduledAt,
        notes: `زمان‌بندی برای ${scheduledAt}`
      });
      maintenanceRepository.updateCase(caseId, { scheduledAt });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'خطا در زمان‌بندی پرونده' });
    }
  }

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_SCHEDULED',
    description: `زمان‌بندی مراجعه تکنسین برای تاریخ ${scheduledAt}`
  });

  const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
  const isAccepted = hasTechnicianFormallyAccepted(updated);
  const responseData = (isReporterOrAdmin || isAccepted)
    ? updated
    : sanitizeCaseForTechnician(updated, { isAccepted: false });

  return res.json(responseData);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/start
 * Start maintenance execution
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/start', '/cases/:maintenanceCaseId/start'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user, { requireTechnicianOrAdmin: true });
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Terminal-state mutation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان آغاز اجرای پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  // Security Barrier: /start MUST NOT bypass formal /accept.
  // Before starting execution, the assigned technician must have formally accepted the assignment.
  // Admins can manage operations, but for technician execution formal acceptance is mandatory.
  if (!hasTechnicianFormallyAccepted(mCase)) {
    return res.status(409).json({
      error: 'آغاز عملیات پیش از پذیرش رسمی پرونده امکان‌پذیر نیست. ابتدا پرونده را رسماً بپذیرید (/accept).'
    });
  }

  let updated: MaintenanceCase;
  try {
    updated = maintenanceCaseService.transitionCaseStatus(caseId, 'IN_PROGRESS', req.user.id);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در آغاز اجرای پرونده' });
  }

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_STARTED',
    description: `آغاز عملیات تعمیرات و سرویس پرونده ${mCase.maintenanceCode || mCase.id}`
  });

  const isReporterOrAdmin = caseAccess.isReporter || caseAccess.isAdmin;
  const isAccepted = hasTechnicianFormallyAccepted(updated);
  const responseData = (isReporterOrAdmin || isAccepted)
    ? updated
    : sanitizeCaseForTechnician(updated, { isAccepted: false });

  return res.json(responseData);
});

/**
 * GET /api/maintenance/:maintenanceCaseId/actions, /api/cases/:maintenanceCaseId/actions
 * Retrieve actions logged for a maintenance case
 */
maintenanceRouter.get(['/maintenance/:maintenanceCaseId/actions', '/cases/:maintenanceCaseId/actions'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  const actions = maintenanceRepository.getActions(caseId);
  return res.json(actions);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/actions, /api/cases/:maintenanceCaseId/actions
 * Log an action taken during maintenance (assigned technician or admin only)
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/actions', '/cases/:maintenanceCaseId/actions'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user, { requireTechnicianOrAdmin: true });
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Terminal-state action protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان ثبت اقدام برای پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  // Formal acceptance barrier: Technician must accept the case before logging repair actions
  if (!caseAccess.isAdmin && !hasTechnicianFormallyAccepted(mCase)) {
    return res.status(403).json({
      error: 'ثبت اقدامات فنی نیازمند پذیرش رسمی پرونده توسط تکنسین است.'
    });
  }

  const {
    actionType,
    description,
    componentId,
    replacedComponentId,
    newComponentSerial,
    newComponentModel,
    notes,
    laborCost,
    partsCost
  } = req.body;

  if (!actionType || !description) {
    return res.status(400).json({ error: 'نوع اقدام و شرح آن الزامی است.' });
  }

  // Input validation & extraction
  let clientRequestId: string | undefined;
  let lCost: number | undefined;
  let pCost: number | undefined;

  try {
    const rawKey = req.headers['idempotency-key'] || req.headers['x-client-request-id'] || req.body?.clientRequestId;
    clientRequestId = validateClientRequestId(rawKey);

    // Correction 1: Explicit null policy
    if (laborCost === null) {
      return res.status(400).json({ error: 'مقدار هزینه دستمزد نمی‌تواند null باشد. در صورت تمایل به حفظ مقدار قبلی، فیلد را ارسال نکنید.' });
    }
    if (partsCost === null) {
      return res.status(400).json({ error: 'مقدار هزینه قطعات نمی‌تواند null باشد. در صورت تمایل به حفظ مقدار قبلی، فیلد را ارسال نکنید.' });
    }

    if (laborCost !== undefined) {
      lCost = validateFinancialAmount(laborCost, 'هزینه دستمزد');
    }
    if (partsCost !== undefined) {
      pCost = validateFinancialAmount(partsCost, 'هزینه قطعات');
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'ورودی‌های مالی یا شناسه درخواست نامعتبر است.' });
  }

  const payloadHash = computeActionPayloadHash({
    actionType,
    description,
    componentId,
    replacedComponentId,
    newComponentSerial,
    newComponentModel,
    notes,
    laborCost: laborCost !== undefined ? lCost : undefined,
    partsCost: partsCost !== undefined ? pCost : undefined
  });

  let result: RecordCaseActionResult;
  try {
    result = maintenanceRepository.recordCaseAction(
      caseId,
      {
        actionType: actionType || 'REPAIR',
        description,
        componentId,
        replacedComponentId,
        newComponentSerial,
        newComponentModel,
        performedBy: req.user.id,
        notes,
        clientRequestId,
        payloadHash
      },
      {
        mode: 'CUMULATIVE_OVERWRITE',
        laborCost: laborCost !== undefined ? lCost : undefined,
        partsCost: partsCost !== undefined ? pCost : undefined
      }
    );
  } catch (err: any) {
    if (isPersistenceError(err)) {
      return res.status(500).json({ error: 'خطا در ثبت پایدار اطلاعات در پایگاه داده' });
    }
    if (err?.message && err.message.includes('پرونده تعمیراتی یافت نشد')) {
      return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
    }
    return res.status(400).json({ error: err.message || 'خطا در ثبت اقدام' });
  }

  if (!result.success) {
    if ((result as any).actorMismatch) {
      // Correction 2: Map unauthorized cross-actor replay to HTTP 403 without exposing action details
      return res.status(403).json({
        error: (result as any).message || 'شناسه درخواست متعلق به کاربر دیگری است و امکان استفاده مجدد از آن وجود ندارد.'
      });
    }

    if ((result as any).conflict) {
      return res.status(409).json({
        error: (result as any).message || 'شناسه درخواست تکراری با محتوای متفاوت.',
        code: 'IDEMPOTENCY_PAYLOAD_CONFLICT',
        existingActionId: (result as any).existingAction?.id
      });
    }

    return res.status(400).json({ error: (result as any).message || 'خطا در ثبت اقدام' });
  }

  return res.status(200).json((result as any).action);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/submit-verification, /api/cases/:maintenanceCaseId/submit-verification
 * Technician submits work for review/verification
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/submit-verification', '/cases/:maintenanceCaseId/submit-verification'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user, { requireTechnicianOrAdmin: true });
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Terminal-state mutation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان ارسال پرونده‌های لغو شده یا بسته شده جهت تایید وجود ندارد.'
    });
  }

  const actions = maintenanceRepository.getActions(caseId);
  if (actions.length === 0) {
    return res.status(400).json({ error: 'حداقل یک اقدام ثبت‌شده برای ارسال پرونده به تایید الزامی است.' });
  }

  const { resolutionSummary, rootCause, actionsTaken } = req.body;

  let updated: MaintenanceCase;
  try {
    updated = maintenanceCaseService.transitionCaseStatus(caseId, 'AWAITING_VERIFICATION', req.user.id, {
      notes: resolutionSummary
    });
    if (resolutionSummary || rootCause || actionsTaken) {
      maintenanceRepository.updateCase(caseId, {
        resolutionSummary: resolutionSummary || mCase.resolutionSummary,
        rootCause: rootCause || mCase.rootCause,
        actionsTaken: actionsTaken || mCase.actionsTaken
      });
      updated = maintenanceRepository.getCaseById(caseId)!;
    }
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ارسال پرونده به مرحله تایید' });
  }

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_AWAITING_VERIFICATION',
    description: `ارسال پرونده تعمیرات ${mCase.maintenanceCode || mCase.id} جهت تایید کارفرما`
  });

  return res.json(updated);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/verify, /api/cases/:maintenanceCaseId/verify
 * Project Owner / EPC / Customer reviews and verifies maintenance work
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/verify', '/cases/:maintenanceCaseId/verify'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Terminal-state mutation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان تایید یا رد پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  // Only project managers, owners, reporter customer or admins can verify - NOT the technician!
  if (caseAccess.isAssignedTech && !caseAccess.isAdmin && !caseAccess.isReporter) {
    return res.status(403).json({ error: 'تکنسین مجری مجاز به تایید و تحویل نهایی کار خود نمی‌باشد. تایید باید توسط کارفرما یا مدیر پروژه انجام شود.' });
  }

  const { verificationPassed, verificationNotes } = req.body;
  const isPassed = verificationPassed !== false;
  const targetStatus = isPassed ? 'COMPLETED' : 'IN_PROGRESS';

  let updated: MaintenanceCase;
  try {
    updated = maintenanceCaseService.transitionCaseStatus(caseId, targetStatus, req.user.id, {
      verificationNotes: verificationNotes || (isPassed ? 'تایید صحت عملکرد' : 'عدم تایید؛ بازگشت جهت رفع نقص')
    });
    maintenanceRepository.updateCase(caseId, {
      verificationPassed: isPassed,
      verificationNotes: verificationNotes || (isPassed ? 'تایید صحت عملکرد' : 'عدم تایید؛ بازگشت جهت رفع نقص')
    });
    updated = maintenanceRepository.getCaseById(caseId)!;
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در ثبت نتیجه ارزیابی پرونده' });
  }

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_VERIFIED',
    description: `نتیجه تایید پرونده ${mCase.maintenanceCode || mCase.id}: ${isPassed ? 'تایید شد' : 'رد شد'}`
  });

  return res.json(updated);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/close, /api/cases/:maintenanceCaseId/close
 * Close and archive completed maintenance case, auto-resolve alerts & check post-performance
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/close', '/cases/:maintenanceCaseId/close'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  if (!caseAccess.isReporter && !caseAccess.isAdmin) {
    if (mCase.projectId === 'CUSTOMER_DIRECT') {
      return res.status(403).json({ error: 'تنها ثبت‌کننده پرونده یا مدیر سامانه مجاز به بستن پرونده هستند.' });
    }
  }

  // Terminal-state protection:
  if (mCase.status === 'CANCELLED') {
    return res.status(400).json({
      error: 'امکان بستن پرونده لغو شده وجود ندارد.'
    });
  }
  if (mCase.status === 'CLOSED') {
    return res.json(mCase);
  }

  // Auto-resolve associated alerts
  if (mCase.alertIds && mCase.alertIds.length > 0) {
    for (const alertId of mCase.alertIds) {
      const alert = maintenanceRepository.getAlertById(alertId);
      if (alert && alert.status !== 'RESOLVED') {
        maintenanceRepository.updateAlert(alertId, {
          status: 'RESOLVED',
          resolvedAt: new Date().toISOString(),
          resolvedBy: req.user.id,
          resolutionNote: `حل خودکار بر اثر تکمیل پرونده ${mCase.maintenanceCode || mCase.id}`
        });
      }
    }
  }

  // Evaluate post-maintenance check
  let postCheck: MaintenanceCase['postMaintenanceCheck'] = {
    status: 'INSUFFICIENT_DATA',
    evaluatedAt: new Date().toISOString(),
    notes: 'داده تله‌متری کافی جهت مقایسه عملکرد قبل و بعد از تعمیر در دسترس نیست.'
  };

  const readings = monitoringRepository.getTelemetryReadings(mCase.assetId);
  const genReadings = readings.filter(r => r.metricType === 'POWER_KW' || r.metricType === 'ENERGY_KWH' || (r.metricType as string) === 'ACTIVE_POWER' || (r.metricType as string) === 'DAILY_GENERATION');
  if (genReadings.length >= 2) {
    const startedTime = mCase.startedAt ? new Date(mCase.startedAt).getTime() : 0;
    const preReadings = genReadings.filter(r => new Date(r.timestamp).getTime() <= startedTime);
    const postReadings = genReadings.filter(r => new Date(r.timestamp).getTime() > startedTime);

    if (preReadings.length > 0 && postReadings.length > 0) {
      const preAvg = preReadings.reduce((s, r) => s + r.value, 0) / preReadings.length;
      const postAvg = postReadings.reduce((s, r) => s + r.value, 0) / postReadings.length;
      const diff = postAvg - preAvg;

      let status: 'IMPROVED' | 'UNCHANGED' | 'DEGRADED' = 'UNCHANGED';
      if (diff > preAvg * 0.03) {
        status = 'IMPROVED';
      } else if (diff < -preAvg * 0.03) {
        status = 'DEGRADED';
      }

      postCheck = {
        status,
        preGenerationKwh: Math.round(preAvg * 10) / 10,
        postGenerationKwh: Math.round(postAvg * 10) / 10,
        evaluatedAt: new Date().toISOString(),
        notes: `مقایسه توان/تولید: قبل=${preAvg.toFixed(1)}، بعد=${postAvg.toFixed(1)} (وضعیت: ${status})`
      };
    }
  }

  let updated: MaintenanceCase;
  try {
    updated = maintenanceCaseService.transitionCaseStatus(caseId, 'CLOSED', req.user.id, {
      closureNotes: req.body?.closureNotes || 'پرونده با موفقیت نهایی و بایگانی شد.'
    });
    maintenanceRepository.updateCase(caseId, {
      postMaintenanceCheck: postCheck
    });
    updated = maintenanceRepository.getCaseById(caseId)!;
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در بستن و بایگانی پرونده' });
  }

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_CLOSED',
    description: `بسته شدن نهایی پرونده تعمیرات ${mCase.maintenanceCode || mCase.id}`
  });

  return res.json(updated);
});

/**
 * GET /api/maintenance/:maintenanceCaseId/technician-matches
 * Run technician matching algorithm for this case
 */
const handleCaseTechnicianMatching = (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Only reporter (customer) or system admin can view technician matches for a case
  if (!caseAccess.isReporter && !caseAccess.isAdmin) {
    return res.status(403).json({ error: 'تنها ثبت‌کننده پرونده یا مدیر سامانه مجاز به مشاهده تطبیق متخصصان هستند.' });
  }

  // Terminal-state protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({ error: 'امکان تطبیق تکنسین برای پرونده‌های لغو شده یا بسته شده وجود ندارد.' });
  }

  const matches = technicianMatchingService.matchTechniciansForCase(caseId);
  return res.json(matches);
};

maintenanceRouter.get('/maintenance/:maintenanceCaseId/technician-matches', handleCaseTechnicianMatching);
maintenanceRouter.get([
  '/cases/:maintenanceCaseId/technician-matches',
  '/maintenance/cases/:maintenanceCaseId/match-technicians',
  '/cases/:maintenanceCaseId/match-technicians'
], handleCaseTechnicianMatching);


/**
 * POST /api/maintenance/:maintenanceCaseId/cancel, /api/cases/:maintenanceCaseId/cancel
 * Cancel a maintenance case through the authoritative state machine
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/cancel', '/cases/:maintenanceCaseId/cancel'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  if (!caseAccess.isReporter && !caseAccess.isAdmin) {
    return res.status(403).json({ error: 'تنها ثبت‌کننده پرونده یا مدیر سامانه مجاز به لغو پرونده هستند.' });
  }

  const { reason, notes } = req.body || {};
  try {
    const updated = maintenanceCaseService.transitionCaseStatus(caseId, 'CANCELLED', req.user.id, {
      closureNotes: reason || notes || 'پرونده توسط کاربر یا مدیر لغو شد.'
    });
    return res.json(updated);
  } catch (err: any) {
    const isPersistenceFailure = err.message && (
      err.message.includes('نیازمند بررسی مدیر سامانه است') ||
      err.message.includes('خطا در ثبت تاریخچه لغو تخصیص')
    );
    return res.status(isPersistenceFailure ? 500 : 400).json({ error: err.message || 'خطا در لغو پرونده' });
  }
});

/**
 * GET /api/maintenance/:maintenanceCaseId/attachments, /api/cases/:maintenanceCaseId/attachments
 * List evidence attachments for a maintenance case
 */
maintenanceRouter.get(['/maintenance/:maintenanceCaseId/attachments', '/cases/:maintenanceCaseId/attachments'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  const rawAttachments = mCase.attachments || [];
  if (caseAccess.isAdmin || caseAccess.isReporter) {
    return res.json(rawAttachments);
  }

  const isTerminal = mCase.status === 'CANCELLED' || mCase.status === 'CLOSED';
  const isAccepted = !isTerminal && hasTechnicianFormallyAccepted(mCase);
  const safeAttachments = rawAttachments.map(att =>
    sanitizeAttachmentForTechnician(att, { isAccepted, isTerminal })
  );

  return res.json(safeAttachments);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/attachments/upload, /api/cases/:maintenanceCaseId/attachments/upload
 * Real multipart photo upload to S3-compatible private storage with binary validation and rollback on metadata failure.
 */
maintenanceRouter.post(
  ['/maintenance/:maintenanceCaseId/attachments/upload', '/cases/:maintenanceCaseId/attachments/upload'],
  handleMultipartUpload,
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'احراز هویت الزامی است.' });
    }

    const caseId = getParam(req.params.maintenanceCaseId);
    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
    }

    const caseAccess = checkCaseAccess(mCase, user);
    if (!caseAccess.allowed) {
      return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
    }

    // Terminal-state attachment upload protection:
    if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
      return res.status(400).json({
        error: 'امکان بارگذاری پیوست برای پرونده‌های لغو شده یا بسته شده وجود ندارد.'
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'هیچ فایلی برای بارگذاری ارسال نشده است.' });
    }

    // Check storage configuration first (fail closed)
    const storageService = getFileStorageService();
    if (!storageService.isConfigured()) {
      return res.status(503).json({
        code: 'STORAGE_NOT_CONFIGURED',
        error: 'سرویس ذخیره‌سازی ابری پیکربندی نشده است.'
      });
    }

    // 1. Binary file validation: only JPEG, PNG, WebP allowed (max 5 MB)
    let validationResult;
    try {
      validationResult = validateBinaryFile(file.buffer, file.originalname, file.mimetype, {
        allowedTypes: ['IMAGE'],
        maxImageSizeBytes: 5 * 1024 * 1024
      });
    } catch (err: any) {
      if (err instanceof FileValidationError) {
        return res.status(err.statusCode || 400).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(400).json({
        code: 'FILE_VALIDATION_ERROR',
        error: err.message || 'اعتبارسنجی تصویر ناموفق بود.'
      });
    }

    // 2. Generate secure non-guessable storage key (server-generated, no original filename)
    const storageKey = generateStorageKey({
      scope: 'maintenance',
      entityId: caseId,
      category: 'PHOTO',
      extension: validationResult.extension
    });

    const sanitizedFilename = validationResult.sanitizedFilename || sanitizeOriginalFilename(file.originalname);

    // 3. Upload object to private storage
    try {
      await storageService.putObject({
        key: storageKey,
        body: file.buffer,
        contentType: validationResult.detectedMimeType,
        contentLength: validationResult.sizeBytes,
        metadata: {
          caseId,
          uploadedByUserId: user.id,
          originalFilename: sanitizedFilename,
          sha256: validationResult.checksumSha256
        }
      });
    } catch (err: any) {
      console.error('Storage putObject failed for maintenance photo:', err);
      return res.status(502).json({
        code: 'STORAGE_UPLOAD_FAILED',
        error: 'خطا در بارگذاری تصویر به فضای ذخیره‌سازی ابری'
      });
    }

    // 4. Persist metadata in DB with compensating rollback on failure
    const attachmentId = `att-photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newAttachment: CaseAttachment = {
      id: attachmentId,
      maintenanceCaseId: caseId,
      name: sanitizedFilename,
      originalFilename: sanitizedFilename,
      type: 'PHOTO',
      url: `/api/cases/${caseId}/attachments/${attachmentId}/download`,
      storageProvider: 'S3_COMPATIBLE',
      storageKey,
      checksumSha256: validationResult.checksumSha256,
      mimeType: validationResult.detectedMimeType,
      sizeBytes: validationResult.sizeBytes,
      status: 'UPLOADED',
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString()
    };

    try {
      const updatedAttachments = [...(mCase.attachments || []), newAttachment];
      const updated = maintenanceRepository.updateCase(caseId, { attachments: updatedAttachments });
      if (!updated) {
        throw new Error('Failed to update maintenance case attachments in database');
      }
    } catch (persistErr: any) {
      console.error('Photo metadata persistence failed, executing rollback delete:', persistErr);
      try {
        await storageService.deleteObject(storageKey);
      } catch (cleanupErr) {
        console.error('Compensating rollback delete failed for key:', storageKey, cleanupErr);
      }
      return res.status(500).json({
        code: 'METADATA_PERSISTENCE_FAILED',
        error: 'خطا در ذخیره‌سازی اطلاعات تصویر در پایگاه داده'
      });
    }

    // Return safe attachment metadata (omit storageKey from client payload)
    const { storageKey: _omittedKey, ...safeAttachment } = newAttachment as any;
    return res.status(201).json(safeAttachment);
  }
);

/**
 * GET /api/maintenance/:maintenanceCaseId/attachments/:attachmentId/download, /api/cases/:maintenanceCaseId/attachments/:attachmentId/download
 * Generate short-lived signed download URL for an authorized attachment.
 */
maintenanceRouter.get(
  ['/maintenance/:maintenanceCaseId/attachments/:attachmentId/download', '/cases/:maintenanceCaseId/attachments/:attachmentId/download'],
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'احراز هویت الزامی است.' });
    }

    const caseId = getParam(req.params.maintenanceCaseId);
    const attachmentId = getParam(req.params.attachmentId);

    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
    }

    const caseAccess = checkCaseAccess(mCase, user);
    if (!caseAccess.allowed) {
      return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
    }

    // Terminal-state and acceptance download protection for technicians:
    if (!caseAccess.isAdmin && !caseAccess.isReporter) {
      if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
        return res.status(403).json({
          error: 'امکان دانلود پیوست برای تکنسین در پرونده‌های لغو شده یا بسته شده وجود ندارد.'
        });
      }
      if (!hasTechnicianFormallyAccepted(mCase)) {
        return res.status(403).json({
          error: 'مشاهده و دانلود پیوست‌های پرونده نیازمند پذیرش رسمی پرونده توسط تکنسین است.'
        });
      }
    }

    const attachment = (mCase.attachments || []).find(a => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'پیوست مورد نظر یافت نشد.' });
    }

    // Cross-case verification
    if (attachment.maintenanceCaseId && attachment.maintenanceCaseId !== caseId) {
      return res.status(404).json({ error: 'پیوست متعلق به این پرونده نیست.' });
    }

    // Legacy external URL
    if (attachment.storageProvider === 'EXTERNAL_URL' || (!attachment.storageProvider && !attachment.storageKey)) {
      return res.json({
        downloadUrl: attachment.url || '',
        storageProvider: 'EXTERNAL_URL',
        expiresIn: null
      });
    }

    // S3-compatible private object download
    const storageService = getFileStorageService();
    if (!storageService.isConfigured()) {
      return res.status(503).json({
        code: 'STORAGE_NOT_CONFIGURED',
        error: 'سرویس ذخیره‌سازی ابری پیکربندی نشده است.'
      });
    }

    if (!attachment.storageKey) {
      return res.status(404).json({ error: 'شناسه ذخیره‌سازی فایل یافت نشد.' });
    }

    try {
      const signedUrl = await storageService.getSignedDownloadUrl({
        key: attachment.storageKey
      });

      return res.json({
        downloadUrl: signedUrl,
        storageProvider: 'S3_COMPATIBLE',
        expiresIn: 300
      });
    } catch (err: any) {
      console.error('Error generating signed download URL for maintenance photo:', err);
      return res.status(500).json({
        code: 'SIGNED_URL_ERROR',
        error: 'خطا در ایجاد لینک دانلود امن'
      });
    }
  }
);

/**
 * DELETE /api/maintenance/:maintenanceCaseId/attachments/:attachmentId, /api/cases/:maintenanceCaseId/attachments/:attachmentId
 * Authorized deletion of an evidence attachment. S3 object deleted first.
 */
maintenanceRouter.delete(
  ['/maintenance/:maintenanceCaseId/attachments/:attachmentId', '/cases/:maintenanceCaseId/attachments/:attachmentId'],
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'احراز هویت الزامی است.' });
    }

    const caseId = getParam(req.params.maintenanceCaseId);
    const attachmentId = getParam(req.params.attachmentId);

    const mCase = maintenanceRepository.getCaseById(caseId);
    if (!mCase) {
      return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
    }

    const caseAccess = checkCaseAccess(mCase, user);
    if (!caseAccess.allowed) {
      return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
    }

    // Terminal-state deletion protection:
    if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
      return res.status(400).json({
        error: 'امکان حذف پیوست از پرونده‌های لغو شده یا بسته شده وجود ندارد.'
      });
    }

    const attachment = (mCase.attachments || []).find(a => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'پیوست مورد نظر یافت نشد.' });
    }

    // Cross-case verification
    if (attachment.maintenanceCaseId && attachment.maintenanceCaseId !== caseId) {
      return res.status(404).json({ error: 'پیوست متعلق به این پرونده نیست.' });
    }

    // Attachment ownership protection: only uploader or admin can delete an attachment
    if (!caseAccess.isAdmin && attachment.uploadedBy && attachment.uploadedBy !== user.id) {
      return res.status(403).json({ error: 'شما تنها مجاز به حذف پیوست‌های بارگذاری‌شده توسط خودتان هستید.' });
    }

    // For S3_COMPATIBLE objects: delete object FIRST
    if (attachment.storageProvider === 'S3_COMPATIBLE' && attachment.storageKey) {
      const storageService = getFileStorageService();
      if (storageService.isConfigured()) {
        try {
          await storageService.deleteObject(attachment.storageKey);
        } catch (err: any) {
          console.error('Failed to delete object from storage:', err);
          return res.status(502).json({
            code: 'STORAGE_DELETE_FAILED',
            error: 'خطا در حذف فایل از فضای ذخیره‌سازی ابری'
          });
        }
      }
    }

    // Remove metadata from case record
    const updatedAttachments = (mCase.attachments || []).filter(a => a.id !== attachmentId);
    const updated = maintenanceRepository.updateCase(caseId, { attachments: updatedAttachments });
    if (!updated) {
      return res.status(500).json({ error: 'خطا در حذف پیوست از پایگاه داده' });
    }

    return res.json({ success: true, id: attachmentId });
  }
);

/**
 * POST /api/maintenance/:maintenanceCaseId/attachments, /api/cases/:maintenanceCaseId/attachments
 * Add a metadata / external URL attachment to a maintenance case with protocol enforcement.
 */
maintenanceRouter.post(['/maintenance/:maintenanceCaseId/attachments', '/cases/:maintenanceCaseId/attachments'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  // Terminal-state metadata attachment creation protection:
  if (mCase.status === 'CANCELLED' || mCase.status === 'CLOSED') {
    return res.status(400).json({
      error: 'امکان ثبت اطلاعات پیوست برای پرونده‌های لغو شده یا بسته شده وجود ندارد.'
    });
  }

  const { name, type, url, mimeType, sizeBytes, status, extractedData } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'نام فایل الزامی است.' });
  }

  // Validate URL protocol if provided for external URLs
  let validatedUrl = '';
  if (typeof url === 'string' && url.trim().length > 0) {
    const trimmedUrl = url.trim();
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'تنها پروتکل‌های http و https برای لینک‌های خارجی مجاز هستند.' });
      }
      validatedUrl = trimmedUrl;
    } catch {
      return res.status(400).json({ error: 'فرمت آدرس اینترنتی (URL) نامعتبر است.' });
    }
  }

  const newAttachment: CaseAttachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    maintenanceCaseId: caseId,
    name,
    type: type || 'PHOTO',
    url: validatedUrl,
    storageProvider: validatedUrl ? 'EXTERNAL_URL' : undefined,
    mimeType,
    sizeBytes,
    status: status || 'UPLOADED',
    extractedData,
    uploadedBy: req.user?.id || 'USER',
    uploadedAt: new Date().toISOString()
  };

  const updatedAttachments = [...(mCase.attachments || []), newAttachment];
  maintenanceRepository.updateCase(caseId, { attachments: updatedAttachments });

  return res.status(201).json(newAttachment);
});

/**
 * GET /api/assets/:assetId/maintenance-history
 * Unified chronological history for an asset (alerts, cases, actions, verifications)
 */
maintenanceRouter.get('/assets/:assetId/maintenance-history', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  const userId = req.user?.id;
  const userRolesList: string[] = Array.isArray((req.user as any)?.roles)
    ? (req.user as any).roles
    : (req.user?.role ? [req.user.role] : []);
  const roleUpper = req.user?.role?.toUpperCase() || (userRolesList[0] ? userRolesList[0].toUpperCase() : '');
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || req.user?.role === 'admin' || userRolesList.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));
  const isTech = ['technician', 'professional', 'expert'].includes(req.user?.role?.toLowerCase() || '') || userRolesList.some(r => ['technician', 'professional', 'expert'].includes(r.toLowerCase()));

  // Technicians are strictly restricted from querying comprehensive asset maintenance histories
  if (isTech && !isAdmin) {
    return res.status(403).json({ error: 'شما به عنوان تکنسین تنها به پرونده‌های محول شده به خودتان دسترسی دارید و مجاز به مشاهده تاریخچه جامع دارایی نیستید.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const alerts = maintenanceRepository.getAlerts(asset.projectId, assetId);
  const cases = maintenanceRepository.getCases(asset.projectId, assetId);

  const historyItems: AssetMaintenanceHistoryItem[] = [];

  // Add Alerts
  for (const a of alerts) {
    historyItems.push({
      id: `alert-${a.id}`,
      eventType: 'ALERT',
      timestamp: a.detectedAt || a.createdAt,
      title: a.title,
      description: a.description,
      status: a.status,
      severity: a.severity,
      code: a.alertCode
    });
  }

  // Add Cases and their Actions
  for (const c of cases) {
    historyItems.push({
      id: `case-${c.id}`,
      eventType: 'MAINTENANCE_CASE',
      timestamp: c.createdAt,
      title: c.title,
      description: c.description,
      status: c.status,
      severity: c.priority,
      code: c.maintenanceCode || c.caseNumber,
      technicianName: c.assignedTechnicianName,
      cost: c.totalCost || c.totalCostIrr
    });

    const actions = maintenanceRepository.getActions(c.id);
    for (const act of actions) {
      historyItems.push({
        id: `act-${act.id}`,
        eventType: 'ACTION',
        timestamp: act.performedAt || act.createdAt,
        title: `اقدام: ${act.actionType}`,
        description: act.description,
        status: 'COMPLETED',
        code: c.maintenanceCode
      });
    }

    if (c.verifiedAt) {
      historyItems.push({
        id: `verify-${c.id}`,
        eventType: 'VERIFICATION',
        timestamp: c.verifiedAt,
        title: `تایید فنی پرونده`,
        description: c.verificationNotes || (c.verificationPassed ? 'تایید شد' : 'رد شد'),
        status: c.verificationPassed ? 'PASSED' : 'FAILED',
        code: c.maintenanceCode
      });
    }
  }

  // Sort descending by timestamp
  historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return res.json({
    assetId,
    assetCode: asset.assetCode,
    totalEvents: historyItems.length,
    events: historyItems
  });
});

// ==========================================
// 3. ALERT RULES ENDPOINTS
// ==========================================

/**
 * GET /api/projects/:projectId/alert-rules
 */
maintenanceRouter.get('/projects/:projectId/alert-rules', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const rules = maintenanceRepository.getRules(projectId);
  return res.json(rules);
});

/**
 * POST /api/projects/:projectId/alert-rules
 */
maintenanceRouter.post('/projects/:projectId/alert-rules', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { name, metricType, ruleType, operator, thresholdValue, thresholdPercent, severity, enabled } = req.body;
  if (!name || !ruleType || !operator) {
    return res.status(400).json({ error: 'نام قاعده، نوع قاعده و عملگر مقایسه الزامی است.' });
  }

  const created = maintenanceRepository.createRule({
    projectId,
    name,
    metricType,
    ruleType,
    operator,
    thresholdValue: thresholdValue !== undefined ? Number(thresholdValue) : undefined,
    thresholdPercent: thresholdPercent !== undefined ? Number(thresholdPercent) : undefined,
    severity: severity || 'WARNING',
    enabled: enabled !== false
  });

  return res.status(201).json(created);
});

/**
 * DELETE /api/alert-rules/:ruleId
 */
maintenanceRouter.delete('/alert-rules/:ruleId', (req: Request, res: Response) => {
  const ruleId = getParam(req.params.ruleId);
  const rule = maintenanceRepository.getRuleById(ruleId);
  if (!rule) {
    return res.status(404).json({ error: 'قاعده هشدار یافت نشد.' });
  }

  if (rule.projectId) {
    const access = checkProjectAccess(rule.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  maintenanceRepository.deleteRule(ruleId);
  return res.json({ success: true, message: 'قاعده با موفقیت حذف گردید.' });
});

// ==========================================
// 5. TECHNICIANS (Admin only)
// ==========================================

maintenanceRouter.post('/maintenance/technicians/:id/approve', (req: Request, res: Response) => {
  const techId = getParam(req.params.id);
  
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز. فقط مدیر سیستم می‌تواند تکنسین را تایید کند.' });
  }

  try {
    const updated = professionalRepository.updateProfessionalStatus(techId, 'approved');
    if (!updated) {
      return res.status(404).json({ error: 'تکنسین یافت نشد.' });
    }
    return res.json({ success: true, professional: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. ADMINISTRATIVE RECONCILIATION AUDIT (Read-Only)
// ==========================================

/**
 * GET /api/admin/maintenance/reconciliation-audit
 * Administrator-only read-only consistency audit across maintenance case states and assignment histories.
 * Inspects all cases for assignment/acceptance discrepancies without mutating any database records.
 */
maintenanceRouter.get([
  '/admin/maintenance/reconciliation-audit',
  '/maintenance/admin/reconciliation-audit',
  '/cases/admin/reconciliation-audit'
], (req: Request, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'احراز هویت الزامی است.' });
  }

  const userRolesList: string[] = Array.isArray((req.user as any)?.roles)
    ? (req.user as any).roles
    : (req.user?.role ? [req.user.role] : []);
  const roleUpper = req.user?.role?.toUpperCase() || (userRolesList[0] ? userRolesList[0].toUpperCase() : '');
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || req.user?.role === 'admin' || userRolesList.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r.toUpperCase()));

  if (!isAdmin) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز: تنها مدیران سامانه مجاز به مشاهده نتایج پایش یکپارچگی هستند.' });
  }

  const allCases = maintenanceRepository.getAllCases() || [];
  const findings: Array<{
    caseId: string;
    caseNumber?: string;
    maintenanceCode?: string;
    title: string;
    status: MaintenanceStatus;
    assignedTechnicianId?: string;
    assignedTechnicianName?: string;
    anomalyType:
      | 'ORPHANED_ASSIGNMENT'
      | 'EXECUTION_WITHOUT_ACCEPTANCE'
      | 'MISMATCHED_ACCEPTANCE_ATTRIBUTION'
      | 'UNASSIGNED_BUT_ACTIVE_STATUS'
      | 'STALE_TECHNICIAN_METADATA'
      | 'LEGACY_INCONCLUSIVE_HISTORY'
      | 'CANCELLED_CASE_WITH_ACTIVE_ACCEPTANCE'
      | 'CANCELLED_CASE_ACTIVE_ASSIGNMENT'
      | 'CONTRADICTORY_TIMESTAMPS'
      | 'SCHEDULED_WITHOUT_DATE';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    details: string;
    recommendedAction: string;
  }> = [];

  for (const mCase of allCases) {
    const caseId = mCase.id;
    const assignedTechId = mCase.assignedTechnicianId;
    const status = mCase.status;
    const histories = maintenanceRepository.getAssignmentHistories(caseId) || [];

    // 1. UNASSIGNED_BUT_ACTIVE_STATUS
    if (!assignedTechId && (status === 'ASSIGNED' || status === 'SCHEDULED' || status === 'IN_PROGRESS')) {
      findings.push({
        caseId,
        caseNumber: mCase.caseNumber,
        maintenanceCode: mCase.maintenanceCode,
        title: mCase.title,
        status,
        anomalyType: 'UNASSIGNED_BUT_ACTIVE_STATUS',
        severity: 'HIGH',
        details: `پرونده در وضعیت فعال (${status}) قرار دارد اما شناسه تکنسین منتسب تهی است.`,
        recommendedAction: 'تعیین تکنسین مجاز یا بازگردانی وضعیت پرونده به OPEN.'
      });
    }

    // 2. STALE_TECHNICIAN_METADATA on unassigned OPEN or DRAFT cases
    if ((status === 'OPEN' || status === 'DRAFT') && assignedTechId) {
      findings.push({
        caseId,
        caseNumber: mCase.caseNumber,
        maintenanceCode: mCase.maintenanceCode,
        title: mCase.title,
        status,
        assignedTechnicianId: assignedTechId,
        assignedTechnicianName: mCase.assignedTechnicianName,
        anomalyType: 'STALE_TECHNICIAN_METADATA',
        severity: 'MEDIUM',
        details: `پرونده در وضعیت باز (${status}) قرار دارد اما شناسه تکنسین منتسب است.`,
        recommendedAction: 'پاکسازی اطلاعات انتساب تکنسین از پرونده باز یا انتقال رسمی به وضعیت ASSIGNED.'
      });
    }

    // 3. CONTRADICTORY_TIMESTAMPS: startedAt set on case before execution
    if ((status === 'OPEN' || status === 'DRAFT' || status === 'ASSIGNED') && mCase.startedAt) {
      findings.push({
        caseId,
        caseNumber: mCase.caseNumber,
        maintenanceCode: mCase.maintenanceCode,
        title: mCase.title,
        status,
        assignedTechnicianId: assignedTechId,
        assignedTechnicianName: mCase.assignedTechnicianName,
        anomalyType: 'CONTRADICTORY_TIMESTAMPS',
        severity: 'MEDIUM',
        details: `پرونده هنوز به مرحله اجرا نرسیده (${status}) است اما دارای زمان شروع به کار (startedAt) است.`,
        recommendedAction: 'پاکسازی فیلد زمان شروع تا زمان آغاز رسمی عملیات.'
      });
    }

    // Contradictory terminal verification on CANCELLED case
    if (status === 'CANCELLED' && mCase.verificationPassed) {
      findings.push({
        caseId,
        caseNumber: mCase.caseNumber,
        maintenanceCode: mCase.maintenanceCode,
        title: mCase.title,
        status,
        assignedTechnicianId: assignedTechId,
        assignedTechnicianName: mCase.assignedTechnicianName,
        anomalyType: 'CONTRADICTORY_TIMESTAMPS',
        severity: 'MEDIUM',
        details: 'پرونده لغو شده دارای تاییدیه فنی است که مغایر با وضعیت لغو شده می‌باشد.',
        recommendedAction: 'بررسی وضعیت پرونده و اصلاح اطلاعات متناقض.'
      });
    }

    // 4. SCHEDULED_WITHOUT_DATE: scheduled case lacking schedule date/time
    if (status === 'SCHEDULED' && !mCase.scheduledAt && !mCase.scheduledDate) {
      findings.push({
        caseId,
        caseNumber: mCase.caseNumber,
        maintenanceCode: mCase.maintenanceCode,
        title: mCase.title,
        status,
        assignedTechnicianId: assignedTechId,
        assignedTechnicianName: mCase.assignedTechnicianName,
        anomalyType: 'SCHEDULED_WITHOUT_DATE',
        severity: 'MEDIUM',
        details: 'پرونده در وضعیت زمان‌بندی‌شده (SCHEDULED) قرار دارد اما فاقد تاریخ زمان‌بندی است.',
        recommendedAction: 'ثبت تاریخ زمان‌بندی معتبر برای پرونده.'
      });
    }

    // 5. Inconsistent acceptance or assignment on CANCELLED case
    if (status === 'CANCELLED' && assignedTechId) {
      if (histories.length > 0) {
        let latestAssignedIdx = -1;
        for (let i = histories.length - 1; i >= 0; i--) {
          if (histories[i].status === 'ASSIGNED') {
            latestAssignedIdx = i;
            break;
          }
        }

        let hasAccepted = false;
        let hasCancelledAfterAssignment = false;

        const checkSlice = latestAssignedIdx >= 0 ? histories.slice(latestAssignedIdx) : histories;
        for (const h of checkSlice) {
          if (h.status === 'ACCEPTED' && areTechnicianIdentitiesEquivalent(h.technicianId, assignedTechId)) {
            hasAccepted = true;
          }
          if (h.status === 'CANCELLED' && areTechnicianIdentitiesEquivalent(h.technicianId, assignedTechId)) {
            hasCancelledAfterAssignment = true;
          }
        }

        if (!hasCancelledAfterAssignment) {
          if (hasAccepted) {
            findings.push({
              caseId,
              caseNumber: mCase.caseNumber,
              maintenanceCode: mCase.maintenanceCode,
              title: mCase.title,
              status,
              assignedTechnicianId: assignedTechId,
              assignedTechnicianName: mCase.assignedTechnicianName,
              anomalyType: 'CANCELLED_CASE_WITH_ACTIVE_ACCEPTANCE',
              severity: 'HIGH',
              details: 'پرونده لغو شده است اما در تاریخچه تخصیص، خاتمه یا لغو انتساب پذیرش تکنسین ثبت نشده است.',
              recommendedAction: 'ثبت سابقه لغو تخصیص یا تطبیق تاریخچه پرونده لغو شده.'
            });
          } else {
            findings.push({
              caseId,
              caseNumber: mCase.caseNumber,
              maintenanceCode: mCase.maintenanceCode,
              title: mCase.title,
              status,
              assignedTechnicianId: assignedTechId,
              assignedTechnicianName: mCase.assignedTechnicianName,
              anomalyType: 'CANCELLED_CASE_ACTIVE_ASSIGNMENT',
              severity: 'HIGH',
              details: 'پرونده لغو شده است اما آخرین وضعیت تخصیص تکنسین در تاریخچه به لغو شده (CANCELLED) تغییر نیافته است.',
              recommendedAction: 'ثبت سابقه لغو تخصیص برای پرونده لغو شده.'
            });
          }
        }
      }
    }

    // If an assigned technician exists
    if (assignedTechId) {
      let latestAssignedIdx = -1;
      for (let i = histories.length - 1; i >= 0; i--) {
        if (histories[i].status === 'ASSIGNED') {
          latestAssignedIdx = i;
          break;
        }
      }

      // Check ORPHANED_ASSIGNMENT
      if (latestAssignedIdx === -1) {
        if (histories.length === 0) {
          if (status !== 'CLOSED' && status !== 'CANCELLED' && status !== 'COMPLETED' && status !== 'VERIFIED') {
            findings.push({
              caseId,
              caseNumber: mCase.caseNumber,
              maintenanceCode: mCase.maintenanceCode,
              title: mCase.title,
              status,
              assignedTechnicianId: assignedTechId,
              assignedTechnicianName: mCase.assignedTechnicianName,
              anomalyType: 'ORPHANED_ASSIGNMENT',
              severity: 'HIGH',
              details: 'تکنسین به پرونده منتسب شده است اما هیچ سابقه تخصیصی در تاریخچه ثبت نشده است.',
              recommendedAction: 'ثبت سابقه تخصیص معتبر یا تخصیص مجدد پرونده از طریق پنل مدیریت.'
            });
          }
        } else if (status !== 'CLOSED' && status !== 'CANCELLED' && !hasCurrentCycleAcceptance(mCase, histories)) {
          findings.push({
            caseId,
            caseNumber: mCase.caseNumber,
            maintenanceCode: mCase.maintenanceCode,
            title: mCase.title,
            status,
            assignedTechnicianId: assignedTechId,
            assignedTechnicianName: mCase.assignedTechnicianName,
            anomalyType: 'LEGACY_INCONCLUSIVE_HISTORY',
            severity: 'MEDIUM',
            details: 'سوابق موروثی پرونده فاقد نشانگر تخصیص صریح بوده و به دلیل ابهام رد شد.',
            recommendedAction: 'انجام تخصیص رسمی مجدد جهت آغاز دور تخصیص شفاف و معتبر.'
          });
        }
      } else {
        const latestAssigned = histories[latestAssignedIdx];
        if (!areTechnicianIdentitiesEquivalent(latestAssigned.technicianId, assignedTechId)) {
          findings.push({
            caseId,
            caseNumber: mCase.caseNumber,
            maintenanceCode: mCase.maintenanceCode,
            title: mCase.title,
            status,
            assignedTechnicianId: assignedTechId,
            assignedTechnicianName: mCase.assignedTechnicianName,
            anomalyType: 'ORPHANED_ASSIGNMENT',
            severity: 'HIGH',
            details: 'تکنسین منتسب به پرونده با آخرین رکورد ثبت شده در تاریخچه تخصیص همخوانی ندارد.',
            recommendedAction: 'بررسی عدم تطابق شناسه تکنسین و ثبت تخصیص رسمی جدید.'
          });
        }
      }

      // Check MISMATCHED_ACCEPTANCE_ATTRIBUTION
      if (latestAssignedIdx !== -1) {
        for (let i = latestAssignedIdx + 1; i < histories.length; i++) {
          const h = histories[i];
          if (h.status === 'ACCEPTED' && !areTechnicianIdentitiesEquivalent(h.technicianId, assignedTechId)) {
            findings.push({
              caseId,
              caseNumber: mCase.caseNumber,
              maintenanceCode: mCase.maintenanceCode,
              title: mCase.title,
              status,
              assignedTechnicianId: assignedTechId,
              assignedTechnicianName: mCase.assignedTechnicianName,
              anomalyType: 'MISMATCHED_ACCEPTANCE_ATTRIBUTION',
              severity: 'HIGH',
              details: 'پذیرش ثبت شده در دور جاری به تکنسین دیگری انتساب دارد.',
              recommendedAction: 'بررسی دسترسی و لغو پذیرش نامعتبر.'
            });
            break;
          }
        }
      }
    }

    // 6. EXECUTION_WITHOUT_ACCEPTANCE
    if (status === 'IN_PROGRESS') {
      const hasAcceptance = hasCurrentCycleAcceptance(mCase, histories);
      if (!hasAcceptance) {
        findings.push({
          caseId,
          caseNumber: mCase.caseNumber,
          maintenanceCode: mCase.maintenanceCode,
          title: mCase.title,
          status,
          assignedTechnicianId: assignedTechId,
          assignedTechnicianName: mCase.assignedTechnicianName,
          anomalyType: 'EXECUTION_WITHOUT_ACCEPTANCE',
          severity: 'CRITICAL',
          details: 'پرونده در وضعیت شروع به کار (IN_PROGRESS) قرار دارد اما سابقه پذیرش رسمی معتبر برای دور جاری احراز نشد.',
          recommendedAction: 'توقف موقت فرآیند اجرا و اخذ پذیرش رسمی از تکنسین مجاز.'
        });
      }
    }
  }

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter(f => f.severity === 'LOW').length;

  const anomalousCaseIds = new Set(findings.map(f => f.caseId));
  const anomalousCasesCount = anomalousCaseIds.size;
  const healthyCasesCount = allCases.length - anomalousCasesCount;

  return res.json({
    timestamp: new Date().toISOString(),
    totalCasesScanned: allCases.length,
    healthyCasesCount,
    anomalousCasesCount,
    findings,
    summary: {
      criticalCount,
      highCount,
      mediumCount,
      lowCount
    }
  });
});

