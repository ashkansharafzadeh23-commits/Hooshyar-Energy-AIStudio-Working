import React from 'react';

export type LifecycleStatus = 
  | 'DRAFT'
  | 'FEASIBILITY'
  | 'FEASIBILITY_READY'
  | 'RFQ_DRAFT'
  | 'RFQ_PUBLISHED'
  | 'BIDS_RECEIVED'
  | 'CONTRACTOR_SELECTED'
  | 'CONTRACT_SIGNED'
  | 'FINANCING_PENDING'
  | 'FINANCED'
  | 'PROCUREMENT'
  | 'CONSTRUCTION'
  | 'COMMISSIONING'
  | 'OPERATIONAL'
  | 'STALLED'
  | 'CANCELLED'
  | string;

interface StatusBadgeProps {
  status: LifecycleStatus;
  className?: string;
  size?: 'sm' | 'md';
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: {
    label: 'پیش‌نویس اولیه',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700'
  },
  FEASIBILITY: {
    label: 'امکان‌سنجی مهندسی',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  },
  FEASIBILITY_READY: {
    label: 'تایید امکان‌سنجی',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  },
  RFQ_DRAFT: {
    label: 'پیش‌نویس استعلام EPC',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  RFQ_PUBLISHED: {
    label: 'مناقصه فعال',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700'
  },
  BIDS_RECEIVED: {
    label: 'در حال ارزیابی پیشنهادات',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-900 dark:text-amber-200',
    border: 'border-amber-300 dark:border-amber-700'
  },
  CONTRACTOR_SELECTED: {
    label: 'پیمانکار تعیین شد',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800'
  },
  CONTRACT_SIGNED: {
    label: 'قرارداد مبادله شد',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800'
  },
  FINANCING_PENDING: {
    label: 'در انتظار تأمین مالی',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800'
  },
  FINANCED: {
    label: 'تأمین مالی مصوب',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  PROCUREMENT: {
    label: 'تأمین تجهیزات',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  CONSTRUCTION: {
    label: 'در حال احداث نیروگاه',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  COMMISSIONING: {
    label: 'تست و راه‌اندازی',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800'
  },
  OPERATIONAL: {
    label: 'متصل به شبکه (عملیاتی)',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700'
  },
  STALLED: {
    label: 'نیازمند پیگیری / راکد',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-700'
  },
  CANCELLED: {
    label: 'لغوشده',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  className = '',
  size = 'sm' 
}) => {
  const norm = (status || '').toUpperCase().trim();
  const config = STATUS_MAP[norm] || {
    label: status || 'نامشخص',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700'
  };

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2.5 py-0.5' 
    : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1 ml-1.5 bg-current opacity-75" />
      {config.label}
    </span>
  );
};
