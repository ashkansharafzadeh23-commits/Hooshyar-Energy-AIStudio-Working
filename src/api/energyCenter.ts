/**
 * HOOSHYAR ENERGY — ENERGY CENTER INGESTION & EDITORIAL API ROUTER
 * Stage 13.10.2 Secure Ingestion Foundation
 * 
 * Provides endpoints for source inspection, candidate ingestion,
 * deduplication analysis, and editorial review workflow.
 */

import { Router, Request, Response } from 'express';
import { getAllEnergySources, getEnergySourceById } from '../services/energy/energySourceRegistry.js';
import { ingestEnergyCandidate, IngestionValidationError } from '../services/energy/energyIngestionService.js';
import { 
  approveCandidate, 
  rejectCandidate, 
  ReviewWorkflowError 
} from '../services/energy/energyReviewService.js';
import { executeSecureEnergyFetch, EnergyFetchSecurityError } from '../services/energy/secureEnergyFetcher.js';
import { energyCenterRepository } from '../repositories/energyCenterRepository.js';
import { verifyAuthToken } from './auth.js';
import { requireAdmin } from '../middleware/authorization.js';

export const energyCenterRouter = Router();

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * GET /api/energy-center/sources
 * Returns all official registered energy sources.
 */
energyCenterRouter.get('/sources', (_req: Request, res: Response) => {
  const sources = getAllEnergySources();
  res.json({
    success: true,
    sources,
    count: sources.length
  });
});

/**
 * GET /api/energy-center/sources/:id
 * Returns a specific source by id.
 */
energyCenterRouter.get('/sources/:id', (req: Request, res: Response) => {
  const source = getEnergySourceById(String(req.params.id));
  if (!source) {
    return res.status(404).json({ error: 'منبع انرژی یافت نشد.' });
  }
  res.json({ success: true, source });
});

/**
 * GET /api/energy-center/records
 * Returns verified, published public records.
 */
energyCenterRouter.get('/records', (req: Request, res: Response) => {
  const category = req.query.category as any;
  let records = energyCenterRepository.getAllPublicRecords();
  if (category) {
    records = records.filter(r => r.category === category);
  }
  res.json({
    success: true,
    records,
    count: records.length
  });
});

/**
 * GET /api/energy-center/records/:id
 * Returns a single published record.
 */
energyCenterRouter.get('/records/:id', (req: Request, res: Response) => {
  const record = energyCenterRepository.getPublicRecordById(String(req.params.id));
  if (!record) {
    return res.status(404).json({ error: 'سند اطلاعات انرژی یافت نشد.' });
  }
  res.json({ success: true, record });
});

// ============================================================================
// INGESTION & EDITORIAL ENDPOINTS (ADMIN / SUPER_ADMIN ONLY)
// ============================================================================

/**
 * GET /api/energy-center/candidates
 * Lists ingestion candidates with optional filtering. Requires ADMIN role.
 */
energyCenterRouter.get('/candidates', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const status = req.query.status as any;
  const sourceId = req.query.sourceId as string;

  let candidates = energyCenterRepository.getAllCandidates();
  if (status) {
    candidates = candidates.filter(c => c.reviewStatus === status);
  }
  if (sourceId) {
    candidates = candidates.filter(c => c.sourceId === sourceId);
  }

  res.json({
    success: true,
    candidates,
    count: candidates.length
  });
});

/**
 * GET /api/energy-center/candidates/:id
 * Retrieves candidate detail. Requires ADMIN role.
 */
energyCenterRouter.get('/candidates/:id', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const candidate = energyCenterRepository.getCandidateById(String(req.params.id));
  if (!candidate) {
    return res.status(404).json({ error: 'کاندیدای واکشی یافت نشد.' });
  }
  res.json({ success: true, candidate });
});

/**
 * POST /api/energy-center/candidates/ingest
 * Ingests a new candidate document into the review queue. Requires ADMIN role.
 */
energyCenterRouter.post('/candidates/ingest', verifyAuthToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await ingestEnergyCandidate(payload);
    res.status(201).json({
      success: true,
      candidate: result.candidate,
      deduplication: result.deduplication
    });
  } catch (err: any) {
    if (err instanceof IngestionValidationError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'خطا در ثبت کاندیدای اطلاعات انرژی', details: err?.message });
  }
});

/**
 * POST /api/energy-center/candidates/:id/approve
 * Approves a candidate for publication readiness. Requires ADMIN role.
 */
energyCenterRouter.post('/candidates/:id/approve', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const candidateId = String(req.params.id);
    const reviewerId = req.user?.id || req.body.reviewerId || 'editorial_admin';
    const approved = approveCandidate(candidateId, reviewerId, {
      approvedTitle: req.body.approvedTitle,
      approvedSummary: req.body.approvedSummary,
      notes: req.body.notes
    });
    res.json({ success: true, candidate: approved });
  } catch (err: any) {
    if (err instanceof ReviewWorkflowError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'خطا در تأیید کاندیدا', details: err?.message });
  }
});

/**
 * POST /api/energy-center/candidates/:id/reject
 * Rejects a candidate. Requires ADMIN role.
 */
energyCenterRouter.post('/candidates/:id/reject', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const candidateId = String(req.params.id);
    const reviewerId = req.user?.id || req.body.reviewerId || 'editorial_admin';
    const reason = req.body.reason || 'رد توسط تحریریه به دلیل عدم انطباق با معیارهای کیفی';
    const rejected = rejectCandidate(candidateId, reviewerId, reason);
    res.json({ success: true, candidate: rejected });
  } catch (err: any) {
    if (err instanceof ReviewWorkflowError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'خطا در رد کاندیدا', details: err?.message });
  }
});

/**
 * POST /api/energy-center/fetch-test
 * Tests fetching an authorized source document with SSRF and size safeguards.
 * Requires ADMIN role and registered source ID matching target URL.
 */
energyCenterRouter.post('/fetch-test', verifyAuthToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { url, expectedSourceId } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'نشانی (url) الزامی است.' });
    }
    if (!expectedSourceId) {
      return res.status(400).json({ error: 'شناسه منبع رسمی (expectedSourceId) الزامی است.' });
    }

    const registeredSource = getEnergySourceById(expectedSourceId);
    if (!registeredSource) {
      return res.status(404).json({ error: `منبع رسمی با شناسه '${expectedSourceId}' ثبت نشده است.` });
    }

    const result = await executeSecureEnergyFetch(url, { expectedSourceId });
    res.json({
      success: true,
      status: result.status,
      contentType: result.contentType,
      contentLength: result.contentLength,
      sha256: result.sha256,
      fetchedAt: result.fetchedAt,
      sampleSnippet: typeof result.body === 'string' ? result.body.slice(0, 500) : ''
    });
  } catch (err: any) {
    if (err instanceof EnergyFetchSecurityError) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    res.status(500).json({ error: 'خطا در آزمایش واکشی امن', code: 'FETCH_TEST_FAILED' });
  }
});

export default energyCenterRouter;
