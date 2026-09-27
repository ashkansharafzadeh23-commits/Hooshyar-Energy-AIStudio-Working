import { Router } from "express";
import { investmentRepository } from '../repositories/investmentRepository.js';
import { verifyAuthToken } from "./auth.js";
import { checkProjectAccess } from "./projects.js";
import { projectReadinessService } from "../services/projectReadinessService.js";
import { projectMatchingService } from "../services/projectMatchingService.js";
import { projectRepository } from "../repositories/projectRepository.js";

const router = Router();

// Get opportunity for a specific project
router.get("/projects/:projectId/opportunity", (req, res) => {
  const { projectId } = req.params;
  const opp = investmentRepository.getInvestmentOpportunityByProjectId(projectId);
  if (!opp) return res.status(404).json({ error: "Opportunity not found for this project" });
  res.json(opp);
});

// Create or update opportunity for a specific project (Owner / Admin only)
router.post("/projects/:projectId/opportunity", verifyAuthToken, (req: any, res) => {
  const { projectId } = req.params;
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }
  if (!access.isOwner && user.role !== 'admin') {
    return res.status(403).json({ error: "تنها مالک پروژه یا مدیر مجاز به ثبت و ویرایش فرصت سرمایه‌گذاری هستند" });
  }

  const existing = investmentRepository.getInvestmentOpportunityByProjectId(projectId);
  if (existing) {
    const updated = investmentRepository.updateInvestmentOpportunity(existing.id, req.body);
    return res.json(updated);
  }

  const newOpp = investmentRepository.createInvestmentOpportunity({
    ...req.body,
    projectId,
    createdByUserId: user.id || access.project?.ownerId || 'unknown',
    opportunityCode: 'OPP-PRJ-' + Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
    status: req.body.status || 'PUBLISHED',
    visibility: req.body.visibility || 'PUBLIC_SUMMARY',
    riskDisclosure: [
      'سودآوری طرح منوط به شرایط تابش خورشیدی و راندمان واقعی تجهیزات است.',
      'نرخ خرید تضمینی ساتبا بر اساس فرمول تعدیل رسمی محاسبه می‌شود و تابع تورم است.',
      'این معرفی صرفاً بستر ارتباط حقوقی B2B است و تضمین بازدهی قطعی تلقی نمی‌گردد.'
    ]
  });

  res.status(201).json(newOpp);
});

