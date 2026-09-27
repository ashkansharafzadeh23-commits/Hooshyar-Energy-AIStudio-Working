const fs = require('fs');
let db = JSON.parse(fs.readFileSync('db.json', 'utf8'));
db.cityIrradianceCache = [];
fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
