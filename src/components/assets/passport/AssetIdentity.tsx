import React from 'react';
import { EnergyAsset } from '../../../types/asset';
import { Zap, MapPin, Calendar, ShieldCheck, Building2, Cpu, CheckCircle2 } from 'lucide-react';

interface AssetIdentityProps {
  asset: EnergyAsset;
  className?: string;
}

export const AssetIdentity: React.FC<AssetIdentityProps> = ({
  asset,
  className = ''
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return { label: 'در حال بهره‌برداری تجاری (Operational)', className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'COMMISSIONED':
        return { label: 'راه‌اندازی شده (Commissioned)', className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'MAINTENANCE':
        return { label: 'تحت تعمیرات و نگهداری', className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      default:
        return { label: status || 'نامشخص', className: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700' };
    }
  };

  const badge = getStatusBadge(asset.status);

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                {asset.assetCode}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
              {asset.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-700 text-left">
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">نسخه شناسنامه</span>
            <span className="text-xs font-bold font-mono text-slate-800 dark:text-zinc-200">v{asset.passportVersion || 1}.0</span>
          </div>
        </div>
      </div>

      {/* Grid of Identity Facts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>ظرفیت نامی نصب‌شده</span>
          </div>
          <p className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100">
            {asset.installedCapacityKw !== undefined && asset.installedCapacityKw !== null ? `${asset.installedCapacityKw} کیلووات` : 'ثبت نشده'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span>فناوری سامانه</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            {asset.technology || 'ثبت نشده'}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>تاریخ بهره‌برداری تجاری (COD)</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-zinc-100">
            {formatDate(asset.commercialOperationDate || asset.commissioningDate)}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>موقعیت مکانی و سایت احداث</span>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 line-clamp-1">
            {asset.location || 'ثبت نشده'}
          </p>
        </div>
      </div>
    </div>
  );
};
