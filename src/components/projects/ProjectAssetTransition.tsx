import React, { useEffect, useState } from 'react';
import { Zap, ShieldCheck, Activity, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { EnergyProject } from '../../types/project';
import { EnergyAsset } from '../../types/asset';
import { formatSolarCapacity, formatJalaliDate } from '../../utils/formatters';

interface ProjectAssetTransitionProps {
  project: EnergyProject;
  onNavigateTab?: (tab: string) => void;
}

export const ProjectAssetTransition: React.FC<ProjectAssetTransitionProps> = ({
  project,
  onNavigateTab,
}) => {
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [loading, setLoading] = useState(false);

  const isOperational = project.status === 'OPERATIONAL' || project.status === 'MAINTENANCE';

  useEffect(() => {
    if (isOperational) {
      setLoading(true);
      fetch(`/api/projects/${project.id}/assets`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAssets(data))
        .catch(err => console.error('Failed to fetch project assets:', err))
        .finally(() => setLoading(false));
    }
  }, [project.id, isOperational]);

  if (!isOperational) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
            <Activity className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-800">
              وضعیت بهره‌برداری و اتصال دارایی انرژی
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              این پروژه هم‌اکنون در مرحله پیش از بهره‌برداری قرار دارد. صدور شناسنامه دیجیتال دارایی (Asset Passport) و اتصال تجهیزات به سامانه مانیتورینگ پس از تکمیل فازهای اجرا، تست و راه‌اندازی (Commissioning) فعال خواهد شد.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Operational state
  const hasAsset = assets.length > 0;
  const primaryAsset = assets[0];

  return (
    <div className="bg-gradient-to-l from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-emerald-800/50 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-base text-white">
              نیروگاه وارد مرحله بهره‌برداری شده است
            </h4>
            <p className="text-xs text-emerald-300/90 mt-0.5">
              دارایی انرژی عملیاتی شده و آماده دریافت خدمات بهره‌برداری و نگهداری (O&M) است.
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('asset')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-center"
          >
            <span>مشاهده پاسپورت دارایی</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-slate-400 mb-1">شناسنامه دارایی (Asset Passport)</div>
          <div className="font-bold text-slate-100">
            {hasAsset ? (primaryAsset.name || primaryAsset.assetCode) : 'در حال تکمیل ثبت مشخصات'}
          </div>
          {hasAsset && primaryAsset.commercialOperationDate && (
            <div className="text-[11px] text-emerald-400 mt-1">
              شروع بهره‌برداری: {formatJalaliDate(primaryAsset.commercialOperationDate)}
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-slate-400 mb-1">ظرفیت عملیاتی نصب‌شده</div>
          <div className="font-bold text-slate-100">
            {hasAsset && primaryAsset.installedCapacityKw 
              ? formatSolarCapacity(primaryAsset.installedCapacityKw) 
              : (project.targetCapacityKw ? formatSolarCapacity(project.targetCapacityKw) : '—')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            وضعیت فنی: {hasAsset ? primaryAsset.status : 'در حال ثبت'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-slate-400 mb-1 flex items-center justify-between">
            <span>سامانه پایش برخط (Telemetry)</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">شفافیت داده</span>
          </div>
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>پایش برخط هنوز فعال نشده است.</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 leading-snug">
            داده‌های تولید لحظه‌ای صرفاً پس از اتصال درگاه سخت‌افزاری نمایش داده می‌شوند.
          </div>
        </div>
      </div>
    </div>
  );
};
