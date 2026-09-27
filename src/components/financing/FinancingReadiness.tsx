import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HelpCircle,
  FileCheck2,
  ListChecks,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FinancingReadinessResult, FinancingReadinessStatus } from '../../types/financing';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingReadinessProps {
  readiness?: FinancingReadinessResult | any;
  onRefresh?: () => void;
  className?: string;
}

export const FinancingReadiness: React.FC<FinancingReadinessProps> = ({
  readiness,
  onRefresh,
  className = ''
}) => {
  const [showAllDetails, setShowAllDetails] = React.useState(false);

  const status = (readiness?.status || readiness?.level || 'NOT_READY') as FinancingReadinessStatus;
  const availableItems: string[] = readiness?.availableRequirements || readiness?.availableItems || [];
  const missingRequirements: string[] = readiness?.missingRequirements || [];
  const recommendedActions: string[] = readiness?.recommendedActions || [];

  const statusConfig: Record<string, { label: string; bg: string; text: string; desc: string; icon: any }> = {
    READY: {
      label: 'آماده ارسال به نهاد مالی',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-200',
      desc: 'تمامی ارقام کلیدی، مستندات پایه و مدل مالی طرح مهیاست.',
      icon: CheckCircle2
    },
    PARTIALLY_READY: {
      label: 'آمادگی مشروط (نیازمند تکمیل مدارک)',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      desc: 'بخشی از اطلاعات کلیدی تکمیل شده اما جهت بررسی قطعی بانکی نیاز به رفع نواقص است.',
      icon: Clock
    },
    NOT_READY: {
      label: 'نیازمند تکمیل اطلاعات اولیه',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      text: 'text-rose-800 dark:text-rose-200',
      desc: 'پرونده هنوز فاقد ارقام هزینه‌ای، مدل مالی یا مدارک ضروری است.',
      icon: AlertCircle
    }
  };

  const currentCfg = statusConfig[status] || statusConfig.NOT_READY;
  const StatusIcon = currentCfg.icon;

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              ارزیابی قطعی آمادگی اعتباری طرح (Financing Readiness)
            </h3>
            <DataTruthBadge provenance="CALCULATED" />
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            بررسی خودکار ۱۵ مؤلفه اعتباری و مهندسی پیش از ارجاع به نهادهای مالی
          </p>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border ${currentCfg.bg} shrink-0`}>
          <StatusIcon className={`w-4 h-4 ${currentCfg.text}`} />
          <span className={`text-xs font-bold ${currentCfg.text}`}>
            {currentCfg.label}
          </span>
        </div>
      </div>

      {/* Description Callout */}
      <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
        {currentCfg.desc}
      </p>

      {/* Missing Requirements Block */}
      {missingRequirements.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>مدارک و اطلاعات ناقص ({missingRequirements.length} مورد):</span>
          </div>

          <ul className="space-y-1.5 pr-4 text-xs text-amber-800 dark:text-amber-300">
            {missingRequirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {recommendedActions.length > 0 && (
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
            <ListChecks className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>اقدامات پیشنهادی جهت ارتقای آمادگی پرونده:</span>
          </div>

          <ul className="space-y-1.5 pr-4 text-xs text-blue-800 dark:text-blue-300">
            {recommendedActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verified / Available Items Accordion */}
      {availableItems.length > 0 && (
        <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowAllDetails(!showAllDetails)}
            className="flex items-center justify-between w-full text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 py-1 cursor-pointer min-h-[44px]"
          >
            <span className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>مشاهده مؤلفه‌های تکمیل‌شده ({availableItems.length} مؤلفه)</span>
            </span>
            {showAllDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAllDetails && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {availableItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-700 dark:text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
