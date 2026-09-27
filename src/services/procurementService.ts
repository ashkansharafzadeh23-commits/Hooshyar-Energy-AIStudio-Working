import { procurementRepository } from '../repositories/procurementRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import {
  BillOfQuantities,
  BOQItem,
  ProcurementRFQ,
  VendorQuote,
  QuoteComparison,
  QuoteComparisonItem,
  SupplierAward,
  PurchaseOrder,
  PurchaseOrderItem,
  DeliveryRecord,
  DeliveryItem,
  DeliveryInspection,
  ProcurementProgressMetrics
} from '../types/procurement.js';

export class ProcurementService {
  /**
   * Calculate deterministic procurement progress based on REAL stored data.
   * No invented or fabricated numbers.
   */
  calculateProgress(projectId: string): ProcurementProgressMetrics {
    const boqs = procurementRepository.getBOQs(projectId);
    const boqItems: BOQItem[] = [];
    boqs.forEach(b => {
      const items = procurementRepository.getBOQItems(b.id);
      boqItems.push(...items);
    });

    const pos = procurementRepository.getPurchaseOrders(projectId);
    const deliveryRecords = procurementRepository.getDeliveryRecordsByProjectId(projectId);

    // If no BOQ items exist, we flag INSUFFICIENT_DATA
    if (boqItems.length === 0) {
      return {
        projectId,
        totalBoqItemsCount: 0,
        orderedItemsCount: 0,
        deliveredItemsCount: 0,
        acceptedItemsCount: 0,
        estimatedTotalCost: 0,
        orderedCost: 0,
        deliveredCost: 0,
        acceptedCost: 0,
        orderedQuantity: 0,
        deliveredQuantity: 0,
        acceptedQuantity: 0,
        completionPercentage: 0,
        hasInsufficientData: true,
        currency: 'USD'
      };
    }

    const currency = boqItems[0]?.currency || pos[0]?.currency || 'USD';

    // Total estimated cost & quantity from BOQs
    let estimatedTotalCost = 0;
    boqItems.forEach(item => {
      const lineCost = item.estimatedTotalPrice ?? (item.quantity * (item.estimatedUnitPrice || 0));
      estimatedTotalCost += lineCost;
    });

    // PO calculations
    let orderedCost = 0;
    let orderedQuantity = 0;
    const poItemMap = new Map<string, PurchaseOrderItem>();

    pos.forEach(po => {
      orderedCost += po.totalValue || 0;
      const poItems = procurementRepository.getPurchaseOrderItems(po.id);
      poItems.forEach(pi => {
        poItemMap.set(pi.id, pi);
        orderedQuantity += pi.quantity || 0;
      });
    });

    // Delivery calculations
    let deliveredQuantity = 0;
    let acceptedQuantity = 0;
    let deliveredCost = 0;
    let acceptedCost = 0;
    let deliveredItemsCount = 0;
    let acceptedItemsCount = 0;

    deliveryRecords.forEach(dr => {
      const dItems = procurementRepository.getDeliveryItems(dr.id);
      dItems.forEach(di => {
        const poItem = poItemMap.get(di.purchaseOrderItemId);
        const unitPrice = poItem ? poItem.unitPrice : 0;

        deliveredQuantity += di.deliveredQuantity || 0;
        acceptedQuantity += di.acceptedQuantity || 0;

        deliveredCost += (di.deliveredQuantity || 0) * unitPrice;
        acceptedCost += (di.acceptedQuantity || 0) * unitPrice;

        if ((di.deliveredQuantity || 0) > 0) deliveredItemsCount++;
        if ((di.acceptedQuantity || 0) > 0) acceptedItemsCount++;
      });
    });

    // Completion percentage:
    // If orderedCost is greater than 0, base completion on acceptedCost / orderedCost
    // Otherwise, if orderedQuantity > 0, base on acceptedQuantity / orderedQuantity
    let completionPercentage = 0;
    if (orderedCost > 0) {
      completionPercentage = Math.min(100, Math.round((acceptedCost / orderedCost) * 100));
    } else if (orderedQuantity > 0) {
      completionPercentage = Math.min(100, Math.round((acceptedQuantity / orderedQuantity) * 100));
    }

    return {
      projectId,
      totalBoqItemsCount: boqItems.length,
      orderedItemsCount: poItemMap.size,
      deliveredItemsCount,
      acceptedItemsCount,
      estimatedTotalCost,
      orderedCost,
      deliveredCost,
      acceptedCost,
      orderedQuantity,
      deliveredQuantity,
      acceptedQuantity,
      completionPercentage,
      hasInsufficientData: false,
      currency
    };
  }

