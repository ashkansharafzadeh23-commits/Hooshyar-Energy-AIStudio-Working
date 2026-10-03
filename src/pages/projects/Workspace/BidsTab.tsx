import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Award, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  ArrowUpDown, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileCheck,
  FileText,
  Calendar,
  Layers,
  Check,
  X,
  Info
} from 'lucide-react';
import { EPCBid, ProjectRFQ } from '../../../types/rfq.js';
import { BidDocumentsManager } from '../../../components/rfq/BidDocumentsManager.js';
import { PersianConfirmModal } from '../../../components/common/PersianConfirmModal.js';
import { formatCurrencyIRR, formatJalaliDate, formatPersianNumber } from '../../../utils/formatters.js';

export interface BidsTabProps {
  projectId: string;
  project: any;
  onProjectUpdate?: () => void;
  previewMode?: boolean;
  initialRfq?: ProjectRFQ | null;
  initialBids?: EPCBid[];
  initialComparison?: any;
}

export default function BidsTab({ 
  projectId, 
  project, 
  onProjectUpdate,
  previewMode = false,
  initialRfq = null,
  initialBids = [],
  initialComparison = null
}: BidsTabProps) {
  const [rfq, setRfq] = useState<ProjectRFQ | null>(initialRfq);
  const [bids, setBids] = useState<EPCBid[]>(initialBids);
  const [comparison, setComparison] = useState<any>(initialComparison);
  const [loading, setLoading] = useState(!previewMode);
  const [showComparison, setShowComparison] = useState(false);
  const [expandedBidId, setExpandedBidId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedBidToAward, setSelectedBidToAward] = useState<EPCBid | null>(null);

  useEffect(() => {
    if (previewMode) {
      if (initialRfq) setRfq(initialRfq);
      if (initialBids) setBids(initialBids);
      if (initialComparison) setComparison(initialComparison);
      setLoading(false);
      return;
    }
    loadData();
  }, [projectId, previewMode, initialRfq, initialBids, initialComparison]);

  const loadData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // 1. Fetch project RFQ
      const rfqRes = await fetch(`/api/rfq/project/${projectId}`, { headers });
      if (rfqRes.ok) {
        const rfqs = await rfqRes.json();
        if (Array.isArray(rfqs) && rfqs.length > 0) {
          const activeRfq = rfqs[0];
          setRfq(activeRfq);

          // 2. Fetch RFQ Bids
          const bidsRes = await fetch(`/api/rfq/${activeRfq.id}/bids`, { headers });
          if (bidsRes.ok) {
            const bidsData = await bidsRes.json();
            setBids(bidsData);
          }

          // 3. Fetch structured comparison if available
          const compRes = await fetch(`/api/rfq/${activeRfq.id}/comparison`, { headers });
          if (compRes.ok) {
            const compData = await compRes.json();
            setComparison(compData);
          }
        }
      }
    } catch (err) {
      console.error('Error loading bids data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBidConfirm = async () => {
    if (!selectedBidToAward) return;
    const bidId = selectedBidToAward.id;
    const contractorName = selectedBidToAward.epcOrganization?.tradeName || selectedBidToAward.epcOrganization?.legalName || selectedBidToAward.epcCompanyName || 'پیمانکار';

    setActionLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rfq/bids/${bidId}/select`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setActionMessage({ 
          type: 'success', 
          text: `پیمانکار «${contractorName}» به عنوان مجری رسمی پروژه انتخاب شد و فرآیند آماده‌سازی قرارداد آغاز گردید.` 
        });
        setSelectedBidToAward(null);
        await loadData();
        if (onProjectUpdate) onProjectUpdate();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در انتخاب مجری' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBidStatus = async (bidId: string, status: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/rfq/bids/${bidId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        const statusLabels: Record<string, string> = {
          SHORTLISTED: 'فهرست کوتاه',
          REJECTED: 'رد شده',
          UNDER_REVIEW: 'در حال بررسی',
          ACCEPTED: 'مجری منتخب'
        };
        setActionMessage({ type: 'success', text: `وضعیت پیشنهاد به «${statusLabels[status] || status}» تغییر یافت.` });
        await loadData();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'خطا در تغییر وضعیت پیشنهاد' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطا در ارتباط با سرور' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
      case 'SELECTED':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 size={13} /> مجری منتخب
          </span>
        );
      case 'SHORTLISTED':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            فهرست کوتاه
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            در حال بررسی
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
            رد شده
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-500">
            انصراف داده
          </span>
        );
      case 'SUBMITTED':
      default:
        return (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            پیشنهاد دریافت شده
          </span>
        );
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-slate-500 bg-slate-100 dark:bg-zinc-800';
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    if (score >= 65) return 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
    return 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
  };

  const renderDocumentSummary = (techCount: number, commCount: number) => {
    if (techCount === 0 && commCount === 0) {
      return (
        <span className="text-slate-400 font-normal">
          سند فنی یا مالی ارائه نشده
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {techCount > 0 ? (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] dark:text-blue-300 font-medium text-[11px] border border-blue-200/50">
            {formatPersianNumber(techCount)} سند فنی
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 font-normal text-[11px]">
            سند فنی ارائه نشده
          </span>
        )}
        {commCount > 0 ? (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] border border-emerald-200/50">
            {formatPersianNumber(commCount)} سند مالی و تجاری
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 font-normal text-[11px]">
            سند مالی و تجاری ارائه نشده
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center font-bold text-slate-500">
        در حال بارگذاری و ارزیابی پیشنهادات EPC...
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center py-16">
        <AlertCircle size={40} className="mx-auto text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">ابتدا استعلام EPC را ایجاد کنید</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          برای دریافت و مقایسه پیشنهادات پیمانکاران، ابتدا در تب «استعلام (RFQ)» پروژه اقدام به صدور استعلام فرمایید.
        </p>
      </div>
    );
  }

  // Pre-calculate confirmation modal data
  const modalContractorName = selectedBidToAward?.epcOrganization?.tradeName || 
    selectedBidToAward?.epcOrganization?.legalName || 
    selectedBidToAward?.epcCompanyName || 
    'شرکت پیمانکار';
  const modalBidCode = selectedBidToAward?.bidCode || selectedBidToAward?.id?.substring(0, 8) || 'نامشخص';
  const modalPrice = selectedBidToAward?.totalPriceIRR || selectedBidToAward?.proposedPriceIRR;
  const modalPriceFormatted = modalPrice 
    ? `${formatPersianNumber(Math.round(modalPrice / 10000000))} میلیون تومان (${formatCurrencyIRR(modalPrice)} ریال)`
    : 'مبلغ به صورت تفکیکی ثبت نشده است';

  return (
    <div className="space-y-6" dir="rtl">
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'}`}>
          {actionMessage.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertCircle size={20} className="text-red-600 shrink-0" />}
          <span className="text-sm font-bold">{actionMessage.text}</span>
        </div>
      )}

      {/* 1. HEADER & SUMMARY INBOX BAR */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
              {rfq.rfqCode}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {bids.length > 0 ? `${bids.length} پیشنهاد ثبت‌شده` : 'هنوز پیشنهادی دریافت نشده است'}
            </span>
            {rfq.submissionDeadline && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                • مهلت: {formatJalaliDate(rfq.submissionDeadline)}
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            صندوق و ارزیابی پیشنهادات پیمانکاران EPC
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            بررسی مشخصات فنی، قیمت، تجهیزات پیشنهادی و اسناد مهندسی ارائه‌شده توسط پیمانکاران
          </p>
        </div>

        {bids.length > 0 && (
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setShowComparison(!showComparison)}
              className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#0284C7] dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors min-h-[44px] cursor-pointer"
            >
              <ArrowUpDown size={16} />
              <span>{showComparison ? 'بستن بخش مقایسه' : 'مقایسه پیشنهادهای دریافتی'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. BID COMPARISON SECTION (DESKTOP MATRIX + MOBILE CARDS) */}
      {showComparison && bids.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-blue-200 dark:border-blue-900/60 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers size={18} className="text-[#0284C7]" />
                مقایسه پیشنهادهای دریافتی ({bids.length} پیشنهاد)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مقایسه تطبیقی بر مبنای شاخص‌های فنی، قیمت، تجهیزات، ضمانت و مدارک ارائه‌شده
              </p>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
              داده‌های ارائه شده توسط پیمانکاران
            </div>
          </div>

          {/* DESKTOP COMPARISON TABLE (hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300">
                  <th className="p-3 font-bold">پیمانکار EPC</th>
                  <th className="p-3 font-bold">مبلغ کل پیشنهادی</th>
                  <th className="p-3 font-bold">مدت زمان اجرا</th>
                  <th className="p-3 font-bold">تولید سالیانه اعلامی پیمانکار</th>
                  <th className="p-3 font-bold">برند پنل خورشیدی</th>
                  <th className="p-3 font-bold">برند اینورتر</th>
                  <th className="p-3 font-bold">مدت گارانتی</th>
                  <th className="p-3 font-bold">اسناد پیوست</th>
                  <th className="p-3 font-bold text-center">اقدامات ارزیابی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {bids.map((b) => {
                  const org = b.epcOrganization;
                  const price = b.totalPriceIRR || b.proposedPriceIRR;
                  const priceToman = price ? Math.round(price / 10000000) : null;
                  const techDocCount = (b.technicalDocuments?.length || 0) + (b.documents?.filter(d => d.category === 'TECHNICAL').length || 0);
                  const commDocCount = (b.commercialDocuments?.length || 0) + (b.documents?.filter(d => d.category === 'COMMERCIAL').length || 0);

                  const panel = b.equipmentSpecs?.panelBrand || b.equipmentSummary?.panels;
                  const inverter = b.equipmentSpecs?.inverterBrand || b.equipmentSummary?.inverters;

                  return (
                    <tr key={b.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors ${b.status === 'ACCEPTED' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                      <td className="p-3">
                        <div className="text-slate-900 dark:text-slate-100 font-bold">
                          {org?.tradeName || org?.legalName || b.epcOrganizationName || b.epcCompanyName || 'شرکت پیمانکار'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.bidCode || b.id.substring(0, 8)}</div>
                      </td>
                      <td className="p-3 font-black text-blue-700 dark:text-blue-300">
                        {priceToman ? `${formatPersianNumber(priceToman)} میلیون تومان` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                      </td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                        {b.timelineDays ? `${formatPersianNumber(b.timelineDays)} روز کاری` : (b.executionDays ? `${formatPersianNumber(b.executionDays)} روز` : <span className="font-normal text-slate-400">ارائه نشده</span>)}
                      </td>
                      <td className="p-3">
                        {b.guaranteedAnnualYieldMwh ? (
                          <div>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatPersianNumber(b.guaranteedAnnualYieldMwh)} MWh/سال</span>
                            <span className="text-[10px] text-slate-400 block font-normal">اعلامی پیمانکار</span>
                          </div>
                        ) : (
                          <span className="font-normal text-slate-400">ارائه نشده</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {panel ? (
                          <span dir="ltr" className="inline-block font-mono text-left font-bold text-slate-800 dark:text-slate-200">
                            {panel}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">ارائه نشده</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {inverter ? (
                          <span dir="ltr" className="inline-block font-mono text-left font-bold text-slate-800 dark:text-slate-200">
                            {inverter}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">ارائه نشده</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                        {b.warrantyYears ? `${formatPersianNumber(b.warrantyYears)} سال` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {renderDocumentSummary(techDocCount, commDocCount)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setExpandedBidId(b.id);
                              const el = document.getElementById(`bid-card-${b.id}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="bg-blue-50 hover:bg-blue-100 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-300 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800/60 min-h-[44px] flex items-center justify-center cursor-pointer"
                          >
                            مشاهده جزئیات
                          </button>

                          {b.status === 'ACCEPTED' ? (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-2 rounded-lg min-h-[44px] flex items-center">
                              مجری منتخب
                            </span>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => setSelectedBidToAward(b)}
                              disabled={actionLoading}
                              className="bg-white dark:bg-zinc-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
                            >
                              انتخاب مجری
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE COMPARISON CARDS (Zero Clipping, High Information Density) */}
          <div className="block md:hidden space-y-3">
            {bids.map((b, idx) => {
              const org = b.epcOrganization;
              const epcName = org?.tradeName || org?.legalName || b.epcOrganizationName || b.epcCompanyName || 'شرکت پیمانکار';
              const price = b.totalPriceIRR || b.proposedPriceIRR;
              const priceToman = price ? Math.round(price / 10000000) : null;
              const techDocCount = (b.technicalDocuments?.length || 0) + (b.documents?.filter(d => d.category === 'TECHNICAL').length || 0);
              const commDocCount = (b.commercialDocuments?.length || 0) + (b.documents?.filter(d => d.category === 'COMMERCIAL').length || 0);

              const panel = b.equipmentSpecs?.panelBrand || b.equipmentSummary?.panels;
              const inverter = b.equipmentSpecs?.inverterBrand || b.equipmentSummary?.inverters;

              return (
                <div 
                  key={b.id} 
                  className={`p-4 rounded-xl border ${
                    b.status === 'ACCEPTED' 
                      ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20' 
                      : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-850/50'
                  } space-y-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">پیشنهاد ۰{idx + 1}</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{epcName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{b.bidCode || b.id.substring(0, 8)}</span>
                    </div>
                    {getStatusBadge(b.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700">
                      <span className="text-[10px] text-slate-400 block mb-0.5">مبلغ کل پیشنهادی:</span>
                      <span className="font-bold text-blue-700 dark:text-blue-300">
                        {priceToman ? `${formatPersianNumber(priceToman)} م.ت` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                      </span>
                    </div>

                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700">
                      <span className="text-[10px] text-slate-400 block mb-0.5">مدت زمان اجرا:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {b.timelineDays ? `${formatPersianNumber(b.timelineDays)} روز کاری` : (b.executionDays ? `${formatPersianNumber(b.executionDays)} روز` : <span className="font-normal text-slate-400">ارائه نشده</span>)}
                      </span>
                    </div>

                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700">
                      <span className="text-[10px] text-slate-400 block mb-0.5">تولید سالیانه اعلامی پیمانکار:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        {b.guaranteedAnnualYieldMwh ? `${formatPersianNumber(b.guaranteedAnnualYieldMwh)} MWh` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-normal mt-0.5">ثبت‌شده توسط شرکت پیمانکار</span>
                    </div>

                    <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700">
                      <span className="text-[10px] text-slate-400 block mb-0.5">مدت گارانتی:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {b.warrantyYears ? `${formatPersianNumber(b.warrantyYears)} سال` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                      </span>
                    </div>
                  </div>

                  {/* Equipment Models with LTR Isolation ONLY on actual English brand models */}
                  <div className="text-xs space-y-1 p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">برند پنل:</span>
                      {panel ? (
                        <span dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200 text-left">
                          {panel}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">
                          ارائه نشده
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">برند اینورتر:</span>
                      {inverter ? (
                        <span dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200 text-left">
                          {inverter}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">
                          ارائه نشده
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-700">
                      <span className="text-[11px] text-slate-400">اسناد پیوست:</span>
                      <div className="text-slate-700 dark:text-slate-300 font-bold">
                        {renderDocumentSummary(techDocCount, commDocCount)}
                      </div>
                    </div>
                  </div>

                  {/* Safe Action Hierarchy: Primary is informational, Secondary is contractor award */}
                  <div className="space-y-2 pt-1">
                    <button 
                      type="button"
                      onClick={() => {
                        setExpandedBidId(b.id);
                        const el = document.getElementById(`bid-card-${b.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 py-2.5 rounded-xl text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800/60 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={16} />
                      <span>مشاهده جزئیات پیشنهاد و اسناد</span>
                    </button>

                    {b.status !== 'ACCEPTED' && (
                      <button 
                        type="button"
                        onClick={() => setSelectedBidToAward(b)}
                        disabled={actionLoading}
                        className="w-full bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-zinc-700 min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                        <span>انتخاب این پیشنهاد به عنوان مجری</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. NO BIDS STATE */}
      {bids.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center py-16">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">هنوز پیشنهادی دریافت نشده است</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            استعلام برای پیمانکاران EPC ارسال شده است. به محض ارسال پیشنهاد فنی و مالی، اطلاعات کامل در این صندوق قرار خواهد گرفت.
          </p>
          <div className="text-xs text-slate-400">
            مهلت استعلام: {rfq.submissionDeadline ? formatJalaliDate(rfq.submissionDeadline) : 'مهلت مشخص نشده است'}
          </div>
        </div>
      )}

      {/* 4. PROCUREMENT BID INBOX LIST */}
      <div className="grid grid-cols-1 gap-4">
        {bids.map((b) => {
          const org = b.epcOrganization;
          const isExpanded = expandedBidId === b.id;
          const epcName = org?.tradeName || org?.legalName || b.epcOrganizationName || b.epcCompanyName || 'شرکت مهندسی EPC';
          const price = b.totalPriceIRR || b.proposedPriceIRR;
          const priceToman = price ? Math.round(price / 10000000) : null;
          const techDocCount = (b.technicalDocuments?.length || 0) + (b.documents?.filter(d => d.category === 'TECHNICAL').length || 0);
          const commDocCount = (b.commercialDocuments?.length || 0) + (b.documents?.filter(d => d.category === 'COMMERCIAL').length || 0);

          const panel = b.equipmentSpecs?.panelBrand || b.equipmentSummary?.panels;
          const inverter = b.equipmentSpecs?.inverterBrand || b.equipmentSummary?.inverters;

          return (
            <div 
              key={b.id} 
              id={`bid-card-${b.id}`}
              className={`bg-white dark:bg-zinc-900 rounded-2xl border p-5 sm:p-6 shadow-sm transition-all ${
                b.status === 'ACCEPTED' 
                  ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950/50' 
                  : 'border-slate-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-zinc-700'
              }`}
            >
              {/* Bid Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
                      {b.bidCode || b.id.substring(0, 8)}
                    </span>
                    {getStatusBadge(b.status)}
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800 flex items-center gap-1">
                      <Check size={12} />
                      EPC احراز صلاحیت شده
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 pt-1">
                    {epcName}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {org?.nationalId && <span>شناسه ملی: <span className="font-mono">{org.nationalId}</span></span>}
                    {b.submittedAt && (
                      <span>• تاریخ ثبت پیشنهاد: {formatJalaliDate(b.submittedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Score & Action Button */}
                <div className="flex flex-wrap items-center gap-3">
                  {b.score?.totalScore !== undefined && (
                    <div className="text-left md:text-right px-4 py-2 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-zinc-700">
                      <span className="text-[10px] text-slate-400 block font-bold">امتیاز ارزیابی فنی-مالی</span>
                      <span className={`text-base sm:text-lg font-black ${b.score.totalScore >= 75 ? 'text-emerald-600' : 'text-[#0284C7]'}`}>
                        {b.score.totalScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ ۱۰۰</span>
                      </span>
                    </div>
                  )}

                  {b.status === 'ACCEPTED' ? (
                    <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm min-h-[44px]">
                      <FileCheck size={16} />
                      <span>قرارداد در حال انعقاد</span>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setSelectedBidToAward(b)}
                      disabled={actionLoading}
                      className="bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-zinc-700 px-5 py-2.5 rounded-xl font-bold transition-colors text-xs shadow-xs flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                    >
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span>انتخاب این مجری برای واگذاری</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Authoritative Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-100 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">مبلغ پیشنهادی کل</span>
                  <span className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-300">
                    {priceToman ? `${formatPersianNumber(priceToman)} میلیون تومان` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">تولید سالیانه اعلامی پیمانکار</span>
                  <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                    {b.guaranteedAnnualYieldMwh ? `${formatPersianNumber(b.guaranteedAnnualYieldMwh)} MWh/سال` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-normal mt-0.5">ثبت‌شده توسط شرکت پیمانکار</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">مدت زمان اجرا</span>
                  <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">
                    {b.timelineDays ? `${formatPersianNumber(b.timelineDays)} روز کاری` : (b.executionDays ? `${formatPersianNumber(b.executionDays)} روز` : <span className="font-normal text-slate-400">ارائه نشده</span>)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1 font-bold">مدت گارانتی</span>
                  <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">
                    {b.warrantyYears ? `${formatPersianNumber(b.warrantyYears)} سال` : <span className="font-normal text-slate-400">ارائه نشده</span>}
                  </span>
                </div>
              </div>

              {/* Documents Badge Availability Strip (Human-readable missing state) */}
              <div className="py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">وضعیت اسناد ارائه‌شده:</span>
                  {renderDocumentSummary(techDocCount, commDocCount)}
                </div>

                <div className="text-[11px] text-slate-400">
                  اطلاعات ثبت‌شده توسط شرکت پیمانکار
                </div>
              </div>

              {/* Risk Flags (if existing) */}
              {b.score?.riskFlags && b.score.riskFlags.length > 0 && (
                <div className="py-3 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <ShieldAlert size={14} className="text-amber-500" /> هشدارهای ریسک:
                  </span>
                  {b.score.riskFlags.map((rf, rIdx) => (
                    <span key={rIdx} className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      rf.severity === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {rf.message || rf.description}
                    </span>
                  ))}
                </div>
              )}

              {/* Toggle Details & Secondary Actions */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                <button 
                  type="button"
                  onClick={() => setExpandedBidId(isExpanded ? null : b.id)}
                  className="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] flex items-center gap-1 min-h-[44px] px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  <span>{isExpanded ? 'بستن جزئیات فنی و اسناد' : 'مشاهده اسناد فنی، مالی و جزئیات تجهیزات'}</span>
                </button>

                <div className="flex items-center gap-2">
                  {b.status !== 'ACCEPTED' && b.status !== 'SHORTLISTED' && (
                    <button 
                      type="button"
                      onClick={() => handleUpdateBidStatus(b.id, 'SHORTLISTED')}
                      className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#0284C7] px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 min-h-[44px] transition-colors cursor-pointer"
                    >
                      افزودن به لیست کوتاه
                    </button>
                  )}
                  {b.status !== 'REJECTED' && b.status !== 'ACCEPTED' && (
                    <button 
                      type="button"
                      onClick={() => handleUpdateBidStatus(b.id, 'REJECTED')}
                      className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px] transition-colors cursor-pointer"
                    >
                      رد پیشنهاد
                    </button>
                  )}
                </div>
              </div>

              {/* EXPANDED DETAILS ACCORDION */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl space-y-4 text-xs">
                  {/* Equipment Specifications Grid */}
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">مشخصات فنی و برندهای پیشنهادی:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-zinc-700">
                      <div>
                        <span className="text-slate-400 block mb-0.5">برند پنل خورشیدی:</span>
                        {panel ? (
                          <span dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200 inline-block text-left">
                            {panel}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">ارائه نشده</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">برند اینورتر:</span>
                        {inverter ? (
                          <span dir="ltr" className="font-mono font-bold text-slate-800 dark:text-slate-200 inline-block text-left">
                            {inverter}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">ارائه نشده</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">سازه و استراکچر:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {b.equipmentSpecs?.rackingType || b.equipmentSummary?.structures || <span className="font-normal text-slate-400">ارائه نشده</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">سیستم مانیتورینگ:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {b.equipmentSpecs?.monitoringIncluded ? 'شامل پایش برخط' : (b.equipmentSummary?.monitoring || <span className="font-normal text-slate-400">ارائه نشده</span>)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Terms & Notes */}
                  {(b.paymentTerms || b.technicalProposalNotes) && (
                    <div className="bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
                      {b.paymentTerms && (
                        <div>
                          <span className="text-slate-400 font-bold block mb-0.5">شرایط پرداخت پیشنهادی:</span>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{b.paymentTerms}</p>
                        </div>
                      )}
                      {b.technicalProposalNotes && (
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-700">
                          <span className="text-slate-400 font-bold block mb-0.5">توضیحات فنی پیشنهاد:</span>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{b.technicalProposalNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Score Breakdown (if calculated by backend) */}
                  {b.score?.breakdown && (
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">تفکیک امتیازات ارزیابی:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-zinc-800 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs">
                        <div>
                          <span className="text-slate-400 block">امتیاز قیمت (۲۵٪):</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{b.score.breakdown.priceScore?.toFixed(1)} / ۲۵</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">مشخصات فنی (۲۵٪):</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{b.score.breakdown.technicalScore?.toFixed(1)} / ۲۵</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">کیفیت تجهیزات (۱۵٪):</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{b.score.breakdown.equipmentScore?.toFixed(1)} / ۱۵</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">مدت گارانتی (۱۰٪):</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{b.score.breakdown.warrantyScore?.toFixed(1)} / ۱۰</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECURE BID DOCUMENTS (TECHNICAL & COMMERCIAL) */}
                  {rfq && (
                    <div className="pt-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                        اسناد و ضمائم مهندسی و مالی پیشنهاد (تفکیک‌شده و امن):
                      </h4>
                      <BidDocumentsManager
                        rfqId={rfq.id}
                        bidId={b.id}
                        isBidOwner={false}
                        canModify={false}
                        legacyTechnical={b.technicalDocuments || []}
                        legacyCommercial={b.commercialDocuments || []}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Selecting Contractor (Zero Native confirm, Full Decision Safety Details) */}
      <PersianConfirmModal
        isOpen={Boolean(selectedBidToAward)}
        onClose={() => setSelectedBidToAward(null)}
        onConfirm={handleSelectBidConfirm}
        title="تایید انتخاب مجری رسمی پروژه"
        message={`آیا از واگذاری رسمی پروژه به شرکت «${modalContractorName}» (شناسه پیشنهاد: ${modalBidCode}) با مبلغ پیشنهادی ${modalPriceFormatted} اطمینان دارید؟ با تایید این اقدام، پیشنهاد به عنوان مجری رسمی انتخاب شده و پروژه وارد فرآیند آماده‌سازی قرارداد نهایی خواهد شد.`}
        confirmText="تایید و انتخاب مجری رسمی"
        cancelText="انصراف"
        variant="primary"
        isSubmitting={actionLoading}
      />
    </div>
  );
}
