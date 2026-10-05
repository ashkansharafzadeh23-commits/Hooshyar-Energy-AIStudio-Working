import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calculator, 
  FileText, 
  Briefcase, 
  Wrench, 
  Box, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  ExternalLink,
  Layers,
  Zap,
  Eye
} from 'lucide-react';

interface PreviewCard {
  stage: string;
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  badge: string;
  verifiedFeatures: string[];
}

export default function Stage13FinalPreview() {
  // DEV-ONLY HARD GUARD: Completely disabled in production builds
  if (!import.meta.env.DEV) {
    return null;
  }

  const previewCards: PreviewCard[] = [
    {
      stage: 'Stage 13.3',
      title: 'پیشخوان مشتری و مدیریت چرخه پروژه',
      description: 'پیشخوان یکپارچه خریدار، کارت‌های دارایی، مرکز توجه و مسیر ورود بدون ابهام به تعریف پروژه جدید',
      path: '/dev/customer-dashboard-preview',
      icon: LayoutDashboard,
      accentColor: 'from-blue-600 to-cyan-600',
      badge: 'Customer Workspace',
      verifiedFeatures: [
        'دکمه برجسته ایجاد پروژه جدید',
        'عدم تکثیر پیوند نگهداری هوشمند',
        'حفظ شاخص‌های واقعی بدون ارقام فیک',
        'انطباق با گرید موبایل و فونت‌های فارسی'
      ]
    },
    {
      stage: 'Stage 13.4',
      title: 'نتایج تحلیل مهندسی و ارزیابی اقتصادی',
      description: 'گزارش پنج‌گانه تصمیم‌گیری، شبیه‌سازی تابش، جدول مقایسه ماژول‌ها و ماشین حساب بازگشت سرمایه',
      path: '/dev/engineering-result-preview',
      icon: Calculator,
      accentColor: 'from-sky-600 to-blue-700',
      badge: 'Engineering & Economics',
      verifiedFeatures: [
        'جدول مقایسه ماژول‌ها با کارت‌های موبایل',
        'جداسازی متون LTR در مقادیر kW و IRR',
        'عدم اعمال ضرایب ساختگی',
        'شفافیت کامل منابع داده ماهواره‌ای'
      ]
    },
    {
      stage: 'Stage 13.5',
      title: 'صندوق پیشنهادات استعلام (RFQ) و اسناد',
      description: 'مدیریت مناقصات، مقایسه رو در رو پیشنهادهای پیمانکاران EPC و تفکیک اسناد فنی و مالی',
      path: '/dev/rfq-bid-preview',
      icon: FileText,
      accentColor: 'from-indigo-600 to-blue-600',
      badge: 'RFQ & Bid Procurement',
      verifiedFeatures: [
        'مقایسه بدون امتیازدهی ساختگی',
        'کارت‌های واکنش‌گرا در صفحات کوچک',
        'تأییدیه حذف و دانلود اسناد مهندسی',
        'اهداف لمسی بالای ۴۴ پیکسل'
      ]
    },
    {
      stage: 'Stage 13.6',
      title: 'پرتال شبکه همکاران، تأمین و پیمانکاران',
      description: 'پیشخوان تخصصی شرکت‌های پیمانکار EPC، پرتال فروشندگان قطعات و ثبت آگهی‌های تابلو سبز',
      path: '/dev/partner-experience-preview',
      icon: Briefcase,
      accentColor: 'from-slate-700 to-slate-900',
      badge: 'Partner Network & EPC',
      verifiedFeatures: [
        'ناوبری کامپکت سازگار با نقش فعال',
        'وضعیت‌های خالی بدون داده فیک',
        'ثبت و پیگیری آگهی‌های تبلیغاتی',
        'سازگاری کامل با تم تاریک و روشن'
      ]
    },
    {
      stage: 'Stage 13.7',
      title: 'تعمیرات و نگهداری هوشمند (O&M)',
      description: 'سامانه تحلیل شواهد عیب، تخصیص تکنسین، ثبت لاگ قطعات و پیگیری پرونده با کد رهگیری',
      path: '/dev/smart-maintenance-preview',
      icon: Wrench,
      accentColor: 'from-blue-700 to-indigo-800',
      badge: 'Smart Maintenance O&M',
      verifiedFeatures: [
        'پایه حفاظت‌شده تاریخی (Commit 6363d19)',
        'پیمایش افقی امن تب‌ها در موبایل',
        'عایق‌بندی کدهای رهگیری با dir="ltr"',
        'عدم استفاده از confirm یا alert نیتیو'
      ]
    },
    {
      stage: 'Stage 13.8',
      title: 'طراحی سه‌بعدی و جانمایی آرایه خورشیدی',
      description: 'مدل‌ساز WebGL کادر 4:3 موبایل، شبیه‌سازی مسیر حرکت خورشید، سقف شیبدار/مسطح و واگذاری بدون ژیزمو',
      path: '/dev/solar-planner-preview',
      icon: Box,
      accentColor: 'from-emerald-600 to-teal-700',
      badge: '3D CAD Solar Planner',
      verifiedFeatures: [
        'کادر 4:3 کنترل‌شده بدون فضای خالی در موبایل',
        'خوانایی بالای آرایه در شب و نور مهتاب',
        'تنظیم خودکار دوربین متناسب با نوع ساختمان',
        'محاسبه معتبر ۰.۵۵ کیلووات به ازای هر ماژول'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased pb-20" dir="rtl">
      {/* 1. TEST ISOLATION BANNER */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs font-bold border-b border-amber-600 shadow-sm sticky top-0 z-50 flex items-center justify-center gap-2">
        <AlertTriangle size={16} className="shrink-0" />
        <span>
          صفحه ارزیابی نهایی Stage 13.9 — کلیه پیوندها به سناریوهای آزمایشی ایزوله هدایت می‌شوند.
        </span>
      </div>

      {/* 2. HEADER */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  STAGE 13.9 FINAL QA PREVIEW
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Hooshyar Energy V2
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                پیشخوان ارزیابی نهایی کیفیت رابط کاربری و عدم پسرفت
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                در این بخش کلیه سناریوهای تاییدشده مراحل Stage 13 به صورت متمرکز در دسترس قرار دارند تا سلامت چیدمان در ابعاد مختلف موبایل، سازگاری زبان فارسی، اهداف لمسی و رفتارهای دسترسی‌پذیری بررسی شوند.
              </p>
            </div>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">۶ سناریوی اصلی</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">تست کامل از ۱۳.۳ تا ۱۳.۸</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. VIEWPORT REFERENCE GUIDE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-950 dark:text-blue-200 mb-2">
            <Smartphone size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>عرض‌های تحت پوشش در ارزیابی جامع واکنش‌گرایی (Responsive Matrix):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { width: '320px', desc: 'کامپکت شدید (iPhone SE 1st)' },
              { width: '360px', desc: 'اندروید کوچک' },
              { width: '375px', desc: 'iPhone mini / SE' },
              { width: '390px', desc: 'iPhone استاندارد' },
              { width: '430px', desc: 'iPhone Pro Max' },
              { width: '768px', desc: 'تبلت عمودی' },
              { width: '1024px', desc: 'تبلت افقی / لپ‌تاپ' },
              { width: '1440px', desc: 'دسکتاپ وسیع' }
            ].map((vp, idx) => (
              <span 
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1.5"
              >
                <span className="font-bold text-blue-600 dark:text-blue-400">{vp.width}</span>
                <span className="text-[10px] text-slate-400 font-sans">({vp.desc})</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PREVIEW SCENARIO CARDS GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {previewCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                      {card.stage}
                    </span>
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.accentColor} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                      <Icon size={20} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                      {card.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Verified Quality Checkpoints */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2">
                      موارد بررسی‌شده:
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {card.verifiedFeatures.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={card.path}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <span>مشاهده سناریوی {card.stage}</span>
                    <ArrowLeft size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 5. FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>
          هوشیار انرژی V2 — مرحله ۱۳.۹ ارزیابی نهایی کیفیت، واکنش‌گرایی موبایل و رعایت استاندارد راست‌به‌چپ (RTL)
        </p>
      </footer>
    </div>
  );
}
