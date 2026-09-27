import React from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export interface NextActionData {
  title: string;
  description: string;
  actionText?: string;
  targetTab?: string;
  badgeText: string;
  badgeVariant?: 'primary' | 'warning' | 'success' | 'info';
}

interface ExecutionNextActionProps {
  projectStatus: string;
  contractStatus?: string;
  hasPendingMilestones?: boolean;
  nextMilestoneTitle?: string;
  hasPendingDeliveries?: boolean;
  hasCommissioningRecord?: boolean;
  commissioningCanApprove?: boolean;
  commissioningApproved?: boolean;
  handoverCanApprove?: boolean;
  handoverApproved?: boolean;
  hasOperationalAsset?: boolean;
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export const ExecutionNextAction: React.FC<ExecutionNextActionProps> = ({
  projectStatus,
  contractStatus,
  hasPendingMilestones,
  nextMilestoneTitle,
  hasPendingDeliveries,
  hasCommissioningRecord,
  commissioningCanApprove,
  commissioningApproved,
  handoverCanApprove,
  handoverApproved,
  hasOperationalAsset,
  onNavigateTab,
  className = ''
}) => {
  // Deterministic next action computation based strictly on state
  const computeNextAction = (): NextActionData => {
    if (hasOperationalAsset) {
      return {
        title: 'نیروگاه در وضعیت بهره‌برداری تجاری',
        description: 'پروژه با موفقیت راه‌اندازی شده و دارای شناسنامه دیجیتال فعال است. اقدامات مربوط به بهره‌برداری و پایش قابل مشاهده است.',
        actionText: 'مشاهده شناسنامه دارایی (Asset Passport)',
        targetTab: 'asset',
        badgeText: 'عملیاتی',
        badgeVariant: 'success'
      };
    }

    if (handoverApproved && !hasOperationalAsset) {
      return {
        title: 'آماده ثبت دارایی عملیاتی (Energy Asset)',
        description: 'فرآیند راه‌اندازی و تحویل قطعی با موفقیت تأیید شده است. اکنون می‌توانید شناسنامه دارایی عملیاتی را ایجاد کنید.',
        actionText: 'ایجاد دارایی عملیاتی',
        targetTab: 'asset',
        badgeText: 'انتقال به بهره‌برداری',
        badgeVariant: 'primary'
      };
    }

    if (handoverCanApprove && !handoverApproved) {
      return {
        title: 'بررسی و تأیید صورت‌جلسه تحویل نهایی (Handover)',
        description: 'تمام الزامات چک‌لیست تحویل، آموزش و اسناد تکمیل شده است. تأیید نهایی تحویل پروژه را ثبت نمایید.',
        actionText: 'مشاهده و تأیید تحویل',
        targetTab: 'commissioning',
        badgeText: 'اقدام فوری کارفرما',
        badgeVariant: 'warning'
      };
    }

    if (commissioningApproved && !handoverCanApprove) {
      return {
        title: 'تکمیل الزامات تحویل پروژه',
        description: 'راه‌اندازی فنی تأیید شده است. برای تکمیل تحویل، مدارک چون‌ساخت، آموزش و ضمانت‌نامه‌ها را بررسی و ثبت کنید.',
        actionText: 'تکمیل چک‌لیست تحویل',
        targetTab: 'commissioning',
        badgeText: 'فرآیند تحویل',
        badgeVariant: 'info'
      };
    }

    if (commissioningCanApprove && !commissioningApproved) {
      return {
        title: 'تأیید نهایی نتایج راه‌اندازی (Commissioning)',
        description: 'کلیه آزمون‌های اجباری راه‌اندازی با موفقیت انجام شده و پانچ‌لیست بحرانی حل شده است. تأیید پرونده راه‌اندازی را ثبت کنید.',
        actionText: 'تأیید راه‌اندازی',
        targetTab: 'commissioning',
        badgeText: 'تأیید فنی',
        badgeVariant: 'primary'
      };
    }

    if (projectStatus === 'COMMISSIONING' || hasCommissioningRecord) {
      return {
        title: 'ثبت و ارزیابی آزمون‌های راه‌اندازی',
        description: 'پرونده راه‌اندازی ایجاد شده است. نتایج آزمون‌های الکتریکی، عایق‌بندی و تست اینورتر را ثبت یا بررسی کنید.',
        actionText: 'بررسی آزمون‌های راه‌اندازی',
        targetTab: 'commissioning',
        badgeText: 'آزمون‌های فنی',
        badgeVariant: 'info'
      };
    }

    if (hasPendingDeliveries) {
      return {
        title: 'تکمیل تحویل و بازرسی تجهیزات',
        description: 'برخی سفارش‌های تجهیزات در انتظار ارسال یا بازرسی کیفی در سایت هستند.',
        actionText: 'بررسی وضعیت تحویل تجهیزات',
        targetTab: 'milestones',
        badgeText: 'زنجیره تأمین',
        badgeVariant: 'warning'
      };
    }

    if (hasPendingMilestones) {
      return {
        title: nextMilestoneTitle ? `پیگیری نقطه عطف: ${nextMilestoneTitle}` : 'ثبت نتیجه نقطه عطف بعدی پروژه',
        description: 'عملیات اجرایی در حال پیشرفت است. مستندات پیشرفت و درخواست‌های تأیید نقاط عطف را ثبت نمایید.',
        actionText: 'مشاهده نقاط عطف اجرایی',
        targetTab: 'milestones',
        badgeText: 'عملیات اجرایی',
        badgeVariant: 'info'
      };
    }

    if (contractStatus !== 'ACTIVE') {
      return {
        title: 'نهایی‌سازی و نفوذ قرارداد EPC',
        description: 'قبل از آغاز رسمی عملیات اجرایی، قرارداد بین کارفرما و پیمانکار باید امضا و نافذ گردد.',
        actionText: 'مشاهده بخش قرارداد',
        targetTab: 'contract',
        badgeText: 'قرارداد',
        badgeVariant: 'warning'
      };
    }

    return {
      title: 'آماده‌سازی برنامه اجرایی و نقاط عطف',
      description: 'قرارداد نافذ است. خط مبنا و نقاط عطف اجرایی پروژه را در سیستم ثبت و کنترل نمایید.',
      actionText: 'تنظیم نقاط عطف',
      targetTab: 'milestones',
      badgeText: 'برنامه‌ریزی',
      badgeVariant: 'info'
    };
  };

  const action = computeNextAction();

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
      action.badgeVariant === 'warning'
        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
        : action.badgeVariant === 'success'
        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
        : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              action.badgeVariant === 'warning'
                ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                : action.badgeVariant === 'success'
                ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-200'
            }`}>
              {action.badgeText}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              اقدام بعدی پیشنهادی سیستم
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            {action.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            {action.description}
          </p>
        </div>

        {action.actionText && onNavigateTab && (
          <button
            onClick={() => action.targetTab && onNavigateTab(action.targetTab)}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 min-h-[44px]"
          >
            <span>{action.actionText}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
