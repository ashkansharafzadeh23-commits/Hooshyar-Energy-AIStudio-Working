import { Router, Request, Response } from 'express';
import { financingRepository } from '../repositories/financingRepository.js';
import { financeReadinessService } from '../services/financeReadinessService.js';
import { debtServiceCalculator } from '../services/debtServiceCalculator.js';
import { financialPartnerMatchingService } from '../services/financialPartnerMatchingService.js';
import { financingOfferComparisonService } from '../services/financingOfferComparisonService.js';
import { canTransition } from '../services/projectLifecycleService.js';
import { verifyAuthToken, requireAuth } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { idempotencyMiddleware } from '../reliability/idempotency.js';

const router = Router();

// Enforce authentication on financing routes
router.use(verifyAuthToken);
router.use(requireAuth);

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

// 1. Get financing requests for a project
router.get('/projects/:projectId/financing-requests', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const requests = financingRepository.getFinancingRequests(projectId);
  return res.json(requests);
});

// 2. Create financing request for a project
router.post('/projects/:projectId/financing-requests', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const project = access.project || financingRepository.getProjectById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Get project financial model if available
  const models = financingRepository.getFinancialModelsByProjectId(projectId);
  const activeModel = models.find((m: any) => m.status !== 'SUPERSEDED') || models[0];

  // STRICT VALIDATION: No invented project cost
  let totalProjectCost = req.body.totalProjectCost;
  if (!totalProjectCost && activeModel?.results?.totalCapex?.amount) {
    totalProjectCost = activeModel.results.totalCapex.amount;
  }
  if (!totalProjectCost && project.estimatedBudgetIRR) {
    totalProjectCost = project.estimatedBudgetIRR;
  }
  if (!totalProjectCost || Number(totalProjectCost) <= 0) {
    return res.status(400).json({ 
      error: 'برآورد کل هزینه سرمایه‌گذاری نامشخص است. مقدار هزینه پروژه باید صریحاً وارد شود یا در مدل مالی وجود داشته باشد (تولید هزینه ساختگی مجاز نیست).' 
    });
  }
  totalProjectCost = Number(totalProjectCost);

  // STRICT VALIDATION: No default owner equity (no invented 30%)
  if (req.body.ownerEquity === undefined || req.body.ownerEquity === null || isNaN(Number(req.body.ownerEquity)) || Number(req.body.ownerEquity) < 0) {
    return res.status(400).json({ 
      error: 'آورده نقدی کارفرما (ownerEquity) مشخص نشده است. استفاده از مقدار پیش‌فرض یا درصدهای فرضی مجاز نیست.' 
    });
  }
  const ownerEquity = Number(req.body.ownerEquity);

  // STRICT VALIDATION: No invented financing amount
  if (req.body.requestedAmount === undefined || req.body.requestedAmount === null || isNaN(Number(req.body.requestedAmount)) || Number(req.body.requestedAmount) <= 0) {
    return res.status(400).json({ 
      error: 'مبلغ تسهیلات درخواستی (requestedAmount) مشخص نشده است. امکان تولید خودکار یا فرضی مبلغ تأمین مالی وجود ندارد.' 
    });
  }
  const requestedAmount = Number(req.body.requestedAmount);

  const securedCapital = Number(req.body.securedCapital) || 0;
  const existingDebt = Number(req.body.existingDebt) || 0;
  const fundingGap = Math.max(0, totalProjectCost - (ownerEquity + securedCapital));

  const newRequest = financingRepository.createFinancingRequest({
    projectId,
    requesterUserId: req.user.id,
    requesterOrganizationId: req.body.requesterOrganizationId || project.organizationId,
    financialModelId: activeModel?.id,
    selectedScenarioId: req.body.selectedScenarioId,
    status: 'DRAFT',
    financingType: req.body.financingType || 'PROJECT_LOAN',
    requestedAmount,
    totalProjectCost,
    ownerEquity,
    securedCapital,
    existingDebt,
    fundingGap,
    requestedTenorMonths: req.body.requestedTenorMonths !== undefined && req.body.requestedTenorMonths !== null && req.body.requestedTenorMonths !== '' ? Number(req.body.requestedTenorMonths) : undefined,
    preferredGracePeriodMonths: req.body.preferredGracePeriodMonths !== undefined && req.body.preferredGracePeriodMonths !== null && req.body.preferredGracePeriodMonths !== '' ? Number(req.body.preferredGracePeriodMonths) : undefined,
    repaymentPreference: req.body.repaymentPreference || 'EQUAL_INSTALLMENT',
    collateralAvailable: typeof req.body.collateralAvailable === 'boolean' ? req.body.collateralAvailable : (req.body.collateralAvailable === 'true' ? true : (req.body.collateralAvailable === 'false' ? false : undefined)),
    collateralSummary: req.body.collateralSummary || '',
    projectRevenueModel: req.body.projectRevenueModel || 'PPA',
    summary: req.body.summary || '',
    targetFinancingDate: req.body.targetFinancingDate || undefined
  });

  // Automatically calculate initial readiness
  const contracts = financingRepository.getProjectContracts ? financingRepository.getProjectContracts(projectId) : [];
  const docs = financingRepository.getProjectDocuments ? financingRepository.getProjectDocuments(projectId) : [];
  const readiness = financeReadinessService.evaluateReadiness(newRequest, project, activeModel, contracts.length, docs.length);
  financingRepository.createFinanceReadinessSnapshot(readiness);
  financingRepository.updateFinancingRequest(newRequest.id, { readinessScore: readiness.totalScore });

  return res.json({ request: newRequest, readiness });
});

