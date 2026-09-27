import { db } from '../db/index.js';
import {
  EnergyAsset,
  AssetComponent,
  EquipmentWarranty,
  CommissioningRecord,
  CommissioningTest,
  ProjectHandover,
  PunchListItem,
  AssetPassportSnapshot,
  AssetPerformanceBaseline,
  FinalProjectCostSummary
} from '../types/asset.js';

export const assetRepository = {
  // Energy Asset
  getAssets: (): EnergyAsset[] => db.getAssets(),
  getAssetById: (id: string): EnergyAsset | undefined => db.getAssetById(id),
  getAssetsByProjectId: (projectId: string): EnergyAsset[] => db.getAssetsByProjectId(projectId),
  createAsset: (asset: Omit<EnergyAsset, 'id' | 'createdAt' | 'updatedAt' | 'assetCode'> & Partial<Pick<EnergyAsset, 'assetCode'>>): EnergyAsset => db.createAsset(asset),
  updateAsset: (id: string, updates: Partial<EnergyAsset>): EnergyAsset | null => db.updateAsset(id, updates),

  // Components
  getAssetComponents: (assetId: string): AssetComponent[] => db.getAssetComponents(assetId),
  createAssetComponent: (comp: Omit<AssetComponent, 'id' | 'createdAt' | 'updatedAt'>): AssetComponent => db.createAssetComponent(comp),
  updateAssetComponent: (id: string, updates: Partial<AssetComponent>): AssetComponent | null => db.updateAssetComponent(id, updates),

  // Warranties
  getEquipmentWarranties: (assetId?: string): EquipmentWarranty[] => db.getEquipmentWarranties(assetId),
  getEquipmentWarrantiesByProjectId: (projectId: string): EquipmentWarranty[] => db.getEquipmentWarrantiesByProjectId(projectId),
  createEquipmentWarranty: (warranty: Omit<EquipmentWarranty, 'id' | 'createdAt' | 'updatedAt'>): EquipmentWarranty => db.createEquipmentWarranty(warranty),
  updateEquipmentWarranty: (id: string, updates: Partial<EquipmentWarranty>): EquipmentWarranty | null => db.updateEquipmentWarranty(id, updates),

  // Commissioning
  getCommissioningRecords: (projectId: string): CommissioningRecord[] => db.getCommissioningRecords(projectId),
  getCommissioningRecordById: (id: string): CommissioningRecord | undefined => db.getCommissioningRecordById(id),
  createCommissioningRecord: (record: Omit<CommissioningRecord, 'id' | 'createdAt' | 'updatedAt'>): CommissioningRecord => db.createCommissioningRecord(record),
  updateCommissioningRecord: (id: string, updates: Partial<CommissioningRecord>): CommissioningRecord | null => db.updateCommissioningRecord(id, updates),

  // Commissioning Tests
  getCommissioningTests: (recordId: string): CommissioningTest[] => db.getCommissioningTests(recordId),
  getCommissioningTestById: (id: string): CommissioningTest | undefined => db.getCommissioningTestById(id),
  createCommissioningTest: (test: Omit<CommissioningTest, 'id'>): CommissioningTest => db.createCommissioningTest(test),
  updateCommissioningTest: (id: string, updates: Partial<CommissioningTest>): CommissioningTest | null => db.updateCommissioningTest(id, updates),

  // Project Handover
  getProjectHandover: (projectId: string): ProjectHandover | undefined => db.getProjectHandover(projectId),
  getProjectHandoverById: (id: string): ProjectHandover | undefined => db.getProjectHandoverById(id),
  createProjectHandover: (handover: Omit<ProjectHandover, 'id' | 'createdAt'>): ProjectHandover => db.createProjectHandover(handover),
  updateProjectHandover: (id: string, updates: Partial<ProjectHandover>): ProjectHandover | null => db.updateProjectHandover(id, updates),

  // Punch List
  getPunchListItems: (projectId: string): PunchListItem[] => db.getPunchListItems(projectId),
  getPunchListItemById: (id: string): PunchListItem | undefined => db.getPunchListItemById(id),
  createPunchListItem: (item: Omit<PunchListItem, 'id' | 'createdAt' | 'updatedAt' | 'itemNumber'> & Partial<Pick<PunchListItem, 'itemNumber'>>): PunchListItem => db.createPunchListItem(item),
  updatePunchListItem: (id: string, updates: Partial<PunchListItem>): PunchListItem | null => db.updatePunchListItem(id, updates),
  deletePunchListItem: (id: string): void => db.deletePunchListItem(id),

  // Snapshots & Baselines
  getAssetPassportSnapshots: (assetId: string): AssetPassportSnapshot[] => db.getAssetPassportSnapshots(assetId),
  createAssetPassportSnapshot: (snapshot: Omit<AssetPassportSnapshot, 'id' | 'generatedAt'>): AssetPassportSnapshot => db.createAssetPassportSnapshot(snapshot),

  getAssetPerformanceBaselines: (assetId: string): AssetPerformanceBaseline[] => db.getAssetPerformanceBaselines(assetId),
  createAssetPerformanceBaseline: (baseline: Omit<AssetPerformanceBaseline, 'id' | 'calculatedAt'>): AssetPerformanceBaseline => db.createAssetPerformanceBaseline(baseline),

  getFinalProjectCostSummaries: (projectId: string): FinalProjectCostSummary[] => db.getFinalProjectCostSummaries(projectId),
  createFinalProjectCostSummary: (summary: Omit<FinalProjectCostSummary, 'id' | 'calculatedAt'>): FinalProjectCostSummary => db.createFinalProjectCostSummary(summary),
  // Old Solar Asset methods
  getSolarAssets: (): any[] => (db as any).getSolarAssets(),
  getSolarAssetById: (id: string): any => (db as any).getSolarAssetById(id),
  createSolarAsset: (asset: any): any => (db as any).createSolarAsset(asset),
  updateSolarAsset: (id: string, updates: any): any => (db as any).updateSolarAsset(id, updates),
  getAssetDocuments: (assetId: string): any[] => (db as any).getAssetDocuments(assetId),
  createAssetDocument: (doc: any): any => (db as any).createAssetDocument(doc),
  createAssetAuditLog: (log: any): any => (db as any).createAssetAuditLog(log),
};
