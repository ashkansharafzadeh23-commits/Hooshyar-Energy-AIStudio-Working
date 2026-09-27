import express from 'express';
import { verifyAuthToken, requireAuth } from './auth.js';
import { checkProjectAccess } from './projects.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { procurementRepository } from '../repositories/procurementRepository.js';
import { procurementService } from '../services/procurementService.js';

const procurementRouter = express.Router();

// Apply auth middleware to all procurement routes
procurementRouter.use(verifyAuthToken);
procurementRouter.use(requireAuth);

/**
 * Helper to resolve vendor ID for current authenticated user
 */
function getVendorIdForUser(user: any): string | null {
  if (!user) return null;
  if (user.vendorId) return user.vendorId;
  const vendors = (procurementRepository as any).getVendors?.() || [];
  const matched = vendors.find((v: any) => v.id === user.id || v.userId === user.id || v.ownerId === user.id);
  if (matched) return matched.id;
  if (user.role === 'vendor' || (Array.isArray(user.roles) && user.roles.includes('vendor'))) {
    return user.id;
  }
  return null;
}

/**
 * Helper to find BOQItem across projects deterministically
 */
function findBOQItemById(itemId: string) {
  const projects = projectRepository.findAll();
  for (const p of projects) {
    const items = procurementRepository.getBOQItemsByProjectId(p.id);
    const found = items.find(i => i.id === itemId);
    if (found) return found;
  }
  return null;
}

/**
 * Helper to find SupplierAward across projects
 */
function findSupplierAwardById(awardId: string) {
  const projects = projectRepository.findAll();
  for (const p of projects) {
    const awards = procurementRepository.getSupplierAwardsByProjectId(p.id);
    const found = awards.find(a => a.id === awardId);
    if (found) return found;
  }
  return null;
}

// ==========================================
// 1. BILL OF QUANTITIES (BOQ) & ITEMS
// ==========================================

// GET /api/projects/:projectId/boqs
procurementRouter.get('/projects/:projectId/boqs', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const boqs = procurementRepository.getBOQs(projectId);
  res.json(boqs);
});

// POST /api/projects/:projectId/boqs
procurementRouter.post('/projects/:projectId/boqs', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  // IDOR Protection: Always bind to route's projectId
  const boq = procurementRepository.createBOQ({
    ...req.body,
    projectId,
    createdByUserId: req.user.id,
    status: req.body.status || 'DRAFT',
    version: req.body.version || 1,
    currencyPreference: req.body.currencyPreference || 'USD'
  });
  res.status(201).json(boq);
});

