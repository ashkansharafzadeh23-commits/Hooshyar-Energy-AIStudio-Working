import React from 'react';
import { Activity, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export interface OperationsEmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const OperationsEmptyState: React.FC<OperationsEmptyStateProps> = ({
  title = 'اطلاعات عملیاتی ثبت نشده است',
  description = 'برای این دارایی تا کنون داده پایش، هشدار یا پرونده تعمیراتی ثبت نگردیده است.',
  actionText,
  onAction,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
        <Activity className="w-6 h-6" />
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h4>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
        >
          <span>{actionText}</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export interface OperationsErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const OperationsErrorState: React.FC<OperationsErrorStateProps> = ({
  message = 'خطا در برقراری ارتباط با سرویس عملیات و پایش.',
  onRetry,
}) => {
  return (
    <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
        <ShieldAlert className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
          خطا در بارگذاری اطلاعات عملیاتی
        </h4>
        <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>تلاش مجدد</span>
        </button>
      )}
    </div>
  );
};
