import React from 'react';
import { Compass, Maximize } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

// Simple coordinates mapping matching the backend
const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  "تهران": { lat: 35.6892, lon: 51.3890 },
  "اصفهان": { lat: 32.6546, lon: 51.6680 },
  "یزد": { lat: 31.8974, lon: 54.3569 },
  "مشهد": { lat: 36.2605, lon: 59.6168 },
  "شیراز": { lat: 29.5918, lon: 52.5837 },
  "تبریز": { lat: 38.0800, lon: 46.2919 },
  "اهواز": { lat: 31.3183, lon: 48.6706 },
  "کرمان": { lat: 30.2839, lon: 57.0834 },
  "رشت": { lat: 37.2808, lon: 49.5832 },
  "بندرعباس": { lat: 27.1865, lon: 56.2808 },
  "کرج": { lat: 35.8400, lon: 50.9391 },
  "قم": { lat: 34.6416, lon: 50.8746 },
  "کرمانشاه": { lat: 34.3142, lon: 47.0650 },
  "ارومیه": { lat: 37.5527, lon: 45.0761 },
  "زاهدان": { lat: 29.4963, lon: 60.8629 },
  "همدان": { lat: 34.7989, lon: 48.5146 },
  "اراک": { lat: 34.0954, lon: 49.7013 },
  "سنندج": { lat: 35.3113, lon: 46.9960 },
  "اردبیل": { lat: 38.2514, lon: 48.2973 },
  "قزوین": { lat: 36.2688, lon: 50.0041 },
  "زنجان": { lat: 36.6736, lon: 48.4787 },
  "خرم‌آباد": { lat: 33.4871, lon: 48.3538 },
  "گرگان": { lat: 36.8456, lon: 54.4393 },
  "ساری": { lat: 36.5659, lon: 53.0586 },
  "بجنورد": { lat: 37.4747, lon: 57.3290 },
  "بوشهر": { lat: 28.9234, lon: 50.8203 },
  "بیرجند": { lat: 32.8663, lon: 59.2158 },
  "ایلام": { lat: 33.6384, lon: 46.4226 },
  "شهرکرد": { lat: 32.3256, lon: 50.8644 },
  "سمنان": { lat: 35.5769, lon: 53.3953 },
  "یاسوج": { lat: 30.6684, lon: 51.5876 },
  "کاشان": { lat: 33.9850, lon: 51.4406 },
  "بابل": { lat: 36.5513, lon: 52.6789 },
  "آمل": { lat: 36.4676, lon: 52.3507 }
};

export default function InstallationOptimization() {
  const { state } = useAppContext();
  
  if (!state.targets.includes('solar') || !state.city) {
    return null;
  }

  const coords = CITY_COORDINATES[state.city];
  
  // Calculate optimal angle: usually close to the latitude of the location.
  // For standard fixed mounts, it's roughly the latitude minus 10 to 15 degrees in summer, 
  // or plus 10-15 degrees for winter. For an annual optimal fixed tilt, it's about the latitude multiplied by 0.76 plus 3.1 degrees,
  // or simply the latitude itself for a good rule of thumb.
  
  let optimalTilt = 30; // default for Iran
  if (coords) {
    // A standard formula for fixed annual optimal tilt
    optimalTilt = Math.round(coords.lat * 0.76 + 3.1);
  }
  
  const azimuth = "جنوب کامل (آزیموت ۱۸۰ درجه)";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col h-full">
      <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-100 flex items-center gap-2 mb-4">
        <Compass className="text-blue-500" />
        بهینه‌سازی نصب و جهت‌گیری
      </h3>
      
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
        بر اساس موقعیت جغرافیایی شما در <strong className="text-zinc-900 dark:text-zinc-100">{state.city}</strong>، بهترین شرایط نصب برای دریافت بیشترین میزان تابش خورشیدی در طول سال محاسبه شده است.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Maximize size={18} />
            <h4 className="font-bold text-sm">زاویه شیب بهینه (Tilt)</h4>
          </div>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
            {optimalTilt} درجه
          </p>
          <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-1">
            (ایده‌آل برای تولید سالانه)
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/50">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
            <Compass size={18} />
            <h4 className="font-bold text-sm">جهت‌گیری (Azimuth)</h4>
          </div>
          <p className="text-lg font-black text-amber-700 dark:text-amber-300 mt-1">
            {azimuth}
          </p>
          <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-1">
            بدون سایه‌اندازی پیرامونی
          </p>
        </div>
      </div>
      
      {coords && (
        <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-500 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
          <span>مختصات جغرافیایی:</span>
          <span className="font-mono">
            {coords.lat.toFixed(2)}° N, {coords.lon.toFixed(2)}° E
          </span>
        </div>
      )}
    </div>
  );
}
