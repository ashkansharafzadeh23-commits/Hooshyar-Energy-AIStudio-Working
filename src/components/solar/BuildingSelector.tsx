import React from 'react';
import { usePlacementStore } from '../../store/usePlacementStore';
import { BuildingType } from '../../types/solar';
import { Home, Factory, Warehouse, Tractor } from 'lucide-react';

export function BuildingSelector() {
  const { buildingType, setBuildingType } = usePlacementStore();

  const types: { id: BuildingType; label: string; icon: any }[] = [
    { id: 'house', label: 'مسکونی', icon: Home },
    { id: 'factory', label: 'کارخانه', icon: Factory },
    { id: 'warehouse', label: 'سوله', icon: Warehouse },
    { id: 'farm', label: 'کشاورزی', icon: Tractor },
  ];

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E4E7EC] flex gap-2 overflow-x-auto">
      {types.map((type) => {
        const Icon = type.icon;
        const isActive = buildingType === type.id;
        return (
          <button
            key={type.id}
            onClick={() => setBuildingType(type.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              isActive 
                ? 'bg-[#1F9254] text-white' 
                : 'bg-[#F7F8FA] text-[#5A6072] hover:bg-[#E4E7EC]'
            }`}
          >
            <Icon size={18} />
            <span className="font-bold text-sm">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}
