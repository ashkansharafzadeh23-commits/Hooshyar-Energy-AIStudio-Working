import express, { Request, Response } from 'express';
import { verifyAuthToken, requireAuth } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { assetService, STANDARD_COMMISSIONING_TESTS, calculateWarrantyStatus } from '../services/assetService.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { procurementRepository } from '../repositories/procurementRepository.js';
import { canTransition, validateTransition } from '../services/projectLifecycleService.js';
import {
  EnergyAsset,
  AssetComponent,
  EquipmentWarranty,
  EquipmentWarrantyStatus,
  CommissioningRecord,
  CommissioningTest,
  ProjectHandover,
  PunchListItem,
  AssetPassportSnapshot,
  AssetPerformanceBaseline
} from '../types/asset.js';

const assetRouter = express.Router();

// Apply auth middleware to all asset, commissioning, and handover routes
assetRouter.use(verifyAuthToken);
assetRouter.use(requireAuth);

/**
 * Safe parameter extraction to satisfy strict TypeScript definitions
 */
function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

/**
 * Helper to log ProjectActivity deterministically
 */
function logActivity(
  projectId: string,
  actorUserId: string,
  eventType: string,
  entityType?: string,
  entityId?: string,
  metadata?: any
) {
  try {
    projectRepository.addActivity({
      projectId,
      actorUserId,
      eventType,
      entityType,
      entityId,
      metadata
    });
  } catch (err) {
    console.error(`[ProjectActivity] Failed to log ${eventType}:`, err);
  }
}

/**
 * Helper to find component by ID across all assets
 */
function findComponentById(componentId: string): AssetComponent | null {
  const assets = assetRepository.getAssets();
  for (const asset of assets) {
    const comps = assetRepository.getAssetComponents(asset.id);
    const found = comps.find(c => c.id === componentId);
    if (found) return found;
  }
  return null;
}

/**
 * Helper to find warranty by ID across all assets and projects
 */
function findWarrantyById(warrantyId: string): EquipmentWarranty | null {
  const assets = assetRepository.getAssets();
  for (const asset of assets) {
    const warranties = assetRepository.getEquipmentWarranties(asset.id);
    const found = warranties.find(w => w.id === warrantyId);
    if (found) return found;
  }
  const projects = projectRepository.findAll();
  for (const p of projects) {
    const warranties = assetRepository.getEquipmentWarrantiesByProjectId(p.id);
    const found = warranties.find(w => w.id === warrantyId);
    if (found) return found;
  }
  return null;
}

// ==========================================
// 1. COMMISSIONING RECORDS & TESTS
// ==========================================

// GET /api/projects/:projectId/commissioning
assetRouter.get('/projects/:projectId/commissioning', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const records = assetRepository.getCommissioningRecords(projectId);
  res.json(records);
});

// POST /api/projects/:projectId/commissioning -> Start or create commissioning
assetRouter.post('/projects/:projectId/commissioning', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const existingRecords = assetRepository.getCommissioningRecords(projectId);
  if (existingRecords.length > 0) {
    return res.json(existingRecords[0]);
  }

  // Create commissioning record with standard solar test suite
  const record = assetRepository.createCommissioningRecord({
    projectId,
    status: 'IN_PROGRESS',
    plannedDate: req.body.plannedDate || new Date().toISOString(),
    tests: [],
    documents: [],
    notes: req.body.notes || ''
  });

  // Populate standard commissioning tests
  const testIds: string[] = [];
  STANDARD_COMMISSIONING_TESTS.forEach(spec => {
    const test = assetRepository.createCommissioningTest({
      commissioningRecordId: record.id,
      testType: spec.testType,
      status: 'NOT_STARTED',
      expectedRange: spec.expectedRange,
      notes: spec.isMandatory ? 'آزمون اجباری راه‌اندازی' : 'آزمون اختیاری'
    });
    testIds.push(test.id);
  });

  assetRepository.updateCommissioningRecord(record.id, { tests: testIds });
  record.tests = testIds;

  // Lifecycle check: transition from CONSTRUCTION to COMMISSIONING if applicable
  const project = access.project;
  if (project.status === 'CONSTRUCTION' && canTransition(project.status, 'COMMISSIONING')) {
    projectRepository.update(projectId, { status: 'COMMISSIONING' });
    logActivity(projectId, req.user.id, 'STATUS_CHANGED', 'EnergyProject', projectId, {
      fromStatus: 'CONSTRUCTION',
      toStatus: 'COMMISSIONING'
    });
  }

  logActivity(projectId, req.user.id, 'COMMISSIONING_CREATED', 'CommissioningRecord', record.id);

  res.status(201).json(record);
});

