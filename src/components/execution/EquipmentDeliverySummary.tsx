import React from 'react';
import { Package, Truck, CheckCircle2, Clock, ShieldCheck, AlertCircle, FileText } from 'lucide-react';

export interface DeliveryItemSummary {
  id: string;
  poNumber?: string;
  trackingNumber?: string;
  carrierName?: string;
  status: string; // 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'INSPECTED' | etc.
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  itemCount?: number;
  supplierName?: string;
}

interface EquipmentDeliverySummaryProps {
  deliveries: DeliveryItemSummary[];
  loading?: boolean;
  onViewProcurement?: () => void;
  className?: string;
}

export const EquipmentDeliverySummary: React.FC<EquipmentDeliverySummaryProps> = ({
  deliveries,
  loading = false,
  onViewProcurement,
  className = ''
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'INSPECTED':
        return {
          label: 'بازرسی شده و مورد تأیید',
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'DELIVERED':
        return {
          label: 'تحویل در سایت (در انتظار بازرسی)',
          className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return {
          label: 'در حال حمل / ارسال شده',
          className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'ORDERED':
      case 'ISSUED':
        return {
          label: 'سفارش صادر شده',
          className: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
        };
      default:
        return {
          label: status || 'وضعیت ثبت نشده',
          className: 'bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
        };
    }
  };

  const inspectedCount = deliveries.filter(d => d.status === 'INSPECTED').length;
  const deliveredCount = deliveries.filter(d => d.status === 'DELIVERED').length;
  const shippedCount = deliveries.filter(d => d.status === 'SHIPPED' || d.status === 'IN_TRANSIT').length;
  const orderedCount = deliveries.filter(d => d.status === 'ORDERED' || d.status === 'ISSUED').length;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              وضعیت تحویل تجهیزات اصلی نیروگاه
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              پیگیری زنجیره تأمین و ورود پنل‌ها، اینورترها و استراکچر به کارگاه
            </p>
          </div>
        </div>

        {onViewProcurement && (
          <button
            onClick={onViewProcurement}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 min-h-[44px] px-2 flex items-center gap-1"
          >
            مدیریت تأمین
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
          در حال بارگذاری وضعیت تأمین...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-50/60 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800">
          <Package className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
            سفارش یا ارسالی برای تجهیزات ثبت نشده است.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
            پس از صدور سفارش خرید در تب تأمین، اطلاعات حمل و تحویل در این بخش نمایش می‌یابد.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Quick status counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 text-center">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">سفارش داده شده</span>
              <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{orderedCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 block">در حال حمل</span>
              <span className="text-sm font-bold text-amber-800 dark:text-amber-300">{shippedCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-center">
              <span className="text-[11px] text-blue-700 dark:text-blue-400 block">رسیده به کارگاه</span>
              <span className="text-sm font-bold text-blue-800 dark:text-blue-300">{deliveredCount}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">تأیید بازرسی شده</span>
              <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{inspectedCount}</span>
            </div>
          </div>

          {/* List of recent deliveries */}
          <div className="space-y-2 pt-1">
            {deliveries.slice(0, 3).map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        {item.poNumber ? `سفارش ${item.poNumber}` : 'محموله تجهیزات'}
                      </span>
                      {item.supplierName && (
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                          ({item.supplierName})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>بارنامه: {item.trackingNumber || 'ثبت نشده'}</span>
                      {item.actualDeliveryDate ? (
                        <span>تاریخ تحویل: {new Date(item.actualDeliveryDate).toLocaleDateString('fa-IR')}</span>
                      ) : item.expectedDeliveryDate ? (
                        <span>تخمین تحویل: {new Date(item.expectedDeliveryDate).toLocaleDateString('fa-IR')}</span>
                      ) : (
                        <span>تاریخ تحویل: در انتظار تعیین</span>
                      )}
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-1 rounded-md border self-start sm:self-center ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
