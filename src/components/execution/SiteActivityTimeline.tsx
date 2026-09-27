import React from 'react';
import { Activity, Clock, CheckCircle2, FileText, Settings, ShieldCheck, User } from 'lucide-react';

export interface ActivityEvent {
  id: string;
  eventType: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  timestamp?: string;
  createdAt?: string;
  metadata?: any;
}

interface SiteActivityTimelineProps {
  activities: ActivityEvent[];
  loading?: boolean;
  className?: string;
}

export const SiteActivityTimeline: React.FC<SiteActivityTimelineProps> = ({
  activities,
  loading = false,
  className = ''
}) => {
  const getEventMeta = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGED':
        return { label: 'تغییر وضعیت مرحله پروژه', icon: Settings, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50' };
      case 'COMMISSIONING_CREATED':
      case 'COMMISSIONING_APPROVED':
        return { label: 'رویداد راه‌اندازی و تست', icon: ShieldCheck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50' };
      case 'COMMISSIONING_TEST_SUBMITTED':
      case 'COMMISSIONING_TEST_APPROVED':
        return { label: 'ثبت نتیجه آزمون الکتریکی', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' };
      case 'HANDOVER_APPROVED':
      case 'HANDOVER_CHECKLIST_VERIFIED':
        return { label: 'تحویل قطعی و صورت‌جلسه', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50' };
      case 'ASSET_GENERATED':
        return { label: 'صدور شناسنامه دارایی انرژی', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' };
      case 'CONTRACT_SIGNED':
      case 'CONTRACT_UPDATED':
        return { label: 'امضا و تبادل قرارداد', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50' };
      case 'DELIVERY_INSPECTED':
        return { label: 'بازرسی محموله تجهیزات در سایت', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' };
      default:
        return { label: type || 'رویداد اجرایی', icon: Activity, color: 'text-slate-600 bg-slate-100 dark:bg-zinc-800' };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('fa-IR')} - ${d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>گزارش رویدادهای کارگاهی و وقایع ثبت‌شده</span>
        </h4>
        <span className="text-xs text-slate-400 dark:text-zinc-500">
          ثبت سیستمی
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری رویدادها...
        </div>
      ) : activities.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <Clock className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
            هیچ رویداد اجرایی ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="relative border-r-2 border-slate-100 dark:border-zinc-800 mr-2 space-y-4 pr-4">
          {activities.map((item) => {
            const meta = getEventMeta(item.eventType);
            const Icon = meta.icon;
            const desc = item.metadata?.description || item.metadata?.notes;

            return (
              <div key={item.id} className="relative">
                {/* Dot */}
                <div className={`absolute -right-[23px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 ${meta.color} flex items-center justify-center`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {meta.label}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-500 font-mono">
                      {formatDate(item.timestamp || item.createdAt)}
                    </span>
                  </div>

                  {desc && (
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed bg-slate-50/80 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                      {desc}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500">
                    {item.actorUserId && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>ثبت‌کننده: {item.actorUserId}</span>
                      </span>
                    )}
                    {item.entityType && (
                      <span>مرجع: {item.entityType}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
