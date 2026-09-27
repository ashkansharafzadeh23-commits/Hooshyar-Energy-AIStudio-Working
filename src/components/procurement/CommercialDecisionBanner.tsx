import React from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

export interface CommercialDecisionContext {
  currentAction: string;          // ۱. چه کاری اکنون باید انجام شود؟
  completedMilestones: string[];  // ۲. چه اقداماتی قبلاً انجام شده است؟
  missingInfo?: string[];         // ۳. چه اطلاعات یا مدارکی ناقص است؟
  pendingDecision?: {             // ۴. چه تصمیمی در انتظار اقدام کاربر است؟
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  decisionImpact?: string;        // ۵. پیامد این تصمیم چیست و پس از آن چه رخ می‌دهد؟
}

interface CommercialDecisionBannerProps {
  context: CommercialDecisionContext;
  className?: string;
}

export const CommercialDecisionBanner: React.FC<CommercialDecisionBannerProps> = ({
  context,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-sm relative overflow-hidden ${className}`}>
      {/* Decorative subtle background mesh */}
      <div className="absolute top-0 right-0 w-96 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-10" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/40">
                  اقدام جاری پروژه
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                {context.currentAction}
              </h3>
            </div>
          </div>

          {context.pendingDecision?.actionLabel && context.pendingDecision?.onAction && (
            <div className="shrink-0 flex items-center">
              <button
                type="button"
                onClick={context.pendingDecision.onAction}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm cursor-pointer min-h-[44px]"
              >
                <span>{context.pendingDecision.actionLabel}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 5-Question Clarity Grid */}
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Decisions & Next Steps */}
          {context.pendingDecision && (
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>تصمیم در انتظار: {context.pendingDecision.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {context.pendingDecision.description}
              </p>
              {context.decisionImpact && (
                <div className="mt-2 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">پیامد پس از انتخاب: </span>
                  {context.decisionImpact}
                </div>
              )}
            </div>
          )}

          {/* Missing Information (Truthful Disclosure) */}
          {context.missingInfo && context.missingInfo.length > 0 && (
            <div className="bg-rose-950/20 rounded-xl p-3 border border-rose-900/40">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>نواقص اطلاعاتی یا مدارک مورد نیاز:</span>
              </div>
              <ul className="text-xs text-rose-200/80 space-y-1 list-disc list-inside">
                {context.missingInfo.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Expandable History of Completed Commercial Milestones */}
        {context.completedMilestones.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span>گام‌های تجاری انجام‌شده ({context.completedMilestones.length})</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isExpanded && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {context.completedMilestones.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 text-xs font-medium border border-emerald-800/50"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
