import React from 'react';
import { 
  FolderPlus, 
  AlertCircle, 
  Inbox, 
  Users, 
  Clock, 
  HelpCircle,
  FileQuestion
} from 'lucide-react';

interface FinancingEmptyStateProps {
  type: 'NO_REQUEST' | 'NO_OFFERS' | 'NO_MATCHES' | 'NO_RECORDS' | 'MISSING_DATA' | 'ERROR';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const FinancingEmptyState: React.FC<FinancingEmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction
}) => {
  const configs = {
    NO_REQUEST: {
      icon: FolderPlus,
      defaultTitle: 'هنوز پرونده درخواست تأمین مالی برای این پروژه ثبت نشده است',
      defaultDesc: 'برای اتصال به بانک‌ها، صندوق‌های پژوهش و فناوری و نهادهای مالی همکار، ابتدا مشخصات نیاز مالی پروژه را تدوین و ثبت نمایید.',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
    },
    NO_OFFERS: {
      icon: Inbox,
      defaultTitle: 'هنوز پیشنهاد تأمین مالی برای این درخواست دریافت نشده است',
      defaultDesc: 'پس از ارسال پرونده به نهادهای مالی همکار و بررسی مدارک اعتباری، پیشنهادهای رسمی در این کارتابل ثبت خواهند شد.',
      iconBg: 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
    },
    NO_MATCHES: {
      icon: Users,
      defaultTitle: 'نهاد مالی منطبق با معیارهای فعلی پروژه یافت نشد',
      defaultDesc: 'ممکن است مبلغ درخواستی، استان محل استقرار یا مرحله چرخه عمر پروژه با خط‌مشی جاری نهادهای همکار انطباق نداشته باشد.',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
    },
    NO_RECORDS: {
      icon: Clock,
      defaultTitle: 'پرونده مصوب یا قرارداد نهایی تأمین مالی ثبت نشده است',
      defaultDesc: 'پس از انتخاب پیشنهاد و اعلام موافقت نهایی نهاد مالی، شناسنامه رسمی تأمین مالی صادر می‌گردد.',
      iconBg: 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
    },
    MISSING_DATA: {
      icon: FileQuestion,
      defaultTitle: 'اطلاعات مدل مالی یا برآورد هزینه طرح تکمیل نیست',
      defaultDesc: 'ثبت درخواست تسهیلات مستلزم شفافیت در برآورد هزینه کل (CAPEX) و میزان آورده کارفرما است.',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
    },
    ERROR: {
      icon: AlertCircle,
      defaultTitle: 'خطا در دریافت اطلاعات مالی پروژه',
      defaultDesc: 'ارتباط با پایگاه داده تأمین مالی برقرار نشد. لطفاً وضعیت دسترسی و اتصال شبکه را بررسی فرمایید.',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
    }
  };

  const current = configs[type] || configs.NO_REQUEST;
  const Icon = current.icon;

  return (
    <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs my-4">
      <div className={`w-14 h-14 mx-auto rounded-2xl ${current.iconBg} flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 mb-2">
        {title || current.defaultTitle}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
        {description || current.defaultDesc}
      </p>

      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer min-h-[44px]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
