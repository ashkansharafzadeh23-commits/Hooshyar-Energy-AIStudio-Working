import React from 'react';
import { CheckCircle2, Clock, CircleDot, AlertCircle, FileText } from 'lucide-react';
import { FinancingRequestStatus } from '../../types/financing';

interface FinancingStatusTimelineProps {
  currentStatus: FinancingRequestStatus | string;
  hasOffers?: boolean;
}

interface TimelineStep {
  id: string;
  keyStatus: FinancingRequestStatus[];
  label: string;
  description: string;
}

export const FinancingStatusTimeline: React.FC<FinancingStatusTimelineProps> = ({
  currentStatus,
  hasOffers = false
}) => {
  const steps: TimelineStep[] = [
    {
      id: 'draft',
      keyStatus: ['DRAFT'],
      label: 'تدوین پیش‌نویس',
      description: 'ثبت مقادیر هزینه و مبلغ درخواستی'
    },
    {
      id: 'ready',
      keyStatus: ['READY'],
      label: 'احراز آمادگی',
      description: 'کنترل ۱۵ معیار ارزیابی اعتباری'
    },
    {
      id: 'submitted',
      keyStatus: ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED'],
      label: 'ارسال و ارزیابی',
      description: 'بررسی مدارک توسط نهاد مالی همکار'
    },
    {
      id: 'offers',
      keyStatus: ['OFFERS_RECEIVED'],
      label: 'دریافت پیشنهادها',
      description: 'صدور شرایط مالی و نرخ‌های پیشنهادی'
    },
    {
      id: 'selected',
      keyStatus: ['OFFER_SELECTED'],
      label: 'انتخاب پیشنهاد',
      description: 'توافق اولیه کارفرما با شرایط اعلامی'
    },
    {
      id: 'approved',
      keyStatus: ['APPROVED_BY_PARTNER'],
      label: 'تصویب و عقد قرارداد',
      description: 'صدور شناسنامه نهایی تأمین مالی پروژه'
    }
  ];

  // Helper to determine step status
  const getStepState = (index: number) => {
    const statusOrder: Record<string, number> = {
      DRAFT: 0,
      READY: 1,
      SUBMITTED: 2,
      UNDER_REVIEW: 2,
      ADDITIONAL_INFO_REQUIRED: 2,
      OFFERS_RECEIVED: 3,
      OFFER_SELECTED: 4,
      APPROVED_BY_PARTNER: 5
    };

    const currentOrder = statusOrder[currentStatus] ?? 0;

    if (currentOrder > index) return 'COMPLETED';
    if (currentOrder === index) return 'CURRENT';
    return 'UPCOMING';
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
            مسیر چرخه عمر پرونده تأمین مالی
          </h4>
        </div>
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
          وضعیت فعلی: {currentStatus}
        </span>
      </div>

      {/* Desktop / Tablet Timeline (horizontal) */}
      <div className="hidden md:grid grid-cols-6 gap-2">
        {steps.map((step, idx) => {
          const state = getStepState(idx);

          return (
            <div key={step.id} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={`absolute top-3.5 right-[50%] w-full h-0.5 -z-0 transition-colors ${
                    state === 'COMPLETED'
                      ? 'bg-emerald-500 dark:bg-emerald-600'
                      : 'bg-slate-200 dark:bg-zinc-700'
                  }`}
                />
              )}

              {/* Indicator Circle */}
              <div
                className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  state === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : state === 'CURRENT'
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950/60 shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 border border-slate-200 dark:border-zinc-700'
                }`}
              >
                {state === 'COMPLETED' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : state === 'CURRENT' ? (
                  <CircleDot className="w-4 h-4 animate-pulse" />
                ) : (
                  <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                )}
              </div>

              <div className="mt-2 space-y-0.5">
                <span
                  className={`block text-xs font-bold ${
                    state === 'CURRENT'
                      ? 'text-blue-600 dark:text-blue-400'
                      : state === 'COMPLETED'
                      ? 'text-slate-800 dark:text-zinc-200'
                      : 'text-slate-400 dark:text-zinc-400'
                  }`}
                >
                  {step.label}
                </span>
                <span className="block text-[10px] text-slate-400 dark:text-zinc-400 leading-snug">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Stacked Timeline */}
      <div className="md:hidden space-y-3">
        {steps.map((step, idx) => {
          const state = getStepState(idx);

          return (
            <div key={step.id} className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  state === 'COMPLETED'
                    ? 'bg-emerald-600 text-white'
                    : state === 'CURRENT'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-100'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 border border-slate-200'
                }`}
              >
                {state === 'COMPLETED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      state === 'CURRENT'
                        ? 'text-blue-600 dark:text-blue-400'
                        : state === 'COMPLETED'
                        ? 'text-slate-800 dark:text-zinc-200'
                        : 'text-slate-400 dark:text-zinc-400'
                    }`}
                  >
                    {step.label}
                  </span>
                  {state === 'CURRENT' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                      گام فعال
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