// GET /api/commissioning/:id
assetRouter.get('/commissioning/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const record = assetRepository.getCommissioningRecordById(id);
  if (!record) return res.status(404).json({ error: 'Commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const tests = assetRepository.getCommissioningTests(record.id);
  res.json({ ...record, testDetails: tests });
});

// PATCH /api/commissioning/:id
assetRouter.patch('/commissioning/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const record = assetRepository.getCommissioningRecordById(id);
  if (!record) return res.status(404).json({ error: 'Commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  // Prevent cross-project and immutable field IDOR
  const { id: _id, projectId: _pId, tests: _tests, createdAt: _cAt, ...safeUpdates } = req.body;

  const updated = assetRepository.updateCommissioningRecord(record.id, safeUpdates);
  res.json(updated);
});

// GET /api/commissioning/:id/tests
assetRouter.get('/commissioning/:id/tests', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const record = assetRepository.getCommissioningRecordById(id);
  if (!record) return res.status(404).json({ error: 'Commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const tests = assetRepository.getCommissioningTests(record.id);
  res.json(tests);
});

// POST /api/commissioning/:id/tests -> Create individual test
assetRouter.post('/commissioning/:id/tests', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const record = assetRepository.getCommissioningRecordById(id);
  if (!record) return res.status(404).json({ error: 'Commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { id: _id, commissioningRecordId: _rId, ...testData } = req.body;
  if (!testData.testType) {
    return res.status(400).json({ error: 'testType is required' });
  }

  const test = assetRepository.createCommissioningTest({
    commissioningRecordId: record.id,
    testType: testData.testType,
    status: testData.status || 'NOT_STARTED',
    expectedRange: testData.expectedRange || '',
    unit: testData.unit,
    notes: testData.notes
  });

  // Append to record
  const currentTests = record.tests || [];
  if (!currentTests.includes(test.id)) {
    currentTests.push(test.id);
    assetRepository.updateCommissioningRecord(record.id, { tests: currentTests });
  }

  res.status(201).json(test);
});

// GET /api/commissioning-tests/:id
assetRouter.get('/commissioning-tests/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const test = assetRepository.getCommissioningTestById(id);
  if (!test) return res.status(404).json({ error: 'Commissioning test not found' });

  const record = assetRepository.getCommissioningRecordById(test.commissioningRecordId);
  if (!record) return res.status(404).json({ error: 'Parent commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(test);
});

// PATCH /api/commissioning-tests/:id
assetRouter.patch('/commissioning-tests/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const test = assetRepository.getCommissioningTestById(id);
  if (!test) return res.status(404).json({ error: 'Commissioning test not found' });

  const record = assetRepository.getCommissioningRecordById(test.commissioningRecordId);
  if (!record) return res.status(404).json({ error: 'Parent commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { id: _id, commissioningRecordId: _cId, ...safeUpdates } = req.body;
  const updated = assetRepository.updateCommissioningTest(test.id, safeUpdates);
  res.json(updated);
});

// POST /api/commissioning-tests/:id/result -> Submit test measurement/result
assetRouter.post('/commissioning-tests/:id/result', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const test = assetRepository.getCommissioningTestById(id);
  if (!test) return res.status(404).json({ error: 'Commissioning test not found' });

  const record = assetRepository.getCommissioningRecordById(test.commissioningRecordId);
  if (!record) return res.status(404).json({ error: 'Parent commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { measuredValue, status, unit, evidenceDocumentIds, notes } = req.body;
  if (!status || !['PASSED', 'FAILED', 'REQUIRES_RETEST', 'WAIVED'].includes(status)) {
    return res.status(400).json({ error: 'Valid test status (PASSED, FAILED, REQUIRES_RETEST, WAIVED) is required' });
  }

  const updated = assetRepository.updateCommissioningTest(test.id, {
    measuredValue: measuredValue !== undefined ? String(measuredValue) : test.measuredValue,
    status,
    unit: unit || test.unit,
    performedAt: new Date().toISOString(),
    performedBy: req.user.id,
    evidenceDocumentIds: evidenceDocumentIds || test.evidenceDocumentIds,
    notes: notes || test.notes
  });

  logActivity(record.projectId, req.user.id, 'COMMISSIONING_TEST_SUBMITTED', 'CommissioningTest', test.id, {
    testType: test.testType,
    status,
    measuredValue
  });

  res.json(updated);
});

// POST /api/commissioning-tests/:id/approve -> Approve test
assetRouter.post('/commissioning-tests/:id/approve', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const test = assetRepository.getCommissioningTestById(id);
  if (!test) return res.status(404).json({ error: 'Commissioning test not found' });

  const record = assetRepository.getCommissioningRecordById(test.commissioningRecordId);
  if (!record) return res.status(404).json({ error: 'Parent commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = assetRepository.updateCommissioningTest(test.id, {
    status: 'PASSED',
    performedAt: test.performedAt || new Date().toISOString(),
    performedBy: test.performedBy || req.user.id,
    notes: req.body.notes || test.notes
  });

  logActivity(record.projectId, req.user.id, 'COMMISSIONING_TEST_APPROVED', 'CommissioningTest', test.id, {
    testType: test.testType
  });

  res.json(updated);
});

// POST /api/commissioning-tests/:id/reject -> Reject test
assetRouter.post('/commissioning-tests/:id/reject', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const test = assetRepository.getCommissioningTestById(id);
  if (!test) return res.status(404).json({ error: 'Commissioning test not found' });

  const record = assetRepository.getCommissioningRecordById(test.commissioningRecordId);
  if (!record) return res.status(404).json({ error: 'Parent commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = assetRepository.updateCommissioningTest(test.id, {
    status: 'FAILED',
    performedAt: new Date().toISOString(),
    performedBy: req.user.id,
    notes: req.body.notes || 'آزمون رد شد.'
  });

  logActivity(record.projectId, req.user.id, 'COMMISSIONING_TEST_REJECTED', 'CommissioningTest', test.id, {
    testType: test.testType,
    notes: req.body.notes
  });

  res.json(updated);
});

// Deterministic gating calculation helper
function evaluateCommissioningGating(projectId: string) {
  const records = assetRepository.getCommissioningRecords(projectId);
  if (records.length === 0) {
    return {
      canApprove: false,
      insufficientData: true,
      blockingReasons: ['هیچ پرونده راه‌اندازی برای این پروژه ثبت نشده است (INSUFFICIENT_DATA).'],
      record: null
    };
  }

  const record = records[0];
  const tests = assetRepository.getCommissioningTests(record.id);
  if (tests.length === 0) {
    return {
      canApprove: false,
      insufficientData: true,
      blockingReasons: ['هیچ آزمون راه‌اندازی ثبت نشده است (INSUFFICIENT_DATA).'],
      record
    };
  }

  // Check mandatory tests
  const mandatorySpecs = STANDARD_COMMISSIONING_TESTS.filter(s => s.isMandatory);
  const blockingReasons: string[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  mandatorySpecs.forEach(spec => {
    const foundTest = tests.find(t => t.testType === spec.testType);
    if (!foundTest) {
      blockingReasons.push(`آزمون اجباری ${spec.testType} هنوز در مجموعه آزمون‌ها تعریف نشده است.`);
    } else if (foundTest.status === 'FAILED') {
      failedCount++;
      blockingReasons.push(`آزمون اجباری ${spec.testType} مردود شده است (نتیجه: ${foundTest.measuredValue || 'نامشخص'}).`);
    } else if (foundTest.status === 'NOT_STARTED' || foundTest.status === 'REQUIRES_RETEST') {
      pendingCount++;
      blockingReasons.push(`آزمون اجباری ${spec.testType} هنوز تکمیل یا تأیید نشده است.`);
    } else {
      passedCount++;
    }
  });

  // Check open critical punch list items
  const punchList = assetRepository.getPunchListItems(projectId);
  const openCritical = punchList.filter(
    p => p.severity === 'CRITICAL' && p.status !== 'RESOLVED' && p.status !== 'WAIVED'
  );

  if (openCritical.length > 0) {
    blockingReasons.push(`${openCritical.length} مورد نقص بحرانی در پانچ‌لیست باز است.`);
  }

  const canApprove = blockingReasons.length === 0 && passedCount > 0;

  return {
    canApprove,
    insufficientData: false,
    totalTests: tests.length,
    passedTests: passedCount,
    failedTests: failedCount,
    pendingTests: pendingCount,
    criticalPunchListCount: openCritical.length,
    blockingReasons,
    record
  };
}

// GET /api/projects/:projectId/commissioning/readiness
assetRouter.get('/projects/:projectId/commissioning/readiness', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const gating = evaluateCommissioningGating(projectId);
  if (gating.insufficientData) {
    return res.status(200).json({
      canApprove: false,
      status: 'INSUFFICIENT_DATA',
      blockingReasons: gating.blockingReasons
    });
  }

  res.json(gating);
});

// GET /api/commissioning/:id/readiness
assetRouter.get('/commissioning/:id/readiness', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const record = assetRepository.getCommissioningRecordById(id);
  if (!record) return res.status(404).json({ error: 'Commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const gating = evaluateCommissioningGating(record.projectId);
  res.json(gating);
});

// Helper for commissioning approval
function performCommissioningApproval(projectId: string, userId: string, notes?: string) {
  const gating = evaluateCommissioningGating(projectId);
  if (gating.insufficientData) {
    return {
      success: false,
      code: 'INSUFFICIENT_DATA',
      message: gating.blockingReasons.join(' | ')
    };
  }

  if (!gating.canApprove) {
    return {
      success: false,
      code: 'GATING_FAILED',
      message: `امکان تأیید راه‌اندازی وجود ندارد: ${gating.blockingReasons.join(' | ')}`
    };
  }

  const record = gating.record!;
  if (record.status === 'APPROVED') {
    return { success: true, record, alreadyApproved: true };
  }

  const updated = assetRepository.updateCommissioningRecord(record.id, {
    status: 'APPROVED',
    approvedByUserId: userId,
    actualDate: new Date().toISOString(),
    notes: notes || record.notes
  })!;

  logActivity(projectId, userId, 'COMMISSIONING_APPROVED', 'CommissioningRecord', record.id);

  return { success: true, record: updated };
}

// POST /api/projects/:projectId/commissioning/approve
assetRouter.post('/projects/:projectId/commissioning/approve', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const result = performCommissioningApproval(projectId, req.user.id, req.body.notes);
  if (!result.success) {
    return res.status(400).json({ error: result.code, message: result.message });
  }

  res.json(result.record);
});

// POST /api/commissioning/:id/approve
assetRouter.post('/commissioning/:id/approve', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const record = assetRepository.getCommissioningRecordById(id);
  if (!record) return res.status(404).json({ error: 'Commissioning record not found' });

  const access = checkProjectAccess(record.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const result = performCommissioningApproval(record.projectId, req.user.id, req.body.notes);
  if (!result.success) {
    return res.status(400).json({ error: result.code, message: result.message });
  }

  res.json(result.record);
});

// ==========================================
// 2. HANDOVER & CHECKLIST & PUNCH LIST
// ==========================================

// GET /api/projects/:projectId/handover
assetRouter.get('/projects/:projectId/handover', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const handover = assetRepository.getProjectHandover(projectId);
  res.json(handover || null);
});

// POST /api/projects/:projectId/handover -> Create handover record
assetRouter.post('/projects/:projectId/handover', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const existing = assetRepository.getProjectHandover(projectId);
  if (existing) {
    return res.json(existing);
  }

  const handover = assetRepository.createProjectHandover({
    projectId,
    status: 'DRAFT',
    documentsComplete: false,
    trainingComplete: false,
    sparePartsDelivered: false,
    warrantyDelivered: false,
    manualsDelivered: false,
    notes: req.body.notes || ''
  });

  logActivity(projectId, req.user.id, 'HANDOVER_CREATED', 'ProjectHandover', handover.id);

  res.status(201).json(handover);
});

// GET /api/handover/:id
assetRouter.get('/handover/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const handover = assetRepository.getProjectHandoverById(id);
  if (!handover) return res.status(404).json({ error: 'Project handover not found' });

  const access = checkProjectAccess(handover.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(handover);
});

// PATCH /api/handover/:id
assetRouter.patch('/handover/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const handover = assetRepository.getProjectHandoverById(id);
  if (!handover) return res.status(404).json({ error: 'Project handover not found' });

  const access = checkProjectAccess(handover.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { id: _id, projectId: _pId, status: _st, ...safeUpdates } = req.body;
  const updated = assetRepository.updateProjectHandover(handover.id, safeUpdates);
  res.json(updated);
});

// Checklist Verification helper
function updateHandoverChecklist(
  projectId: string,
  userId: string,
  items: {
    documentsComplete?: boolean;
    trainingComplete?: boolean;
    sparePartsDelivered?: boolean;
    warrantyDelivered?: boolean;
    manualsDelivered?: boolean;
    notes?: string;
  }
) {
  let handover = assetRepository.getProjectHandover(projectId);
  if (!handover) {
    handover = assetRepository.createProjectHandover({
      projectId,
      status: 'DRAFT',
      documentsComplete: false,
      trainingComplete: false,
      sparePartsDelivered: false,
      warrantyDelivered: false,
      manualsDelivered: false
    });
  }

  const updates: Partial<ProjectHandover> = {};
  if (items.documentsComplete !== undefined) updates.documentsComplete = Boolean(items.documentsComplete);
  if (items.trainingComplete !== undefined) updates.trainingComplete = Boolean(items.trainingComplete);
  if (items.sparePartsDelivered !== undefined) updates.sparePartsDelivered = Boolean(items.sparePartsDelivered);
  if (items.warrantyDelivered !== undefined) updates.warrantyDelivered = Boolean(items.warrantyDelivered);
  if (items.manualsDelivered !== undefined) updates.manualsDelivered = Boolean(items.manualsDelivered);
  if (items.notes !== undefined) updates.notes = items.notes;

  const updated = assetRepository.updateProjectHandover(handover.id, updates)!;

  logActivity(projectId, userId, 'HANDOVER_CHECKLIST_VERIFIED', 'ProjectHandover', handover.id, updates);

  return updated;
}

// POST /api/projects/:projectId/handover/checklist
assetRouter.post('/projects/:projectId/handover/checklist', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = updateHandoverChecklist(projectId, req.user.id, req.body);
  res.json(updated);
});

// POST /api/handover/:id/checklist
assetRouter.post('/handover/:id/checklist', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const handover = assetRepository.getProjectHandoverById(id);
  if (!handover) return res.status(404).json({ error: 'Project handover not found' });

  const access = checkProjectAccess(handover.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = updateHandoverChecklist(handover.projectId, req.user.id, req.body);
  res.json(updated);
});

// POST /api/projects/:projectId/handover/verify-documents -> Document verification
assetRouter.post('/projects/:projectId/handover/verify-documents', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const docs = projectRepository.getDocuments(projectId);
  const hasEngineering = docs.some(d => d.type === 'ENGINEERING' || d.type === 'COMMISSIONING');
  const hasDatasheets = docs.some(d => d.type === 'EQUIPMENT_DATASHEET' || d.type === 'OTHER');

  let handover = assetRepository.getProjectHandover(projectId);
  if (!handover) {
    handover = assetRepository.createProjectHandover({
      projectId,
      status: 'DRAFT',
      documentsComplete: false,
      trainingComplete: false,
      sparePartsDelivered: false,
      warrantyDelivered: false,
      manualsDelivered: false
    });
  }

  const documentsComplete = (hasEngineering && hasDatasheets) || docs.length >= 2 || req.body.forceVerify === true;
  const updated = assetRepository.updateProjectHandover(handover.id, { documentsComplete })!;

  res.json({
    documentsComplete,
    totalDocuments: docs.length,
    handover: updated
  });
});

// Handover readiness evaluation
function evaluateHandoverReadiness(projectId: string) {
  const commissioningRecords = assetRepository.getCommissioningRecords(projectId);
  const commissioningApproved = commissioningRecords.some(r => r.status === 'APPROVED');

  const handover = assetRepository.getProjectHandover(projectId);
  const punchList = assetRepository.getPunchListItems(projectId);
  const openCriticalPunchList = punchList.filter(
    p => p.severity === 'CRITICAL' && p.status !== 'RESOLVED' && p.status !== 'WAIVED'
  );

  const blockingReasons: string[] = [];

  if (!commissioningApproved) {
    blockingReasons.push('راه‌اندازی پروژه (Commissioning) هنوز تأیید نهایی نشده است.');
  }

  if (!handover) {
    blockingReasons.push('چک‌لیست تحویل پروژه هنوز ایجاد نشده است.');
    return {
      canApprove: false,
      commissioningApproved: false,
      documentsComplete: false,
      trainingComplete: false,
      sparePartsDelivered: false,
      warrantyDelivered: false,
      manualsDelivered: false,
      unresolvedCriticalPunchList: openCriticalPunchList.length,
      blockingReasons
    };
  }

  if (!handover.documentsComplete) blockingReasons.push('مدارک و نقشه‌های چون‌ساخت (As-Built) تحویل و تأیید نشده‌اند.');
  if (!handover.trainingComplete) blockingReasons.push('دوره‌های آموزشی بهره‌بردار تکمیل نشده است.');
  if (!handover.sparePartsDelivered) blockingReasons.push('قطعات یدکی ضروری تحویل داده نشده‌اند.');
  if (!handover.warrantyDelivered) blockingReasons.push('ضمانت‌نامه‌های رسمی تجهیزات تحویل داده نشده‌اند.');
  if (!handover.manualsDelivered) blockingReasons.push('کتابچه‌های بهره‌برداری و نگهداری (O&M) تحویل نشده‌اند.');
  if (openCriticalPunchList.length > 0) {
    blockingReasons.push(`${openCriticalPunchList.length} مورد نقص بحرانی در پانچ‌لیست حل نشده است.`);
  }

  const canApprove =
    commissioningApproved &&
    handover.documentsComplete &&
    handover.trainingComplete &&
    handover.sparePartsDelivered &&
    handover.warrantyDelivered &&
    handover.manualsDelivered &&
    openCriticalPunchList.length === 0;

  return {
    canApprove,
    commissioningApproved,
    documentsComplete: handover.documentsComplete,
    trainingComplete: handover.trainingComplete,
    sparePartsDelivered: handover.sparePartsDelivered,
    warrantyDelivered: handover.warrantyDelivered,
    manualsDelivered: handover.manualsDelivered,
    unresolvedCriticalPunchList: openCriticalPunchList.length,
    blockingReasons
  };
}

// GET /api/projects/:projectId/handover/readiness
assetRouter.get('/projects/:projectId/handover/readiness', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const readiness = evaluateHandoverReadiness(projectId);
  res.json(readiness);
});

