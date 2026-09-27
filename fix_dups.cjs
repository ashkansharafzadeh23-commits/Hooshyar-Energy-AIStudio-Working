const fs = require('fs');
let code = fs.readFileSync('src/db/index.ts', 'utf-8');
code = code.replace(/equipmentWarranties\?: EquipmentWarranty\[\];/, '');
fs.writeFileSync('src/db/index.ts', code);
