import express from 'express';
import { verifyAuthToken } from './auth.js';
import { rfqRepository } from '../repositories/rfqRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { generateRFQCode, generateBidCode } from '../services/rfqCodeService.js';
import { compareBids, scoreBid } from '../services/rfqScoringService.js';
import { validateTransition } from '../services/projectLifecycleService.js';
import { userRepository } from '../repositories/userRepository.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { EPCBid, ProjectRFQ, RFQDocument, BidDocument, BidDocumentCategory } from '../types/rfq.js';
import { idempotencyMiddleware } from '../reliability/idempotency.js';
import { getFileStorageService } from '../storage/index.js';
import { validateBinaryFile, sanitizeOriginalFilename } from '../storage/fileValidator.js';
import { generateStorageKey } from '../storage/storageKeyGenerator.js';
import { handleMultipartUpload } from '../storage/uploadMiddleware.js';
import { FileValidationError } from '../storage/StorageErrors.js';

const router = express.Router();
router.use(verifyAuthToken);

// Helper to validate legacy document strings against dangerous executable schemes
function validateLegacyDocumentStrings(docs: any[]): { isValid: boolean; error?: string } {
  if (!Array.isArray(docs)) return { isValid: true };
  for (const item of docs) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    
    // Check if the string looks like a URI scheme or URL
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith('//');
    if (hasScheme) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return {
            isValid: false,
            error: 'تنها پروتکل‌های http و https برای لینک‌های اسناد مجاز هستند.'
          };
        }
      } catch {
        return {
          isValid: false,
          error: 'فرمت آدرس اینترنتی (URL) سند نامعتبر است.'
        };
      }
    }
  }
  return { isValid: true };
}

// Helper to check EPC organization for current user
function getUserOrganization(userId: string) {
  const orgs = organizationRepository.findAll?.() || [];
  // Find organization where user is owner or member, or check if user has company profile
  const user = userRepository.getUserById?.(userId);
  return orgs.find((o: any) => o.createdById === userId || o.adminUserIds?.includes(userId));
}

// 1. GET /api/rfq/project/:projectId
// Returns RFQs for this project. If EPC, filters bids to protect privacy.
router.get('/project/:projectId', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const project = projectRepository.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "پروژه یافت نشد" });

  const isOwner = project.ownerId === user.id || user.role === 'admin';
  const rfqs = rfqRepository.findRFQsByProjectId(project.id);

  if (isOwner) {
    return res.json(rfqs);
  }

  // Non-owner / EPC user: Only see OPEN / PUBLISHED RFQs
  const visibleRfqs = rfqs.filter(r => r.status !== 'DRAFT' && r.status !== 'CANCELLED');
  res.json(visibleRfqs);
});

// 1.5 GET /api/rfq/bids/my
// Returns all bids submitted by the current authenticated EPC contractor/user
router.get('/bids/my', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const userOrg = getUserOrganization(user.id);
  const orgId = userOrg?.id;

  // Find all bids where epcOrganizationId matches user organization OR submittedBy is user.id
  const allRfqs = rfqRepository.getAllRFQs();
  const allBids: EPCBid[] = [];
  
  for (const rfq of allRfqs) {
    const bids = rfqRepository.getBidsByRfqId(rfq.id);
    for (const b of bids) {
      if ((orgId && b.epcOrganizationId === orgId) || (b as any).submittedByUserId === user.id) {
        allBids.push(b);
      }
    }
  }

  res.json(allBids);
});

// 2. GET /api/rfq/opportunities/open
// For EPC Contractors to view RFQs open for bidding
router.get('/opportunities/open', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const allRfqs = rfqRepository.getAllRFQs();
  const openRfqs = allRfqs.filter(r => r.status === 'OPEN' || r.status === 'PUBLISHED');

  const userOrg = getUserOrganization(user.id);
  const orgId = userOrg?.id;

  const result = openRfqs.map(rfq => {
    const project = projectRepository.findById(rfq.projectId);
    const invitations = rfqRepository.getInvitations(rfq.id);
    const isInvited = orgId ? invitations.some(i => i.epcOrganizationId === orgId) : false;

    // Check if current EPC has already submitted a bid
    let myBid: EPCBid | undefined;
    if (orgId) {
      const bids = rfqRepository.getBidsByRfqId(rfq.id);
      myBid = bids.find(b => b.epcOrganizationId === orgId);
    }

    return {
      ...rfq,
      projectTitle: project?.title || 'پروژه انرژی',
      projectLocation: project?.location,
      targetCapacityKw: project?.targetCapacityKw,
      projectType: project?.projectType,
      isInvited,
      myBid: myBid ? { id: myBid.id, status: myBid.status, bidCode: myBid.bidCode, submittedAt: myBid.submittedAt } : null
    };
  });

  res.json(result);
});

// 3. GET /api/rfq/:rfqId
router.get('/:rfqId', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  const isOwner = project && (project.ownerId === user.id || user.role === 'admin');
  const userOrg = getUserOrganization(user.id);

  let invitations = [];
  if (isOwner) {
    invitations = rfqRepository.getInvitations(rfq.id);
  } else if (userOrg) {
    invitations = rfqRepository.getInvitations(rfq.id).filter(i => i.epcOrganizationId === userOrg.id);
  }

  res.json({
    ...rfq,
    project: project ? {
      id: project.id,
      title: project.title,
      projectCode: project.projectCode,
      status: project.status,
      targetCapacityKw: project.targetCapacityKw,
      location: project.location,
      site: project.site,
      energyRequirement: project.energyRequirement,
      estimatedBudgetIRR: project.estimatedBudgetIRR
    } : null,
    invitations
  });
});

