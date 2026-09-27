import React from 'react';
import { BarChart3, WifiOff, AlertCircle } from 'lucide-react';

export interface TelemetryEmptyStateProps {
  hasSources?: boolean;
  message?: string;
  onConfigureClick?: () => void;
  canConfigure?: boolean;
}

export const TelemetryEmptyState: React.FC<TelemetryEmptyStateProps> = ({
  hasSources = true,
  message,
  onConfigureClick,
  canConfigure = false,
}) => {
  const isNoSource = !hasSources;

  const defaultMessage = isNoSource
    ? 'برای نمایش داده‌های عملیاتی، ابتدا منبع پایش نیروگاه باید متصل شود.'
    : 'داده کافی برای نمایش نمودار وجود ندارد.';

  const displayMessage = message || defaultMessage;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center mb-3 shadow-xs">
        {isNoSource ? <WifiOff className="w-6 h-6" /> : <BarChart3 className="w-6 h-6" />}
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 max-w-sm leading-relaxed">
        {displayMessage}
      </h4>

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
        {isNoSource
          ? 'پیکربندی درگاه تله‌متری (اینورتر، کنتور یا وب‌سرویس پایش) امکان ثبت خودکار و ترسیم نمودارهای توان و تولید را فراهم می‌کند.'
          : 'پس از دریافت حداقل دو خوانش معتبر در بازه زمانی انتخابی، نمودار روند زمانی به صورت زنده نمایش داده خواهد شد.'}
      </p>

      {isNoSource && canConfigure && onConfigureClick && (
        <button
          type="button"
          onClick={onConfigureClick}
          className="mt-4 min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
        >
          <span>تنظیم منبع پایش</span>
        </button>
      )}
    </div>
  );
};