// GET /api/handover/:id/readiness
assetRouter.get('/handover/:id/readiness', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const handover = assetRepository.getProjectHandoverById(id);
  if (!handover) return res.status(404).json({ error: 'Project handover not found' });

  const access = checkProjectAccess(handover.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const readiness = evaluateHandoverReadiness(handover.projectId);
  res.json(readiness);
});

// Final Handover Approval helper
function performHandoverApproval(projectId: string, userId: string, notes?: string) {
  const readiness = evaluateHandoverReadiness(projectId);
  if (!readiness.canApprove) {
    return {
      success: false,
      code: 'HANDOVER_BLOCKED',
      message: `امکان تأیید تحویل قطعی وجود ندارد: ${readiness.blockingReasons.join(' | ')}`
    };
  }

  const handover = assetRepository.getProjectHandover(projectId)!;
  const updated = assetRepository.updateProjectHandover(handover.id, {
    status: 'APPROVED',
    handoverDate: new Date().toISOString(),
    finalApprovalId: userId,
    notes: notes || handover.notes
  })!;

  logActivity(projectId, userId, 'HANDOVER_APPROVED', 'ProjectHandover', handover.id);

  return { success: true, handover: updated };
}

// POST /api/projects/:projectId/handover/approve
assetRouter.post('/projects/:projectId/handover/approve', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const result = performHandoverApproval(projectId, req.user.id, req.body.notes);
  if (!result.success) {
    return res.status(400).json({ error: result.code, message: result.message });
  }

  res.json(result.handover);
});

