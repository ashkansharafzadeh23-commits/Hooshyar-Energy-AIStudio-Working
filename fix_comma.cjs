const fs = require('fs');
let code = fs.readFileSync('src/db/index.ts', 'utf-8');
code = code.replace(/updateAsset:(.*?)\}(?!,)/, 'updateAsset:$1},');
code = code.replace(/updateAssetComponent:(.*?)\}(?!,)/, 'updateAssetComponent:$1},');
code = code.replace(/createAssetComponent:(.*?)\}(?!,)/, 'createAssetComponent:$1},');
code = code.replace(/updateEquipmentWarranty:(.*?)\}(?!,)/, 'updateEquipmentWarranty:$1},');
code = code.replace(/createEquipmentWarranty:(.*?)\}(?!,)/, 'createEquipmentWarranty:$1},');
code = code.replace(/createCommissioningRecord:(.*?)\}(?!,)/, 'createCommissioningRecord:$1},');
code = code.replace(/updateCommissioningRecord:(.*?)\}(?!,)/, 'updateCommissioningRecord:$1},');
code = code.replace(/createCommissioningTest:(.*?)\}(?!,)/, 'createCommissioningTest:$1},');
code = code.replace(/updateCommissioningTest:(.*?)\}(?!,)/, 'updateCommissioningTest:$1},');
code = code.replace(/createProjectHandover:(.*?)\}(?!,)/, 'createProjectHandover:$1},');
code = code.replace(/updateProjectHandover:(.*?)\}(?!,)/, 'updateProjectHandover:$1},');
code = code.replace(/createAssetPassportSnapshot:(.*?)\}(?!,)/, 'createAssetPassportSnapshot:$1},');
// Fix all missing commas
code = code.replace(/(\} \s*)(?=\w+: )/g, '}, ');
fs.writeFileSync('src/db/index.ts', code);
