import React from 'react';
import { Building2, MapPin, Coins, CheckCircle2, ChevronLeft, ShieldCheck, Clock, Layers } from 'lucide-react';
import { FinancialPartnerProfile, FinancingPartner, PartnerMatchingResult } from '../../types/financing';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingPartnerCardProps {
  partner: FinancialPartnerProfile | FinancingPartner | any;
  matchingResult?: PartnerMatchingResult | any;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
  onSubmitToPartner?: () => void;
  onViewDetails?: () => void;
}

export const FinancingPartnerCard: React.FC<FinancingPartnerCardProps> = ({
  partner,
  matchingResult,
  isSubmitting = false,
  isSubmitted = false,
  onSubmitToPartner,
  onViewDetails
}) => {
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null || val <= 0) return 'توافقی';
    if (val >= 1000000000) {
      return `${(val / 1000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} م.ت`;
    }
    if (val >= 1000000) {
      return `${(val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} م.ت`;
    }
    return `${val.toLocaleString('fa-IR')} ت`;
  };

  const categoryLabels: Record<string, string> = {
    BANK: 'بانک تجاری / تخصصی',
    STATE_BANK: 'بانک دولتی',
    PRIVATE_BANK: 'بانک خصوصی',
    RESEARCH_FUND: 'صندوق پژوهش و فناوری',
    INNOVATION_FUND: 'صندوق نوآوری و شکوفایی',
    INVESTMENT_COMPANY: 'شرکت سرمایه‌گذاری انرژی',
    LEASING: 'شرکت واسپاری (لیزینگ)',
    OTHER: 'نهاد مالی همکار'
  };

  const partnerName = partner?.name || partner?.displayName || 'نهاد مالی همکار';
  const partnerCategory = categoryLabels[partner?.category || partner?.partnerType] || 'نهاد مالی همکار';

  const minAmount = partner?.minimumAmount || partner?.minimumFinancingAmount;
  const maxAmount = partner?.maximumAmount || partner?.maximumFinancingAmount;

  const supportedProvinces: string[] = partner?.supportedLocations || partner?.supportedProvinces || [];
  const supportedTypes: string[] = partner?.financingTypes || [];

  const eligibility = matchingResult?.eligibility || (matchingResult?.isEligible ? 'ELIGIBLE' : 'UNKNOWN');

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between group">
      <div>
        {/* Header: Name, Category, Eligibility Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                {partnerName}
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                {partnerCategory}
              </span>
            </div>
          </div>

          {eligibility === 'ELIGIBLE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              <span>منطبق با ضوابط</span>
            </span>
          ) : eligibility === 'NOT_ELIGIBLE' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
              <span>عدم انطباق شرایط</span>
            </span>
          ) : null}
        </div>

        {/* Real Criteria Breakdown */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 text-xs mb-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">دامنه مبالغ تسهیلات:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {minAmount ? formatMoney(minAmount) : 'بدون کف'} تا {maxAmount ? formatMoney(maxAmount) : 'بدون سقف'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">پوشش جغرافیایی:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">
              {supportedProvinces.length > 0
                ? (supportedProvinces.length > 3 ? `${supportedProvinces.length} استان منتخب` : supportedProvinces.join('، '))
                : 'سراسر کشور'}
            </span>
          </div>

          {supportedTypes.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الگوهای تأمین مالی:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                {supportedTypes.length} الگوی مصوب
              </span>
            </div>
          )}
        </div>

        {/* Explainability bullet points if matching result provided */}
        {matchingResult?.criteriaBreakdown && (
          <div className="space-y-1 mb-4 text-[11px] text-slate-600 dark:text-zinc-400">
            {matchingResult.criteriaBreakdown.map((crit: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${crit.satisfied ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>{crit.description || crit.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Action */}
      <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 cursor-pointer min-h-[44px] px-2"
          >
            مشاهده ضوابط
          </button>
        )}

        {onSubmitToPartner && (
          <button
            type="button"
            onClick={onSubmitToPartner}
            disabled={isSubmitting || isSubmitted}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px] ${
              isSubmitted
                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                : isSubmitting
                ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{isSubmitted ? 'پرونده ارسال شده' : isSubmitting ? 'در حال ارسال...' : 'ارسال پرونده اعتباری'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
