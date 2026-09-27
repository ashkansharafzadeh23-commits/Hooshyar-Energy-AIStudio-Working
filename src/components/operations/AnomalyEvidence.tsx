import React from 'react';
import { Database, Activity, CheckCircle2 } from 'lucide-react';
import { formatPersianNumber, toPersianDigits } from '../../utils/formatters';

export interface AnomalyEvidenceProps {
  evidenceList?: string[];
  facts?: string[];
  observedMetric?: string;
  observedValue?: number | null;
  expectedValue?: number | null;
  deviationPercent?: number | null;
  thresholdValue?: number | null;
}

export const AnomalyEvidence: React.FC<AnomalyEvidenceProps> = ({
  evidenceList = [],
  facts = [],
  observedMetric,
  observedValue,
  expectedValue,
  deviationPercent,
  thresholdValue,
}) => {
  const hasTelemetryMetrics = 
    typeof observedValue === 'number' ||
    typeof expectedValue === 'number' ||
    typeof deviationPercent === 'number' ||
    typeof thresholdValue === 'number';

  const allItems = [...facts, ...evidenceList];

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
          داده‌های مشاهده‌شده (شواهد قطعی تله‌متری)
        </h4>
      </div>

      {hasTelemetryMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          {typeof observedValue === 'number' && (
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">مقدار خوانده‌شده:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {formatPersianNumber(observedValue, 1)} {observedMetric ? `(${observedMetric})` : ''}
              </strong>
            </div>
          )}
          {typeof expectedValue === 'number' && (
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">مقدار مورد انتظار:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {formatPersianNumber(expectedValue, 1)}
              </strong>
            </div>
          )}
          {typeof deviationPercent === 'number' && (
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">انحراف ثبت‌شده:</span>
              <strong className="font-mono text-amber-600 dark:text-amber-400">
                {formatPersianNumber(deviationPercent, 1)}%
              </strong>
            </div>
          )}
          {typeof thresholdValue === 'number' && (
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">حد آستانه مجاز:</span>
              <strong className="font-mono text-slate-700 dark:text-slate-300">
                {formatPersianNumber(thresholdValue, 1)}
              </strong>
            </div>
          )}
        </div>
      )}

      {allItems.length > 0 ? (
        <ul className="space-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-300">
          {allItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 mt-1.5 shrink-0" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        !hasTelemetryMetrics && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            شواهد اندازه‌گیری بیشتری در پیام هشدار ثبت نشده است.
          </p>
        )
      )}
    </div>
  );
};
