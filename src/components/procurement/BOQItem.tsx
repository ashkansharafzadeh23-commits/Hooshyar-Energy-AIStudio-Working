import React from 'react';
import { BOQItem as BOQItemType } from '../../types/procurement';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { Check, ShieldCheck, Tag } from 'lucide-react';
import { formatCurrencyIRR } from '../../utils/formatters';

interface BOQItemProps {
  item: BOQItemType;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
}

export const BOQItem: React.FC<BOQItemProps> = ({
  item,
  isSelected = false,
  onToggleSelect,
  className = ''
}) => {
  const unitLabels: Record<string, string> = {
    PCS: 'عدد',
    SET: 'دستگاه / ست',
    METER: 'متر',
    KM: 'کیلومتر',
    KG: 'کیلوگرم',
    TON: 'تن',
    LOT: 'پک / مجموعه',
    KWH: 'کیلووات ساعت',
    KW: 'کیلووات',
    M2: 'متر مربع'
  };

  return (
    <div
      onClick={onToggleSelect}
      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-700 shadow-2xs'
          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <div
              className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                {item.description || item.itemType}
              </h5>
              {item.brandPreference && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  برند مدنظر: {item.brandPreference}
                </span>
              )}
            </div>

            {item.technicalSpecification && (
              <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                {item.technicalSpecification}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-zinc-400">
              {item.isSubstitutionAllowed ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  ✓ پذیرش برند معادل مجاز است
                </span>
              ) : (
                <span className="text-slate-600 dark:text-zinc-400 font-medium">
                  • فقط مشخصات دقیق اعلام‌شده
                </span>
              )}

              {item.requiredWarrantyYears && (
                <span>حداقل گارانتی: {item.requiredWarrantyYears} سال</span>
              )}
            </div>
          </div>
        </div>

        {/* Quantity and Price */}
        <div className="text-left shrink-0">
          <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 font-mono">
            {item.quantity} {unitLabels[item.unit] || item.unit}
          </div>
          {item.estimatedUnitPrice ? (
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              برآورد: {formatCurrencyIRR(item.estimatedUnitPrice)}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 mt-0.5">برآورد ثبت نشده</div>
          )}
        </div>
      </div>
    </div>
  );
};
