import React from 'react';
import { 
  FolderCheck, 
  AlertTriangle, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Lock 
} from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

export type DataRoomCategoryStatus = 'AVAILABLE' | 'INCOMPLETE' | 'NOT_RECORDED' | 'UNDER_REVIEW';

export interface DataRoomCategoryItem {
  id: string;
  title: string;
  status: DataRoomCategoryStatus;
  documentCount?: number;
  isVerified?: boolean;
  notes?: string;
}

interface InvestmentDataRoomSummaryProps {
  categories?: DataRoomCategoryItem[];
  isConfidential?: boolean;
  onOpenDataRoom?: () => void;
}

export const InvestmentDataRoomSummary: React.FC<InvestmentDataRoomSummaryProps> = ({
  categories,
  isConfidential = false,
  onOpenDataRoom
}) => {
  // Default truthful 8 standard categories
  const standardCategories: DataRoomCategoryItem[] = categories || [
    {
      id: 'project-identity',
      title: 'اطلاعات و شناسنامه پروژه',
      status: 'AVAILABLE',
      documentCount: 1,
      isVerified: true,
      notes: 'ثبت سازمانی و کدهای رهگیری رسمی'
    },
    {
      id: 'technical-simulation',
      title: 'تحلیل فنی و شبیه‌سازی مهندسی',
      status: 'AVAILABLE',
      documentCount: 1,
      isVerified: false,
      notes: 'شبیه‌سازی تابش، دیاگرام آرایه و گزارش تلفات'
    },
    {
      id: 'financial-analysis',
      title: 'تحلیل مالی و مدل اقتصادی',
      status: 'AVAILABLE',
      documentCount: 1,
      isVerified: false,
      notes: 'جریان وجوه نقد، برآورد CAPEX و دوره بازگشت'
    },
    {
      id: 'land-site',
      title: 'زمین و محل پروژه',
      status: 'UNDER_REVIEW',
      documentCount: 1,
      isVerified: false,
      notes: 'سند، استعلام منابع طبیعی و دسترسی ساختگاه'
    },
    {
      id: 'permits-licenses',
      title: 'مجوزها و تاییدیه اتصال به شبکه',
      status: 'INCOMPLETE',
      documentCount: 0,
      isVerified: false,
      notes: 'پروانه احداث ساتبا و موافقت‌نامه اتصال برق'
    },
    {
      id: 'contracts',
      title: 'قراردادها و توافق‌نامه‌ها',
      status: 'UNDER_REVIEW',
      documentCount: 0,
      isVerified: false,
      notes: 'پیش‌نویس قراردادهای تجاری و حقوقی'
    },
    {
      id: 'epc-procurement',
      title: 'پیمانکار و تأمین تجهیزات',
      status: 'NOT_RECORDED',
      documentCount: 0,
      isVerified: false,
      notes: 'اسناد مناقصه، فهرست اقلام BOQ و ضمانت‌نامه‌ها'
    },
    {
      id: 'supplementary-docs',
      title: 'اسناد تکمیلی و مکاتبات',
      status: 'NOT_RECORDED',
      documentCount: 0,
      isVerified: false,
      notes: 'گزارش‌های بازدید میدانی و استعلام‌های دوره‌ای'
    }
  ];

  const statusConfig: Record<DataRoomCategoryStatus, { label: string; bg: string; text: string; icon: any }> = {
    AVAILABLE: {
      label: 'موجود',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: CheckCircle2
    },
    INCOMPLETE: {
      label: 'ناقص',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300',
      icon: AlertTriangle
    },
    UNDER_REVIEW: {
      label: 'در انتظار بررسی',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: Clock
    },
    NOT_RECORDED: {
      label: 'ثبت نشده',
      bg: 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700',
      text: 'text-slate-600 dark:text-zinc-400',
      icon: HelpCircle
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              اتاق اسناد و مدارک فنی-حقوقی (Data Room Summary)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            تفکیک وضعیت ۸ سرفصل اصلی مستندات طرح جهت بررسی پیش از سرمایه‌گذاری
          </p>
        </div>

        {onOpenDataRoom && (
          <button
            type="button"
            onClick={onOpenDataRoom}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>مشاهده جزئیات اسناد</span>
          </button>
        )}
      </div>

      {/* Grid of Data Room Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {standardCategories.map((cat) => {
          const cfg = statusConfig[cat.status];
          const StatusIcon = cfg.icon;

          return (
            <div
              key={cat.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 leading-snug">
                    {cat.title}
                  </h4>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.bg} ${cfg.text} shrink-0`}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    <span>{cfg.label}</span>
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2 leading-relaxed">
                  {cat.notes}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-zinc-400">
                  {cat.documentCount !== undefined ? `${cat.documentCount} سند بارگذاری شده` : 'در انتظار بارگذاری'}
                </span>
                {cat.isVerified ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>تأییدشده</span>
                  </span>
                ) : (
                  <span className="text-slate-400">نیازمند راستی‌آزمایی</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          <strong>اصل داده‌محوری:</strong> صرف وجود یک مدرک در سامانه به منزله تأیید اصالت حقوقی آن نیست (Existence ≠ verification). هرگونه توافق تجاری مستلزم بررسی‌های مستقل طرفین خواهد بود.
        </span>
      </div>
    </div>
  );
};