// POST /api/handover/:id/approve
assetRouter.post('/handover/:id/approve', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const handover = assetRepository.getProjectHandoverById(id);
  if (!handover) return res.status(404).json({ error: 'Project handover not found' });

  const access = checkProjectAccess(handover.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const result = performHandoverApproval(handover.projectId, req.user.id, req.body.notes);
  if (!result.success) {
    return res.status(400).json({ error: result.code, message: result.message });
  }

  res.json(result.handover);
});

// ------------------------------------------
// Punch List Routes
// ------------------------------------------

// GET /api/projects/:projectId/punch-list
assetRouter.get('/projects/:projectId/punch-list', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const items = assetRepository.getPunchListItems(projectId);
  res.json(items);
});

// POST /api/projects/:projectId/punch-list
assetRouter.post('/projects/:projectId/punch-list', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { id: _id, projectId: _pId, itemNumber: _num, ...itemData } = req.body;
  if (!itemData.title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const item = assetRepository.createPunchListItem({
    projectId,
    title: itemData.title,
    description: itemData.description || '',
    severity: itemData.severity || 'MAJOR',
    status: itemData.status || 'OPEN',
    assignedTo: itemData.assignedTo,
    commissioningRecordId: itemData.commissioningRecordId
  });

  res.status(201).json(item);
});

