const fs = require('fs');
let code = fs.readFileSync('src/pages/PowerPlantSetup.tsx', 'utf-8');

code = code.replace("      requests.push(newReq);\n    localStorage.setItem('epc_requests', JSON.stringify(requests));\n    setIsSent(true);\n  };\n", "");

fs.writeFileSync('src/pages/PowerPlantSetup.tsx', code);
