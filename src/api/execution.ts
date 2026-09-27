import express from 'express';
import { executionRepository } from '../repositories/executionRepository.js';
import { ProjectContract, ProjectMilestone, ChangeRequest, ProjectBaseline, ContractParty, ContractRevision } from '../types/execution.js';
import { rfqRepository } from '../repositories/rfqRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { verifyAuthToken } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { ProjectMemberRole } from '../types/project.js';

const router = express.Router({ mergeParams: true });

// Enforce authentication on all execution routes
router.use(verifyAuthToken);

// Project authorization middleware
function requireProjectAccess(allowedMemberRoles?: ProjectMemberRole[], requireOwnerOrAdmin: boolean = false) {
  return (req: any, res: any, next: any) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'احراز هویت انجام نشده است (Unauthorized)' });
    }

    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ error: 'شناسه پروژه الزامی است' });
    }

    const access = checkProjectAccess(projectId, user.id, user.role, allowedMemberRoles);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    if (requireOwnerOrAdmin && !access.isOwner && user.role !== 'admin') {
      return res.status(403).json({ error: 'تنها مالک پروژه یا مدیر سامانه مجاز به انجام این عملیات است' });
    }

    req.project = access.project;
    req.projectAccess = access;
    next();
  };
}

// IDOR prevention helper for Contract
function getAuthorizedContract(projectId: string, contractId: string) {
  const contract = executionRepository.getContractById(contractId);
  if (!contract || contract.projectId !== projectId) {
    return null;
  }
  return contract;
}

// IDOR prevention helper for Milestone
function getAuthorizedMilestone(projectId: string, milestoneId: string) {
  const milestone = executionRepository.getMilestoneById(milestoneId);
  if (!milestone || milestone.projectId !== projectId) {
    return null;
  }
  return milestone;
}

// IDOR prevention helper for Baseline
function getAuthorizedBaseline(projectId: string, baselineId: string) {
  const baseline = executionRepository.getProjectBaselineById(baselineId);
  if (!baseline || baseline.projectId !== projectId) {
    return null;
  }
  return baseline;
}

// IDOR prevention helper for Change Request
function getAuthorizedChangeRequest(projectId: string, crId: string) {
  const cr = executionRepository.getChangeRequestById(crId);
  if (!cr || cr.projectId !== projectId) {
    return null;
  }
  return cr;
}

// IDOR prevention helper for Approval Request
function getAuthorizedApprovalRequest(projectId: string, approvalId: string) {
  const approval = executionRepository.getApprovalRequestById(approvalId);
  if (!approval || approval.projectId !== projectId) {
    return null;
  }
  return approval;
}

// ==========================================
// CONTRACTS
// ==========================================

// GET /api/execution/:projectId/contracts
router.get('/:projectId/contracts', requireProjectAccess(), (req, res) => {
  const { projectId } = req.params;
  const contracts = executionRepository.getProjectContracts(projectId);
  res.json(contracts);
});

// POST /api/execution/:projectId/contracts (manual creation - Owner/Admin only)
router.post('/:projectId/contracts', requireProjectAccess(undefined, true), (req: any, res) => {
  const { projectId } = req.params;
  const contractData = req.body;
  const allContracts = executionRepository.getEnergyProjects().flatMap((p: any) => executionRepository.getProjectContracts(p.id)) || [];
  const seqNumber = allContracts.length + 1;
  const contractCode = contractData.contractCode || `CNT-HSE-${seqNumber.toString().padStart(6, '0')}`;

  const newContract = executionRepository.createContract({
    ...contractData,
    contractCode,
    projectId,
    status: contractData.status || 'DRAFT',
    currentRevisionNumber: 1,
    createdByUserId: req.user?.id || req.body.createdByUserId
  });
  
  res.status(201).json(newContract);
});

