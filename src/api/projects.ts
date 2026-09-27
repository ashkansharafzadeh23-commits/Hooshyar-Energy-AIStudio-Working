import express from 'express';
import { verifyAuthToken } from './auth.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { generateProjectCode } from '../services/projectCodeService.js';
import { canTransition, validateTransition } from '../services/projectLifecycleService.js';
import { ProjectMemberRole } from '../types/project.js';

const router = express.Router();

router.use(verifyAuthToken);

// Helper for permission check
export function checkProjectAccess(projectId: string, userId?: string, userRole?: string, allowedMemberRoles?: ProjectMemberRole[]) {
  if (!userId) return { allowed: false, status: 401, error: "Authentication required" };
  const project = projectRepository.findById(projectId);
  if (!project) return { allowed: false, status: 404, error: "Project not found" };

  const roleUpper = userRole?.toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || userRole === 'admin') {
    return { allowed: true, project, isOwner: true };
  }

  const isOwner = project.ownerId === userId;
  if (isOwner) return { allowed: true, project, isOwner: true };

  const members = projectRepository.getMembers(projectId);
  const member = members.find(m => m.userId === userId && (!m.status || m.status === 'ACTIVE'));

  if (!member) {
    return { allowed: false, status: 403, error: "شما به این پروژه دسترسی ندارید (عدم عضویت)" };
  }

  if (allowedMemberRoles && allowedMemberRoles.length > 0) {
    if (!allowedMemberRoles.includes(member.role)) {
      return { allowed: false, status: 403, error: "سطح دسترسی شما برای این عملیات کافی نیست" };
    }
  }

  return { allowed: true, project, isOwner: false, member };
}

// GET /api/projects
router.get('/', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const allProjects = projectRepository.findAll();
  
  if (user.role === 'admin') {
    return res.json(allProjects);
  }

  // Find projects where user is owner or active member
  const userProjects = allProjects.filter(p => {
    const members = projectRepository.getMembers(p.id);
    return p.ownerId === user.id || members.some(m => m.userId === user.id && m.status === 'ACTIVE');
  });
  
  res.json(userProjects);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(req.params.id, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(access.project);
});

// PUT /api/projects/:id (Update project details)
router.put('/:id', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(req.params.id, user.id, user.role);
  if (!access.allowed || (!access.isOwner && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها مالک پروژه یا مدیر سامانه می‌تواند مشخصات پروژه را ویرایش کند" });
  }

  const { title, projectType, location, site, energyRequirement, targetCapacityKw, estimatedBudgetIRR } = req.body;
  const updated = projectRepository.update(req.params.id, {
    ...(title ? { title } : {}),
    ...(projectType ? { projectType } : {}),
    ...(location ? { location } : {}),
    ...(site ? { site } : {}),
    ...(energyRequirement ? { energyRequirement } : {}),
    ...(targetCapacityKw !== undefined ? { targetCapacityKw } : {}),
    ...(estimatedBudgetIRR !== undefined ? { estimatedBudgetIRR } : {})
  });

  projectRepository.addActivity({
    projectId: req.params.id,
    actorUserId: user.id,
    eventType: 'PROJECT_UPDATED',
    entityType: 'EnergyProject',
    entityId: req.params.id,
    metadata: { updatedFields: Object.keys(req.body) }
  });

  res.json(updated);
});

