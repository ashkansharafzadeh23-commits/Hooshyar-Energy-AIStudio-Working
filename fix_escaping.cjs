const fs = require('fs');
let code = fs.readFileSync('src/pages/ContractorDashboard.tsx', 'utf-8');
code = code.replace(/\\\`/g, '\`');
code = code.replace(/\\\$/g, '\$');
fs.writeFileSync('src/pages/ContractorDashboard.tsx', code);
