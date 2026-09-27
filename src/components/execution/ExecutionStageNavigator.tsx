import React from 'react';
import { CheckCircle2, Circle, Clock, ArrowLeft } from 'lucide-react';

export interface StageStep {
  id: string;
  key: 'CONTRACTING' | 'PROCUREMENT' | 'CONSTRUCTION' | 'COMMISSIONING' | 'OPERATIONAL';
  title: string;
  description: string;
}

const STAGES: StageStep[] = [
  { id: '1', key: 'CONTRACTING', title: 'قرارداد', description: 'تکمیل و نهایی‌سازی قرارداد EPC' },
  { id: '2', key: 'PROCUREMENT', title: 'تأمین تجهیزات', description: 'سفارش و تحویل اقلام کلیدی' },
  { id: '3', key: 'CONSTRUCTION', title: 'اجرا و احداث', description: 'عملیات عمرانی و نصب تجهیزات' },
  { id: '4', key: 'COMMISSIONING', title: 'آزمون و راه‌اندازی', description: 'تست‌های الکتریکی و اتصال به شبکه' },
  { id: '5', key: 'OPERATIONAL', title: 'بهره‌برداری', description: 'دارایی فعال و تولید برق' }
];

interface ExecutionStageNavigatorProps {
  currentStatus: string;
  className?: string;
}

export const ExecutionStageNavigator: React.FC<ExecutionStageNavigatorProps> = ({
  currentStatus,
  className = ''
}) => {
  // Normalize project status to one of the 5 canonical stages
  const getStageIndex = (status: string): number => {
    switch (status) {
      case 'DRAFT':
      case 'CONCEPT':
      case 'SITE_EVALUATION':
      case 'FEASIBILITY':
      case 'READY_FOR_RFQ':
      case 'RFQ_PUBLISHED':
      case 'BIDDING':
      case 'EPC_SELECTED':
      case 'CONTRACTING':
      case 'READY_TO_SIGN':
      case 'SIGNED':
        return 0; // Stage 1: Contracting / Pre-execution
      case 'PROCUREMENT':
        return 1; // Stage 2: Procurement
      case 'CONSTRUCTION':
      case 'EXECUTION':
      case 'UNDER_CONSTRUCTION':
        return 2; // Stage 3: Construction
      case 'COMMISSIONING':
      case 'TESTING':
        return 3; // Stage 4: Commissioning
      case 'OPERATIONAL':
      case 'COMPLETED':
      case 'HANDED_OVER':
        return 4; // Stage 5: Operational
      default:
        return 0;
    }
  };

  const activeIndex = getStageIndex(currentStatus);

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
          مسیر اجرای پروژه
        </h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
          {STAGES[activeIndex]?.title || 'در حال تعیین'}
        </span>
      </div>

      {/* Desktop / Tablet Stepper */}
      <div className="hidden sm:grid sm:grid-cols-5 gap-2 relative">
        {STAGES.map((stage, idx) => {
          const isPassed = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isFuture = idx > activeIndex;

          return (
            <div
              key={stage.id}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20'
                  : isPassed
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700/60 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-400'
                }`}>
                  مرحله {idx + 1}
                </span>
                {isPassed && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                {isCurrent && <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse shrink-0" />}
                {isFuture && <Circle className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-0.5">
                  {stage.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Horizontal Scroll / Compact view */}
      <div className="sm:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {STAGES.map((stage, idx) => {
          const isPassed = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={stage.id}
              className={`shrink-0 px-3 py-2 rounded-xl border flex items-center gap-2 min-h-[44px] ${
                isCurrent
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isPassed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : isCurrent ? (
                <Clock className="w-4 h-4 text-white" />
              ) : (
                <span className="text-xs font-mono">{idx + 1}</span>
              )}
              <span className="text-xs font-bold whitespace-nowrap">{stage.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
