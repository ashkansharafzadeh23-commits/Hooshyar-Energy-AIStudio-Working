import React from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  AlertCircle, 
  Info, 
  Clock, 
  Cpu, 
  ArrowLeft, 
  Wrench, 
  FileText,
  CheckCircle2
} from 'lucide-react';
import { AssetAlert, AlertSeverity, AlertStatus } from '../../types/maintenance';
import { formatPersianNumber, toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface AlertCardProps {
  alert: AssetAlert;
  componentName?: string;
  isSelected?: boolean;
  onSelect?: (alert: AssetAlert) => void;
  onDiagnose?: (alert: AssetAlert) => void;
  onCreateCase?: (alert: AssetAlert) => void;
  onViewCase?: (caseId: string) => void;
}

export function getSeverityConfig(severity: AlertSeverity) {
  switch (severity) {
    case 'CRITICAL':
      return {
        label: 'بحرانی',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        icon: AlertOctagon,
        iconClass: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400',
      };
    case 'HIGH':
      return {
        label: 'بالا',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        icon: AlertTriangle,
        iconClass: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
      };
    case 'WARNING':
      return {
        label: 'هشدار',
        badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800',
        icon: AlertCircle,
        iconClass: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-400',
      };
    case 'INFO':
    default:
      return {
        label: 'اطلاعیه',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        icon: Info,
        iconClass: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400',
      };
  }
}

export function getStatusLabel(status: AlertStatus): { label: string; className: string } {
  switch (status) {
    case 'TRIGGERED':
    case 'OPEN':
      return { label: 'جدید', className: 'text-rose-700 bg-rose-50 dark:bg-rose-950/30' };
    case 'ACKNOWLEDGED':
      return { label: 'دیده‌شده', className: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30' };
    case 'UNDER_INVESTIGATION':
      return { label: 'در حال بررسی', className: 'text-blue-700 bg-blue-50 dark:bg-blue-950/30' };
    case 'MAINTENANCE_REQUIRED':
      return { label: 'نیازمند تعمیر', className: 'text-purple-700 bg-purple-50 dark:bg-purple-950/30' };
    case 'CASE_CREATED':
      return { label: 'پرونده تعمیراتی ثبت شد', className: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30' };
    case 'RESOLVED':
      return { label: 'حل‌شده', className: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' };
    case 'DISMISSED':
    case 'SUPPRESSED':
      return { label: 'رد / نادیده‌گرفته', className: 'text-slate-600 bg-slate-100 dark:bg-slate-800' };
    default:
      return { label: status, className: 'text-slate-600 bg-slate-100 dark:bg-slate-800' };
  }
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  componentName,
  isSelected = false,
  onSelect,
  onDiagnose,
  onCreateCase,
  onViewCase,
}) => {
  const sevConfig = getSeverityConfig(alert.severity);
  const StatusIcon = sevConfig.icon;
  const statusConfig = getStatusLabel(alert.status);

  return (
    <div
      onClick={() => onSelect && onSelect(alert)}
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all text-right cursor-pointer ${
        isSelected
          ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${sevConfig.iconClass}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {alert.title}
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${sevConfig.badgeClass}`}>
                {sevConfig.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {alert.description}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
          {alert.alertCode || ''}
        </span>
      </div>

      {/* Observed evidence preview if present */}
      {(typeof alert.observedValue === 'number' || typeof alert.deviationPercent === 'number' || componentName) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
          {componentName && (
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>تجهیز: <strong className="text-slate-700 dark:text-slate-300 font-medium">{componentName}</strong></span>
            </div>
          )}
          {typeof alert.observedValue === 'number' && (
            <div>
              مقدار مشاهده‌شده: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatPersianNumber(alert.observedValue, 1)}</strong>
            </div>
          )}
          {typeof alert.deviationPercent === 'number' && (
            <div>
              انحراف: <strong className="font-mono text-amber-600 dark:text-amber-400">{formatPersianNumber(alert.deviationPercent, 1)}%</strong>
            </div>
          )}
        </div>
      )}

      {/* Footer and Quick Actions */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatPersianDateTime(alert.detectedAt || alert.createdAt)}</span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {alert.maintenanceCaseId ? (
            <button
              type="button"
              onClick={() => onViewCase && onViewCase(alert.maintenanceCaseId!)}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>مشاهده پرونده تعمیرات</span>
            </button>
          ) : (
            onCreateCase && alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && (
              <button
                type="button"
                onClick={() => onCreateCase(alert)}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>ایجاد پرونده تعمیرات</span>
              </button>
            )
          )}

          {onDiagnose && (
            <button
              type="button"
              onClick={() => onDiagnose(alert)}
              className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>تحلیل و عیب‌یابی</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
