import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowLeft, Plus } from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { DashboardProjectCard } from './DashboardProjectCard';

interface ActiveProjectsProps {
  projects: EnergyProject[];
  maxDisplay?: number;
  className?: string;
}

export const ActiveProjects: React.FC<ActiveProjectsProps> = ({
  projects,
  maxDisplay = 5,
  className = ''
}) => {
  if (projects.length === 0) {
    return null;
  }

  const visibleProjects = projects.slice(0, maxDisplay);

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby="active-projects-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Briefcase size={18} strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <h2 id="active-projects-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              پروژه‌های فعال
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {projects.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > maxDisplay && (
            <Link
              to="/projects"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1 min-h-[44px] px-2"
            >
              <span>مشاهده همه پروژه‌ها ({projects.length})</span>
              <ArrowLeft size={14} />
            </Link>
          )}
          <Link
            to="/target-select"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors min-h-[44px]"
          >
            <Plus size={14} />
            <span>پروژه جدید</span>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {visibleProjects.map((project) => (
          <DashboardProjectCard key={project.id} project={project} />
        ))}
      </div>
    </section>
  );
};