// GET /api/boqs/:boqId
procurementRouter.get('/boqs/:boqId', (req, res) => {
  const boq = procurementRepository.getBOQById(req.params.boqId);
  if (!boq) return res.status(404).json({ error: 'BOQ not found' });

  const access = checkProjectAccess(boq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const items = procurementRepository.getBOQItems(boq.id);
  res.json({ ...boq, items });
});

// PATCH /api/boqs/:boqId
procurementRouter.patch('/boqs/:boqId', (req, res) => {
  const boq = procurementRepository.getBOQById(req.params.boqId);
  if (!boq) return res.status(404).json({ error: 'BOQ not found' });

  const access = checkProjectAccess(boq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  // IDOR Protection: Prevent changing immutable keys
  const safeUpdates = { ...req.body };
  delete safeUpdates.id;
  delete safeUpdates.projectId;
  delete safeUpdates.createdByUserId;

  const updated = procurementRepository.updateBOQ(boq.id, safeUpdates);
  res.json(updated);
});

// POST /api/boqs/:boqId/approve
procurementRouter.post('/boqs/:boqId/approve', (req, res) => {
  const boq = procurementRepository.getBOQById(req.params.boqId);
  if (!boq) return res.status(404).json({ error: 'BOQ not found' });

  const access = checkProjectAccess(boq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const updated = procurementRepository.updateBOQ(boq.id, {
    status: 'APPROVED',
    approvedAt: new Date().toISOString()
  });
  res.json(updated);
});

// GET /api/boqs/:boqId/items
procurementRouter.get('/boqs/:boqId/items', (req, res) => {
  const boq = procurementRepository.getBOQById(req.params.boqId);
  if (!boq) return res.status(404).json({ error: 'BOQ not found' });

  const access = checkProjectAccess(boq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const items = procurementRepository.getBOQItems(boq.id);
  res.json(items);
});

// POST /api/boqs/:boqId/items
procurementRouter.post('/boqs/:boqId/items', (req, res) => {
  const boq = procurementRepository.getBOQById(req.params.boqId);
  if (!boq) return res.status(404).json({ error: 'BOQ not found' });

  const access = checkProjectAccess(boq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  // IDOR Protection: Always derive projectId and boqId from parent BOQ
  const item = procurementRepository.createBOQItem({
    ...req.body,
    boqId: boq.id,
    projectId: boq.projectId,
    isSubstitutionAllowed: req.body.isSubstitutionAllowed ?? true
  });
  res.status(201).json(item);
});

// PATCH /api/boq-items/:id
procurementRouter.patch('/boq-items/:id', (req, res) => {
  const item = findBOQItemById(req.params.id);
  if (!item) return res.status(404).json({ error: 'BOQ item not found' });

  const access = checkProjectAccess(item.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const safeUpdates = { ...req.body };
  delete safeUpdates.id;
  delete safeUpdates.boqId;
  delete safeUpdates.projectId;

  const updated = procurementRepository.updateBOQItem(item.id, safeUpdates);
  res.json(updated);
});

// DELETE /api/boq-items/:id
procurementRouter.delete('/boq-items/:id', (req, res) => {
  const item = findBOQItemById(req.params.id);
  if (!item) return res.status(404).json({ error: 'BOQ item not found' });

  const access = checkProjectAccess(item.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  procurementRepository.deleteBOQItem(item.id);
  res.json({ success: true });
});

// ==========================================
// 2. PROCUREMENT RFQS & INVITATIONS
// ==========================================

// GET /api/projects/:projectId/rfqs
procurementRouter.get('/projects/:projectId/rfqs', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const rfqs = procurementRepository.getProcurementRFQs(projectId);
  res.json(rfqs);
});

// POST /api/projects/:projectId/rfqs
procurementRouter.post('/projects/:projectId/rfqs', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  // IDOR Protection: Always bind to route's projectId
  const rfq = procurementRepository.createProcurementRFQ({
    ...req.body,
    projectId,
    createdByUserId: req.user.id,
    status: req.body.status || 'DRAFT',
    visibility: req.body.visibility || 'INVITED_ONLY'
  });
  res.status(201).json(rfq);
});

// GET /api/rfqs/:id
procurementRouter.get('/rfqs/:id', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const invitations = procurementRepository.getSupplierInvitations(rfq.id);

  if (access.allowed) {
    // Project owner / member can see all quotes & invitations
    const quotes = procurementRepository.getVendorQuotes(rfq.id);
    return res.json({ ...rfq, invitations, quotes });
  }

  // Vendor privacy check: Vendor can only see the RFQ if invited or if public/open
  const isInvited = invitations.some(inv => inv.vendorId === vendorId);
  const isOpenToVendors = rfq.visibility === 'PUBLIC_MARKETPLACE' || (rfq.status === 'PUBLISHED' || rfq.status === 'OPEN');

  if (isInvited || isOpenToVendors) {
    // VENDOR PRIVACY: Never reveal other vendors' quotes or invitations!
    const myQuotes = procurementRepository.getVendorQuotes(rfq.id).filter(q => q.vendorId === vendorId || q.createdByUserId === req.user.id);
    const myInvitations = invitations.filter(inv => inv.vendorId === vendorId);
    return res.json({ ...rfq, invitations: myInvitations, quotes: myQuotes });
  }

  return res.status(403).json({ error: 'Access denied to this procurement RFQ' });
});

// PATCH /api/rfqs/:id
procurementRouter.patch('/rfqs/:id', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const safeUpdates = { ...req.body };
  delete safeUpdates.id;
  delete safeUpdates.projectId;
  delete safeUpdates.createdByUserId;

  const updated = procurementRepository.updateProcurementRFQ(rfq.id, safeUpdates);
  res.json(updated);
});

// POST /api/rfqs/:id/publish
procurementRouter.post('/rfqs/:id/publish', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const updated = procurementRepository.updateProcurementRFQ(rfq.id, {
    status: 'PUBLISHED',
    publishedAt: new Date().toISOString()
  });
  res.json(updated);
});

// POST /api/rfqs/:id/invite
procurementRouter.post('/rfqs/:id/invite', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  if (!req.body.vendorId) {
    return res.status(400).json({ error: 'vendorId is required' });
  }

  const inv = procurementRepository.createSupplierInvitation({
    procurementRfqId: rfq.id,
    vendorId: req.body.vendorId,
    status: 'INVITED'
  });
  res.status(201).json(inv);
});

// GET /api/rfqs/:id/invitations
procurementRouter.get('/rfqs/:id/invitations', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const invitations = procurementRepository.getSupplierInvitations(rfq.id);

  if (access.allowed) {
    return res.json(invitations);
  }

  // Vendor privacy: Return only current vendor's invitation
  const myInvitations = invitations.filter(i => i.vendorId === vendorId);
  res.json(myInvitations);
});

