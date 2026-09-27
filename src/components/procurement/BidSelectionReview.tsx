import React, { useState } from 'react';
import { EpcBid, RFQ } from '../../types/rfq';
import { formatCurrencyIRR, formatJalaliDate } from '../../utils/formatters';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { Award, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface BidSelectionReviewProps {
  rfq: RFQ;
  bid: EpcBid;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export const BidSelectionReview: React.FC<BidSelectionReviewProps> = ({
  rfq,
  bid,
  isSubmitting,
  onConfirm,
  onCancel,
  className = ''
}) => {
  const epcName = bid.epcOrganizationName || bid.epcCompanyName || `پیمانکار ${bid.epcOrganizationId?.substring(0, 8) || 'EPC'}`;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs ${className}`}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 max-w-xl w-full shadow-xl relative animate-in fade-in zoom-in-95">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              تأیید نهایی انتخاب پیمانکار (EPC Award)
            </h3>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              واگذاری رسمی استعلام و ارتقای پروژه به مرحله قرارداد
            </span>
          </div>
        </div>

        {/* Contractor and Bid Summary */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 my-4 space-y-3">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 dark:border-zinc-700">
            <span className="text-xs text-slate-500 dark:text-zinc-400">پیمانکار برگزیده:</span>
            <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">{epcName}</span>
          </div>

          <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 dark:border-zinc-700">
            <span className="text-xs text-slate-500 dark:text-zinc-400">مبلغ قرارداد پیشنهادی:</span>
            <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
              {bid.totalPriceIRR ? formatCurrencyIRR(bid.totalPriceIRR) : 'ارائه نشده'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 dark:text-zinc-400 block mb-0.5">مدت زمان اجرا:</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {bid.timelineDays ? `${bid.timelineDays} روز کاری` : 'ارائه نشده'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-zinc-400 block mb-0.5">گارانتی اعلام‌شده:</span>
              <span className="font-semibold text-slate-800 dark:text-zinc-200">
                {bid.warrantyYears ? `${bid.warrantyYears} سال` : (bid.warrantyTerms || 'ارائه نشده')}
              </span>
            </div>
          </div>
        </div>

        {/* Truthful Lifecycle Transition Guidance */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 mb-5">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>پیامد قطعی پس از این تصمیم:</span>
          </div>
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            با تأیید این انتخاب، وضعیت استعلام به «واگذار شده (AWARDED)» و وضعیت پروژه در چرخه عمر به «پیمانکار انتخاب شد (EPC_SELECTED)» تغییر خواهد کرد. گام بعدی فرایند، تنظیم پیش‌نویس قرارداد و مبادله موافقت‌نامه رسمی با این پیمانکار است.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer min-h-[44px]"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
          >
            {isSubmitting ? (
              <span>در حال ثبت انتخاب...</span>
            ) : (
              <>
                <Award className="w-4 h-4" />
                <span>تأیید انتخاب پیمانکار</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
