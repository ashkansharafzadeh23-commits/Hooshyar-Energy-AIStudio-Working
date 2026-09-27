import React from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  ShieldCheck, 
  AlertCircle, 
  Wrench, 
  Check, 
  FileCheck2,
  Stethoscope 
} from 'lucide-react';
import { MaintenanceDiagnosis } from '../../types/maintenance';
import { formatPersianNumber, toPersianDigits } from '../../utils/formatters';

export interface AnomalyDiagnosisProps {
  diagnosis?: MaintenanceDiagnosis | null;
  loading?: boolean;
}

export const AnomalyDiagnosis: React.FC<AnomalyDiagnosisProps> = ({
  diagnosis,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 animate-pulse space-y-2.5">
        <div className="w-36 h-3.5 bg-amber-200 dark:bg-amber-900 rounded" />
        <div className="w-full h-8 bg-amber-100 dark:bg-amber-900/40 rounded" />
      </div>
    );
  }

  if (!diagnosis || diagnosis.diagnosisStatus === 'INSUFFICIENT_DATA') {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs font-bold">تحلیل هوشمند و ریشه‌یابی</h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-6">
          داده موجود برای تشخیص قابل اتکا کافی نیست.
        </p>
      </div>
    );
  }

  const confidencePercent = typeof diagnosis.confidenceScore === 'number'
    ? Math.round(diagnosis.confidenceScore * 100)
    : typeof diagnosis.confidence === 'number'
    ? Math.round(diagnosis.confidence * 100)
    : null;

  return (
    <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-xl p-4 sm:p-5 space-y-4">
      {/* Title & confidence badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
            تحلیل هوشمند عیب‌یابی (مبتنی بر شواهد قطعی)
          </h4>
        </div>

        {confidencePercent !== null && (
          <span className="text-[11px] font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
            ضریب اطمینان: {toPersianDigits(confidencePercent)}٪
          </span>
        )}
      </div>

      {/* Inferences / Root Causes */}
      {((diagnosis.possibleCauses && diagnosis.possibleCauses.length > 0) || 
        (diagnosis.rootCauses && diagnosis.rootCauses.length > 0) ||
        (diagnosis.inferences && diagnosis.inferences.length > 0)) && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            دلایل و سناریوهای محتمل عیب:
          </span>
          <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {diagnosis.possibleCauses?.map((cause, idx) => (
              <div key={`pc-${idx}`} className="flex items-start gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{cause}</span>
              </div>
            ))}
            {diagnosis.rootCauses?.map((rc, idx) => (
              <div key={`rc-${idx}`} className="flex items-start justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{rc.cause}</span>
                </div>
                {typeof rc.probability === 'number' && (
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                    {toPersianDigits(Math.round(rc.probability * 100))}٪
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {((diagnosis.actions && diagnosis.actions.length > 0) || 
        (Array.isArray(diagnosis.recommendedActions) && diagnosis.recommendedActions.length > 0)) && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            اقدامات پیشنهادی جهت بررسی میدانی:
          </span>
          <div className="space-y-1.5 text-xs">
            {diagnosis.actions?.map((act, idx) => (
              <div key={`act-${idx}`} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{act.action}</span>
                    {act.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{act.description}</p>
                    )}
                  </div>
                </div>
                {act.priority && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium shrink-0">
                    اولویت: {act.priority}
                  </span>
                )}
              </div>
            ))}
            {Array.isArray(diagnosis.recommendedActions) && diagnosis.recommendedActions.map((act: any, idx) => (
              <div key={`rec-${idx}`} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {typeof act === 'string' ? act : act.action || JSON.stringify(act)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warranty Coverage Status */}
      {diagnosis.warrantyStatus && (
        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <FileCheck2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>وضعیت پوشش گارانتی تجهیز:</span>
            <strong className="font-semibold text-slate-900 dark:text-white">
              {diagnosis.warrantyStatus === 'ACTIVE'
                ? 'دارای گارانتی معتبر'
                : diagnosis.warrantyStatus === 'EXPIRED'
                ? 'گارانتی منقضی شده است'
                : 'داده کافی برای ارزیابی گارانتی وجود ندارد'}
            </strong>
          </div>
          {diagnosis.warrantyDetails && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {diagnosis.warrantyDetails}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
