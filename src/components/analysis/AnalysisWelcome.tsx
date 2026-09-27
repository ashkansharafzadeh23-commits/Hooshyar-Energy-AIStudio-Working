import React from 'react';
import { Sun, ArrowLeft, History, ShieldCheck, Sparkles, MapPin, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalysisWelcomeProps {
  onStart: () => void;
  onContinuePrevious?: () => void;
  hasPreviousAnalysis?: boolean;
  lastAnalysisSummary?: string;
}

export const AnalysisWelcome: React.FC<AnalysisWelcomeProps> = ({
  onStart,
  onContinuePrevious,
  hasPreviousAnalysis = false,
  lastAnalysisSummary
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto px-4 py-8 sm:py-12"
      dir="rtl"
    >
      {/* Header Badge */}
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Sun size={14} className="text-amber-500" />
          سامانه هوشمند تحلیل نیروگاه خورشیدی
        </span>
      </div>

      {/* Primary Titles */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight mb-4">
          نیاز انرژی خود را بررسی کنید
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed max-w-xl mx-auto">
          با وارد کردن چند اطلاعات ساده، ظرفیت پیشنهادی نیروگاه خورشیدی، تولید تقریبی انرژی و برآورد اولیه پروژه را دریافت کنید.
        </p>
      </div>

      {/* Honest 3-step preview (Real Process, no fake statistics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-right">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-sm mb-2.5">
            ۱
          </div>
          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">نوع و محل مصرف</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">مشخص کردن استان و نوع کاربری جهت بررسی تابش منطقه</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-right">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm mb-2.5">
            ۲
          </div>
          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">مصرف ماهانه</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">کیلووات‌ساعت ماهانه یا برآورد ساده از روی قبض</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-right">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-2.5">
            ۳
          </div>
          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mb-1">پیشنهاد مهندسی</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">ظرفیت، تعداد پنل، تولید سالانه و تبدیل مستقیم به پروژه</p>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="space-y-3.5">
        <button
          type="button"
          onClick={onStart}
          className="w-full min-h-[48px] py-3.5 px-6 rounded-xl font-bold text-base bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>شروع تحلیل</span>
          <ArrowLeft size={18} />
        </button>

        {hasPreviousAnalysis && onContinuePrevious && (
          <button
            type="button"
            onClick={onContinuePrevious}
            className="w-full min-h-[44px] py-3 px-6 rounded-xl font-medium text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
          >
            <History size={16} />
            <span>ادامه تحلیل قبلی</span>
            {lastAnalysisSummary && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-1 truncate max-w-[200px]">
                ({lastAnalysisSummary})
              </span>
            )}
          </button>
        )}
      </div>

      {/* Transparent Disclaimer */}
      <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-zinc-400 shrink-0" />
          <span>محاسبات بر اساس موتور مهندسی و پایگاه تابش خورشیدی ناسا (NASA POWER) و استانداردهای ملی انرژی انجام می‌شود.</span>
        </p>
      </div>
    </motion.div>
  );
};
