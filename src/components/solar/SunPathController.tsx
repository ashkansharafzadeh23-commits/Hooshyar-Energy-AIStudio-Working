import React, { useEffect, useState } from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';
import { Sun, Moon } from 'lucide-react';

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

  const isNight = timeOfDay < 6 || timeOfDay > 18;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E4E7EC] space-y-4">
      <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-2">
        <h3 className="font-bold text-[#1A1D23] flex items-center gap-2">
          {isNight ? <Moon size={18} className="text-[#3B82F6]" /> : <Sun size={18} className="text-[#F5A623]" />}
          شبیه‌ساز روز و شب
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAuto(!isAuto)}
            className={`text-xs px-2 py-1 rounded-md font-bold transition-colors ${isAuto ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
          >
            {isAuto ? 'توقف' : 'خودکار'}
          </button>
          <span className="font-bold text-sm text-[#1F9254] bg-[#1F9254]/10 px-2 py-1 rounded-md">
            {formatTime(timeOfDay)}
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[#5A6072]">
          <span>۰۰:۰۰</span>
          <span>۰۶:۰۰</span>
          <span>۱۲:۰۰</span>
          <span>۱۸:۰۰</span>
          <span>۲۴:۰۰</span>
        </div>
        <input 
           type="range" 
           min="0" max="24" step="0.25"
          value={timeOfDay}
          onChange={(e) => {
            setIsAuto(false);
            setTimeOfDay(Number(e.target.value));
          }}
          className={`w-full ${isNight ? 'accent-[#3B82F6]' : 'accent-[#F5A623]'}`}
        />
      </div>
    </div>
  );
}
