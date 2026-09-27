import express from 'express';
import { verifyAuthToken } from './auth.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { enterpriseAccessService } from '../services/enterpriseAccessService.js';
import { portfolioAggregationService } from '../services/portfolioAggregationService.js';
import { lifecycleIntelligenceService } from '../services/lifecycleIntelligenceService.js';
import { platformIntelligenceEngine } from '../services/platformIntelligenceEngine.js';
import { aiExecutiveAssistantService } from '../services/aiExecutiveAssistantService.js';
import { EnterpriseRole } from '../types/portfolio.js';

const router = express.Router();

router.use(verifyAuthToken);

// ==========================================
// 1. ORGANIZATIONS & ACCESS
// ==========================================

// GET /api/enterprise/organizations
router.get('/organizations', (req, res) => {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const roleUpper = (user.role || '')?.toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
    const allOrgs = organizationRepository.findAll();
    return res.json(allOrgs);
  }

  const userMemberships = portfolioRepository.getUserMemberships(user.id);
  const orgIds = new Set(userMemberships.filter(m => m.status === 'ACTIVE').map(m => m.organizationId));
  const orgs = organizationRepository.findAll().filter(o => orgIds.has(o.id));

  res.json(orgs);
});

// GET /api/enterprise/organizations/:orgId
router.get('/organizations/:orgId', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkOrganizationAccess(req.params.orgId, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  res.json({
    organization: access.organization,
    membership: access.member,
    isGlobalAdmin: access.isGlobalAdmin
  });
});

// GET /api/enterprise/organizations/:orgId/members
router.get('/organizations/:orgId/members', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkOrganizationAccess(req.params.orgId, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const members = portfolioRepository.getOrganizationMembers(req.params.orgId);
  res.json(members);
});

// POST /api/enterprise/organizations/:orgId/members
router.post('/organizations/:orgId/members', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkOrganizationAccess(req.params.orgId, user, ['OWNER', 'ADMIN']);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const { userId, role, status } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role are required' });
  }

  const validRoles: EnterpriseRole[] = ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'FINANCE', 'ENGINEER', 'VIEWER'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  // Check if member already exists
  const existing = portfolioRepository.getOrganizationMember(req.params.orgId, userId);
  if (existing) {
    const updated = portfolioRepository.updateOrganizationMember(existing.id, { role, status: status || existing.status });
    return res.json(updated);
  }

  const newMember = portfolioRepository.addOrganizationMember({
    organizationId: req.params.orgId,
    userId,
    role,
    status: status || 'ACTIVE'
  });

  res.status(201).json(newMember);
});

// DELETE /api/enterprise/organizations/:orgId/members/:memberId
router.delete('/organizations/:orgId/members/:memberId', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkOrganizationAccess(req.params.orgId, user, ['OWNER', 'ADMIN']);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const success = portfolioRepository.deleteOrganizationMember(req.params.memberId);
  if (!success) {
    return res.status(404).json({ error: 'Member not found' });
  }

  res.json({ success: true });
});

// ==========================================
// 2. PORTFOLIO CRUD
// ==========================================

// GET /api/enterprise/organizations/:orgId/portfolios
router.get('/organizations/:orgId/portfolios', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkOrganizationAccess(req.params.orgId, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const portfolios = portfolioRepository.getPortfoliosByOrg(req.params.orgId);
  res.json(portfolios);
});

// POST /api/enterprise/organizations/:orgId/portfolios
router.post('/organizations/:orgId/portfolios', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkOrganizationAccess(req.params.orgId, user, ['OWNER', 'ADMIN', 'PROJECT_MANAGER']);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const { name, description, projectIds, assetIds } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Portfolio name is required' });
  }

  const newPortfolio = portfolioRepository.createPortfolio({
    organizationId: req.params.orgId,
    name,
    description,
    projectIds: Array.isArray(projectIds) ? projectIds : [],
    assetIds: Array.isArray(assetIds) ? assetIds : [],
    createdBy: user.id
  });

  res.status(201).json(newPortfolio);
});

// GET /api/enterprise/portfolios/:id
router.get('/portfolios/:id', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  res.json(access.portfolio);
});

// PUT /api/enterprise/portfolios/:id
router.put('/portfolios/:id', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user, ['OWNER', 'ADMIN', 'PROJECT_MANAGER']);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const { name, description, projectIds, assetIds } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (projectIds !== undefined) updates.projectIds = Array.isArray(projectIds) ? projectIds : [];
  if (assetIds !== undefined) updates.assetIds = Array.isArray(assetIds) ? assetIds : [];

  const updated = portfolioRepository.updatePortfolio(req.params.id, updates);
  res.json(updated);
});

// DELETE /api/enterprise/portfolios/:id
router.delete('/portfolios/:id', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user, ['OWNER', 'ADMIN']);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const success = portfolioRepository.deletePortfolio(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json({ success: true });
});

// ==========================================
// 3. PORTFOLIO INTELLIGENCE & AGGREGATIONS
// ==========================================

// GET /api/enterprise/portfolios/:id/overview
router.get('/portfolios/:id/overview', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const overview = portfolioAggregationService.getPortfolioOverview(req.params.id);
  if (!overview) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(overview);
});

// GET /api/enterprise/portfolios/:id/lifecycle
router.get('/portfolios/:id/lifecycle', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const thresholdQuery = req.query.stalledThresholdDays;
  const stalledThresholdDays = thresholdQuery && !isNaN(Number(thresholdQuery)) ? Number(thresholdQuery) : undefined;

  const lifecycle = lifecycleIntelligenceService.getLifecycleIntelligence(req.params.id, { stalledThresholdDays });
  if (!lifecycle) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(lifecycle);
});

// GET /api/enterprise/portfolios/:id/assets
router.get('/portfolios/:id/assets', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const assetIntel = portfolioAggregationService.getAssetPortfolioIntelligence(req.params.id);
  if (!assetIntel) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(assetIntel);
});

// GET /api/enterprise/portfolios/:id/financial
router.get('/portfolios/:id/financial', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const financial = portfolioAggregationService.getFinancialPortfolioView(req.params.id);
  if (!financial) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(financial);
});

// GET /api/enterprise/portfolios/:id/procurement
router.get('/portfolios/:id/procurement', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const procurement = portfolioAggregationService.getProcurementIntelligence(req.params.id);
  if (!procurement) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(procurement);
});

// GET /api/enterprise/portfolios/:id/operations
router.get('/portfolios/:id/operations', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const operations = portfolioAggregationService.getOperationsIntelligence(req.params.id);
  if (!operations) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(operations);
});

// GET /api/enterprise/portfolios/:id/insights
router.get('/portfolios/:id/insights', (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const thresholdQuery = req.query.stalledThresholdDays;
  const stalledThresholdDays = thresholdQuery && !isNaN(Number(thresholdQuery)) ? Number(thresholdQuery) : undefined;

  const insights = platformIntelligenceEngine.generatePortfolioInsights(req.params.id, { stalledThresholdDays });
  res.json(insights);
});

// POST /api/enterprise/portfolios/:id/executive-summary
router.post('/portfolios/:id/executive-summary', async (req, res) => {
  const user = (req as any).user;
  const access = enterpriseAccessService.checkPortfolioAccess(req.params.id, user);
  if (!access.allowed) {
    return res.status(access.status).json({ error: access.error });
  }

  const { prompt } = req.body || {};
  const summary = await aiExecutiveAssistantService.generateExecutiveSummary(req.params.id, prompt);
  if (!summary) {
    return res.status(404).json({ error: 'Portfolio not found' });
  }

  res.json(summary);
});

export default router;
