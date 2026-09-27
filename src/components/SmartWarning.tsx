import React from 'react';
import { Settings, AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export function SmartWarning({ monthlyKwh, targets }: { monthlyKwh: number, targets: string[] }) {
  if (!targets.includes('solar')) return null;

  // Simple heuristic based on consumption
  let maintenanceMonths = 6;
  let severity = 'normal';
  let message = 'با توجه به مصرف عادی، پیشنهاد می‌شود هر ۶ ماه یکبار برای سرویس دوره‌ای و شستشوی پنل‌ها اقدام کنید.';

  if (monthlyKwh > 500) {
    maintenanceMonths = 3;
    severity = 'high';
    message = 'مصرف انرژی شما بالاست! به دلیل فشار بیشتر بر روی اینورتر و سیستم، پیشنهاد می‌کنیم هر ۳ ماه یکبار سرویس دوره‌ای انجام دهید تا از افت راندمان جلوگیری شود.';
  } else if (monthlyKwh < 150) {
    maintenanceMonths = 12;
    severity = 'low';
    message = 'مصرف انرژی شما پایین است. سرویس سالانه (هر ۱۲ ماه) برای بررسی اتصالات و تمیزکاری پنل‌ها کافی به نظر می‌رسد.';
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 bg-white dark:bg-zinc-900 dark:bg-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-premium relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-1.5 h-full ${severity === 'high' ? 'bg-red-500' : severity === 'normal' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
      
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl shrink-0 ${severity === 'high' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : severity === 'normal' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-green-50 dark:bg-emerald-900/30 text-green-600 dark:text-emerald-400'}`}>
          <Settings size={28} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-black text-zinc-950 dark:text-zinc-100">هشدار هوشمند تعمیر و نگهداری</h3>
            {severity === 'high' && <AlertCircle size={16} className="text-red-500" />}
          </div>
          
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
            {message}
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Calendar size={18} className="text-zinc-500 dark:text-zinc-400" />
              زمان پیشنهادی سرویس بعدی: 
              <span className={severity === 'high' ? 'text-red-600' : 'text-blue-600'}>
                {maintenanceMonths} ماه آینده
              </span>
            </div>
            
            <a href="/smart-maintenance" className="text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white transition-colors px-4 py-2.5 rounded-lg shadow-premium flex items-center gap-2">
              مشاهده جزئیات و درخواست سرویس
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