// ==========================================
// 3. SUPPLIER QUOTES & QUOTE ITEMS (VENDOR PRIVACY)
// ==========================================

// GET /api/rfqs/:id/quotes
procurementRouter.get('/rfqs/:id/quotes', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;

  if (access.allowed) {
    // Project owner/member can view all quotes
    const quotes = procurementRepository.getVendorQuotes(rfq.id);
    return res.json(quotes);
  }

  // VENDOR PRIVACY: Vendor A must never see Vendor B private quote details!
  const myQuotes = procurementRepository.getVendorQuotes(rfq.id).filter(
    q => q.vendorId === vendorId || q.createdByUserId === req.user.id
  );
  res.json(myQuotes);
});

// POST /api/rfqs/:id/quotes
procurementRouter.post('/rfqs/:id/quotes', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  // IDOR Protection: Always derive projectId from parent RFQ
  const userVendorId = getVendorIdForUser(req.user);
  const effectiveVendorId = userVendorId || req.body.vendorId || req.user.id;

  const quote = procurementRepository.createVendorQuote({
    ...req.body,
    procurementRfqId: rfq.id,
    projectId: rfq.projectId,
    vendorId: effectiveVendorId,
    createdByUserId: req.user.id,
    status: 'DRAFT',
    currency: req.body.currency || rfq.currency || 'USD',
    subtotal: req.body.subtotal || 0,
    tax: req.body.tax || 0,
    transportationCost: req.body.transportationCost || 0,
    otherCost: req.body.otherCost || 0,
    totalPrice: req.body.totalPrice || req.body.subtotal || 0,
    deliveryLeadTimeDays: req.body.deliveryLeadTimeDays || 30,
    validUntil: req.body.validUntil || new Date(Date.now() + 30 * 86400000).toISOString(),
    paymentTerms: req.body.paymentTerms || '',
    warrantySummary: req.body.warrantySummary || '',
    quoteItems: req.body.quoteItems || [],
    attachments: req.body.attachments || []
  });

  res.status(201).json(quote);
});