// 3. Get single financing request
router.get('/financing-requests/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const request = financingRepository.getFinancingRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const snapshots = financingRepository.getFinanceReadinessSnapshots(request.id);
  const latestReadiness = snapshots[snapshots.length - 1];
  return res.json({ request, latestReadiness });
});

// 4. Update financing request
router.patch('/financing-requests/:id', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const request = financingRepository.getFinancingRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const updated = financingRepository.updateFinancingRequest(id, req.body);
  return res.json(updated);
});

// 5. Evaluate/Refresh Finance Readiness Score
router.post('/financing-requests/:id/readiness', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const request = financingRepository.getFinancingRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const project = financingRepository.getProjectById(request.projectId);
  const models = financingRepository.getFinancialModelsByProjectId(request.projectId);
  const activeModel = models.find((m: any) => m.status !== 'SUPERSEDED') || models[0];
  const contracts = financingRepository.getProjectContracts ? financingRepository.getProjectContracts(request.projectId) : [];
  const docs = financingRepository.getProjectDocuments ? financingRepository.getProjectDocuments(request.projectId) : [];

  const snapshot = financeReadinessService.evaluateReadiness(request, project, activeModel, contracts.length, docs.length);
  financingRepository.createFinanceReadinessSnapshot(snapshot);
  financingRepository.updateFinancingRequest(request.id, { readinessScore: snapshot.totalScore, status: 'READY' });

  return res.json(snapshot);
});

// 6. Get/Run Financial Partner Matching
router.get('/financing-requests/:id/matches', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const request = financingRepository.getFinancingRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const project = financingRepository.getProjectById(request.projectId);
  const partners = financingRepository.getFinancialPartnerProfiles();
  const products = financingRepository.getFinancingProducts();

  const matches = financialPartnerMatchingService.matchRequestWithPartners(request, project, partners, products);
  financingRepository.saveFinancialPartnerMatches(request.id, matches);

  // Return matches joined with partner profile
  const enrichedMatches = matches.map(m => {
    const partner = partners.find(p => p.id === m.financialPartnerProfileId);
    const product = products.find(p => p.id === m.financingProductId);
    return { ...m, partner, product };
  });

  return res.json(enrichedMatches);
});

