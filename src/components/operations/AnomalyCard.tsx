import React from 'react';
import { AssetAlert, MaintenanceDiagnosis } from '../../types/maintenance';
import { AnomalyEvidence } from './AnomalyEvidence';
import { AnomalyDiagnosis } from './AnomalyDiagnosis';
import { AlertTriangle, Clock, Wrench } from 'lucide-react';
import { formatPersianDateTime } from './DataFreshnessIndicator';
import { getSeverityConfig } from './AlertCard';

export interface AnomalyCardProps {
  alert: AssetAlert;
  diagnosis?: MaintenanceDiagnosis | null;
  componentName?: string;
  onCreateCase?: (alert: AssetAlert) => void;
  onViewCase?: (caseId: string) => void;
}

export const AnomalyCard: React.FC<AnomalyCardProps> = ({
  alert,
  diagnosis,
  componentName,
  onCreateCase,
  onViewCase,
}) => {
  const sevConfig = getSeverityConfig(alert.severity);
  const StatusIcon = sevConfig.icon;

  // Factual headline phrasing:
  // Instead of claiming definite equipment failure, describe the observed anomaly factually
  const factualHeadline = alert.title.includes('خراب است')
    ? alert.title.replace('خراب است', 'نیازمند بررسی ثبت شده است')
    : alert.title;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${sevConfig.iconClass}`}>
            <StatusIcon className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                {alert.alertCode || ''}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${sevConfig.badgeClass}`}>
                {sevConfig.label}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              مشاهده ثبت‌شده: {factualHeadline}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {alert.description}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatPersianDateTime(alert.detectedAt || alert.createdAt)}</span>
        </div>
      </div>

      {/* Part 1: OBSERVED FACT (Evidence) */}
      <AnomalyEvidence
        evidenceList={diagnosis?.evidence || []}
        facts={diagnosis?.facts || []}
        observedMetric={alert.metricType}
        observedValue={alert.observedValue}
        expectedValue={alert.expectedValue}
        deviationPercent={alert.deviationPercent}
        thresholdValue={alert.thresholdValue}
      />

      {/* Part 2: DIAGNOSIS / INTERPRETATION (AI or Expert Rule Engine) */}
      <AnomalyDiagnosis
        diagnosis={diagnosis}
      />

      {/* Action footer */}
      <div className="pt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
          بر اساس داده‌های موجود، این وضعیت می‌تواند نیازمند بررسی باشد.
        </span>

        {alert.maintenanceCaseId ? (
          <button
            type="button"
            onClick={() => onViewCase && onViewCase(alert.maintenanceCaseId!)}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors"
          >
            مشاهده پرونده تعمیرات
          </button>
        ) : (
          onCreateCase && alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && (
            <button
              type="button"
              onClick={() => onCreateCase(alert)}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>ایجاد پرونده تعمیرات بر اساس این مشاهده</span>
            </button>
          )
        )}
      </div>
    </div>
  );
};