// 4. POST /api/rfq/project/:projectId (Create RFQ)
router.post('/project/:projectId', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const project = projectRepository.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: "پروژه یافت نشد" });

  if (project.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: "تنها مالک پروژه مجاز به ایجاد استعلام است" });
  }

  const {
    title,
    description,
    scope,
    submissionDeadline,
    currency,
    visibility,
    technicalRequirements,
    commercialRequirements,
    requiredDocuments,
    status
  } = req.body;

  const rfqCode = generateRFQCode();

  const newRfq = rfqRepository.createRFQ({
    rfqCode,
    projectId: project.id,
    createdByUserId: user.id,
    status: status === 'OPEN' ? 'OPEN' : 'DRAFT',
    title: title || `استعلام مهندسی، تامین و ساخت (EPC) - ${project.title}`,
    description: description || `مناقصه/استعلام احداث سامانه خورشیدی با ظرفیت ${project.targetCapacityKw || 0} کیلووات`,
    scope: scope || 'طراحی تفصیلی مهندسی، تأمین تجهیزات (پنل، اینورتر، سازه، تابلوها)، نصب، تست و راه‌اندازی و اتصال به شبکه',
    submissionDeadline: submissionDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    currency: currency || 'IRR',
    visibility: visibility || 'VERIFIED_EPCS',
    technicalRequirements: technicalRequirements || [
      'استفاده از پنل‌های مونوکریستال هالف‌سل با راندمان حداقل ۲۰.۵٪',
      'اینورتر متصل به شبکه دارای تأییدیه توانیر/ساتبا',
      'سازه گالوانیزه گرم مقاوم در برابر باد تا ۱۲۰ کیلومتر بر ساعت',
      'تابلو برق مجهز به سیستم حفاظت صاعقه و سرج ارستر'
    ],
    commercialRequirements: commercialRequirements || [
      'حداقل ۵ سال ضمانت حسن انجام کار',
      'ارائه جدول زمان‌بندی شفاف (حداکثر ۹۰ روز)',
      'شرایط پرداخت متناسب با پیشرفت تحویل و نصب'
    ],
    requiredDocuments: requiredDocuments || [
      'رزومه و سوابق احداث پروژه‌های مشابه',
      'مشخصات فنی و دیتاشیت پنل و اینورتر پیشنهادی',
      'جدول تفکیک قیمت (آنالیز بها)',
      'پیش‌نویس شرایط و تضامین گارانتی'
    ],
    publishedAt: status === 'OPEN' ? new Date().toISOString() : undefined
  });

  // If created as OPEN, update project status to RFQ_OPEN if ready
  if (newRfq.status === 'OPEN') {
    if (project.status === 'FEASIBILITY' || project.status === 'READY_FOR_RFQ') {
      projectRepository.update(project.id, { status: 'RFQ_OPEN' });
    }
  } else if (project.status === 'FEASIBILITY') {
    projectRepository.update(project.id, { status: 'READY_FOR_RFQ' });
  }

  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    eventType: 'RFQ_CREATED',
    entityType: 'ProjectRFQ',
    entityId: newRfq.id,
    metadata: { rfqCode, title: newRfq.title, status: newRfq.status }
  });

  res.json(newRfq);
});

// 5. PUT /api/rfq/:rfqId
router.put('/:rfqId', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "دسترسی غیرمجاز" });
  }

  const updated = rfqRepository.updateRFQ(rfq.id, req.body);
  res.json(updated);
});

// 6. POST /api/rfq/:rfqId/publish
router.post('/:rfqId/publish', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها مالک پروژه مجاز به انتشار استعلام است" });
  }

  const updated = rfqRepository.updateRFQ(rfq.id, {
    status: 'OPEN',
    publishedAt: new Date().toISOString()
  });

  // Transition project status to RFQ_OPEN
  if (project.status === 'READY_FOR_RFQ' || project.status === 'FEASIBILITY') {
    const val = validateTransition(project.status, 'RFQ_OPEN');
    if (val.valid) {
      projectRepository.update(project.id, { status: 'RFQ_OPEN' });
    }
  }

  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    eventType: 'RFQ_PUBLISHED',
    entityType: 'ProjectRFQ',
    entityId: rfq.id,
    metadata: { rfqCode: rfq.rfqCode, publishedAt: new Date().toISOString() }
  });

  res.json(updated);
});

// 7. POST /api/rfq/:rfqId/close
router.post('/:rfqId/close', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها مالک پروژه مجاز به بستن استعلام است" });
  }

  const updated = rfqRepository.updateRFQ(rfq.id, {
    status: 'CLOSED',
    closedAt: new Date().toISOString()
  });

  const bids = rfqRepository.getBidsByRfqId(rfq.id);
  if (bids.length > 0 && project.status === 'RFQ_OPEN') {
    projectRepository.update(project.id, { status: 'BIDS_RECEIVED' });
  }

  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    eventType: 'RFQ_CLOSED',
    entityType: 'ProjectRFQ',
    entityId: rfq.id,
    metadata: { rfqCode: rfq.rfqCode, bidsCount: bids.length }
  });

  res.json(updated);
});

// 8. POST /api/rfq/:rfqId/invite
router.post('/:rfqId/invite', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها مالک پروژه مجاز به دعوت شرکت‌های پیمانکار است" });
  }

  const { epcOrganizationId } = req.body;
  if (!epcOrganizationId) {
    return res.status(400).json({ error: "شناسه شرکت پیمانکار (epcOrganizationId) الزامی است" });
  }

  const existingInvitations = rfqRepository.getInvitations(rfq.id);
  if (existingInvitations.some(i => i.epcOrganizationId === epcOrganizationId)) {
    return res.status(400).json({ error: "این شرکت قبلاً به این استعلام دعوت شده است" });
  }

  const newInv = rfqRepository.createInvitation({
    rfqId: rfq.id,
    epcOrganizationId,
    status: 'INVITED'
  });

  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    eventType: 'EPC_INVITED',
    entityType: 'RFQInvitation',
    entityId: newInv.id,
    metadata: { epcOrganizationId, rfqCode: rfq.rfqCode }
  });

  res.json(newInv);
});

// 9. GET /api/rfq/:rfqId/bids
// CRITICAL PRIVACY: Only Owner/Admin can see all bids!
// An EPC user can ONLY see their own bid!
router.get('/:rfqId/bids', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  const isOwner = project && (project.ownerId === user.id || user.role === 'admin');

  const allBids = rfqRepository.getBidsByRfqId(rfq.id);
  const orgs = organizationRepository.findAll?.() || [];
  const orgMap = new Map<string, any>(orgs.map((o: any) => [o.id, o]));

  if (isOwner) {
    // Project owner gets all bids enriched with EPC organization details and score
    const enrichedBids = allBids.map(b => {
      const epc = orgMap.get(b.epcOrganizationId);
      const scoreResult = scoreBid(b, rfq, allBids, epc);
      return {
        ...b,
        scoreBreakdown: scoreResult.breakdown,
        riskFlags: scoreResult.risks,
        normalizedScore: scoreResult.totalScore,
        epcName: epc?.tradeName || epc?.legalName || 'شرکت پیمانکار EPC',
        epcVerificationStatus: epc?.verificationStatus || 'NOT_VERIFIED'
      };
    });
    return res.json(enrichedBids);
  }

  // If user is EPC contractor, find their own organization and only return their own bid!
  const userOrg = getUserOrganization(user.id);
  if (!userOrg) {
    return res.status(403).json({ error: "دسترسی غیرمجاز (شما مالک پروژه یا پیمانکار مجاز نیستید)" });
  }

  const myBids = allBids.filter(b => b.epcOrganizationId === userOrg.id);
  return res.json(myBids);
});

// 10. GET /api/rfq/:rfqId/compare
// Deterministic bid comparison matrix (Owner/Admin only)
router.get('/:rfqId/compare', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها کارفرما یا مدیر سامانه به ماتریس مقایسه دسترسی دارد" });
  }

  const bids = rfqRepository.getBidsByRfqId(rfq.id);
  const orgs = organizationRepository.findAll?.() || [];

  const comparison = compareBids(rfq, bids, orgs);
  res.json(comparison);
});