// 7. Submit Financing Request to a selected Partner
router.post('/financing-requests/:id/submit-to-partner', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const request = financingRepository.getFinancingRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const { financialPartnerProfileId, authorizedDocumentIds, message } = req.body;
  if (!financialPartnerProfileId) {
    return res.status(400).json({ error: 'financialPartnerProfileId is required' });
  }

  const partner = financingRepository.getFinancialPartnerProfileById(financialPartnerProfileId);
  if (!partner) return res.status(404).json({ error: 'Financial partner not found' });

  const submission = financingRepository.createFinancingSubmission({
    financingRequestId: request.id,
    financialPartnerProfileId,
    status: 'SUBMITTED',
    authorizedDocumentIds: authorizedDocumentIds || [],
    message: message || `ارسال پرونده تأمین مالی پروژه ${request.requestCode}`
  });

  // Update request status to SUBMITTED
  financingRepository.updateFinancingRequest(request.id, { status: 'SUBMITTED', submittedAt: new Date().toISOString() });

  // Update project status if transition is valid
  const project = financingRepository.getProjectById(request.projectId);
  if (project && (project.status === 'CONTRACTING' || project.status === 'EPC_SELECTED')) {
    if (canTransition(project.status, 'FINANCING')) {
      financingRepository.updateProject(project.id, { status: 'FINANCING' });
    }
  }

  return res.json({ submission, requestStatus: 'SUBMITTED' });
});

// 8. Financial Partners Directory (all active profiles)
router.get('/financial-partners', (req: Request, res: Response) => {
  const partners = financingRepository.getFinancialPartnerProfiles();
  const products = financingRepository.getFinancingProducts();
  const enriched = partners.map(p => ({
    ...p,
    products: products.filter(prod => prod.financialPartnerProfileId === p.id)
  }));
  return res.json(enriched);
});

// 9. Partner Dashboard: list submissions for partner
router.get('/financial-partners/requests', (req: Request, res: Response) => {
  const partnerId = req.query.partnerId as string;
  const allSubmissions = financingRepository.getFinancingSubmissions();
  const submissions = partnerId ? allSubmissions.filter((s: any) => s.financialPartnerProfileId === partnerId) : allSubmissions;

  const enriched = submissions.map((sub: any) => {
    const request = financingRepository.getFinancingRequestById(sub.financingRequestId);
    const project = request ? financingRepository.getProjectById(request.projectId) : null;
    const infoRequests = financingRepository.getFinanceInformationRequests(sub.id);
    const offers = request ? financingRepository.getFinancingOffers(request.id).filter((o: any) => o.financialPartnerProfileId === sub.financialPartnerProfileId) : [];
    return {
      submission: sub,
      request,
      project,
      infoRequestsCount: infoRequests.length,
      offersCount: offers.length
    };
  });

  return res.json(enriched);
});

