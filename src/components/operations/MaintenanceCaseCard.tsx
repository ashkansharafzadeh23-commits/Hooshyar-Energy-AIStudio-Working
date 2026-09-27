import React from 'react';
import { 
  Wrench, 
  Clock, 
  User, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { MaintenanceCase, MaintenanceStatus, MaintenancePriority } from '../../types/maintenance';
import { formatPersianNumber, formatCurrencyIRR, toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface MaintenanceCaseCardProps {
  maintenanceCase: MaintenanceCase;
  componentName?: string;
  isSelected?: boolean;
  onSelect?: (c: MaintenanceCase) => void;
  onAssignClick?: (c: MaintenanceCase) => void;
}

export function getMaintenancePriorityConfig(priority: MaintenancePriority | string) {
  switch (priority) {
    case 'CRITICAL':
    case 'URGENT':
      return { label: 'اضطراری / بحرانی', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' };
    case 'HIGH':
      return { label: 'فوری', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
    case 'MEDIUM':
      return { label: 'متوسط', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
    case 'LOW':
    default:
      return { label: 'عادی', className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
  }
}

export function getMaintenanceStatusLabel(status: MaintenanceStatus | string): { label: string; className: string } {
  switch (status) {
    case 'OPEN':
    case 'DRAFT':
      return { label: 'ثبت‌شده (جدید)', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    case 'DIAGNOSING':
      return { label: 'در حال عیب‌یابی', className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' };
    case 'AWAITING_ASSIGNMENT':
      return { label: 'در انتظار تخصیص تکنسین', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
    case 'ASSIGNED':
      return { label: 'تکنسین تخصیص داده شد', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' };
    case 'SCHEDULED':
      return { label: 'برنامه‌ریزی‌شده', className: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' };
    case 'IN_PROGRESS':
      return { label: 'در حال اجرا', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' };
    case 'COMPLETED':
    case 'AWAITING_VERIFICATION':
    case 'PENDING_VERIFICATION':
      return { label: 'تکمیل‌شده (در انتظار تأیید)', className: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' };
    case 'VERIFIED':
    case 'RESOLVED':
      return { label: 'راستی‌آزمایی‌شده', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' };
    case 'CLOSED':
      return { label: 'بسته و بایگانی‌شده', className: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' };
    case 'CANCELLED':
      return { label: 'لغوشده', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' };
    default:
      return { label: String(status), className: 'bg-slate-100 text-slate-700 dark:bg-slate-800' };
  }
}

export function getMaintenanceCategoryLabel(cat: string): string {
  switch (cat) {
    case 'CORRECTIVE':
      return 'تعمیر اضطراری / اصلاحی';
    case 'PREVENTIVE':
      return 'سرویس دوره‌ای / پیشگیرانه';
    case 'PREDICTIVE':
      return 'نگهداری پیش‌بینانه';
    case 'INSPECTION':
      return 'بازرسی فنی';
    case 'EMERGENCY':
      return 'اقدام بحرانی';
    case 'WARRANTY':
      return 'اقدام تحت گارانتی';
    default:
      return cat || 'تعمیرات';
  }
}

export const MaintenanceCaseCard: React.FC<MaintenanceCaseCardProps> = ({
  maintenanceCase,
  componentName,
  isSelected = false,
  onSelect,
  onAssignClick,
}) => {
  const prioConfig = getMaintenancePriorityConfig(maintenanceCase.priority);
  const statusConfig = getMaintenanceStatusLabel(maintenanceCase.status);
  const categoryLabel = getMaintenanceCategoryLabel(maintenanceCase.category);

  const hasCost = typeof maintenanceCase.totalCost === 'number' && !isNaN(maintenanceCase.totalCost);

  return (
    <div
      onClick={() => onSelect && onSelect(maintenanceCase)}
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all text-right cursor-pointer ${
        isSelected
          ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                {maintenanceCase.maintenanceCode || ''}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${prioConfig.className}`}>
                {prioConfig.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {maintenanceCase.title}
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {maintenanceCase.description}
            </p>
          </div>
        </div>

        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
          {categoryLabel}
        </span>
      </div>

      {/* Technician & Scheduling details */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>تکنسین: </span>
          <strong className="font-semibold text-slate-800 dark:text-slate-200">
            {maintenanceCase.assignedTechnicianName || 'تکنسین تخصیص داده نشده است'}
          </strong>
        </div>

        <div>
          <span className="text-slate-400 dark:text-slate-500">هزینه نهایی: </span>
          <strong className="font-medium text-slate-800 dark:text-slate-200">
            {hasCost ? formatCurrencyIRR(maintenanceCase.totalCost) : 'هزینه ثبت نشده است'}
          </strong>
        </div>

        {maintenanceCase.scheduledAt && (
          <div className="flex items-center gap-1.5 sm:col-span-2 text-[11px] text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>زمان‌بندی مراجعه: {formatPersianDateTime(maintenanceCase.scheduledAt)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatPersianDateTime(maintenanceCase.createdAt || maintenanceCase.reportedAt)}</span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {!maintenanceCase.assignedTechnicianId && onAssignClick && (
            <button
              type="button"
              onClick={() => onAssignClick(maintenanceCase)}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>تخصیص تکنسین</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelect && onSelect(maintenanceCase)}
            className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>جزئیات پرونده</span>
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
