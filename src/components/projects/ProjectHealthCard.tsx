import React from 'react';
import { Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { getProjectHealthSummary, HealthIndicator } from './lifecycleMapping';

interface ProjectHealthCardProps {
  project: EnergyProject;
}

export const ProjectHealthCard: React.FC<ProjectHealthCardProps> = ({ project }) => {
  const indicators: HealthIndicator[] = getProjectHealthSummary(project);

  const renderBadgeIcon = (type?: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'warning':
        return <Clock className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'info':
        return <Activity className="w-4 h-4 text-blue-600 shrink-0" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">وضعیت سلامت و شاخص‌های پروژه</h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">حداکثر ۴ شاخص ارزیابی‌شده</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {indicators.map((ind, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">{ind.label}</span>
              {renderBadgeIcon(ind.badgeType)}
            </div>

            <div>
              <div className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {ind.value}
              </div>
              {ind.subtext && (
                <div className="text-[11px] text-slate-500 mt-1 font-medium">
                  {ind.subtext}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
