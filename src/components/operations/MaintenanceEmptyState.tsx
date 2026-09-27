import React from 'react';
import { Wrench, Plus } from 'lucide-react';

export interface MaintenanceEmptyStateProps {
  filtered?: boolean;
  canCreateCase?: boolean;
  onCreateCase?: () => void;
}

export const MaintenanceEmptyState: React.FC<MaintenanceEmptyStateProps> = ({
  filtered = false,
  canCreateCase = false,
  onCreateCase,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
        <Wrench className="w-6 h-6" />
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
        پرونده تعمیراتی ثبت‌شده‌ای برای این دارایی وجود ندارد.
      </h4>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
        {filtered
          ? 'با توجه به فیلترهای انتخابی شما پرونده‌ای در این دسته یافت نشد.'
          : 'تا کنون هیچ پرونده سرویس، نگهداری پیشگیرانه یا تعمیر اضطراری برای این دارایی ثبت نشده است.'}
      </p>

      {canCreateCase && onCreateCase && !filtered && (
        <button
          type="button"
          onClick={onCreateCase}
          className="mt-4 min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت پرونده تعمیرات جدید</span>
        </button>
      )}
    </div>
  );
};