// 11. POST /api/rfq/:rfqId/bids (Submit or Draft Bid)
router.post('/:rfqId/bids', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  if (rfq.status !== 'OPEN' && rfq.status !== 'PUBLISHED') {
    return res.status(400).json({ error: "این استعلام در وضعیت دریافت پیشنهاد نیست (بسته شده یا لغو گردیده است)" });
  }

  // Check EPC organization
  let epcOrgId = req.body.epcOrganizationId;
  if (!epcOrgId) {
    const userOrg = getUserOrganization(user.id);
    if (userOrg) epcOrgId = userOrg.id;
  }

  if (!epcOrgId) {
    // Auto-create/register an EPC organization profile for this user if needed
    const newOrg = organizationRepository.create?.({
      legalName: req.body.companyName || user.name || 'شرکت مهندسی و پیمانکاری',
      tradeName: req.body.companyName || user.name || 'پیمانکار EPC',
      type: 'EPC_CONTRACTOR',
      registrationNumber: req.body.registrationNumber || '',
      nationalId: req.body.nationalId || '',
      verificationStatus: 'VERIFIED',
      createdById: user.id
    });
    epcOrgId = newOrg?.id;
  }

  const {
    status = 'SUBMITTED',
    currency = 'IRR',
    totalPrice = 0,
    engineeringPrice = 0,
    equipmentPrice = 0,
    installationPrice = 0,
    otherPrice = 0,
    executionDays = 60,
    warrantyYears = 5,
    equipmentSummary = {},
    paymentTerms = '۳۰٪ پیش‌پرداخت، ۴۰٪ پس از ورود تجهیزات به کارگاه، ۲۰٪ پس از نصب، ۱۰٪ پس از اتصال به شبکه',
    assumptions,
    exclusions,
    technicalDocuments = [],
    commercialDocuments = [],
    technicalCompliance = 'COMPLIANT',
    complianceNotes
  } = req.body;

  const techValidation = validateLegacyDocumentStrings(technicalDocuments);
  if (!techValidation.isValid) {
    return res.status(400).json({ error: techValidation.error });
  }
  const commValidation = validateLegacyDocumentStrings(commercialDocuments);
  if (!commValidation.isValid) {
    return res.status(400).json({ error: commValidation.error });
  }

  // Check if this EPC already has a bid on this RFQ
  const existingBids = rfqRepository.getBidsByRfqId(rfq.id);
  const previousBid = existingBids.find(b => b.epcOrganizationId === epcOrgId);
  if (previousBid) {
    return res.status(400).json({ 
      error: "شما قبلاً یک پیشنهاد برای این استعلام ثبت کرده‌اید. لطفاً از بخش ویرایش پیشنهاد (Revision) استفاده نمایید.",
      existingBidId: previousBid.id 
    });
  }

  const bidCode = generateBidCode();

  const newBid = rfqRepository.createBid({
    bidCode,
    projectId: rfq.projectId,
    rfqId: rfq.id,
    epcOrganizationId: epcOrgId,
    status: status as any,
    currency,
    totalPrice: Number(totalPrice),
    engineeringPrice: Number(engineeringPrice),
    equipmentPrice: Number(equipmentPrice),
    installationPrice: Number(installationPrice),
    otherPrice: Number(otherPrice),
    executionDays: Number(executionDays),
    warrantyYears: Number(warrantyYears),
    equipmentSummary,
    paymentTerms,
    assumptions,
    exclusions,
    technicalDocuments,
    commercialDocuments,
    technicalCompliance,
    complianceNotes,
    riskFlags: [],
    submittedAt: status === 'SUBMITTED' ? new Date().toISOString() : undefined
  });

  // Calculate score & risk flags
  const allBidsWithNew = [...existingBids, newBid];
  const org = organizationRepository.findById?.(epcOrgId);
  const scoreResult = scoreBid(newBid, rfq, allBidsWithNew, org);
  newBid.scoreBreakdown = scoreResult.breakdown;
  newBid.riskFlags = scoreResult.risks;
  newBid.normalizedScore = scoreResult.totalScore;
  rfqRepository.updateBid(newBid.id, {
    scoreBreakdown: scoreResult.breakdown,
    riskFlags: scoreResult.risks,
    normalizedScore: scoreResult.totalScore
  });

  // Create immutable initial BidRevision
  rfqRepository.createRevision({
    bidId: newBid.id,
    revisionNumber: 1,
    snapshot: newBid,
    reason: 'ثبت اولیه پیشنهاد در مناقصه استعلام EPC',
    createdByUserId: user.id
  });

  // Update RFQ invitation if exists
  const invitations = rfqRepository.getInvitations(rfq.id);
  const inv = invitations.find(i => i.epcOrganizationId === epcOrgId);
  if (inv) {
    rfqRepository.updateInvitation(inv.id, {
      status: 'BID_SUBMITTED',
      respondedAt: new Date().toISOString()
    });
  }

  // Update project status to BIDS_RECEIVED if still in RFQ_OPEN
  const project = projectRepository.findById(rfq.projectId);
  if (project && project.status === 'RFQ_OPEN' && status === 'SUBMITTED') {
    projectRepository.update(project.id, { status: 'BIDS_RECEIVED' });
  }

  projectRepository.addActivity({
    projectId: rfq.projectId,
    actorUserId: user.id,
    actorOrganizationId: epcOrgId,
    eventType: 'BID_SUBMITTED',
    entityType: 'EPCBid',
    entityId: newBid.id,
    metadata: { bidCode, totalPrice: newBid.totalPrice, executionDays: newBid.executionDays }
  });

  res.json(newBid);
});

