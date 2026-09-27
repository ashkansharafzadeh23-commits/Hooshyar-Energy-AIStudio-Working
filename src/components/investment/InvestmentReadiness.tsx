import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HelpCircle,
  FileCheck,
  Shield,
  Layers,
  Building,
  Zap,
  DollarSign
} from 'lucide-react';
import { ProjectReadinessScore } from '../../types/investment';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface InvestmentReadinessProps {
  readiness?: ProjectReadinessScore | null;
  projectStatus?: string;
  className?: string;
}

export type ReadinessItemStatus = 'COMPLETE' | 'INCOMPLETE' | 'UNDER_REVIEW' | 'NOT_RECORDED';

interface ReadinessDimension {
  id: string;
  label: string;
  status: ReadinessItemStatus;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const InvestmentReadiness: React.FC<InvestmentReadinessProps> = ({
  readiness,
  projectStatus,
  className = ''
}) => {
  const breakdown = readiness?.scoreBreakdown || readiness?.breakdown;
  const missingItems = readiness?.missingItems || [];

  // Map factual dimensions from deterministic breakdown if available
  const dimensions: ReadinessDimension[] = [
    {
      id: 'project-identity',
      label: 'شناسنامه و هویت طرح',
      status: (breakdown?.documents !== undefined && breakdown.documents > 0) ? 'COMPLETE' : 'COMPLETE',
      detail: 'عنوان، کد سیستمی و ساختار حقوقی پروژه',
      icon: Building
    },
    {
      id: 'location-land',
      label: 'ساختگاه و وضعیت زمین',
      status: (breakdown?.land !== undefined)
        ? (breakdown.land >= 10 ? 'COMPLETE' : (breakdown.land > 0 ? 'UNDER_REVIEW' : 'INCOMPLETE'))
        : 'UNDER_REVIEW',
      detail: 'مساحت، سند/قرارداد اجاره، توپوگرافی و دسترسی ساختگاه',
      icon: Layers
    },
    {
      id: 'technical-analysis',
      label: 'شبیه‌سازی فنی و تابش',
      status: (breakdown?.technical !== undefined)
        ? (breakdown.technical >= 10 ? 'COMPLETE' : (breakdown.technical > 0 ? 'UNDER_REVIEW' : 'INCOMPLETE'))
        : 'UNDER_REVIEW',
      detail: 'محاسبه پتانسیل تولید کیلووات‌ساعت، تجهیزات و تلفات اقلیمی',
      icon: Zap
    },
    {
      id: 'financial-model',
      label: 'مدل مالی و جریان نقدی',
      status: (breakdown?.financial !== undefined)
        ? (breakdown.financial >= 10 ? 'COMPLETE' : (breakdown.financial > 0 ? 'UNDER_REVIEW' : 'INCOMPLETE'))
        : 'INCOMPLETE',
      detail: 'برآورد هزینه‌های سرمایه‌ای (CAPEX) و درآمد دوره‌ای',
      icon: DollarSign
    },
    {
      id: 'permits-grid',
      label: 'مجوزها و اتصال به شبکه',
      status: (breakdown?.grid !== undefined && breakdown?.permit !== undefined)
        ? ((breakdown.grid > 0 && breakdown.permit > 0) ? 'COMPLETE' : 'INCOMPLETE')
        : 'INCOMPLETE',
      detail: 'پروانه احداث، موافقت اتصال به شبکه برق منطقه‌ای/توزیع',
      icon: FileCheck
    },
    {
      id: 'epc-contractor',
      label: 'پیمانکار مجری و استعلام (EPC)',
      status: (breakdown?.epc !== undefined)
        ? (breakdown.epc >= 10 ? 'COMPLETE' : (breakdown.epc > 0 ? 'UNDER_REVIEW' : 'NOT_RECORDED'))
        : (projectStatus === 'EPC_SELECTED' ? 'COMPLETE' : 'NOT_RECORDED'),
      detail: 'استعلام قیمت، پیمانکار منتخب و پیش‌نویس قرارداد',
      icon: Shield
    }
  ];

  const statusConfig: Record<ReadinessItemStatus, { label: string; bg: string; text: string; icon: any }> = {
    COMPLETE: {
      label: 'کامل',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: CheckCircle2
    },
    INCOMPLETE: {
      label: 'ناقص',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300',
      icon: AlertCircle
    },
    UNDER_REVIEW: {
      label: 'در انتظار بررسی',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: Clock
    },
    NOT_RECORDED: {
      label: 'ثبت نشده',
      bg: 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700',
      text: 'text-slate-600 dark:text-zinc-400',
      icon: HelpCircle
    }
  };

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              ارزیابی آمادگی سرمایه‌گذاری طرح (Investment Readiness)
            </h3>
            <DataTruthBadge provenance="CALCULATED" />
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            بررسی مستندات مهندسی، حقوقی و مالی جهت اعلام عمومی به طرف‌های تجاری
          </p>
        </div>

        {readiness?.score !== undefined && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 shrink-0">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">شاخص سیستمی:</span>
            <span className="text-sm font-black text-slate-900 dark:text-zinc-100 font-mono">
              {readiness.score} از ۱۰۰
            </span>
          </div>
        )}
      </div>

      {/* Grid of Dimension Checkpoints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {dimensions.map((dim) => {
          const cfg = statusConfig[dim.status];
          const StatusIcon = cfg.icon;
          const DimIcon = dim.icon;

          return (
            <div
              key={dim.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/30 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 shrink-0">
                    <DimIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    {dim.label}
                  </span>
                </div>

                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg.bg} ${cfg.text} shrink-0`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{cfg.label}</span>
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                {dim.detail}
              </p>
            </div>
          );
        })}
      </div>

      {/* Missing Requirements List if any */}
      {missingItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>نیازمندی‌های تکمیل پرونده پیش از ورود به مذاکرات سرمایه‌گذاری:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-amber-800 dark:text-amber-300 pr-2">
            {missingItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
