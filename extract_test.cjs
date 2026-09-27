const fs = require('fs');
const content = fs.readFileSync('api/analyze.js', 'utf8');
console.log(content.length);
