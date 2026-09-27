import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowLeft, ArrowRight, ShieldCheck, Activity, Layers, AlertCircle } from 'lucide-react';

interface ProjectAssetBridgeProps {
  mode: 'PROJECT_TO_ASSET' | 'ASSET_TO_PROJECT';
  projectId?: string;
  projectTitle?: string;
  projectStatus?: string;
  assetId?: string | null;
  assetName?: string | null;
  assetStatus?: string | null;
  className?: string;
}

export const ProjectAssetBridge: React.FC<ProjectAssetBridgeProps> = ({
  mode,
  projectId,
  projectTitle,
  projectStatus,
  assetId,
  assetName,
  assetStatus,
  className = ''
}) => {
  // Mode 1: Within Project Detail, bridging to Asset
  if (mode === 'PROJECT_TO_ASSET') {
    const isCommissionedOrOperational = 
      projectStatus === 'COMMISSIONED' || 
      projectStatus === 'OPERATIONAL';

    if (isCommissionedOrOperational && assetId) {
      return (
        <div
          dir="rtl"
          className={`p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  دارایی عملیاتی متصل
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  شناسه: {assetId}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                {assetName || 'دارایی بدون عنوان'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                نیروگاه با موفقیت راه‌اندازی گردیده و شناسنامه فنی و مرکز پایش آن فعال است.
              </p>
            </div>
          </div>

          <Link
            to={`/solar-assets/${assetId}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer min-h-[44px]"
          >
            <span>مشاهده دارایی عملیاتی</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      );
    }

    // Pre-commissioning state: Truthful message
    return (
      <div
        dir="rtl"
        className={`p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 text-xs text-slate-600 dark:text-zinc-400 flex items-start gap-2.5 ${className}`}
      >
        <AlertCircle className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-700 dark:text-zinc-300 block mb-0.5">
            دارایی عملیاتی هنوز تشکیل نشده است
          </span>
          <span>
            بر اساس ضوابط مهندسی، پرونده پروژه تا پیش از اتمام تست‌های راه‌اندازی و تحویل موقت در وضعیت پروژه (EnergyProject) باقی می‌ماند و پس از تأیید تحویل به دارایی (EnergyAsset) تبدیل می‌گردد.
          </span>
        </div>
      </div>
    );
  }

  // Mode 2: Within Asset Detail, bridging back to originating Project
  if (mode === 'ASSET_TO_PROJECT' && projectId) {
    return (
      <div
        dir="rtl"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 ${className}`}
      >
        <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span>پروژه مادر:</span>
        <Link
          to={`/projects/${projectId}`}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          <span>{projectTitle || `پروژه #${projectId.substring(0, 8)}`}</span>
          <ArrowLeft className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return null;
};

export default ProjectAssetBridge;
