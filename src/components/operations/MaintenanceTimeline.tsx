import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Wrench, 
  UserCheck, 
  ShieldCheck, 
  CheckCheck 
} from 'lucide-react';
import { MaintenanceCase, MaintenanceStatus } from '../../types/maintenance';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface MaintenanceTimelineProps {
  maintenanceCase: MaintenanceCase;
}

export const MaintenanceTimeline: React.FC<MaintenanceTimelineProps> = ({ maintenanceCase }) => {
  const steps: Array<{
    id: string;
    label: string;
    timestamp?: string;
    isCompleted: boolean;
    isCurrent: boolean;
    meta?: string;
  }> = [
    {
      id: 'REPORTED',
      label: 'ثبت پرونده',
      timestamp: maintenanceCase.createdAt || maintenanceCase.reportedAt,
      isCompleted: true,
      isCurrent: maintenanceCase.status === 'OPEN' || (maintenanceCase.status as any) === 'REPORTED',
    },
    {
      id: 'ASSIGNED',
      label: 'تخصیص تکنسین',
      timestamp: (maintenanceCase as any).assignedAt,
      isCompleted: Boolean(maintenanceCase.assignedTechnicianId || (maintenanceCase as any).assignedAt),
      isCurrent: maintenanceCase.status === 'ASSIGNED',
      meta: maintenanceCase.assignedTechnicianName,
    },
    {
      id: 'ACCEPTED',
      label: 'پذیرش تکنسین',
      timestamp: (maintenanceCase as any).acceptedAt,
      isCompleted: Boolean((maintenanceCase as any).acceptedAt),
      isCurrent: (maintenanceCase.status as any) === 'ACCEPTED',
    },
    {
      id: 'SCHEDULED',
      label: 'زمان‌بندی مراجعه',
      timestamp: maintenanceCase.scheduledAt,
      isCompleted: Boolean(maintenanceCase.scheduledAt),
      isCurrent: maintenanceCase.status === 'SCHEDULED',
    },
    {
      id: 'IN_PROGRESS',
      label: 'شروع عملیات تعمیر',
      timestamp: maintenanceCase.startedAt,
      isCompleted: Boolean(maintenanceCase.startedAt),
      isCurrent: maintenanceCase.status === 'IN_PROGRESS',
    },
    {
      id: 'WAITING_PARTS',
      label: 'انتظار قطعه',
      timestamp: undefined,
      isCompleted: false,
      isCurrent: (maintenanceCase.status as any) === 'WAITING_PARTS',
    },
    {
      id: 'COMPLETED',
      label: 'اتمام کار تعمیراتی',
      timestamp: maintenanceCase.completedAt,
      isCompleted: Boolean(maintenanceCase.completedAt),
      isCurrent: maintenanceCase.status === 'COMPLETED' || maintenanceCase.status === 'AWAITING_VERIFICATION' || maintenanceCase.status === 'PENDING_VERIFICATION' || (maintenanceCase.status as any) === 'SUBMITTED_FOR_VERIFICATION',
    },
    {
      id: 'VERIFIED',
      label: 'راستی‌آزمایی کارفرما',
      timestamp: maintenanceCase.verifiedAt,
      isCompleted: Boolean(maintenanceCase.verifiedAt),
      isCurrent: maintenanceCase.status === 'VERIFIED',
    },
    {
      id: 'CLOSED',
      label: 'بستن قطعی پرونده',
      timestamp: maintenanceCase.status === 'CLOSED' ? (maintenanceCase.updatedAt || maintenanceCase.verifiedAt) : undefined,
      isCompleted: maintenanceCase.status === 'CLOSED',
      isCurrent: maintenanceCase.status === 'CLOSED',
    },
  ];

  // Filter out irrelevant steps (like WAITING_PARTS if it didn't occur)
  const activeSteps = steps.filter((s) => {
    if (s.id === 'WAITING_PARTS' && (maintenanceCase.status as any) !== 'WAITING_PARTS') return false;
    return true;
  });

  return (
    <div className="py-2">
      <div className="relative flex flex-col space-y-4">
        {activeSteps.map((step, idx) => {
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                    step.isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : step.isCurrent
                      ? 'bg-amber-500 text-slate-950 border-amber-500 ring-2 ring-amber-400/30 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {step.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : step.isCurrent ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-2.5 h-2.5 fill-current" />
                  )}
                </div>
                {idx < activeSteps.length - 1 && (
                  <div
                    className={`w-0.5 h-6 mt-1 ${
                      step.isCompleted ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </div>

              <div className="pt-0.5 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold ${
                      step.isCurrent
                        ? 'text-amber-600 dark:text-amber-400'
                        : step.isCompleted
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.meta && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      ({step.meta})
                    </span>
                  )}
                </div>

                {step.timestamp ? (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    {formatPersianDateTime(step.timestamp)}
                  </div>
                ) : (
                  step.isCurrent && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400">
                      مرحله جاری در انتظار اقدام
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