// POST /api/execution/:projectId/contracts/from-bid/:bidId (Owner/Admin only)
router.post('/:projectId/contracts/from-bid/:bidId', requireProjectAccess(undefined, true), (req: any, res) => {
  const { projectId, bidId } = req.params;
  const project = req.project;

  const bid = rfqRepository.getBidById(bidId);
  if (!bid) return res.status(404).json({ error: 'پیشنهاد EPC یافت نشد' });

  // Cross-project IDOR check: bid must belong to this project
  if (bid.projectId && bid.projectId !== projectId) {
    return res.status(403).json({ error: 'پیشنهاد مورد نظر متعلق به این پروژه نیست' });
  }

  const org = executionRepository.getOrganizationById?.(bid.epcOrganizationId);
  const contractorName = org?.tradeName || org?.legalName || 'پیمانکار منتخب EPC';

  // Strict Duration Rule: Never invent 16-week fallback
  const rawWeeks = bid.commercialTerms?.executionDurationWeeks;
  const hasValidDuration = typeof rawWeeks === 'number' && Number.isFinite(rawWeeks) && rawWeeks > 0;

  const plannedWeeks = hasValidDuration ? rawWeeks : undefined;
  const startDate = hasValidDuration ? new Date() : undefined;
  const completionDate = hasValidDuration && startDate ? new Date(startDate.getTime() + (plannedWeeks as number) * 7 * 24 * 60 * 60 * 1000) : undefined;

  const plannedStartDate = startDate ? startDate.toISOString().split('T')[0] : undefined;
  const plannedCompletionDate = completionDate ? completionDate.toISOString().split('T')[0] : undefined;
  const scheduleStatus = hasValidDuration ? 'CONFIRMED' : 'INSUFFICIENT_DATA';

  // Derive stable business contract code: CNT-HSE-000001
  const allContracts = executionRepository.getEnergyProjects().flatMap((p: any) => executionRepository.getProjectContracts(p.id)) || [];
  const seqNumber = allContracts.length + 1;
  const contractCode = `CNT-HSE-${seqNumber.toString().padStart(6, '0')}`;

  // Check which terms actually exist in the EPC bid
  const hasBidAdvance = typeof bid.commercialTerms?.advancePaymentPercent === 'number';
  const hasBidRetention = typeof bid.commercialTerms?.retentionPercent === 'number';
  const hasBidWarranty = typeof bid.commercialTerms?.warrantyPeriodMonths === 'number';
  const hasBidLD = typeof bid.commercialTerms?.liquidatedDamagesPerDayPercent === 'number';
  const hasBidPaymentTerms = Boolean(bid.commercialTerms?.paymentTermsSummary || bid.commercialTerms?.paymentTerms);

  // If not all terms are explicit in bid, mark as template terms requiring confirmation
  const isTemplateTerms = !(hasBidAdvance && hasBidRetention && hasBidWarranty && hasBidPaymentTerms && hasValidDuration);

  const advancePaymentPercent = hasBidAdvance ? bid.commercialTerms.advancePaymentPercent : undefined;
  const retentionPercent = hasBidRetention ? bid.commercialTerms.retentionPercent : undefined;
  const warrantyPeriodMonths = hasBidWarranty ? bid.commercialTerms.warrantyPeriodMonths : undefined;
  const liquidatedDamagesPerDayPercent = hasBidLD ? bid.commercialTerms.liquidatedDamagesPerDayPercent : undefined;
  const maxLiquidatedDamagesPercent = typeof bid.commercialTerms?.maxLiquidatedDamagesPercent === 'number' ? bid.commercialTerms.maxLiquidatedDamagesPercent : undefined;

  const paymentTermsSummary = hasBidPaymentTerms 
    ? (bid.commercialTerms.paymentTermsSummary || bid.commercialTerms.paymentTerms)
    : 'الگوی پیشنهادی شرایط پرداخت: پیش‌پرداخت (نیازمند تایید)، پیشرفت کار و تحویل تجهیزات، اتصال به شبکه و حسن انجام کار (در انتظار تایید کارفرما).';

  // 1. Create the contract
  const newContract = executionRepository.createContract({
    projectId,
    contractCode,
    title: `قرارداد جامع احداث نیروگاه خورشیدی (EPC) - مجری: ${contractorName}`,
    contractType: 'EPC',
    status: 'DRAFT',
    currency: bid.currency || 'IRR',
    contractValue: bid.totalPrice,
    revisedContractValue: bid.totalPrice,
    currentRevisionNumber: 1,
    scopeSummary: `احداث، مهندسی، تأمین تجهیزات استاندارد (پنل و اینورتر مطابق پیشنهاد ${bid.bidCode})، نصب، کابل‌کشی، حفاظت، اتصال به شبکه و راه‌اندازی تجاری نیروگاه خورشیدی.`,
    paymentTermsSummary,
    retentionPercent,
    advancePaymentPercent,
    liquidatedDamagesPerDayPercent,
    maxLiquidatedDamagesPercent,
    warrantyPeriodMonths,
    contractorPartyId: bid.epcOrganizationId,
    plannedStartDate,
    plannedCompletionDate,
    scheduleStatus,
    isTemplateTerms,
    termsConfirmedByUser: !isTemplateTerms,
    createdByUserId: req.user?.id || project.ownerId
  });

  // 2. Create Contract Parties (Client & EPC Contractor)
  executionRepository.createContractParty({
    contractId: newContract.id,
    partyType: 'CLIENT',
    organizationId: project.ownerId,
    legalName: 'کارفرمای پروژه انرژی',
    representativeName: 'مدیر پروژه',
    signStatus: 'PENDING'
  });

  executionRepository.createContractParty({
    contractId: newContract.id,
    partyType: 'CONTRACTOR',
    organizationId: bid.epcOrganizationId,
    legalName: contractorName,
    representativeName: org?.contactPerson || 'مدیرعامل شرکت EPC',
    signStatus: 'PENDING'
  });

  // 3. Create Milestone Structure (Marked clearly as SUGGESTED_TEMPLATE)
  const milestonesTemplate = [
    { title: 'مهندسی، طراحی تفصیلی و نقشه‌های اجرایی', category: 'ENGINEERING', sequence: 1, weightPercent: 10, durationFactor: 0.15 },
    { title: 'تأمین، ترخیص و حمل پنل‌ها و اینورترها به کارگاه', category: 'PROCUREMENT', sequence: 2, weightPercent: 45, durationFactor: 0.40 },
    { title: 'عملیات عمرانی، کوبش پایه‌ها و فونداسیون اینورتر', category: 'CIVIL_WORKS', sequence: 3, weightPercent: 15, durationFactor: 0.20 },
    { title: 'نصب مکانیکی استراکچرها و ماژول‌ها و کابل‌کشی DC/AC', category: 'INSTALLATION', sequence: 4, weightPercent: 15, durationFactor: 0.15 },
    { title: 'تست‌های پیش‌راه‌اندازی، اتصال به شبکه و آزمون ۷۲ ساعته', category: 'COMMISSIONING', sequence: 5, weightPercent: 15, durationFactor: 0.10 }
  ];

  let cumulativeOffsetDays = 0;
  milestonesTemplate.forEach((t) => {
    let pStart: string | undefined = undefined;
    let pEnd: string | undefined = undefined;

    if (hasValidDuration && startDate && plannedWeeks) {
      const durationTotalDays = (plannedWeeks as number) * 7;
      const stageDurationDays = Math.max(7, Math.round(durationTotalDays * t.durationFactor));
      pStart = new Date(startDate.getTime() + cumulativeOffsetDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      cumulativeOffsetDays += stageDurationDays;
      pEnd = new Date(startDate.getTime() + cumulativeOffsetDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    executionRepository.createMilestone({
      projectId,
      contractId: newContract.id,
      milestoneCode: `MS-0${t.sequence}`,
      title: t.title,
      category: t.category,
      sequence: t.sequence,
      weightPercent: t.weightPercent,
      completionPercent: 0,
      status: 'NOT_STARTED',
      plannedStartDate: pStart,
      plannedEndDate: pEnd,
      requiresApproval: true,
      evidenceRequired: true,
      isTemplate: true,
      templateNotice: hasValidDuration
        ? 'SUGGESTED_TEMPLATE — ساختار پیشنهادی زمان‌بندی و اوزان (نیازمند تایید صریح طرفین قبل از تصویب خط مبنا)'
        : 'SUGGESTED_TEMPLATE — ساختار پیشنهادی فاقد تاریخ به دلیل عدم درج مدت اجرا در پیشنهاد EPC (نیازمند تعیین و تایید صریح)'
    });
  });

  // 4. Create Initial Project Baseline in DRAFT status (NOT automatically approved!)
  executionRepository.createProjectBaseline({
    projectId,
    contractId: newContract.id,
    baselineCode: `BL-HSE-${seqNumber.toString().padStart(4, '0')}`,
    name: 'خط مبنای اولیه زمان‌بندی و هزینه قرارداد EPC (Baseline V1 - پیش‌نویس)',
    status: 'DRAFT',
    contractValue: bid.totalPrice,
    currency: bid.currency || 'IRR',
    plannedStartDate,
    plannedCompletionDate,
    approvedByUserId: undefined,
    approvedAt: undefined
  });

  res.status(201).json({
    contract: newContract,
    message: hasValidDuration
      ? 'پیش‌نویس قرارداد EPC با موفقیت از پیشنهاد برنده ایجاد شد. شرایط نیازمند تایید و خط مبنا در وضعیت پیش‌نویس قرار دارد.'
      : 'پیش‌نویس قرارداد EPC ایجاد شد. مدت زمان اجرا در پیشنهاد مشخص نشده است و باید به طور صریح توسط طرفین تعیین گردد.'
  });
});

// PATCH /api/execution/:projectId/contracts/:contractId
router.patch('/:projectId/contracts/:contractId', requireProjectAccess(['OWNER', 'EPC'], false), (req, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const updated = executionRepository.updateContract(contractId, req.body);
  res.json(updated);
});

// POST /api/execution/:projectId/contracts/:contractId/confirm-terms
router.post('/:projectId/contracts/:contractId/confirm-terms', requireProjectAccess(['OWNER', 'EPC'], false), (req, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const updated = executionRepository.updateContract(contractId, {
    ...req.body,
    isTemplateTerms: false,
    termsConfirmedByUser: true,
    status: req.body.status || 'UNDER_REVIEW'
  });
  res.json(updated);
});

// ==========================================
// EXTERNAL CONTRACT SIGNING WORKFLOW
// (Hooshyar Energy is NOT an electronic signature provider)
// Workflow: DRAFT -> UNDER_REVIEW -> READY_TO_SIGN -> External Signing -> Upload -> Confirmation -> ACTIVE
// ==========================================

// Mark Contract Ready to Sign (Owner / Admin only)
router.post('/:projectId/contracts/:contractId/ready-to-sign', requireProjectAccess(undefined, true), (req: any, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const updated = executionRepository.updateContract(contractId, {
    status: 'READY_TO_SIGN'
  });

  projectRepository.addActivity({
    projectId,
    actorUserId: req.user.id,
    eventType: 'CONTRACT_MARKED_READY_TO_SIGN',
    entityType: 'CONTRACT',
    entityId: contractId,
    metadata: { contractCode: contract.contractCode }
  });

  res.json({
    contract: updated,
    message: 'وضعیت قرارداد به «آماده امضای خارج سامانه» تغییر یافت. طرفین می‌توانند نسخه چاپی را با مهر و امضای رسمی حقوقی مبادله و امضا نمایند.'
  });
});

// Register uploaded externally signed document (Owner, Admin, or EPC)
router.post('/:projectId/contracts/:contractId/upload-signed-document', requireProjectAccess(['OWNER', 'EPC'], false), (req: any, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const { documentId, fileUrl } = req.body;
  let finalDocId = documentId;

  // If a fileUrl was supplied without existing documentId, register a ProjectDocument
  if (!finalDocId && fileUrl) {
    const doc = projectRepository.addDocument({
      projectId,
      uploadedByUserId: req.user.id,
      type: 'CONTRACT',
      fileUrl,
      version: 1,
      verificationStatus: 'PENDING'
    });
    finalDocId = doc.id;
  }

  if (!finalDocId) {
    return res.status(400).json({ error: 'شناسه یا آدرس فایل نسخه امضا شده فیزیکی/خارجی الزامی است' });
  }

  const updated = executionRepository.updateContract(contractId, {
    signedDocumentId: finalDocId,
    signedDocumentUploadedAt: new Date().toISOString()
  });

  projectRepository.addActivity({
    projectId,
    actorUserId: req.user.id,
    eventType: 'SIGNED_CONTRACT_DOCUMENT_UPLOADED',
    entityType: 'CONTRACT',
    entityId: contractId,
    metadata: { signedDocumentId: finalDocId }
  });

  res.json({
    contract: updated,
    message: 'نسخه امضا شده فیزیکی با موفقیت بارگذاری شد و در انتظار تایید نهایی کارفرما/مدیر است.'
  });
});

// Authorized user confirms signed external document -> activates contract (Owner / Admin only)
router.post('/:projectId/contracts/:contractId/confirm-signed-document', requireProjectAccess(undefined, true), (req: any, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const documentId = req.body.documentId || contract.signedDocumentId;
  if (!documentId) {
    return res.status(400).json({ error: 'ابتدا باید سند نسخه امضا شده فیزیکی بارگذاری شود' });
  }

  const now = new Date().toISOString();
  const effectiveDate = req.body.effectiveDate || now.split('T')[0];

  // Update Contract
  const updatedContract = executionRepository.updateContract(contractId, {
    status: 'ACTIVE',
    signedDocumentId: documentId,
    signedConfirmedByUserId: req.user.id,
    signedConfirmedAt: now,
    signedAt: now,
    effectiveDate
  });

  // Mark all parties as confirmed/signed based on verified external document
  const parties = executionRepository.getContractParties(contractId);
  parties.forEach((p: any) => {
    executionRepository.updateContractParty(p.id, {
      signStatus: 'SIGNED',
      signedAt: now,
      verificationStatus: 'EXTERNALLY_VERIFIED'
    });
  });

  // Verify associated document if present
  const docs = projectRepository.getDocuments(projectId);
  const doc = docs.find(d => d.id === documentId);
  if (doc) {
    (doc as any).verificationStatus = 'VERIFIED';
  }

  projectRepository.addActivity({
    projectId,
    actorUserId: req.user.id,
    eventType: 'CONTRACT_ACTIVATED_EXTERNAL_SIGNATURE_CONFIRMED',
    entityType: 'CONTRACT',
    entityId: contractId,
    metadata: {
      contractCode: contract.contractCode,
      confirmedByUserId: req.user.id,
      documentId
    }
  });

  res.json({
    contract: updatedContract,
    message: 'صحت امضا و مهر نسخه فیزیکی تایید شد و قرارداد با موفقیت فعال گردید (بدون ادعای گواهی الکترونیک دیجیتال درون‌سامانه‌ای).'
  });
});

// Refactored legacy party sign endpoint: Disallow internal automated "e-signature"
router.post('/:projectId/contracts/:contractId/parties/:partyId/sign', (req, res) => {
  res.status(400).json({
    error: 'امضای مستقیم درون‌سامانه‌ای غیرفعال است. سامانه هوشیار انرژی ارائه‌دهنده امضای الکترونیک دیجیتال حقوقی نیست. قراردادها باید خارج از سامانه به صورت رسمی امضا و مبادله شوند و نسخه اسکن‌شده بارگذاری و توسط کارفرما تایید گردد.'
  });
});

// Contract Parties
router.get('/:projectId/contracts/:contractId/parties', requireProjectAccess(), (req, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const parties = executionRepository.getContractParties(contractId);
  res.json(parties);
});

router.post('/:projectId/contracts/:contractId/parties', requireProjectAccess(undefined, true), (req, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const party = executionRepository.createContractParty({
    ...req.body,
    contractId
  });
  res.status(201).json(party);
});

// Contract Revisions (Read-only for clients)
router.get('/:projectId/contracts/:contractId/revisions', requireProjectAccess(), (req, res) => {
  const { contractId, projectId } = req.params;
  const contract = getAuthorizedContract(projectId, contractId);
  if (!contract) return res.status(404).json({ error: 'قرارداد متعلق به این پروژه یافت نشد' });

  const revisions = executionRepository.getContractRevisions(contractId);
  res.json(revisions);
});

// ==========================================
// CHANGE REQUESTS (دستور تغییر کار / کلیم)
// ==========================================

router.get('/:projectId/change-requests', requireProjectAccess(), (req, res) => {
  const { projectId } = req.params;
  const list = executionRepository.getChangeRequestsByProjectId(projectId);
  res.json(list);
});

router.post('/:projectId/change-requests', requireProjectAccess(['OWNER', 'EPC', 'CONSULTANT'], false), (req: any, res) => {
  const { projectId } = req.params;
  const { contractId } = req.body;

  if (contractId) {
    const contract = getAuthorizedContract(projectId, contractId);
    if (!contract) return res.status(404).json({ error: 'قرارداد ارجاع‌شده متعلق به این پروژه نیست' });
  }

  const cr = executionRepository.createChangeRequest({
    ...req.body,
    projectId,
    requestedByUserId: req.user?.id || req.body.requestedByUserId,
    status: 'SUBMITTED'
  });
  res.status(201).json(cr);
});

router.patch('/:projectId/change-requests/:crId', requireProjectAccess(['OWNER', 'EPC', 'CONSULTANT'], false), (req: any, res) => {
  const { crId, projectId } = req.params;
  const existingCR = getAuthorizedChangeRequest(projectId, crId);
  if (!existingCR) return res.status(404).json({ error: 'دستور تغییر کار متعلق به این پروژه یافت نشد' });

  // Only Owner, Admin, or CONSULTANT can approve change requests
  if (req.body.status === 'APPROVED') {
    const access = req.projectAccess;
    const isOwnerOrAdmin = access?.isOwner || req.user?.role === 'admin';
    const isConsultant = access?.member?.role === 'CONSULTANT';
    if (!isOwnerOrAdmin && !isConsultant) {
      return res.status(403).json({ error: 'تنها کارفرما، مدیر یا مشاور ناظر مجاز به تایید دستور تغییر کار هستند' });
    }
  }

  const updated = executionRepository.updateChangeRequest(crId, req.body);
  if (!updated) return res.status(404).json({ error: 'دستور تغییر کار یافت نشد' });

  // Immutability Rule: If approved, create ContractRevision. Original contractValue is NEVER overwritten!
  if (updated.status === 'APPROVED' && updated.contractId) {
    const contract = executionRepository.getContractById(updated.contractId);
    if (contract && contract.projectId === projectId) {
      const nextRevNum = (contract.currentRevisionNumber || 1) + 1;
      const currentVal = contract.revisedContractValue !== undefined ? contract.revisedContractValue : contract.contractValue;
      const impact = updated.costImpactAmount || updated.costImpact || 0;
      const newVal = currentVal + impact;

      const rev = executionRepository.createContractRevision({
        contractId: contract.id,
        projectId,
        revisionNumber: nextRevNum,
        changeRequestId: updated.id,
        reason: updated.reasonCategory || updated.title,
        changesSummary: updated.description || `تایید دستور تغییر کار ${updated.crCode || updated.title}`,
        contractValueBefore: currentVal,
        contractValueAfter: newVal,
        scheduleImpactDays: updated.scheduleImpactDays || 0,
        approvedByUserId: updated.approvedByUserId || req.user?.id || 'supervisor',
        approvedAt: updated.approvedAt || new Date().toISOString()
      });

      // Update revised value on contract record without mutating original baseline contractValue
      executionRepository.updateContract(contract.id, {
        revisedContractValue: newVal,
        currentRevisionNumber: nextRevNum
      });

      executionRepository.updateChangeRequest(updated.id, { revisionId: rev.id });

      // Baseline Revision: If active baseline exists, supersede it and create updated approved baseline revision
      const activeBaseline = executionRepository.getProjectBaseline(projectId);
      if (activeBaseline && activeBaseline.status === 'APPROVED') {
        executionRepository.updateProjectBaseline(activeBaseline.id, { status: 'SUPERSEDED', supersededAt: new Date().toISOString() });
        executionRepository.createProjectBaseline({
          projectId,
          contractId: contract.id,
          baselineCode: `BL-REV-0${nextRevNum}`,
          name: `خط مبنای بازنگری شده (پیرو دستور تغییر ${updated.crCode || ''})`,
          status: 'APPROVED',
          contractValue: newVal,
          currency: contract.currency || 'IRR',
          plannedCompletionDate: activeBaseline.plannedCompletionDate,
          approvedByUserId: updated.approvedByUserId || req.user?.id || 'supervisor',
          approvedAt: new Date().toISOString()
        });
      }
    }
  }

  res.json(updated);
});

// ==========================================
// PROJECT BASELINES
// ==========================================

router.get('/:projectId/baseline', requireProjectAccess(), (req, res) => {
  const { projectId } = req.params;
  const baseline = executionRepository.getProjectBaseline(projectId);
  res.json(baseline);
});

router.get('/:projectId/baselines', requireProjectAccess(), (req, res) => {
  const { projectId } = req.params;
  const baselines = executionRepository.getProjectBaselines(projectId);
  res.json(baselines);
});

router.post('/:projectId/baseline', requireProjectAccess(['OWNER', 'EPC', 'CONSULTANT'], false), (req, res) => {
  const { projectId } = req.params;
  const { contractId } = req.body;

  if (contractId) {
    const contract = getAuthorizedContract(projectId, contractId);
    if (!contract) return res.status(404).json({ error: 'قرارداد ارجاع‌شده متعلق به این پروژه نیست' });
  }

  const baseline = executionRepository.createProjectBaseline({
    ...req.body,
    projectId,
    status: req.body.status || 'DRAFT'
  });
  res.status(201).json(baseline);
});

// Approve Baseline: Owner, Admin, or CONSULTANT only
router.post('/:projectId/baseline/:baselineId/approve', requireProjectAccess(['OWNER', 'CONSULTANT'], false), (req: any, res) => {
  const { baselineId, projectId } = req.params;
  const baseline = getAuthorizedBaseline(projectId, baselineId);
  if (!baseline) return res.status(404).json({ error: 'خط مبنای متعلق به این پروژه یافت نشد' });

  const userId = req.user?.id || 'supervisor';

  // Mark any previously approved baseline as SUPERSEDED
  const allBaselines = executionRepository.getProjectBaselines(projectId);
  allBaselines.forEach((b: any) => {
    if (b.id !== baselineId && b.status === 'APPROVED') {
      executionRepository.updateProjectBaseline(b.id, { status: 'SUPERSEDED', supersededAt: new Date().toISOString() });
    }
  });

  const updated = executionRepository.updateProjectBaseline(baselineId, {
    status: 'APPROVED',
    approvedByUserId: userId,
    approvedAt: new Date().toISOString()
  });

  res.json(updated);
});

// ==========================================
// MILESTONES
// ==========================================

router.get('/:projectId/milestones', requireProjectAccess(), (req, res) => {
  const { projectId } = req.params;
  const milestones = executionRepository.getProjectMilestones(projectId);
  res.json(milestones);
});

router.post('/:projectId/milestones', requireProjectAccess(['OWNER', 'EPC', 'CONSULTANT'], false), (req, res) => {
  const { projectId } = req.params;
  const { contractId } = req.body;

  if (contractId) {
    const contract = getAuthorizedContract(projectId, contractId);
    if (!contract) return res.status(404).json({ error: 'قرارداد ارجاع‌شده متعلق به این پروژه نیست' });
  }

  const milestone = executionRepository.createMilestone({
    ...req.body,
    projectId,
    status: req.body.status || 'NOT_STARTED',
    completionPercent: req.body.completionPercent || 0
  });
  res.status(201).json(milestone);
});

router.patch('/:projectId/milestones/:milestoneId', requireProjectAccess(['OWNER', 'EPC', 'CONSULTANT'], false), (req, res) => {
  const { milestoneId, projectId } = req.params;
  const milestone = getAuthorizedMilestone(projectId, milestoneId);
  if (!milestone) return res.status(404).json({ error: 'مایلستون متعلق به این پروژه یافت نشد' });

  const updated = executionRepository.updateMilestone(milestoneId, req.body);
  res.json(updated);
});

router.delete('/:projectId/milestones/:milestoneId', requireProjectAccess(undefined, true), (req, res) => {
  const { milestoneId, projectId } = req.params;
  const milestone = getAuthorizedMilestone(projectId, milestoneId);
  if (!milestone) return res.status(404).json({ error: 'مایلستون متعلق به این پروژه یافت نشد' });

  executionRepository.deleteMilestone(milestoneId);
  res.json({ success: true, message: 'مایلستون با موفقیت حذف شد' });
});

// ==========================================
// APPROVALS
// ==========================================

router.get('/:projectId/approvals', requireProjectAccess(), (req, res) => {
  const { projectId } = req.params;
  const approvals = executionRepository.getApprovalRequests(projectId);
  res.json(approvals);
});

router.post('/:projectId/approvals', requireProjectAccess(['OWNER', 'EPC', 'CONSULTANT'], false), (req: any, res) => {
  const { projectId } = req.params;
  const reqData = req.body;
  const newApproval = executionRepository.createApprovalRequest({
    ...reqData,
    projectId,
    requestedByUserId: req.user?.id || reqData.requestedByUserId,
    status: 'PENDING'
  });
  res.status(201).json(newApproval);
});

router.patch('/:projectId/approvals/:approvalId', requireProjectAccess(['OWNER', 'CONSULTANT'], false), (req: any, res) => {
  const { approvalId, projectId } = req.params;
  const approval = getAuthorizedApprovalRequest(projectId, approvalId);
  if (!approval) return res.status(404).json({ error: 'درخواست تایید متعلق به این پروژه یافت نشد' });

  // Only Owner, Admin, or CONSULTANT can approve/reject
  const access = req.projectAccess;
  const isOwnerOrAdmin = access?.isOwner || req.user?.role === 'admin';
  const isConsultant = access?.member?.role === 'CONSULTANT';
  if (!isOwnerOrAdmin && !isConsultant) {
    return res.status(403).json({ error: 'تنها کارفرما، مدیر سامانه یا مشاور ناظر مجاز به ثبت پاسخ تایید هستند' });
  }

  const updated = executionRepository.updateApprovalRequest(approvalId, {
    ...req.body,
    approverUserId: req.user?.id || req.body.approverUserId,
    respondedAt: new Date().toISOString()
  });
  if (!updated) return res.status(404).json({ error: 'درخواست تایید یافت نشد' });
  
  // If it's a milestone approval and approved, update the milestone
  if (updated.status === 'APPROVED' && updated.entityType === 'MILESTONE') {
    const ms = getAuthorizedMilestone(projectId, updated.entityId);
    if (ms) {
      executionRepository.updateMilestone(updated.entityId, { status: 'COMPLETED', completionPercent: 100 });
    }
  } else if (updated.status === 'REJECTED' && updated.entityType === 'MILESTONE') {
    const ms = getAuthorizedMilestone(projectId, updated.entityId);
    if (ms) {
      executionRepository.updateMilestone(updated.entityId, { status: 'NOT_STARTED' });
    }
  }

  res.json(updated);
});

export default router;
