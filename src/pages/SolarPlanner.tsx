import React, { useState } from 'react';
import { SceneCanvas } from '../components/solar/SceneCanvas';
import { BuildingSelector } from '../components/solar/BuildingSelector';
import { RoofOptionPanel } from '../components/solar/RoofOptionPanel';
import { SunPathController } from '../components/solar/SunPathController';
import { AILayoutOptimizer } from '../components/solar/AILayoutOptimizer';
import { usePlacementStore } from '../store/usePlacementStore';
import { 
  Download, 
  Trash2, 
  Bot, 
  Building2, 
  Layers, 
  Sun, 
  BarChart3, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { exportCanvasToPNG } from '../utils/export';

export default function SolarPlanner() {
  const { panels, clearPanels, selectedPanelId, removePanel } = usePlacementStore();
  const [mobileTab, setMobileTab] = useState<'ai' | 'building' | 'roof' | 'sun' | 'stats' | null>('ai');

  const mobileTabs = [
    { id: 'ai' as const, label: 'هوش مصنوعی', icon: Bot },
    { id: 'building' as const, label: 'سازه', icon: Building2 },
    { id: 'roof' as const, label: 'سقف و شیب', icon: Layers },
    { id: 'sun' as const, label: 'زاویه تابش', icon: Sun },
    { id: 'stats' as const, label: 'آمار', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-slate-950 font-Vazirmatn flex flex-col p-4 md:p-6 gap-5">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1D23] dark:text-white">طراحی سه‌بعدی پنل خورشیدی</h1>
          <p className="text-[#5A6072] dark:text-slate-400 mt-1 text-xs sm:text-sm">
            ساختمان خود را انتخاب کنید و پنل‌ها را روی سقف قرار دهید.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selectedPanelId && (
            <button 
              onClick={() => removePanel(selectedPanelId)}
              className="bg-red-50 text-red-600 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} />
              حذف پنل
            </button>
          )}
          <button 
            onClick={clearPanels}
            className="bg-white dark:bg-slate-900 border border-[#E4E7EC] dark:border-slate-800 text-[#5A6072] dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            پاکسازی
          </button>
          <button 
            onClick={() => exportCanvasToPNG('solar-plan.png')}
            className="bg-[#1F9254] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-[#167643] transition-colors shadow-xs"
          >
            <Download size={16} />
            خروجی تصویر
          </button>
        </div>
      </header>

      {/* Main Content Layout: On mobile Canvas is order-1 (at the top), Controls are order-2 */}
      <div className="flex flex-col lg:flex-row gap-5 flex-1 lg:h-[calc(100vh-140px)]">
        
        {/* 3D Canvas Area (order-1 on mobile, order-2 on desktop) */}
        <div 
          id="three-scene-container" 
          className="order-1 lg:order-2 flex-1 relative rounded-2xl overflow-hidden border border-[#E4E7EC] dark:border-slate-800 shadow-xs bg-white/40 dark:bg-slate-900/40 p-2 flex flex-col min-h-[380px] sm:min-h-[460px] lg:min-h-[500px]"
        >
          {/* Quick Stats Pill Overlay (Mobile & Tablet) */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="text-[#1F9254]">{panels.length} پنل</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-[#FF9E2C]">{(panels.length * 0.55).toFixed(1)} kW</span>
          </div>

          <SceneCanvas />

          {/* Touch Guidance Bar */}
          <div className="absolute bottom-4 inset-x-4 z-10 pointer-events-none flex justify-center">
            <div className="bg-slate-900/75 dark:bg-black/75 text-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-2 shadow-md">
              <Info size={13} className="text-amber-400 shrink-0" />
              <span>چرخش با لمس صفحه | ضربه روی سقف جهت استقرار پنل</span>
            </div>
          </div>
        </div>

        {/* Controls Container (order-2 on mobile, order-1 on desktop) */}
        <div className="order-2 lg:order-1 w-full lg:w-80 flex flex-col gap-3 shrink-0">
          
          {/* MOBILE: Compact Tab Selector (< lg) */}
          <div className="flex lg:hidden overflow-x-auto pb-1 gap-1.5 scrollbar-none" aria-label="ابزارهای طراحی">
            {mobileTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = mobileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMobileTab(isActive ? null : tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[40px] border ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {isActive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              );
            })}
          </div>

          {/* MOBILE: Active Tab Content Panel (< lg) */}
          <div className="block lg:hidden">
            {mobileTab === 'ai' && <AILayoutOptimizer />}
            {mobileTab === 'building' && <BuildingSelector />}
            {mobileTab === 'roof' && <RoofOptionPanel />}
            {mobileTab === 'sun' && <SunPathController />}
            {mobileTab === 'stats' && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#E4E7EC] dark:border-slate-800">
                <h3 className="font-bold text-[#1A1D23] dark:text-white border-b border-[#E4E7EC] dark:border-slate-800 pb-2 mb-4">آمار طراحی</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F7F8FA] dark:bg-slate-800/60 p-3 rounded-xl text-center">
                    <div className="text-2xl font-black text-[#1F9254]">{panels.length}</div>
                    <div className="text-xs text-[#5A6072] dark:text-slate-400 mt-1">تعداد پنل</div>
                  </div>
                  <div className="bg-[#F7F8FA] dark:bg-slate-800/60 p-3 rounded-xl text-center">
                    <div className="text-2xl font-black text-[#FF9E2C]">{(panels.length * 0.55).toFixed(1)}</div>
                    <div className="text-xs text-[#5A6072] dark:text-slate-400 mt-1">ظرفیت (kW)</div>
                  </div>
                </div>
                <p className="text-xs text-[#5A6072] dark:text-slate-400 mt-4 text-center">
                  برای قرار دادن پنل روی سقف کلیک کنید.
                </p>
              </div>
            )}
          </div>

          {/* DESKTOP: Full Vertical Sidebar (hidden on mobile, visible on lg) */}
          <div className="hidden lg:flex lg:flex-col gap-4 overflow-y-auto">
            <AILayoutOptimizer />
            <BuildingSelector />
            <RoofOptionPanel />
            <SunPathController />
            
            {/* Desktop Stats Panel */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-[#E4E7EC] dark:border-slate-800 mt-auto">
              <h3 className="font-bold text-[#1A1D23] dark:text-white border-b border-[#E4E7EC] dark:border-slate-800 pb-2 mb-4">آمار طراحی</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#F7F8FA] dark:bg-slate-800/60 p-3 rounded-xl text-center">
                  <div className="text-2xl font-black text-[#1F9254]">{panels.length}</div>
                  <div className="text-xs text-[#5A6072] dark:text-slate-400 mt-1">تعداد پنل</div>
                </div>
                <div className="bg-[#F7F8FA] dark:bg-slate-800/60 p-3 rounded-xl text-center">
                  <div className="text-2xl font-black text-[#FF9E2C]">{(panels.length * 0.55).toFixed(1)}</div>
                  <div className="text-xs text-[#5A6072] dark:text-slate-400 mt-1">ظرفیت (kW)</div>
                </div>
              </div>
              <p className="text-xs text-[#5A6072] dark:text-slate-400 mt-4 text-center">
                برای قرار دادن پنل روی سقف کلیک کنید.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