  /**
   * Deterministic comparison of supplier quotes for an RFQ
   */
  compareQuotes(rfqId: string): QuoteComparison {
    const rfq = procurementRepository.getProcurementRFQById(rfqId);
    if (!rfq) {
      throw new Error(`Procurement RFQ not found: ${rfqId}`);
    }

    const quotes = procurementRepository.getVendorQuotes(rfqId);
    const quoteComparisonItems: QuoteComparisonItem[] = quotes.map(q => {
      const items = procurementRepository.getVendorQuoteItems(q.id);
      return {
        quoteId: q.id,
        quoteCode: q.quoteCode,
        vendorId: q.vendorId,
        totalPrice: q.totalPrice,
        currency: q.currency,
        deliveryLeadTimeDays: q.deliveryLeadTimeDays,
        warrantySummary: q.warrantySummary || '',
        paymentTerms: q.paymentTerms || '',
        itemCount: items.length,
        status: q.status,
        subtotal: q.subtotal,
        tax: q.tax,
        transportationCost: q.transportationCost
      };
    });

    // Sort deterministically: lowest total price, then shortest lead time
    const sorted = [...quoteComparisonItems].sort((a, b) => {
      if (a.totalPrice !== b.totalPrice) {
        return a.totalPrice - b.totalPrice;
      }
      return a.deliveryLeadTimeDays - b.deliveryLeadTimeDays;
    });

    const cheapest = sorted.length > 0 ? sorted[0].quoteId : undefined;
    const fastest = [...quoteComparisonItems].sort((a, b) => a.deliveryLeadTimeDays - b.deliveryLeadTimeDays)[0]?.quoteId;

    return {
      rfqId,
      projectId: rfq.projectId,
      rfqCode: rfq.procurementRfqCode,
      quotes: quoteComparisonItems,
      cheapestQuoteId: cheapest,
      fastestLeadTimeQuoteId: fastest,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Award supplier quote and update RFQ / Quote statuses
   */
  awardSupplier(rfqId: string, quoteId: string, userId: string): SupplierAward {
    const rfq = procurementRepository.getProcurementRFQById(rfqId);
    if (!rfq) throw new Error('RFQ not found');

    const quote = procurementRepository.getVendorQuoteById(quoteId);
    if (!quote || quote.procurementRfqId !== rfqId) {
      throw new Error('Quote not found or does not belong to RFQ');
    }

    const quoteItems = procurementRepository.getVendorQuoteItems(quote.id);
    const boqItemIds = quoteItems.map(qi => qi.boqItemId);

    // Create Award
    const award = procurementRepository.createSupplierAward({
      projectId: rfq.projectId,
      procurementRfqId: rfqId,
      vendorQuoteId: quoteId,
      boqItemIds,
      awardedValue: quote.totalPrice,
      status: 'APPROVED'
    });

    // Update quote status
    procurementRepository.updateVendorQuote(quoteId, { status: 'SELECTED' });

    // Mark other quotes as REJECTED
    const allQuotes = procurementRepository.getVendorQuotes(rfqId);
    allQuotes.forEach(q => {
      if (q.id !== quoteId && q.status !== 'SELECTED') {
        procurementRepository.updateVendorQuote(q.id, { status: 'REJECTED' });
      }
    });

    // Update RFQ status
    procurementRepository.updateProcurementRFQ(rfqId, { status: 'AWARDED' });

    // Log Activity
    projectRepository.addActivity({
      projectId: rfq.projectId,
      actorUserId: userId,
      eventType: 'PROCUREMENT_AWARDED',
      metadata: {
        description: `تأمین‌کننده برای استعلام ${rfq.procurementRfqCode} انتخاب و برنده اعلام شد.`,
        rfqId,
        quoteId,
        awardId: award.id
      }
    });

    return award;
  }

  /**
   * Create Purchase Order from Award
   */
  createPurchaseOrderFromAward(
    awardId: string, 
    userId: string, 
    options?: { expectedDeliveryDate?: string; deliveryLocation?: string }
  ): PurchaseOrder {
    const awards = procurementRepository.getSupplierAwards('');
    // Search in DB
    const award = awards.find(a => a.id === awardId);
    if (!award) throw new Error('Supplier award not found');

    const quote = procurementRepository.getVendorQuoteById(award.vendorQuoteId);
    if (!quote) throw new Error('Vendor quote not found');

    const rfq = procurementRepository.getProcurementRFQById(award.procurementRfqId);
    const quoteItems = procurementRepository.getVendorQuoteItems(quote.id);

    const po = procurementRepository.createPurchaseOrder({
      projectId: award.projectId,
      vendorId: quote.vendorId,
      supplierAwardId: award.id,
      status: 'ISSUED',
      currency: quote.currency,
      totalValue: award.awardedValue,
      issueDate: new Date().toISOString(),
      expectedDeliveryDate: options?.expectedDeliveryDate || new Date(Date.now() + (quote.deliveryLeadTimeDays || 30) * 86400000).toISOString(),
      deliveryLocation: options?.deliveryLocation || rfq?.deliveryLocation || 'سایت پروژه',
      paymentTermsSummary: quote.paymentTerms || '',
      warrantySummary: quote.warrantySummary || '',
      items: [],
      createdByUserId: userId
    });

    // Create PO Items from Quote Items
    quoteItems.forEach(qi => {
      procurementRepository.createPurchaseOrderItem({
        purchaseOrderId: po.id,
        boqItemId: qi.boqItemId,
        quantity: qi.quantity,
        unitPrice: qi.unitPrice,
        totalPrice: qi.totalPrice,
        currency: qi.currency
      });
    });

    // Log Activity
    projectRepository.addActivity({
      projectId: award.projectId,
      actorUserId: userId,
      eventType: 'PURCHASE_ORDER_ISSUED',
      metadata: {
        description: `سفارش خرید ${po.poCode} صادر گردید.`,
        purchaseOrderId: po.id,
        awardId
      }
    });

    return po;
  }

  /**
   * Record a delivery for a Purchase Order
   */
  recordDelivery(
    projectId: string,
    purchaseOrderId: string,
    userId: string,
    items: {
      purchaseOrderItemId: string;
      deliveredQuantity: number;
      damageNotes?: string;
      serialNumbers?: string[];
    }[],
    options?: { deliveryNumber?: string; notes?: string; documents?: string[] }
  ): DeliveryRecord {
    const po = procurementRepository.getPurchaseOrderById(purchaseOrderId);
    if (!po) throw new Error('Purchase order not found');
    if (po.projectId !== projectId) throw new Error('Purchase order belongs to a different project');

    const deliveryRecord = procurementRepository.createDeliveryRecord({
      purchaseOrderId,
      projectId,
      status: 'EXPECTED',
      deliveryDate: new Date().toISOString(),
      receivedByUserId: userId,
      items: [],
      documents: options?.documents || [],
      notes: options?.notes || ''
    });

    const poItems = procurementRepository.getPurchaseOrderItems(purchaseOrderId);
    const poItemMap = new Map(poItems.map(p => [p.id, p]));

    items.forEach(it => {
      const poi = poItemMap.get(it.purchaseOrderItemId);
      procurementRepository.createDeliveryItem({
        deliveryRecordId: deliveryRecord.id,
        purchaseOrderItemId: it.purchaseOrderItemId,
        orderedQuantity: poi ? poi.quantity : it.deliveredQuantity,
        deliveredQuantity: it.deliveredQuantity,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        damageNotes: it.damageNotes,
        serialNumbers: it.serialNumbers
      });
    });

    // Update PO status
    procurementRepository.updatePurchaseOrder(po.id, { status: 'PARTIALLY_DELIVERED' });

    // Log Activity
    projectRepository.addActivity({
      projectId,
      actorUserId: userId,
      eventType: 'DELIVERY_RECORDED',
      metadata: {
        description: `محموله جدید ${deliveryRecord.deliveryNumber} برای سفارش خرید ${po.poCode} ثبت شد.`,
        purchaseOrderId,
        deliveryRecordId: deliveryRecord.id
      }
    });

    return deliveryRecord;
  }

  /**
   * Inspect and accept or reject delivery items
   */
  inspectAndAcceptDelivery(
    projectId: string,
    deliveryRecordId: string,
    userId: string,
    inspectionStatus: 'PASSED' | 'FAILED' | 'CONDITIONALLY_ACCEPTED',
    itemAcceptances: {
      deliveryItemId: string;
      acceptedQuantity: number;
      rejectedQuantity: number;
      defectReason?: string;
    }[],
    notes?: string
  ): { deliveryRecord: DeliveryRecord; inspection: DeliveryInspection } {
    const delivery = procurementRepository.getDeliveryRecordById(deliveryRecordId);
    if (!delivery) throw new Error('Delivery record not found');
    if (delivery.projectId !== projectId) throw new Error('Delivery record belongs to a different project');

    const po = procurementRepository.getPurchaseOrderById(delivery.purchaseOrderId);

    // Update DeliveryItems with accepted & rejected quantities
    let totalDelivered = 0;
    let totalAccepted = 0;
    let totalRejected = 0;

    const existingDeliveryItems = procurementRepository.getDeliveryItems(deliveryRecordId);
    const existingItemMap = new Map(existingDeliveryItems.map(i => [i.id, i]));

    itemAcceptances.forEach(ia => {
      const existing = existingItemMap.get(ia.deliveryItemId);
      if (existing) {
        totalDelivered += existing.deliveredQuantity;
        totalAccepted += ia.acceptedQuantity;
        totalRejected += ia.rejectedQuantity;

        procurementRepository.updateDeliveryItem(ia.deliveryItemId, {
          acceptedQuantity: ia.acceptedQuantity,
          rejectedQuantity: ia.rejectedQuantity,
          damageNotes: ia.defectReason || existing.damageNotes
        });

        // If items are accepted and PO exists, create EquipmentWarranty records for verified equipment
        if (ia.acceptedQuantity > 0 && po) {
          const poItems = procurementRepository.getPurchaseOrderItems(po.id);
          const matchedPoi = poItems.find(p => p.id === existing.purchaseOrderItemId);
          if (matchedPoi) {
            const boq = procurementRepository.getBOQs(projectId);
            let matchedBoqItem: BOQItem | undefined;
            for (const b of boq) {
              const bItems = procurementRepository.getBOQItems(b.id);
              const found = bItems.find(bi => bi.id === matchedPoi.boqItemId);
              if (found) {
                matchedBoqItem = found;
                break;
              }
            }

            const startDate = new Date().toISOString();
            const warrantyYears = matchedBoqItem?.requiredWarrantyYears;
            const endDate = warrantyYears ? new Date(Date.now() + warrantyYears * 365 * 86400000).toISOString() : '';
            assetRepository.createEquipmentWarranty({
              assetId: '',
              projectId,
              purchaseOrderId: po.id,
              boqItemId: matchedPoi.boqItemId,
              warrantyProvider: matchedBoqItem?.manufacturerPreference || 'تأمین‌کننده تجهیز',
              warrantyType: 'MANUFACTURER',
              startDate,
              endDate,
              coverageSummary: `گارانتی تجهیز ${matchedBoqItem?.itemType || matchedBoqItem?.modelPreference || ''}`,
              status: (startDate && endDate) ? 'ACTIVE' : 'INSUFFICIENT_DATA'
            });
          }
        }
      }
    });

    // Determine new DeliveryRecord status
    let recordStatus: DeliveryRecord['status'] = 'RECEIVED';
    if (inspectionStatus === 'FAILED' || (totalRejected > 0 && totalAccepted === 0)) {
      recordStatus = 'REJECTED';
    } else if (totalAccepted < totalDelivered) {
      recordStatus = 'PARTIAL';
    }

    const updatedDelivery = procurementRepository.updateDeliveryRecord(deliveryRecordId, {
      status: recordStatus,
      notes: notes || delivery.notes
    })!;

    // Create Inspection Record
    const inspection = procurementRepository.createDeliveryInspection({
      deliveryRecordId,
      projectId,
      purchaseOrderId: delivery.purchaseOrderId,
      inspectedByUserId: userId,
      inspectionDate: new Date().toISOString(),
      status: inspectionStatus,
      notes,
      items: itemAcceptances
    });

    // Check if entire PO is now DELIVERED
    if (po) {
      const allDeliveries = procurementRepository.getDeliveryRecords(po.id);
      const allDeliveredItems: DeliveryItem[] = [];
      allDeliveries.forEach(d => {
        allDeliveredItems.push(...procurementRepository.getDeliveryItems(d.id));
      });

      const poItems = procurementRepository.getPurchaseOrderItems(po.id);
      const allItemsFullyAccepted = poItems.every(poi => {
        const acceptedForPoi = allDeliveredItems
          .filter(di => di.purchaseOrderItemId === poi.id)
          .reduce((sum, di) => sum + (di.acceptedQuantity || 0), 0);
        return acceptedForPoi >= poi.quantity;
      });

      if (allItemsFullyAccepted && poItems.length > 0) {
        procurementRepository.updatePurchaseOrder(po.id, { status: 'DELIVERED' });
      }
    }

    // Log Activity
    projectRepository.addActivity({
      projectId,
      actorUserId: userId,
      eventType: 'DELIVERY_INSPECTED',
      metadata: {
        description: `بازرسی و تحویل‌گیری محموله ${delivery.deliveryNumber} با وضعیت ${inspectionStatus} ثبت شد.`,
        deliveryRecordId,
        status: inspectionStatus
      }
    });

    return { deliveryRecord: updatedDelivery, inspection };
  }
}

export const procurementService = new ProcurementService();
