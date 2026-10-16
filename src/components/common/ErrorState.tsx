import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
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
      className={`flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 backdrop-blur-xs ${className}`}
      dir="rtl"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3.5 shadow-xs">
        <AlertCircle size={24} strokeWidth={2} />
      </div>

      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5">
        {title}
      </h3>

      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-5">
        {message}
      </p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          rightIcon={RefreshCw}
          onClick={onRetry}
        >
          تلاش مجدد
        </Button>
      )}
    </div>
  );
};
