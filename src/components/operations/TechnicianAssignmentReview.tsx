import React, { useState } from 'react';
import { User, Phone, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { TechnicianMatch, MaintenanceCase } from '../../types/maintenance';
import { toPersianDigits } from '../../utils/formatters';

export interface TechnicianAssignmentReviewProps {
  maintenanceCase: MaintenanceCase;
  match: TechnicianMatch;
  onConfirm: (notes?: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const TechnicianAssignmentReview: React.FC<TechnicianAssignmentReviewProps> = ({
  maintenanceCase,
  match,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              تأیید نهایی تخصیص تکنسین به پرونده
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              پرونده: {maintenanceCase.title} ({maintenanceCase.maintenanceCode || ''})
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Technician Card */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">تکنسین منتخب:</span>
            <strong className="text-sm font-bold text-slate-900 dark:text-white">
              {match.fullName || (match as any).technicianName}
            </strong>
          </div>
          {match.phone && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">شماره تماس:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {toPersianDigits(match.phone)}
              </span>
            </div>
          )}
          {match.specialties && match.specialties.length > 0 && (
            <div className="flex items-start justify-between text-xs pt-1">
              <span className="text-slate-500 dark:text-slate-400">تخصص‌های احراز‌شده:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 text-left max-w-xs">
                {match.specialties.join('، ')}
              </span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              دستور کار یا یادداشت هماهنگی (اختیاری):
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نکات دسترسی به سایت، شرایط ایمنی یا ابزارهای مورد نیاز..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
            >
              {loading ? 'در حال ثبت تخصیص...' : 'تأیید و ارسال دستور کار'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
