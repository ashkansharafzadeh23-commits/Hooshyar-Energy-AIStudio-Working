import React from 'react';
import { EpcBid } from '../../types/rfq';
import { formatCurrencyIRR, formatJalaliDate } from '../../utils/formatters';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { ArrowRight, Check, X, Award, Info, Sparkles, AlertCircle } from 'lucide-react';

interface BidComparisonProps {
  bids: EpcBid[];
  isOwnerOrAdmin: boolean;
  onClose: () => void;
  onSelectBid: (bid: EpcBid) => void;
  className?: string;
}

export const BidComparison: React.FC<BidComparisonProps> = ({
  bids,
  isOwnerOrAdmin,
  onClose,
  onSelectBid,
  className = ''
}) => {
  if (bids.length === 0) return null;

  // Compute purely objective metrics without subjective scoring
  const validPrices = bids.map(b => b.totalPriceIRR).filter((p): p is number => typeof p === 'number' && p > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  const validTimelines = bids.map(b => b.timelineDays).filter((t): t is number => typeof t === 'number' && t > 0);
  const minTimeline = validTimelines.length > 0 ? Math.min(...validTimelines) : null;

  // Generate objective factual comparative observation between top offers
  const generateFactualObservations = () => {
    if (bids.length < 2) return [];

    const notes: string[] = [];
    const bid1 = bids[0];
    const bid2 = bids[1];

    if (bid1.totalPriceIRR && bid2.totalPriceIRR && bid1.timelineDays && bid2.timelineDays) {
      if (bid1.totalPriceIRR < bid2.totalPriceIRR && bid1.timelineDays > bid2.timelineDays) {
        notes.push(`پیشنهاد ${bid1.epcOrganizationName || 'اول'} قیمت پایین‌تری دارد، اما مدت اجرای اعلام‌شده آن بیشتر است.`);
      } else if (bid2.totalPriceIRR < bid1.totalPriceIRR && bid2.timelineDays > bid1.timelineDays) {
        notes.push(`پیشنهاد ${bid2.epcOrganizationName || 'دوم'} قیمت پایین‌تری دارد، اما مدت اجرای اعلام‌شده آن بیشتر است.`);
      }
    }

    return notes;
  };

  const observations = generateFactualObservations();

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              جدول مقایسه رو در رو
            </span>
            <DataTruthBadge type="CONTRACTOR_SUBMITTED" size="sm" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            مقایسه ابعاد فنی و تجاری پیشنهادات پیمانکاران ({bids.length} پیشنهاد)
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer min-h-[44px]"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به صندوق پیشنهادات</span>
        </button>
      </div>

      {/* Factual Observation Banner (if available) */}
      {observations.length > 0 && (
        <div className="mb-5 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>نکات مقایسه‌ای مبتنی بر داده‌های ثبت‌شده:</span>
          </div>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
            {observations.map((obs, idx) => (
              <li key={idx}>{obs}</li>
            ))}
          </ul>
        </div>
      )}

      {/* DESKTOP VIEW: Comparison Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850">
              <th className="p-3 font-bold text-slate-700 dark:text-zinc-300 w-44">شاخص ارزیابی</th>
              {bids.map(bid => {
                const isMinPrice = minPrice !== null && bid.totalPriceIRR === minPrice;
                const isMinTime = minTimeline !== null && bid.timelineDays === minTimeline;

                return (
                  <th key={bid.id} className="p-3 font-bold text-slate-900 dark:text-zinc-100 min-w-[200px]">
                    <div className="text-sm">{bid.epcOrganizationName || bid.epcCompanyName || 'پیمانکار'}</div>
                    <div className="text-[11px] font-mono font-normal text-slate-400 mt-0.5">کد: {bid.bidCode || bid.id.substring(0, 8)}</div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {isMinPrice && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          کمترین قیمت
                        </span>
                      )}
                      {isMinTime && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          کوتاه‌ترین زمان
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {/* Price */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">مبلغ کل پیشنهادی</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 font-bold font-mono text-sm text-blue-700 dark:text-blue-300">
                  {bid.totalPriceIRR ? formatCurrencyIRR(bid.totalPriceIRR) : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            {/* Timeline */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">مدت زمان اجرا</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 font-semibold text-slate-800 dark:text-zinc-200">
                  {bid.timelineDays ? `${bid.timelineDays} روز کاری` : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            {/* Down Payment */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">پیش‌پرداخت درخواستی</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 text-slate-800 dark:text-zinc-200">
                  {bid.downPaymentPercent !== undefined ? `${bid.downPaymentPercent}٪` : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            {/* Validity */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">اعتبار پیشنهاد</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 text-slate-800 dark:text-zinc-200">
                  {bid.validUntil ? formatJalaliDate(bid.validUntil) : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            {/* Warranty */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">ضمانت و گارانتی</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 text-slate-800 dark:text-zinc-200">
                  {bid.warrantyYears ? `${bid.warrantyYears} سال` : (bid.warrantyTerms || 'ارائه نشده')}
                </td>
              ))}
            </tr>

            {/* Equipment Summary */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">تجهیزات پیشنهادی</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 text-slate-700 dark:text-zinc-300 leading-relaxed">
                  {typeof bid.equipmentSummary === 'string'
                    ? bid.equipmentSummary
                    : bid.equipmentSummary
                    ? Object.entries(bid.equipmentSummary).map(([k, v]) => `${k}: ${v}`).join('، ')
                    : 'ارائه نشده'}
                </td>
              ))}
            </tr>

            {/* Payment Terms */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">شرایط پرداخت</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 text-slate-700 dark:text-zinc-300">
                  {bid.paymentTerms || 'ارائه نشده'}
                </td>
              ))}
            </tr>

            {/* Technical Deviations */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">انحرافات فنی نسبت به استعلام</td>
              {bids.map(bid => (
                <td key={bid.id} className="p-3 text-slate-700 dark:text-zinc-300">
                  {bid.technicalDeviations || 'بدون انحراف اعلام‌شده'}
                </td>
              ))}
            </tr>

            {/* Deterministic Backend Score (if existing) */}
            <tr>
              <td className="p-3 font-semibold text-slate-600 dark:text-zinc-400 bg-slate-50/40 dark:bg-zinc-850/30">امتیاز فنی سامانه</td>
              {bids.map(bid => {
                const numericScore = typeof bid.score === 'object' && bid.score !== null ? (bid.score as any).totalScore : bid.score;
                return (
                  <td key={bid.id} className="p-3">
                    {numericScore !== undefined ? (
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {numericScore} / ۱۰۰
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-500">ارائه نشده</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Selection CTA row */}
            {isOwnerOrAdmin && (
              <tr className="bg-slate-50/70 dark:bg-zinc-850/60">
                <td className="p-3 font-bold text-slate-700 dark:text-zinc-300">اقدام نهایی</td>
                {bids.map(bid => (
                  <td key={bid.id} className="p-3">
                    {bid.status === 'SELECTED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        منتخب نهایی
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectBid(bid)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer min-h-[44px]"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>انتخاب پیمانکار</span>
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW: Stacked Comparison Cards */}
      <div className="lg:hidden space-y-4">
        {bids.map((bid, index) => {
          const isMinPrice = minPrice !== null && bid.totalPriceIRR === minPrice;
          const isMinTime = minTimeline !== null && bid.timelineDays === minTimeline;

          return (
            <div
              key={bid.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-850/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-slate-400">پیشنهاد ۰{index + 1}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {bid.epcOrganizationName || bid.epcCompanyName || 'پیمانکار'}
                  </h4>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isMinPrice && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      کمترین قیمت
                    </span>
                  )}
                  {isMinTime && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      کوتاه‌ترین زمان
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-zinc-700">
                <div>
                  <span className="text-slate-400 block mb-0.5">مبلغ کل:</span>
                  <span className="font-bold font-mono text-blue-700 dark:text-blue-300">
                    {bid.totalPriceIRR ? formatCurrencyIRR(bid.totalPriceIRR) : 'ارائه نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">مدت زمان:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {bid.timelineDays ? `${bid.timelineDays} روز کاری` : 'ارائه نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">پیش‌پرداخت:</span>
                  <span className="text-slate-800 dark:text-zinc-200">
                    {bid.downPaymentPercent !== undefined ? `${bid.downPaymentPercent}٪` : 'ارائه نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">گارانتی:</span>
                  <span className="text-slate-800 dark:text-zinc-200">
                    {bid.warrantyYears ? `${bid.warrantyYears} سال` : 'ارائه نشده'}
                  </span>
                </div>
              </div>

              {bid.equipmentSummary && (
                <div className="text-xs text-slate-600 dark:text-zinc-400 pt-2 border-t border-slate-200 dark:border-zinc-700">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">تجهیزات: </span>
                  {typeof bid.equipmentSummary === 'string'
                    ? bid.equipmentSummary
                    : Object.entries(bid.equipmentSummary).map(([k, v]) => `${k}: ${v}`).join('، ')}
                </div>
              )}

              {isOwnerOrAdmin && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectBid(bid)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs min-h-[44px]"
                  >
                    <Award className="w-4 h-4" />
                    <span>انتخاب این پیشنهاد</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
