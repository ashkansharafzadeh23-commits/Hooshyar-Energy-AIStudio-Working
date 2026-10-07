import React from 'react';
import { Sparkles, Info, ShieldAlert, ArrowLeft } from 'lucide-react';

interface FutureAiImpactHookProps {
  className?: string;
  topicTitle?: string;
}

export const FutureAiImpactHook: React.FC<FutureAiImpactHookProps> = ({
  className = '',
  topicTitle
}) => {
  return (
    <div 
      className={`rounded-3xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/70 via-white to-slate-50 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900/80 p-5 sm:p-6 space-y-3 ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-[#0284C7] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>تحلیل هوشمند اثر بر پروژه من</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#0284C7] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                قابلیت آینده • به‌زودی
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              سنجش تأثیر ضوابط، تغییرات تعرفه‌ای یا تابلوی سبز بر مختصات فنی و مالی نیروگاه شما
            </p>
          </div>
        </div>

        {/* Disabled CTA with strict truthfulness */}
        <button
          disabled
          aria-disabled="true"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200/60 dark:border-slate-700 select-none"
          title="این قابلیت در فازهای بعدی پس از یکپارچه‌سازی پایگاه داده قوانین با موتور محاسباتی فعال خواهد شد."
        >
          <span>شبیه‌سازی اثر این مصوبه</span>
          <ArrowLeft size={14} className="opacity-40" />
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
        <Info size={14} className="text-[#0284C7] shrink-0 mt-0.5" />
        <span>
          در مراحل آتی (پس از اتصال پرونده‌های نیروگاهی کاربران)، سیستم به صورت خودکار نشان خواهد داد که این سند بر چه ظرفیت‌هایی، کدام تعرفه‌های تزریق به شبکه، یا چه الزاماتی در ماده ۱۶ اثر مستقیم می‌گذارد.
        </span>
      </div>
    </div>
  );
};