// GET /api/punch-list/:id
assetRouter.get('/punch-list/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const item = assetRepository.getPunchListItemById(id);
  if (!item) return res.status(404).json({ error: 'Punch list item not found' });

  const access = checkProjectAccess(item.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  res.json(item);
});

// PATCH /api/punch-list/:id
assetRouter.patch('/punch-list/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const item = assetRepository.getPunchListItemById(id);
  if (!item) return res.status(404).json({ error: 'Punch list item not found' });

  const access = checkProjectAccess(item.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { id: _id, projectId: _pId, itemNumber: _num, ...safeUpdates } = req.body;
  const updated = assetRepository.updatePunchListItem(item.id, safeUpdates);
  res.json(updated);
});

// POST /api/punch-list/:id/resolve
assetRouter.post('/punch-list/:id/resolve', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const item = assetRepository.getPunchListItemById(id);
  if (!item) return res.status(404).json({ error: 'Punch list item not found' });

  const access = checkProjectAccess(item.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = assetRepository.updatePunchListItem(item.id, {
    status: 'RESOLVED',
    resolvedAt: new Date().toISOString(),
    resolvedByUserId: req.user.id,
    notes: req.body.notes || item.notes
  });

  logActivity(item.projectId, req.user.id, 'PUNCH_LIST_ITEM_RESOLVED', 'PunchListItem', item.id);

  res.json(updated);
});

