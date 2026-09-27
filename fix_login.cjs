const fs = require('fs');
let code = fs.readFileSync('src/pages/CustomerLogin.tsx', 'utf-8');
code = code.replace("navigate('/user-dashboard');", "navigate('/target-select');");
fs.writeFileSync('src/pages/CustomerLogin.tsx', code);
