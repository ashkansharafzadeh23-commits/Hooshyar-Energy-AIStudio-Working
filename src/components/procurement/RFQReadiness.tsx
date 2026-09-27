import React from 'react';
import { EnergyProject } from '../../types/project';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { CheckCircle2, AlertTriangle, ArrowLeft, FileText, Zap, MapPin, Building, ShieldCheck } from 'lucide-react';

interface RFQReadinessProps {
  project: EnergyProject;
  onProceedToRFQ: () => void;
  className?: string;
}

export const RFQReadiness: React.FC<RFQReadinessProps> = ({
  project,
  onProceedToRFQ,
  className = ''
}) => {
  // Check genuine project readiness attributes without fabrication
  const hasLocation = Boolean(project.location?.province && project.location?.city);
  const hasCapacity = Boolean(project.targetCapacityKw && project.targetCapacityKw > 0);
  const hasSiteDetails = Boolean(project.site?.areaM2 && project.site.areaM2 > 0);
  const hasTechnicalAnalysis = Boolean(project.sourceAnalysisId || project.engineeringDesignId);
  const hasGridInfo = project.energyRequirement?.gridConnected !== undefined;

  const readinessChecks = [
    {
      id: 'location',
      label: 'موقعیت جغرافیایی و اقلیم',
      detail: hasLocation ? `${project.location.province}، ${project.location.city}` : 'شهر یا استان ثبت نشده است',
      isReady: hasLocation,
      provenance: project.location?.province ? 'USER_PROVIDED' : 'MISSING' as const
    },
    {
      id: 'capacity',
      label: 'ظرفیت هدف نیروگاه',
      detail: hasCapacity ? `${project.targetCapacityKw} کیلووات (kWp)` : 'ظرفیت مشخص نشده است',
      isReady: hasCapacity,
      provenance: hasCapacity ? 'CALCULATED' : 'MISSING' as const
    },
    {
      id: 'site',
      label: 'مشخصات سایت و زمین',
      detail: hasSiteDetails ? `مساحت کل: ${project.site.areaM2} متر مربع ${project.site.usableAreaM2 ? `(مفید: ${project.site.usableAreaM2} متر مربع)` : ''}` : 'مساحت سایت ثبت نشده است',
      isReady: hasSiteDetails,
      provenance: hasSiteDetails ? 'USER_PROVIDED' : 'MISSING' as const
    },
    {
      id: 'analysis',
      label: 'پیوست ارزیابی فنی و تابش خورشیدی',
      detail: hasTechnicalAnalysis ? 'تحلیل مهندسی و تخمین تابش در سامانه متصل است' : 'گزارش ارزیابی فنی هنوز ثبت یا متصل نشده است',
      isReady: hasTechnicalAnalysis,
      provenance: hasTechnicalAnalysis ? 'VERIFIED_SOURCE' : 'MISSING' as const
    },
    {
      id: 'grid',
      label: 'وضعیت اتصال به شبکه برق',
      detail: hasGridInfo ? (project.energyRequirement.gridConnected ? 'متصل به شبکه سراسری (On-Grid)' : 'مستقل از شبکه (Off-Grid)') : 'وضعیت شبکه مشخص نیست',
      isReady: hasGridInfo,
      provenance: hasGridInfo ? 'USER_PROVIDED' : 'MISSING' as const
    }
  ];

  const missingItems = readinessChecks.filter(c => !c.isReady);
  const isFullyReady = missingItems.length === 0;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              سنجش آمادگی پروژه
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            بررسی شرایط انتشار استعلام پیشنهاد (RFQ)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            برای دریافت پیشنهادات دقیق و قابل مقایسه از پیمانکاران EPC، پیش‌نیازهای زیر بررسی می‌شوند.
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onProceedToRFQ}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer min-h-[44px] ${
              isFullyReady
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <span>{isFullyReady ? 'تنظیم استعلام پیمانکار (RFQ)' : 'تکمیل و ادامه با داده‌های موجود'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Basic Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800">
        <div>
          <span className="block text-[11px] text-slate-400 dark:text-zinc-500 mb-0.5">شناسه پروژه</span>
          <span className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200">{project.projectCode}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400 dark:text-zinc-500 mb-0.5">نوع پروژه</span>
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{project.projectType || 'خورشیدی'}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400 dark:text-zinc-500 mb-0.5">کاربری محل</span>
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{project.site?.type || 'نامشخص'}</span>
        </div>
        <div>
          <span className="block text-[11px] text-slate-400 dark:text-zinc-500 mb-0.5">وضعیت چرخه عمر</span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{project.status}</span>
        </div>
      </div>

      {/* Missing Information Notice */}
      {!isFullyReady && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>برای دریافت بهترین نتایج، پیشنهاد می‌شود موارد زیر تکمیل شوند:</span>
          </div>
          <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
            {missingItems.map(item => (
              <li key={item.id}>
                <span className="font-semibold">{item.label}:</span> {item.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist items */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
          وضعیت اقلام پیش‌نیاز
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {readinessChecks.map(check => (
            <div
              key={check.id}
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                check.isReady
                  ? 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                  : 'bg-slate-50/70 dark:bg-zinc-850 border-dashed border-slate-300 dark:border-zinc-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {check.isReady ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                    {check.label}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {check.detail}
                  </p>
                </div>
              </div>

              <DataTruthBadge type={check.provenance as any} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
