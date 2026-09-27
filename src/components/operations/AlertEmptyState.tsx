import React from 'react';
import { ShieldCheck, BellOff } from 'lucide-react';

export interface AlertEmptyStateProps {
  filtered?: boolean;
}

export const AlertEmptyState: React.FC<AlertEmptyStateProps> = ({ filtered = false }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
        <BellOff className="w-6 h-6" />
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
        هشدار ثبت‌شده‌ای برای این بازه نمایش داده نمی‌شود.
      </h4>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
        {filtered
          ? 'با توجه به فیلترهای انتخابی شما، هیچ هشدار یا ناهنجاری ثبت‌شده‌ای در این رده یافت نگردید.'
          : 'در حال حاضر هیچ هشدار ثبت‌شده باز یا در دست اقدامی در پرونده عملیاتی این دارایی قرار ندارد.'}
      </p>
    </div>
  );
};
