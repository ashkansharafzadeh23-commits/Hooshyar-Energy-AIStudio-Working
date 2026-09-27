import React from 'react';
import { EpcBid } from '../../types/rfq';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { formatCurrencyIRR, formatJalaliDate } from '../../utils/formatters';
import { Clock, Calendar, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, FileText, Check, Award } from 'lucide-react';

interface BidCardProps {
  bid: EpcBid;
  isSelected?: boolean;
  isInComparison?: boolean;
  isOwnerOrAdmin: boolean;
  onToggleCompare?: () => void;
  onViewDetails?: () => void;
  onSelectBid?: () => void;
  className?: string;
}

export const BidCard: React.FC<BidCardProps> = ({
  bid,
  isSelected = false,
  isInComparison = false,
  isOwnerOrAdmin,
  onToggleCompare,
  onViewDetails,
  onSelectBid,
  className = ''
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  // Status mapping
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
            <Award className="w-3.5 h-3.5" />
            منتخب کارفرما
          </span>
        );
      case 'SHORTLISTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
            در فهرست کوتاه
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
            رد شده
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
            انصراف داده
          </span>
        );
      case 'SUBMITTED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
            پیشنهاد دریافت شده
          </span>
        );
    }
  };

  const epcName = bid.epcOrganizationName || bid.epcCompanyName || `پیمانکار ${bid.epcOrganizationId?.substring(0, 8) || 'EPC'}`;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isSelected
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700 shadow-sm'
          : isInComparison
          ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700'
          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs'
      } p-4 sm:p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
              {epcName}
            </h4>
            {getStatusBadge(bid.status)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <span>کد پیشنهاد: <span className="font-mono">{bid.bidCode || bid.id.substring(0, 8)}</span></span>
            <span>•</span>
            <DataTruthBadge type="CONTRACTOR_SUBMITTED" size="sm" />
          </div>
        </div>

        {/* Pricing Headline */}
        <div className="text-right sm:text-left">
          <div className="text-[11px] text-slate-400 dark:text-zinc-500">مبلغ پیشنهادی کل:</div>
          <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 font-mono">
            {bid.totalPriceIRR ? formatCurrencyIRR(bid.totalPriceIRR) : 'ارائه نشده'}
          </div>
        </div>
      </div>

      {/* Grid of Key Technical/Commercial Facts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 dark:text-zinc-500 block mb-0.5">مدت زمان اجرا</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {bid.timelineDays ? `${bid.timelineDays} روز کاری` : 'ارائه نشده'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 dark:text-zinc-500 block mb-0.5">اعتبار پیشنهاد</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {bid.validUntil ? formatJalaliDate(bid.validUntil) : 'ارائه نشده'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 dark:text-zinc-500 block mb-0.5">گارانتی اجرا</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {bid.warrantyYears ? `${bid.warrantyYears} سال` : (bid.warrantyTerms || 'ارائه نشده')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 dark:text-zinc-500 block mb-0.5">پیش‌پرداخت درخواستی</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {bid.downPaymentPercent !== undefined ? `${bid.downPaymentPercent}٪` : 'ارائه نشده'}
          </span>
        </div>
      </div>

      {/* Equipment and Technical Specification Summary (if available) */}
      {(bid.equipmentSummary || bid.technicalProposalNotes) && (
        <div className="mt-2 text-xs text-slate-600 dark:text-zinc-300 bg-slate-50/50 dark:bg-zinc-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800">
          <span className="font-semibold text-slate-800 dark:text-zinc-200">خلاصه فنی و تجهیزات: </span>
          {typeof bid.equipmentSummary === 'string'
            ? bid.equipmentSummary
            : (bid.equipmentSummary ? Object.entries(bid.equipmentSummary).map(([k, v]) => `${k}: ${v}`).join('، ') : bid.technicalProposalNotes)}
        </div>
      )}

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs space-y-2">
          {bid.paymentTerms && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">شرایط پرداخت: </span>
              <span className="text-slate-600 dark:text-zinc-400">{bid.paymentTerms}</span>
            </div>
          )}
          {bid.technicalDeviations && (
            <div>
              <span className="font-semibold text-amber-700 dark:text-amber-400">انحرافات فنی نسبت به استعلام: </span>
              <span className="text-slate-600 dark:text-zinc-400">{bid.technicalDeviations}</span>
            </div>
          )}
          {bid.submittedAt && (
            <div className="text-[11px] text-slate-400 dark:text-zinc-500">
              تاریخ ثبت پیشنهاد: {formatJalaliDate(bid.submittedAt)}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer min-h-[44px] px-2"
        >
          <span>{showDetails ? 'بستن جزئیات' : 'مشاهده جزئیات'}</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <div className="flex items-center gap-2">
          {onToggleCompare && (
            <button
              type="button"
              onClick={onToggleCompare}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[44px] ${
                isInComparison
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50'
              }`}
            >
              {isInComparison && <Check className="w-3.5 h-3.5" />}
              <span>{isInComparison ? 'در لیست مقایسه' : 'افزودن به مقایسه'}</span>
            </button>
          )}

          {isOwnerOrAdmin && bid.status !== 'SELECTED' && onSelectBid && (
            <button
              type="button"
              onClick={onSelectBid}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer min-h-[44px]"
            >
              <Award className="w-4 h-4" />
              <span>انتخاب این پیمانکار</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
