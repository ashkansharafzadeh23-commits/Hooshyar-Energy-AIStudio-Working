import React, { useState } from 'react';
import { Layers, CheckCircle2, Zap, Link as LinkIcon, Info } from 'lucide-react';

interface Props {
  panelOptions: any;
}

export function PanelComparisonTable({ panelOptions }: Props) {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  if (!panelOptions) return null;

  const rawOptions = [];
  if (panelOptions.economy) rawOptions.push({ label: 'اقتصادی‌ترین', color: 'bg-green-100 text-green-800 border-green-200', data: panelOptions.economy });
  if (panelOptions.balanced) rawOptions.push({ label: 'متعادل (ارزش خرید)', color: 'bg-blue-100 text-blue-800 border-blue-200', data: panelOptions.balanced });
  if (panelOptions.spaceSaving) rawOptions.push({ label: 'کمترین فضای اشغال‌شده', color: 'bg-purple-100 text-purple-800 border-purple-200', data: panelOptions.spaceSaving });
  if (panelOptions.default) rawOptions.push({ label: 'پیشنهاد پیش‌فرض', color: 'bg-gray-100 text-gray-800 border-gray-200', data: panelOptions.default });

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

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm mb-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <Layers className="text-blue-500" />
        <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-100">جدول مقایسه پنل‌های پیشنهادی هوش مصنوعی</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50">ویژگی‌ها</th>
              {groupedOptions.map((opt, i) => (
                <th key={i} className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 min-w-[200px]">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {opt.labels.map((l: any, j: number) => (
                      <span key={j} className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${l.color}`}>
                        {l.label}
                      </span>
                    ))}
                  </div>
                  <div className="text-base leading-tight">{opt.data.panel?.brand || 'پنل استاندارد'} {opt.data.panel?.model || ''}</div>
                  <div className="text-xs text-zinc-500 font-normal mt-1">{opt.data.panelWattage} وات</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">تعداد پنل مورد نیاز</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">{opt.data.panelCount} عدد</td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">ظرفیت نهایی سیستم</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">{opt.data.actualSystemKwp} kWp</td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">فضای مورد نیاز</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold">
                  {opt.data.requiredAreaM2 ? `${opt.data.requiredAreaM2} مترمربع` : 'محاسبه نشده'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">هزینه کل پنل‌ها</td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
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
              <td className="py-3 px-4 text-zinc-500 font-medium bg-zinc-50 dark:bg-zinc-800/50">تخمین بازگشت سرمایه (ROI)</td>
              {groupedOptions.map((opt, i) => {
                let roiText = 'نامشخص';
                if (opt.data.totalCost && opt.data.actualSystemKwp) {
                  // Rough estimate: systemKwp * 4.5 sun hours * 365 days = yearly kWh.
                  // Multiply by 1500 IRR (or 150 Toman) per kWh.
                  const yearlyKwh = opt.data.actualSystemKwp * 4.5 * 365;
                  const yearlySavingsIRR = yearlyKwh * 1500;
                  const roiYears = opt.data.totalCost / yearlySavingsIRR;
                  roiText = `${roiYears.toFixed(1)} سال`;
                }
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
                  {opt.data.wattPerM2 ? `${opt.data.wattPerM2} W/m²` : 'نامشخص'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-4 px-4 bg-zinc-50 dark:bg-zinc-800/50"></td>
              {groupedOptions.map((opt, i) => (
                <td key={i} className="py-4 px-4 text-center">
                  <button 
                    onClick={() => setSelectedGroupIndex(selectedGroupIndex === i ? null : i)}
                    className={`w-full py-2 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${selectedGroupIndex === i ? 'bg-blue-600 text-white shadow-md' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'}`}
                  >
                    {selectedGroupIndex === i ? <><CheckCircle2 size={16}/> انتخاب شده</> : 'انتخاب و مشاهده تجهیزات'}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {selectedGroupIndex !== null && (
        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-amber-500" />
            <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              تجهیزات سازگار با پنل انتخابی ({groupedOptions[selectedGroupIndex].data.panel?.brand || 'استاندارد'} {groupedOptions[selectedGroupIndex].data.panel?.model})
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <h5 className="font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                <Layers size={16} className="text-blue-500"/> اینورترهای پیشنهادی
              </h5>
              <div className="space-y-3">
                {[
                  { brand: 'Growatt', model: `MIN ${Math.ceil(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5)}000TL-X`, type: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 'سه فاز' : 'تک فاز', price: Math.ceil((groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) * 4.5) * 10000000 },
                  { brand: 'SMA', model: `Sunny Boy ${Math.ceil(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5)}.0`, type: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 'سه فاز' : 'تک فاز', price: Math.ceil((groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) * 7) * 10000000 },
                  { brand: 'Fronius', model: `Primo ${Math.ceil(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5)}.0-1`, type: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 'سه فاز' : 'تک فاز', price: Math.ceil((groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) * 6.5) * 10000000 }
                ].map((inv, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{inv.brand} - {inv.model}</div>
                      <div className="text-xs text-zinc-500 mt-1">{inv.type}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{(inv.price / 10).toLocaleString()} تومان</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <h5 className="font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                <LinkIcon size={16} className="text-emerald-500"/> کابل‌های سازگار
              </h5>
              <div className="space-y-3">
                {[
                  { type: 'کابل خورشیدی 4mm² (استرینگ)', spec: 'استاندارد TUV، مقاوم در برابر UV', pricePerMeter: 35000 },
                  { type: 'کابل خورشیدی 6mm² (فواصل طولانی)', spec: 'استاندارد TUV، افت ولتاژ کمتر', pricePerMeter: 48000 },
                  { type: `کابل AC خروجی اینورتر (${(groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? '5' : '3'} رشته)`, spec: 'کابل مسی افشان استاندارد', pricePerMeter: (groupedOptions[selectedGroupIndex].data.actualSystemKwp || 5) > 10 ? 120000 : 75000 }
                ].map((cbl, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{cbl.type}</div>
                      <div className="text-xs text-zinc-500 mt-1">{cbl.spec}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{(cbl.pricePerMeter / 10).toLocaleString()} <span className="text-xs font-normal">تومان/متر</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg flex gap-3 text-sm border border-blue-100 dark:border-blue-900/50">
            <Info className="shrink-0 mt-0.5" size={16} />
            <p>تجهیزات فوق با در نظر گرفتن توان پنل انتخابی <strong>({groupedOptions[selectedGroupIndex].data.panelWattage} وات)</strong> و ظرفیت کل سیستم <strong>({groupedOptions[selectedGroupIndex].data.actualSystemKwp} کیلووات)</strong> بهینه‌سازی و پیشنهاد شده‌اند.</p>
          </div>
        </div>
      )}
      <div className="mt-4 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <strong>یادداشت درباره نرخ بازگشت سرمایه (ROI):</strong> اعداد درج شده در ردیف بازگشت سرمایه، تخمینی بر اساس میانگین ۴.۵ ساعت تابش موثر در روز و تعرفه متوسط برق (۱۵۰۰ ریال) است. این نرخ نشان می‌دهد که طی چه مدت زمان، سیستم خورشیدی از طریق صرفه‌جویی در هزینه قبض برق، هزینه اولیه خرید پنل‌ها را به شما برمی‌گرداند.
      </div>
    </div>
  );
}
