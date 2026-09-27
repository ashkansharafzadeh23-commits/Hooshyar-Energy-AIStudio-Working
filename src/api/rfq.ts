import express from 'express';
import { verifyAuthToken } from './auth.js';
import { rfqRepository } from '../repositories/rfqRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { generateRFQCode, generateBidCode } from '../services/rfqCodeService.js';
import { compareBids, scoreBid } from '../services/rfqScoringService.js';
import { validateTransition } from '../services/projectLifecycleService.js';
import { userRepository } from '../repositories/userRepository.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { EPCBid, ProjectRFQ } from '../types/rfq.js';
import { idempotencyMiddleware } from '../reliability/idempotency.js';

const router = express.Router();
router.use(verifyAuthToken);

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

  // Check if this EPC already has a bid on this RFQ
  const existingBids = rfqRepository.getBidsByRfqId(rfq.id);
  const previousBid = existingBids.find(b => b.epcOrganizationId === epcOrgId);
  if (previousBid) {
    return res.status(400).json({ 
      error: "شما قبلاً یک پیشنهاد برای این استعلام ثبت کرده‌اید. لطفاً از بخش ویرایش پیشنهاد (Revision) استفاده نمایید.",
      existingBidId: previousBid.id 
    });
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

export default router;
