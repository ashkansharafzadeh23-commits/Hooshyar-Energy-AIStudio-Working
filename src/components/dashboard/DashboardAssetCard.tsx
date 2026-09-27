import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Activity, ArrowLeft, Wrench } from 'lucide-react';
import { EnergyAsset } from '../../types/asset';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { formatSolarCapacity } from '../../utils/formatters';

interface DashboardAssetCardProps {
  asset: EnergyAsset;
}

export const DashboardAssetCard: React.FC<DashboardAssetCardProps> = ({ asset }) => {
  // Check telemetry connection status
  // In our domain model, verified telemetry is indicated by live telemetry reports
  const isTelemetryLive = asset.operationalStatus === 'OPERATIONAL' && asset.source === 'TELEMETRY_CONNECTED';
  const isMaintenanceActive = asset.operationalStatus === 'UNDER_MAINTENANCE' || asset.status === 'UNDER_MAINTENANCE';

  return (
    <Link
      to={`/solar-assets/${asset.id}`}
      className="group block p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all min-h-[44px]"
      aria-label={`نیروگاه ${asset.name}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
              {asset.assetCode || 'AST-IR'}
            </span>

            {/* Monitoring Status Badge */}
            {isTelemetryLive ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                پایش برخط فعال
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                پایش برخط فعال نیست
              </span>
            )}

            {isMaintenanceActive && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                <Wrench size={12} />
                تحت نگهداری
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {asset.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">
          <span>شناسنامه دارایی</span>
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
        </div>
      </div>

      {/* Capacity & Verified Facts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">ظرفیت نامی نیروگاه</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {formatSolarCapacity(asset.installedCapacityKw)}
          </span>
        </div>

        <div>
          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">موقعیت جغرافیایی</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {asset.location || 'ثبت نشده'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 dark:text-slate-400 block mb-0.5">وضعیت خاستگاه داده</span>
          <DataTruthBadge
            type={isTelemetryLive ? 'REAL' : 'MISSING'}
            size="sm"
          />
        </div>
      </div>
    </Link>
  );
};