// DELETE /api/punch-list/:id
assetRouter.delete('/punch-list/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const item = assetRepository.getPunchListItemById(id);
  if (!item) return res.status(404).json({ error: 'Punch list item not found' });

  const access = checkProjectAccess(item.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  assetRepository.deletePunchListItem(item.id);
  res.json({ success: true, message: 'مورد پانچ‌لیست حذف گردید.' });
});

// ==========================================
// 3. ENERGY ASSET CREATION & REGISTRY
// ==========================================

// Deterministic asset creation from verified actuals via assetService
function createEnergyAssetFromProjectActuals(projectId: string, userId: string): EnergyAsset {
  return assetService.generateEnergyAsset(projectId, userId);
}

// GET /api/assets -> User-scoped assets list
assetRouter.get('/assets', (req: Request, res: Response) => {
  const allAssets = assetRepository.getAssets();
  const userId = req.user?.id;
  const isAdmin = req.user?.role === 'ADMIN' || (Array.isArray(req.user?.roles) && req.user.roles.includes('ADMIN'));

  if (isAdmin) {
    return res.json(allAssets);
  }

  const filtered = allAssets.filter(asset => {
    if (asset.ownerId === userId) return true;
    if (!asset.projectId) return false;
    const access = checkProjectAccess(asset.projectId, userId, req.user?.role);
    return access.allowed;
  });

  res.json(filtered);
});

// GET /api/assets/:id
assetRouter.get('/assets/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  } else if (asset.ownerId !== req.user?.id && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(asset);
});

// PATCH /api/assets/:id
assetRouter.patch('/assets/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  } else if (asset.ownerId !== req.user?.id && req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { id: _id, assetCode: _code, projectId: _pId, createdAt: _cAt, ...safeUpdates } = req.body;
  const updated = assetRepository.updateAsset(asset.id, safeUpdates);
  res.json(updated);
});

// GET /api/projects/:projectId/assets
assetRouter.get('/projects/:projectId/assets', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const assets = assetRepository.getAssetsByProjectId(projectId);
  res.json(assets);
});

// POST /api/projects/:projectId/assets -> Generate/create asset
assetRouter.post('/projects/:projectId/assets', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  try {
    const asset = createEnergyAssetFromProjectActuals(projectId, req.user.id);
    res.status(201).json(asset);
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.startsWith('INSUFFICIENT_DATA')) {
      return res.status(400).json({ error: 'INSUFFICIENT_DATA', message: msg.replace('INSUFFICIENT_DATA: ', '') });
    }
    if (msg.startsWith('COMMISSIONING_NOT_APPROVED') || msg.startsWith('HANDOVER_NOT_APPROVED')) {
      return res.status(400).json({ error: 'INSUFFICIENT_DATA', message: msg });
    }
    res.status(400).json({ error: 'ASSET_CREATION_FAILED', message: msg });
  }
});

