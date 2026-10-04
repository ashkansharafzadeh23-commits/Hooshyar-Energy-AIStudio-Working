import React from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';
import { Layers, CheckCircle2, Sliders, ArrowUpRight, Compass } from 'lucide-react';

export function RoofOptionPanel() {
  const { roofConfig, setRoofConfig, clearPanels, panels } = usePlacementStore();

  const handleTypeChange = (type: 'gable' | 'flat') => {
    if (roofConfig.type === type) return;
    setRoofConfig({ type });
    clearPanels();
  };

  const handleTiltPreset = (tilt: number) => {
    setRoofConfig({ tilt });
    clearPanels();
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3.5">
      {/* Header with Active Configuration Status */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div>
          <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
            <Layers size={15} className="text-blue-600" />
            <span>انتخاب نوع و مشخصات سقف</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            تعیین ساختار شیبدار یا مسطح جهت جانمایی دقیق آرایه‌ها
          </p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {roofConfig.type === 'flat' ? 'سقف تخت (۰°)' : `شیبدار (${roofConfig.tilt}°)`}
        </span>
      </div>
      
      {/* Large Visual Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Card 1: Gable Roof (سقف شیبدار) */}
        <button 
          type="button"
          onClick={() => handleTypeChange('gable')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer min-h-[64px] flex flex-col justify-between ${
            roofConfig.type === 'gable'
              ? 'bg-blue-50/70 dark:bg-blue-950/60 border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label="انتخاب سقف شیبدار (شیروانی)"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>سقف شیبدار (شیروانی)</span>
            </div>
            {roofConfig.type === 'gable' && (
              <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            مناسب ویلا، منازل مسکونی و سوله با شیب ثابت
          </p>
        </button>

        {/* Card 2: Flat Roof (سقف مسطح) */}
        <button 
          type="button"
          onClick={() => handleTypeChange('flat')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer min-h-[64px] flex flex-col justify-between ${
            roofConfig.type === 'flat'
              ? 'bg-blue-50/70 dark:bg-blue-950/60 border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          aria-label="انتخاب سقف مسطح (تخت)"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              <span>سقف مسطح (تخت)</span>
            </div>
            {roofConfig.type === 'flat' && (
              <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            دال بتنی یا سقف صنعتی با استراکچر زاویه‌دار ۱۵°
          </p>
        </button>
      </div>

      {/* Detail Controls based on Roof Selection */}
      {roofConfig.type === 'gable' ? (
        <div className="space-y-2.5 pt-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
              <Sliders size={13} className="text-blue-600" />
              <span>زاویه شیب سقف:</span>
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm" dir="ltr">
              {roofConfig.tilt}°
            </span>
          </div>

          <input 
            type="range" 
            min="10" 
            max="60" 
            value={roofConfig.tilt}
            onChange={(e) => {
              setRoofConfig({ tilt: Number(e.target.value) });
              clearPanels();
            }}
            className="w-full accent-blue-600 cursor-pointer min-h-[36px]"
            aria-label="تنظیم زاویه شیب سقف"
          />

          {/* Quick Pitch Presets */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {[15, 25, 30, 45].map((angle) => (
              <button
                key={angle}
                type="button"
                onClick={() => handleTiltPreset(angle)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all min-h-[34px] border cursor-pointer ${
                  roofConfig.tilt === angle
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {angle}°
              </button>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono pt-0.5" dir="ltr">
            <span>10° (شیب ملایم)</span>
            <span className="text-emerald-600 font-bold">30° (بهینه ایران)</span>
            <span>60° (شیروانی تند)</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200/70 dark:border-blue-900/60 text-[11px] text-blue-950 dark:text-blue-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Compass size={14} className="text-blue-600" />
            <span>استراکچر رک‌های زاویه‌دار روی سقف تخت</span>
          </div>
          <p className="leading-relaxed text-slate-600 dark:text-slate-300 text-[11px]">
            در سقف‌های مسطح، ماژول‌ها روی پایه‌های پیش‌ساخته (استراکچر ۱۵ تا ۳۰ درجه) با جهت‌گیری مستقیم به سمت جنوب نصب می‌شوند تا حداکثر راندمان تابش جذب گردد.
          </p>
        </div>
      )}

      {panels.length > 0 && (
        <div className="text-[10px] text-slate-400 text-center">
          * تغییر نوع یا شیب سقف، چیدمان قبلی را بازنشانی می‌کند.
        </div>
      )}
    </div>
  );
}
