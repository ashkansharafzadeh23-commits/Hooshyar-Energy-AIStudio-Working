import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Clock, 
  Radio, 
  HelpCircle,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { toPersianDigits } from '../../utils/formatters';

export type MonitoringState = 
  | 'CONNECTED'
  | 'DEGRADED'
  | 'STALE'
  | 'DISCONNECTED'
  | 'CONFIGURED_NOT_VERIFIED'
  | 'NO_SOURCES_CONFIGURED'
  | 'NOT_CONFIGURED'
  | 'UNKNOWN';

export interface MonitoringConnectionReport {
  assetId: string;
  status: MonitoringState | string;
  isLiveConnected?: boolean;
  telemetryVerified?: boolean;
  activeSourcesCount?: number;
  totalSourcesCount?: number;
  latestReadingTimestamp?: string;
  staleThresholdHours?: number;
  reason?: string;
  dataClassification?: string;
}

export interface MonitoringConnectionStatusProps {
  report?: MonitoringConnectionReport | null;
  loading?: boolean;
  canConfigure?: boolean;
  onConfigureClick?: () => void;
  compact?: boolean;
}

export const MonitoringConnectionStatus: React.FC<MonitoringConnectionStatusProps> = ({
  report,
  loading = false,
  canConfigure = false,
  onConfigureClick,
  compact = false,
}) => {
  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-1.5">
            <div className="w-32 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="w-48 h-2.5 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const rawStatus = (report?.status || 'UNKNOWN').toUpperCase();

  // Map backend status to UI state
  let uiState: 'CONNECTED' | 'DEGRADED' | 'STALE' | 'NOT_CONFIGURED' | 'CONFIGURED_NOT_VERIFIED' | 'UNKNOWN' = 'UNKNOWN';
  if (rawStatus === 'CONNECTED') uiState = 'CONNECTED';
  else if (rawStatus === 'DEGRADED') uiState = 'DEGRADED';
  else if (rawStatus === 'STALE' || rawStatus === 'DISCONNECTED') uiState = 'STALE';
  else if (rawStatus === 'CONFIGURED_NOT_VERIFIED') uiState = 'CONFIGURED_NOT_VERIFIED';
  else if (rawStatus === 'NO_SOURCES_CONFIGURED' || rawStatus === 'NOT_CONFIGURED') uiState = 'NOT_CONFIGURED';
  else uiState = 'UNKNOWN';

  // Config mapping strictly based on verified backend data
  const statusConfigs = {
    CONNECTED: {
      title: 'ارتباط پایش برخط برقرار است',
      badgeText: 'متصل و معتبر',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      icon: Wifi,
      iconClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400',
      description: report?.reason || 'جریان تله‌متری معتبر در بازه عملیاتی جاری دریافت و ثبت گردیده است.',
    },
    DEGRADED: {
      title: 'ارتباط پایش با اختلال همراه است',
      badgeText: 'ارتباط نامطلوب',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      icon: AlertTriangle,
      iconClass: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
      description: report?.reason || 'دریافت تله‌متری با نرخ خطای بالا یا ناپایداری ارتباطی از سوی منبع پایش مواجه است.',
    },
    STALE: {
      title: 'انقطاع دریافت داده در پنجره عملیاتی',
      badgeText: 'داده منقضی',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      icon: Clock,
      iconClass: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400',
      description: report?.reason || (report?.staleThresholdHours 
        ? `آخرین رکورد دریافتی فراتر از آستانه مجاز (${toPersianDigits(report.staleThresholdHours)} ساعت) است.`
        : 'در بازه عملیاتی اخیر داده تله‌متری تازه‌ای دریافت نشده است.'),
    },
    CONFIGURED_NOT_VERIFIED: {
      title: 'منبع پایش ثبت شده، تله‌متری دریافت نشده است',
      badgeText: 'در انتظار ارسال',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      icon: Radio,
      iconClass: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400',
      description: report?.reason || 'منابع تله‌متری برای این دارایی پیکربندی شده‌اند اما رکوردی تا کنون دریافت نگردیده است.',
    },
    NOT_CONFIGURED: {
      title: 'پایش برخط هنوز فعال نشده است',
      badgeText: 'غیرفعال',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: WifiOff,
      iconClass: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
      description: 'برای این دارایی هنوز منبع داده پایش برخط ثبت یا تأیید نشده است.',
    },
    UNKNOWN: {
      title: 'وضعیت اتصال منبع پایش مشخص نیست',
      badgeText: 'نامشخص',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: HelpCircle,
      iconClass: 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
      description: 'اطلاعات کافی برای ارزیابی وضعیت اتصال سامانه پایش در دسترس نیست.',
    },
  };

  const config = statusConfigs[uiState];
  const StatusIcon = config.icon;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <span className={`w-2 h-2 rounded-full ${
          uiState === 'CONNECTED' ? 'bg-emerald-500' :
          uiState === 'DEGRADED' ? 'bg-amber-500' :
          uiState === 'STALE' ? 'bg-rose-500' : 'bg-slate-400'
        }`} />
        <span className="text-slate-700 dark:text-slate-300">{config.badgeText}</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${config.iconClass}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {config.title}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${config.badgeClass}`}>
                {config.badgeText}
              </span>
              {report?.telemetryVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  داده تصدیق‌شده
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {config.description}
            </p>

            {/* Factual telemetry metrics when available */}
            {(typeof report?.activeSourcesCount === 'number' || report?.dataClassification) && (
              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                {typeof report?.activeSourcesCount === 'number' && (
                  <span>
                    منابع فعال: <strong className="font-semibold text-slate-700 dark:text-slate-200">{toPersianDigits(report.activeSourcesCount)}</strong>
                    {typeof report.totalSourcesCount === 'number' && ` از ${toPersianDigits(report.totalSourcesCount)}`}
                  </span>
                )}
                {report?.dataClassification && (
                  <span>
                    نوع داده: <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">{report.dataClassification}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CTA only if valid configuration route exists and user is authorized */}
        {uiState === 'NOT_CONFIGURED' && canConfigure && onConfigureClick && (
          <div className="shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={onConfigureClick}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-xs"
            >
              <Settings className="w-4 h-4" />
              <span>تنظیم منبع پایش</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
