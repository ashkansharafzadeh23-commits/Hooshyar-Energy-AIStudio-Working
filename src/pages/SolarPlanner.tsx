import React, { useState } from 'react';
import { SceneCanvas, CameraPreset } from '../components/solar/SceneCanvas';
import { BuildingSelector } from '../components/solar/BuildingSelector';
import { RoofOptionPanel } from '../components/solar/RoofOptionPanel';
import { SunPathController } from '../components/solar/SunPathController';
import { AILayoutOptimizer } from '../components/solar/AILayoutOptimizer';
import { PanelInspectorPanel } from '../components/solar/PanelInspectorPanel';
import { usePlacementStore } from '../store/usePlacementStore';
import { 
  Download, 
  Trash2, 
  Bot, 
  Building2, 
  Layers, 
  Sun, 
  BarChart3, 
  RotateCcw,
  Compass,
  Eye,
  Maximize2,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Crosshair
} from 'lucide-react';
import { exportCanvasToPNG } from '../utils/export';

type WorkspaceTab = 'building' | 'panels' | 'layout' | 'sun' | 'engineering';

export default function SolarPlanner() {
  const { 
    panels, 
    clearPanels, 
    selectedPanelId, 
    removePanel, 
    roofConfig, 
    setRoofConfig,
    isPlacementMode,
    setIsPlacementMode
  } = usePlacementStore();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('building');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | null>(null);
  const [activePresetName, setActivePresetName] = useState<'3d' | 'top' | 'south' | 'front'>('3d');

  const workspaceTabs = [
    { id: 'building' as const, label: 'ساختمان و سقف', icon: Building2 },
    { id: 'panels' as const, label: 'پنل‌ها', icon: Crosshair },
    { id: 'layout' as const, label: 'چیدمان', icon: Bot },
    { id: 'sun' as const, label: 'خورشید', icon: Sun },
    { id: 'engineering' as const, label: 'مهندسی', icon: BarChart3 }
  ];

  const handleApplyPreset = (preset: '3d' | 'top' | 'south' | 'front') => {
    setActivePresetName(preset);
    setCameraPreset(preset);
  };

  const handleResetCamera = () => {
    setActivePresetName('3d');
    setCameraPreset('reset');
  };

  const selectedPanel = panels.find(p => p.id === selectedPanelId);

  // Authoritative DC Capacity Invariants (550W baseline: panels.length * 0.55)
  const totalCapacityKw = (panels.length * 0.55).toFixed(1);
  const estimatedAreaM2 = (panels.length * 1.78).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-Vazirmatn flex flex-col p-2.5 sm:p-4 md:p-6 gap-3 md:gap-5" dir="rtl">
      {/* 1. Header & Workspace Navigation */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              مدل‌ساز اولیه جانمایی فتوولتائیک
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Stage 13.8.4 CAD</span>
          </div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white mt-1">
            طراحی و جانمایی سه‌بعدی آرایه خورشیدی
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 leading-relaxed">
            مدل بصری اولیه برای بررسی جانمایی ماژول‌ها و تخمین مقدماتی ظرفیت نامی نیروگاه
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {selectedPanelId && (
            <button 
              type="button"
              onClick={() => removePanel(selectedPanelId)}
              className="min-h-[44px] bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 transition-colors cursor-pointer shadow-xs"
              aria-label="حذف ماژول انتخابی"
            >
              <Trash2 size={16} />
              <span>حذف ماژول انتخابی</span>
            </button>
          )}

          <button 
            type="button"
            onClick={clearPanels}
            disabled={panels.length === 0}
            className="min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center gap-1.5"
            aria-label="پاکسازی تمام ماژول‌ها"
          >
            <RotateCcw size={15} />
            <span>پاکسازی چیدمان</span>
          </button>

          <button 
            type="button"
            onClick={() => exportCanvasToPNG('hooshyar-solar-layout.png')}
            className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            aria-label="دانلود تصویر خروجی سه‌بعدی"
          >
            <Download size={16} />
            <span>خروجی تصویر (PNG)</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-3.5 md:gap-5 flex-1 items-stretch">
        
        {/* ============================================================== */}
        {/* 3D CANVAS VIEWPORT (Bounded Content-Driven Architecture)       */}
        {/* ============================================================== */}
        <div 
          id="three-scene-container" 
          className="order-1 lg:order-2 flex-1 relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-sm bg-slate-900 w-full aspect-[4/3] max-h-[380px] sm:aspect-auto sm:h-[48vh] sm:max-h-[500px] lg:h-[calc(100vh-170px)] lg:max-h-none lg:min-h-[540px]"
        >
          {/* Top-Right: Prominent Placement Toggle */}
          <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlacementMode(!isPlacementMode)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md border ${
                isPlacementMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-800 animate-pulse'
                  : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 backdrop-blur-md'
              }`}
              aria-label="افزودن دستی پنل خورشیدی"
            >
              <PlusCircle size={16} className={isPlacementMode ? 'text-white' : 'text-emerald-600'} />
              <span>{isPlacementMode ? 'حالت افزودن فعال' : 'افزودن پنل'}</span>
            </button>
          </div>

          {/* Top-Left: Compact Camera Controls & Quick Roof Indicator */}
          <div className="absolute top-2.5 left-2.5 z-30 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-slate-900/80 dark:bg-slate-900/90 backdrop-blur-md border border-white/10 p-0.5 rounded-2xl shadow-md">
              <button
                type="button"
                onClick={() => handleApplyPreset('3d')}
                className={`h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activePresetName === '3d'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="نمای سه‌بعدی ایزومتریک"
                aria-label="نمای سه‌بعدی"
              >
                <Eye size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('top')}
                className={`h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activePresetName === 'top'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="نمای بالا (پلان دوبعدی)"
                aria-label="نمای پلان بالا"
              >
                <Maximize2 size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('south')}
                className={`h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activePresetName === 'south'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="نمای جنوب (زاویه تابش)"
                aria-label="نمای جنوب"
              >
                <Compass size={16} />
              </button>

              <button
                type="button"
                onClick={handleResetCamera}
                className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border-r border-slate-700/60 pr-0.5 mr-0.5"
                title="بازنشانی زاویه دید دوربین"
                aria-label="بازنشانی نما"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {/* Quick Roof Type Switcher */}
            <button
              type="button"
              onClick={() => {
                setRoofConfig({ type: roofConfig.type === 'flat' ? 'gable' : 'flat' });
                clearPanels();
              }}
              className="hidden sm:flex min-h-[44px] px-3 py-1.5 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md items-center gap-1.5 text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-md transition-colors"
              title="تغییر سریع نوع سقف"
              aria-label="تغییر سریع نوع سقف"
            >
              <Layers size={14} className="text-blue-400" />
              <span>{roofConfig.type === 'flat' ? 'سقف: مسطح' : `سقف: شیبدار (${roofConfig.tilt}°)`}</span>
            </button>
          </div>

          {/* Bottom Edge: Minimal Non-Obstructing Metric Pill */}
          <div className="absolute bottom-2.5 inset-x-2.5 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm text-xs font-bold text-slate-800 dark:text-slate-200 pointer-events-auto">
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Zap size={14} />
                <span>{panels.length} پنل</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono" dir="ltr">
                <span>{totalCapacityKw} kW</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1 text-slate-500 font-mono text-[11px]" dir="ltr">
                <span>{estimatedAreaM2} m²</span>
              </div>
            </div>

            {/* Active Placement Hint Banner */}
            {isPlacementMode ? (
              <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md animate-pulse pointer-events-auto">
                <Crosshair size={14} />
                <span>روی سقف لمس کنید تا پنل اضافه شود</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-900/75 text-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl text-[11px] font-medium shadow-sm">
                <Compass size={13} className="text-blue-400" />
                <span>جهت پنل‌ها رو به جنوب (180° S) | شیب: {roofConfig.type === 'flat' ? 'تخت (0°)' : `${roofConfig.tilt}°`}</span>
              </div>
            )}
          </div>

          {/* Selected Module Detail Overlay */}
          {selectedPanel && (
            <div className="absolute top-14 left-2.5 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-300 dark:border-amber-800 p-2.5 rounded-2xl shadow-md text-xs space-y-1.5 max-w-[220px]">
              <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/50 pb-1">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>ماژول انتخابی</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400" dir="ltr">550W Tier-1</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                <div>نوع: <span className="font-bold">مونوکریستال هالف‌سل</span></div>
                <div>جهت: <span className="font-bold">{selectedPanel.orientation === 'landscape' ? 'افقی' : 'عمودی'}</span></div>
              </div>
              <button
                type="button"
                onClick={() => removePanel(selectedPanel.id)}
                className="w-full py-1.5 min-h-[36px] bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>حذف این ماژول</span>
              </button>
            </div>
          )}

          {/* The R3F 3D Canvas */}
          <SceneCanvas 
            cameraPreset={cameraPreset} 
            onPresetHandled={() => setCameraPreset(null)} 
          />
        </div>

        {/* ============================================================== */}
        {/* WORKSPACE SECTIONS & CONTROLS (Full Feature Parity)            */}
        {/* ============================================================== */}
        <div className="order-2 lg:order-1 w-full lg:w-88 xl:w-96 flex flex-col gap-3 shrink-0">
          
          {/* SEGMENTED WORKSPACE TABS */}
          <div className="flex overflow-x-auto pb-1 gap-1.5 scrollbar-none border-b border-slate-200 dark:border-slate-800" aria-label="بخش‌های محیط طراحی خورشیدی">
            {workspaceTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 min-h-[44px] border cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ACTIVE TAB CONTENT */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-0.5">
            {/* 1. ساختمان و سقف (Building & Roof Controls) */}
            {activeTab === 'building' && (
              <div className="space-y-3">
                <RoofOptionPanel />
                <BuildingSelector />
              </div>
            )}

            {/* 2. پنل‌ها (Panels, Models, Orientation, Racking) */}
            {activeTab === 'panels' && (
              <div className="space-y-3">
                {/* Manual Placement Card */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Crosshair size={15} className="text-emerald-600" />
                      <span>ابزار جانمایی دستی پنل</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPlacementMode 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}>
                      {isPlacementMode ? 'حالت افزودن فعال' : 'غیرفعال'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    با فعال‌سازی این ابزار، مستقیماً با کلیک یا لمس سطح سقف در نمای سه‌بعدی ماژول اضافه می‌شود.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlacementMode(!isPlacementMode)}
                      className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isPlacementMode
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <PlusCircle size={15} />
                      <span>{isPlacementMode ? 'توقف افزودن' : 'افزودن پنل'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={clearPanels}
                      disabled={panels.length === 0}
                      className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw size={14} />
                      <span>پاکسازی چیدمان</span>
                    </button>
                  </div>
                </div>

                {/* Module Inspector & Racking Settings */}
                <PanelInspectorPanel />
              </div>
            )}

            {/* 3. چیدمان (Automated Layout Optimizer) */}
            {activeTab === 'layout' && (
              <div className="space-y-3">
                <AILayoutOptimizer />
              </div>
            )}

            {/* 4. خورشید (Sun, Daylighting, Trajectory) */}
            {activeTab === 'sun' && (
              <div className="space-y-3">
                <SunPathController />
              </div>
            )}

            {/* 5. مهندسی (Engineering Summary & Disclaimers) */}
            {activeTab === 'engineering' && (
              <div className="space-y-3">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                      <BarChart3 size={16} className="text-blue-600" />
                      <span>خلاصه فنی آرایه فتوولتائیک</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">550W Standard</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xl font-black text-emerald-600">{panels.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">تعداد ماژول‌ها</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xl font-black text-amber-500 font-mono" dir="ltr">{totalCapacityKw} kW</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">ظرفیت نامی تقریبی</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-base font-black text-slate-800 dark:text-slate-200 font-mono" dir="ltr">{estimatedAreaM2} m²</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">سطح اشغال تقریبی</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-base font-black text-blue-600">{roofConfig.type === 'flat' ? 'تخت (۰°)' : `${roofConfig.tilt}°`}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">زاویه شیب سقف</div>
                    </div>
                  </div>

                  {/* Orientation guidance */}
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900 text-[11px] text-blue-950 dark:text-blue-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-blue-600" />
                      <span>قاعده بهینگی جغرافیایی ایران</span>
                    </div>
                    <p className="leading-relaxed text-blue-900 dark:text-blue-300">
                      ماژول‌ها رو به جنوب (آزیموت ۱۸۰°) مستقر شده‌اند. زاویه بهینه شیب در اکثر نقاط ایران بین ۲۵ تا ۳۵ درجه است.
                    </p>
                  </div>
                </div>

                {/* Truthful Disclaimer Card */}
                <div className="p-4 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <AlertCircle size={14} className="text-slate-500 shrink-0" />
                    <span>شفافیت و حدود اعتبار مهندسی</span>
                  </div>
                  <p>
                    این ابزار صرفاً یک مدل بصری اولیه برای بررسی جانمایی فیزیکی ماژول‌ها و تخمین مقدماتی ظرفیت نامی است و نباید به عنوان طراحی تفصیلی مهندسی، محاسبات رسمی نظام مهندسی یا شبیه‌سازی دقیق سایه‌اندازی قلمداد گردد.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
