import React from 'react';
import { 
  Zap, 
  Activity, 
  Gauge, 
  Battery, 
  Sun, 
  Thermometer, 
  Clock, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { formatPersianNumber, toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface TelemetryMetricCardProps {
  label: string;
  value?: number | null;
  unit?: string;
  metricType?: string;
  timestamp?: string | null;
  quality?: string | null;
  comparisonText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

export function getDefaultMetricIcon(metricType?: string): React.ComponentType<{ className?: string }> {
  switch (metricType) {
    case 'POWER_KW':
    case 'ACTIVE_POWER_KW':
      return Zap;
    case 'ENERGY_KWH':
      return Sun;
    case 'VOLTAGE':
    case 'CURRENT':
    case 'FREQUENCY':
    case 'GRID_FREQ':
      return Gauge;
    case 'BATTERY_SOC':
    case 'BATTERY_POWER_KW':
      return Battery;
    case 'MODULE_TEMPERATURE':
    case 'AMBIENT_TEMPERATURE':
      return Thermometer;
    default:
      return Activity;
  }
}

export const TelemetryMetricCard: React.FC<TelemetryMetricCardProps> = ({
  label,
  value,
  unit,
  metricType,
  timestamp,
  quality,
  comparisonText,
  icon,
  loading = false,
}) => {
  const Icon = icon || getDefaultMetricIcon(metricType);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs animate-pulse space-y-3">
        <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="w-36 h-7 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="w-20 h-2.5 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  const hasValue = value !== undefined && value !== null && !isNaN(value);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </span>
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          {hasValue ? (
            <>
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                {formatPersianNumber(value, value % 1 === 0 ? 0 : 1)}
              </span>
              {unit && (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {unit}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 py-1">
              داده در دسترس نیست
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        {timestamp ? (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formatPersianDateTime(timestamp)}</span>
          </div>
        ) : (
          <span>—</span>
        )}

        {quality && (
          <span className={`px-1.5 py-0.5 rounded font-medium text-[10px] ${
            quality === 'VALID' || quality === 'GOOD'
              ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400'
              : quality === 'ESTIMATED'
              ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400'
              : 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {quality === 'VALID' || quality === 'GOOD' ? 'معتبر' : quality === 'ESTIMATED' ? 'تخمینی' : quality}
          </span>
        )}

        {comparisonText && !quality && (
          <span className="text-slate-400 dark:text-slate-500">{comparisonText}</span>
        )}
      </div>
    </div>
  );
};
