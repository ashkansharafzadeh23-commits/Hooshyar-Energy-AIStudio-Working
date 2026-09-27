import React from 'react';
import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { getNextRecommendedAction, NextActionInfo } from './lifecycleMapping';

interface NextActionCardProps {
  project: EnergyProject;
  onNavigateAction?: (targetTab: string, targetCapability?: string) => void;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({
  project,
  onNavigateAction,
}) => {
  const action: NextActionInfo = getNextRecommendedAction(project);

  const getCategoryBadge = (category: NextActionInfo['category']) => {
    switch (category) {
      case 'SETUP':
        return { label: 'طراحی و اطلاعات پایه', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'RFQ':
        return { label: 'استعلام و مناقصه', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'CONTRACT':
        return { label: 'قرارداد و تأمین مالی', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'CONSTRUCTION':
        return { label: 'عملیات احداث و تجهیزات', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'COMMISSIONING':
        return { label: 'راه‌اندازی و اتصال شبکه', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'OPERATION':
        return { label: 'بهره‌برداری و پایش', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: 'عمومی پروژه', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const badge = getCategoryBadge(action.category);

  return (
    <div className="bg-gradient-to-l from-blue-900 via-slate-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 relative overflow-hidden">
      {/* Decorative subtle background elements */}
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              اقدام پیشنهادی بعدی
            </span>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg}`}>
              {badge.label}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {action.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {action.description}
          </p>
        </div>

        {/* Action Button */}
        {action.targetTab && onNavigateAction && (
          <div className="shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              onClick={() => onNavigateAction(action.targetTab || 'overview', action.targetCapability)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer min-h-[44px]"
            >
              <span>{action.actionText}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
