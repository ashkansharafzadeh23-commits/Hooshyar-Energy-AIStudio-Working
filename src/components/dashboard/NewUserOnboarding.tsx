import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Plus, ArrowLeft, Briefcase, FileSearch, ShieldCheck, Wrench, Coins, Building } from 'lucide-react';
import { formatRoleLabel } from '../../utils/formatters';

interface NewUserOnboardingProps {
  activeRole: string;
  className?: string;
}

export const NewUserOnboarding: React.FC<NewUserOnboardingProps> = ({
  activeRole,
  className = ''
}) => {
  const role = (activeRole || '').toUpperCase();

  const getRoleOnboardingConfig = () => {
    switch (role) {
      case 'INVESTOR':
        return {
          title: 'به بخش سرمایه‌گذاری هوشیار انرژی خوش آمدید',
          description: 'پروژه‌های ارزیابی‌شده خورشیدی را مشاهده کنید، مدل‌های مالی و نرخ بازدهی را بررسی نمایید و در طرح‌های توسعه مشارکت فرمایید.',
          icon: Coins,
          primaryAction: {
            title: 'مشاهده فرصت‌های سرمایه‌گذاری خورشیدی',
            description: 'بررسی پروژه‌های تأییدشده با جریان نقدینگی و تحلیل فنی رسمی',
            href: '/investment-hub/opportunities',
            actionText: 'مشاهده فرصت‌ها'
          },
          secondaryAction: {
            title: 'تکمیل پروفایل سرمایه‌گذار',
            description: 'تعیین ترجیحات ریسک، بازدهی و سقف اعتباری برای دریافت فرصت‌های منطبق',
            href: '/investment-hub/investor-profile',
            actionText: 'تنظیم پروفایل'
          }
        };

      case 'EPC':
      case 'EPC_CONTRACTOR':
        return {
          title: 'به پنل پیمانکاران احداث (EPC) خوش آمدید',
          description: 'به عنوان پیمانکار تخصصی احداث نیروگاه‌های خورشیدی، استعلام‌های فعال قیمت (RFQ) را بررسی کنید و پیشنهادات فنی-مالی ارسال فرمایید.',
          icon: Briefcase,
          primaryAction: {
            title: 'مشاهده استعلام‌های قیمت (RFQ)',
            description: 'فهرست استعلام‌های منتشر شده توسط کارفرمایان نیروگاه‌های خورشیدی',
            href: '/contractors',
            actionText: 'مشاهده استعلام‌ها'
          },
          secondaryAction: {
            title: 'ارزیابی نیازمندی‌های احداث',
            description: 'بررسی دستورالعمل‌های فنی و استانداردهای مهندسی اتصال به شبکه',
            href: '/checklist',
            actionText: 'چک‌لیست فنی'
          }
        };

      case 'VENDOR':
        return {
          title: 'به پرتال تأمین‌کنندگان تجهیزات خورشیدی خوش آمدید',
          description: 'پنل‌ها، اینورترها، سازه‌ها و اقلام حفاظتی را ثبت و مدیریت کنید و سفارش‌های پروژه‌های احداث را دریافت نمایید.',
          icon: Building,
          primaryAction: {
            title: 'ورود به پرتال تأمین‌کنندگان',
            description: 'مدیریت موجودی تجهیزات، تأییدیه‌های فنی و استعلام‌های خرید',
            href: '/vendor-portal',
            actionText: 'پرتال تأمین‌کننده'
          },
          secondaryAction: {
            title: 'مشاهده محصولات بازارگاه',
            description: 'بررسی زنجیره تأمین و مقایسه فنی پنل‌ها و اینورترها',
            href: '/vendors',
            actionText: 'کاتالوگ بازارگاه'
          }
        };

      case 'TECHNICIAN':
        return {
          title: 'به سامانه پایش و خدمات نگهداری خوش آمدید',
          description: 'شناسنامه دیجیتال دارایی‌های خورشیدی را مشاهده کنید و گزارش‌های دوره‌ای بازرسی و تعمیرات را ثبت فرمایید.',
          icon: Wrench,
          primaryAction: {
            title: 'سامانه پایش و نگهداری هوشمند',
            description: 'ثبت و پیگیری پرونده‌های تعمیرات، عیب‌یابی و مأموریت‌های میدانی',
            href: '/smart-maintenance',
            actionText: 'ورود به نگهداری هوشمند'
          },
          secondaryAction: {
            title: 'فهرست دارایی‌های انرژی',
            description: 'مشاهده نیروگاه‌های فعال، ظرفیت‌ها و محل استقرار فیزیکی',
            href: '/solar-assets',
            actionText: 'فهرست نیروگاه‌ها'
          }
        };

      case 'FINANCE':
      case 'FINANCIAL_PARTNER':
        return {
          title: 'به سامانه مدیریت تسهیلات و تأمین مالی خوش آمدید',
          description: 'پرونده‌های متقاضیان تسهیلات احداث نیروگاه خورشیدی را ارزیابی کرده و پیشنهادات اعتباری را ثبت فرمایید.',
          icon: ShieldCheck,
          primaryAction: {
            title: 'پورتفوی مالی و سرمایه‌گذاری',
            description: 'ارزیابی مدل‌های مالی CAPEX، جریان نقدی و بازپرداخت اقساط',
            href: '/enterprise/portfolio',
            actionText: 'پورتفوی مالی'
          },
          secondaryAction: {
            title: 'بررسی پروژه‌های واجد شرایط',
            description: 'فهرست پروژه‌های نیروگاهی در مرحله تأمین مالی',
            href: '/projects',
            actionText: 'مشاهده پروژه‌ها'
          }
        };

      case 'ADMIN':
      case 'SUPER_ADMIN':
        return {
          title: 'به پیشخوان مدیریت جامع هوشیار انرژی خوش آمدید',
          description: 'نظارت یکپارچه بر پروژه‌ها، سازمان‌های حقوقی، چرخه عمر مهندسی و دارایی‌های دیجیتال انرژی سراسر کشور.',
          icon: ShieldCheck,
          primaryAction: {
            title: 'مدیریت کلان پلتفرم و پورتفولیو',
            description: 'نظارت بر تجمیع پورتفوهای شرکتی، اعتبارسنجی و سازمان‌ها',
            href: '/enterprise/portfolio',
            actionText: 'ورود به پورتفولیو'
          },
          secondaryAction: {
            title: 'پایش و بررسی دارایی‌های ثبت‌شده',
            description: 'بررسی وضعیت شناسنامه‌های فنی و پروانه‌های بهره‌برداری',
            href: '/admin/solar-assets',
            actionText: 'بررسی دارایی‌ها'
          }
        };

      case 'PROJECT_OWNER':
      case 'CUSTOMER':
      case 'OWNER':
      default:
        return {
          title: 'اولین پروژه خورشیدی خود را شروع کنید',
          description: 'هوشیار انرژی چرخه کامل احداث نیروگاه خورشیدی از امکان‌سنجی اولیه و استعلام قیمت تا عقد قرارداد و راه‌اندازی را مدیریت می‌کند.',
          icon: Sun,
          primaryAction: {
            title: 'شروع تحلیل هوشمند انرژی خورشیدی',
            description: 'محاسبه مساحت، تابش خورشیدی، برآورد ظرفیت نیروگاه و دوره بازگشت سرمایه',
            href: '/target-select',
            actionText: 'شروع تحلیل انرژی'
          },
          secondaryAction: {
            title: 'ایجاد مستقیم پروژه احداث',
            description: 'ثبت اطلاعات فنی سایت و ورود به فرآیند تهیه اسناد استعلام پیمانکاری',
            href: '/powerplant-setup',
            actionText: 'ثبت اطلاعات نیروگاه'
          }
        };
    }
  };

  const config = getRoleOnboardingConfig();
  const RoleIcon = config.icon;

  return (
    <section className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <RoleIcon size={28} strokeWidth={2} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {config.title}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {formatRoleLabel(activeRole)}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        {/* Primary Action Card */}
        <div className="flex flex-col justify-between p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 shadow-xs">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md inline-block">
              گام پیشنهادی اول
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {config.primaryAction.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {config.primaryAction.description}
            </p>
          </div>

          <div className="pt-5 mt-2">
            <Link
              to={config.primaryAction.href}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 dark:bg-amber-400 dark:hover:bg-amber-500 transition-colors shadow-xs min-h-[44px]"
            >
              <span>{config.primaryAction.actionText}</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>

        {/* Secondary Action Card */}
        <div className="flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shadow-xs">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">
              مسیر جایگزین
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {config.secondaryAction.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {config.secondaryAction.description}
            </p>
          </div>

          <div className="pt-5 mt-2">
            <Link
              to={config.secondaryAction.href}
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl font-bold text-sm bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs min-h-[44px]"
            >
              <span>{config.secondaryAction.actionText}</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