// 12. PUT /api/rfq/bids/:bidId (Revise Bid with immutable snapshot)
router.put('/bids/:bidId', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const bid = rfqRepository.getBidById(req.params.bidId);
  if (!bid) return res.status(404).json({ error: "پیشنهاد یافت نشد" });

  const rfq = rfqRepository.findRFQById(bid.rfqId);
  if (!rfq || (rfq.status !== 'OPEN' && rfq.status !== 'PUBLISHED')) {
    return res.status(400).json({ error: "امکان ویرایش پیشنهاد وجود ندارد (مهلت استعلام به پایان رسیده است)" });
  }

  // Check ownership
  const userOrg = getUserOrganization(user.id);
  if (!userOrg || userOrg.id !== bid.epcOrganizationId) {
    if (user.role !== 'admin') {
      return res.status(403).json({ error: "تنها شرکت ثبت‌کننده پیشنهاد مجاز به ویرایش است" });
    }
  }

  const {
    reason = 'بازنگری فنی و مالی پیشنهاد توسط پیمانکار',
    totalPrice,
    engineeringPrice,
    equipmentPrice,
    installationPrice,
    otherPrice,
    executionDays,
    warrantyYears,
    equipmentSummary,
    paymentTerms,
    assumptions,
    exclusions,
    technicalDocuments,
    commercialDocuments,
    technicalCompliance,
    complianceNotes,
    status
  } = req.body;

  if (technicalDocuments) {
    const v = validateLegacyDocumentStrings(technicalDocuments);
    if (!v.isValid) return res.status(400).json({ error: v.error });
  }
  if (commercialDocuments) {
    const v = validateLegacyDocumentStrings(commercialDocuments);
    if (!v.isValid) return res.status(400).json({ error: v.error });
  }

  const nextRevNumber = (bid.currentRevisionNumber || 1) + 1;

  const updatedBid = rfqRepository.updateBid(bid.id, {
    ...(totalPrice !== undefined ? { totalPrice: Number(totalPrice) } : {}),
    ...(engineeringPrice !== undefined ? { engineeringPrice: Number(engineeringPrice) } : {}),
    ...(equipmentPrice !== undefined ? { equipmentPrice: Number(equipmentPrice) } : {}),
    ...(installationPrice !== undefined ? { installationPrice: Number(installationPrice) } : {}),
    ...(otherPrice !== undefined ? { otherPrice: Number(otherPrice) } : {}),
    ...(executionDays !== undefined ? { executionDays: Number(executionDays) } : {}),
    ...(warrantyYears !== undefined ? { warrantyYears: Number(warrantyYears) } : {}),
    ...(equipmentSummary ? { equipmentSummary } : {}),
    ...(paymentTerms ? { paymentTerms } : {}),
    ...(assumptions !== undefined ? { assumptions } : {}),
    ...(exclusions !== undefined ? { exclusions } : {}),
    ...(technicalDocuments ? { technicalDocuments } : {}),
    ...(commercialDocuments ? { commercialDocuments } : {}),
    ...(technicalCompliance ? { technicalCompliance } : {}),
    ...(complianceNotes !== undefined ? { complianceNotes } : {}),
    ...(status ? { status } : {}),
    currentRevisionNumber: nextRevNumber
  });

  if (!updatedBid) return res.status(500).json({ error: "خطا در بروزرسانی پیشنهاد" });

  // Recalculate score & risks
  const allBids = rfqRepository.getBidsByRfqId(rfq.id);
  const epcOrg = organizationRepository.findById?.(updatedBid.epcOrganizationId);
  const scoreResult = scoreBid(updatedBid, rfq, allBids, epcOrg);
  updatedBid.scoreBreakdown = scoreResult.breakdown;
  updatedBid.riskFlags = scoreResult.risks;
  updatedBid.normalizedScore = scoreResult.totalScore;
  rfqRepository.updateBid(updatedBid.id, {
    scoreBreakdown: scoreResult.breakdown,
    riskFlags: scoreResult.risks,
    normalizedScore: scoreResult.totalScore
  });

  // Save immutable snapshot
  rfqRepository.createRevision({
    bidId: updatedBid.id,
    revisionNumber: nextRevNumber,
    snapshot: updatedBid,
    reason,
    createdByUserId: user.id
  });

  projectRepository.addActivity({
    projectId: rfq.projectId,
    actorUserId: user.id,
    actorOrganizationId: updatedBid.epcOrganizationId,
    eventType: 'BID_REVISED',
    entityType: 'EPCBid',
    entityId: updatedBid.id,
    metadata: { revisionNumber: nextRevNumber, reason }
  });

  res.json(updatedBid);
});

// 13. GET /api/rfq/bids/:bidId/revisions
router.get('/bids/:bidId/revisions', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const bid = rfqRepository.getBidById(req.params.bidId);
  if (!bid) return res.status(404).json({ error: "پیشنهاد یافت نشد" });

  const rfq = rfqRepository.findRFQById(bid.rfqId);
  const project = rfq ? projectRepository.findById(rfq.projectId) : null;
  const isOwner = project && (project.ownerId === user.id || user.role === 'admin');

  const userOrg = getUserOrganization(user.id);
  const isBidder = userOrg && userOrg.id === bid.epcOrganizationId;

  if (!isOwner && !isBidder) {
    return res.status(403).json({ error: "دسترسی غیرمجاز به تاریخچه بازنگری این پیشنهاد" });
  }

  const revisions = rfqRepository.getRevisions(bid.id);
  res.json(revisions);
});

// 13.1 POST /api/rfq/bids/:bidId/select (Select/Award bid directly)
router.post('/bids/:bidId/select', idempotencyMiddleware('rfq-award'), (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const bidId = typeof req.params.bidId === 'string' ? req.params.bidId : req.params.bidId[0];
  const winningBid = rfqRepository.getBidById(bidId);
  if (!winningBid) return res.status(404).json({ error: "پیشنهاد مورد نظر یافت نشد" });

  const rfq = rfqRepository.findRFQById(winningBid.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام مرتبط با این پیشنهاد یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها کارفرما یا مدیر سامانه می‌تواند پیمانکار نهایی را برگزیند" });
  }

  // Idempotency: If this bid is already selected and RFQ is AWARDED, return successfully
  if (rfq.status === 'AWARDED' && rfq.selectedBidId === winningBid.id) {
    return res.json({
      message: "این پیشنهاد قبلاً به عنوان پیشنهاد منتخب برگزیده شده است",
      rfq,
      winningBid,
      alreadyAwarded: true
    });
  }

  // Durable domain conflict guard: If RFQ is already awarded to a different bid, reject double-awarding
  if (rfq.status === 'AWARDED' && rfq.selectedBidId && rfq.selectedBidId !== winningBid.id) {
    return res.status(409).json({
      error: "این استعلام قبلاً به پیشنهاد دیگری واگذار شده است و امکان واگذاری مجدد بدون ابطال وجود ندارد",
      alreadyAwardedBidId: rfq.selectedBidId
    });
  }

  // 1. Update winning bid status to SELECTED
  rfqRepository.updateBid(winningBid.id, { status: 'SELECTED' });

  // 2. Update losing bids status to REJECTED
  const allBids = rfqRepository.getBidsByRfqId(rfq.id);
  for (const b of allBids) {
    if (b.id !== winningBid.id && b.status !== 'WITHDRAWN') {
      rfqRepository.updateBid(b.id, { status: 'REJECTED' });
    }
  }

  // 3. Update RFQ status to AWARDED
  const awardedRfq = rfqRepository.updateRFQ(rfq.id, {
    status: 'AWARDED',
    awardedAt: new Date().toISOString(),
    selectedBidId: winningBid.id,
    selectedEpcOrganizationId: winningBid.epcOrganizationId
  });

  // 4. Update Project status to EPC_SELECTED
  projectRepository.update(project.id, { status: 'EPC_SELECTED' });

  // 5. Add EPC organization to ProjectMember as 'EPC'
  const org = organizationRepository.findById?.(winningBid.epcOrganizationId);
  const epcUserId = org?.createdById || winningBid.epcOrganizationId;

  const existingMembers = projectRepository.getMembers(project.id);
  const alreadyMember = existingMembers.find(m => m.organizationId === winningBid.epcOrganizationId || m.userId === epcUserId);

  if (!alreadyMember) {
    projectRepository.addMember({
      projectId: project.id,
      userId: epcUserId,
      organizationId: winningBid.epcOrganizationId,
      role: 'EPC',
      status: 'ACTIVE'
    });
  }

  // 6. Record ProjectActivity: EPC_SELECTED
  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    actorOrganizationId: winningBid.epcOrganizationId,
    eventType: 'EPC_SELECTED',
    entityType: 'EnergyProject',
    entityId: project.id,
    metadata: {
      rfqCode: rfq.rfqCode,
      bidCode: winningBid.bidCode,
      epcOrganizationId: winningBid.epcOrganizationId,
      epcName: org?.tradeName || org?.legalName || 'پیمانکار منتخب EPC',
      totalPrice: winningBid.totalPrice,
      rationale: req.body.rationale || 'انتخاب به عنوان مجری منتخب پروژه'
    }
  });

  res.json({
    success: true,
    message: "پیمانکار EPC با موفقیت برگزیده شد و وضعیت پروژه به EPC_SELECTED ارتقا یافت.",
    awardedRfq,
    winningBid,
    newProjectStatus: 'EPC_SELECTED'
  });
});

