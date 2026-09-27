import React, { useState, useEffect } from 'react';
import { History, Clock, User, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { ProjectActivity } from '../../types/project';
import { formatJalaliDate } from '../../utils/formatters';

interface ProjectActivityTimelineProps {
  projectId: string;
}

export const ProjectActivityTimeline: React.FC<ProjectActivityTimelineProps> = ({ projectId }) => {
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/activity`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setActivities(data))
      .catch(err => console.error('Failed to load project activity:', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const getEventTitle = (activity: ProjectActivity): string => {
    const type = activity.eventType || activity.type || '';
    switch (type) {
      case 'PROJECT_CREATED':
      case 'PROJECT_CREATED_FROM_ANALYSIS':
        return 'ایجاد پرونده پروژه در سامانه';
      case 'PROJECT_UPDATED':
        return 'به‌روزرسانی مشخصات و اطلاعات فنی پروژه';
      case 'STATUS_CHANGED':
        if (activity.metadata?.newStatus) {
          return `تغییر وضعیت چرخه عمر به: ${activity.metadata.newStatus}`;
        }
        return 'تغییر وضعیت پروژه در چرخه عمر';
      case 'MEMBER_ADDED':
        return 'افزودن عضو جدید به تیم پروژه';
      case 'DOCUMENT_UPLOADED':
        return 'بارگذاری و ثبت سند جدید در مرکز اسناد';
      case 'ANALYSIS_ATTACHED':
        return 'الصاق نتایج شبیه‌سازی و تحلیل انرژی';
      case 'COMMISSIONING_CREATED':
        return 'آغاز فرایند آزمون‌های راه‌اندازی (Commissioning)';
      default:
        return activity.description || 'ثبت رویداد سیستمی در پروژه';
    }
  };

  const getEventBadge = (type?: string) => {
    switch (type) {
      case 'STATUS_CHANGED':
        return { label: 'چرخه عمر', bg: 'bg-blue-100 text-blue-800' };
      case 'PROJECT_CREATED':
      case 'PROJECT_CREATED_FROM_ANALYSIS':
        return { label: 'ایجاد', bg: 'bg-emerald-100 text-emerald-800' };
      case 'DOCUMENT_UPLOADED':
        return { label: 'مرکز اسناد', bg: 'bg-purple-100 text-purple-800' };
      case 'MEMBER_ADDED':
        return { label: 'تیم پروژه', bg: 'bg-amber-100 text-amber-800' };
      default:
        return { label: 'عملیاتی', bg: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">تاریخچه فعالیت‌ها و ممیزی رویدادها</h3>
            <p className="text-xs text-slate-500 mt-0.5">ثبت رسمی تغییرات، تصمیمات و رویدادهای پروژه در طول زمان</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500">
          {activities.length} رویداد ثبت‌شده
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">در حال دریافت تاریخچه رویدادها...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="font-bold text-slate-700 text-sm">
            هنوز رویدادی برای این پروژه ثبت نشده است.
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            با ایجاد اسناد، تغییر وضعیت‌ها و پیگیری مایل‌استون‌ها، تاریخچه فعالیت‌ها به صورت خودکار ثبت خواهد شد.
          </p>
        </div>
      ) : (
        <div className="relative border-r-2 border-slate-200 mr-3 space-y-6">
          {activities.map((act) => {
            const badge = getEventBadge(act.eventType || act.type);

            return (
              <div key={act.id} className="relative pr-6 group">
                {/* Node icon */}
                <div className="absolute -right-[7px] top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        {getEventTitle(act)}
                      </h4>
                    </div>

                    <span className="text-xs text-slate-400 font-medium">
                      {formatJalaliDate(act.createdAt)}
                    </span>
                  </div>

                  {act.metadata && (
                    <div className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-100 font-mono text-left max-h-32 overflow-y-auto no-scrollbar" dir="ltr">
                      {typeof act.metadata === 'string' 
                        ? act.metadata 
                        : JSON.stringify(act.metadata, null, 2)}
                    </div>
                  )}

                  {act.actorUserId && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>شناسه کاربر عامل:</span>
                      <span className="font-mono text-slate-600" dir="ltr">{act.actorUserId}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
