import React from 'react';
import {
  GeneratorSizingResult as IGeneratorSizingResult,
  SizingConfidenceStatus
} from '../../types/generator';
import {
  Zap,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Info,
  Clock,
  Fuel,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface GeneratorSizingResultProps {
  result: IGeneratorSizingResult;
  onModifyInputs: () => void;
  onClose: () => void;
}

export const GeneratorSizingResult: React.FC<GeneratorSizingResultProps> = ({
  result,
  onModifyInputs,
  onClose
}) => {
  const getStatusBadge = (status: SizingConfidenceStatus) => {
    switch (status) {
      case 'PRELIMINARY_ESTIMATE':
        return {
          label: 'تخمین اولیه استاندارد',
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: <CheckCircle2 size={15} />
        };
      case 'NEEDS_ADDITIONAL_INFORMATION':
        return {
          label: 'نیازمند تکمیل اطلاعات بار',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: <Info size={15} />
        };
      case 'REQUIRES_PROFESSIONAL_REVIEW':
        return {
          label: 'نیازمند کارشناسی تخصصی در محل',
          badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: <AlertTriangle size={15} />
        };
    }
  };

  const statusMeta = getStatusBadge(result.status);

  const getFuelLabel = (f: string) => {
    switch (f) {
      case 'GASOLINE':
        return 'بنزینی';
      case 'NATURAL_GAS':
        return 'گازسوز شهری';
      case 'DIESEL':
        return 'دیزل (گازوئیل)';
      case 'DUAL_FUEL':
        return 'دوگانه‌سوز';
      default:
        return f;
    }
  };

  const getDutyLabel = (d: string) => {
    switch (d) {
      case 'STANDBY_EMERGENCY':
        return 'اضطراری و قطعی برق (Standby)';
      case 'PRIME_POWER':
        return 'کارکرد مکرر و نیمه‌پیوسته (Prime)';
      case 'CONTINUOUS':
        return 'دائم‌کار و کارگاهی (Continuous)';
      default:
        return d;
    }
  };

  return (
    <div dir="rtl" className="space-y-6 text-right">
      {/* Top Confidence Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 flex-wrap ${statusMeta.badgeClass}`}>
        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
          {statusMeta.icon}
          <span>سطح اطمینان برآورد: {statusMeta.label}</span>
        </div>
        <span className="text-[11px] opacity-80">
          محاسبه مجزا بر اساس ضریب توان {result.powerFactor}
        </span>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Recommended Capacity */}
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-right space-y-1">
          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">ظرفیت ژنراتور پیشنهادی (kVA)</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-200">
            {result.preliminaryRecommendedKva !== null ? `${result.preliminaryRecommendedKva} kVA` : 'نامشخص'}
          </div>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 block">
            {result.preliminaryRecommendedKw !== null ? `معادل حدود ${result.preliminaryRecommendedKw} کیلووات مفید` : 'نیازمند بازبینی'}
          </span>
        </div>

        {/* Essential Running Load */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 text-right space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">مجموع بار کاری پیوسته (kW)</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
            {result.totalRunningKw} kW
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
            {result.totalRunningWatts.toLocaleString('fa-IR')} وات همزمان
          </span>
        </div>

        {/* Phase & Power Factor */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700/60 text-right space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">نوع مدار و فازبندی</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
            {result.phase === 'SINGLE_PHASE' ? 'تک‌فاز ۲۳۰ ولت' : result.phase === 'THREE_PHASE' ? 'سه‌فاز ۴۰۰ ولت' : 'نامشخص'}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
            ضریب توان: {result.powerFactor}
          </span>
        </div>
      </div>

      {/* Motor Inrush & Starting Demand Callout */}
      {result.hasMotorLoads && (
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
            <Activity size={16} className="text-blue-600 dark:text-blue-400" />
            <span>رفتار جریان راه‌اندازی موتورها (تقاضای استارت):</span>
          </div>
          <p className="text-xs text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
            {result.estimatedPeakStartingKva
              ? `تقاضای تخمینی در زمان استارت متوالی بزرگترین الکتروموتور: حدود ${result.estimatedPeakStartingKva} kVA محاسبه گردید. قابلیت واقعی ژنراتور برای استارت این بارها تاییدنشده است و انتخاب قطعی ژنراتور باید بر اساس دیتاشیت و افت ولتاژ مجاز آلترناتور سازنده توسط کارشناس برق تایید شود.`
              : 'الکتروموتور در فهرست بارهای ضروری وجود دارد اما ضریب استارت آن نامشخص است.'}
          </p>
          {result.hasUnknownMotorStarting && (
            <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
              توجه: نوع راه‌انداز موتورها (DOL یا سافت‌استارتر) نامشخص است؛ انتخاب نهایی نیازمند سنجش جریان هجومی واقعی می‌باشد.
            </div>
          )}
        </div>
      )}

      {/* Missing Inputs or Warnings */}
      {result.missingInputs.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
            <Info size={16} className="text-amber-600 dark:text-amber-400" />
            <span>اطلاعات فنی ناقص جهت قطعی‌سازی توان:</span>
          </div>
          <ul className="list-disc pr-5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            {result.missingInputs.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions & Operational Scope */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-700/60 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Layers size={16} className="text-[#0284C7]" />
          <span>مفروضات فنی و کاربرد عملیاتی:</span>
        </div>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pr-2">
          <li><strong>کاربرد ژنراتور:</strong> {getDutyLabel(result.dutyType)}</li>
          <li><strong>سوخت‌های منتخب:</strong> {result.availableFuels.map(getFuelLabel).join('، ') || 'نامشخص'}</li>
          {result.requiredBackupHours && <li><strong>مدت زمان مورد انتظار برق پشتیبان:</strong> {result.requiredBackupHours} ساعت در هر بار قطعی</li>}
          {result.assumptions.map((assump, idx) => (
            <li key={idx}>{assump}</li>
          ))}
        </ul>
      </div>

      {/* Mandatory Electrical Safety & Carbon Monoxide Alert */}
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200">
          <ShieldAlert size={17} className="text-rose-600 dark:text-rose-400" />
          <span>الزامات ایمنی، تهویه و جداسازی الکتریکی:</span>
        </div>
        <ul className="list-disc pr-5 text-[11px] sm:text-xs text-rose-900 dark:text-rose-300 space-y-1 leading-relaxed">
          {result.safetyNotices.map((sn, idx) => (
            <li key={idx}>{sn}</li>
          ))}
        </ul>
      </div>

      {/* Disclaimers */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed border-t border-slate-100 dark:border-zinc-800 pt-3">
        {result.disclaimers.map((disc, idx) => (
          <p key={idx}>• {disc}</p>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800 flex-wrap">
        <button
          type="button"
          onClick={onModifyInputs}
          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold transition-colors cursor-pointer min-h-[42px]"
        >
          ویرایش و تغییر بارهای برقی
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer min-h-[42px]"
        >
          بازگشت به نتایج خورشیدی
        </button>
      </div>
    </div>
  );
};
