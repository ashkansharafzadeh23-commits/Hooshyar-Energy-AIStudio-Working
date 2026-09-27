import React from 'react';
import { Clock, ShieldCheck, CheckCircle2, Zap, FileText } from 'lucide-react';

export interface AssetHistoryEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  description?: string;
  actor?: string;
}

interface AssetHistoryTimelineProps {
  events: AssetHistoryEvent[];
  loading?: boolean;
  className?: string;
}

export const AssetHistoryTimeline: React.FC<AssetHistoryTimelineProps> = ({
  events,
  loading = false,
  className = ''
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('fa-IR')} (${d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })})`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>تاریخچه چرخه عمر دارایی (Asset Lifecycle Timeline)</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          رویدادهای ثبت‌شده دارایی از آغاز احداث تا بهره‌برداری
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری تاریخچه دارایی...
        </div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <Clock className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            رویدادی در چرخه عمر دارایی ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="relative border-r-2 border-slate-100 dark:border-zinc-800 mr-2 space-y-4 pr-4">
          {events.map((event) => (
            <div key={event.id} className="relative">
              <div className="absolute -right-[23px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 bg-blue-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              <div className="space-y-0.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-slate-900 dark:text-zinc-100">
                    {event.title}
                  </span>
                  <span className="text-slate-400 dark:text-zinc-500 font-mono text-[11px]">
                    {formatDate(event.date)}
                  </span>
                </div>

                {event.description && (
                  <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
