import React from 'react';
import { Wrench, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export interface MaintenanceLog {
  id: string;
  assetId: string;
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | string;
  description: string;
  performedDate?: string;
  performedBy?: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | string;
  cost?: number;
  notes?: string;
}

interface AssetMaintenanceHistoryProps {
  logs: MaintenanceLog[];
  loading?: boolean;
  className?: string;
}

export const AssetMaintenanceHistory: React.FC<AssetMaintenanceHistoryProps> = ({
  logs,
  loading = false,
  className = ''
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PREVENTIVE':
        return 'نگهداری پیشگیرانه (PM)';
      case 'CORRECTIVE':
        return 'تعمیرات اصلاحی (CM)';
      case 'INSPECTION':
        return 'بازرسی دوره‌ای (Inspection)';
      default:
        return type || 'سرویس دوره‌ای';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>سوابق بهره‌برداری و تعمیرات و نگهداری (O&M Logbook)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          گزارش اقدامات سرویس و نگهداری ثبت‌شده
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری سوابق تعمیر و نگهداری...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <Wrench className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            سابقه تعمیر و نگهداری ثبت نشده است.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            با شروع بهره‌برداری تجاری، گزارش‌های سرویس‌های دوره‌ای O&M در این دفترچه ثبت می‌گردد.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                    {getTypeLabel(log.maintenanceType)}
                  </span>
                  <span className="text-slate-400 dark:text-zinc-500">
                    تاریخ: {formatDate(log.performedDate)}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-zinc-200 font-semibold">
                  {log.description}
                </p>
              </div>

              <div className="text-left">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                  مجری: {log.performedBy || 'تیم O&M'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
