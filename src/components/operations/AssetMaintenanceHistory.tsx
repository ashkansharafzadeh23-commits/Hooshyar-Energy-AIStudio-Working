import React from 'react';
import { 
  History, 
  CheckCircle2, 
  Wrench, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  User, 
  DollarSign,
  FileText
} from 'lucide-react';
import { formatCurrencyIRR, formatPersianNumber, toPersianDigits } from '../../utils/formatters';
import { formatPersianDateTime } from './DataFreshnessIndicator';

export interface MaintenanceHistoryRecord {
  id: string;
  type?: 'ALERT' | 'MAINTENANCE_CASE' | 'ACTION' | 'VERIFICATION' | string;
  title: string;
  description?: string;
  timestamp: string;
  status?: string;
  technicianName?: string;
  cost?: number | null;
  resolution?: string;
  metadata?: Record<string, any>;
}

export interface AssetMaintenanceHistoryProps {
  historyItems: MaintenanceHistoryRecord[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const AssetMaintenanceHistory: React.FC<AssetMaintenanceHistoryProps> = ({
  historyItems,
  loading = false,
  onRefresh,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
          <History className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          سابقه نگهداری ثبت‌شده‌ای برای این دارایی وجود ندارد.
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
          کلیه رویدادهای تعمیراتی گذشته، اقدامات دوره‌ای ثبت‌شده و راستی‌آزمایی‌های فنی در این سابقه تاریخی بایگانی و نمایش داده می‌شوند.
        </p>
      </div>
    );
  }

  // Sort chronological descending
  const sorted = [...historyItems].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" />
            <span>سوابق عملیات نگهداری و تعمیرات ثبت‌شده</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            گزارش تاریخی وقایع، دستورکارها، راستی‌آزمایی‌ها و هزینه‌ها • {toPersianDigits(sorted.length)} رکورد ثبت‌شده
          </p>
        </div>
      </div>

      <div className="relative border-r-2 border-slate-100 dark:border-slate-800 mr-3 pr-5 space-y-6">
        {sorted.map((item) => {
          const hasCost = typeof item.cost === 'number' && !isNaN(item.cost);

          return (
            <div key={item.id} className="relative group">
              {/* Dot */}
              <div className="absolute -right-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500 group-hover:bg-amber-500 transition-colors" />

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.title}
                    </h4>
                    {item.status && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.status}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatPersianDateTime(item.timestamp)}</span>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Factual meta */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>تکنسین: </span>
                    <strong className="text-slate-800 dark:text-slate-200 font-medium">
                      {item.technicianName || 'تکنسین تخصیص داده نشده است'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 dark:text-slate-500">نتیجه اقدام: </span>
                    <strong className="text-slate-800 dark:text-slate-200 font-medium">
                      {item.resolution || 'نتیجه تعمیر ثبت نشده است'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 dark:text-slate-500">هزینه نهایی: </span>
                    <strong className="text-slate-800 dark:text-slate-200 font-medium">
                      {hasCost ? formatCurrencyIRR(item.cost) : 'هزینه ثبت نشده است'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
