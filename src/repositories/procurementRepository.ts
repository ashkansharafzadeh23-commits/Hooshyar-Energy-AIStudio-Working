import { db } from '../db/index.js';
import { 
  BillOfQuantities, 
  BOQItem, 
  ProcurementRFQ, 
  SupplierInvitation, 
  VendorQuote, 
  VendorQuoteItem, 
  SupplierAward, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  DeliveryRecord, 
  DeliveryItem,
  DeliveryInspection
} from '../types/procurement.js';

export const procurementRepository = {
  // BOQ
  getPackages: (projectId?: string): any[] => {
    return (db as any).getProcurementPackages ? (db as any).getProcurementPackages(projectId) : [];
  },
  getRFQs: (projectId?: string): any[] => {
    return (db as any).getProcurementRFQsByProjectId ? (db as any).getProcurementRFQsByProjectId(projectId) : [];
  },
  getDeliveryInspectionsByProjectId: (projectId?: string): any[] => {
    return (db as any).getDeliveryInspectionsByProjectId ? (db as any).getDeliveryInspectionsByProjectId(projectId) : [];
  },
  getBOQs: (projectId?: string): BillOfQuantities[] => db.getBOQs(projectId),
  getBOQById: (id: string): BillOfQuantities | undefined => db.getBOQById(id),
  createBOQ: (boq: Omit<BillOfQuantities, 'id' | 'createdAt' | 'updatedAt' | 'boqCode'> & Partial<Pick<BillOfQuantities, 'boqCode'>>): BillOfQuantities => db.createBOQ(boq),
  updateBOQ: (id: string, updates: Partial<BillOfQuantities>): BillOfQuantities | null => db.updateBOQ(id, updates),

  // BOQ Items
  getBOQItems: (boqId: string): BOQItem[] => db.getBOQItems(boqId),
  getBOQItemsByProjectId: (projectId: string): BOQItem[] => db.getBOQItemsByProjectId(projectId),
  createBOQItem: (item: Omit<BOQItem, 'id' | 'createdAt' | 'updatedAt'>): BOQItem => db.createBOQItem(item),
  updateBOQItem: (id: string, updates: Partial<BOQItem>): BOQItem | null => db.updateBOQItem(id, updates),
  deleteBOQItem: (id: string): void => db.deleteBOQItem(id),

  // RFQ
  getProcurementRFQs: (projectId: string): ProcurementRFQ[] => db.getProcurementRFQs(projectId),
  getProcurementRFQById: (id: string): ProcurementRFQ | undefined => db.getProcurementRFQById(id),
  createProcurementRFQ: (rfq: Omit<ProcurementRFQ, 'id' | 'createdAt' | 'procurementRfqCode'> & Partial<Pick<ProcurementRFQ, 'procurementRfqCode'>>): ProcurementRFQ => db.createProcurementRFQ(rfq),
  updateProcurementRFQ: (id: string, updates: Partial<ProcurementRFQ>): ProcurementRFQ | null => db.updateProcurementRFQ(id, updates),

  // Supplier Invitations
  getSupplierInvitations: (rfqId: string): SupplierInvitation[] => db.getSupplierInvitations(rfqId),
  getSupplierInvitationByVendorId: (vendorId: string): SupplierInvitation[] => db.getSupplierInvitationByVendorId(vendorId),
  createSupplierInvitation: (inv: Omit<SupplierInvitation, 'id' | 'invitedAt'>): SupplierInvitation => db.createSupplierInvitation(inv),
  updateSupplierInvitation: (id: string, updates: Partial<SupplierInvitation>): SupplierInvitation | null => db.updateSupplierInvitation(id, updates),

  // Quotes
  getVendorQuotes: (rfqId: string): VendorQuote[] => db.getVendorQuotes(rfqId),
  getVendorQuoteById: (id: string): VendorQuote | undefined => db.getVendorQuoteById(id),
  createVendorQuote: (quote: Omit<VendorQuote, 'id' | 'createdAt' | 'updatedAt' | 'quoteCode'> & Partial<Pick<VendorQuote, 'quoteCode'>>): VendorQuote => db.createVendorQuote(quote),
  updateVendorQuote: (id: string, updates: Partial<VendorQuote>): VendorQuote | null => db.updateVendorQuote(id, updates),

  // Quote Items
  getVendorQuoteItems: (quoteId: string): VendorQuoteItem[] => db.getVendorQuoteItems(quoteId),
  createVendorQuoteItem: (item: Omit<VendorQuoteItem, 'id'>): VendorQuoteItem => db.createVendorQuoteItem(item),
  updateVendorQuoteItem: (id: string, updates: Partial<VendorQuoteItem>): VendorQuoteItem | null => db.updateVendorQuoteItem(id, updates),

  // Awards
  getSupplierAwards: (rfqId: string): SupplierAward[] => db.getSupplierAwards(rfqId),
  getSupplierAwardsByProjectId: (projectId: string): SupplierAward[] => db.getSupplierAwardsByProjectId(projectId),
  createSupplierAward: (award: Omit<SupplierAward, 'id' | 'createdAt'>): SupplierAward => db.createSupplierAward(award),
  updateSupplierAward: (id: string, updates: Partial<SupplierAward>): SupplierAward | null => db.updateSupplierAward(id, updates),

  // Purchase Orders
  getPurchaseOrders: (projectId?: string): PurchaseOrder[] => db.getPurchaseOrders(projectId),
  getPurchaseOrderById: (id: string): PurchaseOrder | undefined => db.getPurchaseOrderById(id),
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt' | 'poCode'> & Partial<Pick<PurchaseOrder, 'poCode'>>): PurchaseOrder => db.createPurchaseOrder(po),
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>): PurchaseOrder | null => db.updatePurchaseOrder(id, updates),

  // PO Items
  getPurchaseOrderItems: (poId: string): PurchaseOrderItem[] => db.getPurchaseOrderItems(poId),
  createPurchaseOrderItem: (item: Omit<PurchaseOrderItem, 'id'>): PurchaseOrderItem => db.createPurchaseOrderItem(item),

  // Deliveries
  getDeliveryRecords: (poId: string): DeliveryRecord[] => db.getDeliveryRecords(poId),
  getDeliveryRecordsByProjectId: (projectId?: string): DeliveryRecord[] => db.getDeliveryRecordsByProjectId(projectId),
  getDeliveryRecordById: (id: string): DeliveryRecord | undefined => db.getDeliveryRecordById(id),
  createDeliveryRecord: (rec: Omit<DeliveryRecord, 'id' | 'createdAt' | 'deliveryNumber'> & Partial<Pick<DeliveryRecord, 'deliveryNumber'>>): DeliveryRecord => db.createDeliveryRecord(rec),
  updateDeliveryRecord: (id: string, updates: Partial<DeliveryRecord>): DeliveryRecord | null => db.updateDeliveryRecord(id, updates),

  // Delivery Items
  getDeliveryItems: (deliveryRecordId: string): DeliveryItem[] => db.getDeliveryItems(deliveryRecordId),
  createDeliveryItem: (item: Omit<DeliveryItem, 'id'>): DeliveryItem => db.createDeliveryItem(item),
  updateDeliveryItem: (id: string, updates: Partial<DeliveryItem>): DeliveryItem | null => db.updateDeliveryItem(id, updates),

  // Inspections
  getDeliveryInspections: (deliveryRecordId: string): DeliveryInspection[] => db.getDeliveryInspections(deliveryRecordId),
  createDeliveryInspection: (inspection: Omit<DeliveryInspection, 'id' | 'createdAt'>): DeliveryInspection => db.createDeliveryInspection(inspection)
};
