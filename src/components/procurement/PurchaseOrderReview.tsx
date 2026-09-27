import React, { useState } from 'react';
import { PurchaseOrder, VendorQuote } from '../../types/procurement';
import { formatCurrencyIRR, formatJalaliDate } from '../../utils/formatters';
import { DataTruthBadge } from '../common/DataTruthBadge';
import { ShoppingBag, FileSignature, CheckCircle2, Clock, Truck, ShieldCheck, X } from 'lucide-react';

interface PurchaseOrderReviewProps {
  quote?: VendorQuote;
  existingPO?: PurchaseOrder;
  isSubmitting?: boolean;
  onConfirmIssuePO?: (data: {
    deliveryAddress: string;
    deliveryExpectedDate: string;
    paymentTerms: string;
    specialInstructions: string;
  }) => void;
  onClose: () => void;
  className?: string;
}

export const PurchaseOrderReview: React.FC<PurchaseOrderReviewProps> = ({
  quote,
  existingPO,
  isSubmitting = false,
  onConfirmIssuePO,
  onClose,
  className = ''
}) => {
  const [deliveryAddress, setDeliveryAddress] = useState('محل اجرای پروژه نیروگاه');
  const [deliveryDays, setDeliveryDays] = useState(quote?.deliveryLeadTimeDays || 14);
  const [paymentTerms, setPaymentTerms] = useState(quote?.paymentTerms || 'پرداخت طبق پیش‌فاکتور تایید شده');
  const [specialInstructions, setSpecialInstructions] = useState('ارائه مدارک اصالت کالا و گواهی آزمون کارخانه هنگام تحویل الزامی است.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onConfirmIssuePO) return;
    const expectedDate = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString();
    onConfirmIssuePO({
      deliveryAddress,
      deliveryExpectedDate: expectedDate,
      paymentTerms,
      specialInstructions
    });
  };

  // If existing PO is passed, render confirmed PO view
  if (existingPO) {
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                سفارش خرید رسمی (PO)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                شماره: {existingPO.orderNumber || existingPO.id.substring(0, 8)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400 cursor-pointer min-h-[44px] px-2 flex items-center"
          >
            بستن
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 space-y-3 text-xs mb-5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">وضعیت سفارش:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{existingPO.status}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">مبلغ کل سفارش:</span>
            <span className="font-bold font-mono text-sm text-blue-700 dark:text-blue-300">
              {formatCurrencyIRR(existingPO.totalAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">تاریخ صدور سفارش:</span>
            <span className="font-semibold">{formatJalaliDate(existingPO.issueDate || existingPO.createdAt)}</span>
          </div>
          {existingPO.deliveryExpectedDate && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">تاریخ تحویل مورد انتظار:</span>
              <span className="font-semibold">{formatJalaliDate(existingPO.deliveryExpectedDate)}</span>
            </div>
          )}
        </div>

        {existingPO.items && existingPO.items.length > 0 && (
          <div className="space-y-2 mb-4">
            <h5 className="text-xs font-bold text-slate-800 dark:text-zinc-200">اقلام سفارش ({existingPO.items.length} قلم):</h5>
            <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
              {existingPO.items.map((it, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center bg-white dark:bg-zinc-900">
                  <div>
                    <span className="font-semibold">{it.description || `قلم ۰${idx + 1}`}</span>
                    <span className="text-slate-400 mr-2 font-mono">({it.quantity} {it.unit})</span>
                  </div>
                  <div className="font-mono font-bold">{formatCurrencyIRR(it.totalPrice)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Issuance modal/card
  if (!quote) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs ${className}`}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 max-w-lg w-full shadow-xl relative animate-in fade-in">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 left-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
              تنظیم و صدور سفارش خرید (PO)
            </h3>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              تبدیل پیش‌فاکتور فروشنده به سفارش خرید رسمی
            </span>
          </div>
        </div>

        {/* Financial Recap */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800 my-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">فروشنده:</span>
            <span className="font-bold">{quote.vendorId ? `فروشنده ${quote.vendorId.substring(0, 8)}` : 'تأمین‌کننده تجهیزات'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">مبلغ سفارش:</span>
            <span className="font-bold font-mono text-sm text-blue-700 dark:text-blue-300">
              {quote.totalPrice ? formatCurrencyIRR(quote.totalPrice) : 'ارائه نشده'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-800 dark:text-zinc-200 mb-1">
              محل تحویل تجهیزات
            </label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-zinc-200 mb-1">
              مهلت تحویل (روز کاری)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(Number(e.target.value))}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-zinc-200 mb-1">
              دستورالعمل تحویل و بازرسی
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold cursor-pointer min-h-[44px]"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              {isSubmitting ? 'در حال صدور...' : 'تأیید و صدور نهایی سفارش (PO)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