// 13.2 PATCH /api/rfq/bids/:bidId/status (Update bid review status)
router.patch('/bids/:bidId/status', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const bid = rfqRepository.getBidById(req.params.bidId);
  if (!bid) return res.status(404).json({ error: "پیشنهاد یافت نشد" });

  const rfq = rfqRepository.findRFQById(bid.rfqId);
  const project = rfq ? projectRepository.findById(rfq.projectId) : null;
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها کارفرما مجاز به تغییر وضعیت بررسی پیشنهاد است" });
  }

  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "وضعیت جدید مشخص نشده است" });

  const updatedBid = rfqRepository.updateBid(bid.id, { status });
  res.json(updatedBid);
});

// 14. POST /api/rfq/:rfqId/select-epc (Award RFQ to EPC)
router.post('/:rfqId/select-epc', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const project = projectRepository.findById(rfq.projectId);
  if (!project || (project.ownerId !== user.id && user.role !== 'admin')) {
    return res.status(403).json({ error: "تنها کارفرما یا مدیر سامانه می‌تواند پیمانکار نهایی را برگزیند" });
  }

  const { bidId, rationale } = req.body;
  if (!bidId) {
    return res.status(400).json({ error: "شناسه پیشنهاد منتخب (bidId) الزامی است" });
  }

  const winningBid = rfqRepository.getBidById(bidId);
  if (!winningBid || winningBid.rfqId !== rfq.id) {
    return res.status(404).json({ error: "پیشنهاد مورد نظر برای این استعلام یافت نشد" });
  }

  // Idempotency: If this bid is already selected and RFQ is AWARDED, return successfully
  if (rfq.status === 'AWARDED' && rfq.selectedBidId === winningBid.id) {
    return res.json({
      message: "این پیشنهاد قبلاً به عنوان پیشنهاد منتخب برگزیده شده است",
      rfq,
      winningBid,
      alreadyAwarded: true
    });
  }

  // Durable domain conflict guard: If RFQ is already awarded to a different bid, reject double-awarding
  if (rfq.status === 'AWARDED' && rfq.selectedBidId && rfq.selectedBidId !== winningBid.id) {
    return res.status(409).json({
      error: "این استعلام قبلاً به پیشنهاد دیگری واگذار شده است و امکان واگذاری مجدد بدون ابطال وجود ندارد",
      alreadyAwardedBidId: rfq.selectedBidId
    });
  }

  // 1. Update winning bid status to SELECTED
  rfqRepository.updateBid(winningBid.id, { status: 'SELECTED' });

  // 2. Update losing bids status to REJECTED (Do not delete them!)
  const allBids = rfqRepository.getBidsByRfqId(rfq.id);
  for (const b of allBids) {
    if (b.id !== winningBid.id && b.status !== 'WITHDRAWN') {
      rfqRepository.updateBid(b.id, { status: 'REJECTED' });
    }
  }

  // 3. Update RFQ status to AWARDED
  const awardedRfq = rfqRepository.updateRFQ(rfq.id, {
    status: 'AWARDED',
    awardedAt: new Date().toISOString(),
    selectedBidId: winningBid.id,
    selectedEpcOrganizationId: winningBid.epcOrganizationId
  });

  // 4. Update Project status to EPC_SELECTED
  const validation = validateTransition(project.status, 'EPC_SELECTED');
  if (validation.valid) {
    projectRepository.update(project.id, { status: 'EPC_SELECTED' });
  } else {
    // If not direct, force set EPC_SELECTED because an EPC was legally awarded
    projectRepository.update(project.id, { status: 'EPC_SELECTED' });
  }

  // 5. Add EPC organization to ProjectMember as 'EPC'
  // Find a user associated with this EPC organization, or use a placeholder/org reference
  const org = organizationRepository.findById?.(winningBid.epcOrganizationId);
  const epcUserId = org?.createdById || winningBid.epcOrganizationId;

  const existingMembers = projectRepository.getMembers(project.id);
  const alreadyMember = existingMembers.find(m => m.organizationId === winningBid.epcOrganizationId || m.userId === epcUserId);

  if (!alreadyMember) {
    projectRepository.addMember({
      projectId: project.id,
      userId: epcUserId,
      organizationId: winningBid.epcOrganizationId,
      role: 'EPC',
      status: 'ACTIVE'
    });
  }

  // 6. Record ProjectActivity: EPC_SELECTED
  projectRepository.addActivity({
    projectId: project.id,
    actorUserId: user.id,
    actorOrganizationId: winningBid.epcOrganizationId,
    eventType: 'EPC_SELECTED',
    entityType: 'EnergyProject',
    entityId: project.id,
    metadata: {
      rfqCode: rfq.rfqCode,
      bidCode: winningBid.bidCode,
      epcOrganizationId: winningBid.epcOrganizationId,
      epcName: org?.tradeName || org?.legalName || 'پیمانکار منتخب EPC',
      totalPrice: winningBid.totalPrice,
      rationale: rationale || 'انتخاب نهایی بر اساس ارزیابی فنی، قیمت و شرایط گارانتی'
    }
  });

  res.json({
    success: true,
    message: "پیمانکار EPC با موفقیت برگزیده شد و به عنوان عضو اجرایی به پروژه ملحق گردید.",
    awardedRfq,
    winningBid,
    newProjectStatus: 'EPC_SELECTED'
  });
});

// ==========================================
// STAGE 12.3E.1 — SECURE RFQ & BID DOCUMENTS
// ==========================================

function isUserRfqOwnerOrAdmin(rfq: ProjectRFQ, user: any): boolean {
  if (!user || !user.id) return false;
  if (user.role === 'admin') return true;
  const project = projectRepository.findById(rfq.projectId);
  return Boolean(project && project.ownerId === user.id);
}

function canUserViewRfq(rfq: ProjectRFQ, user: any): boolean {
  if (!user || !user.id) return false;
  if (user.role === 'admin') return true;

  const project = projectRepository.findById(rfq.projectId);
  if (project && project.ownerId === user.id) {
    return true;
  }

  // RFQs in DRAFT or CANCELLED are private to project owner
  if (rfq.status === 'DRAFT' || rfq.status === 'CANCELLED') {
    return false;
  }

  // An EPC organization can view open/published RFQs
  const userOrg = getUserOrganization(user.id);
  if (!userOrg) {
    return false;
  }

  if (rfq.visibility === 'INVITED_ONLY') {
    const invitations = rfqRepository.getInvitations(rfq.id);
    return invitations.some(i => i.epcOrganizationId === userOrg.id);
  }

  return true;
}

