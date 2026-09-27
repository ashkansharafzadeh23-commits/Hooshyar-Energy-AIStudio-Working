import React, { useState } from 'react';
import { Home, Layers, Settings2, ShieldCheck, Check, Sparkles, Sliders } from 'lucide-react';
import { DataTruthBadge } from '../common/DataTruthBadge';

export type InstallationMountType = 'rooftop' | 'ground' | 'shed';

interface SiteDetailsStepProps {
  area: number;
  usableArea?: number | null;
  gridConnected: boolean;
  gridStable: boolean;
  mountType?: InstallationMountType;
  onChange: (updates: {
    area: number;
    usableArea?: number | null;
    gridConnected: boolean;
    gridStable: boolean;
    mountType?: InstallationMountType;
  }) => void;
}

export const SiteDetailsStep: React.FC<SiteDetailsStepProps> = ({
  area,
  usableArea,
  gridConnected,
  gridStable,
  mountType = 'rooftop',
  onChange
}) => {
  const [selectedMount, setSelectedMount] = useState<InstallationMountType>(mountType);
  const [totalArea, setTotalArea] = useState<string>(area && area > 0 ? String(area) : '');
  const [usableAreaVal, setUsableAreaVal] = useState<string>(usableArea && usableArea > 0 ? String(usableArea) : '');
  const [isGridConnected, setIsGridConnected] = useState<boolean>(gridConnected);
  const [isGridStable, setIsGridStable] = useState<boolean>(gridStable);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const mountOptions = [
    {
      id: 'rooftop' as InstallationMountType,
      title: 'پشت‌بام',
      desc: 'بام مسکونی، تجاری یا اداری با سازه استاندارد خورشیدی'
    },
    {
      id: 'ground' as InstallationMountType,
      title: 'زمین',
      desc: 'زمین باز، مزرعه خورشیدی یا محوطه باز کارخانه'
    },
    {
      id: 'shed' as InstallationMountType,
      title: 'سوله / کارخانه',
      desc: 'سقف شیروانی یا قوسی سوله صنعتی و انبار'
    }
  ];

  const handleMountSelect = (mType: InstallationMountType) => {
    setSelectedMount(mType);
    const a = parseFloat(totalArea) || 0;
    const ua = usableAreaVal.trim() !== '' ? parseFloat(usableAreaVal) : null;
    onChange({
      area: a,
      usableArea: ua && !isNaN(ua) && ua > 0 ? ua : null,
      gridConnected: isGridConnected,
      gridStable: isGridStable,
      mountType: mType
    });
  };

  const handleAreaChange = (val: string) => {
    setTotalArea(val);
    const num = parseFloat(val) || 0;
    const ua = usableAreaVal.trim() !== '' ? parseFloat(usableAreaVal) : null;
    onChange({
      area: num,
      usableArea: ua && !isNaN(ua) && ua > 0 ? ua : null,
      gridConnected: isGridConnected,
      gridStable: isGridStable,
      mountType: selectedMount
    });
  };

  const handleUsableAreaChange = (val: string) => {
    setUsableAreaVal(val);
    const num = val.trim() !== '' ? parseFloat(val) : null;
    const a = parseFloat(totalArea) || 0;
    onChange({
      area: a,
      usableArea: num && !isNaN(num) && num > 0 ? num : null,
      gridConnected: isGridConnected,
      gridStable: isGridStable,
      mountType: selectedMount
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Installation Surface Type */}
      <div>
        <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2.5">
          نوع محل نصب پنل‌ها <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {mountOptions.map((opt) => {
            const isSelected = selectedMount === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleMountSelect(opt.id)}
                className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer min-h-[76px] flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-amber-500 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{opt.title}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal line-clamp-2">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Area */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor="area-input" className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
            مساحت کل در دسترس جهت نصب <span className="text-rose-500">*</span>
          </label>
          <DataTruthBadge type="USER_PROVIDED" size="sm" />
        </div>

        <div className="relative mt-2">
          <input
            id="area-input"
            type="number"
            min="10"
            max="1000000"
            value={totalArea}
            onChange={(e) => handleAreaChange(e.target.value)}
            placeholder="مساحت به متر مربع"
            className="w-full min-h-[48px] px-4 py-2.5 text-base font-bold bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors pl-24 text-left"
            dir="ltr"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/80 dark:bg-zinc-700/80 px-2.5 py-1.5 rounded-lg pointer-events-none">
            متر مربع
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          مساحت مفید قابل نصب را در صورت اطلاع وارد کنید. این مقدار می‌تواند به دلیل سایه، مسیر دسترسی، فاصله‌ها و موانع از مساحت کل کمتر باشد.
        </p>
      </div>

      {/* Advanced Parameters (Collapsed by default for regular users) */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Sliders size={14} />
          <span>{showAdvanced ? 'بستن تنظیمات پیشرفته' : 'تنظیمات پیشرفته (اختیاری)'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                مساحت مفید بدون سایه (متر مربع)
              </label>
              <input
                type="number"
                value={usableAreaVal}
                onChange={(e) => handleUsableAreaChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGridConnected}
                  onChange={(e) => {
                    setIsGridConnected(e.target.checked);
                    onChange({
                      area: Number(totalArea),
                      usableArea: Number(usableAreaVal),
                      gridConnected: e.target.checked,
                      gridStable: isGridStable,
                      mountType: selectedMount
                    });
                  }}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">اتصال به شبکه سراسری برق</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGridStable}
                  onChange={(e) => {
                    setIsGridStable(e.target.checked);
                    onChange({
                      area: Number(totalArea),
                      usableArea: Number(usableAreaVal),
                      gridConnected: isGridConnected,
                      gridStable: e.target.checked,
                      mountType: selectedMount
                    });
                  }}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">پایداری شبکه (بدون قطعی مکرر)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
