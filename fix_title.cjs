const fs = require('fs');
let code = fs.readFileSync('src/pages/VendorsList.tsx', 'utf-8');
code = code.replace("ورود شرکت‌های EPC", "شرکت ها برای احداث نیروگاه");
fs.writeFileSync('src/pages/VendorsList.tsx', code);

let code2 = fs.readFileSync('src/pages/ContractorAuth.tsx', 'utf-8');
code2 = code2.replace("ورود شرکت EPC", "ورود شرکت");
fs.writeFileSync('src/pages/ContractorAuth.tsx', code2);
