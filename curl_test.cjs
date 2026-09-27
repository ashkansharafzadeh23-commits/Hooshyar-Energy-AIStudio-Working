const http = require('http');

const data = JSON.stringify({
  targets: ["solar"],
  locationType: "residential",
  area: 100,
  city: "تهران"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const json = JSON.parse(body);
    console.log(json.dataSource);
  });
});
req.write(data);
req.end();
