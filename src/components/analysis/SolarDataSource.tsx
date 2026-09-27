import React from 'react';
import { Sun, Database, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface SolarDataSourceProps {
  locationLabel: string;
  sourceType?: 'NASA_POWER' | 'REGIONAL_REFERENCE' | string;
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
  const isDirectNasa = sourceType === 'NASA_POWER' && !isFallback;

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
          type={isDirectNasa ? 'VERIFIED_SOURCE' : 'REFERENCE_ESTIMATE'}
          size="sm"
        />
      </div>

      {/* Grid of Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Source Provider */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">پایگاه داده تابش</div>
          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
            {isDirectNasa ? 'پایگاه داده ماهواره‌ای ناسا (NASA POWER)' : 'اطلس مرجع تابش منطقه‌ای هوشیار انرژی'}
          </div>
        </div>

        {/* Status */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">وضعیت ارتباط</div>
          <div className={`font-bold text-xs ${isDirectNasa ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {isDirectNasa ? 'داده برخط دریافت‌شده از منبع ناسا' : 'برآورد مرجع — منبع مستقیم برخط در دسترس نبود'}
          </div>
        </div>

        {/* Radiation Metric */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">میانگین ساعات آفتابی موثر</div>
          <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
            {peakSunHours ? `${peakSunHours.toFixed(1)} ساعت/روز (ساعات اوج آفتاب)` : 'داده در دسترس نیست'}
          </div>
        </div>
      </div>

      {/* Provenance Disclosure */}
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50/50 dark:bg-zinc-800/20 p-2.5 rounded-lg">
        {isDirectNasa ? (
          <span>داده از NASA POWER دریافت شده است.</span>
        ) : (
          <span>در این تحلیل از داده مرجع استفاده شده است.</span>
        )}
      </div>
    </div>
  );
};
