import React from 'react';
import { Search, AlertCircle, ShieldAlert, Sparkles, FolderSearch } from 'lucide-react';

interface InvestmentEmptyStateProps {
  type: 'NO_OPPORTUNITIES' | 'NO_MATCHES' | 'NO_PROFILE' | 'ERROR' | 'MISSING_DATA' | 'NOT_AUTHORIZED';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
}

export const InvestmentEmptyState: React.FC<InvestmentEmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  actionHref
}) => {
  const configs = {
    NO_OPPORTUNITIES: {
      icon: Search,
      defaultTitle: 'در حال حاضر فرصت سرمایه‌گذاری فعالی یافت نشد',
      defaultDesc: 'پروژه‌های جدید پس از طی مراحل مطالعات فنی و ثبت رسمی در این سامانه منتشر می‌شوند.',
      iconBg: 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
    },
    NO_MATCHES: {
      icon: Sparkles,
      defaultTitle: 'در حال حاضر فرصت منطبق با معیارهای ثبت‌شده شما یافت نشد',
      defaultDesc: 'با به‌روزرسانی دامنه سرمایه، استان‌های اولویت‌دار یا حداقل توان نیروگاهی، نتایج تطابق را بازآزمایی کنید.',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
    },
    NO_PROFILE: {
      icon: FolderSearch,
      defaultTitle: 'پروفایل اولویت‌های سرمایه‌گذاری تکمیل نشده است',
      defaultDesc: 'برای دریافت تطابق‌های هوشمند و تحلیل آمادگی پروژه‌ها، لطفاً محدوده سرمایه و اولویت‌های جغرافیایی خود را ثبت فرمایید.',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
    },
    ERROR: {
      icon: AlertCircle,
      defaultTitle: 'خطا در بارگذاری اطلاعات سرمایه‌گذاری',
      defaultDesc: 'در برقراری ارتباط با سامانه خطایی رخ داد. لطفاً مجدداً تلاش نمایید.',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
    },
    MISSING_DATA: {
      icon: AlertCircle,
      defaultTitle: 'اطلاعات طرح یا نیازمندی‌های مالی ناقص است',
      defaultDesc: 'برای ارزیابی آمادگی سرمایه‌گذاری، اطلاعات هزینه، توان و مستندات پایه باید تکمیل شوند.',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
    },
    NOT_AUTHORIZED: {
      icon: ShieldAlert,
      defaultTitle: 'عدم دسترسی به اتاق اسناد سرمایه‌گذاری',
      defaultDesc: 'مشاهده جزئیات محرمانه این پروژه مستلزم احراز هویت سرمایه‌گذار و موافقت کارفرما است.',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
    }
  };

  const current = configs[type] || configs.NO_OPPORTUNITIES;
  const Icon = current.icon;

  return (
    <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs my-6">
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

      {actionText && actionHref && !onAction && (
        <a
          href={actionHref}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer min-h-[44px]"
        >
          {actionText}
        </a>
      )}
    </div>
  );
};
