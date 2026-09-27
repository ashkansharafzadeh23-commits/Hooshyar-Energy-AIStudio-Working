import React from 'react';
import { ProjectStatus } from '../types/project';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'پیشنویس',
  ANALYSIS: 'تحلیل انرژی',
  FEASIBILITY: 'امکان‌سنجی',
  READY_FOR_RFQ: 'آماده استعلام',
  RFQ_OPEN: 'استعلام باز',
  BIDS_RECEIVED: 'پیشنهادها دریافت شد',
  EPC_SELECTED: 'مجری انتخاب شد',
  CONTRACTING: 'قرارداد',
  FINANCING: 'تأمین مالی',
  PROCUREMENT: 'تأمین تجهیزات',
  CONSTRUCTION: 'در حال اجرا',
  COMMISSIONING: 'راه‌اندازی',
  OPERATIONAL: 'بهره‌برداری',
  MAINTENANCE: 'نگهداری',
  CANCELLED: 'لغو شده'
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  ANALYSIS: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  FEASIBILITY: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  READY_FOR_RFQ: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  RFQ_OPEN: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  BIDS_RECEIVED: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  EPC_SELECTED: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  CONTRACTING: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  FINANCING: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  PROCUREMENT: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  CONSTRUCTION: 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700',
  COMMISSIONING: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  OPERATIONAL: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  MAINTENANCE: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  CANCELLED: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
};

export const ProjectStatusBadge: React.FC<{ status: ProjectStatus; className?: string }> = ({ status, className = '' }) => {
  const label = STATUS_LABELS[status] || status;
  const color = STATUS_COLORS[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
};
