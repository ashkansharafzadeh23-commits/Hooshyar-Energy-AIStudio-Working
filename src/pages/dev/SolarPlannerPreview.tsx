import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Sun, 
  SlidersHorizontal, 
  Monitor, 
  Smartphone, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  RotateCcw, 
  Eye, 
  Maximize2, 
  Compass, 
  Zap, 
  Info,
  CheckCircle2,
  Sparkles,
  Download,
  PlusCircle,
  Crosshair,
  Trash2,
  Bot,
  BarChart3
} from 'lucide-react';
import { SceneCanvas, CameraPreset } from '../../components/solar/SceneCanvas';
import { BuildingSelector } from '../../components/solar/BuildingSelector';
import { RoofOptionPanel } from '../../components/solar/RoofOptionPanel';
import { PanelInspectorPanel } from '../../components/solar/PanelInspectorPanel';
import { SunPathController } from '../../components/solar/SunPathController';
import { AILayoutOptimizer } from '../../components/solar/AILayoutOptimizer';
import { usePlacementStore, STANDARD_MODULES } from '../../store/usePlacementStore';
import { exportCanvasToPNG } from '../../utils/export';
import { PanelInstance, BuildingType, RoofConfig } from '../../types/solar';

// =========================================================================
// DETERMINISTIC DEV QA FIXTURES (STAGE 13.8.2)
// =========================================================================

function generateResidentialPanels(): PanelInstance[] {
  const panels: PanelInstance[] = [];
  // 18 modules arranged on front pitch of house (tilt 30 deg)
  const tiltRad = (30 * Math.PI) / 180;
  let idx = 1;
  for (let row = 0; row < 3; row++) {
    for (let col = -3; col <= 2; col++) {
      const x = col * 1.35 + 0.65;
      const distAlongSlope = row * 1.95 + 1.2;
      const y = 5.5 + distAlongSlope * Math.sin(tiltRad) + 0.08;
      const z = (18 / 4) + distAlongSlope * Math.cos(tiltRad) - 1.5;
      panels.push({
        id: `res_panel_${idx++}`,
        position: [x, y, z],
        rotation: [-Math.PI / 2 + tiltRad, 0, 0],
        orientation: 'portrait',
        modelId: '550w-mono',
        efficiency: undefined,
        renderingCoefficient: 1.0,
      });
    }
  }
  return panels;
}

function generateCommercialFlatPanels(): PanelInstance[] {
  const panels: PanelInstance[] = [];
  // 48 modules in 4 clean rows of 12 on factory flat roof
  let idx = 1;
  for (let r = -2; r <= 1; r++) {
    for (let c = -6; c <= 5; c++) {
      panels.push({
        id: `comm_panel_${idx++}`,
        position: [c * 1.5 + 0.75, 9.08, r * 3.5 + 1.75],
        rotation: [-Math.PI / 2 + 0.25, 0, 0], // slight 15 deg tilt racks
        orientation: 'portrait',
        modelId: '550w-mono',
        efficiency: undefined,
        renderingCoefficient: 1.0,
      });
    }
  }
  return panels;
}

function generateWarehousePanels(): PanelInstance[] {
  const panels: PanelInstance[] = [];
  // 32 modules on pitched warehouse roof
  const tiltRad = (20 * Math.PI) / 180;
  let idx = 1;
  for (let r = 0; r < 2; r++) {
    for (let c = -8; c <= 7; c++) {
      const x = c * 1.4 + 0.7;
      const distAlongSlope = r * 2.2 + 2;
      const y = 7.5 + distAlongSlope * Math.sin(tiltRad) + 0.08;
      const z = (36 / 4) + distAlongSlope * Math.cos(tiltRad) - 2;
      panels.push({
        id: `wh_panel_${idx++}`,
        position: [x, y, z],
        rotation: [-Math.PI / 2 + tiltRad, 0, 0],
        orientation: 'portrait',
        modelId: '550w-mono',
        efficiency: undefined,
        renderingCoefficient: 1.0,
      });
    }
  }
  return panels;
}

