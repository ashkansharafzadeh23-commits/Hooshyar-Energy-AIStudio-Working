import express from 'express';
import { verifyAuthToken } from './auth.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { generateProjectCode } from '../services/projectCodeService.js';
import { canTransition, validateTransition } from '../services/projectLifecycleService.js';
import { ProjectMemberRole, ProjectDocumentType } from '../types/project.js';
import { 
  getFileStorageService, 
  handleMultipartUpload, 
  validateBinaryFile, 
  sanitizeOriginalFilename, 
  generateStorageKey, 
  FileValidationError,
  StorageNotConfiguredError
} from '../storage/index.js';

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

  const projectId = String(req.params.id);
  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const docs = projectRepository.getDocuments(projectId);
  // Omit internal storageKey from client listing
  const safeDocs = docs.map(d => {
    const { storageKey, ...safe } = d as any;
    return safe;
  });

  res.json(safeDocs);
});

// POST /api/projects/:id/documents/upload (Binary S3 Upload)
router.post('/:id/documents/upload', handleMultipartUpload, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = String(req.params.id);
  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const storageService = getFileStorageService();
  if (!storageService.isConfigured()) {
    return res.status(503).json({
      code: 'STORAGE_NOT_CONFIGURED',
      error: 'سرویس ذخیره‌سازی ابری پیکربندی نشده است.'
    });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({
      code: 'FILE_MISSING',
      error: 'فایلی ارسال نشده است.'
    });
  }

  const type = (req.body.type as ProjectDocumentType) || 'OTHER';
  const version = parseInt(req.body.version, 10) || 1;

  // 1. Validate binary file with production Stage 12.3B signature:
  // validateBinaryFile(buffer: Buffer, filename: string, declaredMimeType?: string, options?: FileValidationOptions)
  let validationResult;
  try {
    validationResult = validateBinaryFile(file.buffer, file.originalname, file.mimetype);
  } catch (err: any) {
    if (err instanceof FileValidationError) {
      return res.status(err.statusCode || 400).json({
        code: err.code,
        error: err.message
      });
    }
    return res.status(400).json({
      code: 'FILE_VALIDATION_ERROR',
      error: err.message || 'اعتبارسنجی فایل ناموفق بود.'
    });
  }

  // 2. Generate secure non-guessable storage key
  const storageKey = generateStorageKey({
    scope: 'projects',
    entityId: projectId,
    category: type,
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
        projectId,
        uploadedByUserId: user.id,
        originalFilename: sanitizedFilename,
        sha256: validationResult.checksumSha256
      }
    });
  } catch (err: any) {
    console.error('Storage putObject failed:', err);
    return res.status(502).json({
      code: 'STORAGE_UPLOAD_FAILED',
      error: 'خطا در بارگذاری فایل به فضای ذخیره‌سازی ابری'
    });
  }

  // 4. Persist metadata in DB with rollback compensating transaction on failure
  let doc;
  try {
    doc = projectRepository.addDocument({
      projectId,
      uploadedByUserId: user.id,
      type,
      fileUrl: `/api/projects/${projectId}/documents/placeholder`, // placeholder for schema compatibility
      version,
      verificationStatus: 'NOT_REVIEWED',
      storageProvider: 'S3_COMPATIBLE',
      storageKey,
      originalFilename: sanitizedFilename,
      mimeType: validationResult.detectedMimeType,
      sizeBytes: validationResult.sizeBytes,
      sha256: validationResult.checksumSha256,
      uploadedAt: new Date().toISOString()
    });

    // Update fileUrl to canonical download endpoint
    doc.fileUrl = `/api/projects/${projectId}/documents/${doc.id}/download`;

    projectRepository.addActivity({
      projectId,
      actorUserId: user.id,
      eventType: 'DOCUMENT_UPLOADED',
      entityType: 'ProjectDocument',
      entityId: doc.id,
      metadata: {
        documentType: type,
        filename: sanitizedFilename,
        sizeBytes: validationResult.sizeBytes,
        storageProvider: 'S3_COMPATIBLE'
      }
    });
  } catch (persistErr: any) {
    // Compensating rollback: delete uploaded object to prevent orphans
    console.error('Document metadata persistence failed, executing rollback delete:', persistErr);
    try {
      await storageService.deleteObject(storageKey);
    } catch (cleanupErr) {
      console.error('Rollback cleanup failed:', cleanupErr);
    }

    return res.status(500).json({
      code: 'METADATA_PERSISTENCE_FAILED',
      error: 'خطا در ذخیره‌سازی اطلاعات سند در پایگاه داده'
    });
  }

  // Omit internal storageKey from response
  const { storageKey: _omittedKey, ...safeDoc } = doc as any;
  res.status(201).json(safeDoc);
});