// 10. Partner Request Details with authorized data room
router.get('/financial-partners/requests/:submissionId', (req: Request, res: Response) => {
  const submissionId = getParam(req.params.submissionId);
  const submission = financingRepository.getFinancingSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const request = financingRepository.getFinancingRequestById(submission.financingRequestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  let currentSubmission = submission;
  // Mark viewed if not already
  if (!submission.viewedAt) {
    currentSubmission = financingRepository.updateFinancingSubmission(submission.id, { viewedAt: new Date().toISOString(), status: 'UNDER_REVIEW' }) || submission;
  }

  const project = financingRepository.getProjectById(request.projectId);
  const snapshots = financingRepository.getFinanceReadinessSnapshots(request.id);
  const readiness = snapshots[snapshots.length - 1];
  
  // Authorized documents only
  const allDocs = (project && financingRepository.getProjectDocuments) ? financingRepository.getProjectDocuments(project.id) : [];
  const authorizedDocs = allDocs.filter((d: any) => submission.authorizedDocumentIds.includes(d.id));

  const infoRequests = financingRepository.getFinanceInformationRequests(submission.id);
  const notes = financingRepository.getFinanceReviewNotes(submission.id);
  const offers = financingRepository.getFinancingOffers(request.id).filter((o: any) => o.financialPartnerProfileId === submission.financialPartnerProfileId);

  return res.json({
    submission: currentSubmission,
    request,
    project,
    readiness,
    authorizedDocuments: authorizedDocs,
    informationRequests: infoRequests,
    notes,
    offers
  });
});

// 11. Partner requests more information
router.post('/financial-partners/requests/:submissionId/request-info', (req: Request, res: Response) => {
  const submissionId = getParam(req.params.submissionId);
  const submission = financingRepository.getFinancingSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const infoReq = financingRepository.createFinanceInformationRequest({
    financingSubmissionId: submission.id,
    requestedByUserId: req.user.id,
    title: req.body.title || 'درخواست مستندات تکمیلی پرونده اعتباری',
    description: req.body.description || '',
    requiredDocumentTypes: req.body.requiredDocumentTypes || [],
    dueDate: req.body.dueDate
  });

  financingRepository.updateFinancingSubmission(submission.id, { status: 'MORE_INFO_REQUESTED' });
  const request = financingRepository.getFinancingRequestById(submission.financingRequestId);
  if (request) {
    financingRepository.updateFinancingRequest(request.id, { status: 'ADDITIONAL_INFO_REQUIRED' });
  }

  return res.json(infoReq);
});

// 12. Partner submits a Financing Offer
router.post('/financial-partners/requests/:submissionId/offers', (req: Request, res: Response) => {
  const submissionId = getParam(req.params.submissionId);
  const submission = financingRepository.getFinancingSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  const request = financingRepository.getFinancingRequestById(submission.financingRequestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  // STRICT VALIDATION: No invented interest rate
  if (req.body.interestRate === undefined || req.body.interestRate === null || isNaN(Number(req.body.interestRate)) || Number(req.body.interestRate) <= 0) {
    return res.status(400).json({ 
      error: 'نرخ سود پیشنهادی تسهیلات (interestRate) الزامی است و نباید به صورت پیش‌فرض یا فرضی ثبت شود.' 
    });
  }
  const interestRate = Number(req.body.interestRate);

  // STRICT VALIDATION: No invented offered amount
  if (req.body.offeredAmount === undefined || req.body.offeredAmount === null || isNaN(Number(req.body.offeredAmount)) || Number(req.body.offeredAmount) <= 0) {
    return res.status(400).json({ 
      error: 'مبلغ پیشنهادی تسهیلات (offeredAmount) مشخص نشده است و باید به طور معین توسط نهاد مالی اعلام شود.' 
    });
  }
  const offeredAmount = Number(req.body.offeredAmount);

  if (!req.body.tenorMonths || Number(req.body.tenorMonths) <= 0) {
    return res.status(400).json({ 
      error: 'مدت بازپرداخت (tenorMonths) الزامی است.' 
    });
  }
  const tenorMonths = Number(req.body.tenorMonths);
  const gracePeriodMonths = Number(req.body.gracePeriodMonths) || 0;
  const repaymentType = req.body.repaymentType || request.repaymentPreference || 'EQUAL_INSTALLMENT';

  const offer = financingRepository.createFinancingOffer({
    financingRequestId: request.id,
    financialPartnerProfileId: submission.financialPartnerProfileId,
    financingProductId: req.body.financingProductId,
    status: req.body.status || 'SUBMITTED',
    offeredAmount,
    interestRateType: req.body.interestRateType || 'FIXED',
    interestRate,
    tenorMonths,
    gracePeriodMonths,
    repaymentType,
    fees: req.body.fees || [],
    collateralRequirements: req.body.collateralRequirements || [],
    conditionsPrecedent: req.body.conditionsPrecedent || [],
    notes: req.body.notes || 'پیشنهاد تسهیلات نهاد مالی'
  });

  financingRepository.updateFinancingSubmission(submission.id, { status: 'OFFER_RECEIVED' });
  financingRepository.updateFinancingRequest(request.id, { status: 'OFFERS_RECEIVED' });

  return res.json(offer);
});

// 13. Get all offers for a financing request
router.get('/financing-requests/:id/offers', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const request = financingRepository.getFinancingRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const offers = financingRepository.getFinancingOffers(id);
  const partners = financingRepository.getFinancialPartnerProfiles();
  const enriched = offers.map((o: any) => ({
    ...o,
    partner: partners.find(p => p.id === o.financialPartnerProfileId)
  }));
  return res.json(enriched);
});

// 14. Compare all offers for a financing request
router.get('/financing-requests/:id/compare-offers', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const request = financingRepository.getFinancingRequestById(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const offers = financingRepository.getFinancingOffers(request.id);
  const partners = financingRepository.getFinancialPartnerProfiles();

  const comparisons = offers.map((offer: any) => {
    const summary = financingOfferComparisonService.enrichAndScoreOffer(offer, request);
    const partner = partners.find(p => p.id === offer.financialPartnerProfileId);
    return { ...summary, partner };
  }).sort((a: any, b: any) => b.comparisonScore - a.comparisonScore);

  return res.json(comparisons);
});

// 15. Owner selects preferred offer
router.post('/financing-offers/:id/select', (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const offer = financingRepository.getFinancingOfferById(id);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });

  const request = financingRepository.getFinancingRequestById(offer.financingRequestId);
  if (!request) return res.status(404).json({ error: 'Financing request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  // Update this offer to SELECTED
  financingRepository.updateFinancingOffer(offer.id, { status: 'SELECTED' });

  // Update request to OFFER_SELECTED
  financingRepository.updateFinancingRequest(request.id, { status: 'OFFER_SELECTED' });

  // Mark other offers as DECLINED
  const otherOffers = financingRepository.getFinancingOffers(request.id).filter((o: any) => o.id !== offer.id);
  otherOffers.forEach((o: any) => {
    financingRepository.updateFinancingOffer(o.id, { status: 'DECLINED' });
  });

  return res.json({ success: true, selectedOfferId: offer.id, status: 'OFFER_SELECTED' });
});

// 16. Record partner final approval and create Project Financing Record
router.post('/financing-offers/:id/record-partner-approval', idempotencyMiddleware('financing-approval'), (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const offer = financingRepository.getFinancingOfferById(id);
  if (!offer) return res.status(404).json({ error: 'Offer not found' });

  const request = financingRepository.getFinancingRequestById(offer.financingRequestId);
  if (!request) return res.status(404).json({ error: 'Financing request not found' });

  const access = checkProjectAccess(request.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  // Idempotency: Check if financing record already created for this offer
  const existingRecords = financingRepository.getProjectFinancingRecords(request.projectId);
  const alreadyApproved = existingRecords.find((r: any) => r.financingOfferId === offer.id);
  if (alreadyApproved) {
    const project = financingRepository.getProjectById(request.projectId);
    return res.json({
      success: true,
      financingRecord: alreadyApproved,
      projectStatus: project?.status,
      alreadyRecorded: true
    });
  }

  // Update offer and request status
  financingRepository.updateFinancingOffer(offer.id, { status: 'FINAL' });
  financingRepository.updateFinancingRequest(request.id, { status: 'APPROVED_BY_PARTNER' });

  // Create Project Financing Record
  const financingRecord = financingRepository.createProjectFinancingRecord({
    projectId: request.projectId,
    financingRequestId: request.id,
    financingOfferId: offer.id,
    financialPartnerProfileId: offer.financialPartnerProfileId,
    status: 'APPROVED',
    approvedAmount: offer.offeredAmount,
    currency: 'IRR',
    interestRate: offer.interestRate,
    tenorMonths: offer.tenorMonths,
    gracePeriodMonths: offer.gracePeriodMonths,
    repaymentType: offer.repaymentType,
    effectiveDate: new Date().toISOString()
  });

  // Transition project from FINANCING to PROCUREMENT if permissible
  const project = financingRepository.getProjectById(request.projectId);
  if (project && project.status === 'FINANCING') {
    if (canTransition(project.status, 'PROCUREMENT')) {
      financingRepository.updateProject(project.id, { status: 'PROCUREMENT' });
    }
  }

  return res.json({ success: true, financingRecord, projectStatus: project?.status });
});

// 17. Get project financing summary
router.get('/projects/:projectId/financing', (req: Request, res: Response) => {
  const projectId = getParam(req.params.projectId);
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    return res.status(access.status || 403).json({ error: access.error });
  }

  const records = financingRepository.getProjectFinancingRecords(projectId);
  const requests = financingRepository.getFinancingRequests(projectId);
  const activeRecord = records[records.length - 1];
  const activeRequest = requests[requests.length - 1];

  let partner = null;
  if (activeRecord) {
    partner = financingRepository.getFinancialPartnerProfileById(activeRecord.financialPartnerProfileId);
  }

  return res.json({
    activeRecord,
    activeRequest,
    partner,
    allRecords: records
  });
});

export default router;
