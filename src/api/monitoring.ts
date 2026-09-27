import express, { Request, Response } from 'express';
import { verifyAuthToken, requireAuth } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { monitoringRepository } from '../repositories/monitoringRepository.js';
import { monitoringService, sanitizeTelemetrySource } from '../services/monitoringService.js';

const monitoringRouter = express.Router();

monitoringRouter.use(verifyAuthToken);
monitoringRouter.use(requireAuth);

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

// ==========================================
// 1. TELEMETRY SOURCES
// ==========================================

/**
 * GET /api/projects/:projectId/telemetry-sources
 * List all telemetry sources configured across assets in a project
 */
monitoringRouter.get('/projects/:projectId/telemetry-sources', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const sources = monitoringRepository.getSources(projectId);
  return res.json(sources.map(sanitizeTelemetrySource));
});

/**
 * POST /api/assets/:assetId/telemetry-sources
 * Register a new TelemetrySource for an EnergyAsset
 */
monitoringRouter.post('/assets/:assetId/telemetry-sources', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  try {
    const created = monitoringService.registerTelemetrySource(assetId, req.body, req.user.id);
    return res.status(201).json(sanitizeTelemetrySource(created));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/telemetry-sources/:id
 * Retrieve details of a specific telemetry source
 */
monitoringRouter.get('/telemetry-sources/:id', (req: Request, res: Response) => {
  const sourceId = getParam(req.params.id);
  const source = monitoringRepository.getSourceById(sourceId);
  if (!source) {
    return res.status(404).json({ error: 'منبع تله‌متری یافت نشد.' });
  }

  const access = checkProjectAccess(source.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  return res.json(sanitizeTelemetrySource(source));
});

/**
 * PATCH /api/telemetry-sources/:id
 * Update telemetry source configuration or status
 */
monitoringRouter.patch('/telemetry-sources/:id', (req: Request, res: Response) => {
  const sourceId = getParam(req.params.id);
  const source = monitoringRepository.getSourceById(sourceId);
  if (!source) {
    return res.status(404).json({ error: 'منبع تله‌متری یافت نشد.' });
  }

  const access = checkProjectAccess(source.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  try {
    const updated = monitoringService.updateTelemetrySource(sourceId, req.body, req.user.id);
    return res.json(sanitizeTelemetrySource(updated));
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 2. TELEMETRY INGESTION & QUERIES
// ==========================================

/**
 * POST /api/assets/:assetId/telemetry
 * Ingest a single telemetry reading
 */
monitoringRouter.post('/assets/:assetId/telemetry', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  try {
    const result = monitoringService.ingestTelemetryReadings(assetId, [req.body], req.user.id);
    if (result.rejectedCount > 0 && result.acceptedCount === 0) {
      return res.status(400).json({
        error: result.errors[0]?.error || 'داده تله‌متری نامعتبر است.',
        details: result.errors
      });
    }
    return res.status(201).json(result.readings[0] || result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/assets/:assetId/telemetry/batch
 * Ingest batch of telemetry readings (partial success supported)
 */
monitoringRouter.post('/assets/:assetId/telemetry/batch', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const rawReadings = Array.isArray(req.body) ? req.body : req.body?.readings;
  if (!Array.isArray(rawReadings)) {
    return res.status(400).json({ error: 'ورودی باید شامل آرایه‌ای از رکوردهای تله‌متری باشد.' });
  }

  try {
    const result = monitoringService.ingestTelemetryReadings(assetId, rawReadings, req.user.id);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/assets/:assetId/telemetry
 * Query telemetry readings with filters
 */
monitoringRouter.get('/assets/:assetId/telemetry', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { from, to, metricType, sourceId, quality } = req.query as {
    from?: string;
    to?: string;
    metricType?: string;
    sourceId?: string;
    quality?: string;
  };

  try {
    const readings = monitoringService.getAssetTelemetry(assetId, {
      from,
      to,
      metricType,
      sourceId,
      quality
    });
    return res.json(readings);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 3. PERFORMANCE ENGINE & KPI SNAPSHOTS
// ==========================================

/**
 * GET /api/assets/:assetId/performance
 * List performance snapshots for an asset
 */
monitoringRouter.get('/assets/:assetId/performance', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const snapshots = monitoringRepository.getPerformanceSnapshots(assetId);
  return res.json(snapshots);
});

/**
 * POST /api/assets/:assetId/performance/calculate
 * Trigger deterministic performance calculation for a period
 */
monitoringRouter.post('/assets/:assetId/performance/calculate', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { periodStart, periodEnd } = req.body;
  const now = new Date();
  const pEnd = periodEnd || now.toISOString();
  const pStart = periodStart || new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  try {
    const snapshot = monitoringService.calculateAssetPerformance(assetId, pStart, pEnd, req.user.id);
    return res.status(201).json(snapshot);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. HEALTH ASSESSMENT
// ==========================================

/**
 * GET /api/assets/:assetId/health
 * List health assessments for an asset
 */
monitoringRouter.get('/assets/:assetId/health', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const assessments = monitoringRepository.getHealthAssessments(assetId);
  return res.json(assessments);
});

/**
 * POST /api/assets/:assetId/health/calculate
 * Trigger deterministic health score calculation
 */
monitoringRouter.post('/assets/:assetId/health/calculate', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (!asset.projectId) {
    return res.status(400).json({ error: 'دارایی فاقد شناسه پروژه متناظر است.' });
  }

  const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { periodStart, periodEnd } = req.body;

  try {
    const assessment = monitoringService.calculateHealthAssessment(
      assetId,
      periodStart,
      periodEnd,
      req.user.id
    );
    return res.status(201).json(assessment);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/assets/:assetId/connection-status
 * Truthfully returns asset telemetry connection status and live data verification (PH-5)
 */
monitoringRouter.get('/assets/:assetId/connection-status', (req: Request, res: Response) => {
  const assetId = getParam(req.params.assetId);
  const asset = assetRepository.getAssetById(assetId);
  if (!asset) {
    return res.status(404).json({ error: 'دارایی انرژی یافت نشد.' });
  }

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const report = monitoringService.getAssetConnectionStatus(assetId);
  return res.json(report);
});

export default monitoringRouter;
