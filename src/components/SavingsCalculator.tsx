import React from 'react';
import { TrendingDown, PiggyBank, Calendar, Info } from 'lucide-react';
import { DataTruthBadge } from './common/DataTruthBadge';

interface SavingsCalculatorProps {
  monthlyKwh: number;
  totalCost: number;
  targets: string[];
}

export default function SavingsCalculator({ monthlyKwh, totalCost, targets }: SavingsCalculatorProps) {
  // If not solar, savings calculation is different or not applicable (e.g., generator is for backup, not savings)
  if (!targets.includes('solar')) {
    return null;
  }

  // Rough estimate for electricity price per kWh in IRR (stepped tariff average)
  // Reference assumption: 1,500 IRR (150 Toman) per kWh
  const estimatedPricePerKwh = 1500; 
  
  const monthlySavingsIRR = monthlyKwh * estimatedPricePerKwh;
  const yearlySavingsIRR = monthlySavingsIRR * 12;
  
  // Calculate ROI in years
  const roiYears = totalCost > 0 ? (totalCost / yearlySavingsIRR) : 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-right space-y-4" dir="rtl">
      {/* Header with explicit Context and Truth Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PiggyBank size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-2">
              <span>ارزیابی صرفه‌جویی در قبوض برق</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                سناریوی صرفه‌جویی قبض
              </span>
            </h3>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              صرفاً بر مبنای تعرفه متوسط مصرف شبکه (تعرفه مرجع)
            </span>
          </div>
        </div>

        <DataTruthBadge type="REFERENCE_ESTIMATE" size="sm" />
      </div>
      
      {/* 2 Comparative Economic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card A: Reference Annual Bill Savings */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl p-3.5 sm:p-4 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <TrendingDown size={14} className="text-emerald-500 dark:text-emerald-400" />
              <span>صرفه‌جویی سالانه در قبض</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
              مرجع تعرفه
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
            <span dir="ltr" className="font-mono">{(yearlySavingsIRR / 10).toLocaleString()}</span>
            <span className="text-xs font-normal text-zinc-500">تومان/سال</span>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
            کاهش مستقیم بهای برق مصرفی شبکه
          </p>
        </div>

        {/* Card B: Contextualized Reference Simple Payback */}
        <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-700/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-[#0284C7] dark:text-blue-400" />
              <span>دوره بازگشت بر مبنای صرفه‌جویی قبض با تعرفه مرجع</span>
            </span>
            <span className="text-[10px] text-zinc-600 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded">
              سناریوی قبض
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
            {roiYears > 0 ? (
              <>
                <span dir="ltr" className="font-mono">{roiYears.toFixed(1)}</span>
                <span className="text-xs font-normal text-zinc-500">سال</span>
              </>
            ) : (
              <span className="text-sm font-medium text-zinc-500">اطلاعات ناکافی</span>
            )}
          </div>
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
            محاسبه صرفاً بر مبنای تعرفه یارانه مصرف
          </p>
        </div>
      </div>

      {/* Critical Truth & Financial Context Disclosure */}
      <div className="flex items-start gap-2.5 p-3.5 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed border border-amber-200/70 dark:border-amber-900/40">
        <Info size={15} className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="space-y-1">
          <strong className="block font-bold text-amber-900 dark:text-amber-300">
            توضیح ضروری مفروضات اقتصادی و دوره بازگشت سرمایه:
          </strong>
          <p>
            • عدد فوق (دوره بازگشت سرمایه) <strong>صرفاً یک سناریوی صرفه‌جویی قبض</strong> بر مبنای تعرفه مرجع ({estimatedPricePerKwh.toLocaleString('fa-IR')} ریال بر کیلووات‌ساعت یارانه دولتی) است و بیانگر بازدهی کلی سرمایه‌گذاری نیروگاهی نیست.
          </p>
          <p>
            • این برآورد نشان‌دهنده قرارداد خرید تضمینی برق (PPA ساتبا)، درآمد گواهی برق تجدیدپذیر، ماده ۱۶ صنایع، تسهیلات بانکی، یا الگوهای فروش تجاری نیست. هر یک از این ساختارهای تجاری نیازمند مدل‌سازی مالی مستقل خود می‌باشند.
          </p>
        </div>
      </div>
    </div>
  );
}
