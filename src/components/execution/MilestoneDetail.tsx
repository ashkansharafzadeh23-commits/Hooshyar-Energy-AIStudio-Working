import React, { useState } from 'react';
import { ProjectMilestone } from '../../types/execution';
import { X, CheckCircle2, Clock, AlertCircle, FileText, Send, Calendar, User, ShieldCheck } from 'lucide-react';

interface MilestoneDetailProps {
  milestone: ProjectMilestone;
  onClose: () => void;
  onUpdateStatus?: (milestoneId: string, status: string, notes?: string) => Promise<void>;
  onSubmitApproval?: (milestoneId: string, notes?: string) => Promise<void>;
  canEdit?: boolean;
}

export const MilestoneDetail: React.FC<MilestoneDetailProps> = ({
  milestone,
  onClose,
  onUpdateStatus,
  onSubmitApproval,
  canEdit = true
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    if (!onUpdateStatus) return;
    setSubmitting(true);
    setError(null);
    try {
      await onUpdateStatus(milestone.id, newStatus, notes);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'خطا در ثبت وضعیت نقطه عطف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!onSubmitApproval) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitApproval(milestone.id, notes);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'خطا در ارسال درخواست تأیید');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                {milestone.milestoneCode || 'نقطه عطف'}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                {milestone.category}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              {milestone.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {milestone.description && (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1">
                شرح و دامنه نقطه عطف
              </label>
              <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                {milestone.description}
              </p>
            </div>
          )}

          {/* Schedule details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
              <span className="text-slate-500 dark:text-zinc-400 block mb-1">تاریخ شروع برنامه‌ریزی:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{formatDate(milestone.plannedStartDate)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
              <span className="text-slate-500 dark:text-zinc-400 block mb-1">تاریخ پایان برنامه‌ریزی:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{formatDate(milestone.plannedEndDate)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
              <span className="text-slate-500 dark:text-zinc-400 block mb-1">تاریخ تکمیل واقعی:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{formatDate(milestone.actualEndDate)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
              <span className="text-slate-500 dark:text-zinc-400 block mb-1">درصد پیشرفت ثبت‌شده:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-zinc-200">
                {typeof milestone.completionPercent === 'number' ? `${milestone.completionPercent}٪` : 'ثبت نشده'}
              </span>
            </div>
          </div>

          {/* Verification requirements */}
          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs">
            <div className="flex items-center gap-2 mb-1 text-blue-900 dark:text-blue-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>شرایط اعتبارسنجی</span>
            </div>
            <ul className="space-y-1 text-blue-800 dark:text-blue-400 list-disc list-inside text-[11px]">
              <li>{milestone.evidenceRequired ? 'ارائه تصویر یا صورت‌جلسه کارگاهی الزامی است.' : 'ارائه مستند پیوست اختیاری است.'}</li>
              <li>{milestone.requiresApproval ? 'نیاز به بررسی و تأیید دارد.' : 'بدون نیاز به تأیید ناظر.'}</li>
            </ul>
          </div>

          {/* Notes input */}
          {canEdit && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                توضیحات یا یادداشت کارگاهی
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات مربوط به پیشرفت، موانع یا شواهد اجرایی..."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-850 text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {canEdit && (
          <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-850 flex flex-wrap items-center justify-end gap-2">
            {milestone.status !== 'IN_PROGRESS' && milestone.status !== 'COMPLETED' && (
              <button
                disabled={submitting}
                onClick={() => handleStatusChange('IN_PROGRESS')}
                className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 min-h-[44px]"
              >
                شروع عملیات
              </button>
            )}

            {onSubmitApproval && milestone.status !== 'COMPLETED' && milestone.status !== 'SUBMITTED_FOR_REVIEW' && (
              <button
                disabled={submitting}
                onClick={handleSubmitForReview}
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs min-h-[44px] flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال جهت بررسی و تأیید</span>
              </button>
            )}

            {milestone.status !== 'COMPLETED' && (
              <button
                disabled={submitting}
                onClick={() => handleStatusChange('COMPLETED')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs min-h-[44px] flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تکمیل نقطه عطف</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
