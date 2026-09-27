import React, { useState } from 'react';
import { BillOfQuantities, BOQItem } from '../../types/procurement';
import { EnergyProject } from '../../types/project';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Send, ShieldCheck, X } from 'lucide-react';

interface VendorRFQBuilderProps {
  project: EnergyProject;
  boq: BillOfQuantities;
  selectedItems: BOQItem[];
  isSubmitting: boolean;
  onSubmit: (rfqData: {
    title: string;
    description: string;
    submissionDeadline: string;
    deliveryLocation: string;
    currency: string;
    deliveryTerm: string;
    warrantyRequirement: string;
    visibility: 'INVITED_ONLY' | 'VERIFIED_VENDORS' | 'PUBLIC_MARKETPLACE';
    boqId: string;
  }) => void;
  onCancel: () => void;
  className?: string;
}

export const VendorRFQBuilder: React.FC<VendorRFQBuilderProps> = ({
  project,
  boq,
  selectedItems,
  isSubmitting,
  onSubmit,
  onCancel,
  className = ''
}) => {
  const [title, setTitle] = useState(`استعلام خرید تجهیزات نیروگاه ${project.title}`);
  const [description, setDescription] = useState('لطفاً مشخصات فنی، برند پیشنهادی، زمان تحویل و قیمت نهایی بر اساس اقلام مندرج ارائه گردد.');
  const [deadlineDays, setDeadlineDays] = useState(10);
  const [deliveryLocation, setDeliveryLocation] = useState(
    project.location?.province && project.location?.city
      ? `محل پروژه در استان ${project.location.province}، شهر ${project.location.city}`
      : 'تحویل در محل پروژه'
  );
  const [deliveryTerm, setDeliveryTerm] = useState('تحویل در محل کارگاه پروژه (DAP)');
  const [warrantyRequirement, setWarrantyRequirement] = useState('حداقل گارانتی معتبر کارخانه سازنده و نمایندگی رسمی');
  const [visibility, setVisibility] = useState<'INVITED_ONLY' | 'VERIFIED_VENDORS' | 'PUBLIC_MARKETPLACE'>('VERIFIED_VENDORS');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const deadlineDate = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString();
    onSubmit({
      title,
      description,
      submissionDeadline: deadlineDate,
      deliveryLocation,
      currency: 'IRR',
      deliveryTerm,
      warrantyRequirement,
      visibility,
      boqId: boq.id
    });
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
            صدور استعلام قیمت تجهیزات از تأمین‌کنندگان (Vendor RFQ)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            مشخصات استعلام را تکمیل کنید تا برای فروشندگان و توزیع‌کنندگان معتبر ارسال شود.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400 cursor-pointer min-h-[44px] px-2 flex items-center"
        >
          انصراف
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selected Items Summary */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
              اقلام تحت استعلام ({selectedItems.length} قلم از فهرست تجهیزات)
            </span>
            <span className="text-[11px] text-slate-500">مقادیر مهندسی بدون دخل و تصرف منظور می‌شوند</span>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-zinc-700/60 max-h-48 overflow-y-auto">
            {selectedItems.map((item, idx) => (
              <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">۰{idx + 1}</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">{item.description}</span>
                  {item.brandPreference && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                      {item.brandPreference}
                    </span>
                  )}
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                  {item.quantity} {item.unit}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
            عنوان استعلام خرید
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100"
          />
        </div>

        {/* Deadline and Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
              مهلت ثبت قیمت توسط فروشندگان (روز کاری)
            </label>
            <input
              type="number"
              min="2"
              max="30"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
              محل و شرایط تحویل بار
            </label>
            <input
              type="text"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              شرط تحویل تجاری (Incoterms / شرایط حمل)
            </label>
            <input
              type="text"
              value={deliveryTerm}
              onChange={(e) => setDeliveryTerm(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              الزامات گارانتی و اصالت
            </label>
            <input
              type="text"
              value={warrantyRequirement}
              onChange={(e) => setWarrantyRequirement(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
            />
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1.5">
            دسترسی و مخاطبان استعلام
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'VERIFIED_VENDORS', title: 'فروشندگان تأییدشده', desc: 'فروشندگان رسمی تجهیزات خورشیدی' },
              { id: 'PUBLIC_MARKETPLACE', title: 'بازار عمومی تأمین', desc: 'قابل مشاهده برای همه اعضای بازارگاه' },
              { id: 'INVITED_ONLY', title: 'فقط با دعوتنامه', desc: 'ارسال اختصاصی به تأمین‌کنندگان معین' }
            ].map(v => (
              <button
                type="button"
                key={v.id}
                onClick={() => setVisibility(v.id as any)}
                className={`p-3 rounded-xl border text-right transition-colors cursor-pointer min-h-[44px] ${
                  visibility === v.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <div className="text-xs font-bold mb-0.5">{v.title}</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer min-h-[44px]"
          >
            انصراف
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
          >
            {isSubmitting ? (
              <span>در حال ارسال استعلام...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ارسال استعلام خرید تجهیزات</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