// GET /api/quotes/:id
procurementRouter.get('/quotes/:id', (req, res) => {
  const quote = procurementRepository.getVendorQuoteById(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const access = checkProjectAccess(quote.projectId, req.user?.id, req.user?.role);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;

  // Vendor privacy: Only project members OR the quote's vendor can view the quote
  if (!access.allowed && quote.vendorId !== vendorId && quote.createdByUserId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied to this quote' });
  }

  const items = procurementRepository.getVendorQuoteItems(quote.id);
  res.json({ ...quote, items });
});

// PATCH /api/quotes/:id
procurementRouter.patch('/quotes/:id', (req, res) => {
  const quote = procurementRepository.getVendorQuoteById(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const isOwnerVendor = quote.vendorId === vendorId || quote.createdByUserId === req.user.id;
  const isSuper = req.user.role === 'admin';

  if (!isOwnerVendor && !isSuper) {
    return res.status(403).json({ error: 'Only the submitting vendor can edit this quote' });
  }

  // IDOR Protection: Prevent altering parent references
  const safeUpdates = { ...req.body };
  delete safeUpdates.id;
  delete safeUpdates.procurementRfqId;
  delete safeUpdates.projectId;
  delete safeUpdates.vendorId;
  delete safeUpdates.createdByUserId;

  const updated = procurementRepository.updateVendorQuote(quote.id, safeUpdates);
  res.json(updated);
});

// POST /api/quotes/:id/submit
procurementRouter.post('/quotes/:id/submit', (req, res) => {
  const quote = procurementRepository.getVendorQuoteById(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const isOwnerVendor = quote.vendorId === vendorId || quote.createdByUserId === req.user.id;
  const isSuper = req.user.role === 'admin';

  if (!isOwnerVendor && !isSuper) {
    return res.status(403).json({ error: 'Only the submitting vendor can submit this quote' });
  }

  const updated = procurementRepository.updateVendorQuote(quote.id, {
    status: 'SUBMITTED',
    submittedAt: new Date().toISOString()
  });
  res.json(updated);
});

// GET /api/quotes/:quoteId/items
procurementRouter.get('/quotes/:quoteId/items', (req, res) => {
  const quote = procurementRepository.getVendorQuoteById(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const access = checkProjectAccess(quote.projectId, req.user?.id, req.user?.role);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;

  if (!access.allowed && quote.vendorId !== vendorId && quote.createdByUserId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const items = procurementRepository.getVendorQuoteItems(quote.id);
  res.json(items);
});

// POST /api/quotes/:quoteId/items
procurementRouter.post('/quotes/:quoteId/items', (req, res) => {
  const quote = procurementRepository.getVendorQuoteById(req.params.quoteId);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const isOwnerVendor = quote.vendorId === vendorId || quote.createdByUserId === req.user.id;
  if (!isOwnerVendor && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the quote creator can add items' });
  }

  const item = procurementRepository.createVendorQuoteItem({
    ...req.body,
    quoteId: quote.id,
    currency: req.body.currency || quote.currency,
    stockStatus: req.body.stockStatus || 'IN_STOCK',
    isEquivalent: req.body.isEquivalent ?? false
  });
  res.status(201).json(item);
});

// ==========================================
// 4. QUOTE COMPARISON & SUPPLIER AWARD
// ==========================================

// GET /api/rfqs/:id/compare
procurementRouter.get('/rfqs/:id/compare', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) {
    // VENDOR PRIVACY: Vendors must NEVER see cross-vendor quote comparison!
    return res.status(access.status || 403).json({ error: 'Only project team can view quote comparison' });
  }

  try {
    const comparison = procurementService.compareQuotes(rfq.id);
    res.json(comparison);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Comparison failed' });
  }
});

// POST /api/rfqs/:id/award
procurementRouter.post('/rfqs/:id/award', (req, res) => {
  const rfq = procurementRepository.getProcurementRFQById(req.params.id);
  if (!rfq) return res.status(404).json({ error: 'RFQ not found' });

  const access = checkProjectAccess(rfq.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const quoteId = req.body.vendorQuoteId || req.body.quoteId;
  if (!quoteId) return res.status(400).json({ error: 'vendorQuoteId is required' });

  try {
    const award = procurementService.awardSupplier(rfq.id, quoteId, req.user.id);
    res.status(201).json(award);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Supplier award failed' });
  }
});

// GET /api/projects/:projectId/awards
procurementRouter.get('/projects/:projectId/awards', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const awards = procurementRepository.getSupplierAwardsByProjectId(projectId);
  res.json(awards);
});

// ==========================================
// 5. PURCHASE ORDERS & PO ITEMS
// ==========================================

// GET /api/projects/:projectId/purchase-orders
procurementRouter.get('/projects/:projectId/purchase-orders', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  const pos = procurementRepository.getPurchaseOrders(projectId);

  if (access.allowed) {
    return res.json(pos);
  }

  // Vendor privacy: Vendor only sees POs issued to them
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const vendorPOs = pos.filter(p => p.vendorId === vendorId);
  res.json(vendorPOs);
});

// POST /api/projects/:projectId/purchase-orders
procurementRouter.post('/projects/:projectId/purchase-orders', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  // IDOR Protection: Bind strictly to route's projectId
  const po = procurementRepository.createPurchaseOrder({
    ...req.body,
    projectId,
    createdByUserId: req.user.id,
    status: req.body.status || 'DRAFT',
    items: req.body.items || []
  });
  res.status(201).json(po);
});

// POST /api/purchase-orders/from-award/:awardId
procurementRouter.post('/purchase-orders/from-award/:awardId', (req, res) => {
  const award = findSupplierAwardById(req.params.awardId);
  if (!award) return res.status(404).json({ error: 'Supplier award not found' });

  const access = checkProjectAccess(award.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  try {
    const po = procurementService.createPurchaseOrderFromAward(award.id, req.user.id, req.body);
    res.status(201).json(po);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'PO creation failed' });
  }
});

