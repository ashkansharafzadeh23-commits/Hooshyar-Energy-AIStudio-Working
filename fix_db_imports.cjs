const fs = require('fs');
let code = fs.readFileSync('src/db/index.ts', 'utf-8');
code = code.replace(/import \{ BillOfQuantities.*/, `import { BillOfQuantities, BOQItem, ProcurementRFQ, ProcurementPackage, SupplierInvitation, VendorQuote, VendorQuoteItem, VendorQuoteRevision, SupplierAward, PurchaseOrder, PurchaseOrderItem, DeliveryRecord, DeliveryItem } from '../types/procurement.js';
import { EnergyAsset, AssetComponent, EquipmentWarranty, CommissioningRecord, CommissioningTest, AssetOwnershipRecord, AssetPassportSnapshot, AssetPerformanceBaseline, ProjectHandover, FinalProjectCostSummary } from '../types/asset.js';`);

code = code.replace(/interface DB \{/, `interface DB {
  energyAssets?: EnergyAsset[];
  assetComponents?: AssetComponent[];
  equipmentWarranties?: EquipmentWarranty[];
  commissioningRecords?: CommissioningRecord[];
  commissioningTests?: CommissioningTest[];
  assetOwnershipRecords?: AssetOwnershipRecord[];
  assetPassportSnapshots?: AssetPassportSnapshot[];
  assetPerformanceBaselines?: AssetPerformanceBaseline[];
  projectHandovers?: ProjectHandover[];
  finalProjectCostSummaries?: FinalProjectCostSummary[];`);
  
fs.writeFileSync('src/db/index.ts', code);