// Project readiness calculation
router.get("/projects/:projectId/readiness", verifyAuthToken, (req: any, res) => {
  const { projectId } = req.params;
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const project = access.project;
  const opp = investmentRepository.getInvestmentOpportunityByProjectId(projectId);
  
  if (!opp && !project) return res.status(404).json({ error: "Project not found" });

  const mockOpp = opp || {
    id: 'temp',
    opportunityCode: 'TEMP',
    type: 'PROJECT_SEEKING_CAPITAL',
    status: 'DRAFT',
    title: project?.title || 'پروژه انرژی',
    summary: '',
    location: { province: project?.location?.province || 'نامشخص', city: project?.location?.city || 'نامشخص' },
    projectStage: project?.status || 'FEASIBILITY',
    landStatus: project?.site?.type ? 'OWNED' : 'UNKNOWN',
    permitStatus: 'IN_PROGRESS',
    gridConnectionStatus: project?.energyRequirement?.gridConnected ? 'APPROVED' : 'REQUESTED',
    engineeringStatus: 'IN_PROGRESS',
    financialModelStatus: 'COMPLETE',
    epcStatus: project?.status === 'EPC_SELECTED' ? 'SELECTED' : 'IN_PROGRESS',
    visibility: 'PUBLIC_SUMMARY',
    riskDisclosure: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const score = projectReadinessService.calculateReadiness(project, mockOpp as any);
  res.json(score);
});

// Get all public/verified opportunities
router.get("/opportunities", (req, res) => {
  const allOpps = investmentRepository.getInvestmentOpportunities();
  // Filter for PUBLIC_SUMMARY or VERIFIED_USERS (simplified)
  const publicOpps = allOpps.filter(o => o.visibility !== 'PRIVATE_MATCHING' && o.status === 'PUBLISHED');
  res.json(publicOpps);
});

// Get opportunity by id
router.get("/opportunities/:id", (req, res) => {
  const opp = investmentRepository.getInvestmentOpportunityById(req.params.id as string);
  if (!opp) return res.status(404).json({ error: "Opportunity not found" });
  res.json(opp);
});

// Create opportunity (requires auth)
router.post("/opportunities", verifyAuthToken, (req, res) => {
  try {
    const userId = (req as any).user?.id || 'unknown';
    const newOpp = investmentRepository.createInvestmentOpportunity({
      ...req.body,
      createdByUserId: userId,
      status: 'DRAFT',
      opportunityCode: 'OPP-HSE-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    });
    res.status(201).json(newOpp);
  } catch (error) {
    res.status(500).json({ error: "Failed to create opportunity" });
  }
});

// Calculate Readiness Score for an Opportunity
router.get("/opportunities/:id/readiness", (req, res) => {
  const opp = investmentRepository.getInvestmentOpportunityById(req.params.id as string);
  if (!opp) return res.status(404).json({ error: "Opportunity not found" });

  let project = null;
  if (opp.projectId) {
    project = investmentRepository.getProjectById ? investmentRepository.getProjectById(opp.projectId) : null;
  }

  const score = projectReadinessService.calculateReadiness(project, opp);
  res.json(score);
});

// Investor Profile
router.get("/investor-profile/me", verifyAuthToken, (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const profile = investmentRepository.getInvestorProfileByUserId(userId);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

router.post("/investor-profile", verifyAuthToken, (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  
  const existing = investmentRepository.getInvestorProfileByUserId(userId);
  if (existing) {
    // just return it or you could update it
    return res.json(existing);
  }

  const newProfile = investmentRepository.createInvestorProfile({
    ...req.body,
    userId
  });
  res.status(201).json(newProfile);
});

// Generate Matches for Investor
router.post("/matches/generate", verifyAuthToken, (req, res) => {
  const userId = (req as any).user?.id;
  const profile = investmentRepository.getInvestorProfileByUserId(userId);
  if (!profile) return res.status(400).json({ error: "Investor profile required" });

  const allOpps = investmentRepository.getInvestmentOpportunities().filter(o => o.status === 'PUBLISHED');
  
  // Very simplistic match generation for demo
  allOpps.forEach(opp => {
    let project = null;
    if (opp.projectId && investmentRepository.getProjectById) {
      project = investmentRepository.getProjectById(opp.projectId);
    }
    const readiness = projectReadinessService.calculateReadiness(project, opp);
    const scoreResult = projectMatchingService.calculateMatchScore(profile, opp, readiness);
    
    // Only create a match if score > 50
    if (scoreResult.score > 50) {
      // Check if already matched
      const existingMatches = investmentRepository.getProjectMatchesForInvestor(profile.id);
      if (!existingMatches.find(m => m.opportunityId === opp.id)) {
        investmentRepository.createProjectMatch({
          opportunityId: opp.id,
          investorProfileId: profile.id,
          score: scoreResult.score,
          scoreBreakdown: scoreResult.scoreBreakdown,
          status: 'SUGGESTED',
          initiatedBy: 'SYSTEM'
        });
      }
    }
  });

  const matches = investmentRepository.getProjectMatchesForInvestor(profile.id);
  res.json(matches);
});

router.get("/matches/me", verifyAuthToken, (req, res) => {
  const userId = (req as any).user?.id;
  const profile = investmentRepository.getInvestorProfileByUserId(userId);
  if (!profile) return res.json([]);
  
  const matches = investmentRepository.getProjectMatchesForInvestor(profile.id);
  res.json(matches);
});

router.post("/matches/:id/interest", verifyAuthToken, (req, res) => {
  const match = investmentRepository.updateProjectMatch(req.params.id as string, { status: 'INTERESTED', initiatedBy: 'INVESTOR' });
  res.json(match);
});

router.post("/matches/:id/request-intro", verifyAuthToken, (req, res) => {
  const match = investmentRepository.updateProjectMatch(req.params.id as string, { status: 'INTRO_REQUESTED', initiatedBy: 'INVESTOR' });
  res.json(match);
});

export default router;
