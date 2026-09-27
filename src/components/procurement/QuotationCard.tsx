import React, { useState } from 'react';
import { VendorQuote } from '../../types/procurement';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { formatCurrencyIRR, formatJalaliDate } from '../../utils/formatters';
import { ShoppingCart, Clock, ShieldCheck, ChevronDown, ChevronUp, Check, Layers, Award } from 'lucide-react';

interface QuotationCardProps {
  quote: VendorQuote;
  isSelected?: boolean;
  isInComparison?: boolean;
  isOwnerOrEPC: boolean;
  onToggleCompare?: () => void;
  onSelectForPO?: () => void;
  className?: string;
}

export const QuotationCard: React.FC<QuotationCardProps> = ({
  quote,
  isSelected = false,
  isInComparison = false,
  isOwnerOrEPC,
  onToggleCompare,
  onSelectForPO,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const vendorName = quote.vendorId ? `فروشنده ${quote.vendorId.substring(0, 8)}` : 'تأمین‌کننده تجهیزات';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELECTED':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            برگزیده جهت سفارش
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            پیش‌فاکتور رسمی
          </span>
        );
      case 'REJECTED':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
            رد شده
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
            {status}
          </span>
        );
    }
  };

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
              {vendorName}
            </h4>
            {getStatusBadge(quote.status)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <span>شماره پیش‌فاکتور: <span className="font-mono">{quote.quoteCode || quote.id.substring(0, 8)}</span></span>
            <span>•</span>
            <DataTruthBadge type="VENDOR_SUBMITTED" size="sm" />
          </div>
        </div>

        {/* Pricing */}
        <div className="text-right sm:text-left">
          <div className="text-[11px] text-slate-400 dark:text-zinc-500">مبلغ کل پیش‌فاکتور:</div>
          <div className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 font-mono">
            {quote.totalPrice ? formatCurrencyIRR(quote.totalPrice) : 'ارائه نشده'}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 block mb-0.5">زمان تحویل</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {quote.deliveryLeadTimeDays ? `${quote.deliveryLeadTimeDays} روز کاری` : 'ارائه نشده'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 block mb-0.5">اعتبار پیش‌فاکتور</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {quote.validUntil ? formatJalaliDate(quote.validUntil) : 'ارائه نشده'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 block mb-0.5">تعداد اقلام</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
            {quote.quoteItems ? `${quote.quoteItems.length} قلم` : 'ارائه نشده'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-400 block mb-0.5">گارانتی اعلام‌شده</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {quote.warrantySummary || 'ارائه نشده'}
          </span>
        </div>
      </div>

      {/* Expandable details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs space-y-2">
          {quote.paymentTerms && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">شرایط پرداخت: </span>
              <span className="text-slate-600 dark:text-zinc-400">{quote.paymentTerms}</span>
            </div>
          )}
          {quote.assumptions && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">مفروضات فروشنده: </span>
              <span className="text-slate-600 dark:text-zinc-400">{quote.assumptions}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400 cursor-pointer min-h-[44px] px-2"
        >
          <span>{showDetails ? 'بستن جزئیات' : 'مشاهده جزئیات پیش‌فاکتور'}</span>
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

          {isOwnerOrEPC && quote.status !== 'SELECTED' && onSelectForPO && (
            <button
              type="button"
              onClick={onSelectForPO}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer min-h-[44px]"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>انتخاب و صدور سفارش خرید</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
