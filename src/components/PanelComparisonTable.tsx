import React, { useState } from 'react';
import { Layers, CheckCircle2, Zap, Link as LinkIcon, Info, Sparkles } from 'lucide-react';

interface Props {
  panelOptions: any;
}

export function PanelComparisonTable({ panelOptions }: Props) {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  if (!panelOptions) return null;

  const rawOptions = [];
  if (panelOptions.economy) rawOptions.push({ label: 'اقتصادی‌ترین', color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', data: panelOptions.economy });
  if (panelOptions.balanced) rawOptions.push({ label: 'متعادل (ارزش خرید)', color: 'bg-blue-50 text-[#0284C7] dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800', data: panelOptions.balanced });
  if (panelOptions.spaceSaving) rawOptions.push({ label: 'صرفه‌جویی در فضا', color: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800', data: panelOptions.spaceSaving });
  if (panelOptions.default) rawOptions.push({ label: 'پیشنهاد پیش‌فرض', color: 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700', data: panelOptions.default });

  // Group by productId
  const groupedOptions: any[] = [];
  rawOptions.forEach(opt => {
    const existing = groupedOptions.find(go => go.data.productId === opt.data.productId && go.data.panelWattage === opt.data.panelWattage);
    if (existing) {
      existing.labels.push({ label: opt.label, color: opt.color });
    } else {
      groupedOptions.push({
        ...opt,
        labels: [{ label: opt.label, color: opt.color }]
      });
    }
  });

  if (groupedOptions.length === 0) return null;

  // Helper for computing ROI text strictly using existing reference formula
  const getRoiText = (optData: any) => {
    if (optData.totalCost && optData.actualSystemKwp) {
      const yearlyKwh = optData.actualSystemKwp * 4.5 * 365;
      const yearlySavingsIRR = yearlyKwh * 1500;
      const roiYears = optData.totalCost / yearlySavingsIRR;
      return `${roiYears.toFixed(1)} سال`;
    }
    return 'نامشخص';
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 shadow-sm mb-6 overflow-hidden text-right" dir="rtl">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <Layers className="text-[#0284C7]" />
        <div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-100">
            مقایسه سناریوهای ماژول خورشیدی
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            مقایسه گزینه‌های اقتصادی، متعادل و پربازده فضایی
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE REPRESENTATION: INDIVIDUAL COMPARISON CARDS (Zero Clipping at 360px) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4">
        {groupedOptions.map((opt, i) => {
          const roiText = getRoiText(opt.data);
          const isSelected = selectedGroupIndex === i;

          return (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border transition-all ${
                isSelected 
                  ? 'border-[#0284C7] bg-blue-50/30 dark:bg-blue-950/20 shadow-sm' 
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30'
              }`}
            >
              {/* Option Badges & Wattage */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex flex-wrap gap-1">
                  {opt.labels.map((l: any, j: number) => (
                    <span key={j} className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${l.color}`}>
                      {l.label}
                    </span>
                  ))}
                </div>

                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                  <span dir="ltr" className="font-mono">{opt.data.panelWattage ? `${opt.data.panelWattage} W` : 'نامشخص'}</span>
                </div>
              </div>

              {/* Panel Model Title with LTR Isolation */}
              <div className="mb-3">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right">
                  <span dir="ltr" className="inline-block font-mono text-left">
                    {opt.data.panel?.brand || 'پنل استاندارد'} {opt.data.panel?.model || ''}
                  </span>
                </h4>
              </div>

              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">ظرفیت کل سیستم:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
                    {opt.data.actualSystemKwp ? (
                      <>
                        <span dir="ltr" className="font-mono">{opt.data.actualSystemKwp}</span>
                        <span className="text-[10px] text-[#0284C7]">kWp</span>
                      </>
                    ) : 'نامشخص'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">تعداد پنل مورد نیاز:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {opt.data.panelCount ? `${opt.data.panelCount} عدد` : 'نامشخص'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">فضای مورد نیاز:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {opt.data.requiredAreaM2 ? `${opt.data.requiredAreaM2} متر مربع` : 'نامشخص'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">هزینه کل پنل‌ها:</span>
                  <span className="font-bold text-[#0284C7] dark:text-blue-400">
                    {opt.data.totalCost ? `${(opt.data.totalCost / 10).toLocaleString()} تومان` : 'نامشخص'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">ارزش خرید (هر وات):</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {opt.data.costPerWatt ? `${(opt.data.costPerWatt / 10).toLocaleString()} تومان/وات` : 'نامشخص'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-0.5">بازگشت سرمایه (قبض):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {roiText}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                type="button"
                onClick={() => setSelectedGroupIndex(isSelected ? null : i)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                  isSelected 
                    ? 'bg-[#0284C7] text-white shadow-xs' 
                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100'
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>گزینه انتخابی فعال (مشاهده تجهیزات در زیر)</span>
                  </>
                ) : (
                  <span>انتخاب و مشاهده تجهیزات سازگار</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP/TABLET REPRESENTATION: FULL COMPARISON TABLE                     */}
      {/* ========================================================================= */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">ویژگی‌ها</th>
              {groupedOptions.map((opt, i) => (
                <th key={i} className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 min-w-[200px]">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {opt.labels.map((l: any, j: number) => (
                      <span key={j} className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${l.color}`}>
                        {l.label}
                      </span>
                    ))}
                  </div>
                  <div className="text-base leading-tight">
                    <span dir="ltr" className="inline-block font-mono text-left">
                      {opt.data.panel?.brand || 'پنل استاندارد'} {opt.data.panel?.model || ''}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 font-normal mt-1">
                    <span dir="ltr" className="font-mono">{opt.data.panelWattage ? `${opt.data.panelWattage} W` : 'نامشخص'}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">تعداد پنل مورد نیاز</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">
                  {opt.data.panelCount ? `${opt.data.panelCount} عدد` : 'نامشخص'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">ظرفیت نهایی سیستم</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">
                  {opt.data.actualSystemKwp ? <span dir="ltr" className="font-mono">{opt.data.actualSystemKwp} kWp</span> : 'نامشخص'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">فضای مورد نیاز</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">
                  {opt.data.requiredAreaM2 ? `${opt.data.requiredAreaM2} متر مربع` : 'نامشخص'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">هزینه کل پنل‌ها</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold text-[#0284C7] dark:text-blue-400">
                  {opt.data.totalCost ? `${(opt.data.totalCost / 10).toLocaleString()} تومان` : 'نامشخص'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">ارزش خرید (هزینه هر وات)</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">
                  {opt.data.costPerWatt ? `${(opt.data.costPerWatt / 10).toLocaleString()} تومان/وات` : 'نامشخص'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">تخمین بازگشت سرمایه (قبض)</td>
              {groupedOptions.map((opt, i) => {
                const roiText = getRoiText(opt.data);
                return (
                  <td key={i} className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {roiText}
                  </td>
                );
              })}
            </tr>
            <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">راندمان فضایی</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">
                  {opt.data.wattPerM2 ? <span dir="ltr" className="font-mono">{opt.data.wattPerM2} W/m²</span> : 'نامشخص'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-4 px-4 bg-zinc-50 dark:bg-zinc-800/50"></td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-4 px-4 text-center">
                  <button 
                    type="button"
                    onClick={() => setSelectedGroupIndex(selectedGroupIndex === i ? null : i)}
                    className={`w-full py-2 px-4 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 min-h-[40px] cursor-pointer ${
                      selectedGroupIndex === i 
                        ? 'bg-[#0284C7] text-white shadow-xs' 
                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {selectedGroupIndex === i ? <><CheckCircle2 size={15}/> انتخاب شده</> : 'انتخاب و مشاهده تجهیزات'}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* COMPATIBLE EQUIPMENT DRAWER (Activated when a panel option is selected)  */}
      {/* ========================================================================= */}
      {selectedGroupIndex !== null && (
        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-amber-500" />
            <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              تجهیزات سازگار با پنل انتخابی (
              <span dir="ltr" className="inline-block font-mono">
                {groupedOptions[selectedGroupIndex].data.panel?.brand || 'استاندارد'} {groupedOptions[selectedGroupIndex].data.panel?.model || ''}
              </span>
              )
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                <Layers size={15} className="text-[#0284C7]"/> اینورترهای پیشنهادی
              </h5>
              <div className="space-y-2.5">
                {[
                  { brand: 'Growatt', model: `MIN ${Math.ceil(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5)}000TL-X`, type: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 'سه فاز' : 'تک فاز', price: Math.ceil((groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) * 4.5) * 10000000 },
                  { brand: 'SMA', model: `Sunny Boy ${Math.ceil(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5)}.0`, type: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 'سه فاز' : 'تک فاز', price: Math.ceil((groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) * 7) * 10000000 },
                  { brand: 'Fronius', model: `Primo ${Math.ceil(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5)}.0-1`, type: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 'سه فاز' : 'تک فاز', price: Math.ceil((groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) * 6.5) * 10000000 }
                ].map((inv, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">
                        <span dir="ltr" className="inline-block font-mono">{inv.brand} - {inv.model}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{inv.type}</div>
                    </div>
                    <div className="text-left font-bold text-[#0284C7] dark:text-blue-400">
                      {(inv.price / 10).toLocaleString()} تومان
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                <LinkIcon size={15} className="text-emerald-500"/> کابل و تجهیزات اتصال
              </h5>
              <div className="space-y-2.5">
                {[
                  { type: 'کابل خورشیدی 4mm² (استرینگ)', spec: 'استاندارد TUV، مقاوم در برابر UV', pricePerMeter: 35000 },
                  { type: 'کابل خورشیدی 6mm² (فواصل طولانی)', spec: 'استاندارد TUV، افت ولتاژ کمتر', pricePerMeter: 48000 },
                  { type: `کابل AC خروجی اینورتر (${(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? '۵' : '۳'} رشته)`, spec: 'کابل مسی افشان استاندارد', pricePerMeter: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 120000 : 75000 }
                ].map((cbl, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{cbl.type}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{cbl.spec}</div>
                    </div>
                    <div className="text-left font-bold text-emerald-600 dark:text-emerald-400">
                      {(cbl.pricePerMeter / 10).toLocaleString()} <span className="text-[10px] font-normal">تومان/متر</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl flex gap-2.5 text-xs border border-blue-100 dark:border-blue-900/50">
            <Info className="shrink-0 mt-0.5 text-[#0284C7]" size={15} />
            <p>
              تجهیزات فوق متناسب با توان پنل انتخابی (
              <span dir="ltr" className="font-mono font-bold">{groupedOptions[selectedGroupIndex].data.panelWattage} W</span>
              ) و ظرفیت کل سیستم (
              <span dir="ltr" className="font-mono font-bold">{groupedOptions[selectedGroupIndex].data.actualSystemKwp} kWp</span>
              ) بهینه‌سازی شده‌اند.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 leading-relaxed">
        <strong>یادداشت درباره نرخ بازگشت سرمایه (ROI):</strong> ارقام درج شده در ردیف بازگشت سرمایه، تخمینی بر اساس میانگین ۴.۵ ساعت تابش موثر روزانه و صرفه‌جویی در بهای برق مصرفی شبکه (تعرفه مرجع ۱۵۰۰ ریال) است.
      </div>
    </div>
  );
}
