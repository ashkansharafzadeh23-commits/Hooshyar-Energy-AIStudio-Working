import React from 'react';
import { CommissioningTest } from '../../types/asset';
import { CheckCircle2, XCircle, Clock, AlertCircle, ShieldCheck, User } from 'lucide-react';

interface CommissioningTestResultProps {
  test: CommissioningTest;
  className?: string;
}

export const CommissioningTestResult: React.FC<CommissioningTestResultProps> = ({
  test,
  className = ''
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
        return {
          label: 'قبول (Passed)',
          icon: CheckCircle2,
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'FAILED':
        return {
          label: 'مردود شده (Failed)',
          icon: XCircle,
          className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'REQUIRES_RETEST':
        return {
          label: 'نیاز به تکرار آزمون',
          icon: AlertCircle,
          className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'NOT_STARTED':
      default:
        return {
          label: 'انجام نشده',
          icon: Clock,
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
        };
    }
  };

  const getTestLabel = (type: string) => {
    switch (type) {
      case 'INSULATION_RESISTANCE':
        return 'مقاومت عایق‌بندی کابل‌ها (Insulation Resistance)';
      case 'GROUNDING_RESISTANCE':
        return 'مقاومت سیستم اتصال به زمین و چاه ارت (Grounding Resistance)';
      case 'STRING_VOLTAGE':
        return 'ولتاژ مدار باز استرینگ‌ها (Voc Measurement)';
      case 'STRING_CURRENT':
        return 'جریان اتصال کوتاه استرینگ‌ها (Isc Measurement)';
      case 'INVERTER_STARTUP':
        return 'تست راه‌اندازی و پارامترهای اینورتر (Inverter Startup)';
      case 'PROTECTION_RELAY':
        return 'آزمون رله‌های حفاظتی و قطع اضطراری (Protection Relay)';
      case 'GRID_SYNCHRONIZATION':
        return 'همگام‌سازی و تزریق توان به شبکه (Grid Synchronization)';
      case 'METER_VALIDATION':
        return 'کالیبراسیون و قرائت کنتور برق (Meter Validation)';
      case 'VISUAL_INSPECTION':
        return 'بازرسی چشمی اتصالات و استراکچر (Visual Inspection)';
      default:
        return type || 'آزمون راه‌اندازی';
    }
  };

  const badge = getStatusBadge(test.status);
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
    <div className={`p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between gap-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h5 className="text-xs font-bold text-slate-900 dark:text-zinc-100 mb-0.5">
            {getTestLabel(test.testType)}
          </h5>
          {test.expectedRange && (
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
              محدوده مجاز استاندارد: {test.expectedRange} {test.unit || ''}
            </span>
          )}
        </div>

        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 self-start sm:self-auto shrink-0 ${badge.className}`}>
          <StatusIcon className="w-3 h-3" />
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Measurement value & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50/60 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-0.5">مقدار اندازه‌گیری شده:</span>
          {test.measuredValue !== undefined && test.measuredValue !== null && test.measuredValue !== '' ? (
            <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
              {test.measuredValue} {test.unit || ''}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-zinc-500 italic">
              نتیجه آزمون ثبت نشده است.
            </span>
          )}
        </div>

        <div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-0.5">یادداشت / نتیجه فنی:</span>
          <span className="text-[11px] text-slate-700 dark:text-zinc-300 line-clamp-1">
            {test.notes || 'توضیحی ثبت نشده است.'}
          </span>
        </div>
      </div>

      {/* Provenance */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-zinc-500 pt-1">
        <div className="flex items-center gap-2">
          {test.performedBy ? (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>مجری آزمون: {test.performedBy}</span>
            </span>
          ) : (
            <span>مجری: مشخص نشده</span>
          )}
        </div>

        <span>
          تاریخ آزمون: {formatDate(test.performedAt)}
        </span>
      </div>
    </div>
  );
};
