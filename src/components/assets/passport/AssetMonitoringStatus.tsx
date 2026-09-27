import React from 'react';
import { Activity, Wifi, WifiOff, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

interface AssetMonitoringStatusProps {
  assetId: string;
  isConnected?: boolean;
  lastTelemetryTimestamp?: string;
  telemetrySource?: string;
  loading?: boolean;
  className?: string;
}

export const AssetMonitoringStatus: React.FC<AssetMonitoringStatusProps> = ({
  assetId,
  isConnected = false,
  lastTelemetryTimestamp,
  telemetrySource,
  loading = false,
  className = ''
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('fa-IR')} ساعت ${d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>وضعیت اتصال و مانیتورینگ برخط (Online Telemetry)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          وضعیت دریافت داده‌های مانیتورینگ دارایی
        </p>
      </div>

      {!isConnected ? (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-850/50 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center">
            <WifiOff className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
            پایش برخط هنوز فعال نشده است.
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md leading-relaxed">
            ارتباط مخابراتی یا دیتالاگر برای این دارایی برقرار نشده است.
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                سیستم دیتالاگر متصل و برخط است
              </h4>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                منبع مخابراتی: {telemetrySource || 'ثبت نشده'} | آخرین تبادل داده: {formatDate(lastTelemetryTimestamp)}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 self-start sm:self-center">
            برخط (Online)
          </span>
        </div>
      )}
    </div>
  );
};
