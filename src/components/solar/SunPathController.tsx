import React, { useEffect, useState } from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';
import { Sun, Moon, Play, Pause } from 'lucide-react';

export function SunPathController() {
  const { timeOfDay, setTimeOfDay } = usePlacementStore();
  const [isAuto, setIsAuto] = useState(false);

  useEffect(() => {
    if (!isAuto) return;
    const interval = setInterval(() => {
      setTimeOfDay(usePlacementStore.getState().timeOfDay + 0.1 > 24 ? 0 : usePlacementStore.getState().timeOfDay + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [isAuto, setTimeOfDay]);

  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.round((time - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const isNight = timeOfDay < 5 || timeOfDay > 19;

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
          {isNight ? <Moon size={15} className="text-indigo-400" /> : <Sun size={15} className="text-amber-500" />}
          <span>شبیه‌ساز بصری نور و زاویه خورشید</span>
        </h3>
        
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setIsAuto(!isAuto)}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
              isAuto 
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' 
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {isAuto ? <Pause size={12} /> : <Play size={12} />}
            <span>{isAuto ? 'توقف' : 'پخش'}</span>
          </button>
          <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-lg font-mono" dir="ltr">
            {formatTime(timeOfDay)}
          </span>
        </div>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-slate-400 font-mono" dir="ltr">
          <span>06:00</span>
          <span>12:00 (ظهر)</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="24" 
          step="0.25"
          value={timeOfDay}
          onChange={(e) => {
            setIsAuto(false);
            setTimeOfDay(Number(e.target.value));
          }}
          className={`w-full cursor-pointer min-h-[32px] ${isNight ? 'accent-indigo-500' : 'accent-amber-500'}`}
        />
        <p className="text-[10px] text-slate-400 leading-tight">
          جهت تابش خورشید جنبه نمایش بصری سایه‌ها را داشته و آنالیز سایه‌اندازی تفصیلی تلقی نمی‌شود.
        </p>
      </div>
    </div>
  );
}
