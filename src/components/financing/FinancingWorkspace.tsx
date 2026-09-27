import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Coins, 
  ShieldCheck, 
  Inbox, 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  RefreshCw, 
  SlidersHorizontal,
  ChevronLeft,
  FileText,
  Loader2
} from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { 
  FinancingRequest, 
  FinancialPartnerProfile, 
  FinancingOffer, 
  FinancingReadinessResult,
  PartnerMatchingResult,
  ProjectFinancingRecord
} from '../../types/financing';
import { FinancingStatusTimeline } from './FinancingStatusTimeline';
import { FinancingNeedSummary } from './FinancingNeedSummary';
import { FinancingReadiness } from './FinancingReadiness';
import { FinancingPartnerMatches } from './FinancingPartnerMatches';
import { FinancingOfferInbox } from './FinancingOfferInbox';
import { FinancingOfferComparison } from './FinancingOfferComparison';
import { FinancingSelectionReview } from './FinancingSelectionReview';
import { FinancingApplicationFlow } from './FinancingApplicationFlow';
import { FinancingEmptyState } from './FinancingEmptyState';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingWorkspaceProps {
  projectId: string;
  project: EnergyProject;
  onProjectUpdate?: () => void;
}

export const FinancingWorkspace: React.FC<FinancingWorkspaceProps> = ({
  projectId,
  project,
  onProjectUpdate
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Data
  const [financingRequests, setFinancingRequests] = useState<FinancingRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<FinancingRequest | null>(null);
  const [readiness, setReadiness] = useState<FinancingReadinessResult | null>(null);
  const [partners, setPartners] = useState<FinancialPartnerProfile[]>([]);
  const [matches, setMatches] = useState<PartnerMatchingResult[]>([]);
  const [offers, setOffers] = useState<FinancingOffer[]>([]);
  const [financingRecord, setFinancingRecord] = useState<ProjectFinancingRecord | null>(null);

  // Workspace sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'readiness' | 'partners' | 'offers'>('overview');

  // Modals & Flows
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [offerToSelect, setOfferToSelect] = useState<FinancingOffer | null>(null);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);

  // Fetch all financing resources for this project
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Get financing requests for project
      const reqRes = await fetch(`/api/projects/${projectId}/financing-requests`, { headers });
      let currentReq: FinancingRequest | null = null;
      if (reqRes.ok) {
        const reqList: FinancingRequest[] = await reqRes.json();
        setFinancingRequests(reqList);
        if (reqList.length > 0) {
          currentReq = reqList[reqList.length - 1];
          setActiveRequest(currentReq);
        }
      }

      // 2. Fetch readiness snapshot
      const readyRes = await fetch(`/api/projects/${projectId}/financing-readiness`, { headers });
      if (readyRes.ok) {
        setReadiness(await readyRes.json());
      }

      // 3. Fetch partners directory & matching if request exists
      const partnersRes = await fetch(`/api/financial-partners`, { headers });
      if (partnersRes.ok) {
        const pList = await partnersRes.json();
        setPartners(pList);
      }

      // 4. Fetch matched partners for request
      if (currentReq) {
        const matchRes = await fetch(`/api/financial-partners/match?financingRequestId=${currentReq.id}`, { headers });
        if (matchRes.ok) {
          setMatches(await matchRes.json());
        }

        // 5. Fetch offers
        const offersRes = await fetch(`/api/financing-requests/${currentReq.id}/offers`, { headers });
        if (offersRes.ok) {
          setOffers(await offersRes.json());
        }
      }

      // 6. Fetch project financing summary
      const summaryRes = await fetch(`/api/projects/${projectId}/financing`, { headers });
      if (summaryRes.ok) {
        const sumData = await summaryRes.json();
        if (sumData.activeRecord) {
          setFinancingRecord(sumData.activeRecord);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('خطا در دریافت پرونده تأمین مالی پروژه');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit to Partner
  const handleSubmitToPartner = async (partnerId: string) => {
    if (!activeRequest) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/financing-requests/${activeRequest.id}/submit-to-partner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          financialPartnerProfileId: partnerId,
          message: `ارسال پرونده تأمین مالی پروژه ${project.title}`
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در ارسال پرونده');
      }

      await loadData();
      if (onProjectUpdate) onProjectUpdate();
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال پرونده');
    }
  };

  // Select Offer
  const handleConfirmSelectOffer = async () => {
    if (!offerToSelect) return;
    setIsProcessingSelection(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/financing-offers/${offerToSelect.id}/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در انتخاب پیشنهاد');
      }

      setOfferToSelect(null);
      await loadData();
      if (onProjectUpdate) onProjectUpdate();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت انتخاب');
    } finally {
      setIsProcessingSelection(false);
    }
  };

  return (
    <div className="space-y-6 font-Vazirmatn">
      {/* 1. Header & Executive Summary Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                {activeRequest ? activeRequest.requestCode : 'در انتظار درخواست'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                مرحله چرخه عمر: {project.status}
              </span>
              <DataTruthBadge provenance="VERIFIED_SOURCE" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100">
              میز کار تأمین مالی و تسهیلات اعتباری
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              مدیریت نیازمندی‌های سرمایه‌ای، تطابق با نهادهای مالی و ارزیابی شرایط مصوب تسهیلات
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 hover:bg-slate-50 cursor-pointer min-h-[44px]"
              title="به‌روزرسانی داده‌ها"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {!activeRequest && (
              <button
                type="button"
                onClick={() => setShowApplicationModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت پرونده درخواست تسهیلات</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Process Timeline (Answers Question 1: What is the current status?) */}
        {activeRequest && (
          <FinancingStatusTimeline
            currentStatus={activeRequest.status}
            hasOffers={offers.length > 0}
          />
        )}
      </div>

      {/* 3. Navigation Sub-Tabs */}
      {activeRequest && (
        <div className="flex space-x-2 space-x-reverse border-b border-slate-200 dark:border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            ساختار مالی و نیازمندی‌ها
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('readiness')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'readiness'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ارزیابی آمادگی اعتباری ({readiness?.status || 'بررسی'})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'partners'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>نهادهای مالی همکار ({partners.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
              activeTab === 'offers'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>پیشنهادهای تسهیلات ({offers.length})</span>
          </button>
        </div>
      )}

      {/* 4. Tab Content */}
      {loading ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-xs text-slate-500">در حال بارگذاری اطلاعات مالی طرح...</p>
        </div>
      ) : !activeRequest ? (
        <FinancingEmptyState
          type="NO_REQUEST"
          actionText="تدوین درخواست تسهیلات"
          onAction={() => setShowApplicationModal(true)}
        />
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <FinancingNeedSummary
                request={activeRequest}
                onEdit={() => setShowApplicationModal(true)}
              />

              {/* Quick Readiness Callout */}
              {readiness && (
                <FinancingReadiness readiness={readiness} />
              )}
            </div>
          )}

          {activeTab === 'readiness' && (
            <FinancingReadiness readiness={readiness} />
          )}

          {activeTab === 'partners' && (
            <FinancingPartnerMatches
              requestId={activeRequest.id}
              partners={partners}
              matchingResults={matches}
              onSubmitToPartner={handleSubmitToPartner}
            />
          )}

          {activeTab === 'offers' && (
            <FinancingOfferInbox
              offers={offers}
              partners={partners}
              selectedOfferId={activeRequest.status === 'OFFER_SELECTED' ? offers.find((o) => o.status === 'SELECTED')?.id : undefined}
              onSelectOffer={(offer) => setOfferToSelect(offer)}
              onOpenComparison={() => setShowComparisonModal(true)}
              onRefresh={loadData}
            />
          )}
        </>
      )}

      {/* Modals */}
      {showApplicationModal && (
        <FinancingApplicationFlow
          project={project}
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          onCreated={(newReq) => {
            setActiveRequest(newReq);
            loadData();
          }}
        />
      )}

      {showComparisonModal && offers.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <FinancingOfferComparison
              offers={offers}
              partners={partners}
              selectedOfferId={activeRequest?.status === 'OFFER_SELECTED' ? offers.find((o) => o.status === 'SELECTED')?.id : undefined}
              onSelectOffer={(offer) => {
                setShowComparisonModal(false);
                setOfferToSelect(offer);
              }}
              onClose={() => setShowComparisonModal(false)}
            />
          </div>
        </div>
      )}

      {offerToSelect && (
        <FinancingSelectionReview
          offer={offerToSelect}
          partner={partners.find((p) => p.id === offerToSelect.financialPartnerProfileId)}
          isOpen={!!offerToSelect}
          onClose={() => setOfferToSelect(null)}
          onConfirmSelection={handleConfirmSelectOffer}
          isProcessing={isProcessingSelection}
        />
      )}
    </div>
  );
};
