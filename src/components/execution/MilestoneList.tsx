import React, { useState } from 'react';
import { ProjectMilestone } from '../../types/execution';
import { MilestoneCard } from './MilestoneCard';
import { MilestoneDetail } from './MilestoneDetail';
import { ExecutionEmptyState } from './ExecutionEmptyState';
import { Flag, Plus, Filter, CheckCircle2, Clock } from 'lucide-react';

interface MilestoneListProps {
  milestones: ProjectMilestone[];
  loading?: boolean;
  onUpdateStatus?: (milestoneId: string, status: string, notes?: string) => Promise<void>;
  onSubmitApproval?: (milestoneId: string, notes?: string) => Promise<void>;
  onCreateMilestone?: () => void;
  canEdit?: boolean;
  className?: string;
}

export const MilestoneList: React.FC<MilestoneListProps> = ({
  milestones,
  loading = false,
  onUpdateStatus,
  onSubmitApproval,
  onCreateMilestone,
  canEdit = true,
  className = ''
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredMilestones = milestones.filter((m) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'COMPLETED') return m.status === 'COMPLETED';
    if (filterStatus === 'IN_PROGRESS') return m.status === 'IN_PROGRESS' || m.status === 'SUBMITTED_FOR_REVIEW';
    if (filterStatus === 'PENDING') return m.status === 'NOT_STARTED' || !m.status;
    return true;
  });

  const completedCount = milestones.filter(m => m.status === 'COMPLETED').length;
  const inProgressCount = milestones.filter(m => m.status === 'IN_PROGRESS' || m.status === 'SUBMITTED_FOR_REVIEW').length;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Flag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>نقاط عطف و مراحل اجرایی ({milestones.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            برنامه زمان‌بندی و گام‌های اجرای عملیاتی نیروگاه
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter chips */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                filterStatus === 'ALL'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              همه ({milestones.length})
            </button>
            <button
              onClick={() => setFilterStatus('IN_PROGRESS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                filterStatus === 'IN_PROGRESS'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              در حال اجرا ({inProgressCount})
            </button>
            <button
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                filterStatus === 'COMPLETED'
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
              }`}
            >
              تکمیل شده ({completedCount})
            </button>
          </div>

          {onCreateMilestone && canEdit && (
            <button
              onClick={onCreateMilestone}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>نقطه عطف جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری نقاط عطف...
        </div>
      ) : milestones.length === 0 ? (
        <ExecutionEmptyState
          icon={Flag}
          title="هنوز نقطه عطف اجرایی برای این پروژه ثبت نشده است."
          description="با تأیید خط مبنای اولیه یا ثبت نقاط عطف توسط پیمانکار، مراحل پیشرفت و کنترل پروژه در این بخش قرار می‌گیرد."
          actionText={canEdit && onCreateMilestone ? 'ایجاد نقطه عطف جدید' : undefined}
          onAction={onCreateMilestone}
        />
      ) : filteredMilestones.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
          موردی با فیلتر انتخابی یافت نشد.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMilestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onSelect={(m) => setSelectedMilestone(m)}
            />
          ))}
        </div>
      )}

      {/* Modal Detail */}
      {selectedMilestone && (
        <MilestoneDetail
          milestone={selectedMilestone}
          onClose={() => setSelectedMilestone(null)}
          onUpdateStatus={onUpdateStatus}
          onSubmitApproval={onSubmitApproval}
          canEdit={canEdit}
        />
      )}
    </div>
  );
};