// POST /api/projects/:projectId/assets/generate
assetRouter.post('/projects/:projectId/assets/generate', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  try {
    const asset = createEnergyAssetFromProjectActuals(projectId, req.user.id);
    res.status(201).json(asset);
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.startsWith('INSUFFICIENT_DATA')) {
      return res.status(400).json({ error: 'INSUFFICIENT_DATA', message: msg.replace('INSUFFICIENT_DATA: ', '') });
    }
    if (msg.startsWith('COMMISSIONING_NOT_APPROVED') || msg.startsWith('HANDOVER_NOT_APPROVED')) {
      return res.status(400).json({ error: 'INSUFFICIENT_DATA', message: msg });
    }
    res.status(400).json({ error: 'ASSET_CREATION_FAILED', message: msg });
  }
});

// ==========================================
// 4. ASSET COMPONENT REGISTRY
// ==========================================

// GET /api/assets/:id/components
assetRouter.get('/assets/:id/components', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const components = assetRepository.getAssetComponents(asset.id);
  res.json(components);
});

// POST /api/assets/:id/components
assetRouter.post('/assets/:id/components', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const { id: _id, assetId: _aId, projectId: _pId, ...compData } = req.body;
  if (!compData.componentType) {
    return res.status(400).json({ error: 'componentType is required' });
  }

  const comp = assetRepository.createAssetComponent({
    assetId: asset.id,
    projectId: asset.projectId,
    componentType: compData.componentType,
    manufacturer: compData.manufacturer || '',
    brand: compData.brand || compData.manufacturer || '',
    model: compData.model || '',
    serialNumber: compData.serialNumber,
    quantity: compData.quantity || 1,
    ratedCapacity: compData.ratedCapacity,
    capacityUnit: compData.capacityUnit,
    installationDate: compData.installationDate || new Date().toISOString(),
    commissioningDate: compData.commissioningDate || asset.commissioningDate,
    status: compData.status || 'INSTALLED'
  });

  res.status(201).json(comp);
});

// GET /api/components/:id
assetRouter.get('/components/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const comp = findComponentById(id);
  if (!comp) return res.status(404).json({ error: 'Component not found' });

  const asset = assetRepository.getAssetById(comp.assetId);
  if (asset && asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  res.json(comp);
});

// PATCH /api/components/:id
assetRouter.patch('/components/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const comp = findComponentById(id);
  if (!comp) return res.status(404).json({ error: 'Component not found' });

  const asset = assetRepository.getAssetById(comp.assetId);
  if (asset && asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  // Enforce IDOR protection: cannot change parent assetId or projectId
  const { id: _id, assetId: _aId, projectId: _pId, ...safeUpdates } = req.body;
  const updated = assetRepository.updateAssetComponent(comp.id, safeUpdates);
  res.json(updated);
});

// ==========================================
// 5. WARRANTY REGISTRY
// ==========================================

// GET /api/assets/:id/warranties
assetRouter.get('/assets/:id/warranties', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const warranties = assetRepository.getEquipmentWarranties(asset.id);
  // Recalculate deterministic status based on stored dates
  const refreshed = warranties.map(w => ({
    ...w,
    status: calculateWarrantyStatus(w.startDate, w.endDate)
  }));
  res.json(refreshed);
});

// GET /api/projects/:projectId/warranties
assetRouter.get('/projects/:projectId/warranties', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const warranties = assetRepository.getEquipmentWarrantiesByProjectId(projectId);
  const refreshed = warranties.map(w => ({
    ...w,
    status: calculateWarrantyStatus(w.startDate, w.endDate)
  }));
  res.json(refreshed);
});

// POST /api/assets/:id/warranties
assetRouter.post('/assets/:id/warranties', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const { id: _id, assetId: _aId, ...wData } = req.body;
  if (!wData.warrantyProvider || !wData.startDate || !wData.endDate) {
    return res.status(400).json({ error: 'warrantyProvider, startDate and endDate are required' });
  }

  const calculatedStatus = calculateWarrantyStatus(wData.startDate, wData.endDate);

  const warranty = assetRepository.createEquipmentWarranty({
    assetId: asset.id,
    componentId: wData.componentId,
    warrantyProvider: wData.warrantyProvider,
    warrantyType: wData.warrantyType || 'PRODUCT',
    startDate: wData.startDate,
    endDate: wData.endDate,
    coverageSummary: wData.coverageSummary || 'ضمانت استاندارد قطعه',
    claimProcedure: wData.claimProcedure,
    documentId: wData.documentId,
    status: calculatedStatus
  });

  res.status(201).json(warranty);
});

// GET /api/warranties/:id
assetRouter.get('/warranties/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const warranty = findWarrantyById(id);
  if (!warranty) return res.status(404).json({ error: 'Warranty not found' });

  if (warranty.assetId) {
    const asset = assetRepository.getAssetById(warranty.assetId);
    if (asset && asset.projectId) {
      const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
      if (!access.allowed) {
        return res.status(access.status || 403).json({ error: access.error });
      }
    }
  }

  res.json({
    ...warranty,
    status: calculateWarrantyStatus(warranty.startDate, warranty.endDate)
  });
});

