import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EnergyProject } from '../../types/project';
import { RFQ, EpcBid } from '../../types/rfq';
import { BillOfQuantities, BOQItem, ProcurementRFQ, VendorQuote, PurchaseOrder, Delivery } from '../../types/procurement';
import { useAuth } from '../../context/AuthContext';

import { CommercialProcessNavigator, CommercialStageId, StageInfo, CommercialStageStatus } from './CommercialProcessNavigator';
import { CommercialDecisionBanner, CommercialDecisionContext } from './CommercialDecisionBanner';
import { CommercialEmptyState } from './CommercialEmptyState';
import { RFQReadiness } from './RFQReadiness';
import { RFQWizard, RFQFormData } from './RFQWizard';
import { RFQReview } from './RFQReview';
import { BidInbox } from './BidInbox';
import { BidComparison } from './BidComparison';
import { BidSelectionReview } from './BidSelectionReview';

import { BOQWorkspace } from './BOQWorkspace';
import { VendorRFQBuilder } from './VendorRFQBuilder';
import { QuotationInbox } from './QuotationInbox';
import { QuotationComparison } from './QuotationComparison';
import { PurchaseOrderReview } from './PurchaseOrderReview';
import { DeliveryStatus } from './DeliveryStatus';

import { RefreshCw, AlertCircle, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';

interface CommercialWorkspaceProps {
  project: EnergyProject;
  onProjectUpdate?: () => void;
  initialStage?: CommercialStageId;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export const CommercialWorkspace: React.FC<CommercialWorkspaceProps> = ({
  project,
  onProjectUpdate,
  initialStage = 'epc',
  onNavigateTab,
  className = ''
}) => {
  const { user } = useAuth();

  // Active Process Stage
  const [activeStage, setActiveStage] = useState<CommercialStageId>(initialStage);

  // EPC Flow Sub-states
  const [epcFlowView, setEpcFlowView] = useState<'overview' | 'wizard' | 'review' | 'compare'>('overview');
  const [rfqWizardData, setRfqWizardData] = useState<RFQFormData | null>(null);
  const [selectedBidForAward, setSelectedBidForAward] = useState<EpcBid | null>(null);
  const [comparisonBidIds, setComparisonBidIds] = useState<string[]>([]);

  // Equipment Flow Sub-states
  const [equipFlowView, setEquipFlowView] = useState<'boq' | 'vendor_rfq_builder' | 'quotes' | 'compare_quotes'>('boq');
  const [selectedBOQItemIds, setSelectedBOQItemIds] = useState<string[]>([]);
  const [selectedQuoteForPO, setSelectedQuoteForPO] = useState<VendorQuote | null>(null);
  const [comparisonQuoteIds, setComparisonQuoteIds] = useState<string[]>([]);

  // Data states (Loaded strictly from backend)
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [bids, setBids] = useState<EpcBid[]>([]);
  const [boqs, setBoqs] = useState<BillOfQuantities[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [procurementRfqs, setProcurementRfqs] = useState<ProcurementRFQ[]>([]);
  const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Role permissions
  const isOwner = user?.id === project.ownerId || user?.role === 'PROJECT_OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const isEPC = user?.role === 'EPC';
  const isVendor = user?.role === 'VENDOR' || user?.role === 'SUPPLIER';
  const canManageCommercial = isOwner || isAdmin;
  const canManageProcurement = isOwner || isAdmin || isEPC;

  // Active EPC RFQ (if any)
  const activeEpcRfq = useMemo(() => {
    return rfqs.length > 0 ? rfqs[0] : null;
  }, [rfqs]);

  // Active BOQ (if any)
  const activeBoq = useMemo(() => {
    return boqs.length > 0 ? boqs[0] : null;
  }, [boqs]);

  // Load all authentic commercial data for this project
  const loadCommercialData = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch Project RFQs (EPC)
      const rfqRes = await fetch(`/api/projects/${project.id}/rfqs`, { headers });
      let loadedRfqs: RFQ[] = [];
      if (rfqRes.ok) {
        const data = await rfqRes.json();
        loadedRfqs = Array.isArray(data) ? data : (data.rfqs || []);
        setRfqs(loadedRfqs);
      }

      // If active RFQ exists, fetch its bids
      if (loadedRfqs.length > 0) {
        const activeRfqId = loadedRfqs[0].id;
        const bidsRes = await fetch(`/api/rfq/${activeRfqId}/bids`, { headers });
        if (bidsRes.ok) {
          const bidsData = await bidsRes.json();
          setBids(Array.isArray(bidsData) ? bidsData : (bidsData.bids || []));
        }
      } else {
        setBids([]);
      }

      // 2. Fetch Project BOQs
      const boqRes = await fetch(`/api/projects/${project.id}/boqs`, { headers });
      let loadedBoqs: BillOfQuantities[] = [];
      if (boqRes.ok) {
        const boqData = await boqRes.json();
        loadedBoqs = Array.isArray(boqData) ? boqData : (boqData.boqs || []);
        setBoqs(loadedBoqs);

        if (loadedBoqs.length > 0) {
          const itemsRes = await fetch(`/api/boqs/${loadedBoqs[0].id}/items`, { headers });
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            setBoqItems(Array.isArray(itemsData) ? itemsData : (itemsData.items || []));
          }
        } else {
          setBoqItems([]);
        }
      }

      // 3. Fetch Purchase Orders
      const poRes = await fetch(`/api/projects/${project.id}/purchase-orders`, { headers });
      if (poRes.ok) {
        const poData = await poRes.json();
        setPurchaseOrders(Array.isArray(poData) ? poData : (poData.purchaseOrders || []));
      }

      // 4. Fetch Deliveries
      const delivRes = await fetch(`/api/projects/${project.id}/deliveries`, { headers });
      if (delivRes.ok) {
        const delivData = await delivRes.json();
        setDeliveries(Array.isArray(delivData) ? delivData : (delivData.deliveries || []));
      }

    } catch (err: any) {
      console.error('Error loading commercial data:', err);
      setErrorMessage('خطا در بارگذاری اطلاعات تجاری پروژه. لطفاً اتصال را بررسی نمایید.');
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    loadCommercialData();
  }, [loadCommercialData]);

  // Publish EPC RFQ
  const handlePublishRFQ = async () => {
    if (!activeEpcRfq && !rfqWizardData) return;
    setActionInProgress(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let targetRfqId = activeEpcRfq?.id;

      // If creating new RFQ draft first
      if (!targetRfqId && rfqWizardData) {
        const createRes = await fetch(`/api/projects/${project.id}/rfq`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: rfqWizardData.title,
            scopeOfWork: rfqWizardData.scopeOfWork,
            technicalRequirements: {
              preferredPanelTech: rfqWizardData.preferredPanelTech,
              preferredInverterTech: rfqWizardData.preferredInverterTech,
              structureType: rfqWizardData.structureType,
              warrantyRequirementYears: rfqWizardData.warrantyRequirementYears
            },
            commercialTerms: {
              expectedDurationMonths: rfqWizardData.expectedDurationMonths,
              budgetCapIRR: rfqWizardData.budgetCapIRR,
              paymentTerms: rfqWizardData.paymentTerms
            },
            submissionDeadlineDays: rfqWizardData.submissionDeadlineDays,
            visibility: rfqWizardData.visibility,
            specialRequirements: rfqWizardData.specialRequirements
          })
        });
        if (!createRes.ok) {
          throw new Error('خطا در ایجاد پیش‌نویس استعلام');
        }
        const created = await createRes.json();
        targetRfqId = created.id || created.rfq?.id;
      }

      if (targetRfqId) {
        const pubRes = await fetch(`/api/rfq/${targetRfqId}/publish`, {
          method: 'POST',
          headers
        });
        if (!pubRes.ok) {
          throw new Error('خطا در انتشار استعلام');
        }
      }

      await loadCommercialData();
      if (onProjectUpdate) onProjectUpdate();
      setEpcFlowView('overview');
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت استعلام');
    } finally {
      setActionInProgress(false);
    }
  };

  // Confirm EPC Bid Award
  const handleConfirmAwardBid = async () => {
    if (!selectedBidForAward || !activeEpcRfq) return;
    setActionInProgress(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/rfq/bids/${selectedBidForAward.id}/select`, {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'خطا در ثبت انتخاب پیمانکار');
      }

      setSelectedBidForAward(null);
      await loadCommercialData();
      if (onProjectUpdate) onProjectUpdate();
    } catch (err: any) {
      alert(err.message || 'خطا در انتخاب پیمانکار');
    } finally {
      setActionInProgress(false);
    }
  };

  // Create Vendor RFQ from selected BOQ items
  const handleCreateVendorRFQ = async (rfqData: any) => {
    setActionInProgress(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/projects/${project.id}/rfqs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...rfqData,
          itemIds: selectedBOQItemIds
        })
      });

      if (!res.ok) {
        throw new Error('خطا در ثبت استعلام فروشندگان');
      }

      await loadCommercialData();
      setEquipFlowView('boq');
      setSelectedBOQItemIds([]);
    } catch (err: any) {
      alert(err.message || 'خطا در ارسال استعلام');
    } finally {
      setActionInProgress(false);
    }
  };

  // Issue Purchase Order
  const handleIssuePurchaseOrder = async (poData: any) => {
    if (!selectedQuoteForPO) return;
    setActionInProgress(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/projects/${project.id}/purchase-orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vendorQuoteId: selectedQuoteForPO.id,
          vendorId: selectedQuoteForPO.vendorId,
          totalAmount: selectedQuoteForPO.totalPrice,
          items: selectedQuoteForPO.quoteItems,
          ...poData
        })
      });

      if (!res.ok) {
        throw new Error('خطا در صدور سفارش خرید');
      }

      setSelectedQuoteForPO(null);
      await loadCommercialData();
      if (onProjectUpdate) onProjectUpdate();
      setActiveStage('delivery');
    } catch (err: any) {
      alert(err.message || 'خطا در صدور سفارش خرید');
    } finally {
      setActionInProgress(false);
    }
  };

  // Compute Process Navigator Stages strictly from backend data
  const processStages: StageInfo[] = useMemo(() => {
    // 1. EPC Stage
    let epcStatus: CommercialStageStatus = 'NOT_STARTED';
    let epcStatusLabel = 'شروع نشده';
    let epcCount = bids.length > 0 ? `${bids.length} پیشنهاد` : undefined;

    if (activeEpcRfq) {
      if (activeEpcRfq.status === 'AWARDED' || project.status === 'EPC_SELECTED' || project.contractId) {
        epcStatus = 'AWARDED';
        epcStatusLabel = 'پیمانکار انتخاب شد';
      } else if (bids.length > 0) {
        epcStatus = 'NEEDS_DECISION';
        epcStatusLabel = 'نیازمند تصمیم و انتخاب';
      } else if (activeEpcRfq.status === 'PUBLISHED') {
        epcStatus = 'RECEIVING_BIDS';
        epcStatusLabel = 'در حال دریافت پیشنهاد';
      } else {
        epcStatus = 'PENDING_INFO';
        epcStatusLabel = 'پیش‌نویس استعلام';
      }
    } else {
      epcStatus = 'NOT_STARTED';
      epcStatusLabel = 'نیازمند تنظیم استعلام';
    }

    // 2. Equipment Stage
    let equipStatus: CommercialStageStatus = 'NOT_STARTED';
    let equipStatusLabel = 'شروع نشده';
    let equipCount = boqItems.length > 0 ? `${boqItems.length} قلم` : undefined;

    if (boqItems.length > 0) {
      if (purchaseOrders.length > 0) {
        equipStatus = 'IN_PROCUREMENT';
        equipStatusLabel = 'سفارش صادر شده';
      } else if (vendorQuotes.length > 0) {
        equipStatus = 'NEEDS_DECISION';
        equipStatusLabel = 'نیازمند مقایسه و تایید';
      } else {
        equipStatus = 'PENDING_INFO';
        equipStatusLabel = 'فهرست تجهیزات آماده استعلام';
      }
    }

    // 3. Contract & PO Stage
    let contractStatus: CommercialStageStatus = 'NOT_STARTED';
    let contractStatusLabel = 'شروع نشده';
    if (project.contractId) {
      contractStatus = 'AWARDED';
      contractStatusLabel = 'قرارداد منعقد شد';
    } else if (purchaseOrders.length > 0) {
      contractStatus = 'IN_PROCUREMENT';
      contractStatusLabel = `${purchaseOrders.length} سفارش رسمی`;
    } else if (epcStatus === 'AWARDED') {
      contractStatus = 'NEEDS_DECISION';
      contractStatusLabel = 'در انتظار تنظیم قرارداد';
    }

    // 4. Delivery Stage
    let delivStatus: CommercialStageStatus = 'NOT_STARTED';
    let delivStatusLabel = 'شروع نشده';
    let delivCount = deliveries.length > 0 ? `${deliveries.length} محموله` : undefined;

    if (deliveries.length > 0) {
      const allDelivered = deliveries.every(d => (d.status as string) === 'ACCEPTED' || (d.status as string) === 'INSPECTED' || d.status === 'RECEIVED');
      if (allDelivered) {
        delivStatus = 'DELIVERED';
        delivStatusLabel = 'تحویل کارگاه شد';
      } else {
        delivStatus = 'IN_PROCUREMENT';
        delivStatusLabel = 'در حال حمل و تحویل';
      }
    } else if (purchaseOrders.length > 0) {
      delivStatus = 'PENDING_INFO';
      delivStatusLabel = 'در انتظار خروج بار';
    }

    return [
      {
        id: 'epc',
        title: 'انتخاب پیمانکار EPC',
        subtitle: 'استعلام، دریافت و مقایسه پیشنهادات',
        status: epcStatus,
        statusLabel: epcStatusLabel,
        countLabel: epcCount
      },
      {
        id: 'equipment',
        title: 'تأمین تجهیزات اصلی',
        subtitle: 'فهرست BOQ، استعلام و پیش‌فاکتور',
        status: equipStatus,
        statusLabel: equipStatusLabel,
        countLabel: equipCount
      },
      {
        id: 'contract_po',
        title: 'قرارداد و سفارش خرید',
        subtitle: 'موافقت‌نامه EPC و سفارش‌های رسمی',
        status: contractStatus,
        statusLabel: contractStatusLabel
      },
      {
        id: 'delivery',
        title: 'ردیابی و تحویل کارگاه',
        subtitle: 'بارنامه، حمل جاده‌ای و کنترل کیفی',
        status: delivStatus,
        statusLabel: delivStatusLabel,
        countLabel: delivCount
      }
    ];
  }, [activeEpcRfq, bids, boqItems, purchaseOrders, vendorQuotes, deliveries, project.status, project.contractId]);

  // Compute 5-Question Commercial Decision Context
  const decisionContext: CommercialDecisionContext = useMemo(() => {
    const completed: string[] = [];
    if (project.targetCapacityKw) completed.push(`تعیین ظرفیت مهندسی (${project.targetCapacityKw} کیلووات)`);
    if (project.location?.city) completed.push(`تأیید موقعیت در ${project.location.province}`);
    if (activeEpcRfq?.status === 'PUBLISHED') completed.push('انتشار رسمی استعلام پیمانکاران (RFQ)');
    if (bids.length > 0) completed.push(`دریافت ${bids.length} پیشنهاد از شرکت‌های EPC`);
    if (boqs.length > 0) completed.push('تهیه فهرست مشخصات و مقادیر تجهیزات (BOQ)');
    if (purchaseOrders.length > 0) completed.push(`صدور ${purchaseOrders.length} سفارش خرید رسمی`);

    const missing: string[] = [];
    if (!project.targetCapacityKw) missing.push('ظرفیت هدف پروژه هنوز ثبت نشده است.');
    if (!project.sourceAnalysisId && !project.engineeringDesignId) missing.push('گزارش ارزیابی فنی و تابش پیوست نشده است.');
    if (!project.site?.areaM2) missing.push('مساحت دقیق زمین یا سقف مشخص نشده است.');

    // EPC active decision
    if (!activeEpcRfq) {
      return {
        currentAction: 'تنظیم و انتشار استعلام قیمت و خدمات پیمانکاران (EPC RFQ)',
        completedMilestones: completed,
        missingInfo: missing,
        pendingDecision: canManageCommercial ? {
          title: 'آغاز فرایند استعلام پیمانکاران',
          description: 'مشخصات و الزامات احداث نیروگاه را مشخص کرده و استعلام را جهت دریافت پیشنهادات منتشر کنید.',
          actionLabel: 'تنظیم استعلام پیمانکار',
          onAction: () => setEpcFlowView('wizard')
        } : undefined,
        decisionImpact: 'پس از انتشار، پیمانکاران واجد شرایط استعلام را دریافت کرده و قیمت و شرایط فنی را ارائه خواهند کرد.'
      };
    }

    if (activeEpcRfq.status === 'PUBLISHED' && bids.length === 0) {
      return {
        currentAction: 'در انتظار ارسال پیشنهادات فنی و مالی از سوی پیمانکاران',
        completedMilestones: completed,
        missingInfo: missing,
        pendingDecision: undefined,
        decisionImpact: 'به محض ثبت نخستین پیشنهاد توسط شرکت‌های پیمانکار، صندوق پیشنهادات فعال خواهد شد.'
      };
    }

    if (bids.length > 0 && activeEpcRfq.status !== 'AWARDED') {
      return {
        currentAction: 'ارزیابی پیشنهادات دریافتی و انتخاب پیمانکار منتخب پروژه',
        completedMilestones: completed,
        missingInfo: missing,
        pendingDecision: canManageCommercial ? {
          title: 'انتخاب شرکت پیمانکار (EPC Award)',
          description: `${bids.length} پیشنهاد قیمت و برنامه زمانی ثبت گردیده است. با بررسی جدول مقایسه، پیمانکار نهایی را انتخاب فرمایید.`,
          actionLabel: 'مقایسه رو در روی پیشنهادات',
          onAction: () => {
            setComparisonBidIds(bids.map(b => b.id));
            setEpcFlowView('compare');
          }
        } : undefined,
        decisionImpact: 'با انتخاب پیمانکار، وضعیت پروژه به «پیمانکار انتخاب شد (EPC_SELECTED)» تغییر یافته و مرحله تنظیم قرارداد آغاز می‌گردد.'
      };
    }

    if (activeEpcRfq.status === 'AWARDED' || project.status === 'EPC_SELECTED') {
      return {
        currentAction: 'پیمانکار منتخب تعیین گردید؛ پروژه در مرحله آماده‌سازی قرارداد و تأمین تجهیزات است.',
        completedMilestones: completed,
        missingInfo: missing,
        pendingDecision: {
          title: 'بررسی فهرست تجهیزات و استعلام خرید (BOQ)',
          description: 'جهت تسریع فرایند اجرا، فهرست تجهیزات اصلی و پیش‌فاکتورهای تأمین را بررسی فرمایید.',
          actionLabel: 'مشاهده بخش تجهیزات',
          onAction: () => setActiveStage('equipment')
        },
        decisionImpact: 'پس از عقد قرارداد رسمی، برنامه عملیاتی اجرای پروژه به فاز ساخت منتقل خواهد شد.'
      };
    }

    return {
      currentAction: 'مدیریت فرایندهای تجاری، تأمین و لجستیک پروژه',
      completedMilestones: completed,
      missingInfo: missing
    };
  }, [project, activeEpcRfq, bids, boqs, purchaseOrders, canManageCommercial]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Clarity Banner (5 Questions) */}
      <CommercialDecisionBanner context={decisionContext} />

      {/* Process Navigator */}
      <CommercialProcessNavigator
        activeStage={activeStage}
        onSelectStage={(stage) => {
          setActiveStage(stage);
          // Reset subviews on main stage tab switch
          if (stage === 'epc') setEpcFlowView('overview');
          if (stage === 'equipment') setEquipFlowView('boq');
        }}
        stages={processStages}
      />

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadCommercialData}
            className="font-bold underline cursor-pointer"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* MAIN STAGE CONTENT */}

      {/* STAGE 1: EPC CONTRACTOR SELECTION */}
      {activeStage === 'epc' && (
        <div>
          {/* Sub-view: Compare Bids */}
          {epcFlowView === 'compare' && (
            <BidComparison
              bids={bids.filter(b => comparisonBidIds.includes(b.id))}
              isOwnerOrAdmin={canManageCommercial}
              onClose={() => setEpcFlowView('overview')}
              onSelectBid={(bid) => setSelectedBidForAward(bid)}
            />
          )}

          {/* Sub-view: Wizard */}
          {epcFlowView === 'wizard' && (
            <RFQWizard
              project={project}
              initialData={rfqWizardData || undefined}
              onSubmitDraft={(formData) => {
                setRfqWizardData(formData);
                setEpcFlowView('review');
              }}
              onCancel={() => setEpcFlowView('overview')}
            />
          )}

          {/* Sub-view: Review */}
          {epcFlowView === 'review' && rfqWizardData && (
            <RFQReview
              project={project}
              formData={rfqWizardData}
              isPublishing={actionInProgress}
              onConfirmPublish={handlePublishRFQ}
              onEdit={() => setEpcFlowView('wizard')}
            />
          )}

          {/* Sub-view: Overview */}
          {epcFlowView === 'overview' && (
            <div className="space-y-6">
              {!activeEpcRfq ? (
                <RFQReadiness
                  project={project}
                  onProceedToRFQ={() => setEpcFlowView('wizard')}
                />
              ) : (
                <BidInbox
                  rfq={activeEpcRfq}
                  bids={bids}
                  isOwnerOrAdmin={canManageCommercial}
                  selectedBidId={activeEpcRfq.selectedBidId}
                  onOpenCompare={(ids) => {
                    setComparisonBidIds(ids);
                    setEpcFlowView('compare');
                  }}
                  onSelectBidForAward={(bid) => setSelectedBidForAward(bid)}
                  onRefresh={loadCommercialData}
                />
              )}
            </div>
          )}

          {/* Award Confirmation Modal */}
          {selectedBidForAward && activeEpcRfq && (
            <BidSelectionReview
              rfq={activeEpcRfq}
              bid={selectedBidForAward}
              isSubmitting={actionInProgress}
              onConfirm={handleConfirmAwardBid}
              onCancel={() => setSelectedBidForAward(null)}
            />
          )}
        </div>
      )}

      {/* STAGE 2: EQUIPMENT PROCUREMENT */}
      {activeStage === 'equipment' && (
        <div>
          {equipFlowView === 'compare_quotes' && (
            <QuotationComparison
              quotes={vendorQuotes.filter(q => comparisonQuoteIds.includes(q.id))}
              isOwnerOrEPC={canManageProcurement}
              onClose={() => setEquipFlowView('quotes')}
              onSelectQuote={(quote) => setSelectedQuoteForPO(quote)}
            />
          )}

          {equipFlowView === 'vendor_rfq_builder' && activeBoq && (
            <VendorRFQBuilder
              project={project}
              boq={activeBoq}
              selectedItems={boqItems.filter(i => selectedBOQItemIds.includes(i.id))}
              isSubmitting={actionInProgress}
              onSubmit={handleCreateVendorRFQ}
              onCancel={() => setEquipFlowView('boq')}
            />
          )}

          {equipFlowView === 'quotes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setEquipFlowView('boq')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-blue-600"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت به فهرست اقلام BOQ</span>
                </button>
              </div>

              <QuotationInbox
                quotes={vendorQuotes}
                isOwnerOrEPC={canManageProcurement}
                onOpenCompare={(ids) => {
                  setComparisonQuoteIds(ids);
                  setEquipFlowView('compare_quotes');
                }}
                onSelectQuoteForPO={(quote) => setSelectedQuoteForPO(quote)}
                onRefresh={loadCommercialData}
              />
            </div>
          )}

          {equipFlowView === 'boq' && (
            <BOQWorkspace
              boq={activeBoq || undefined}
              items={boqItems}
              isOwnerOrEPC={canManageProcurement}
              onCreateVendorRFQ={(itemIds) => {
                setSelectedBOQItemIds(itemIds);
                setEquipFlowView('vendor_rfq_builder');
              }}
            />
          )}

          {/* Issue PO Modal */}
          {selectedQuoteForPO && (
            <PurchaseOrderReview
              quote={selectedQuoteForPO}
              isSubmitting={actionInProgress}
              onConfirmIssuePO={handleIssuePurchaseOrder}
              onClose={() => setSelectedQuoteForPO(null)}
            />
          )}
        </div>
      )}

      {/* STAGE 3: CONTRACT & PURCHASE ORDERS */}
      {activeStage === 'contract_po' && (
        <div className="space-y-5">
          {purchaseOrders.length > 0 ? (
            <div className="space-y-4">
              {purchaseOrders.map(po => (
                <PurchaseOrderReview
                  key={po.id}
                  existingPO={po}
                  onClose={() => {}}
                />
              ))}
            </div>
          ) : (
            <CommercialEmptyState
              title="هنوز سفارش خرید یا قرارداد رسمی صادر نشده است."
              description="پس از انتخاب پیمانکار EPC یا انتخاب پیش‌فاکتورهای تأمین تجهیزات، موافقت‌نامه‌ها و سفارش‌های رسمی (PO) در این بخش صادر و آرشیو می‌گردند."
              actionText={bids.length > 0 ? "مشاهده و انتخاب پیشنهادات پیمانکاران" : "مشاهده فهرست تجهیزات"}
              onAction={() => setActiveStage(bids.length > 0 ? 'epc' : 'equipment')}
              icon="inbox"
            />
          )}
        </div>
      )}

      {/* STAGE 4: DELIVERY & LOGISTICS */}
      {activeStage === 'delivery' && (
        <DeliveryStatus
          deliveries={deliveries}
          purchaseOrders={purchaseOrders}
          isOwnerOrEPC={canManageProcurement}
        />
      )}
    </div>
  );
};
