import { Router, Request, Response } from 'express';
import { showcaseRepository } from '../repositories/showcaseRepository.js';
import { toPublicShowcaseDTO } from '../types/showcase.js';

const router = Router();

/**
 * GET /api/public/showcase-projects
 *
 * Public read-only endpoint for publication-approved verified solar projects.
 * Enforces strict server-side field allowlisting, fail-closed publication eligibility,
 * bounded output limits, and immediate Cache-Control: no-store to respect consent revocation.
 */
router.get('/showcase-projects', async (req: Request, res: Response) => {
  // Enforce no-store cache policy to guarantee immediate revocation and consent compliance
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    let limit = 10;
    if (req.query.limit) {
      const parsed = parseInt(String(req.query.limit), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.min(parsed, 20); // Hard maximum 20 records
      }
    }

    // Retrieve eligible published records from repository
    const eligibleRecords = await showcaseRepository.findPublishedProjects(limit);

    // Map through explicit allowlist projection function (No spreading of private records)
    const publicData = eligibleRecords.map(toPublicShowcaseDTO);

    return res.status(200).json({
      success: true,
      data: publicData,
      meta: {
        count: publicData.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Fail closed with safe, generic message without exposing internal details
    return res.status(500).json({
      success: false,
      error: 'خطا در بارگذاری پروژه‌های ویترین',
      code: 'SHOWCASE_FETCH_FAILED'
    });
  }
});

export default router;
