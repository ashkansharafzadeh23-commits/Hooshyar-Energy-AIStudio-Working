import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Zap, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { StatusBadge } from '../common/StatusBadge';
import { getProjectPhase, getNextRecommendedAction } from '../projects/lifecycleMapping';
import { formatSolarCapacity, formatCurrencyIRR } from '../../utils/formatters';

interface DashboardProjectCardProps {
  project: EnergyProject;
}

export const DashboardProjectCard: React.FC<DashboardProjectCardProps> = ({ project }) => {
  const { phase } = getProjectPhase(project.status);
  const nextAction = getNextRecommendedAction(project);

  const locationText = project.location?.province
    ? `${project.location.province}${project.location.city ? ` - ${project.location.city}` : ''}`
    : project.location?.city || null;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="group block p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all min-h-[44px]"
      aria-label={`پروژه ${project.title}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {project.projectCode || 'HSE-IR'}
            </span>
            <StatusBadge status={project.status} size="sm" />
            {phase && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800">
                گام {phase.index}: {phase.title}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {project.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">
          <span>فضای کار</span>
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        </div>
      </div>

      {/* Metadata Row: Location, Capacity, Budget */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 py-3">
        {locationText && (
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            <span>{locationText}</span>
          </span>
        )}

        {project.targetCapacityKw ? (
          <span className="flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" />
            <span>ظرفیت هدف: {formatSolarCapacity(project.targetCapacityKw)}</span>
          </span>
        ) : null}

        {project.estimatedBudgetIRR ? (
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">﷼</span>
            <span>برآورد: {formatCurrencyIRR(project.estimatedBudgetIRR)}</span>
          </span>
        ) : null}
      </div>

      {/* Next Action Snippet (No fabricated percentages) */}
      <div className="mt-1 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">اقدام بعدی:</span>
          <span className="truncate max-w-[280px] sm:max-w-[420px]">{nextAction.title}</span>
        </div>
        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
          {nextAction.actionText}
        </span>
      </div>
    </Link>
  );
};