// GET /api/purchase-orders/:id
procurementRouter.get('/purchase-orders/:id', (req, res) => {
  const po = procurementRepository.getPurchaseOrderById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });

  const access = checkProjectAccess(po.projectId, req.user?.id, req.user?.role);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;

  // Vendor privacy: Vendor can only access their own awarded PO
  if (!access.allowed && po.vendorId !== vendorId) {
    return res.status(403).json({ error: 'Access denied to this purchase order' });
  }

  const items = procurementRepository.getPurchaseOrderItems(po.id);
  const deliveries = procurementRepository.getDeliveryRecords(po.id);
  res.json({ ...po, items, deliveries });
});

// PATCH /api/purchase-orders/:id
procurementRouter.patch('/purchase-orders/:id', (req, res) => {
  const po = procurementRepository.getPurchaseOrderById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });

  const access = checkProjectAccess(po.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const safeUpdates = { ...req.body };
  delete safeUpdates.id;
  delete safeUpdates.projectId;
  delete safeUpdates.createdByUserId;

  const updated = procurementRepository.updatePurchaseOrder(po.id, safeUpdates);
  res.json(updated);
});

// POST /api/purchase-orders/:id/issue
procurementRouter.post('/purchase-orders/:id/issue', (req, res) => {
  const po = procurementRepository.getPurchaseOrderById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });

  const access = checkProjectAccess(po.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const updated = procurementRepository.updatePurchaseOrder(po.id, {
    status: 'ISSUED',
    issueDate: new Date().toISOString()
  });
  res.json(updated);
});

// POST /api/purchase-orders/:id/items
procurementRouter.post('/purchase-orders/:id/items', (req, res) => {
  const po = procurementRepository.getPurchaseOrderById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });

  const access = checkProjectAccess(po.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const item = procurementRepository.createPurchaseOrderItem({
    ...req.body,
    purchaseOrderId: po.id
  });
  res.status(201).json(item);
});

// ==========================================
// 6. DELIVERIES, INSPECTION & ACCEPTANCE
// ==========================================

// GET /api/projects/:projectId/deliveries
procurementRouter.get('/projects/:projectId/deliveries', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  const deliveries = procurementRepository.getDeliveryRecordsByProjectId(projectId);

  if (access.allowed) {
    return res.json(deliveries);
  }

  // Vendor privacy: Filter deliveries for POs awarded to this vendor
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const vendorDeliveries = deliveries.filter(d => {
    const po = procurementRepository.getPurchaseOrderById(d.purchaseOrderId);
    return po && po.vendorId === vendorId;
  });
  res.json(vendorDeliveries);
});

// POST /api/purchase-orders/:id/deliveries
procurementRouter.post('/purchase-orders/:id/deliveries', (req, res) => {
  const po = procurementRepository.getPurchaseOrderById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Purchase order not found' });

  const access = checkProjectAccess(po.projectId, req.user?.id, req.user?.role);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const isVendor = po.vendorId === vendorId;

  if (!access.allowed && !isVendor) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // IDOR Protection: Always derive projectId from parent PurchaseOrder!
  try {
    if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      const delivery = procurementService.recordDelivery(
        po.projectId,
        po.id,
        req.user.id,
        req.body.items,
        {
          deliveryNumber: req.body.deliveryNumber,
          notes: req.body.notes,
          documents: req.body.documents
        }
      );
      return res.status(201).json(delivery);
    }

    const delivery = procurementRepository.createDeliveryRecord({
      purchaseOrderId: po.id,
      projectId: po.projectId,
      status: 'EXPECTED',
      deliveryDate: req.body.deliveryDate || new Date().toISOString(),
      receivedByUserId: req.user.id,
      items: [],
      documents: req.body.documents || [],
      notes: req.body.notes || ''
    });
    res.status(201).json(delivery);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record delivery' });
  }
});

