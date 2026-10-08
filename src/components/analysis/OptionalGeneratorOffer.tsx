import React, { useState } from 'react';
import { Zap, ShieldAlert, ChevronLeft, X, Info, CheckCircle2, Clock } from 'lucide-react';

export interface OptionalGeneratorOfferProps {
  usageType?: string;
  province?: string;
  city?: string;
  gridStable?: boolean;
  goal?: string;
  className?: string;
}

export const OptionalGeneratorOffer: React.FC<OptionalGeneratorOfferProps> = ({
  usageType,
  province,
  city,
  gridStable = true,
  goal,
  className = ''
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

  // If dismissed by user, render nothing, maintaining clean zero-impact layout
  if (isDismissed) {
    return null;
  }

  // Derive gentle, strictly factual contextual note (no guessed outages or fake metrics)
  const isBackupGoal = goal === 'BACKUP_POWER' || goal === 'OFF_GRID';
  const hasUnstableGridFlag = gridStable === false;

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="پیشنهاد اختیاری مولد برق پشتیبان"
      className={`rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs p-4 sm:p-6 shadow-xs text-right transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Right side: Icon & Text content */}
        <div className="flex items-start gap-3.5 flex-1">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 shrink-0">
            <Zap size={22} className="stroke-[2.2]" aria-hidden="true" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                سرویس مکمل و اختیاری
              </span>

              {hasUnstableGridFlag && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 flex items-center gap-1">
                  <ShieldAlert size={12} />
                  <span>بر اساس وضعیت پایداری شبکه ثبت‌شده</span>
                </span>
              )}

              {isBackupGoal && !hasUnstableGridFlag && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                  متناسب با هدف تأمین برق اضطراری
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              برای زمان قطعی برق، به موتور برق یا ژنراتور نیاز دارید؟
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              در کنار طرح خورشیدی شما، امکان بررسی یک منبع برق پشتیبان متناسب با تجهیزات ضروری و مدت قطعی برق نیز وجود دارد. این بررسی کاملاً مستقل از محاسبات خورشیدی بوده و بر ظرفیت یا هزینه طرح سقف شما تأثیری ندارد.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isInfoModalOpen}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer min-h-[42px]"
          >
            <span>بررسی موتور برق و ژنراتور</span>
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="بستن پیشنهاد موتور برق و ژنراتور"
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer min-h-[42px] whitespace-nowrap"
          >
            <span>فعلاً نیازی ندارم</span>
          </button>
        </div>
      </div>

      {/* Accessible Information Dialog for Development Roadmap Transparency */}
      {isInfoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="generator-info-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-zinc-800 text-right space-y-5 animate-in fade-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Zap size={20} />
                </div>
                <div>
                  <h4 id="generator-info-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    ارزیابی و انتخاب موتور برق و دیزل ژنراتور
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    سرویس مستقل هوشیار انرژی برای تأمین توان اضطراری
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                aria-label="بستن پنجره"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                در سامانه‌ی هوشیار انرژی، پیشنهاد ژنراتور و موتور برق به عنوان یک گزینه‌ی پشتیبان و مکمل مهندسی طراحی شده است تا در ایام ناترازی برق یا قطعی شبکه، بارهای حیاتی شما بدون وقفه تأمین شوند.
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/60 space-y-2">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Info size={15} className="text-[#0284C7]" />
                  <span>فرآیند ارزیابی تخصصی (در دست استقرار):</span>
                </div>
                <ul className="space-y-1.5 pr-4 list-disc text-slate-600 dark:text-slate-400">
                  <li>تفکیک بارهای ضروری (روشنایی، پمپ، یخچال، بالابر، تجهیزات کارگاهی)</li>
                  <li>محاسبه ضریب راه‌اندازی سلفی (جریان استارت موتورها)</li>
                  <li>انتخاب نوع سوخت در دسترس (بنزینی کیفی، گازسوز شهری، یا گازوئیلی)</li>
                  <li>بررسی الزامات ایمنی و کلید تبدیل خودکار (ATS / تابلو برق اضطراری)</li>
                </ul>
              </div>

              {/* Development Status Disclaimer */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-xs">اطلاعیه فنی مرحله توسعه:</div>
                  <div className="text-[11px] leading-relaxed">
                    امکان محاسبه و پیشنهاد تخصصی ژنراتور در مرحله بعد تکمیل میشود. هم‌اکنون هیچ مشخصات ساختگی یا قیمت کاذبی در سامانه درج نمی‌گردد.
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer min-h-[40px]"
              >
                متوجه شدم، بازگشت به نتایج خورشیدی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