// GET /api/projects/:projectId/documents/:documentId/download
router.get('/:id/documents/:documentId/download', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = String(req.params.id);
  const documentId = String(req.params.documentId);

  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const doc = projectRepository.getDocumentById(projectId, documentId);
  if (!doc) {
    return res.status(404).json({ error: "سند مورد نظر یافت نشد" });
  }

  // Cross-project IDOR check
  if (doc.projectId !== projectId) {
    return res.status(404).json({ error: "سند متعلق به این پروژه نیست" });
  }

  // If legacy external URL without S3 storage
  if (doc.storageProvider === 'EXTERNAL_URL' || (!doc.storageProvider && !doc.storageKey)) {
    return res.json({
      downloadUrl: doc.fileUrl,
      storageProvider: 'EXTERNAL_URL',
      expiresIn: null
    });
  }

  // S3 Compatible binary file download
  const storageService = getFileStorageService();
  if (!storageService.isConfigured()) {
    return res.status(503).json({
      code: 'STORAGE_NOT_CONFIGURED',
      error: 'سرویس ذخیره‌سازی ابری پیکربندی نشده است.'
    });
  }

  if (!doc.storageKey) {
    return res.status(404).json({ error: "شناسه ذخیره‌سازی فایل یافت نشد" });
  }

  try {
    const signedUrl = await storageService.getSignedDownloadUrl({
      key: doc.storageKey
    });

    return res.json({
      downloadUrl: signedUrl,
      storageProvider: 'S3_COMPATIBLE',
      expiresIn: 300 // default TTL seconds
    });
  } catch (err: any) {
    console.error('Error generating signed download URL:', err);
    return res.status(500).json({
      code: 'SIGNED_URL_ERROR',
      error: 'خطا در ایجاد لینک دانلود امن'
    });
  }
});

// DELETE /api/projects/:projectId/documents/:documentId
router.delete('/:id/documents/:documentId', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = String(req.params.id);
  const documentId = String(req.params.documentId);

  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const doc = projectRepository.getDocumentById(projectId, documentId);
  if (!doc) {
    return res.status(404).json({ error: "سند مورد نظر یافت نشد" });
  }

  if (doc.projectId !== projectId) {
    return res.status(404).json({ error: "سند متعلق به این پروژه نیست" });
  }

  // If S3 binary document, delete from object storage first
  if (doc.storageProvider === 'S3_COMPATIBLE' && doc.storageKey) {
    const storageService = getFileStorageService();
    if (storageService.isConfigured()) {
      try {
        await storageService.deleteObject(doc.storageKey);
      } catch (err) {
        console.error('Failed to delete object from storage:', err);
        return res.status(502).json({
          code: 'STORAGE_DELETE_FAILED',
          error: 'خطا در حذف فایل از فضای ذخیره‌سازی ابری'
        });
      }
    }
  }

  const deleted = projectRepository.deleteDocument(projectId, documentId);
  if (!deleted) {
    return res.status(500).json({ error: "خطا در حذف سند از پایگاه داده" });
  }

  projectRepository.addActivity({
    projectId,
    actorUserId: user.id,
    eventType: 'DOCUMENT_DELETED',
    entityType: 'ProjectDocument',
    entityId: documentId,
    metadata: {
      documentType: doc.type,
      originalFilename: doc.originalFilename
    }
  });

  res.json({ success: true, message: "سند با موفقیت حذف شد" });
});

// POST /api/projects/:id/documents (Legacy external URL registration)
router.post('/:id/documents', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = String(req.params.id);
  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { type, fileUrl, version } = req.body;
  if (!type || !fileUrl) {
    return res.status(400).json({ error: "نوع سند و نشانی فایل الزامی است" });
  }

  // Strict URL protocol validation: allow only http/https; reject javascript:, data:, file:, etc.
  try {
    const parsedUrl = new URL(fileUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({
        code: 'INVALID_URL_PROTOCOL',
        error: 'نشانی سند تنها باید با پروتکل http یا https باشد'
      });
    }
  } catch (err) {
    return res.status(400).json({
      code: 'MALFORMED_URL',
      error: 'نشانی اینترنتی وارد شده نامعتبر است'
    });
  }

  const doc = projectRepository.addDocument({
    projectId,
    uploadedByUserId: user.id,
    type,
    fileUrl,
    version: version || 1,
    verificationStatus: 'NOT_REVIEWED',
    storageProvider: 'EXTERNAL_URL'
  });

  projectRepository.addActivity({
    projectId,
    actorUserId: user.id,
    eventType: 'DOCUMENT_UPLOADED',
    entityType: 'ProjectDocument',
    entityId: doc.id,
    metadata: { documentType: type, fileUrl, storageProvider: 'EXTERNAL_URL' }
  });

  res.json(doc);
});

// GET /api/projects/:id/activity
router.get('/:id/activity', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = String(req.params.id);
  const access = checkProjectAccess(projectId, user.id, user.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(projectRepository.getActivities(projectId));
});

export default router;
