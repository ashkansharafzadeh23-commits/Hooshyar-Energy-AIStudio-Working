export type LocationType = 'residential' | 'industrial_warehouse' | 'factory' | 'agricultural';

export type TargetModule = 'solar' | 'generator' | 'powerbank' | 'auto';

export interface SelectedAppliance {
  id: string;
  name: string;
  quantity: number;
  hours: number;
  watt: number;
}

export interface UserFlowState {
  theme: 'light' | 'dark';
  targets: TargetModule[];
  locationType: LocationType | null;
  area: number;
  monthlyConsumptionKwh?: number;
  usableArea: number;
  city: string;
  province?: string;
  monthlyKwh?: number;
  gridConnected: boolean;
  gridStable: boolean;
  appliances: SelectedAppliance[];
  essentialAppliances: SelectedAppliance[]; // For powerbank
  supportHours: number;
  actualMonthlyKwh: number | null;
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  date: string;
}
