import React, { useState } from 'react';
import { DollarSign, TrendingUp, Calculator, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancialOverviewProps {
  estimatedCostIRR?: number | null;
  annualSavingsIRR?: number | null;
  simplePaybackYears?: number | null;
  capacityKwp?: number;
  monthlyConsumptionKwh?: number;
  onCompleteFinancialAnalysis?: () => void;
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({
  estimatedCostIRR,
  annualSavingsIRR,
  simplePaybackYears,
  capacityKwp,
  monthlyConsumptionKwh,
  onCompleteFinancialAnalysis
}) => {
  const hasCost = estimatedCostIRR !== null && estimatedCostIRR !== undefined && estimatedCostIRR > 0;
  const hasSavings = annualSavingsIRR !== null && annualSavingsIRR !== undefined && annualSavingsIRR > 0;
  const hasPayback = simplePaybackYears !== null && simplePaybackYears !== undefined && simplePaybackYears > 0;

  // Format in Iranian Tomans
  const formatTomans = (irr: number) => {
    const tomans = irr / 10;
    if (tomans >= 1_000_000_000) {
      return `${(tomans / 1_000_000_000).toFixed(1)} میلیارد تومان`;
    }
    if (tomans >= 1_000_000) {
      return `${Math.round(tomans / 1_000_000).toLocaleString('fa-IR')} میلیون تومان`;
    }
    return `${Math.round(tomans).toLocaleString('fa-IR')} تومان`;
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-right" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={18} />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              برآورد اولیه مالی و اقتصادی
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ارزیابی سرمایه‌گذاری اولیه و صرفه‌جویی
            </span>
          </div>
        </div>

        <DataTruthBadge type="CALCULATED" size="sm" />
      </div>

      {/* 3 Clear Categories: Input Data, Computational Assumptions, Calculated Outputs */}
      <div className="space-y-4 mb-5">
        {/* 1. داده ورودی (Inputs) */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              داده‌های ورودی شما
            </span>
            <DataTruthBadge type="USER_PROVIDED" size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">مصرف دوره: </span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {monthlyConsumptionKwh ? `${monthlyConsumptionKwh.toLocaleString('fa-IR')} kWh/ماه` : 'اعلام‌نشده'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">ظرفیت مد نظر: </span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">
                {capacityKwp ? `${capacityKwp.toLocaleString('fa-IR')} کیلووات` : 'محاسبه‌نشده'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. فرض محاسباتی (Computational Assumptions) */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
              مفروضات محاسباتی
            </span>
            <DataTruthBadge type="MARKET" size="sm" />
          </div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
            <div>• استعلام قیمت نهایی بر اساس کاتالوگ تجهیزات و پیشنهاد پیمانکار انجام می‌شود.</div>
            <div>• ارزیابی دقیق بازگشت سرمایه نیازمند مشخص بودن تعرفه مصرف و نوع قرارداد است.</div>
          </div>
        </div>

        {/* 3. نتیجه محاسبه (Calculated Results) */}
        {hasCost ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 block mb-1">
                سرمایه‌گذاری تقریبی تجهیز و اجرا
              </span>
              <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                {formatTomans(estimatedCostIRR!)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                دوره بازگشت سرمایه برآوردی
              </span>
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {hasPayback ? `${simplePaybackYears!.toLocaleString('fa-IR')} سال` : 'اطلاعات کافی برای محاسبه دوره بازگشت سرمایه موجود نیست.'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2">
            <AlertCircle size={16} className="text-zinc-400 shrink-0 mt-0.5" />
            <div>
              <strong>برای محاسبه دقیق‌تر اقتصادی، اطلاعات مالی بیشتری مورد نیاز است.</strong>
              <p className="mt-1">
                قیمت دقیق پس از تعیین برند پنل‌ها و اینورتر، هزینه‌های ترابری و بازدید کارشناسی تعیین می‌شود.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Completion CTA */}
      {onCompleteFinancialAnalysis && (
        <button
          type="button"
          onClick={onCompleteFinancialAnalysis}
          className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>تکمیل تحلیل مالی و دریافت جدول بازگشت سرمایه</span>
          <ArrowLeft size={14} />
        </button>
      )}
    </div>
  );
};
