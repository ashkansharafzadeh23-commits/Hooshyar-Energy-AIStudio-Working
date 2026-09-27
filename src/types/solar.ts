export type BuildingType = 'house' | 'factory' | 'warehouse' | 'farm';

export interface RoofConfig {
  type: 'gable' | 'flat';
  tilt: number; // degrees
  azimuth: number; // degrees
}

export interface PanelInstance {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  efficiency?: number | null; // Real measured engineering efficiency if known (not fabricated)
  renderingCoefficient?: number; // Visual layout rendering coefficient
}
