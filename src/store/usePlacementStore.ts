import { create } from 'zustand';
import { BuildingType, RoofConfig, PanelInstance, PanelOrientation } from '../types/solar';

export const STANDARD_MODULES = [
  {
    id: '550w-mono',
    nameFa: '۵۵۰ وات مونوکریستال هالف‌سل',
    name: '550W Tier-1 Mono PERC',
    powerW: 550,
    width: 1.13,
    length: 2.27,
    thickness: 0.035,
    cellType: 'Monocrystalline Half-cut 144-cell',
    efficiency: 0.213,
  },
  {
    id: '400w-res',
    nameFa: '۴۰۰ وات مسکونی مشکی',
    name: '400W All-Black Residential',
    powerW: 400,
    width: 1.04,
    length: 1.72,
    thickness: 0.035,
    cellType: 'Monocrystalline All-Black 108-cell',
    efficiency: 0.205,
  },
  {
    id: '670w-bifacial',
    nameFa: '۶۷۰ وات دوطرفه صنعتی',
    name: '670W Bifacial Commercial',
    powerW: 670,
    width: 1.30,
    length: 2.38,
    thickness: 0.035,
    cellType: 'Bifacial TOPCon 132-cell',
    efficiency: 0.218,
  }
];

interface PlacementState {
  buildingType: BuildingType;
  roofConfig: RoofConfig;
  panels: PanelInstance[];
  selectedPanelId: string | null;
  timeOfDay: number;
  // Interactive CAD Placement & Inspector state
  isPlacementMode: boolean;
  activeTool: 'select' | 'place' | 'delete';
  panelOrientation: PanelOrientation;
  selectedModuleId: string;
  panelTiltOffset: number; // additional tilt angle (0 - 45 deg) for flat roof racking
  panelAzimuth: number; // orientation in degrees (180 = South)
  gridSnap: number; // snap interval in meters
  showSunPath: boolean;
  showGrid: boolean;

  setBuildingType: (type: BuildingType) => void;
  setRoofConfig: (config: Partial<RoofConfig>) => void;
  addPanel: (panel: PanelInstance) => void;
  updatePanel: (id: string, updates: Partial<PanelInstance>) => void;
  removePanel: (id: string) => void;
  setSelectedPanelId: (id: string | null) => void;
  setTimeOfDay: (time: number) => void;
  clearPanels: () => void;
  
  // New CAD action setters
  setIsPlacementMode: (active: boolean) => void;
  setActiveTool: (tool: 'select' | 'place' | 'delete') => void;
  setPanelOrientation: (orientation: PanelOrientation) => void;
  setSelectedModuleId: (id: string) => void;
  setPanelTiltOffset: (tilt: number) => void;
  setPanelAzimuth: (azimuth: number) => void;
  setGridSnap: (snap: number) => void;
  setShowSunPath: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
}

export const usePlacementStore = create<PlacementState>((set) => ({
  buildingType: 'house',
  roofConfig: {
    type: 'gable',
    tilt: 30,
    azimuth: 180,
  },
  panels: [],
  selectedPanelId: null,
  timeOfDay: 12,
  isPlacementMode: false,
  activeTool: 'select',
  panelOrientation: 'portrait',
  selectedModuleId: '550w-mono',
  panelTiltOffset: 15,
  panelAzimuth: 180,
  gridSnap: 0.5,
  showSunPath: true,
  showGrid: true,

  setBuildingType: (type) => set({ buildingType: type, panels: [], selectedPanelId: null }),
  setRoofConfig: (config) => set((state) => ({ roofConfig: { ...state.roofConfig, ...config } })),
  addPanel: (panel) => set((state) => ({ panels: [...state.panels, panel] })),
  updatePanel: (id, updates) => set((state) => ({
    panels: state.panels.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  removePanel: (id) => set((state) => ({ 
    panels: state.panels.filter((p) => p.id !== id),
    selectedPanelId: state.selectedPanelId === id ? null : state.selectedPanelId
  })),
  setSelectedPanelId: (id) => set({ selectedPanelId: id }),
  setTimeOfDay: (time) => set({ timeOfDay: time }),
  clearPanels: () => set({ panels: [], selectedPanelId: null }),

  setIsPlacementMode: (active) => set({ 
    isPlacementMode: active, 
    activeTool: active ? 'place' : 'select' 
  }),
  setActiveTool: (tool) => set({ 
    activeTool: tool, 
    isPlacementMode: tool === 'place' 
  }),
  setPanelOrientation: (orientation) => set({ panelOrientation: orientation }),
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),
  setPanelTiltOffset: (tilt) => set({ panelTiltOffset: tilt }),
  setPanelAzimuth: (azimuth) => set({ panelAzimuth: azimuth }),
  setGridSnap: (snap) => set({ gridSnap: snap }),
  setShowSunPath: (show) => set({ showSunPath: show }),
  setShowGrid: (show) => set({ showGrid: show }),
}));

