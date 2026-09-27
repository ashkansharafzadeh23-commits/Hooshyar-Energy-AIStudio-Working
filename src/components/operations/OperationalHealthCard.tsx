import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  HelpCircle, 
  Activity, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { AssetHealthAssessment, AssetHealthStatus } from '../../types/monitoring';
import { toPersianDigits, formatPersianNumber } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface OperationalHealthCardProps {
  assessment?: AssetHealthAssessment | null;
  loading?: boolean;
  onRecalculate?: () => void;
  canRecalculate?: boolean;
}

export const OperationalHealthCard: React.FC<OperationalHealthCardProps> = ({
  assessment,
  loading = false,
  onRecalculate,
  canRecalculate = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs animate-pulse space-y-3">
        <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="w-48 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="w-full h-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    );
  }

  if (!assessment || assessment.status === 'INSUFFICIENT_DATA') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ارزیابی وضعیت سلامت عملیاتی
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                داده کافی برای ارزیابی وضعیت عملیاتی وجود ندارد.
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            فاقد داده کافی
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
          برای سنجش وضعیت سلامت، نیاز به استمرار دریافت تله‌متری و محاسبه دوره‌ای در موتور ارزیابی است.
        </div>
      </div>
    );
  }

  const statusConfigs: Record<
    Exclude<AssetHealthStatus, 'INSUFFICIENT_DATA'>,
    {
      title: string;
      badgeText: string;
      badgeClass: string;
      icon: React.ComponentType<{ className?: string }>;
      iconClass: string;
      defaultDesc: string;
    }
  > = {
    HEALTHY: {
      title: 'وضعیت عملیاتی مطلوب',
      badgeText: 'سلامت پایدار',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      icon: ShieldCheck,
      iconClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400',
      defaultDesc: 'پارامترهای تولید و عملکرد تجهیزات در محدوده استاندارد طراحی قرار دارند.',
    },
    DEGRADED: {
      title: 'افت عملکرد / نیازمند بررسی',
      badgeText: 'عملکرد نامطلوب',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      icon: AlertTriangle,
      iconClass: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
      defaultDesc: 'انحراف آماری در تولید یا نشانه‌های افت در تله‌متری ثبت گردیده است.',
    },
    CRITICAL: {
      title: 'وضعیت بحرانی عملیات نیروگاه',
      badgeText: 'بحرانی',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      icon: AlertOctagon,
      iconClass: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400',
      defaultDesc: 'توقف تولید، خطای بحرانی در تجهیزات اصلی یا انقطاع کلی تله‌متری شناسایی شده است.',
    },
  };

  const currentStatus = (assessment.status in statusConfigs) 
    ? (assessment.status as keyof typeof statusConfigs) 
    : 'DEGRADED';

  const config = statusConfigs[currentStatus];
  const StatusIcon = config.icon;

  const hasScore = typeof assessment.score === 'number' && !isNaN(assessment.score);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${config.iconClass}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {config.title}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${config.badgeClass}`}>
                {config.badgeText}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {config.defaultDesc}
            </p>
          </div>
        </div>

        {hasScore && (
          <div className="text-left shrink-0 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              امتیاز محاسباتی
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              {formatPersianNumber(assessment.score, 0)} <span className="text-[11px] font-normal text-slate-500">/ ۱۰۰</span>
            </div>
          </div>
        )}
      </div>

      {/* Factual risk factors and detected issues from backend */}
      {(assessment.riskFactors?.length > 0 || assessment.detectedIssues?.length > 0) && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            عوامل ریسک و موارد ثبت‌شده:
          </div>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {assessment.detectedIssues?.map((issue, idx) => (
              <li key={`issue-${idx}`} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
            {assessment.riskFactors?.map((risk, idx) => (
              <li key={`risk-${idx}`} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evaluation Timestamp */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>تاریخ محاسبه: </span>
          <strong className="text-slate-600 dark:text-slate-300 font-medium">
            {formatPersianDateTime(assessment.calculatedAt || assessment.evaluatedAt || '')}
          </strong>
        </div>

        {canRecalculate && onRecalculate && (
          <button
            type="button"
            onClick={onRecalculate}
            className="text-amber-600 dark:text-amber-400 hover:underline font-medium min-h-[32px] px-2 py-1"
          >
            به‌روزرسانی ارزیابی
          </button>
        )}
      </div>
    </div>
  );
};
