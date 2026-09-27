import React from 'react';
import { UserCheck, HelpCircle } from 'lucide-react';
import { TechnicianMatch } from '../../types/maintenance';
import { TechnicianMatchCard } from './TechnicianMatchCard';

export interface TechnicianMatchListProps {
  matches: TechnicianMatch[];
  loading?: boolean;
  selectedTechnicianId?: string | null;
  onSelectTechnician?: (m: TechnicianMatch) => void;
  onAssignTechnician?: (m: TechnicianMatch) => void;
}

export const TechnicianMatchList: React.FC<TechnicianMatchListProps> = ({
  matches,
  loading = false,
  selectedTechnicianId,
  onSelectTechnician,
  onAssignTechnician,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          تکنسین منطبق یافت نشد
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
          هیچ تکنسینی با معیارهای جغرافیایی یا تخصص‌های مورد نیاز این پرونده در سامانه ثبت نشده یا در دسترس نیست.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-amber-500" />
          <span>تکنسین‌های پیشنهادی بر اساس معیارهای ثبت‌شده</span>
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {matches.length} مورد منطبق
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {matches.map((match) => (
          <TechnicianMatchCard
            key={match.technicianId}
            match={match}
            isSelected={selectedTechnicianId === match.technicianId}
            onSelect={onSelectTechnician}
            onAssign={onAssignTechnician}
          />
        ))}
      </div>
    </div>
  );
};
