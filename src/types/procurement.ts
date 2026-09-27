export type BOQStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'SUPERSEDED' | 'ARCHIVED';
export type BOQItemCategory = 'SOLAR_PANEL' | 'INVERTER' | 'BATTERY' | 'GENERATOR' | 'MOUNTING_STRUCTURE' | 'DC_CABLE' | 'AC_CABLE' | 'CONNECTOR' | 'COMBINER_BOX' | 'DC_PROTECTION' | 'AC_PROTECTION' | 'TRANSFORMER' | 'METERING' | 'MONITORING_SYSTEM' | 'EARTHING' | 'LIGHTNING_PROTECTION' | 'SWITCHGEAR' | 'CONTROL_PANEL' | 'CIVIL_MATERIAL' | 'SPARE_PART' | 'OTHER';
export type BOQUnit = 'PCS' | 'SET' | 'METER' | 'KM' | 'KG' | 'TON' | 'LOT' | 'KWH' | 'KW' | 'KVA' | 'M2' | 'OTHER';

export interface BOQItem {
  id: string;
  boqId: string;
  projectId: string;
  category: BOQItemCategory;
  itemType: string;
  description: string;
  manufacturerPreference?: string;
  brandPreference?: string;
  modelPreference?: string;
  technicalSpecification?: string;
  quantity: number;
  unit: BOQUnit;
  estimatedUnitPrice?: number;
  estimatedTotalPrice?: number;
  currency: string;
  requiredDeliveryDate?: string;
  requiredWarrantyYears?: number;
  isSubstitutionAllowed: boolean;
  approvedEquivalentNotes?: string;
  engineeringReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillOfQuantities {
  id: string;
  boqCode: string;
  projectId: string;
  contractId?: string;
  engineeringDesignId?: string;
  title: string;
  status: BOQStatus;
  version: number;
  currencyPreference: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export type ProcurementRFQStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'QUOTES_RECEIVED' | 'CLOSED' | 'AWARDED' | 'CANCELLED';
export type ProcurementRFQVisibility = 'INVITED_ONLY' | 'VERIFIED_VENDORS' | 'PUBLIC_MARKETPLACE';

export interface ProcurementRFQ {
  id: string;
  procurementRfqCode: string;
  projectId: string;
  boqId: string;
  createdByUserId: string;
  status: ProcurementRFQStatus;
  title: string;
  description: string;
  submissionDeadline: string;
  deliveryLocation: string;
  currency: string;
  paymentTermPreference?: string;
  deliveryTerm?: string;
  warrantyRequirement?: string;
  visibility: ProcurementRFQVisibility;
  createdAt: string;
  publishedAt?: string;
  closedAt?: string;
}

export interface ProcurementPackage {
  id: string;
  projectId: string;
  boqId: string;
  name: string;
  packageType: string;
  boqItemIds: string[];
  status: string;
}

export type SupplierInvitationStatus = 'INVITED' | 'VIEWED' | 'DECLINED' | 'QUOTE_SUBMITTED' | 'EXPIRED';

export interface SupplierInvitation {
  id: string;
  procurementRfqId: string;
  vendorId: string;
  status: SupplierInvitationStatus;
  invitedAt: string;
  viewedAt?: string;
  respondedAt?: string;
}

export type VendorQuoteStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN';

export interface VendorQuote {
  id: string;
  quoteCode: string;
  procurementRfqId: string;
  projectId: string;
  vendorId: string;
  organizationId?: string;
  status: VendorQuoteStatus;
  currency: string;
  subtotal: number;
  tax: number;
  transportationCost: number;
  otherCost: number;
  totalPrice: number;
  deliveryLeadTimeDays: number;
  validUntil: string;
  paymentTerms: string;
  warrantySummary: string;
  quoteItems: string[]; // array of VendorQuoteItem IDs
  attachments: string[];
  assumptions?: string;
  exclusions?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export type StockStatus = 'IN_STOCK' | 'LIMITED' | 'ORDER_REQUIRED' | 'IMPORT_REQUIRED' | 'UNKNOWN';

export interface VendorQuoteItem {
  id: string;
  quoteId: string;
  boqItemId: string;
  offeredBrand?: string;
  offeredModel?: string;
  technicalSpecification?: string;
  quantity: number;
  unit: BOQUnit;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  countryOfOrigin?: string;
  warrantyYears?: number;
  deliveryLeadTimeDays?: number;
  stockStatus: StockStatus;
  isEquivalent: boolean;
  equivalenceNotes?: string;
}

export type SupplierAwardStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED';

export interface SupplierAward {
  id: string;
  projectId: string;
  procurementRfqId: string;
  vendorQuoteId: string;
  boqItemIds: string[];
  awardedValue: number;
  status: SupplierAwardStatus;
  createdAt: string;
}

export type PurchaseOrderStatus = 'DRAFT' | 'ISSUED' | 'ACKNOWLEDGED' | 'IN_PRODUCTION' | 'READY_TO_SHIP' | 'IN_TRANSIT' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED' | 'CLOSED';

export interface PurchaseOrder {
  id: string;
  poCode: string;
  orderNumber?: string;
  projectId: string;
  contractId?: string;
  vendorId: string;
  supplierAwardId: string;
  status: PurchaseOrderStatus;
  currency: string;
  totalValue: number;
  totalAmount?: number;
  issueDate: string;
  expectedDeliveryDate: string;
  deliveryExpectedDate?: string;
  deliveryLocation: string;
  paymentTermsSummary: string;
  warrantySummary: string;
  items: any[];
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type Delivery = DeliveryRecord;

export type DeliveryRecordStatus = 'EXPECTED' | 'PARTIAL' | 'RECEIVED' | 'REJECTED' | 'DAMAGED';

export interface DeliveryRecord {
  id: string;
  purchaseOrderId: string;
  projectId: string;
  deliveryNumber: string;
  waybillNumber?: string;
  carrierName?: string;
  dispatchDate?: string;
  actualArrivalDate?: string;
  receivedBy?: string;
  status: DeliveryRecordStatus;
  deliveryDate: string;
  receivedByUserId: string;
  items: any[];
  documents: string[];
  notes?: string;
  createdAt: string;
}

export interface VendorQuoteRevision {
  id: string;
  quoteId: string;
  revisionNumber: number;
  snapshot: any;
  changeSummary?: string;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  boqItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
}

export interface DeliveryItem {
  id: string;
  deliveryRecordId: string;
  purchaseOrderItemId: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damageNotes?: string;
  serialNumbers?: string[];
}

export interface EquipmentWarranty {
  id: string;
  projectId: string;
  purchaseOrderId: string;
  boqItemId: string;
  manufacturer: string;
  model: string;
  warrantyStart: string;
  warrantyEnd: string;
  warrantyType: string;
  documentId?: string;
}

export interface QuoteComparisonItem {
  quoteId: string;
  quoteCode: string;
  vendorId: string;
  vendorName?: string;
  totalPrice: number;
  currency: string;
  deliveryLeadTimeDays: number;
  warrantySummary: string;
  paymentTerms: string;
  itemCount: number;
  status: VendorQuoteStatus;
  subtotal: number;
  tax: number;
  transportationCost: number;
}

export interface QuoteComparison {
  rfqId: string;
  projectId: string;
  rfqCode: string;
  quotes: QuoteComparisonItem[];
  cheapestQuoteId?: string;
  fastestLeadTimeQuoteId?: string;
  generatedAt: string;
}

export interface ProcurementProgressMetrics {
  projectId: string;
  totalBoqItemsCount: number;
  orderedItemsCount: number;
  deliveredItemsCount: number;
  acceptedItemsCount: number;
  
  estimatedTotalCost: number;
  orderedCost: number;
  deliveredCost: number;
  acceptedCost: number;
  
  orderedQuantity: number;
  deliveredQuantity: number;
  acceptedQuantity: number;
  
  completionPercentage: number;
  hasInsufficientData: boolean;
  currency: string;
}

export interface DeliveryInspection {
  id: string;
  deliveryRecordId: string;
  projectId: string;
  purchaseOrderId: string;
  inspectedByUserId: string;
  inspectionDate: string;
  status: 'PASSED' | 'FAILED' | 'CONDITIONALLY_ACCEPTED';
  notes?: string;
  items: {
    deliveryItemId: string;
    acceptedQuantity: number;
    rejectedQuantity: number;
    defectReason?: string;
  }[];
  createdAt: string;
}

