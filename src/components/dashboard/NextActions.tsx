import React from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { DashboardNextAction } from './types';

interface NextActionsProps {
  actions: DashboardNextAction[];
  className?: string;
}

export const NextActions: React.FC<NextActionsProps> = ({
  actions,
  className = ''
}) => {
  // Cap at maximum 3 high-priority actions as mandated by UI-3 specification
  const visibleActions = actions.slice(0, 3);

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby="next-actions-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <CheckSquare size={18} strokeWidth={2.2} />
          </div>
          <h2 id="next-actions-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            اقدام‌های بعدی
          </h2>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          اولویت‌بندی بر مبنای چرخه عمر مهندسی
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {visibleActions.map((action, index) => {
          return (
            <div
              key={action.id || `action-${index}`}
              className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                {/* Project / Asset / Phase Context */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate max-w-[200px]">
                    {action.projectOrAssetName}
                  </span>
                  {action.phaseTitle && (
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {action.phaseTitle}
                    </span>
                  )}
                </div>

                {/* Action Title */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {action.title}
                </h3>

                {/* Short Reason / Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {action.reason}
                </p>
              </div>

              {/* Action Link CTA */}
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                <Link
                  to={action.actionHref}
                  className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
                >
                  <span>{action.actionText}</span>
                  <ArrowLeft size={14} className="text-slate-400 group-hover:text-slate-600" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
