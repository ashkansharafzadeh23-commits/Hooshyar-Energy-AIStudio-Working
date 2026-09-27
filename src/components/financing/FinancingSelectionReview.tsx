import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Coins, 
  Percent, 
  Clock, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { FinancingOffer, FinancialPartnerProfile } from '../../types/financing';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingSelectionReviewProps {
  offer: FinancingOffer;
  partner?: FinancialPartnerProfile | any;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSelection: () => Promise<void>;
  isProcessing?: boolean;
}

export const FinancingSelectionReview: React.FC<FinancingSelectionReviewProps> = ({
  offer,
  partner,
  isOpen,
  onClose,
  onConfirmSelection,
  isProcessing = false
}) => {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-Vazirmatn">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                تأیید نهایی انتخاب پیشنهاد تأمین مالی
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              بررسی تعهدات و تبعات فرآیندی پیش از اعلام رسمی موافقت به نهاد مالی
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer min-h-[44px]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Terms Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-700/60">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">{partnerName}</span>
            </div>
            <span className="font-mono text-xs text-slate-400">{offer.offerCode}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">مبلغ مصوب تسهیلات:</span>
              <span className="font-black text-slate-900 dark:text-zinc-100 font-mono text-sm">
                {formatMoney(offer.offeredAmount)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">نرخ سود سالانه:</span>
              <span className="font-black text-slate-900 dark:text-zinc-100 font-mono text-sm">
                {offer.interestRate}%
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">مدت بازپرداخت:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                {offer.tenorMonths} ماه
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">دوره تنفس:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
                {offer.gracePeriodMonths !== undefined && offer.gracePeriodMonths !== null ? `${offer.gracePeriodMonths} ماه` : 'ثبت نشده'}
              </span>
            </div>
          </div>
        </div>

        {/* Process Consequences Explanation (Answers Questions 4 & 5) */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2.5 text-xs text-slate-700 dark:text-zinc-300">
          <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>پیامدهای فرآیندی پس از تأیید این انتخاب:</span>
          </div>

          <ul className="space-y-1.5 pr-4 text-blue-800 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>وضعیت پرونده به «پیشنهاد منتخب (OFFER_SELECTED)» تغییر خواهد یافت.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>سایر پیشنهادهای همزمان به عنوان «غیرمنتخب (DECLINED)» نشانه‌گذاری می‌شوند.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span>پرونده پروژه جهت مبادله اسناد توثیق و عقد قرارداد به نهاد مالی ({partnerName}) ابلاغ می‌گردد.</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
          >
            انصراف و بازگشت
          </button>

          <button
            type="button"
            onClick={onConfirmSelection}
            disabled={isProcessing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span>در حال ثبت انتخاب...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تأیید قطعی و انتخاب پیشنهاد</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