function canUserAccessBid(rfq: ProjectRFQ, bid: EPCBid, user: any): { allowed: boolean; status?: number; error?: string } {
  if (!user || !user.id) {
    return { allowed: false, status: 401, error: 'احراز هویت الزامی است.' };
  }
  if (user.role === 'admin') {
    return { allowed: true };
  }

  // Project owner
  const project = projectRepository.findById(rfq.projectId);
  if (project && project.ownerId === user.id) {
    return { allowed: true };
  }

  // Owning EPC organization
  const userOrg = getUserOrganization(user.id);
  if (userOrg && userOrg.id === bid.epcOrganizationId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 403,
    error: 'عدم دسترسی به اسناد این پیشنهاد قیمت'
  };
}

function canModifyBidDocuments(rfq: ProjectRFQ, bid: EPCBid): { allowed: boolean; error?: string } {
  if (rfq.status === 'AWARDED' || rfq.status === 'CLOSED' || rfq.status === 'CANCELLED') {
    return {
      allowed: false,
      error: 'امکان بارگذاری یا تغییر اسناد پس از بسته‌شدن یا واگذاری استعلام وجود ندارد.'
    };
  }
  if (bid.status === 'SELECTED' || bid.status === 'REJECTED' || bid.status === 'ACCEPTED' || bid.status === 'WITHDRAWN') {
    return {
      allowed: false,
      error: 'امکان ویرایش اسناد این پیشنهاد به دلیل وضعیت نهایی آن وجود ندارد.'
    };
  }
  return { allowed: true };
}

// Pre-upload auth middleware: ensures unauthorized callers DO NOT trigger multipart file handling
const authorizeRfqOwnerUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.user;
  if (!user || !user.id) return res.status(401).json({ error: "احراز هویت الزامی است." });

  const rfqId = String(req.params.rfqId);
  const rfq = rfqRepository.findRFQById(rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const isOwner = isUserRfqOwnerOrAdmin(rfq, user);
  if (!isOwner) {
    return res.status(403).json({ error: "تنها کارفرمای پروژه یا مدیر سیستم مجاز به بارگذاری اسناد استعلام است." });
  }

  (req as any).rfq = rfq;
  next();
};

const authorizeBidOwnerUpload = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = req.user;
  if (!user || !user.id) return res.status(401).json({ error: "احراز هویت الزامی است." });

  const rfqId = String(req.params.rfqId);
  const bidId = String(req.params.bidId);
  const rfq = rfqRepository.findRFQById(rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const bid = rfqRepository.getBidById(bidId);
  if (!bid) return res.status(404).json({ error: "پیشنهاد یافت نشد" });

  if (bid.rfqId !== rfq.id) {
    return res.status(404).json({ error: "پیشنهاد متعلق به این استعلام نیست." });
  }

  const userOrg = getUserOrganization(user.id);
  const isBidOwner = userOrg && userOrg.id === bid.epcOrganizationId;
  if (!isBidOwner) {
    return res.status(403).json({ error: "تنها پیمانکار ارائه‌دهنده این پیشنهاد مجاز به بارگذاری اسناد آن است." });
  }

  const modCheck = canModifyBidDocuments(rfq, bid);
  if (!modCheck.allowed) {
    return res.status(400).json({ error: modCheck.error });
  }

  (req as any).rfq = rfq;
  (req as any).bid = bid;
  (req as any).userOrg = userOrg;
  next();
};

/**
 * POST /api/rfq/:rfqId/documents/upload
 * RFQ owner uploads project specification/document
 */