function generateDensePanels(): PanelInstance[] {
  const panels: PanelInstance[] = [];
  // 96 modules dense layout for rendering performance stress testing
  let idx = 1;
  for (let r = -3; r <= 4; r++) {
    for (let c = -6; c <= 5; c++) {
      panels.push({
        id: `dense_panel_${idx++}`,
        position: [c * 1.45 + 0.7, 9.08, r * 2.4],
        rotation: [-Math.PI / 2 + 0.22, 0, 0],
        orientation: 'portrait',
        modelId: '550w-mono',
        efficiency: undefined,
        renderingCoefficient: 1.0,
      });
    }
  }
  return panels;
}

type PreviewTab = 'building' | 'panels' | 'layout' | 'sun' | 'engineering';

export default function SolarPlannerPreview() {
  // DEV-ONLY HARD GUARD: Completely disabled in production builds
  if (!import.meta.env.DEV) {
    return null;
  }

  // Preview state
  const [scenario, setScenario] = useState<
    'RESIDENTIAL' | 'COMMERCIAL' | 'WAREHOUSE' | 'DENSE' | 'EMPTY'
  >('RESIDENTIAL');
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [previewViewport, setPreviewViewport] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset | null>(null);
  const [activePresetName, setActivePresetName] = useState<'3d' | 'top' | 'south' | 'front'>('3d');
  const [activeTab, setActiveTab] = useState<PreviewTab>('building');

  const { 
    panels, 
    setBuildingType, 
    setRoofConfig, 
    clearPanels, 
    addPanel, 
    roofConfig,
    isPlacementMode,
    setIsPlacementMode,
    selectedPanelId,
    removePanel,
    selectedModuleId
  } = usePlacementStore();

  // Load deterministic fixture when scenario changes
  useEffect(() => {
    clearPanels();
    if (scenario === 'RESIDENTIAL') {
      setBuildingType('house');
      setRoofConfig({ type: 'gable', tilt: 30, azimuth: 180 });
      generateResidentialPanels().forEach(p => addPanel(p));
    } else if (scenario === 'COMMERCIAL') {
      setBuildingType('factory');
      setRoofConfig({ type: 'flat', tilt: 0, azimuth: 180 });
      generateCommercialFlatPanels().forEach(p => addPanel(p));
    } else if (scenario === 'WAREHOUSE') {
      setBuildingType('warehouse');
      setRoofConfig({ type: 'gable', tilt: 20, azimuth: 180 });
      generateWarehousePanels().forEach(p => addPanel(p));
    } else if (scenario === 'DENSE') {
      setBuildingType('factory');
      setRoofConfig({ type: 'flat', tilt: 0, azimuth: 180 });
      generateDensePanels().forEach(p => addPanel(p));
    } else if (scenario === 'EMPTY') {
      setBuildingType('house');
      setRoofConfig({ type: 'gable', tilt: 30, azimuth: 180 });
    }
  }, [scenario, clearPanels, setBuildingType, setRoofConfig, addPanel]);

  const handleApplyPreset = (preset: '3d' | 'top' | 'south' | 'front') => {
    setActivePresetName(preset);
    setCameraPreset(preset);
  };

  const handleResetCamera = () => {
    setActivePresetName('3d');
    setCameraPreset('reset');
  };

  const currentMod = STANDARD_MODULES.find(m => m.id === selectedModuleId) || STANDARD_MODULES[0];
  const totalCapacityKw = (panels.length * 0.55).toFixed(1);
  const estimatedAreaM2 = (panels.length * 1.78).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans antialiased" dir="rtl">
      {/* 1. VISIBLE TEST ISOLATION BANNER */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold border-b border-amber-600 shadow-sm sticky top-0 z-50 flex items-center justify-center gap-2">
        <AlertTriangle size={16} className="shrink-0" />
        <span>داده‌های این صفحه صرفاً نمونه آزمایشی هستند و هیچ تغییری در اطلاعات واقعی سامانه ایجاد نمی‌کنند.</span>
      </div>

      {/* 2. COLLAPSIBLE QA CONTROLS TOOLBAR */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-[33px] z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-100 flex items-center gap-2">
                  <span>پنل کنترل سناریوهای QA — مدل‌ساز سه‌بعدی خورشیدی</span>
                  <span className="text-[10px] bg-blue-900/80 text-blue-300 px-2 py-0.5 rounded-full border border-blue-700">
                    STAGE 13.8.5 DEV PREVIEW
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  ارزیابی رفع خطای ابعاد موبایل، تطبیق خودکار کادر دوربین و واقع‌گرایی ماژول‌ها
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Viewport simulation toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('DESKTOP')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px] ${
                    previewViewport === 'DESKTOP' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Monitor size={14} />
                  <span>دسکتاپ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('MOBILE')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px] ${
                    previewViewport === 'MOBILE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>موبایل</span>
                </button>
              </div>

              {/* Collapse/Expand button */}
              <button
                type="button"
                onClick={() => setIsToolbarOpen(prev => !prev)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={isToolbarOpen ? 'بستن کنترل‌ها' : 'باز کردن کنترل‌ها'}
              >
                {isToolbarOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Scenario Selector Pills */}
          {isToolbarOpen && (
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScenario('RESIDENTIAL')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'RESIDENTIAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Building2 size={15} />
                <span>سناریو ۱: سقف شیبدار مسکونی (۱۸ ماژول)</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('COMMERCIAL')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'COMMERCIAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Layers size={15} />
                <span>سناریو ۲: سقف تخت تجاری (۴۸ ماژول)</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('WAREHOUSE')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'WAREHOUSE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Building2 size={15} />
                <span>سناریو ۳: سوله انبار صنعتی (۳۲ ماژول)</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('DENSE')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'DENSE'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Zap size={15} />
                <span>سناریو ۴: آرایه پرتراکم استرس‌تست (۹۶ ماژول)</span>
              </button>

              <button
                type="button"
                onClick={() => setScenario('EMPTY')}
                className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  scenario === 'EMPTY'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <RotateCcw size={15} />
                <span>سناریو ۵: وضعیت اولیه بدون پنل</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. PREVIEW CONTAINER */}
      <div className={`mx-auto px-4 pt-5 transition-all ${
        previewViewport === 'MOBILE' ? 'max-w-md bg-white border border-slate-300 rounded-3xl my-6 shadow-2xl p-4' : 'max-w-7xl'
      }`}>

        {/* 3D Scene Viewport */}
        <div className={`relative rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 ${
          previewViewport === 'MOBILE' 
            ? 'w-full aspect-[4/3] max-h-[360px]' 
            : 'w-full aspect-[4/3] max-h-[380px] sm:aspect-auto sm:h-[48vh] lg:h-[calc(100vh-250px)] lg:min-h-[540px]'
        }`}>
          
          {/* Top-Right: Prominent Placement Toggle */}
          <div className="absolute top-3 right-3 z-30">
            <button
              type="button"
              onClick={() => setIsPlacementMode(!isPlacementMode)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md border ${
                isPlacementMode
                  ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-white/95 text-slate-800 border-slate-200 hover:bg-slate-100 backdrop-blur-md'
              }`}
            >
              <PlusCircle size={16} className={isPlacementMode ? 'text-white' : 'text-emerald-600'} />
              <span>{isPlacementMode ? 'حالت افزودن فعال' : 'افزودن پنل'}</span>
            </button>
          </div>

          {/* Top-Left: Compact Icon Toolbar & Quick Roof Type Switcher */}
          <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md border border-white/10 p-1 rounded-2xl shadow-md">
              <button
                type="button"
                onClick={() => handleApplyPreset('3d')}
                className={`h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activePresetName === '3d'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="سه‌بعدی"
              >
                <Eye size={17} />
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('top')}
                className={`h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activePresetName === 'top'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="پلان بالا"
              >
                <Maximize2 size={17} />
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset('south')}
                className={`h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  activePresetName === 'south'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="نمای جنوب"
              >
                <Compass size={17} />
              </button>

              <button
                type="button"
                onClick={handleResetCamera}
                className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border-r border-slate-700/60 pr-1 mr-0.5"
                title="بازنشانی"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Quick Roof Switcher on HUD */}
            <button
              type="button"
              onClick={() => {
                setRoofConfig({ type: roofConfig.type === 'flat' ? 'gable' : 'flat' });
                clearPanels();
              }}
              className="hidden sm:flex min-h-[44px] px-3 py-1.5 rounded-2xl bg-slate-900/80 text-white border border-white/10 backdrop-blur-md items-center gap-1.5 text-xs font-bold hover:bg-slate-800 cursor-pointer shadow-md transition-colors"
              title="تغییر سریع نوع سقف"
            >
              <Layers size={14} className="text-blue-400" />
              <span>{roofConfig.type === 'flat' ? 'سقف: مسطح' : `سقف: شیبدار (${roofConfig.tilt}°)`}</span>
            </button>
          </div>

          {/* Bottom-Center: Sleek Metrics Badge */}
          <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-xs font-bold text-slate-800 pointer-events-auto">
              <div className="flex items-center gap-1 text-emerald-600">
                <Zap size={14} />
                <span>{panels.length} پنل</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1 text-amber-600 font-mono" dir="ltr">
                <span>{totalCapacityKw} kW</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1 text-slate-500 font-mono text-[11px]" dir="ltr">
                <span>{estimatedAreaM2} m²</span>
              </div>
            </div>

            {isPlacementMode && (
              <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md animate-pulse pointer-events-auto">
                <Crosshair size={14} />
                <span>روی سقف لمس کنید تا پنل اضافه شود</span>
              </div>
            )}
          </div>

          {/* 3D Scene */}
          <SceneCanvas 
            cameraPreset={cameraPreset} 
            onPresetHandled={() => setCameraPreset(null)} 
          />
        </div>

        {/* 4. Interactive Workspace Controls for Full Parity QA */}
        <div className="mt-4 space-y-3">
          {/* Segmented Section Tabs */}
          <div className="flex overflow-x-auto pb-1 gap-1.5 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('building')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'building' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 size={15} />
              <span>ساختمان</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('panels')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'panels' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Crosshair size={15} />
              <span>پنل‌ها</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sun')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sun' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sun size={15} />
              <span>خورشید</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('engineering')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'engineering' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BarChart3 size={15} />
              <span>مهندسی</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          {activeTab === 'building' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BuildingSelector />
              <RoofOptionPanel />
            </div>
          )}

          {activeTab === 'panels' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PanelInspectorPanel />
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Crosshair size={15} className="text-emerald-600" />
                  <span>مدیریت ماژول‌ها</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlacementMode(!isPlacementMode)}
                    className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      isPlacementMode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <PlusCircle size={15} />
                    <span>{isPlacementMode ? 'توقف افزودن' : 'افزودن پنل'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearPanels}
                    disabled={panels.length === 0}
                    className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw size={14} />
                    <span>پاکسازی چیدمان</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sun' && (
            <div>
              <SunPathController />
            </div>
          )}

          {activeTab === 'engineering' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Sparkles size={16} className="text-blue-600" />
                  <span>مشخصات فنی سناریوی آزمایشی</span>
                </div>
                <div className="text-slate-600 space-y-1 text-[11px]">
                  <div>تعداد پنل‌ها: <strong className="text-slate-800">{panels.length} عدد ماژول ۵۵۰ وات استاندارد</strong></div>
                  <div>ظرفیت کل نامی: <strong className="text-slate-800 font-mono" dir="ltr">{totalCapacityKw} kW</strong></div>
                  <div>سطح اشغال تقریبی: <strong className="text-slate-800 font-mono" dir="ltr">{estimatedAreaM2} m²</strong></div>
                  <div>نوع سقف و زاویه: <strong className="text-slate-800">{roofConfig.type === 'flat' ? 'سقف مسطح (تخت)' : `سقف شیبدار با زاویه ${roofConfig.tilt} درجه`}</strong></div>
                </div>
              </div>

              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-500 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <Info size={16} className="text-slate-500" />
                  <span>شفافیت و انطباق با قواعد مهندسی</span>
                </div>
                <p className="text-[11px]">
                  این پیش‌نمایش جهت بررسی بصری اولیه و ارزیابی راحتی تعامل سه‌بعدی طراحی شده است و هیچ‌گونه ادعای طراحی تفصیلی مهندسی، محاسبات سازه‌ای رسمی توانیر یا شبیه‌سازی دقیق سایه‌اندازی (Shading Analysis) ندارد.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
