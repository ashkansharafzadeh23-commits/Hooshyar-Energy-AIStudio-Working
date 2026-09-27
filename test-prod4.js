import express from 'express';
import path from 'path';
// import puppeteer from 'puppeteer';

const app = express();
app.use(express.static('dist'));
app.post('/api/analyze', (req, res) => {
  res.json({
    targets: ['solar'],
    solar: { finalKwp: 5, panelOptions: { default: { panelCount: 10, actualSystemKwp: 5, totalCost: 1000 } } },
    dataSource: { monthlySunHours: { JAN: 1 } },
    dailyConsumptionEstimate: { monthlyKwh: 500 }
  });
});
app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));

const server = app.listen(3004, async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('userFlowState', JSON.stringify({ targets: ['solar'], city: 'تهران', notifications: [] }));
    });

    await page.goto('http://localhost:3004/result', { waitUntil: 'networkidle0' });
    
    const tabs = await page.$$('button');
    for (let tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text === 'بهار' || text === 'تابستان') {
        console.log("Clicking tab:", text);
        await tab.click();
      }
    }
    
    console.log("ROOT HAS CONTENT");
    await browser.close();
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
