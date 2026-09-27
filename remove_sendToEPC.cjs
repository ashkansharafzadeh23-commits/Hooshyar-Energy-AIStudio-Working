const fs = require('fs');
let code = fs.readFileSync('src/pages/PowerPlantSetup.tsx', 'utf-8');

const regex = /const sendToEPC = \(\) => \{[\s\S]*?\};\n/;
code = code.replace(regex, '');

fs.writeFileSync('src/pages/PowerPlantSetup.tsx', code);