router.post(
  '/:rfqId/documents/upload',
  authorizeRfqOwnerUpload,
  handleMultipartUpload,
  async (req: express.Request, res: express.Response) => {
    const user = req.user;
    const rfq: ProjectRFQ = (req as any).rfq;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'هیچ فایلی برای بارگذاری ارسال نشده است.' });
    }

    const storageService = getFileStorageService();
    if (!storageService.isConfigured()) {
      return res.status(503).json({
        code: 'STORAGE_NOT_CONFIGURED',
        error: 'سرویس ذخیره‌سازی ابری پیکربندی نشده است.'
      });
    }

    let validationResult;
    try {
      validationResult = validateBinaryFile(file.buffer, file.originalname, file.mimetype, {
        allowedTypes: ['PDF', 'IMAGE'],
        maxPdfSizeBytes: 15 * 1024 * 1024,
        maxImageSizeBytes: 5 * 1024 * 1024
      });
    } catch (err: any) {
      if (err instanceof FileValidationError) {
        return res.status(err.statusCode || 400).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(400).json({
        code: 'FILE_VALIDATION_ERROR',
        error: err.message || 'اعتبارسنجی سند ناموفق بود.'
      });
    }

    const storageKey = generateStorageKey({
      scope: 'rfq',
      entityId: rfq.id,
      category: 'DOCUMENT',
      extension: validationResult.extension
    });

    const sanitizedFilename = validationResult.sanitizedFilename || sanitizeOriginalFilename(file.originalname);

    try {
      await storageService.putObject({
        key: storageKey,
        body: file.buffer,
        contentType: validationResult.detectedMimeType,
        contentLength: validationResult.sizeBytes,
        metadata: {
          rfqId: rfq.id,
          uploadedByUserId: user.id,
          originalFilename: sanitizedFilename,
          sha256: validationResult.checksumSha256
        }
      });
    } catch (err: any) {
      console.error('Storage putObject failed for RFQ document:', err);
      return res.status(502).json({
        code: 'STORAGE_UPLOAD_FAILED',
        error: 'خطا در بارگذاری فایل به فضای ذخیره‌سازی ابری'
      });
    }

    const docId = `rfq-doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newDoc: RFQDocument = {
      id: docId,
      rfqId: rfq.id,
      name: sanitizedFilename,
      originalFilename: sanitizedFilename,
      storageProvider: 'S3_COMPATIBLE',
      storageKey,
      url: `/api/rfq/${rfq.id}/documents/${docId}/download`,
      mimeType: validationResult.detectedMimeType,
      sizeBytes: validationResult.sizeBytes,
      checksumSha256: validationResult.checksumSha256,
      uploadedByUserId: user.id,
      uploadedAt: new Date().toISOString()
    };

    try {
      const updatedDocs = [...(rfq.documents || []), newDoc];
      const updated = rfqRepository.updateRFQ(rfq.id, { documents: updatedDocs });
      if (!updated) {
        throw new Error('Failed to update RFQ documents in database');
      }
    } catch (persistErr: any) {
      console.error('RFQ document metadata persistence failed, executing rollback delete:', persistErr);
      try {
        await storageService.deleteObject(storageKey);
      } catch (cleanupErr) {
        console.error('Compensating rollback delete failed for RFQ doc key:', storageKey, cleanupErr);
      }
      return res.status(500).json({
        code: 'METADATA_PERSISTENCE_FAILED',
        error: 'خطا در ذخیره‌سازی اطلاعات سند در پایگاه داده'
      });
    }

    const { storageKey: _omittedKey, ...safeDoc } = newDoc as any;
    return res.status(201).json(safeDoc);
  }
);

/**
 * GET /api/rfq/:rfqId/documents
 * List metadata of RFQ documents
 */
router.get('/:rfqId/documents', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  if (!canUserViewRfq(rfq, user)) {
    return res.status(403).json({ error: "عدم دسترسی به اسناد این استعلام" });
  }

  const safeDocs = (rfq.documents || []).map(({ storageKey, ...d }: any) => d);
  return res.json(safeDocs);
});

/**
 * GET /api/rfq/:rfqId/documents/:documentId/download
 * Generate short-lived signed download URL for RFQ document
 */
router.get('/:rfqId/documents/:documentId/download', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  if (!canUserViewRfq(rfq, user)) {
    return res.status(403).json({ error: "عدم دسترسی به اسناد این استعلام" });
  }

  const doc = (rfq.documents || []).find(d => d.id === req.params.documentId);
  if (!doc) {
    return res.status(404).json({ error: "سند مورد نظر یافت نشد" });
  }

  if (doc.rfqId && doc.rfqId !== rfq.id) {
    return res.status(404).json({ error: "سند متعلق به این استعلام نیست" });
  }

  if (doc.storageProvider === 'EXTERNAL_URL' || (!doc.storageProvider && !doc.storageKey)) {
    return res.json({
      downloadUrl: doc.url || '',
      storageProvider: 'EXTERNAL_URL',
      expiresIn: null
    });
  }

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
    const signedUrl = await storageService.getSignedDownloadUrl({ key: doc.storageKey });
    return res.json({
      downloadUrl: signedUrl,
      storageProvider: 'S3_COMPATIBLE',
      expiresIn: 300
    });
  } catch (err: any) {
    console.error('Error generating signed download URL for RFQ doc:', err);
    return res.status(500).json({
      code: 'SIGNED_URL_ERROR',
      error: 'خطا در ایجاد لینک دانلود امن'
    });
  }
});

/**
 * DELETE /api/rfq/:rfqId/documents/:documentId
 * Authorized deletion of RFQ document (S3 object deleted first)
 */
router.delete('/:rfqId/documents/:documentId', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  if (!isUserRfqOwnerOrAdmin(rfq, user)) {
    return res.status(403).json({ error: "تنها کارفرمای پروژه یا مدیر سیستم مجاز به حذف اسناد استعلام است." });
  }

  const doc = (rfq.documents || []).find(d => d.id === req.params.documentId);
  if (!doc) {
    return res.status(404).json({ error: "سند مورد نظر یافت نشد" });
  }

  if (doc.rfqId && doc.rfqId !== rfq.id) {
    return res.status(404).json({ error: "سند متعلق به این استعلام نیست" });
  }

  if (doc.storageProvider === 'S3_COMPATIBLE' && doc.storageKey) {
    const storageService = getFileStorageService();
    if (storageService.isConfigured()) {
      try {
        await storageService.deleteObject(doc.storageKey);
      } catch (err: any) {
        console.error('Failed to delete RFQ doc from storage:', err);
        return res.status(502).json({
          code: 'STORAGE_DELETE_FAILED',
          error: 'خطا در حذف فایل از فضای ذخیره‌سازی ابری'
        });
      }
    }
  }

  const updatedDocs = (rfq.documents || []).filter(d => d.id !== req.params.documentId);
  rfqRepository.updateRFQ(rfq.id, { documents: updatedDocs });
  return res.json({ success: true, id: req.params.documentId });
});

/**
 * POST /api/rfq/:rfqId/bids/:bidId/documents/upload
 * Submitting EPC uploads TECHNICAL or COMMERCIAL proposal document
 */
router.post(
  '/:rfqId/bids/:bidId/documents/upload',
  authorizeBidOwnerUpload,
  handleMultipartUpload,
  async (req: express.Request, res: express.Response) => {
    const user = req.user;
    const rfq: ProjectRFQ = (req as any).rfq;
    const bid: EPCBid = (req as any).bid;
    const file = req.file;

    const rawCategory = (req.body?.category || req.query?.category || '').toString().trim().toUpperCase();
    if (rawCategory !== 'TECHNICAL' && rawCategory !== 'COMMERCIAL') {
      return res.status(400).json({
        code: 'INVALID_CATEGORY',
        error: 'دسته‌بندی سند الزامی است و تنها می‌تواند TECHNICAL یا COMMERCIAL باشد.'
      });
    }
    const category: BidDocumentCategory = rawCategory;

    if (!file) {
      return res.status(400).json({ error: 'هیچ فایلی برای بارگذاری ارسال نشده است.' });
    }

    const storageService = getFileStorageService();
    if (!storageService.isConfigured()) {
      return res.status(503).json({
        code: 'STORAGE_NOT_CONFIGURED',
        error: 'سرویس ذخیره‌سازی ابری پیکربندی نشده است.'
      });
    }

    let validationResult;
    try {
      validationResult = validateBinaryFile(file.buffer, file.originalname, file.mimetype, {
        allowedTypes: ['PDF', 'IMAGE'],
        maxPdfSizeBytes: 15 * 1024 * 1024,
        maxImageSizeBytes: 5 * 1024 * 1024
      });
    } catch (err: any) {
      if (err instanceof FileValidationError) {
        return res.status(err.statusCode || 400).json({
          code: err.code,
          error: err.message
        });
      }
      return res.status(400).json({
        code: 'FILE_VALIDATION_ERROR',
        error: err.message || 'اعتبارسنجی سند ناموفق بود.'
      });
    }

    const storageKey = generateStorageKey({
      scope: 'bids',
      entityId: bid.id,
      category,
      extension: validationResult.extension
    });

    const sanitizedFilename = validationResult.sanitizedFilename || sanitizeOriginalFilename(file.originalname);

    try {
      await storageService.putObject({
        key: storageKey,
        body: file.buffer,
        contentType: validationResult.detectedMimeType,
        contentLength: validationResult.sizeBytes,
        metadata: {
          bidId: bid.id,
          rfqId: rfq.id,
          category,
          uploadedByUserId: user.id,
          originalFilename: sanitizedFilename,
          sha256: validationResult.checksumSha256
        }
      });
    } catch (err: any) {
      console.error('Storage putObject failed for bid document:', err);
      return res.status(502).json({
        code: 'STORAGE_UPLOAD_FAILED',
        error: 'خطا در بارگذاری فایل به فضای ذخیره‌سازی ابری'
      });
    }

    const docId = `bid-doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newDoc: BidDocument = {
      id: docId,
      bidId: bid.id,
      rfqId: rfq.id,
      category,
      name: sanitizedFilename,
      originalFilename: sanitizedFilename,
      storageProvider: 'S3_COMPATIBLE',
      storageKey,
      url: `/api/rfq/${rfq.id}/bids/${bid.id}/documents/${docId}/download`,
      mimeType: validationResult.detectedMimeType,
      sizeBytes: validationResult.sizeBytes,
      checksumSha256: validationResult.checksumSha256,
      uploadedByUserId: user.id,
      uploadedAt: new Date().toISOString()
    };

    try {
      const updatedDocuments = [...(bid.documents || []), newDoc];
      const updatedTechnical = category === 'TECHNICAL'
        ? Array.from(new Set([...(bid.technicalDocuments || []), sanitizedFilename]))
        : (bid.technicalDocuments || []);
      const updatedCommercial = category === 'COMMERCIAL'
        ? Array.from(new Set([...(bid.commercialDocuments || []), sanitizedFilename]))
        : (bid.commercialDocuments || []);

      const updated = rfqRepository.updateBid(bid.id, {
        documents: updatedDocuments,
        technicalDocuments: updatedTechnical,
        commercialDocuments: updatedCommercial
      });
      if (!updated) {
        throw new Error('Failed to update bid in database');
      }
    } catch (persistErr: any) {
      console.error('Bid document metadata persistence failed, executing rollback delete:', persistErr);
      try {
        await storageService.deleteObject(storageKey);
      } catch (cleanupErr) {
        console.error('Compensating rollback delete failed for bid doc key:', storageKey, cleanupErr);
      }
      return res.status(500).json({
        code: 'METADATA_PERSISTENCE_FAILED',
        error: 'خطا در ذخیره‌سازی اطلاعات سند در پایگاه داده'
      });
    }

    const { storageKey: _omittedKey, ...safeDoc } = newDoc as any;
    return res.status(201).json(safeDoc);
  }
);

