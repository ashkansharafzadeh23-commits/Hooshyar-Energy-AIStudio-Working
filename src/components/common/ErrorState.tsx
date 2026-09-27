import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'خطا در برقراری ارتباط با سامانه',
  message = 'امکان دریافت اطلاعات وجود ندارد. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش نمایید.',
  onRetry,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 ${className}`}
      dir="rtl"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3.5 shadow-sm">
        <AlertCircle size={24} strokeWidth={2} />
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
        {title}
      </h3>

      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-5">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm"
        >
          <RefreshCw size={14} />
          <span>تلاش مجدد</span>
        </button>
      )}
    </div>
  );
};
