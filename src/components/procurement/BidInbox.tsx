import React, { useState } from 'react';
import { EpcBid, RFQ } from '../../types/rfq';
import { BidCard } from './BidCard';
import { CommercialEmptyState } from './CommercialEmptyState';
import { Layers, CheckSquare, ArrowLeft, Filter, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface BidInboxProps {
  rfq: RFQ;
  bids: EpcBid[];
  isOwnerOrAdmin: boolean;
  selectedBidId?: string;
  onOpenCompare: (selectedBidIds: string[]) => void;
  onSelectBidForAward: (bid: EpcBid) => void;
  onRefresh?: () => void;
  className?: string;
}

export const BidInbox: React.FC<BidInboxProps> = ({
  rfq,
  bids,
  isOwnerOrAdmin,
  selectedBidId,
  onOpenCompare,
  onSelectBidForAward,
  onRefresh,
  className = ''
}) => {
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'timeline' | 'date'>('price_asc');

  const toggleComparison = (bidId: string) => {
    setComparisonIds(prev =>
      prev.includes(bidId) ? prev.filter(id => id !== bidId) : [...prev, bidId]
    );
  };

  // Sort bids truthfully
  const sortedBids = [...bids].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return (a.totalPriceIRR || 0) - (b.totalPriceIRR || 0);
    }
    if (sortBy === 'price_desc') {
      return (b.totalPriceIRR || 0) - (a.totalPriceIRR || 0);
    }
    if (sortBy === 'timeline') {
      return (a.timelineDays || 9999) - (b.timelineDays || 9999);
    }
    return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
  });

  if (!bids || bids.length === 0) {
    return (
      <CommercialEmptyState
        title="هنوز پیشنهادی دریافت نشده است."
        description="استعلام برای پیمانکاران ارسال گردیده است. به محض ثبت پیشنهاد قیمت و شرایط فنی توسط شرکت‌های EPC، پیشنهادات در این صندوق به نمایش درخواهند آمد."
        helpNotice={`مهلت ارسال پیشنهادات: ${rfq.submissionDeadline ? new Date(rfq.submissionDeadline).toLocaleDateString('fa-IR') : 'مطابق شرایط استعلام'}`}
        icon="inbox"
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header and comparison toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
              پیشنهادات دریافتی ({bids.length} پیشنهاد ثبت‌شده)
            </h4>
            {rfq.status === 'AWARDED' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                واگذار شده
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            پیشنهادات ارائه‌شده توسط شرکت‌های پیمانکار را بررسی، مقایسه و انتخاب کنید.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sorter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 min-h-[44px]"
          >
            <option value="price_asc">کمترین قیمت پیشنهادی</option>
            <option value="price_desc">بیشترین قیمت پیشنهادی</option>
            <option value="timeline">کوتاه‌ترین زمان اجرا</option>
            <option value="date">جدیدترین پیشنهادها</option>
          </select>

          {/* Compare Button */}
          {comparisonIds.length >= 2 && (
            <button
              type="button"
              onClick={() => onOpenCompare(comparisonIds)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Layers className="w-4 h-4" />
              <span>مقایسه رو در رو ({comparisonIds.length})</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 hover:bg-slate-50 dark:text-zinc-300 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="بروزرسانی پیشنهادات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Comparison helper notice if only 1 item selected */}
      {comparisonIds.length === 1 && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800/40 flex items-center justify-between">
          <span>یک پیشنهاد برای مقایسه انتخاب شده است. برای مقایسه رو در رو، حداقل یک پیشنهاد دیگر را نیز انتخاب کنید.</span>
          <button
            type="button"
            onClick={() => setComparisonIds([])}
            className="text-blue-600 dark:text-blue-400 hover:underline font-bold mr-2 cursor-pointer"
          >
            لغو انتخاب
          </button>
        </div>
      )}

      {/* Bids List */}
      <div className="space-y-3">
        {sortedBids.map(bid => (
          <BidCard
            key={bid.id}
            bid={bid}
            isSelected={rfq.selectedBidId === bid.id || selectedBidId === bid.id}
            isInComparison={comparisonIds.includes(bid.id)}
            isOwnerOrAdmin={isOwnerOrAdmin && rfq.status !== 'AWARDED'}
            onToggleCompare={() => toggleComparison(bid.id)}
            onSelectBid={() => onSelectBidForAward(bid)}
          />
        ))}
      </div>
    </div>
  );
};
