import React, { useState } from 'react';
import { Inbox, SlidersHorizontal, RefreshCw, AlertCircle, Coins } from 'lucide-react';
import { FinancingOffer, FinancialPartnerProfile } from '../../types/financing';
import { FinancingOfferCard } from './FinancingOfferCard';
import { FinancingEmptyState } from './FinancingEmptyState';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingOfferInboxProps {
  offers: FinancingOffer[];
  partners: FinancialPartnerProfile[];
  selectedOfferId?: string | null;
  onSelectOffer: (offer: FinancingOffer) => void;
  onOpenComparison?: () => void;
  onRefresh?: () => void;
  disabled?: boolean;
}

export const FinancingOfferInbox: React.FC<FinancingOfferInboxProps> = ({
  offers,
  partners,
  selectedOfferId,
  onSelectOffer,
  onOpenComparison,
  onRefresh,
  disabled = false
}) => {
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const displayedOffers = offers.filter((o) => {
    if (filterActiveOnly) return o.status !== 'DECLINED';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                کارتابل دریافت و بررسی پیشنهادهای تسهیلات (Offers Inbox)
              </h3>
              <DataTruthBadge provenance="PARTNER_SUBMITTED" />
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              پیشنهادهای مصوب واصله از نهادهای مالی همکار به تفکیک مبالغ، نرخ سود و شیوه‌های بازپرداخت
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {offers.length >= 2 && onOpenComparison && (
              <button
                type="button"
                onClick={onOpenComparison}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>جدول مقایسه تطبیقی ({offers.length} پیشنهاد)</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 text-slate-600 cursor-pointer min-h-[44px]"
                title="به‌روزرسانی کارتابل"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
          تمامی مقادیر، کارمزدها و شرایط بازپرداخت عیناً توسط نهادهای مالی صادرکننده ثبت شده است. انتخاب هر پیشنهاد منجر به ارجاع پرونده به مرحله انعقاد قرارداد تسهیلات می‌گردد.
        </p>
      </div>

      {/* Offers Grid or Empty State */}
      {displayedOffers.length === 0 ? (
        <FinancingEmptyState
          type="NO_OFFERS"
          description="هنوز پیشنهاد تأمین مالی برای این درخواست دریافت نشده است. پس از ارسال مدارک و بررسی توسط نهاد مالی همکار، پیشنهادها در این بخش قابل رؤیت خواهند بود."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedOffers.map((offer) => {
            const partner = partners.find((p) => p.id === offer.financialPartnerProfileId);
            const isSelected = selectedOfferId === offer.id || offer.status === 'SELECTED' || offer.status === 'FINAL';

            return (
              <FinancingOfferCard
                key={offer.id}
                offer={offer}
                partner={partner}
                isSelected={isSelected}
                onSelect={() => onSelectOffer(offer)}
                onViewComparison={offers.length >= 2 ? onOpenComparison : undefined}
                disabled={disabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
