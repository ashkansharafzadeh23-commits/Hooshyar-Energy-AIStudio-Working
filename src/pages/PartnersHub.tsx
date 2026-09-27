import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Building2, ShoppingBag, Coins, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function PartnersHub() {
  const partnerCategories = [
    {
      id: 'technician',
      title: 'ثبت‌نام متخصص و تعمیرکار',
      role: 'متخصص فنی خورشیدی',
      desc: 'ارائه خدمات نصب، راه‌اندازی، نگهداری دوره‌ای، عیب‌یابی و تعمیرات سیستم‌های فتوولتائیک و اینورتر',
      link: '/technician-auth',
      icon: Wrench,
      color: 'text-amber-500 dark:text-amber-400',
      badge: 'پایش و نگهداری'
    },
    {
      id: 'contractor',
      title: 'ثبت شرکت پیمانکار و مجری',
      role: 'پیمانکار عمومی EPC',
      desc: 'مشارکت در مناقصات طراحی، مهندسی، تدارکات و احداث نیروگاه‌های خورشیدی متصل و منفصل از شبکه',
      link: '/contractor-auth',
      icon: Building2,
      color: 'text-blue-500 dark:text-blue-400',
      badge: 'مناقصات و احداث'
    },
    {
      id: 'vendor',
      title: 'ثبت فروشگاه و تأمین‌کننده',
      role: 'تأمین‌کننده تجهیزات',
      desc: 'عرضه پنل، اینورتر، سازه، کابل و ادوات حفاظت الکتریکی در بازارگاه اختصاصی تجهیزات تجدیدپذیر',
      link: '/vendor-auth',
      icon: ShoppingBag,
      color: 'text-emerald-500 dark:text-emerald-400',
      badge: 'بازارگاه تجهیزات'
    },
    {
      id: 'investor',
      title: 'ثبت‌نام سرمایه‌گذار / شریک تأمین مالی',
      role: 'تأمین مالی و سرمایه‌گذاری',
      desc: 'مشارکت در ساخت، وام‌های توسعه‌ای و فرصت‌های سرمایه‌گذاری نیروگاه‌های خورشیدی با بازدهی تضمین‌شده',
      link: '/investment-hub/investor-profile',
      icon: Coins,
      color: 'text-indigo-500 dark:text-indigo-400',
      badge: 'سرمایه‌گذاری انرژی'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium mb-4">
            <ShieldCheck size={16} />
            <span>شبکه یکپارچه همکاران هوشیار انرژی</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
            همکاری با هوشیار انرژی
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-base text-slate-600 dark:text-zinc-400">
            پیوستن به زنجیره ارزش دیجیتال پروژه‌ها و تأسیسات انرژی خورشیدی کشور
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partnerCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Icon className={`w-6 h-6 ${cat.color}`} />
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                      {cat.badge}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {cat.title}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-3">
                    نقش سازمانی: {cat.role}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mb-6">
                    {cat.desc}
                  </p>
                </div>

                <Link
                  to={cat.link}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-zinc-700 rounded-xl text-sm font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span>ورود یا ثبت اطلاعات</span>
                  <ArrowLeft size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Security & Verification Notice */}
        <div className="mt-12 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                سیاست ارزیابی و اصالت اطلاعات همکاران
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                کلیه پروفایل‌های ثبت‌شده در مرحله اول به صورت وضعیت در انتظار بررسی (Pending Review) ذخیره شده و پس از اعتبارسنجی مدارک و مشخصات فنی، در بازارگاه عمومی هوشیار انرژی جهت انتخاب توسط کارفرمایان و مالکان پروژه‌ها منتشر خواهند شد.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
