import React from 'react';
import { SceneCanvas } from '../components/solar/SceneCanvas';
import { BuildingSelector } from '../components/solar/BuildingSelector';
import { RoofOptionPanel } from '../components/solar/RoofOptionPanel';
import { SunPathController } from '../components/solar/SunPathController';
import { AILayoutOptimizer } from '../components/solar/AILayoutOptimizer';
import { usePlacementStore } from '../store/usePlacementStore';
import { Download, Trash2, ArrowRight } from 'lucide-react';
import { exportCanvasToPNG } from '../utils/export';
import { Link } from 'react-router-dom';

export default function SolarPlanner() {
  const { panels, clearPanels, selectedPanelId, removePanel } = usePlacementStore();

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-Vazirmatn flex flex-col p-4 md:p-6 gap-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D23]">طراحی سه‌بعدی پنل خورشیدی</h1>
          <p className="text-[#5A6072] mt-1">ساختمان خود را انتخاب کنید و پنل‌ها را روی سقف قرار دهید.</p>
        </div>
        
        <div className="flex gap-2">
          {selectedPanelId && (
            <button 
              onClick={() => removePanel(selectedPanelId)}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={18} />
              حذف پنل
            </button>
          )}
          <button 
            onClick={clearPanels}
            className="bg-white border border-[#E4E7EC] text-[#5A6072] px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            پاکسازی
          </button>
          <button 
            onClick={() => exportCanvasToPNG('solar-plan.png')}
            className="bg-[#1F9254] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#167643] transition-colors shadow-sm"
          >
            <Download size={18} />
            خروجی تصویر
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 lg:h-[calc(100vh-140px)]">
        {/* Left Sidebar - Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <AILayoutOptimizer />
          <BuildingSelector />
          <RoofOptionPanel />
          <SunPathController />
          
          {/* Stats Panel */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#E4E7EC] mt-auto">
            <h3 className="font-bold text-[#1A1D23] border-b border-[#E4E7EC] pb-2 mb-4">آمار طراحی</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F7F8FA] p-3 rounded-xl text-center">
                <div className="text-2xl font-black text-[#1F9254]">{panels.length}</div>
                <div className="text-xs text-[#5A6072] mt-1">تعداد پنل</div>
              </div>
              <div className="bg-[#F7F8FA] p-3 rounded-xl text-center">
                <div className="text-2xl font-black text-[#FF9E2C]">{(panels.length * 0.55).toFixed(1)}</div>
                <div className="text-xs text-[#5A6072] mt-1">ظرفیت (kW)</div>
              </div>
            </div>
            <p className="text-xs text-[#5A6072] mt-4 text-center">
              برای قرار دادن پنل روی سقف کلیک کنید.
            </p>
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div id="three-scene-container" className="flex-1 relative rounded-2xl overflow-hidden border border-[#E4E7EC] shadow-sm bg-transparent p-2 flex flex-col min-h-[400px]">
          <SceneCanvas />
        </div>
      </div>
    </div>
  );
}
