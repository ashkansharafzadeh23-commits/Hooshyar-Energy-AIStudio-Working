import React from 'react';

export type DataProvenanceType = 
  | 'REAL' 
  | 'VERIFIED_SOURCE'
  | 'REFERENCE_ESTIMATE'
  | 'CALCULATED' 
  | 'USER_PROVIDED' 
  | 'CONTRACTOR_SUBMITTED'
  | 'VENDOR_SUBMITTED'
  | 'UNVERIFIED'
  | 'MARKET' 
  | 'AI' 
  | 'MISSING';

interface DataTruthBadgeProps {
  type?: DataProvenanceType;
  provenance?: DataProvenanceType | string;
  customLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<DataProvenanceType, { label: string; bg: string; text: string; border: string }> = {
  REAL: {
    label: 'داده واقعی',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  VERIFIED_SOURCE: {
    label: 'منبع داده تأییدشده',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  REFERENCE_ESTIMATE: {
    label: 'برآورد مرجع',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  CALCULATED: {
    label: 'محاسباتی مهندسی',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  },
  USER_PROVIDED: {
    label: 'اظهار کاربر',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700'
  },
  CONTRACTOR_SUBMITTED: {
    label: 'ثبت‌شده توسط پیمانکار',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800'
  },
  VENDOR_SUBMITTED: {
    label: 'ثبت‌شده توسط فروشنده',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800'
  },
  UNVERIFIED: {
    label: 'تأیید نشده',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  MARKET: {
    label: 'شاخص بازار',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  AI: {
    label: 'تحلیل هوش مصنوعی',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800'
  },
  MISSING: {
    label: 'داده در دسترس نیست',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800'
  }
};

export const DataTruthBadge: React.FC<DataTruthBadgeProps> = ({ 
  type, 
  provenance,
  customLabel,
  className = '',
  size = 'sm' 
}) => {
  const resolvedType = (type || (provenance as DataProvenanceType) || 'USER_PROVIDED') as DataProvenanceType;
  const config = BADGE_CONFIG[resolvedType] || BADGE_CONFIG.USER_PROVIDED;
  const displayText = customLabel || config.label;
  const sizeClasses = size === 'sm' 
    ? 'text-[11px] px-2 py-0.5' 
    : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border whitespace-nowrap ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
      title={`خاستگاه داده: ${displayText}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1 ml-1.5 bg-current opacity-75" />
      {displayText}
    </span>
  );
};