/**
 * GET /api/rfq/:rfqId/bids/:bidId/documents
 * List metadata of Bid documents (confidential to bid-owning EPC and RFQ owner)
 */
router.get('/:rfqId/bids/:bidId/documents', (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const bid = rfqRepository.getBidById(req.params.bidId);
  if (!bid) return res.status(404).json({ error: "پیشنهاد یافت نشد" });

  if (bid.rfqId !== rfq.id) {
    return res.status(404).json({ error: "پیشنهاد متعلق به این استعلام نیست" });
  }

  const access = canUserAccessBid(rfq, bid, user);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const safeDocs = (bid.documents || []).map(({ storageKey, ...d }: any) => d);
  return res.json(safeDocs);
});

/**
 * GET /api/rfq/:rfqId/bids/:bidId/documents/:documentId/download
 * Generate short-lived signed download URL for Bid document
 */
router.get('/:rfqId/bids/:bidId/documents/:documentId/download', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const bid = rfqRepository.getBidById(req.params.bidId);
  if (!bid) return res.status(404).json({ error: "پیشنهاد یافت نشد" });

  if (bid.rfqId !== rfq.id) {
    return res.status(404).json({ error: "پیشنهاد متعلق به این استعلام نیست" });
  }

  const access = canUserAccessBid(rfq, bid, user);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const doc = (bid.documents || []).find(d => d.id === req.params.documentId);
  if (!doc) {
    return res.status(404).json({ error: "سند مورد نظر یافت نشد" });
  }

  if (doc.bidId !== bid.id || (doc.rfqId && doc.rfqId !== rfq.id)) {
    return res.status(404).json({ error: "سند متعلق به این پیشنهاد یا استعلام نیست" });
  }

  if (doc.storageProvider === 'EXTERNAL_URL' || (!doc.storageProvider && !doc.storageKey)) {
    return res.json({
      downloadUrl: doc.url || '',
      storageProvider: 'EXTERNAL_URL',
      expiresIn: null
    });
  }

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
    const signedUrl = await storageService.getSignedDownloadUrl({ key: doc.storageKey });
    return res.json({
      downloadUrl: signedUrl,
      storageProvider: 'S3_COMPATIBLE',
      expiresIn: 300
    });
  } catch (err: any) {
    console.error('Error generating signed download URL for bid doc:', err);
    return res.status(500).json({
      code: 'SIGNED_URL_ERROR',
      error: 'خطا در ایجاد لینک دانلود امن'
    });
  }
});

/**
 * DELETE /api/rfq/:rfqId/bids/:bidId/documents/:documentId
 * Authorized deletion of Bid document by owning EPC (S3 object deleted first)
 */
router.delete('/:rfqId/bids/:bidId/documents/:documentId', async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rfq = rfqRepository.findRFQById(req.params.rfqId);
  if (!rfq) return res.status(404).json({ error: "استعلام یافت نشد" });

  const bid = rfqRepository.getBidById(req.params.bidId);
  if (!bid) return res.status(404).json({ error: "پیشنهاد یافت نشد" });

  if (bid.rfqId !== rfq.id) {
    return res.status(404).json({ error: "پیشنهاد متعلق به این استعلام نیست" });
  }

  const userOrg = getUserOrganization(user.id);
  const isBidOwner = userOrg && userOrg.id === bid.epcOrganizationId;
  if (!isBidOwner) {
    return res.status(403).json({ error: "تنها پیمانکار ارائه‌دهنده این پیشنهاد مجاز به حذف اسناد آن است." });
  }

  const modCheck = canModifyBidDocuments(rfq, bid);
  if (!modCheck.allowed) {
    return res.status(400).json({ error: modCheck.error });
  }

  const doc = (bid.documents || []).find(d => d.id === req.params.documentId);
  if (!doc) {
    return res.status(404).json({ error: "سند مورد نظر یافت نشد" });
  }

  if (doc.bidId !== bid.id || (doc.rfqId && doc.rfqId !== rfq.id)) {
    return res.status(404).json({ error: "سند متعلق به این پیشنهاد یا استعلام نیست" });
  }

  if (doc.storageProvider === 'S3_COMPATIBLE' && doc.storageKey) {
    const storageService = getFileStorageService();
    if (storageService.isConfigured()) {
      try {
        await storageService.deleteObject(doc.storageKey);
      } catch (err: any) {
        console.error('Failed to delete bid doc from storage:', err);
        return res.status(502).json({
          code: 'STORAGE_DELETE_FAILED',
          error: 'خطا در حذف فایل از فضای ذخیره‌سازی ابری'
        });
      }
    }
  }

  const updatedDocs = (bid.documents || []).filter(d => d.id !== req.params.documentId);
  const remainingDocNames = updatedDocs.map(d => d.name);
  const updatedTechnical = (bid.technicalDocuments || []).filter(name => remainingDocNames.includes(name) || !doc.name || name !== doc.name);
  const updatedCommercial = (bid.commercialDocuments || []).filter(name => remainingDocNames.includes(name) || !doc.name || name !== doc.name);

  rfqRepository.updateBid(bid.id, {
    documents: updatedDocs,
    technicalDocuments: updatedTechnical,
    commercialDocuments: updatedCommercial
  });

  return res.json({ success: true, id: req.params.documentId });
});

export default router;
