import React from 'react';
import { CreditCard, Clock, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Subscription() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 font-sans"
      dir="rtl"
    >
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="text-xs font-bold text-[#0284C7] bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/40 mb-3 inline-block">
          اشتراک همکاران تجاری
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mb-3">
          اشتراک همکاری تجاری
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          بخش مدیریت عضویت تجاری و پلن‌های همکاری فروشندگان و تأمین‌کنندگان در پلتفرم هوشیار انرژی
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#0284C7] rounded-2xl flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900/40">
          <CreditCard size={32} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
            <Clock size={14} />
            <span>جزئیات پلن‌های تجاری در حال تکمیل است</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-2">
            آماده‌سازی شرایط همکاری تجاری
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mx-auto">
            اطلاعات نهایی پلن‌ها و شرایط اشتراک پس از فعال‌سازی تجاری این بخش نمایش داده خواهد شد.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5 text-right">
          <Info size={16} className="text-[#0284C7] shrink-0 mt-0.5" />
          <span>
            در حال حاضر دسترسی به داشبورد و امکانات پایه پرتال تأمین‌کنندگان بدون نیاز به پرداخت اشتراک فعال است. هرگونه تغییر در تعرفه‌ها و مدل اشتراک پیشاپیش اطلاع‌رسانی خواهد شد.
          </span>
        </div>

        <div className="pt-2">
          <button 
            type="button"
            disabled
            className="w-full sm:w-auto px-8 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-slate-500 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 dark:border-zinc-700 cursor-not-allowed min-h-[44px]"
          >
            فعلاً در دسترس نیست
          </button>
        </div>
      </div>
    </motion.div>
  );
}
