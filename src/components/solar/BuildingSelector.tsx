import React from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';
import { BuildingType } from '../../types/solar';
import { Home, Factory, Warehouse, Tractor, Building2 } from 'lucide-react';

export function BuildingSelector() {
  const { buildingType, setBuildingType } = usePlacementStore();

  const types: { id: BuildingType; label: string; icon: any; desc: string }[] = [
    { id: 'house', label: 'مسکونی', icon: Home, desc: '۱۴×۱۸ متر' },
    { id: 'factory', label: 'صنعتی', icon: Factory, desc: '۳۶×۴۴ متر' },
    { id: 'warehouse', label: 'سوله انبار', icon: Warehouse, desc: '۲۸×۳۶ متر' },
    { id: 'farm', label: 'کشاورزی', icon: Tractor, desc: '۱۸×۲۴ متر' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
          <Building2 size={15} className="text-blue-600" />
          <span>نوع کاربری و سازه ساختمان</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {types.map((type) => {
          const Icon = type.icon;
          const isActive = buildingType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setBuildingType(type.id)}
              className={`flex flex-col items-start p-2.5 rounded-xl transition-all min-h-[44px] cursor-pointer border text-right ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                <span className="font-bold text-xs">{type.label}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-mono" dir="ltr">{type.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