// POST /api/projects/from-analysis/:analysisId
router.post('/from-analysis/:analysisId', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const analysis = projectRepository.getAnalysisHistoryById(req.params.analysisId);
  if (!analysis) return res.status(404).json({ error: "Analysis not found" });

  if (analysis.userId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (analysis.projectId) {
    return res.status(400).json({ error: "این تحلیل قبلاً به پروژه تبدیل شده است", projectId: analysis.projectId });
  }

  const { input, fullResult } = analysis;
  
  // Create Project with properly formatted title and sequential business code
  const projectCode = generateProjectCode();
  const targetsStr = input.targets?.join('، ') || 'انرژی خورشیدی';
  const cityStr = input.city || 'نامشخص';

  const project = projectRepository.create({
    projectCode,
    ownerId: user.id,
    title: `پروژه ${targetsStr} - ${cityStr}`,
    projectType: input.targets?.includes('solar') ? 'SOLAR' : 'GENERATOR',
    status: 'ANALYSIS',
    location: {
      country: 'IR',
      province: input.province || '',
      city: input.city || '',
      address: ''
    },
    site: {
      type: input.locationType || 'residential',
      areaM2: input.area || 0,
      usableAreaM2: input.usableArea || 0
    },
    energyRequirement: {
      monthlyConsumptionKwh: fullResult?.engineResult?.dailyConsumptionEstimate?.monthlyKwh || 0,
      gridConnected: input.gridConnected ?? true,
      gridStable: input.gridStable ?? true,
    },
    targetCapacityKw: fullResult?.engineResult?.solar?.finalKwp || 0,
    estimatedBudgetIRR: fullResult?.estimatedTotalCost || fullResult?.engineResult?.solar?.estimatedTotalCost || 0,
    sourceAnalysisId: analysis.id
  });

  projectRepository.updateAnalysisHistoryProjectId(analysis.id, project.id);

  projectRepository.addMember({
    projectId: project.id,
    userId: user.id,
    role: 'OWNER',
    status: 'ACTIVE'
  });

  // Record: PROJECT_CREATED_FROM_ANALYSIS in ProjectActivity
  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    eventType: 'PROJECT_CREATED_FROM_ANALYSIS',
    entityType: 'EnergyProject',
    entityId: project.id,
    metadata: { sourceAnalysisId: analysis.id, projectCode }
  });

  res.json(project);
});

// POST /api/projects/:id/status
router.post('/:id/status', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const project = projectRepository.findById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  if (project.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: "تنها مالک پروژه یا مدیر می‌تواند وضعیت پروژه را تغییر دهد" });
  }

  const { status } = req.body;
  const validation = validateTransition(project.status, status);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const updated = projectRepository.update(project.id, { status });
  
  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    eventType: 'STATUS_CHANGED',
    entityType: 'EnergyProject',
    entityId: project.id,
    metadata: { oldStatus: project.status, newStatus: status }
  });

  res.json(updated);
});

// GET /api/projects/:id/members
router.get('/:id/members', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(req.params.id, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(projectRepository.getMembers(req.params.id));
});

// POST /api/projects/:id/members
router.post('/:id/members', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(req.params.id, user.id, user.role);
  if (!access.allowed || (!access.isOwner && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها مالک پروژه می‌تواند عضو جدید اضافه کند" });
  }

  const { userId, organizationId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: "شناسه کاربر و نقش عضویت الزامی است" });
  }

  const newMember = projectRepository.addMember({
    projectId: req.params.id,
    userId,
    organizationId,
    role,
    status: 'ACTIVE'
  });

  projectRepository.addActivity({
    projectId: req.params.id,
    actorUserId: user.id,
    eventType: 'MEMBER_ADDED',
    entityType: 'ProjectMember',
    entityId: newMember.id,
    metadata: { userId, role, organizationId }
  });

  res.json(newMember);
});

// GET /api/projects/:id/documents
router.get('/:id/documents', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(req.params.id, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(projectRepository.getDocuments(req.params.id));
});

// POST /api/projects/:id/documents
router.post('/:id/documents', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(req.params.id, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { type, fileUrl, version } = req.body;
  if (!type || !fileUrl) {
    return res.status(400).json({ error: "نوع سند و نشانی فایل الزامی است" });
  }

  const doc = projectRepository.addDocument({
    projectId: req.params.id,
    uploadedByUserId: user.id,
    type,
    fileUrl,
    version: version || 1,
    verificationStatus: 'NOT_REVIEWED'
  });

  projectRepository.addActivity({
    projectId: req.params.id,
    actorUserId: user.id,
    eventType: 'DOCUMENT_UPLOADED',
    entityType: 'ProjectDocument',
    entityId: doc.id,
    metadata: { documentType: type, fileUrl }
  });

  res.json(doc);
});

// GET /api/projects/:id/activity
router.get('/:id/activity', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const access = checkProjectAccess(req.params.id, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(projectRepository.getActivities(req.params.id));
});

export default router;
