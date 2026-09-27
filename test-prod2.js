import express from 'express';
import path from 'path';
// import puppeteer from 'puppeteer';

const app = express();
app.use(express.static('dist'));
app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));

const server = app.listen(3002, async () => {
  console.log('Test server started, puppeteer test skipped.');
  server.close();
});
