import React from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';

export function RoofOptionPanel() {
  const { roofConfig, setRoofConfig, clearPanels } = usePlacementStore();

  const handleTypeChange = (type: 'gable' | 'flat') => {
    setRoofConfig({ type });
    clearPanels();
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E4E7EC] space-y-4">
      <h3 className="font-bold text-[#1A1D23] border-b border-[#E4E7EC] pb-2">تنظیمات سقف</h3>
      
      <div className="flex gap-2">
        <button 
          onClick={() => handleTypeChange('flat')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${roofConfig.type === 'flat' ? 'bg-[#1F9254] text-white' : 'bg-[#F7F8FA] text-[#5A6072] hover:bg-[#E4E7EC]'}`}
        >
          سقف تخت
        </button>
        <button 
          onClick={() => handleTypeChange('gable')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${roofConfig.type === 'gable' ? 'bg-[#1F9254] text-white' : 'bg-[#F7F8FA] text-[#5A6072] hover:bg-[#E4E7EC]'}`}
        >
          سقف شیروانی
        </button>
      </div>

      {roofConfig.type === 'gable' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#5A6072]">شیب سقف</span>
            <span className="font-bold">{roofConfig.tilt}°</span>
          </div>
          <input 
            type="range" 
            min="10" max="60" 
            value={roofConfig.tilt}
            onChange={(e) => {
              setRoofConfig({ tilt: Number(e.target.value) });
              clearPanels();
            }}
            className="w-full accent-[#1F9254]"
          />
        </div>
      )}
    </div>
  );
}
