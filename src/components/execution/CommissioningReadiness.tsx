import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, Clock, XCircle, ArrowLeft } from 'lucide-react';

export interface CommissioningReadinessData {
  canApprove: boolean;
  insufficientData?: boolean;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  pendingTests?: number;
  criticalPunchListCount?: number;
  blockingReasons?: string[];
}

interface CommissioningReadinessProps {
  readiness: CommissioningReadinessData | null;
  loading?: boolean;
  onGoToTests?: () => void;
  className?: string;
}

export const CommissioningReadiness: React.FC<CommissioningReadinessProps> = ({
  readiness,
  loading = false,
  onGoToTests,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse text-xs text-slate-400 ${className}`}>
        در حال ارزیابی شرایط راه‌اندازی و آمادگی اتصال...
      </div>
    );
  }

  if (!readiness || readiness.insufficientData) {
    return (
      <div className={`p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold mb-0.5">اطلاعات راه‌اندازی ثبت نشده است</h4>
            <p className="opacity-90 leading-relaxed text-[11px]">
              برای بررسی آمادگی راه‌اندازی، ابتدا پرونده راه‌اندازی و آزمون‌های الکتریکی را ثبت نمایید.
            </p>
          </div>
        </div>

        {onGoToTests && (
          <button
            onClick={onGoToTests}
            className="self-start sm:self-center px-3 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 min-h-[44px] shrink-0"
          >
            مشاهده آزمون‌ها
          </button>
        )}
      </div>
    );
  }

  const { canApprove, totalTests = 0, passedTests = 0, failedTests = 0, pendingTests = 0, criticalPunchListCount = 0, blockingReasons = [] } = readiness;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
      canApprove
        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
        : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {canApprove ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <div>
            <h4 className={`text-sm font-bold ${canApprove ? 'text-emerald-950 dark:text-emerald-200' : 'text-amber-950 dark:text-amber-200'}`}>
              {canApprove ? 'احراز شروط تأیید راه‌اندازی (Commissioning Ready)' : 'شرایط راه‌اندازی هنوز احراز نشده است'}
            </h4>
            <p className={`text-[11px] ${canApprove ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
              {canApprove
                ? 'کلیه آزمون‌های اجباری با موفقیت پشت سر گذاشته شده و پانچ‌لیست بحرانی حل شده است.'
                : 'برای تأیید نهایی راه‌اندازی، موارد بازدارنده زیر باید رفع گردند.'}
            </p>
          </div>
        </div>

        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border self-start sm:self-center shrink-0 ${
          canApprove
            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
            : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
        }`}>
          {canApprove ? 'آماده تأیید' : 'ناقص'}
        </span>
      </div>

      {/* Tests breakdown counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="p-2 rounded-xl bg-white/70 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/60 text-center">
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block">کل آزمون‌ها</span>
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{totalTests}</span>
        </div>
        <div className="p-2 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-center">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">موفق (Passed)</span>
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">{passedTests}</span>
        </div>
        <div className="p-2 rounded-xl bg-rose-100/60 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-center">
          <span className="text-[10px] text-rose-700 dark:text-rose-300 block">ناموفق (Failed)</span>
          <span className="text-xs font-bold text-rose-800 dark:text-rose-200">{failedTests}</span>
        </div>
        <div className="p-2 rounded-xl bg-amber-100/60 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 text-center">
          <span className="text-[10px] text-amber-700 dark:text-amber-300 block">در انتظار / باقیمانده</span>
          <span className="text-xs font-bold text-amber-800 dark:text-amber-200">{pendingTests}</span>
        </div>
      </div>

      {/* Blocking Reasons list */}
      {blockingReasons.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block">
            موارد بازدارنده تأیید راه‌اندازی:
          </span>
          <ul className="space-y-1">
            {blockingReasons.map((reason, idx) => (
              <li key={idx} className="text-xs text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
