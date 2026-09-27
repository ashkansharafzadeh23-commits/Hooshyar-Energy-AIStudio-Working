import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdBanner } from '../components/AdBanner';
import { provinces } from '../config/cities';

export default function AreaCityPage() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();

  const [area, setArea] = useState(state.area.toString());
  const [usableArea, setUsableArea] = useState(state.usableArea.toString());
  
  // Try to find the province of the initial city
  let initialProvince = provinces[0].name;
  let initialCity = provinces[0].cities[0];
  if (state.city) {
    const foundProv = provinces.find(p => p.cities.includes(state.city));
    if (foundProv) {
      initialProvince = foundProv.name;
      initialCity = state.city;
    }
  }

  const [province, setProvince] = useState(initialProvince);
  const [city, setCity] = useState(initialCity);
  const [gridConnected, setGridConnected] = useState(state.gridConnected);
  const [gridStable, setGridStable] = useState(state.gridStable);

  const isSolar = state.targets.includes('solar');

  // Update city when province changes
  useEffect(() => {
    const p = provinces.find(p => p.name === province);
    if (p && !p.cities.includes(city)) {
      setCity(p.cities[0]);
    }
  }, [province]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateState({
      area: Number(area),
      usableArea: Number(usableArea),
      city,
      gridConnected,
      gridStable,
    });
    navigate('/checklist');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto pt-4"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">اطلاعات پایه مکان</h2>
        <p className="text-gray-500">لطفاً متراژ و وضعیت اتصال به شبکه برق را مشخص کنید.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-2">متراژ کل (متر مربع)</label>
            <input 
              type="number" 
              required 
              min="10"
              value={area} 
              onChange={(e) => {
                setArea(e.target.value);
                setUsableArea(String(Math.round(Number(e.target.value) * 0.7)));
              }}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="مثال: ۱۰۰"
            />
          </div>

          {isSolar && (
            <div>
              <label className="block font-medium mb-2">متراژ قابل استفاده نصب پنل</label>
              <input 
                type="number" 
                required 
                min="0"
                value={usableArea} 
                onChange={(e) => setUsableArea(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--solar-primary)] transition-colors"
                placeholder="فضای آزاد پشت‌بام"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-2">استان</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {provinces.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-2">شهر (برای محاسبه زاویه تابش خورشید)</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {provinces.find(p => p.name === province)?.cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <div className={`w-12 h-6 rounded-full transition-colors relative ${gridConnected ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${gridConnected ? 'left-1' : 'right-1'}`} />
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={gridConnected} 
              onChange={(e) => setGridConnected(e.target.checked)} 
            />
            <span className="font-medium text-lg">به برق سراسری (شبکه) متصل هستید؟</span>
          </label>

          {gridConnected && (
            <div className="pr-12">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-blue-600"
                  checked={!gridStable} 
                  onChange={(e) => setGridStable(!e.target.checked)} 
                />
                <span className="text-gray-700">برق منطقه قطعی یا نوسان مکرر دارد (نیاز به پشتیبان)</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition-colors"
          >
            ادامه
            <ArrowLeft size={20} />
          </button>
        </div>
      </form>
      <div className="mt-8 w-full max-w-2xl mx-auto"><AdBanner layout="inline" /></div>
    </motion.div>
  );
}
