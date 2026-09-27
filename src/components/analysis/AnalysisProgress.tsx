import React from 'react';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export type AnalysisStage = 
  | 'VALIDATING_INPUTS' 
  | 'REQUESTING_ENGINE_ANALYSIS' 
  | 'COMPLETED'
  | 'FAILED'
  | 'DEGRADED_COMPLETED';

interface AnalysisProgressProps {
  currentStage: AnalysisStage;
  city?: string;
  isDegraded?: boolean;
  degradedMessage?: string;
}

interface StepItem {
  id: AnalysisStage;
  label: string;
  sublabel: string;
}

const STAGES: StepItem[] = [
  {
    id: 'VALIDATING_INPUTS',
    label: 'بررسی ورودی‌ها',
    sublabel: 'اعتبارسنجی مقادیر موقعیت مکانی، مصرف برق و مساحت'
  },
  {
    id: 'REQUESTING_ENGINE_ANALYSIS',
    label: 'اجرای تحلیل در موتور مهندسی سامانه',
    sublabel: 'استعلام داده‌های خورشیدی و محاسبه ظرفیت نیروگاه'
  }
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  currentStage,
  city,
  isDegraded = false,
  degradedMessage
}) => {
  const getStageIndex = (stage: AnalysisStage): number => {
    switch (stage) {
      case 'VALIDATING_INPUTS': return 0;
      case 'REQUESTING_ENGINE_ANALYSIS': return 1;
      case 'COMPLETED':
      case 'DEGRADED_COMPLETED': return 2;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="max-w-md mx-auto py-10 px-4 text-right" dir="rtl">
      {/* Title */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 mb-2">
          در حال پردازش مهندسی سامانه خورشیدی
        </h3>
        {city && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            موقعیت پروژه: {city}
          </p>
        )}
      </div>

      {/* Progress Steps */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        {STAGES.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex && currentStage !== 'COMPLETED' && currentStage !== 'DEGRADED_COMPLETED';
          const isPending = idx > currentIndex;

          return (
            <div key={step.id} className="flex items-start gap-3.5">
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 size={18} className="text-amber-500 animate-spin" />
                ) : (
                  <div className="w-4.5 h-4.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold ${
                  isDone
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : isCurrent
                    ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'text-zinc-400 dark:text-zinc-600'
                }`}>
                  {step.label}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {step.sublabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Degraded mode notice if external source was unavailable */}
      {isDegraded && degradedMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <span>{degradedMessage}</span>
        </div>
      )}
    </div>
  );
};
