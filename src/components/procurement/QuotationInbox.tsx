import React, { useState } from 'react';
import { ProcurementRFQ, VendorQuote } from '../../types/procurement';
import { QuotationCard } from './QuotationCard';
import { CommercialEmptyState } from './CommercialEmptyState';
import { Layers, RefreshCw } from 'lucide-react';

interface QuotationInboxProps {
  rfq?: ProcurementRFQ;
  quotes: VendorQuote[];
  isOwnerOrEPC: boolean;
  selectedQuoteId?: string;
  onOpenCompare: (selectedQuoteIds: string[]) => void;
  onSelectQuoteForPO: (quote: VendorQuote) => void;
  onRefresh?: () => void;
  className?: string;
}

export const QuotationInbox: React.FC<QuotationInboxProps> = ({
  rfq,
  quotes,
  isOwnerOrEPC,
  selectedQuoteId,
  onOpenCompare,
  onSelectQuoteForPO,
  onRefresh,
  className = ''
}) => {
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'lead_time'>('price_asc');

  const toggleComparison = (quoteId: string) => {
    setComparisonIds(prev =>
      prev.includes(quoteId) ? prev.filter(id => id !== quoteId) : [...prev, quoteId]
    );
  };

  const sortedQuotes = [...quotes].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return (a.totalPrice || 0) - (b.totalPrice || 0);
    }
    if (sortBy === 'price_desc') {
      return (b.totalPrice || 0) - (a.totalPrice || 0);
    }
    return (a.deliveryLeadTimeDays || 9999) - (b.deliveryLeadTimeDays || 9999);
  });

  if (!quotes || quotes.length === 0) {
    return (
      <CommercialEmptyState
        title="هنوز پیشنهادی از فروشندگان دریافت نشده است."
        description="استعلام خرید تجهیزات ثبت شده و در انتظار ارسال پیش‌فاکتور رسمی توسط تأمین‌کنندگان است."
        icon="inbox"
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
            پیش‌فاکتورهای دریافتی فروشندگان ({quotes.length} پیش‌فاکتور)
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            قیمت و شرایط تجهیزات پیشنهادی را ارزیابی و مقایسه فرمایید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 min-h-[44px]"
          >
            <option value="price_asc">کمترین مبلغ پیش‌فاکتور</option>
            <option value="price_desc">بیشترین مبلغ پیش‌فاکتور</option>
            <option value="lead_time">سریع‌ترین زمان تحویل</option>
          </select>

          {comparisonIds.length >= 2 && (
            <button
              type="button"
              onClick={() => onOpenCompare(comparisonIds)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Layers className="w-4 h-4" />
              <span>مقایسه پیش‌فاکتورها ({comparisonIds.length})</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 hover:bg-slate-50 dark:text-zinc-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="بروزرسانی"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {sortedQuotes.map(quote => (
          <QuotationCard
            key={quote.id}
            quote={quote}
            isSelected={quote.id === selectedQuoteId}
            isInComparison={comparisonIds.includes(quote.id)}
            isOwnerOrEPC={isOwnerOrEPC}
            onToggleCompare={() => toggleComparison(quote.id)}
            onSelectForPO={() => onSelectQuoteForPO(quote)}
          />
        ))}
      </div>
    </div>
  );
};
