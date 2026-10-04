export type BuildingType = 'house' | 'factory' | 'warehouse' | 'farm';

export interface RoofConfig {
  type: 'gable' | 'flat';
  tilt: number; // degrees
  azimuth: number; // degrees
}

export type PanelOrientation = 'portrait' | 'landscape';

export interface SolarModuleModel {
  id: string;
  name: string;
  nameFa: string;
  powerW: number;
  width: number; // meters
  length: number; // meters
  thickness: number; // meters
  cellType: string;
  efficiency: number; // rated STC efficiency
}

export interface PanelInstance {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  orientation?: PanelOrientation;
  modelId?: string;
  tiltOffset?: number; // rack tilt above roof
  efficiency?: number | null; // Real measured engineering efficiency if known (not fabricated)
  renderingCoefficient?: number; // Visual layout rendering coefficient
}
