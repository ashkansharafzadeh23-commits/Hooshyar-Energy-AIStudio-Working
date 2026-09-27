const fs = require('fs');

let code = fs.readFileSync('src/pages/ContractorDashboard.tsx', 'utf8');

code = code.replace(/{activeTab === 'profile'/g, "{activeTab === 'settings'");
code = code.replace(/activeTab !== 'profile'/g, "activeTab !== 'settings'");

fs.writeFileSync('src/pages/ContractorDashboard.tsx', code);