// PATCH /api/warranties/:id
assetRouter.patch('/warranties/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const warranty = findWarrantyById(id);
  if (!warranty) return res.status(404).json({ error: 'Warranty not found' });

  if (warranty.assetId) {
    const asset = assetRepository.getAssetById(warranty.assetId);
    if (asset && asset.projectId) {
      const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
      if (!access.allowed) {
        return res.status(access.status || 403).json({ error: access.error });
      }
    }
  }

  const { id: _id, assetId: _aId, ...safeUpdates } = req.body;
  if (safeUpdates.startDate || safeUpdates.endDate) {
    safeUpdates.status = calculateWarrantyStatus(
      safeUpdates.startDate || warranty.startDate,
      safeUpdates.endDate || warranty.endDate
    );
  }

  const updated = assetRepository.updateEquipmentWarranty(warranty.id, safeUpdates);
  res.json(updated);
});

// ==========================================
// 6. ASSET PASSPORT & PERFORMANCE BASELINE
// ==========================================

// GET /api/assets/:id/passport-snapshots
assetRouter.get('/assets/:id/passport-snapshots', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const snapshots = assetRepository.getAssetPassportSnapshots(asset.id);
  res.json(snapshots);
});

// POST /api/assets/:id/passport-snapshots -> Create immutable versioned passport snapshot
assetRouter.post('/assets/:id/passport-snapshots', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  let project: any = null;
  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
    project = access.project;
  }

  const existingSnapshots = assetRepository.getAssetPassportSnapshots(asset.id);
  const nextVersion = existingSnapshots.length + 1;

  const components = assetRepository.getAssetComponents(asset.id);
  const warranties = assetRepository.getEquipmentWarranties(asset.id);
  const baselines = assetRepository.getAssetPerformanceBaselines(asset.id);
  const commRecords = asset.projectId ? assetRepository.getCommissioningRecords(asset.projectId) : [];
  const handover = asset.projectId ? assetRepository.getProjectHandover(asset.projectId) : null;

  const snapshotData = {
    assetId: asset.id,
    assetCode: asset.assetCode,
    name: asset.name,
    projectCode: project?.projectCode || null,
    location: asset.location,
    installedCapacityKw: asset.installedCapacityKw,
    technology: asset.technology,
    commissioningDate: asset.commissioningDate,
    commercialOperationDate: asset.commercialOperationDate,
    status: asset.status,
    componentsCount: components.length,
    components: components.map(c => ({
      id: c.id,
      type: c.componentType,
      manufacturer: c.manufacturer,
      model: c.model,
      serialNumber: c.serialNumber || null,
      quantity: c.quantity,
      status: c.status
    })),
    warrantiesCount: warranties.length,
    warranties: warranties.map(w => ({
      provider: w.warrantyProvider,
      type: w.warrantyType,
      startDate: w.startDate,
      endDate: w.endDate,
      status: calculateWarrantyStatus(w.startDate, w.endDate)
    })),
    performanceBaseline: baselines.length > 0 ? baselines[baselines.length - 1] : null,
    commissioningRecordStatus: commRecords.length > 0 ? commRecords[0].status : null,
    handoverStatus: handover ? handover.status : null,
    snapshotGeneratedAt: new Date().toISOString()
  };

  const newSnapshot = assetRepository.createAssetPassportSnapshot({
    assetId: asset.id,
    version: nextVersion,
    snapshot: snapshotData,
    generatedBy: req.user.id,
    reason: req.body.reason || 'MANUAL_SNAPSHOT_CREATION'
  });

  if (asset.projectId) {
    logActivity(asset.projectId, req.user.id, 'ASSET_PASSPORT_SNAPSHOT_GENERATED', 'AssetPassportSnapshot', newSnapshot.id, {
      version: nextVersion
    });
  }

  res.status(201).json(newSnapshot);
});

// GET /api/assets/:id/performance-baselines
assetRouter.get('/assets/:id/performance-baselines', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const baselines = assetRepository.getAssetPerformanceBaselines(asset.id);
  res.json(baselines);
});

// POST /api/assets/:id/performance-baselines -> Deterministic baseline creation
assetRouter.post('/assets/:id/performance-baselines', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const asset = assetRepository.getAssetById(id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (asset.projectId) {
    const access = checkProjectAccess(asset.projectId, req.user?.id, req.user?.role);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }
  }

  const capacityKw = asset.installedCapacityKw || (asset as any).capacityKw;
  if (!capacityKw || capacityKw <= 0) {
    return res.status(400).json({
      error: 'INSUFFICIENT_DATA',
      message: 'ظرفیت معتبر برای دارایی انرژی یافت نشد (INSUFFICIENT_DATA).'
    });
  }

  const specificYield = 1650; // kWh/kWp standard
  const annualGenerationKwh = Math.round(capacityKw * specificYield);
  const monthlyGenerationKwh = Math.round(annualGenerationKwh / 12);

  const existingBaselines = assetRepository.getAssetPerformanceBaselines(asset.id);
  const nextVersion = existingBaselines.length + 1;

  const baseline = assetRepository.createAssetPerformanceBaseline({
    assetId: asset.id,
    annualGenerationKwh,
    monthlyGenerationKwh,
    performanceRatioPercent: req.body.performanceRatioPercent || 81.5,
    availabilityPercent: req.body.availabilityPercent || 99.0,
    degradationPercent: req.body.degradationPercent || 0.5,
    source: 'ENGINEERING_CALCULATION',
    version: nextVersion
  });

  res.status(201).json(baseline);
});

export default assetRouter;
