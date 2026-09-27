import React, { useState } from 'react';
import { CommissioningReadinessData } from './CommissioningReadiness';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface CommissioningReviewProps {
  projectId: string;
  readiness: CommissioningReadinessData | null;
  onApproveCommissioning: (notes?: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const CommissioningReview: React.FC<CommissioningReviewProps> = ({
  projectId,
  readiness,
  onApproveCommissioning,
  loading = false,
  className = ''
}) => {
  const [approving, setApproving] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canApprove = readiness?.canApprove === true;

  const handleApprove = async () => {
    if (!canApprove) return;
    setApproving(true);
    setError(null);
    try {
      await onApproveCommissioning(notes);
    } catch (err: any) {
      setError(err?.message || 'خطا در ثبت تأیید پرونده راه‌اندازی');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              ارزیابی پرونده راه‌اندازی (Commissioning Sign-Off)
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              بررسی آزمون‌های فنی و مستندات راه‌اندازی پروژه
            </p>
          </div>
        </div>

        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
          canApprove
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        }`}>
          {canApprove ? 'واجد شرایط تأیید' : 'غیرقابل تأیید'}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Review summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-500 dark:text-zinc-400 block mb-1">آزمون‌های اجباری تکمیل‌شده:</span>
          <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono">
            {readiness?.passedTests ?? 0} از {readiness?.totalTests ?? 0}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-500 dark:text-zinc-400 block mb-1">نواقص بحرانی پانچ‌لیست:</span>
          <span className={`font-bold font-mono ${readiness?.criticalPunchListCount ? 'text-rose-600' : 'text-emerald-600'}`}>
            {readiness?.criticalPunchListCount ?? 0} مورد
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
          <span className="text-slate-500 dark:text-zinc-400 block mb-1">وضعیت آزمون‌های مردود:</span>
          <span className={`font-bold font-mono ${readiness?.failedTests ? 'text-rose-600' : 'text-emerald-600'}`}>
            {readiness?.failedTests ?? 0} مورد
          </span>
        </div>
      </div>

      {/* Warning or Success Notice */}
      {!canApprove ? (
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>امکان تأیید نهایی وجود ندارد</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            تا زمانی که آزمون‌های اجباری با موفقیت ثبت نشوند و موارد بحرانی پانچ‌لیست برطرف نگردند، صدور تأییدیه راه‌اندازی مسدود است.
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>احراز شرایط تأیید راه‌اندازی</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            با ثبت تأیید، وضعیت راه‌اندازی پروژه به‌روزرسانی شده و فرآیند تحویل آغاز می‌شود.
          </p>
        </div>
      )}

      {/* Notes and action */}
      {canApprove && (
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
              یادداشت و شماره صورت‌جلسه تأیید راه‌اندازی (اختیاری):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی یا شماره صورت‌جلسه راه‌اندازی..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleApprove}
              disabled={approving || loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs min-h-[44px] flex items-center gap-2 transition-all"
            >
              {approving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ثبت تأیید...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تأیید نهایی پرونده راه‌اندازی</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
