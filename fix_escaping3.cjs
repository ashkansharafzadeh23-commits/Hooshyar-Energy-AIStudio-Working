const fs = require('fs');
let code = fs.readFileSync('src/pages/PowerPlantSetup.tsx', 'utf-8');
code = code.replace(/\\\`/g, '\`');
code = code.replace(/\\\$/g, '\$');
fs.writeFileSync('src/pages/PowerPlantSetup.tsx', code);
