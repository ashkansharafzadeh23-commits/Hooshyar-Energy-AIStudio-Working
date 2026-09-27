import { create } from 'zustand';
import { BuildingType, RoofConfig, PanelInstance } from '../types/solar';

interface PlacementState {
  buildingType: BuildingType;
  roofConfig: RoofConfig;
  panels: PanelInstance[];
  selectedPanelId: string | null;
  timeOfDay: number;
  setBuildingType: (type: BuildingType) => void;
  setRoofConfig: (config: Partial<RoofConfig>) => void;
  addPanel: (panel: PanelInstance) => void;
  updatePanel: (id: string, updates: Partial<PanelInstance>) => void;
  removePanel: (id: string) => void;
  setSelectedPanelId: (id: string | null) => void;
  setTimeOfDay: (time: number) => void;
  clearPanels: () => void;
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
  setBuildingType: (type) => set({ buildingType: type, panels: [] }),
  setRoofConfig: (config) => set((state) => ({ roofConfig: { ...state.roofConfig, ...config } })),
  addPanel: (panel) => set((state) => ({ panels: [...state.panels, panel] })),
  updatePanel: (id, updates) => set((state) => ({
    panels: state.panels.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  removePanel: (id) => set((state) => ({ panels: state.panels.filter((p) => p.id !== id) })),
  setSelectedPanelId: (id) => set({ selectedPanelId: id }),
  setTimeOfDay: (time) => set({ timeOfDay: time }),
  clearPanels: () => set({ panels: [] })
}));
