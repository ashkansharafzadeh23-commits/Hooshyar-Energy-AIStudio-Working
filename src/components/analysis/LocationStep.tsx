import React, { useState, useEffect } from 'react';
import { MapPin, Sun, Info, Compass, Check } from 'lucide-react';
import { provinces } from '../../config/cities';
import { DataTruthBadge } from '../common/DataTruthBadge';

interface LocationStepProps {
  province: string;
  city: string;
  onChange: (updates: { province: string; city: string; lat?: number; lon?: number }) => void;
}

export const LocationStep: React.FC<LocationStepProps> = ({
  province,
  city,
  onChange
}) => {
  const [selectedProvince, setSelectedProvince] = useState(province || '');
  const [selectedCity, setSelectedCity] = useState(city || '');
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [customLat, setCustomLat] = useState<string>('');
  const [customLon, setCustomLon] = useState<string>('');

  const currentProvinceData = provinces.find((p) => p.name === selectedProvince);

  const handleProvinceChange = (newProv: string) => {
    setSelectedProvince(newProv);
    setSelectedCity('');
    onChange({ province: newProv, city: '' });
  };

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    onChange({ province: selectedProvince, city: newCity });
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Province & City Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Province */}
        <div>
          <label htmlFor="province-select" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
            استان محل پروژه <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="province-select"
              value={selectedProvince}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="">-- انتخاب استان --</option>
              {provinces.map((prov) => (
                <option key={prov.name} value={prov.name}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* City */}
        <div>
          <label htmlFor="city-select" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
            شهر یا نزدیک‌ترین مرکز شهری <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="city-select"
              value={selectedCity}
              disabled={!selectedProvince}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{selectedProvince ? '-- انتخاب شهر --' : '-- ابتدا استان را انتخاب نمایید --'}</option>
              {currentProvinceData?.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Solar Resource Notice Card */}
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-right">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0 mt-0.5">
            <Sun size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-bold text-xs text-amber-950 dark:text-amber-200">
                پایگاه داده تابش خورشیدی
              </h4>
              <DataTruthBadge type="VERIFIED_SOURCE" size="sm" />
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
              موقعیت پروژه برای بررسی تابش خورشیدی منطقه استفاده می‌شود. داده‌ها به صورت مستقیم از ماهواره‌های هواشناسی NASA POWER یا اطلس انرژی خورشیدی ایران دریافت و مبنای تحلیل قرار می‌گیرند.
            </p>
          </div>
        </div>
      </div>

      {/* Optional Coordinates (For advanced users only, default collapsed) */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setShowCoordinates(!showCoordinates)}
          className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Compass size={14} />
          <span>{showCoordinates ? 'بستن مختصات دقیق جغرافیایی' : 'تعیین مختصات دقیق جغرافیایی (اختیاری)'}</span>
        </button>

        {showCoordinates && (
          <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              اگر مختصات دقیق محل پروژه را در اختیار دارید، می‌توانید جهت دریافت دقیق‌تر اطلاعات تابش خورشیدی آن را وارد کنید. (برای کاربران عادی الزامی نیست)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  عرض جغرافیایی (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="مثال: 35.6892"
                  value={customLat}
                  onChange={(e) => {
                    setCustomLat(e.target.value);
                    const latNum = parseFloat(e.target.value);
                    const lonNum = parseFloat(customLon);
                    if (!isNaN(latNum) && !isNaN(lonNum)) {
                      onChange({ province: selectedProvince, city: selectedCity, lat: latNum, lon: lonNum });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  طول جغرافیایی (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="مثال: 51.3890"
                  value={customLon}
                  onChange={(e) => {
                    setCustomLon(e.target.value);
                    const latNum = parseFloat(customLat);
                    const lonNum = parseFloat(e.target.value);
                    if (!isNaN(latNum) && !isNaN(lonNum)) {
                      onChange({ province: selectedProvince, city: selectedCity, lat: latNum, lon: lonNum });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
