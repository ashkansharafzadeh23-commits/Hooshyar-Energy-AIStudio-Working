import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, ArrowLeft } from 'lucide-react';
import { EnergyAsset } from '../../types/asset';
import { DashboardAssetCard } from './DashboardAssetCard';

interface OperationalAssetsProps {
  assets: EnergyAsset[];
  className?: string;
}

export const OperationalAssets: React.FC<OperationalAssetsProps> = ({
  assets,
  className = ''
}) => {
  // CRITICAL REQUIREMENT: Only display this section when the user actually has operational assets
  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby="operational-assets-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sun size={18} strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <h2 id="operational-assets-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              نیروگاه‌های در بهره‌برداری
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {assets.length}
            </span>
          </div>
        </div>

        <Link
          to="/solar-assets"
          className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1 min-h-[44px] px-2"
        >
          <span>مشاهده همه دارایی‌ها</span>
          <ArrowLeft size={14} />
        </Link>
      </div>

      <div className="space-y-3">
        {assets.map((asset) => (
          <DashboardAssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </section>
  );
};
