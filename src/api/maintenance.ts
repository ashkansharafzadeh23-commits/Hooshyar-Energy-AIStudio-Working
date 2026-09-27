import express, { Request, Response } from 'express';
import { verifyAuthToken, requireAuth } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { maintenanceRepository } from '../repositories/maintenanceRepository.js';
import { monitoringRepository } from '../repositories/monitoringRepository.js';
import { alertService } from '../services/alertService.js';
import { diagnosisService } from '../services/diagnosisService.js';
import { maintenanceCaseService } from '../services/maintenanceCaseService.js';
import { technicianMatchingService } from '../services/technicianMatchingService.js';
import { professionalRepository } from '../repositories/professionalRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import {
  AssetAlert,
  AlertRule,
  MaintenanceCase,
  MaintenanceAction,
  MaintenancePriority,
  MaintenanceStatus,
  AssetMaintenanceHistoryItem
} from '../types/maintenance.js';

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
  const roleUpper = user.role?.toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || user.role === 'admin';
  const isReporter = Boolean(mCase.reportedBy && mCase.reportedBy === user.id);
  const isAssignedTech = Boolean(mCase.assignedTechnicianId && mCase.assignedTechnicianId === user.id);

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
  const isTechRole = techRoles.includes(user.role?.toLowerCase() || '');
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
  const mCase = alert.maintenanceCaseId ? maintenanceRepository.getCaseById(alert.maintenanceCaseId) : undefined;
  const warranties = assetRepository.getEquipmentWarranties(alert.assetId);

  return res.json({
    ...alert,
    diagnoses,
    maintenanceCase: mCase,
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

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const cases = maintenanceRepository.getCases(asset.projectId, assetId);
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
  const roleUpper = req.user?.role?.toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || req.user?.role === 'admin';
  const isTech = ['technician', 'professional', 'expert'].includes(req.user?.role?.toLowerCase() || '');

  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
  const assetId = req.query.assetId ? String(req.query.assetId) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  let allCases = maintenanceRepository.getAllCases();

  if (isTech && !isAdmin) {
    allCases = allCases.filter(c => c.assignedTechnicianId === userId);
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
  return res.json(allCases);
});

/**
 * POST /api/cases, /api/maintenance/cases
 * Create customer maintenance request (with optional asset linkage or unregistered equipment)
 */
maintenanceRouter.post(['/cases', '/maintenance/cases'], async (req: Request, res: Response) => {
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
    const initialAttachments: any[] = Array.isArray(attachments) ? [...attachments] : [];
    if (Array.isArray(photos)) {
      photos.forEach((p: any, idx: number) => {
        initialAttachments.push({
          id: `att-photo-${Date.now()}-${idx}`,
          maintenanceCaseId: '',
          name: p.name || `photo_${idx + 1}.jpg`,
          type: 'PHOTO',
          url: p.preview || p.data || '',
          data: p.data || p.preview || '',
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
        url: effectiveBill.url || effectiveBill.preview || '',
        data: effectiveBill.data || '',
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
 * POST /api/diagnose, /api/maintenance/diagnose
 * Evidence-based preliminary AI diagnosis for customer problem reports
 */
maintenanceRouter.post(['/diagnose', '/maintenance/diagnose'], async (req: Request, res: Response) => {
  try {
    const {
      assetId,
      componentId,
      equipmentType,
      symptoms,
      description,
      photos,
      documents,
      billData,
      locationCity,
      triggerAiAssisted
    } = req.body;

    const diagnosis = await diagnosisService.generateDiagnosis({
      assetId,
      componentId,
      equipmentType,
      symptoms,
      description,
      photos,
      documents,
      billData,
      locationCity,
      triggerAiAssisted: triggerAiAssisted ?? true
    });

    return res.json(diagnosis);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'خطا در انجام عیب‌یابی هوشمند' });
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

  const { technicianId, scheduledDate, notes } = req.body;
  if (!technicianId) {
    return res.status(400).json({ error: 'شناسه متخصص الزامی است.' });
  }

  const pro = professionalRepository.getProfessionalById(technicianId);
  if (!pro) {
    return res.status(404).json({ error: 'متخصص مورد نظر یافت نشد.' });
  }

  if (pro.status !== 'approved' && (pro as any).approvalStatus !== 'APPROVED') {
    return res.status(400).json({ error: 'تنها متخصصان دارای تاییدیه رسمی صلاحیت ارزیابی مجاز به پذیرش پرونده هستند.' });
  }

  try {
    const updated = maintenanceCaseService.transitionCaseStatus(caseId, 'ASSIGNED', req.user?.id || 'CUSTOMER', {
      technicianId: pro.id,
      technicianName: pro.fullName || 'متخصص انرژی خورشیدی',
      technicianPhone: pro.phone,
      scheduledDate
    });

    maintenanceRepository.createAssignmentHistory({
      maintenanceCaseId: caseId,
      technicianId: pro.id,
      assignedBy: req.user?.id || 'CUSTOMER',
      assignedAt: new Date().toISOString(),
      status: 'ASSIGNED',
      notes: notes || 'تخصیص از طریق درگاه هوشمند تعمیرات و نگهداری'
    });

    return res.json(updated);
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

  const roleUpper = req.user?.role?.toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || req.user?.role === 'admin';
  const techRoles = ['technician', 'professional', 'expert'];
  const isTechRole = techRoles.includes(req.user?.role?.toLowerCase() || '');

  // Only authorized technicians or system administrators can use this endpoint
  if (!isAdmin && !isTechRole) {
    return res.status(403).json({ error: 'دسترسی غیرمجاز: تنها تکنسین‌های دارای صلاحیت یا مدیران سامانه به این بخش دسترسی دارند.' });
  }

  const allCases = maintenanceRepository.getAllCases();

  if (isAdmin) {
    return res.json(allCases);
  }

  // Technicians can ONLY access cases explicitly assigned to them (strict project/organization boundary preservation)
  const myAssignedCases = allCases.filter((c) => c.assignedTechnicianId === userId);
  return res.json(myAssignedCases);
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

  const actions = maintenanceRepository.getActions(caseId);
  const assignmentHistories = maintenanceRepository.getAssignmentHistories(caseId);
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

  return res.json({
    ...mCase,
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

  const { technicianId, notes, scheduledAt } = req.body;
  if (!technicianId) {
    return res.status(400).json({ error: 'شناسه تکنسین الزامی است.' });
  }

  // Lookup professional
  const pro = professionalRepository.getProfessionalById ? professionalRepository.getProfessionalById(technicianId) : (professionalRepository.getProfessionals() || []).find(p => p.id === technicianId);
  const techName = pro?.fullName || req.body.technicianName || 'تکنسین تخصصی';
  const techPhone = pro?.phone || req.body.technicianPhone || '';

  // Update case
  const updated = maintenanceRepository.updateCase(caseId, {
    status: 'ASSIGNED',
    assignedTechnicianId: technicianId,
    assignedTechnicianName: techName,
    assignedTechnicianPhone: techPhone,
    scheduledAt: scheduledAt || mCase.scheduledAt
  });

  // Record assignment history
  maintenanceRepository.createAssignmentHistory({
    maintenanceCaseId: caseId,
    technicianId,
    organizationId: pro?.companyName,
    assignedBy: req.user.id,
    status: 'ASSIGNED',
    notes: notes || 'تخصیص اولیه به تکنسین'
  });

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_ASSIGNED',
    description: `تخصیص پرونده ${mCase.maintenanceCode || mCase.id} به تکنسین ${techName}`
  });

  return res.json(updated);
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

  const updated = maintenanceRepository.updateCase(caseId, {
    status: 'IN_PROGRESS'
  });

  maintenanceRepository.createAssignmentHistory({
    maintenanceCaseId: caseId,
    technicianId: req.user.id,
    assignedBy: req.user.id,
    status: 'ACCEPTED',
    notes: req.body?.notes || 'پذیرش مسئولیت انجام تعمیرات توسط تکنسین'
  });

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

  const { scheduledAt } = req.body;
  if (!scheduledAt) {
    return res.status(400).json({ error: 'تاریخ زمان‌بندی (scheduledAt) الزامی است.' });
  }

  const updated = maintenanceRepository.updateCase(caseId, {
    status: 'SCHEDULED',
    scheduledAt
  });

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_SCHEDULED',
    description: `زمان‌بندی مراجعه تکنسین برای تاریخ ${scheduledAt}`
  });

  return res.json(updated);
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

  const updated = maintenanceRepository.updateCase(caseId, {
    status: 'IN_PROGRESS',
    startedAt: new Date().toISOString()
  });

  projectRepository.addActivity({
    projectId: mCase.projectId,
    userId: req.user.id,
    type: 'MAINTENANCE_CASE_STARTED',
    description: `آغاز عملیات تعمیرات و سرویس پرونده ${mCase.maintenanceCode || mCase.id}`
  });

  return res.json(updated);
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

  const createdAction = maintenanceRepository.createAction({
    maintenanceCaseId: caseId,
    actionType: actionType || 'REPAIR',
    description,
    componentId,
    replacedComponentId,
    newComponentSerial,
    newComponentModel,
    performedBy: req.user.id,
    performedAt: new Date().toISOString(),
    notes,
    createdAt: new Date().toISOString()
  });

  // Calculate new total costs if provided
  const lCost = laborCost !== undefined ? Number(laborCost) : (mCase.laborCost || 0);
  const pCost = partsCost !== undefined ? Number(partsCost) : (mCase.partsCost || 0);
  const totalCost = lCost + pCost;

  maintenanceRepository.updateCase(caseId, {
    laborCost: lCost,
    partsCost: pCost,
    totalCost,
    totalCostIrr: totalCost
  });

  return res.status(200).json(createdAction);
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

  const actions = maintenanceRepository.getActions(caseId);
  if (actions.length === 0) {
    return res.status(400).json({ error: 'حداقل یک اقدام ثبت‌شده برای ارسال پرونده به تایید الزامی است.' });
  }

  const { resolutionSummary, rootCause, actionsTaken } = req.body;

  const updated = maintenanceRepository.updateCase(caseId, {
    status: 'AWAITING_VERIFICATION',
    resolutionSummary: resolutionSummary || mCase.resolutionSummary,
    rootCause: rootCause || mCase.rootCause,
    actionsTaken: actionsTaken || mCase.actionsTaken
  });

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

  // Only project managers, owners, reporter customer or admins can verify - NOT the technician!
  if (caseAccess.isAssignedTech && !caseAccess.isAdmin && !caseAccess.isReporter) {
    return res.status(403).json({ error: 'تکنسین مجری مجاز به تایید و تحویل نهایی کار خود نمی‌باشد. تایید باید توسط کارفرما یا مدیر پروژه انجام شود.' });
  }

  const { verificationPassed, verificationNotes } = req.body;
  const isPassed = verificationPassed !== false;

  const updated = maintenanceRepository.updateCase(caseId, {
    status: isPassed ? 'COMPLETED' : 'IN_PROGRESS',
    verifiedAt: new Date().toISOString(),
    verifiedBy: req.user.id,
    verificationPassed: isPassed,
    verificationNotes: verificationNotes || (isPassed ? 'تایید صحت عملکرد' : 'عدم تایید؛ بازگشت جهت رفع نقص')
  });

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

  const updated = maintenanceRepository.updateCase(caseId, {
    status: 'CLOSED',
    completedAt: mCase.completedAt || new Date().toISOString(),
    closureNotes: req.body?.closureNotes || 'پرونده با موفقیت نهایی و بایگانی شد.',
    postMaintenanceCheck: postCheck
  });

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
maintenanceRouter.get('/maintenance/:maintenanceCaseId/technician-matches', (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  const matches = technicianMatchingService.matchTechnicians({
    projectId: mCase.projectId,
    assetId: mCase.assetId,
    symptoms: [mCase.title, mCase.description],
    category: mCase.category,
    componentType: mCase.componentId
  });

  return res.json(matches);
});

maintenanceRouter.get(['/cases/:maintenanceCaseId/technician-matches', '/maintenance/cases/:maintenanceCaseId/match-technicians', '/cases/:maintenanceCaseId/match-technicians'], (req: Request, res: Response) => {
  const caseId = getParam(req.params.maintenanceCaseId);
  const mCase = maintenanceRepository.getCaseById(caseId);
  if (!mCase) {
    return res.status(404).json({ error: 'پرونده تعمیراتی یافت نشد.' });
  }

  const caseAccess = checkCaseAccess(mCase, req.user);
  if (!caseAccess.allowed) {
    return res.status(caseAccess.status || 403).json({ error: caseAccess.error });
  }

  const matches = technicianMatchingService.matchTechnicians({
    projectId: mCase.projectId,
    assetId: mCase.assetId,
    symptoms: [mCase.title, mCase.description],
    category: mCase.category,
    componentType: mCase.componentId
  });

  return res.json(matches);
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

  return res.json(mCase.attachments || []);
});

/**
 * POST /api/maintenance/:maintenanceCaseId/attachments, /api/cases/:maintenanceCaseId/attachments
 * Add an evidence attachment to a maintenance case
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

  const { name, type, url, data, mimeType, sizeBytes, status, extractedData } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'نام فایل الزامی است.' });
  }

  const newAttachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    maintenanceCaseId: caseId,
    name,
    type: type || 'PHOTO',
    url: url || data || '',
    data: data || '',
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
