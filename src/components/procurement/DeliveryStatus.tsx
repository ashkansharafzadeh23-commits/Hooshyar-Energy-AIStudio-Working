import React from 'react';
import { Delivery, DeliveryInspection, PurchaseOrder } from '../../types/procurement';
import { formatJalaliDate } from '../../utils/formatters';
import { CommercialEmptyState } from './CommercialEmptyState';
import { Truck, CheckCircle2, Clock, AlertTriangle, ShieldCheck, PackageCheck, AlertCircle } from 'lucide-react';

interface DeliveryStatusProps {
  deliveries: Delivery[];
  purchaseOrders: PurchaseOrder[];
  isOwnerOrEPC: boolean;
  className?: string;
}

export const DeliveryStatus: React.FC<DeliveryStatusProps> = ({
  deliveries,
  purchaseOrders,
  isOwnerOrEPC,
  className = ''
}) => {
  const deliveryStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
    PLANNED: { label: 'برنامه‌ریزی‌شده', bg: 'bg-slate-100 dark:bg-zinc-800', text: 'text-slate-700 dark:text-zinc-300' },
    DISPATCHED: { label: 'ارسال‌شده از انبار مبدأ', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
    IN_TRANSIT: { label: 'در حال حمل جاده‌ای', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
    ARRIVED_AT_SITE: { label: 'وارد کارگاه پروژه شد', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
    INSPECTED: { label: 'بازرسی و کنترل کیفیت شد', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300' },
    ACCEPTED: { label: 'تأیید و تحویل انبار پروژه شد', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300' },
    REJECTED: { label: 'مردود به دلیل عدم انطباق', bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-800 dark:text-rose-300' },
    PARTIALLY_ACCEPTED: { label: 'پذیرش مشروط با مغایرت', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' }
  };

  if (!deliveries || deliveries.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <CommercialEmptyState
          title="هنوز محموله‌ای برای این پروژه ارسال یا ثبت نشده است."
          description="پس از صدور سفارش خرید و ارسال کالا توسط فروشندگان، اطلاعات بارنامه، زمان‌بندی ورود به کارگاه و وضعیت بازرسی در این بخش قابل رصد خواهد بود."
          helpNotice={
            purchaseOrders.length > 0
              ? `${purchaseOrders.length} سفارش خرید رسمی در جریان است و در انتظار خروج محموله از انبار مبدأ می‌باشد.`
              : 'ابتدا از بخش تأمین تجهیزات، نسبت به صدور سفارش خرید اقدام فرمایید.'
          }
          icon="package"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100">
            ردیابی محموله‌ها و تحویل در کارگاه ({deliveries.length} محموله)
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            وضعیت واقعی حمل، بارنامه، تاریخ ورود به سایت و کنترل کیفی تجهیزات
          </p>
        </div>
      </div>

      {/* Deliveries list */}
      <div className="space-y-3">
        {deliveries.map(delivery => {
          const cfg = deliveryStatusConfig[delivery.status] || deliveryStatusConfig.PLANNED;

          return (
            <div
              key={delivery.id}
              className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      محموله: {delivery.deliveryNumber || delivery.id.substring(0, 8)}
                    </h5>
                    <span className="text-[11px] text-slate-400">
                      شماره بارنامه: {delivery.waybillNumber || 'ثبت نشده'}
                    </span>
                  </div>
                </div>

                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>

              {/* Delivery Facts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">شرکت حمل:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {delivery.carrierName || 'ثبت نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">تاریخ ارسال:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {delivery.dispatchDate ? formatJalaliDate(delivery.dispatchDate) : 'ثبت نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">ورود به کارگاه:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {delivery.actualArrivalDate ? formatJalaliDate(delivery.actualArrivalDate) : 'در مسیر'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">رسید انبار / تحویل‌گیرنده:</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    {delivery.receivedBy || 'در انتظار تحویل'}
                  </span>
                </div>
              </div>

              {/* Items in delivery */}
              {delivery.items && delivery.items.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
                  <span className="text-slate-500 font-semibold mb-1 block">اقلام این محموله:</span>
                  <div className="flex flex-wrap gap-2">
                    {delivery.items.map((item, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
                        {item.quantityDispatched} {item.unit}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
