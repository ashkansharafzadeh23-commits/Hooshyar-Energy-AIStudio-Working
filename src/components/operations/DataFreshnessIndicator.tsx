import React from 'react';
import { Clock, HelpCircle, CheckCircle2, AlertTriangle, WifiOff, TestTube2, AlertCircle } from 'lucide-react';
import { toPersianDigits } from '../../utils/formatters';

export type FreshnessClassification = 
  | 'LIVE' 
  | 'DELAYED' 
  | 'STALE' 
  | 'SYNTHETIC' 
  | 'CONFIGURED_NOT_VERIFIED'
  | 'NO_SOURCES_CONFIGURED'
  | 'UNKNOWN'
  | 'NO_DATA';

export interface DataFreshnessIndicatorProps {
  lastReadingTimestamp?: string | null;
  statusClassification?: 'CONNECTED' | 'STALE' | 'DEGRADED' | 'CONFIGURED_NOT_VERIFIED' | 'NO_SOURCES_CONFIGURED' | 'SYNTHETIC_TEST_DATA' | string | null;
  staleThresholdHours?: number | null;
  isSynthetic?: boolean;
  className?: string;
}

export function formatPersianDateTime(isoString?: string | null): string {
  if (!isoString) return 'زمان دریافت داده ثبت نشده است';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    // Use Intl for Persian Jalali calendar
    const formatter = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  } catch {
    return toPersianDigits(isoString);
  }
}

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  lastReadingTimestamp,
  statusClassification,
  staleThresholdHours,
  isSynthetic = false,
  className = '',
}) => {
  // Authoritative classification strictly from backend domain state
  let classification: FreshnessClassification = 'NO_DATA';
  let badgeLabel = 'داده تله‌متری ثبت نشده است';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  let Icon = HelpCircle;

  if (isSynthetic || statusClassification === 'SYNTHETIC_TEST_DATA') {
    classification = 'SYNTHETIC';
    badgeLabel = 'داده تستی شبیه‌سازی‌شده';
    badgeColor = 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    Icon = TestTube2;
  } else if (statusClassification === 'NO_SOURCES_CONFIGURED') {
    classification = 'NO_SOURCES_CONFIGURED';
    badgeLabel = 'پایش برخط هنوز فعال نشده است';
    badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    Icon = HelpCircle;
  } else if (statusClassification === 'CONFIGURED_NOT_VERIFIED') {
    classification = 'CONFIGURED_NOT_VERIFIED';
    badgeLabel = 'منبع پایش در انتظار تأیید اتصال';
    badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    Icon = AlertCircle;
  } else if (statusClassification === 'STALE') {
    classification = 'STALE';
    badgeLabel = 'داده متوقف / فاقد تله‌متری';
    badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    Icon = WifiOff;
  } else if (statusClassification === 'DEGRADED') {
    classification = 'DELAYED';
    badgeLabel = 'تأخیر در دریافت داده';
    badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    Icon = AlertTriangle;
  } else if (statusClassification === 'CONNECTED') {
    classification = 'LIVE';
    badgeLabel = 'داده زنده و همگام';
    badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    Icon = CheckCircle2;
  } else if (!lastReadingTimestamp) {
    classification = 'NO_DATA';
    badgeLabel = 'داده تله‌متری ثبت نشده است';
    badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    Icon = HelpCircle;
  } else {
    // Timestamp exists but NO authoritative backend classification was provided
    // Data-Truth Principle: NEVER infer online/live/delayed/stale from timestamp alone
    classification = 'UNKNOWN';
    badgeLabel = 'تازگی داده قابل ارزیابی نیست';
    badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    Icon = HelpCircle;
  }

  if (!lastReadingTimestamp) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeColor}`}>
          <Icon className="w-3 h-3" />
          <span>{badgeLabel}</span>
        </span>
        <span className="text-slate-400 dark:text-slate-500">
          (زمان دریافت داده ثبت نشده است)
        </span>
      </div>
    );
  }

  const formattedDate = formatPersianDateTime(lastReadingTimestamp);

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          آخرین داده دریافت شده: <strong className="font-semibold text-slate-800 dark:text-slate-100">{formattedDate}</strong>
        </span>
      </div>

      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeColor}`}>
        <Icon className="w-3 h-3" />
        <span>{badgeLabel}</span>
      </span>

      {classification === 'STALE' && staleThresholdHours && (
        <span className="text-[10px] text-slate-400">
          (آستانه عدم دریافت داده: {toPersianDigits(staleThresholdHours)} ساعت)
        </span>
      )}
    </div>
  );
};
