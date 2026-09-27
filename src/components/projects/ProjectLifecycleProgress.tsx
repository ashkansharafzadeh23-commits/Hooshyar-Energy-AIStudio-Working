import React from 'react';
import { Check, Clock, AlertTriangle, ChevronLeft } from 'lucide-react';
import { ProjectStatus } from '../../types/project';
import { LIFECYCLE_PHASES, getProjectPhase, LifecyclePhaseId } from './lifecycleMapping';

interface ProjectLifecycleProgressProps {
  status: ProjectStatus;
  selectedPhaseId?: LifecyclePhaseId;
  onSelectPhase?: (phaseId: LifecyclePhaseId) => void;
  interactive?: boolean;
}

export const ProjectLifecycleProgress: React.FC<ProjectLifecycleProgressProps> = ({
  status,
  selectedPhaseId,
  onSelectPhase,
  interactive = true,
}) => {
  const { phaseIndex: currentPhaseIndex, isCancelled } = getProjectPhase(status);

  if (isCancelled) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <div className="font-bold text-sm">پروژه در وضعیت لغو شده (CANCELLED) قرار دارد</div>
          <div className="text-xs text-rose-600 mt-0.5">
            گردش کار این پروژه متوقف شده و مایل‌استون‌های اجرایی جدیدی قابل پیگیری نیست.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
        <span className="font-bold text-slate-700">مسیر چرخه عمر پروژه (۵ فاز اصلی)</span>
        <span>
          فاز جاری: <strong className="text-blue-700">{currentPhaseIndex > 0 ? `فاز ${currentPhaseIndex} از ۵` : '—'}</strong>
        </span>
      </div>

      {/* Stepper container */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-0 relative">
        {LIFECYCLE_PHASES.map((phaseDef, idx) => {
          const stepNum = phaseDef.index;
          const isCompleted = currentPhaseIndex > stepNum;
          const isCurrent = currentPhaseIndex === stepNum;
          const isFuture = currentPhaseIndex < stepNum;
          const isSelected = selectedPhaseId === phaseDef.id;

          return (
            <div
              key={phaseDef.id}
              className="relative flex sm:flex-col items-center group"
            >
              {/* Connector line for desktop */}
              {idx > 0 && (
                <div
                  className={`hidden sm:block absolute top-4 -right-1/2 w-full h-0.5 z-0 transition-colors ${
                    isCompleted || isCurrent ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Clickable button/wrapper with min 44px touch target */}
              <button
                type="button"
                onClick={() => interactive && onSelectPhase && onSelectPhase(phaseDef.id)}
                disabled={!interactive}
                className={`relative z-10 w-full flex sm:flex-col items-center gap-3 sm:gap-2 p-2 sm:p-2.5 rounded-xl transition-all text-right sm:text-center min-h-[44px] ${
                  isSelected
                    ? 'bg-blue-50/80 ring-2 ring-blue-500/50'
                    : isCurrent
                    ? 'bg-blue-50/40 hover:bg-blue-50/70'
                    : 'hover:bg-slate-50'
                } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {/* Step Circle Indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <span>{stepNum}</span>
                  )}
                </div>

                {/* Text Labels */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-bold truncate leading-snug ${
                      isCurrent
                        ? 'text-blue-900 font-extrabold'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {phaseDef.title}
                  </div>
                  <div className="text-[10px] text-slate-400 hidden sm:block truncate mt-0.5">
                    {isCurrent ? 'فاز فعال' : isCompleted ? 'تکمیل‌شده' : 'پیش‌رو'}
                  </div>
                </div>

                {/* Mobile indicator chevron */}
                <ChevronLeft className="w-4 h-4 text-slate-300 sm:hidden shrink-0" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
