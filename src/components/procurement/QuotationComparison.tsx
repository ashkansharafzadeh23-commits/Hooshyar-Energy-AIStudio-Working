import React from 'react';
import { VendorQuote } from '../../types/procurement';
import { formatCurrencyIRR, formatJalaliDate } from '../../utils/formatters';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { ArrowRight, ShoppingCart, Info, Check, ShieldCheck } from 'lucide-react';

interface QuotationComparisonProps {
  quotes: VendorQuote[];
  isOwnerOrEPC: boolean;
  onClose: () => void;
  onSelectQuote: (quote: VendorQuote) => void;
  className?: string;
}

export const QuotationComparison: React.FC<QuotationComparisonProps> = ({
  quotes,
  isOwnerOrEPC,
  onClose,
  onSelectQuote,
  className = ''
}) => {
  if (quotes.length === 0) return null;

  const validPrices = quotes.map(q => q.totalPrice).filter((p): p is number => typeof p === 'number' && p > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  const validLeadTimes = quotes.map(q => q.deliveryLeadTimeDays).filter((t): t is number => typeof t === 'number' && t > 0);
  const minLeadTime = validLeadTimes.length > 0 ? Math.min(...validLeadTimes) : null;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              مقایسه پیش‌فاکتورهای تأمین تجهیزات
            </span>
            <DataTruthBadge type="VENDOR_SUBMITTED" size="sm" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            مقایسه رو در روی پیش‌فاکتورهای فروشندگان ({quotes.length} پیش‌فاکتور)
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer min-h-[44px]"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به صندوق پیش‌فاکتورها</span>
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850">
              <th className="p-3 font-bold text-slate-700 dark:text-zinc-300 w-44">شاخص ارزیابی</th>
              {quotes.map(quote => {
                const isMinPrice = minPrice !== null && quote.totalPrice === minPrice;
                const isMinTime = minLeadTime !== null && quote.deliveryLeadTimeDays === minLeadTime;
                const vendorName = quote.vendorId ? `فروشنده ${quote.vendorId.substring(0, 8)}` : 'تأمین‌کننده';

                return (
                  <th key={quote.id} className="p-3 font-bold text-slate-900 dark:text-zinc-100 min-w-[200px]">
                    <div className="text-sm">{vendorName}</div>
                    <div className="text-[11px] font-mono font-normal text-slate-400 mt-0.5">کد: {quote.quoteCode || quote.id.substring(0, 8)}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {isMinPrice && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          کمترین مبلغ
                        </span>
                      )}
                      {isMinTime && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          سریع‌ترین تحویل
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">مبلغ کل پیش‌فاکتور</td>
              {quotes.map(q => (
                <td key={q.id} className="p-3 font-bold font-mono text-sm text-blue-700 dark:text-blue-300">
                  {q.totalPrice ? formatCurrencyIRR(q.totalPrice) : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">زمان تحویل (روز کاری)</td>
              {quotes.map(q => (
                <td key={q.id} className="p-3 font-semibold text-slate-800 dark:text-zinc-200">
                  {q.deliveryLeadTimeDays ? `${q.deliveryLeadTimeDays} روز` : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">اعتبار پیش‌فاکتور</td>
              {quotes.map(q => (
                <td key={q.id} className="p-3 text-slate-800 dark:text-zinc-200">
                  {q.validUntil ? formatJalaliDate(q.validUntil) : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">گارانتی اصالت و راندمان</td>
              {quotes.map(q => (
                <td key={q.id} className="p-3 text-slate-800 dark:text-zinc-200">
                  {q.warrantySummary || 'ارائه نشده'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">شرایط پرداخت</td>
              {quotes.map(q => (
                <td key={q.id} className="p-3 text-slate-700 dark:text-zinc-300">
                  {q.paymentTerms || 'ارائه نشده'}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">وضعیت تطابق فنی</td>
              {quotes.map(q => (
                <td key={q.id} className="p-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    تطابق کامل در انتظار بازرسی و تحویل
                  </span>
                </td>
              ))}
            </tr>

            {isOwnerOrEPC && (
              <tr className="bg-slate-50/70 dark:bg-zinc-850/60">
                <td className="p-3 font-bold text-slate-700 dark:text-zinc-300">اقدام خرید</td>
                {quotes.map(q => (
                  <td key={q.id} className="p-3">
                    <button
                      type="button"
                      onClick={() => onSelectQuote(q)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer min-h-[44px]"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>صدور سفارش خرید</span>
                    </button>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="lg:hidden space-y-4">
        {quotes.map((quote, idx) => (
          <div key={quote.id} className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-850/50 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] text-slate-400 font-mono">پیش‌فاکتور ۰{idx + 1}</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                  {quote.vendorId ? `فروشنده ${quote.vendorId.substring(0, 8)}` : 'تأمین‌کننده'}
                </h4>
              </div>
              <div className="font-bold font-mono text-sm text-blue-700 dark:text-blue-300">
                {quote.totalPrice ? formatCurrencyIRR(quote.totalPrice) : 'ارائه نشده'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-zinc-700">
              <div>
                <span className="text-slate-400 block mb-0.5">زمان تحویل:</span>
                <span className="font-semibold">{quote.deliveryLeadTimeDays ? `${quote.deliveryLeadTimeDays} روز` : 'ارائه نشده'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">گارانتی:</span>
                <span className="font-semibold">{quote.warrantySummary || 'ارائه نشده'}</span>
              </div>
            </div>

            {isOwnerOrEPC && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onSelectQuote(quote)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs min-h-[44px]"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>صدور سفارش خرید</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
