import React from 'react';
import { 
  Building2, 
  Coins, 
  Percent, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronLeft, 
  FileText, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { FinancingOffer, FinancialPartnerProfile } from '../../types/financing';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingOfferCardProps {
  offer: FinancingOffer;
  partner?: FinancialPartnerProfile | any;
  isSelected?: boolean;
  onSelect?: () => void;
  onViewComparison?: () => void;
  disabled?: boolean;
}

export const FinancingOfferCard: React.FC<FinancingOfferCardProps> = ({
  offer,
  partner,
  isSelected = false,
  onSelect,
  onViewComparison,
  disabled = false
}) => {
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null || val <= 0) return 'ارائه نشده';
    if (val >= 1000000000) {
      return `${(val / 1000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد تومان`;
    }
    if (val >= 1000000) {
      return `${(val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} میلیون تومان`;
    }
    return `${val.toLocaleString('fa-IR')} تومان`;
  };

  const partnerName = partner?.name || partner?.displayName || 'نهاد مالی همکار';

  const repaymentLabels: Record<string, string> = {
    EQUAL_INSTALLMENT: 'اقساط مساوی',
    STEP_UP: 'پلکانی صعودی',
    BALLOON: 'یکجا در سررسید',
    SEASONAL: 'اقساط فصلی بر مبنای تابش'
  };

  const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
    DRAFT: { label: 'پیش‌نویس', bg: 'bg-slate-100 text-slate-600', text: 'text-slate-600' },
    SUBMITTED: { label: 'پیشنهاد اولیه دریافت شد', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700' },
    UNDER_REVIEW: { label: 'در حال بررسی متقاضی', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' },
    SELECTED: { label: 'پیشنهاد منتخب کارفرما', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-black', text: 'text-emerald-800' },
    FINAL: { label: 'تصویب و ابلاغ نهایی', bg: 'bg-emerald-600 text-white font-black', text: 'text-emerald-600' },
    DECLINED: { label: 'رد شده', bg: 'bg-slate-100 text-slate-400', text: 'text-slate-400' }
  };

  const currentStatus = statusLabels[offer.status] || {
    label: offer.status,
    bg: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700'
  };

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border transition-all flex flex-col justify-between ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950 shadow-md'
          : 'border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-blue-300'
      }`}
    >
      <div>
        {/* Header: Partner Name, Status Badge, Provenance */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
                {partnerName}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[11px] text-slate-400">
                  {offer.offerCode}
                </span>
                <DataTruthBadge provenance="PARTNER_SUBMITTED" />
              </div>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${currentStatus.bg} shrink-0`}>
            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>{currentStatus.label}</span>
          </span>
        </div>

        {/* 4 Core Financial Terms */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 mb-4">
          {/* Offered Amount */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 block">مبلغ مصوب تسهیلات:</span>
            <div className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-zinc-100 font-mono">
              <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{formatMoney(offer.offeredAmount)}</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 block">نرخ سود سالانه اعلامی:</span>
            <div className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-zinc-100 font-mono">
              <Percent className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{offer.interestRate ? `${offer.interestRate}٪` : 'ارائه نشده'}</span>
            </div>
          </div>

          {/* Tenor */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 block">مدت بازپرداخت:</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{offer.tenorMonths ? `${offer.tenorMonths} ماه` : 'ارائه نشده'}</span>
            </div>
          </div>

          {/* Grace Period */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 block">دوره تنفس ساخت:</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{offer.gracePeriodMonths !== undefined ? `${offer.gracePeriodMonths} ماه` : 'ارائه نشده'}</span>
            </div>
          </div>
        </div>

        {/* Collateral & Conditions */}
        <div className="space-y-2 mb-4 text-xs">
          {offer.collateralRequirements && offer.collateralRequirements.length > 0 && (
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80">
              <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">وثایق مورد مطالبه:</span>
              <ul className="space-y-0.5 pr-3 text-[11px] text-slate-600 dark:text-zinc-400">
                {offer.collateralRequirements.map((col, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-400" />
                    <span>{col}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {offer.notes && (
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed italic">
              «{offer.notes}»
            </p>
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
        {onViewComparison && (
          <button
            type="button"
            onClick={onViewComparison}
            className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 cursor-pointer min-h-[44px] px-2"
          >
            مقایسه با سایر پیشنهادها
          </button>
        )}

        {onSelect && (
          <button
            type="button"
            onClick={onSelect}
            disabled={disabled || isSelected || offer.status === 'SELECTED' || offer.status === 'FINAL'}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px] ${
              isSelected || offer.status === 'SELECTED' || offer.status === 'FINAL'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSelected || offer.status === 'SELECTED' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>پیشنهاد انتخاب شده</span>
              </>
            ) : (
              <>
                <span>انتخاب این پیشنهاد</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
