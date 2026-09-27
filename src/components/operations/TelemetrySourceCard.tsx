import React from 'react';
import { 
  Radio, 
  Cpu, 
  Gauge, 
  CloudSun, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';
import { TelemetrySource } from '../../types/monitoring';
import { toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface TelemetrySourceCardProps {
  source: TelemetrySource;
  equipmentName?: string;
}

export function getSourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case 'INVERTER':
      return 'اینورتر خورشیدی';
    case 'SMART_METER':
      return 'کنتور هوشمند';
    case 'BATTERY_BMS':
      return 'مدیریت باتری (BMS)';
    case 'WEATHER_STATION':
      return 'ایستگاه هواشناسی';
    case 'MANUAL_UPLOAD':
      return 'بارگذاری دستی داده عملیاتی';
    case 'API':
      return 'وب‌سرویس پایش (API)';
    case 'OTHER':
    default:
      return sourceType || 'منبع نامشخص';
  }
}

export function getSourceTypeIcon(sourceType: string): React.ComponentType<{ className?: string }> {
  switch (sourceType) {
    case 'INVERTER':
      return Cpu;
    case 'SMART_METER':
      return Gauge;
    case 'BATTERY_BMS':
      return Layers;
    case 'WEATHER_STATION':
      return CloudSun;
    case 'MANUAL_UPLOAD':
      return FileSpreadsheet;
    case 'API':
    default:
      return Radio;
  }
}

export const TelemetrySourceCard: React.FC<TelemetrySourceCardProps> = ({
  source,
  equipmentName,
}) => {
  const Icon = getSourceTypeIcon(source.sourceType);
  const typeLabel = getSourceTypeLabel(source.sourceType);

  const statusBadges = {
    ACTIVE: {
      text: 'فعال',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      icon: CheckCircle2,
    },
    INACTIVE: {
      text: 'غیرفعال',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      icon: AlertCircle,
    },
    ERROR: {
      text: 'خطا در ارتباط',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
      icon: XCircle,
    },
  };

  const statusConfig = statusBadges[source.status as keyof typeof statusBadges] || statusBadges.INACTIVE;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {source.name}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">{typeLabel}</span>
              {equipmentName && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>تجهیز: {equipmentName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusConfig.badgeClass} shrink-0`}>
          <StatusIcon className="w-3 h-3" />
          {statusConfig.text}
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <span className="text-slate-400 dark:text-slate-500">تأمین‌کننده / سرویس: </span>
          <span className="font-medium">{source.provider || 'ثبت نشده است'}</span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500">پروتکل ارتباطی: </span>
          <span className="font-medium">{source.protocol || 'پروتکل ثبت نشده است'}</span>
        </div>
        {typeof source.samplingIntervalSeconds === 'number' && source.samplingIntervalSeconds > 0 && (
          <div>
            <span className="text-slate-400 dark:text-slate-500">دوره نمونه‌برداری: </span>
            <span className="font-medium">{toPersianDigits(source.samplingIntervalSeconds)} ثانیه</span>
          </div>
        )}
        {source.lastSyncAt ? (
          <div className="sm:col-span-2 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <Clock className="w-3 h-3" />
            <span>آخرین همگام‌سازی: </span>
            <strong className="text-slate-700 dark:text-slate-300 font-medium">
              {formatPersianDateTime(source.lastSyncAt)}
            </strong>
          </div>
        ) : (
          <div className="sm:col-span-2 text-slate-400 dark:text-slate-500 text-[11px]">
            تا کنون همگام‌سازی انجام نشده است.
          </div>
        )}
      </div>
    </div>
  );
};
