import React from 'react';
import { History, FileText, CheckCircle, Clock, Zap, ArrowLeft } from 'lucide-react';
import { DashboardActivityItem } from './types';
import { formatJalaliDate } from '../../utils/formatters';

interface RecentActivityProps {
  activities: DashboardActivityItem[];
  className?: string;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  className = ''
}) => {
  const hasActivities = activities && activities.length > 0;

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby="recent-activity-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <History size={18} strokeWidth={2.2} />
          </div>
          <h2 id="recent-activity-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            فعالیت‌های اخیر
          </h2>
        </div>

        {hasActivities && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            گزارش رویدادهای مستند شده
          </span>
        )}
      </div>

      {!hasActivities ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 text-center shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Clock size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            هنوز فعالیتی ثبت نشده است.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            با شروع اقدامات فنی، صدور اسناد استعلام یا ثبت قراردادها، سوابق رویدادها در اینجا مستند خواهند شد.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {activities.slice(0, 6).map((activity) => {
            return (
              <div
                key={activity.id}
                className="p-4 sm:p-4.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap size={15} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {activity.title}
                      </h3>
                      {activity.projectName && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.2 rounded">
                          {activity.projectName}
                        </span>
                      )}
                    </div>
                    {activity.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activity.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-medium pt-0.5">
                  {formatJalaliDate(activity.timestamp, true)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
