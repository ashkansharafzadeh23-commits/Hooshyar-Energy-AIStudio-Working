import React from 'react';
import { ProjectMilestone } from '../../types/execution';
import { CheckCircle2, Clock, AlertCircle, FileText, ChevronLeft, ShieldCheck, User } from 'lucide-react';

interface MilestoneCardProps {
  milestone: ProjectMilestone;
  onSelect?: (milestone: ProjectMilestone) => void;
  className?: string;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  onSelect,
  className = ''
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'تکمیل شده',
          icon: CheckCircle2,
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'SUBMITTED_FOR_REVIEW':
        return {
          label: 'ارائه‌شده جهت بررسی',
          icon: ShieldCheck,
          className: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      case 'IN_PROGRESS':
        return {
          label: 'در حال انجام',
          icon: Clock,
          className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'BLOCKED':
        return {
          label: 'متوقف شده / دارای مانع',
          icon: AlertCircle,
          className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'NOT_STARTED':
      default:
        return {
          label: 'شروع نشده',
          icon: Clock,
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
        };
    }
  };

  const badge = getStatusBadge(milestone.status);
  const StatusIcon = badge.icon;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(milestone)}
      className={`p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm cursor-pointer min-h-[44px] flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
              {milestone.milestoneCode || `#${milestone.sequence || '-'}`}
            </span>
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              {milestone.category || 'عملیات اجرایی'}
            </span>
          </div>

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.className}`}>
            <StatusIcon className="w-3 h-3" />
            <span>{badge.label}</span>
          </span>
        </div>

        <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-1">
          {milestone.title}
        </h4>

        {milestone.description && (
          <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-3">
            {milestone.description}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <span>
            برنامه‌ریزی: {formatDate(milestone.plannedEndDate)}
          </span>
          {milestone.actualEndDate && (
            <span className="text-emerald-600 dark:text-emerald-400">
              تکمیل: {formatDate(milestone.actualEndDate)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {milestone.evidenceRequired && (
            <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
              <FileText className="w-3 h-3" />
              <span>مستند الزامی</span>
            </span>
          )}
          {typeof milestone.completionPercent === 'number' && (
            <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
              {milestone.completionPercent}٪
            </span>
          )}
          <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      </div>
    </div>
  );
};
