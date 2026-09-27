import React from 'react';
import { 
  Building2, 
  Coins, 
  Percent, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  FileText,
  Sparkles
} from 'lucide-react';
import { FinancingOffer, FinancialPartnerProfile } from '../../types/financing';
import { OfferComparisonSummary } from '../../services/financingOfferComparisonService';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingOfferComparisonProps {
  offers: FinancingOffer[];
  partners: FinancialPartnerProfile[];
  comparisons?: OfferComparisonSummary[];
  selectedOfferId?: string | null;
  onSelectOffer: (offer: FinancingOffer) => void;
  onClose?: () => void;
}

export const FinancingOfferComparison: React.FC<FinancingOfferComparisonProps> = ({
  offers,
  partners,
  comparisons = [],
  selectedOfferId,
  onSelectOffer,
  onClose
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

  // Find objective factual minimums / maximums
  const minRate = Math.min(...offers.map((o) => o.interestRate || Infinity));
  const maxAmount = Math.max(...offers.map((o) => o.offeredAmount || 0));
  const maxTenor = Math.max(...offers.map((o) => o.tenorMonths || 0));

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              جدول مقایسه تطبیقی پیشنهادهای تأمین مالی
            </h3>
            <DataTruthBadge provenance="PARTNER_SUBMITTED" />
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            مقایسه عینی شرایط مصوب واصله بر اساس ارقام رسمی اظهارشده توسط نهادهای مالی
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer min-h-[44px]"
            title="بستن جدول مقایسه"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Desktop Comparative Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800">
              <th className="py-3 px-4 font-bold text-slate-500 w-44 bg-slate-50/50 dark:bg-zinc-800/40 rounded-r-xl">
                شاخص مالی و حقوقی
              </th>
              {offers.map((offer) => {
                const partner = partners.find((p) => p.id === offer.financialPartnerProfileId);
                const isSelected = selectedOfferId === offer.id || offer.status === 'SELECTED' || offer.status === 'FINAL';

                return (
                  <th
                    key={offer.id}
                    className={`py-3 px-4 font-bold text-center transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 border-x border-t border-emerald-300'
                        : 'text-slate-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="font-bold text-sm">{partner?.name || partner?.displayName || 'نهاد مالی'}</div>
                    <div className="font-mono text-[10px] text-slate-400 font-normal mt-0.5">{offer.offerCode}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {/* 1. Offered Amount */}
            <tr>
              <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20">
                مبلغ مصوب تسهیلات
              </td>
              {offers.map((offer) => {
                const isMax = offer.offeredAmount === maxAmount && maxAmount > 0;
                return (
                  <td key={offer.id} className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-zinc-100">
                    <div>{formatMoney(offer.offeredAmount)}</div>
                    {isMax && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        بیشترین مبلغ اعلامی
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* 2. Interest Rate */}
            <tr>
              <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20">
                نرخ سود اسمی سالانه
              </td>
              {offers.map((offer) => {
                const isMin = offer.interestRate === minRate && minRate < Infinity;
                return (
                  <td key={offer.id} className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-zinc-100">
                    <div>{offer.interestRate ? `${offer.interestRate}٪` : 'ارائه نشده'}</div>
                    {isMin && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        کمترین نرخ اعلامی
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* 3. Tenor */}
            <tr>
              <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20">
                مدت بازپرداخت تسهیلات
              </td>
              {offers.map((offer) => {
                const isMaxT = offer.tenorMonths === maxTenor && maxTenor > 0;
                return (
                  <td key={offer.id} className="py-3.5 px-4 text-center font-mono text-slate-800 dark:text-zinc-200">
                    <div>{offer.tenorMonths ? `${offer.tenorMonths} ماه` : 'ارائه نشده'}</div>
                    {isMaxT && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        طولانی‌ترین بازپرداخت
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* 4. Grace Period */}
            <tr>
              <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20">
                دوره تنفس حین احداث
              </td>
              {offers.map((offer) => (
                <td key={offer.id} className="py-3.5 px-4 text-center font-mono text-slate-800 dark:text-zinc-200">
                  {offer.gracePeriodMonths !== undefined ? `${offer.gracePeriodMonths} ماه` : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            {/* 5. Repayment Schedule */}
            <tr>
              <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20">
                شیوه تقسیط
              </td>
              {offers.map((offer) => (
                <td key={offer.id} className="py-3.5 px-4 text-center text-slate-800 dark:text-zinc-200">
                  {offer.repaymentType === 'EQUAL_INSTALLMENT' ? 'اقساط مساوی' : (offer.repaymentType || 'ثبت نشده')}
                </td>
              ))}
            </tr>

            {/* 6. Collateral Requirements */}
            <tr>
              <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-zinc-300 bg-slate-50/30 dark:bg-zinc-800/20">
                وثایق و تضامین درخواستی
              </td>
              {offers.map((offer) => (
                <td key={offer.id} className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  {offer.collateralRequirements && offer.collateralRequirements.length > 0 ? (
                    <ul className="space-y-1 list-disc list-inside">
                      {offer.collateralRequirements.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    'مطابق آیین‌نامه عمومی'
                  )}
                </td>
              ))}
            </tr>

            {/* 7. Action Button */}
            <tr>
              <td className="py-4 px-4 bg-slate-50/50 dark:bg-zinc-800/40 rounded-br-xl" />
              {offers.map((offer) => {
                const isSelected = selectedOfferId === offer.id || offer.status === 'SELECTED' || offer.status === 'FINAL';

                return (
                  <td key={offer.id} className="py-4 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectOffer(offer)}
                      disabled={isSelected}
                      className={`inline-flex items-center justify-center gap-1 w-full px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px] ${
                        isSelected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>پیشنهاد منتخب</span>
                        </>
                      ) : (
                        <span>انتخاب این پیشنهاد</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Comparison Cards */}
      <div className="lg:hidden space-y-4">
        {offers.map((offer) => {
          const partner = partners.find((p) => p.id === offer.financialPartnerProfileId);
          const isSelected = selectedOfferId === offer.id || offer.status === 'SELECTED' || offer.status === 'FINAL';

          return (
            <div
              key={offer.id}
              className={`p-4 rounded-xl border ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/30'
                  : 'border-slate-200 bg-slate-50/50'
              } space-y-3`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-sm text-slate-900">
                  {partner?.name || partner?.displayName || 'نهاد مالی'}
                </span>
                <span className="font-mono text-xs text-slate-400">{offer.offerCode}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">مبلغ تسهیلات:</span>
                  <span className="font-bold text-slate-900 font-mono">{formatMoney(offer.offeredAmount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">نرخ سود:</span>
                  <span className="font-bold text-slate-900 font-mono">{offer.interestRate}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block">مدت بازپرداخت:</span>
                  <span className="font-bold text-slate-900 font-mono">{offer.tenorMonths} ماه</span>
                </div>
                <div>
                  <span className="text-slate-400 block">دوره تنفس:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {offer.gracePeriodMonths !== undefined && offer.gracePeriodMonths !== null ? `${offer.gracePeriodMonths} ماه` : 'ثبت نشده'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectOffer(offer)}
                disabled={isSelected}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSelected ? 'پیشنهاد منتخب' : 'انتخاب این پیشنهاد'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
