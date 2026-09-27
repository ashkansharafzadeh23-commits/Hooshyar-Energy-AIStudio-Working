import React from 'react';
import { Sun, Zap, Grid, Maximize, ArrowDown, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface ExecutiveSummaryData {
  recommendedKwp: number | null;
  panelCount: number | null;
  estimatedAnnualKwh: number | null;
  requiredAreaM2: number | null;
  monthlyGenerationKwh?: number | null;
  sourceStatus?: 'LIVE_NASA' | 'FALLBACK_REGIONAL';
  locationLabel?: string;
}

interface AnalysisExecutiveSummaryProps {
  data: ExecutiveSummaryData;
  onExploreEngineering?: () => void;
  onCreateProject?: () => void;
}

export const AnalysisExecutiveSummary: React.FC<AnalysisExecutiveSummaryProps> = ({
  data,
  onExploreEngineering,
  onCreateProject
}) => {
  const formatNumber = (val: number | null | undefined, unit: string) => {
    if (val === null || val === undefined || isNaN(val) || val <= 0) {
      return 'اطلاعات کافی موجود نیست';
    }
    return `${val.toLocaleString('fa-IR')} ${unit}`;
  };

  const isKwpAvailable = data.recommendedKwp !== null && data.recommendedKwp !== undefined && data.recommendedKwp > 0;
  const isPanelCountAvailable = data.panelCount !== null && data.panelCount !== undefined && data.panelCount > 0;
  const isAnnualKwhAvailable = data.estimatedAnnualKwh !== null && data.estimatedAnnualKwh !== undefined && data.estimatedAnnualKwh > 0;
  const isAreaAvailable = data.requiredAreaM2 !== null && data.requiredAreaM2 !== undefined && data.requiredAreaM2 > 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Primary Hero Recommendation Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                پیشنهاد هوشیار انرژی
              </h3>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50">
              خلاصه اجرایی سامانه خورشیدی
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <DataTruthBadge type="CALCULATED" size="md" />
            {data.sourceStatus === 'LIVE_NASA' ? (
              <DataTruthBadge type="VERIFIED_SOURCE" size="md" />
            ) : (
              <DataTruthBadge type="REFERENCE_ESTIMATE" size="md" />
            )}
          </div>
        </div>

        {/* 4 Core Pillars answering the key questions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 1. Recommended Capacity */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-right">
            <div className="flex items-center justify-between text-xs text-amber-900/80 dark:text-amber-300/80 mb-2 font-medium">
              <span>ظرفیت پیشنهادی</span>
              <Sun size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {isKwpAvailable ? `${data.recommendedKwp!.toLocaleString('fa-IR')}` : 'اطلاعات کافی موجود نیست'}
              {isKwpAvailable && <span className="text-xs font-normal text-zinc-500 mr-1.5">کیلووات</span>}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              متناسب با نیاز و الگوی مصرف شما
            </p>
          </div>

          {/* 2. Panel Count */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-right">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
              <span>تعداد تقریبی پنل</span>
              <Grid size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {isPanelCountAvailable ? `${data.panelCount!.toLocaleString('fa-IR')}` : 'اطلاعات کافی موجود نیست'}
              {isPanelCountAvailable && <span className="text-xs font-normal text-zinc-500 mr-1.5">عدد</span>}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              ماژول‌های راندمان بالای مونوکریستال
            </p>
          </div>

          {/* 3. Estimated Annual Generation */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-right">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
              <span>تولید سالانه تخمینی</span>
              <Zap size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {isAnnualKwhAvailable ? `${data.estimatedAnnualKwh!.toLocaleString('fa-IR')}` : 'اطلاعات کافی موجود نیست'}
              {isAnnualKwhAvailable && <span className="text-xs font-normal text-zinc-500 mr-1.5">کیلووات‌ساعت</span>}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              با احتساب ساعات آفتابی منطقه
            </p>
          </div>

          {/* 4. Required Area */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-right">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
              <span>فضای تقریبی مورد نیاز</span>
              <Maximize size={16} className="text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {isAreaAvailable ? `${data.requiredAreaM2!.toLocaleString('fa-IR')}` : 'اطلاعات کافی موجود نیست'}
              {isAreaAvailable && <span className="text-xs font-normal text-zinc-500 mr-1.5">متر مربع</span>}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              مساحت بدون سایه‌اندازی پنل‌ها
            </p>
          </div>
        </div>

        {/* 5. What data this recommendation is built upon */}
        <div className="p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
          <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>پایه داده‌های این پیشنهاد:</span>
          </div>
          <p>
            این نتیجه بر اساس مصرف ماهانه اعلامی شما، مساحت محل نصب، و اطلس تابش خورشیدی {data.locationLabel ? `منطقه ${data.locationLabel}` : 'منطقه پروژه'} محاسبه شده است. هیچ داده ساختگی یا تخمینی بدون ذکر منبع در این تحلیل به کار نرفته است.
          </p>
        </div>

        {/* 6. What is the next step? */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {onExploreEngineering && (
            <button
              type="button"
              onClick={onExploreEngineering}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>مشاهده جزئیات مهندسی و تجهیزات</span>
              <ArrowDown size={14} />
            </button>
          )}

          {onCreateProject && (
            <button
              type="button"
              onClick={onCreateProject}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-zinc-950 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>تبدیل به پروژه و دریافت استعلام</span>
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
