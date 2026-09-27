import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Wrench, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  FileText, 
  Stethoscope,
  Send,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { AssetAlert, AlertSeverity, AlertStatus } from '../../types/maintenance';
import { formatPersianNumber, toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';
import { getSeverityConfig, getStatusLabel } from './AlertCard';

export interface AlertDetailsProps {
  alert: AssetAlert;
  componentName?: string;
  onClose: () => void;
  onInvestigate?: (alertId: string, note?: string) => Promise<void>;
  onFlagMaintenance?: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string, resolutionNote: string) => Promise<void>;
  onDismiss?: (alertId: string, reason: string) => Promise<void>;
  onDiagnose?: (alert: AssetAlert) => void;
  onCreateCase?: (alert: AssetAlert) => void;
  onViewCase?: (caseId: string) => void;
  isActionLoading?: boolean;
}

export const AlertDetails: React.FC<AlertDetailsProps> = ({
  alert,
  componentName,
  onClose,
  onInvestigate,
  onFlagMaintenance,
  onResolve,
  onDismiss,
  onDiagnose,
  onCreateCase,
  onViewCase,
  isActionLoading = false,
}) => {
  const [resolveNote, setResolveNote] = useState('');
  const [dismissReason, setDismissReason] = useState('');
  const [investigateNote, setInvestigateNote] = useState('');
  const [activeActionModal, setActiveActionModal] = useState<'RESOLVE' | 'DISMISS' | 'INVESTIGATE' | null>(null);

  const sevConfig = getSeverityConfig(alert.severity);
  const StatusIcon = sevConfig.icon;
  const statusConfig = getStatusLabel(alert.status);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onResolve) return;
    await onResolve(alert.id, resolveNote || 'رفع هشدار پس از بررسی میدانی');
    setActiveActionModal(null);
  };

  const handleDismissSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onDismiss) return;
    await onDismiss(alert.id, dismissReason || 'هشدار کاذب / بدون انحراف عملیاتی');
    setActiveActionModal(null);
  };

  const handleInvestigateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onInvestigate) return;
    await onInvestigate(alert.id, investigateNote || 'آغاز بررسی فنی و میدانی');
    setActiveActionModal(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-xl shrink-0 ${sevConfig.iconClass}`}>
            <StatusIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                {alert.alertCode || ''}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${sevConfig.badgeClass}`}>
                {sevConfig.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
              {alert.title}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
          شرح رویداد و نقص فنی:
        </h4>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
          {alert.description}
        </p>
      </div>

      {/* Verified Telemetry Evidence */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
          شواهد و داده‌های ثبت‌شده در تله‌متری:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {componentName && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] block">تجهیز متأثر:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{componentName}</span>
            </div>
          )}
          {typeof alert.observedValue === 'number' && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] block">مقدار اندازه‌گیری‌شده:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                {formatPersianNumber(alert.observedValue, 1)} {alert.metricType ? `(${alert.metricType})` : ''}
              </span>
            </div>
          )}
          {typeof alert.expectedValue === 'number' && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] block">مقدار مورد انتظار:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                {formatPersianNumber(alert.expectedValue, 1)}
              </span>
            </div>
          )}
          {typeof alert.deviationPercent === 'number' && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] block">درصد انحراف:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                {formatPersianNumber(alert.deviationPercent, 1)}%
              </span>
            </div>
          )}
          {typeof alert.thresholdValue === 'number' && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 dark:text-slate-500 text-[11px] block">آستانه هشدار:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                {formatPersianNumber(alert.thresholdValue, 1)}
              </span>
            </div>
          )}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 text-[11px] block">زمان اولین رخداد:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
              {formatPersianDateTime(alert.firstObservedAt || alert.detectedAt || alert.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Investigation Notes if present */}
      {alert.investigationNotes && alert.investigationNotes.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            یادداشت‌های بررسی فنی:
          </h4>
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            {alert.investigationNotes.map((note, idx) => (
              <div key={idx} className="leading-relaxed font-mono text-[11px]">{note}</div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Maintenance Case if already created */}
      {alert.maintenanceCaseId && (
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <div className="text-xs font-bold text-purple-900 dark:text-purple-200">
                پرونده تعمیراتی مرتبط ایجاد شده است
              </div>
              <div className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                برای مدیریت تخصیص تکنسین و اقدامات تعمیراتی به پرونده مراجعه کنید.
              </div>
            </div>
          </div>
          {onViewCase && (
            <button
              type="button"
              onClick={() => onViewCase(alert.maintenanceCaseId!)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors shadow-xs"
            >
              مشاهده پرونده
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {onDiagnose && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => onDiagnose(alert)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 hover:bg-slate-800 transition-colors"
            >
              <Stethoscope className="w-4 h-4" />
              <span>تحلیل و عیب‌یابی هوشمند</span>
            </button>
          )}

          {!alert.maintenanceCaseId && onCreateCase && alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => onCreateCase(alert)}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Wrench className="w-4 h-4" />
              <span>ارجاع به پرونده تعمیرات</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {alert.status !== 'UNDER_INVESTIGATION' && alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && onInvestigate && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => setActiveActionModal('INVESTIGATE')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              شروع بررسی
            </button>
          )}

          {alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && onResolve && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => setActiveActionModal('RESOLVE')}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>حل هشدار</span>
            </button>
          )}

          {alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && onDismiss && (
            <button
              type="button"
              disabled={isActionLoading}
              onClick={() => setActiveActionModal('DISMISS')}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>رد هشدار کاذب</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-modals for Resolve, Dismiss, Investigate */}
      {activeActionModal === 'RESOLVE' && (
        <form onSubmit={handleResolveSubmit} className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
          <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
            تأیید رفع و حل نهایی هشدار
          </h5>
          <textarea
            required
            rows={2}
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="شرح اقدامات انجام‌شده جهت رفع هشدار..."
            className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveActionModal(null)}
              className="min-h-[36px] px-3 py-1 text-xs text-slate-600 dark:text-slate-400"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
            >
              ثبت حل هشدار
            </button>
          </div>
        </form>
      )}

      {activeActionModal === 'DISMISS' && (
        <form onSubmit={handleDismissSubmit} className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
            رد یا نادیده‌گرفتن هشدار کاذب
          </h5>
          <textarea
            required
            rows={2}
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="دلیل رد هشدار (مثلاً خطای سنسور یا شرایط محیطی مجاز)..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveActionModal(null)}
              className="min-h-[36px] px-3 py-1 text-xs text-slate-600 dark:text-slate-400"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
            >
              رد هشدار
            </button>
          </div>
        </form>
      )}

      {activeActionModal === 'INVESTIGATE' && (
        <form onSubmit={handleInvestigateSubmit} className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
          <h5 className="text-xs font-bold text-blue-900 dark:text-blue-200">
            ثبت آغاز بررسی فنی هشدار
          </h5>
          <textarea
            rows={2}
            value={investigateNote}
            onChange={(e) => setInvestigateNote(e.target.value)}
            placeholder="یادداشت اولیه کارشناس بررسی‌کننده..."
            className="w-full text-xs p-2.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveActionModal(null)}
              className="min-h-[36px] px-3 py-1 text-xs text-slate-600 dark:text-slate-400"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500"
            >
              شروع بررسی
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
