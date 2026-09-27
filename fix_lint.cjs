const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace("let engineResults = {};", "let engineResults: any = {};");
fs.writeFileSync('server.ts', code);
