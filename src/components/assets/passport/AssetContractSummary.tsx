import React from 'react';
import { EnergyAsset } from '../../../types/asset';
import { FileText, Calendar, Building, CreditCard, ShieldCheck } from 'lucide-react';

interface AssetContractSummaryProps {
  contract: any | null;
  parties?: any[];
  loading?: boolean;
  className?: string;
}

export const AssetContractSummary: React.FC<AssetContractSummaryProps> = ({
  contract,
  loading = false,
  className = ''
}) => {
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return 'ثبت نشده';
    return `${val.toLocaleString('fa-IR')} ریال`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  if (!contract) {
    return (
      <div className={`p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800 ${className}`}>
        <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
          قرارداد احداث برای این دارایی ثبت نشده است.
        </p>
      </div>
    );
  }

  // Contract title must never be replaced with an invented fallback
  const contractTitle = contract.title || 'عنوان قرارداد ثبت نشده است';

  // Value must preserve explicit numeric zero
  const contractValue = contract.revisedContractValue ?? contract.contractValue;

  const getContractStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: 'فعال',
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'COMPLETED':
        return {
          label: 'تکمیل‌شده',
          className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'DRAFT':
        return {
          label: 'پیش‌نویس',
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
        };
      case 'CANCELLED':
        return {
          label: 'لغوشده',
          className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      default:
        return {
          label: status ? `وضعیت: ${status}` : 'وضعیت قرارداد ثبت نشده است',
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
        };
    }
  };

  const statusBadge = getContractStatusBadge(contract.status);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>خلاصه مشخصات قرارداد احداث</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            مشخصات حقوقی و مالی قرارداد مبنای ایجاد دارایی
          </p>
        </div>

        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border self-start sm:self-auto ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
        <div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mb-0.5">عنوان قرارداد:</span>
          <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">
            {contractTitle}
          </div>
          {contract.contractNumber && (
            <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
              شماره قرارداد: {contract.contractNumber}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs">
          <div>
            <span className="text-slate-400 dark:text-zinc-500 block mb-1">مبلغ قرارداد:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">
              {formatCurrency(contractValue)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-zinc-500 block mb-1">پیمانکار / مجری:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">
              {contract.contractorName || (contract.contractorId ? `پیمانکار #${contract.contractorId}` : 'ثبت نشده')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-zinc-500 block mb-1">تاریخ ابلاغ / شروع:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">
              {formatDate(contract.startDate || contract.signedAt)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-zinc-500 block mb-1">تاریخ پایان برنامه‌ای:</span>
            <span className="font-bold text-slate-800 dark:text-zinc-200">
              {formatDate(contract.targetEndDate || contract.endDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
