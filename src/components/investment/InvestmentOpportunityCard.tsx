import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Zap, Coins, ChevronLeft, ShieldCheck, Clock } from 'lucide-react';
import { InvestmentOpportunity } from '../../types/investment';
import { formatSolarCapacity } from '../../utils/formatters';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface InvestmentOpportunityCardProps {
  opportunity: InvestmentOpportunity;
  matchScore?: number;
  readinessScore?: number;
  onClickDetail?: () => void;
}

export const InvestmentOpportunityCard: React.FC<InvestmentOpportunityCardProps> = ({
  opportunity,
  matchScore,
  readinessScore,
  onClickDetail
}) => {
  // Format capital requirement truthfully in Persian Tomans or Rials
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null || val <= 0) return 'ثبت نشده';
    // Assume stored in IRR or Tomans
    if (val >= 1000000000) {
      return `${(val / 1000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد تومان`;
    }
    if (val >= 1000000) {
      return `${(val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} میلیون تومان`;
    }
    return `${val.toLocaleString('fa-IR')} تومان`;
  };

  const stageLabels: Record<string, string> = {
    FEASIBILITY: 'امکان‌سنجی اولیه',
    READY_FOR_RFQ: 'آماده استعلام EPC',
    RFQ_OPEN: 'در حال مناقصه',
    CONTRACTING: 'مذاکرات قراردادی',
    EPC_SELECTED: 'پیمانکار مشخص',
    FINANCING: 'تأمین مالی',
    PROCUREMENT: 'تأمین تجهیزات',
    CONSTRUCTION: 'احداث',
    COMMISSIONING: 'راه‌اندازی'
  };

  const stageLabel = stageLabels[opportunity.projectStage] || opportunity.projectStage || 'ثبت نشده';

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between group">
      <div>
        {/* Header: Code, Badges, Stage */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
              {opportunity.opportunityCode}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
              {stageLabel}
            </span>
          </div>

          {matchScore !== undefined && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800 font-mono">
              تطابق: {matchScore}٪
            </span>
          )}
        </div>

        {/* Title & Short Summary */}
        <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mb-1.5">
          {opportunity.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
          {opportunity.summary || 'خلاصه طرح ثبت نشده است.'}
        </p>

        {/* 4 Primary Factual Metrics Max */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 mb-4">
          {/* 1. Location */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 dark:text-zinc-400 block">موقعیت ساختگاه:</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {opportunity.location?.province && opportunity.location?.city
                  ? `${opportunity.location.province}، ${opportunity.location.city}`
                  : (opportunity.location?.province || 'ثبت نشده')}
              </span>
            </div>
          </div>

          {/* 2. Solar Capacity */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 dark:text-zinc-400 block">ظرفیت هدف:</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-zinc-200">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                {opportunity.targetCapacityKw ? formatSolarCapacity(opportunity.targetCapacityKw) : 'ثبت نشده'}
              </span>
            </div>
          </div>

          {/* 3. Financing/Capital Requirement */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 dark:text-zinc-400 block">نیاز سرمایه‌ای:</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-zinc-200">
              <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                {formatMoney(opportunity.capitalRequirement?.capitalRequired || opportunity.minimumPartnerCapital)}
              </span>
            </div>
          </div>

          {/* 4. Readiness or Land Status */}
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-400 dark:text-zinc-400 block">آمادگی ساختگاه:</span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-zinc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                {readinessScore !== undefined
                  ? `${readinessScore} از ۱۰۰`
                  : (opportunity.landStatus ? `زمین: ${opportunity.landStatus}` : 'ثبت نشده')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 dark:text-zinc-400">
          نوع: {opportunity.type === 'PROJECT_SEEKING_CAPITAL' ? 'مشارکت در احداث' : (opportunity.type || 'فرصت سرمایه‌گذاری')}
        </span>

        {onClickDetail ? (
          <button
            type="button"
            onClick={onClickDetail}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
          >
            <span>بررسی مشخصات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Link
            to={`/investment-hub/opportunities/${opportunity.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors min-h-[44px]"
          >
            <span>بررسی مشخصات</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};
