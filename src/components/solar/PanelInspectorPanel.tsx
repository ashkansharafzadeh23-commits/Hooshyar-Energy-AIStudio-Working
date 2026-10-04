import React from 'react';
import { usePlacementStore, STANDARD_MODULES } from '../../store/usePlacementStore';
import { 
  Sliders, 
  RotateCw, 
  Compass, 
  Grid, 
  SunMedium, 
  Check, 
  Maximize, 
  Layers 
} from 'lucide-react';

export function PanelInspectorPanel() {
  const {
    panelOrientation,
    setPanelOrientation,
    selectedModuleId,
    setSelectedModuleId,
    panelTiltOffset,
    setPanelTiltOffset,
    panelAzimuth,
    setPanelAzimuth,
    gridSnap,
    setGridSnap,
    showSunPath,
    setShowSunPath,
    showGrid,
    setShowGrid,
    roofConfig
  } = usePlacementStore();

  const currentMod = STANDARD_MODULES.find(m => m.id === selectedModuleId) || STANDARD_MODULES[0];

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Sliders size={15} className="text-blue-600" />
          <span>تنظیمات مهندسی ماژول و استراکچر</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">CAD Inspector</span>
      </div>

      {/* 1. Module Model Selector */}
      <div className="space-y-1.5">
        <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
          مدل و توان نامی پنل:
        </label>
        <div className="space-y-1.5">
          {STANDARD_MODULES.map(mod => {
            const isSelected = selectedModuleId === mod.id;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedModuleId(mod.id)}
                className={`w-full p-2 rounded-xl text-right transition-all flex items-center justify-between border cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-950 dark:text-blue-200 shadow-2xs' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <div>
                  <div className="font-bold">{mod.nameFa}</div>
                  <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    {mod.width}m × {mod.length}m | {mod.cellType}
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Orientation (Portrait vs Landscape) */}
      <div className="space-y-1.5 pt-1">
        <label className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
          جهت استقرار پنل (Orientation):
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPanelOrientation('portrait')}
            className={`py-2 px-3 min-h-[40px] rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
              panelOrientation === 'portrait'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Maximize size={14} className="rotate-90" />
            <span>عمودی (Portrait)</span>
          </button>
          <button
            type="button"
            onClick={() => setPanelOrientation('landscape')}
            className={`py-2 px-3 min-h-[40px] rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
              panelOrientation === 'landscape'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Maximize size={14} />
            <span>افقی (Landscape)</span>
          </button>
        </div>
      </div>

      {/* 3. Tilt Offset on Flat Roof Racks */}
      {roofConfig.type === 'flat' && (
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-bold text-slate-700 dark:text-slate-300">شیب استراکچر روی سقف مسطح:</span>
            <span className="font-bold text-blue-600 font-mono" dir="ltr">{panelTiltOffset}°</span>
          </div>
          <input 
            type="range"
            min="5"
            max="45"
            step="1"
            value={panelTiltOffset}
            onChange={(e) => setPanelTiltOffset(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer min-h-[30px]"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono" dir="ltr">
            <span>5° (حداقل)</span>
            <span>15° (تجاری استاندارد)</span>
            <span>30° (ایران بهینه)</span>
          </div>
        </div>
      )}

      {/* 4. Grid Snap Interval & View Helpers */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Grid size={13} className="text-slate-400" />
            <span>گام اسنپ شبکه (Snap):</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg font-mono">
            {[0.25, 0.5, 1.0].map(snapVal => (
              <button
                key={snapVal}
                type="button"
                onClick={() => setGridSnap(snapVal)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                  gridSnap === snapVal ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'
                }`}
              >
                {snapVal}m
              </button>
            ))}
          </div>
        </div>

        {/* Sun Path and Grid Toggles */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowSunPath(!showSunPath)}
            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
              showSunPath
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <SunMedium size={13} />
            <span>مسیر خورشید</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
              showGrid
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-blue-900 dark:text-blue-200'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            <Grid size={13} />
            <span>شبکه زمین</span>
          </button>
        </div>
      </div>
    </div>
  );
}