// GET /api/deliveries/:id
procurementRouter.get('/deliveries/:id', (req, res) => {
  const delivery = procurementRepository.getDeliveryRecordById(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

  const access = checkProjectAccess(delivery.projectId, req.user?.id, req.user?.role);
  const po = procurementRepository.getPurchaseOrderById(delivery.purchaseOrderId);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;

  if (!access.allowed && (!po || po.vendorId !== vendorId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const items = procurementRepository.getDeliveryItems(delivery.id);
  const inspections = procurementRepository.getDeliveryInspections(delivery.id);
  res.json({ ...delivery, items, inspections });
});

// PATCH /api/deliveries/:id
procurementRouter.patch('/deliveries/:id', (req, res) => {
  const delivery = procurementRepository.getDeliveryRecordById(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

  const access = checkProjectAccess(delivery.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const safeUpdates = { ...req.body };
  delete safeUpdates.id;
  delete safeUpdates.projectId;
  delete safeUpdates.purchaseOrderId;

  const updated = procurementRepository.updateDeliveryRecord(delivery.id, safeUpdates);
  res.json(updated);
});

// POST /api/deliveries/:id/inspect
procurementRouter.post('/deliveries/:id/inspect', (req, res) => {
  const delivery = procurementRepository.getDeliveryRecordById(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

  // Inspection must be performed by authorized project team, NOT the vendor
  const access = checkProjectAccess(delivery.projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  try {
    const result = procurementService.inspectAndAcceptDelivery(
      delivery.projectId,
      delivery.id,
      req.user.id,
      req.body.inspectionStatus || 'PASSED',
      req.body.itemAcceptances || [],
      req.body.notes
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Delivery inspection failed' });
  }
});

// GET /api/deliveries/:id/inspections
procurementRouter.get('/deliveries/:id/inspections', (req, res) => {
  const delivery = procurementRepository.getDeliveryRecordById(req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery record not found' });

  const access = checkProjectAccess(delivery.projectId, req.user?.id, req.user?.role);
  const po = procurementRepository.getPurchaseOrderById(delivery.purchaseOrderId);
  const vendorId = getVendorIdForUser(req.user) || req.user.id;

  if (!access.allowed && (!po || po.vendorId !== vendorId)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const inspections = procurementRepository.getDeliveryInspections(delivery.id);
  res.json(inspections);
});

// ==========================================
// 7. DETERMINISTIC PROCUREMENT PROGRESS
// ==========================================

// GET /api/projects/:projectId/procurement-progress
procurementRouter.get('/projects/:projectId/procurement-progress', (req, res) => {
  const { projectId } = req.params;
  const access = checkProjectAccess(projectId, req.user?.id, req.user?.role);
  if (!access.allowed) return res.status(access.status || 403).json({ error: access.error });

  const progress = procurementService.calculateProgress(projectId);
  res.json(progress);
});

// ==========================================
// 8. VENDOR SELF-SERVICE PORTAL ROUTES
// ==========================================

// GET /api/vendor/invitations
procurementRouter.get('/vendor/invitations', (req, res) => {
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const invitations = procurementRepository.getSupplierInvitationByVendorId(vendorId);
  res.json(invitations);
});

// GET /api/vendor/quotes
procurementRouter.get('/vendor/quotes', (req, res) => {
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const projects = projectRepository.findAll();
  const allQuotes: any[] = [];

  projects.forEach(p => {
    const rfqs = procurementRepository.getProcurementRFQs(p.id);
    rfqs.forEach(r => {
      const quotes = procurementRepository.getVendorQuotes(r.id);
      const myQuotes = quotes.filter(q => q.vendorId === vendorId || q.createdByUserId === req.user.id);
      allQuotes.push(...myQuotes);
    });
  });

  res.json(allQuotes);
});

// GET /api/vendor/purchase-orders
procurementRouter.get('/vendor/purchase-orders', (req, res) => {
  const vendorId = getVendorIdForUser(req.user) || req.user.id;
  const projects = projectRepository.findAll();
  const allPOs: any[] = [];

  projects.forEach(p => {
    const pos = procurementRepository.getPurchaseOrders(p.id);
    const myPOs = pos.filter(po => po.vendorId === vendorId);
    allPOs.push(...myPOs);
  });

  res.json(allPOs);
});

export default procurementRouter;
