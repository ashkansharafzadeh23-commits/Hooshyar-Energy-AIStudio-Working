import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { APPLIANCES_CONFIG } from '../config/appliances';
import { SelectedAppliance } from '../types';
import { Check, ArrowLeft, Plus, Box, ListFilter } from 'lucide-react';
import { motion } from 'framer-motion';
import SmartAnalyzer from '../components/SmartAnalyzer';

export default function ChecklistPage() {
  const { state, updateState } = useAppContext();
  const navigate = useNavigate();

  const [selectedApps, setSelectedApps] = useState<Record<string, SelectedAppliance>>({});
  const [selectedSubtype, setSelectedSubtype] = useState<string>('');
  const [showOther, setShowOther] = useState(false);

  // Custom appliance state
  const [customName, setCustomName] = useState('');
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customHours, setCustomHours] = useState(2);
  const [customWatt, setCustomWatt] = useState(100);

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const id = `custom_${Date.now()}`;
    setSelectedApps(prev => ({
      ...prev,
      [id]: {
        id,
        name: customName,
        quantity: customQuantity,
        hours: customHours,
        watt: customWatt
      }
    }));
    setCustomName('');
    setCustomQuantity(1);
    setCustomHours(2);
    setCustomWatt(100);
  };

  useEffect(() => {
    // initialize from state if going back
    if (state.appliances.length > 0) {
      const map: Record<string, SelectedAppliance> = {};
      state.appliances.forEach(a => map[a.id] = a);
      setSelectedApps(map);
    }
  }, [state.appliances]);

  const locationConfig = state.locationType ? APPLIANCES_CONFIG[state.locationType] : null;

  useEffect(() => {
    if (locationConfig?.subtypes && !selectedSubtype) {
      setSelectedSubtype(Object.keys(locationConfig.subtypes)[0]);
    }
  }, [locationConfig, selectedSubtype]);

  const toggleAppliance = (app: any) => {
    setSelectedApps(prev => {
      const next = { ...prev };
      if (next[app.id]) {
        delete next[app.id];
      } else {
        next[app.id] = {
          id: app.id,
          name: app.name,
          quantity: 1,
          hours: app.defaultHours,
          watt: app.defaultWatt
        };
      }
      return next;
    });
  };

  const updateAppliance = (id: string, field: 'quantity' | 'hours' | 'watt', value: number) => {
    setSelectedApps(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSubmit = () => {
    updateState({ appliances: Object.values(selectedApps) });
    navigate('/consumption');
  };

  const handleSkip = () => {
    // Skip to consumption with empty appliances, relies on formula
    updateState({ appliances: [] });
    navigate('/consumption');
  };

  if (!locationConfig) return null;

  let displayCategories: Array<{ title: string; items: any[] }> = [];

  if (locationConfig.subtypes) {
    if (showOther) {
       Object.values(locationConfig.subtypes).forEach(sub => {
         Object.entries(sub.categories).forEach(([catKey, items]) => {
           displayCategories.push({ title: `${sub.label}`, items });
         });
       });
    } else if (selectedSubtype && locationConfig.subtypes[selectedSubtype]) {
      const sub = locationConfig.subtypes[selectedSubtype];
      Object.entries(sub.categories).forEach(([catKey, items]) => {
        displayCategories.push({ title: sub.label, items });
      });
    }
    
    if (locationConfig.common) {
       Object.entries(locationConfig.common.categories).forEach(([catKey, items]) => {
         displayCategories.push({ title: locationConfig.common!.label, items });
       });
    }
  } else if (locationConfig.categories) {
    Object.entries(locationConfig.categories).forEach(([catKey, items]) => {
      displayCategories.push({ title: catKey.replace('_', ' '), items });
    });
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-20"
    >
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <h2 className="text-2xl font-bold">لوازم برقی خود را انتخاب کنید</h2>
          {state.targets.includes('solar') && (
            <Link 
              to="/solar-planner"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-[#1F9254] bg-[#1F9254]/10 hover:bg-[#1F9254]/20 transition-colors"
            >
              <Box size={18} />
              تصویر سه‌بعدی نمای مکان
            </Link>
          )}
        </div>
        <p className="text-gray-500">برای محاسبه دقیق مصرف، لوازمی که دارید را تیک بزنید.</p>
      </div>

      <SmartAnalyzer 
        area={state.area || 100} 
        isSolar={state.targets.includes('solar') || state.targets.includes('auto')}
        onAnalysisComplete={(consumption) => {
          if (consumption > 0) {
            updateState({ actualMonthlyKwh: consumption });
          }
        }} 
      />

      {locationConfig.subtypes && (
        <div className="mb-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
            <ListFilter size={18} className="text-blue-500" />
            زیرنوع کاربری خود را مشخص کنید
          </label>
          <select
            value={showOther ? 'other' : selectedSubtype}
            onChange={(e) => {
              if (e.target.value === 'other') {
                setShowOther(true);
                setSelectedSubtype('');
              } else {
                setShowOther(false);
                setSelectedSubtype(e.target.value);
              }
            }}
            className="w-full sm:w-80 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {Object.entries(locationConfig.subtypes).map(([key, sub]) => (
              <option key={key} value={key}>{sub.label}</option>
            ))}
            <option value="other">سایر / نمی‌دانم (نمایش همه)</option>
          </select>
        </div>
      )}

      {displayCategories.map((category, idx) => (
        <div key={`${category.title}-${idx}`} className="mb-8">
          <h3 className="text-lg font-bold mb-4 capitalize">{category.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {category.items.map((app) => {
              const isSelected = !!selectedApps[app.id];
              return (
                <div 
                  key={app.id} 
                  className={`border-2 rounded-xl p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAppliance(app)}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border-2 ${
                      isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check size={16} />}
                    </div>
                    <span className="font-semibold text-sm">{app.name}</span>
                  </div>

                  {isSelected && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-blue-200 space-y-3"
                    >
                      <div className="flex justify-between items-center text-sm">
                        <span>تعداد:</span>
                        <input 
                          type="number" min="1" 
                          value={selectedApps[app.id].quantity}
                          onChange={(e) => updateAppliance(app.id, 'quantity', Number(e.target.value))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                        />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>ساعت/روز:</span>
                        <input 
                          type="number" min="0.1" step="0.1"
                          value={selectedApps[app.id].hours}
                          onChange={(e) => updateAppliance(app.id, 'hours', Number(e.target.value))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                        />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>توان (وات):</span>
                        <input 
                          type="number" min="1"
                          value={selectedApps[app.id].watt}
                          onChange={(e) => updateAppliance(app.id, 'watt', Number(e.target.value))}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                        />
                      </div>
                  </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.values(selectedApps).some(app => app.id.startsWith('custom_')) && (
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4 capitalize">لوازم اضافه شده توسط شما</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.values(selectedApps).filter(app => app.id.startsWith('custom_')).map((app) => (
                <div 
                  key={app.id} 
                  className={`border-2 rounded-xl p-4 transition-all border-blue-500 bg-blue-50`}
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAppliance(app)}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border-2 bg-blue-500 border-blue-500 text-white`}>
                      <Check size={16} />
                    </div>
                    <span className="font-semibold text-sm">{app.name}</span>
                  </div>
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-4 pt-4 border-t border-blue-200 space-y-3"
                  >
                    <div className="flex justify-between items-center text-sm">
                      <span>تعداد:</span>
                      <input 
                        type="number" min="1" 
                        value={app.quantity}
                        onChange={(e) => updateAppliance(app.id, 'quantity', Number(e.target.value))}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>ساعت/روز:</span>
                      <input 
                        type="number" min="0.1" step="0.1"
                        value={app.hours}
                        onChange={(e) => updateAppliance(app.id, 'hours', Number(e.target.value))}
                        className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                      />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>توان (وات):</span>
                      <input 
                        type="number" min="1"
                        value={app.watt}
                        onChange={(e) => updateAppliance(app.id, 'watt', Number(e.target.value))}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                      />
                    </div>
                  </motion.div>
                </div>
            ))}
          </div>
        </div>
      )}

      {/* Form for new custom item */}
      <div className="mb-8 p-6 bg-white rounded-2xl border border-gray-200">
        <h3 className="text-lg font-bold mb-4">وسیله شما در لیست نیست؟ اضافه کنید</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm text-gray-600 mb-1">نام وسیله</label>
            <input 
              type="text" 
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
              placeholder="مثال: دستگاه جوش"
            />
          </div>
          <div className="w-full md:w-24">
            <label className="block text-sm text-gray-600 mb-1">تعداد</label>
            <input 
              type="number" min="1"
              value={customQuantity}
              onChange={e => setCustomQuantity(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            />
          </div>
          <div className="w-full md:w-28">
            <label className="block text-sm text-gray-600 mb-1">ساعت/روز</label>
            <input 
              type="number" min="0.1" step="0.1"
              value={customHours}
              onChange={e => setCustomHours(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            />
          </div>
          <div className="w-full md:w-28">
            <label className="block text-sm text-gray-600 mb-1">توان (وات)</label>
            <input 
              type="number" min="1"
              value={customWatt}
              onChange={e => setCustomWatt(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            />
          </div>
          <button 
            onClick={handleAddCustom}
            disabled={!customName.trim()}
            className="w-full md:w-auto px-6 py-2 bg-blue-100 text-blue-700 font-bold rounded-xl hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 h-[42px]"
          >
            <Plus size={20} />
            افزودن
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-10 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 gap-4">
        <button 
          onClick={handleSkip}
          className="text-gray-500 underline hover:text-gray-800"
        >
          نمی‌دانم، بر اساس متراژ تخمین بزن
        </button>
        
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
        >
          تایید و مشاهده مصرف
          <ArrowLeft size={20} />
        </button>
      </div>
    </motion.div>
  );
}
