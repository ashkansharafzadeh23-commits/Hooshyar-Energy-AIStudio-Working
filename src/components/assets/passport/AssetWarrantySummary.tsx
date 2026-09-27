import React from 'react';
import { EquipmentWarranty } from '../../../types/asset';
import { ShieldCheck, Clock, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface AssetWarrantySummaryProps {
  warranties: EquipmentWarranty[];
  loading?: boolean;
  className?: string;
}

export const AssetWarrantySummary: React.FC<AssetWarrantySummaryProps> = ({
  warranties,
  loading = false,
  className = ''
}) => {
  const getWarrantyStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: 'معتبر و فعال',
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'EXPIRING':
        return {
          label: 'نزدیک به اتمام',
          className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'EXPIRED':
        return {
          label: 'منقضی شده',
          className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      default:
        return {
          label: status || 'وضعیت نامشخص',
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
        };
    }
  };

  const getWarrantyTypeLabel = (type: string) => {
    switch (type) {
      case 'PRODUCT':
        return 'گارانتی سلامت فیزیکی محصول (Product Warranty)';
      case 'PERFORMANCE':
        return 'ضمانت راندمان و عملکرد (Performance Guarantee)';
      case 'INVERTER':
        return 'ضمانت کارکرد اینورتر (Inverter Warranty)';
      case 'EPC':
        return 'تضمین حسن انجام کار پیمانکار (EPC Workmanship)';
      case 'O_AND_M':
        return 'تعهدات قرارداد بهره‌برداری و نگهداری';
      default:
        return type || 'ضمانت‌نامه';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'ثبت نشده';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>ضمانت‌نامه‌ها و گارانتی‌های ثبت‌شده ({warranties.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            سوابق ضمانت تجهیزات و تعهدات تولیدکننده و پیمانکار مجری
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری اطلاعات ضمانت‌نامه‌ها...
        </div>
      ) : warranties.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
            اطلاعات گارانتی برای این دارایی ثبت نشده است.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            برگه‌های ضمانت رسمی پس از تحویل نهایی و دریافت گواهی از سازندگان در این بخش نمایه می‌شوند.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {warranties.map((w) => {
            const badge = getWarrantyStatusBadge(w.status);

            return (
              <div
                key={w.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                      {getWarrantyTypeLabel(w.warrantyType)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    ارائه‌دهنده: {w.warrantyProvider || w.provider || w.vendorName || 'سازنده / پیمانکار'}
                  </h4>

                  {w.coverageSummary && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1">
                      {w.coverageSummary}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span>آغاز: {formatDate(w.startDate)}</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                    پایان: {formatDate(w.endDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
