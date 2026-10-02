import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Zap, Grid, Maximize, ArrowDown, ShieldCheck, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
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
  isProjectCreated?: boolean;
  projectId?: string | null;
  projectLoading?: boolean;
}

export const AnalysisExecutiveSummary: React.FC<AnalysisExecutiveSummaryProps> = ({
  data,
  onExploreEngineering,
  onCreateProject,
  isProjectCreated = false,
  projectId = null,
  projectLoading = false
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
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-pulse" />
              <h3 className="text-xs sm:text-sm font-bold text-[#0284C7] dark:text-blue-400">
                پیشنهاد هوشیار انرژی
              </h3>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50">
              خلاصه اجرایی سامانه خورشیدی
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <DataTruthBadge type="CALCULATED" size="md" />
            {data.sourceStatus === 'LIVE_NASA' ? (
              <DataTruthBadge type="VERIFIED_SOURCE" size="md" />
            ) : (
              <DataTruthBadge type="REFERENCE_ESTIMATE" size="md" />
            )}
          </div>
        </div>

        {/* 4 Core Pillars answering the key questions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {/* 1. Recommended Capacity */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-right">
            <div className="flex items-center justify-between text-xs text-blue-900/80 dark:text-blue-300/80 mb-2 font-medium">
              <span>ظرفیت پیشنهادی</span>
              <Sun size={16} className="text-[#0284C7]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1.5">
              {isKwpAvailable ? (
                <>
                  <span dir="ltr" className="font-mono">{data.recommendedKwp!.toLocaleString('fa-IR')}</span>
                  <span className="text-xs font-bold text-[#0284C7] dark:text-blue-400">کیلووات (kWp)</span>
                </>
              ) : (
                <span className="text-sm font-medium text-zinc-500">اطلاعات کافی موجود نیست</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              متناسب با الگوی مصرف اعلام‌شده
            </p>
          </div>

          {/* 2. Panel Count */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-right">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
              <span>تعداد تقریبی پنل</span>
              <Grid size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1.5">
              {isPanelCountAvailable ? (
                <>
                  <span dir="ltr" className="font-mono">{data.panelCount!.toLocaleString('fa-IR')}</span>
                  <span className="text-xs font-medium text-zinc-500">عدد</span>
                </>
              ) : (
                <span className="text-sm font-medium text-zinc-500">اطلاعات کافی موجود نیست</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              ماژول‌های راندمان بالای مونوکریستال
            </p>
          </div>

          {/* 3. Estimated Annual Generation */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-right">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
              <span>تولید سالانه تخمینی</span>
              <Zap size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1.5">
              {isAnnualKwhAvailable ? (
                <>
                  <span dir="ltr" className="font-mono">{data.estimatedAnnualKwh!.toLocaleString('fa-IR')}</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">کیلووات‌ساعت (kWh)</span>
                </>
              ) : (
                <span className="text-sm font-medium text-zinc-500">اطلاعات کافی موجود نیست</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              با احتساب ساعات آفتابی منطقه
            </p>
          </div>

          {/* 4. Required Area */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 text-right">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-2 font-medium">
              <span>فضای تقریبی مورد نیاز</span>
              <Maximize size={16} className="text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1.5">
              {isAreaAvailable ? (
                <>
                  <span dir="ltr" className="font-mono">{data.requiredAreaM2!.toLocaleString('fa-IR')}</span>
                  <span className="text-xs font-medium text-zinc-500">متر مربع</span>
                </>
              ) : (
                <span className="text-sm font-medium text-zinc-500">اطلاعات کافی موجود نیست</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
              مساحت بدون سایه‌اندازی پنل‌ها
            </p>
          </div>
        </div>

        {/* 5. What data this recommendation is built upon */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
          <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>پایه داده‌های این پیشنهاد:</span>
          </div>
          <p>
            این نتیجه بر اساس مصرف ماهانه اعلامی شما، مساحت محل نصب، و اطلس تابش خورشیدی {data.locationLabel ? `منطقه ${data.locationLabel}` : 'منطقه پروژه'} محاسبه شده است. هیچ داده ساختگی یا تخمینی بدون ذکر منبع در این تحلیل به کار نرفته است.
          </p>
        </div>

        {/* 6. What is the next step? (Quieter secondary shortcut near top; Stage 5 retains dominant CTA) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {onExploreEngineering && (
            <button
              type="button"
              onClick={onExploreEngineering}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-[#0284C7] dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <span>مشاهده جزئیات مهندسی و تجهیزات</span>
              <ArrowDown size={14} />
            </button>
          )}

          {isProjectCreated && projectId ? (
            <Link
              to={`/projects/${projectId}`}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
            >
              <span>مشاهده پروژه ایجادشده در پیشخوان</span>
              <ArrowLeft size={14} />
            </Link>
          ) : onCreateProject ? (
            <button
              type="button"
              onClick={onCreateProject}
              disabled={projectLoading}
              className="w-full sm:w-auto min-h-[44px] px-4 sm:px-5 py-2 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {projectLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin text-[#0284C7]" />
                  <span>در حال ایجاد پروژه...</span>
                </>
              ) : (
                <>
                  <span>تبدیل به پروژه و دریافت استعلام</span>
                  <CheckCircle2 size={14} className="text-[#0284C7] dark:text-blue-400" />
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
