import React, { useState } from 'react';
import { EnergyAsset } from '../../types/asset';
import { Zap, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft, ExternalLink, Loader2, Sparkles } from 'lucide-react';

interface ProjectToAssetTransitionProps {
  projectId: string;
  projectCapacityKw?: number;
  commissioningApproved: boolean;
  handoverApproved: boolean;
  existingAsset: EnergyAsset | null;
  onCreateAsset: () => Promise<EnergyAsset>;
  onViewAssetPassport?: (assetId: string) => void;
  loading?: boolean;
  canCreate?: boolean;
  className?: string;
}

export const ProjectToAssetTransition: React.FC<ProjectToAssetTransitionProps> = ({
  projectId,
  projectCapacityKw,
  commissioningApproved,
  handoverApproved,
  existingAsset,
  onCreateAsset,
  onViewAssetPassport,
  loading = false,
  canCreate = true,
  className = ''
}) => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCapacity = typeof projectCapacityKw === 'number' && projectCapacityKw > 0;
  const isEligible = commissioningApproved && handoverApproved && hasCapacity;

  const handleCreate = async () => {
    if (!isEligible || !canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const asset = await onCreateAsset();
      if (asset?.id && onViewAssetPassport) {
        onViewAssetPassport(asset.id);
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در ایجاد شناسنامه دارایی عملیاتی');
    } finally {
      setCreating(false);
    }
  };

  // State 1: Asset already exists
  if (existingAsset) {
    return (
      <div className={`p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                دارایی عملیاتی ایجاد شد
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                کد: {existingAsset.assetCode}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              {existingAsset.name || 'شناسنامه دارایی'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">
              ظرفیت: {existingAsset.installedCapacityKw !== undefined && existingAsset.installedCapacityKw !== null ? `${existingAsset.installedCapacityKw} کیلووات` : 'ثبت نشده'} | تاریخ راه‌اندازی: {existingAsset.commissioningDate ? new Date(existingAsset.commissioningDate).toLocaleDateString('fa-IR') : 'ثبت نشده'}
            </p>
          </div>
        </div>

        {onViewAssetPassport && (
          <button
            onClick={() => onViewAssetPassport(existingAsset.id)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 min-h-[44px] shrink-0 self-start sm:self-center"
          >
            <span>مشاهده شناسنامه دارایی</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // State 2: Not yet an operational asset
  return (
    <div className={`p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-0.5">
              انتقال پروژه به دارایی عملیاتی (Project to Asset Transition)
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              این پروژه هنوز دارایی عملیاتی نیست. پس از تکمیل آزمون‌های راه‌اندازی و صورت‌جلسه تحویل نهایی، امکان ثبت شناسنامه دارایی (Asset Passport) فراهم می‌شود.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 self-start sm:self-auto shrink-0">
          در انتظار تکمیل مراحل
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Gating Requirements list */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
          پیش‌نیازهای قطعی ایجاد دارایی عملیاتی:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            commissioningApproved
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
          }`}>
            {commissioningApproved ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="text-xs font-bold">تأییدیه راه‌اندازی فنی (Commissioning)</span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            handoverApproved
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
          }`}>
            {handoverApproved ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="text-xs font-bold">تأیید صورت‌جلسه تحویل نهایی (Handover)</span>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
            hasCapacity
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
          }`}>
            {hasCapacity ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="text-xs font-bold">
              ظرفیت نامی معین ({projectCapacityKw !== undefined && projectCapacityKw !== null ? `${projectCapacityKw} kW` : 'ثبت نشده'})
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {isEligible && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={creating || loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs min-h-[44px] flex items-center gap-2 transition-all"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ثبت دارایی عملیاتی...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>ایجاد شناسنامه دارایی انرژی (Asset Passport)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
