import React from 'react';
import { Sun, Database, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface SolarDataSourceProps {
  locationLabel: string;
  sourceType?: 'NASA_POWER' | 'REGIONAL_REFERENCE' | 'USER_PROVIDED' | string;
  dailyIrradianceKwhM2?: number;
  peakSunHours?: number;
  lastUpdated?: string;
  isFallback?: boolean;
}

export const SolarDataSource: React.FC<SolarDataSourceProps> = ({
  locationLabel,
  sourceType = 'NASA_POWER',
  dailyIrradianceKwhM2,
  peakSunHours,
  lastUpdated,
  isFallback = false
}) => {
  const isDirectNasa = (sourceType === 'NASA_POWER' || sourceType === 'nasa_power_api' || sourceType === 'nasa_power_api_cached') && !isFallback;
  const isUserProvided = sourceType === 'USER_PROVIDED';

  const badgeType = isDirectNasa ? 'VERIFIED_SOURCE' : (isUserProvided ? 'USER_PROVIDED' : 'REFERENCE_ESTIMATE');

  return (
    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-right" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sun size={18} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              منبع داده خورشیدی و هواشناسی
            </h3>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              ارزیابی تابش در {locationLabel}
            </span>
          </div>
        </div>

        <DataTruthBadge
          type={badgeType}
          size="sm"
        />
      </div>

      {/* Grid of Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Source Provider */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">پایگاه داده تابش</div>
          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
            {isDirectNasa 
              ? 'پایگاه ماهواره‌ای ناسا (NASA POWER)' 
              : (isUserProvided ? 'ساعات تابش موثر اعلامی کاربر' : 'داده مرجع امکان‌سنجی')}
          </div>
        </div>

        {/* Status */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">وضعیت ارتباط و صحه‌گذاری</div>
          <div className={`font-bold text-xs ${isDirectNasa ? 'text-emerald-600 dark:text-emerald-400' : (isUserProvided ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400')}`}>
            {isDirectNasa 
              ? 'داده برخط دریافت‌شده از ماهواره ناسا (تأییدشده)' 
              : (isUserProvided ? 'ثبت مستقیم توسط کاربر (نیازمند صحه‌گذاری نهایی EPC)' : 'برآورد مرجع')}
          </div>
        </div>

        {/* Radiation Metric */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">میانگین ساعات آفتابی موثر</div>
          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
            {peakSunHours ? `${peakSunHours.toFixed(1)} ساعت/روز (Peak Sun Hours)` : 'داده در دسترس نیست'}
          </div>
        </div>
      </div>

      {/* Provenance Disclosure */}
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50/50 dark:bg-zinc-800/20 p-2.5 rounded-lg">
        {isDirectNasa ? (
          <span>داده تابش مستقیماً از داده‌های تابش خورشیدی ماهواره‌ای NASA POWER (میانگین ۲۲ ساله) استخراج شده و به عنوان ورودی معتبر مهندسی استفاده شده است.</span>
        ) : isUserProvided ? (
          <span>ساعات تابش روزانه بر اساس ورودی اعلام‌شده توسط کاربر در محاسبات لحاظ شده است. برای قرارداد EPC نهایی، اندازه‌گیری زمینی یا تاییدیه مشاور الزامی است.</span>
        ) : (
          <span>داده تابش به عنوان برآورد اولیه استفاده شده است.</span>
        )}
      </div>
    </div>
  );
};
