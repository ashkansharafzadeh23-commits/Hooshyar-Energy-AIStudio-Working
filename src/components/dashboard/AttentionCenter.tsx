import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowLeft, Clock, ShieldAlert, FileText } from 'lucide-react';
import { DashboardAttentionItem } from './types';

interface AttentionCenterProps {
  items: DashboardAttentionItem[];
  className?: string;
}

export const AttentionCenter: React.FC<AttentionCenterProps> = ({
  items,
  className = ''
}) => {
  const hasItems = items.length > 0;

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby="attention-center-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle size={18} strokeWidth={2.2} />
          </div>
          <h2 id="attention-center-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            نیازمند توجه شما
          </h2>
        </div>

        {hasItems && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {items.length} مورد فوری
          </span>
        )}
      </div>

      {!hasItems ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 flex items-start sm:items-center gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              در حال حاضر مورد فوری برای شما وجود ندارد.
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              تمام پروژه‌ها و فرآیندهای مرتبط در وضعیت پایدار قرار دارند و اقدام معوقه‌ای ثبت نشده است.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const severityStyles = {
              URGENT: {
                border: 'border-rose-200 dark:border-rose-900/60',
                bg: 'bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30',
                badge: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
                icon: ShieldAlert,
                iconColor: 'text-rose-600 dark:text-rose-400'
              },
              WARNING: {
                border: 'border-amber-200 dark:border-amber-900/60',
                bg: 'bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30',
                badge: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
                icon: AlertTriangle,
                iconColor: 'text-amber-600 dark:text-amber-400'
              },
              INFO: {
                border: 'border-blue-200 dark:border-blue-900/60',
                bg: 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30',
                badge: 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
                icon: FileText,
                iconColor: 'text-blue-600 dark:text-blue-400'
              }
            }[item.severity] || {
              border: 'border-slate-200 dark:border-slate-800',
              bg: 'bg-white dark:bg-slate-900',
              badge: 'bg-slate-100 text-slate-700',
              icon: Clock,
              iconColor: 'text-slate-500'
            };

            const ItemIcon = severityStyles.icon;

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all ${severityStyles.border} ${severityStyles.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0 ${severityStyles.iconColor}`}>
                    <ItemIcon size={18} strokeWidth={2} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h3>
                      {item.badgeText && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${severityStyles.badge}`}>
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-800/60">
                  <Link
                    to={item.actionHref}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs min-h-[44px]"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowLeft size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
