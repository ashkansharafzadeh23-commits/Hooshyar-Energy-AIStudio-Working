import React from 'react';

interface LoadingStateProps {
  message?: string;
  count?: number;
  type?: 'card' | 'table' | 'detail';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'در حال بارگذاری اطلاعات...',
  count = 3,
  type = 'card',
  className = ''
}) => {
  return (
    <div className={`w-full space-y-4 ${className}`} dir="rtl">
      {message && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <span>{message}</span>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        </div>
      )}

      {type === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-16" />
              </div>
              <div className="h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'table' && (
        <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 animate-pulse">
          <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-full" />
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg w-full" />
          ))}
        </div>
      )}

      {type === 'detail' && (
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5 animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
