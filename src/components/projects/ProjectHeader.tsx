import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  Zap, 
  Clock, 
  FileText, 
  RotateCw, 
  Building 
} from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { formatSolarCapacity, formatJalaliDate } from '../../utils/formatters';
import { ProjectStatusBadge } from '../ProjectStatusBadge';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { AppContextBreadcrumb, BreadcrumbItem } from '../integration';

interface ProjectHeaderProps {
  project: EnergyProject;
  onRefresh?: () => void;
  refreshing?: boolean;
  activeTabLabel?: string;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onRefresh,
  refreshing = false,
  activeTabLabel,
}) => {
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'پروژه‌ها', to: '/projects' },
    { 
      label: project.title || 'پروژه بدون عنوان', 
      to: activeTabLabel ? `/projects/${project.id}` : undefined,
      active: !activeTabLabel 
    }
  ];

  if (activeTabLabel) {
    breadcrumbItems.push({
      label: activeTabLabel,
      active: true
    });
  }

  return (
    <div className="bg-white border-b border-slate-200 py-4 sm:py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3 sm:space-y-4">
        {/* Navigation Breadcrumb / Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <AppContextBreadcrumb items={breadcrumbItems} />

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title="به‌روزرسانی اطلاعات پروژه"
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            <Link
              to={`/projects/${project.id}/proposal`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors min-h-[40px]"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>خلاصه و پروپوزال</span>
            </Link>
          </div>
        </div>

        {/* Project Title, Code & Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {project.title}
              </h1>
              {project.projectCode && (
                <span
                  dir="ltr"
                  className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200"
                >
                  {project.projectCode}
                </span>
              )}
            </div>

            {/* Quick Meta chips */}
            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500">
              {/* Location */}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {project.location?.province && project.location?.city
                    ? `${project.location.province}، ${project.location.city}`
                    : project.location?.province || project.location?.city || 'محل مشخص نشده'}
                </span>
              </span>

              {/* Capacity */}
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {project.targetCapacityKw ? formatSolarCapacity(project.targetCapacityKw) : 'ظرفیت نامشخص'}
                </span>
              </span>

              {/* Last update */}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>آخرین ویرایش: {formatJalaliDate(project.updatedAt || project.createdAt)}</span>
              </span>
            </div>
          </div>

          {/* Status & Verification Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <ProjectStatusBadge status={project.status} className="text-sm px-3 py-1 font-bold" />
          </div>
        </div>
      </div>
    </div>
  );
};
