import React from 'react';
import { Coins, DollarSign, PieChart, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import { FinancingRequest, FinancingApplication } from '../../types/financing';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface FinancingNeedSummaryProps {
  request?: FinancingRequest | Partial<FinancingApplication> | null;
  onEdit?: () => void;
  onRequestNew?: () => void;
}

export const FinancingNeedSummary: React.FC<FinancingNeedSummaryProps> = ({
  request,
  onEdit,
  onRequestNew
}) => {
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null || val <= 0) return 'ثبت نشده';
    if (val >= 1000000000) {
      return `${(val / 1000000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} میلیارد تومان`;
    }
    if (val >= 1000000) {
      return `${(val / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 0 })} میلیون تومان`;
    }
    return `${val.toLocaleString('fa-IR')} تومان`;
  };

  const requestedAmount = (request as any)?.requestedAmount || (request as any)?.financingRequested;
  const totalCost = request?.totalProjectCost;
  const ownerEquity = request?.ownerEquity;

  // Real debt ratio only if both valid
  const equityPercentage = (totalCost && ownerEquity && totalCost > 0)
    ? Math.round((ownerEquity / totalCost) * 100)
    : null;

  const debtPercentage = (totalCost && requestedAmount && totalCost > 0)
    ? Math.round((requestedAmount / totalCost) * 100)
    : null;

  const financingTypeLabels: Record<string, string> = {
    PROJECT_LOAN: 'تسهیلات پروژه (طرح احداث)',
    EQUIPMENT_FINANCING: 'تسهیلات خرید تجهیزات (پنل/اینورتر)',
    WORKING_CAPITAL: 'تأمین سرمایه در گردش',
    SYNDICATED_LOAN: 'تسهیلات سندیکایی (کنسرسیوم)',
    ISLAMIC_SUKUK: 'صکوک و اوراق بدهی اسلامی',
    MEZZANINE: 'تأمین مالی تلفیقی (Mezzanine)'
  };

  const repaymentLabels: Record<string, string> = {
    EQUAL_INSTALLMENT: 'اقساط مساوی ماهانه',
    STEP_UP: 'اقساط پلکانی صعودی',
    BALLOON: 'پرداخت یکجا در سررسید (Balloon)',
    SEASONAL: 'اقساط فصلی بر مبنای تابش'
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              خلاصه ساختار مالی و تسهیلات درخواستی
            </h3>
            <DataTruthBadge provenance="USER_PROVIDED" />
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            مقادیر مبنای بررسی اعتباری نهادهای مالی بر اساس مدل و اظهارات کارفرما
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {request ? (
            onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
              >
                ویرایش ارقام مالی
              </button>
            )
          ) : (
            onRequestNew && (
              <button
                type="button"
                onClick={onRequestNew}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
              >
                ثبت پرونده درخواست
              </button>
            )
          )}
        </div>
      </div>

      {/* 3 Core Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Cost */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-zinc-400 block mb-1">
              کل هزینه برآورد شده پروژه (CAPEX)
            </span>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 font-mono">
              {formatMoney(totalCost)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-400">
            بر مبنای استعلام تجهیزات و مطالعات امکان‌سنجی
          </div>
        </div>

        {/* Owner Equity */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 dark:text-zinc-400 block">
                آورده نقدی/غیرنقدی کارفرما (Equity)
              </span>
              {equityPercentage !== null && (
                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 bg-slate-200/80 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                  {equityPercentage}٪
                </span>
              )}
            </div>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 font-mono">
              {formatMoney(ownerEquity)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-400">
            تعهد تأمین سهم متقاضی در صورت تصویب
          </div>
        </div>

        {/* Requested Amount */}
        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-700 dark:text-blue-300 font-bold block">
                مبلغ تسهیلات مورد نیاز (Debt)
              </span>
              {debtPercentage !== null && (
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono">
                  {debtPercentage}٪ از کل طرح
                </span>
              )}
            </div>
            <div className="text-base sm:text-lg font-black text-blue-950 dark:text-blue-100 font-mono">
              {formatMoney(requestedAmount)}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-200/60 dark:border-blue-800/60 text-[11px] text-blue-700 dark:text-blue-400">
            مبلغ مدنظر جهت دریافت از شبکه مالی
          </div>
        </div>
      </div>

      {/* Additional Request Parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/60 dark:bg-zinc-800/20 border border-slate-200/60 dark:border-zinc-800 text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">نوع تسهیلات:</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {request?.financingType ? financingTypeLabels[request.financingType] || request.financingType : 'ثبت نشده'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">دوره بازپرداخت درخواستی:</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
            {request?.requestedTenorMonths ? `${request.requestedTenorMonths} ماه` : 'ثبت نشده'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">دوره تنفس ترجیحی:</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
            {request?.preferredGracePeriodMonths !== undefined ? `${request.preferredGracePeriodMonths} ماه` : 'ثبت نشده'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">شیوه ترجیحی تسویه:</span>
          <span className="font-bold text-slate-800 dark:text-zinc-200">
            {request?.repaymentPreference ? repaymentLabels[request.repaymentPreference] || request.repaymentPreference : 'ثبت نشده'}
          </span>
        </div>
      </div>

      {/* Collateral Summary if present */}
      {request?.collateralSummary && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300 flex items-start gap-2">
          <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <strong className="text-slate-800 dark:text-zinc-200 ml-1">وثایق و تضامین پیشنهادی:</strong>
            <span>{request.collateralSummary}</span>
          </div>
        </div>
      )}
    </div>
  );
};
