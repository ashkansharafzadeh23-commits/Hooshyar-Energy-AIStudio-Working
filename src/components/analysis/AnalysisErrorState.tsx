import React from 'react';
import { AlertTriangle, RefreshCw, ArrowRight, ShieldAlert, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AnalysisErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onBack?: () => void;
  isAuthError?: boolean;
}

export const AnalysisErrorState: React.FC<AnalysisErrorStateProps> = ({
  title = 'خطا در تحلیل انرژی',
  message,
  onRetry,
  onBack,
  isAuthError = false
}) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-center" dir="rtl">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
        {isAuthError ? <ShieldAlert size={28} /> : <AlertTriangle size={28} />}
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
        {message}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-zinc-950 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>تلاش مجدد</span>
          </button>
        )}

        {isAuthError && (
          <button
            type="button"
            onClick={() => navigate('/customer-login')}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn size={16} />
            <span>ورود به حساب کاربری</span>
          </button>
        )}

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl font-medium text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowRight size={14} />
            <span>بازگشت و اصلاح اطلاعات</span>
          </button>
        )}
      </div>
    </div>
  );
};
