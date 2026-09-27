import express from 'express';
import path from 'path';
// import puppeteer from 'puppeteer';

const app = express();
app.use(express.static('dist'));

// Mock API
app.post('/api/analyze', (req, res) => {
  res.json({
    targets: ['solar'],
    solar: {
      finalKwp: 5,
      panelOptions: {
        economy: { panelCount: 10, actualSystemKwp: 5.5, totalCost: 1000000000, costPerWatt: 18000, wattPerM2: 200, panelWattage: 550, panel: { brand: 'Test', model: 'M1' } },
        balanced: { panelCount: 10, actualSystemKwp: 5.5, totalCost: 1200000000, costPerWatt: 20000, wattPerM2: 210, panelWattage: 550, panel: { brand: 'Test', model: 'M2' } },
        spaceSaving: { panelCount: 9, actualSystemKwp: 5.4, totalCost: 1500000000, costPerWatt: 25000, wattPerM2: 220, panelWattage: 600, panel: { brand: 'Test', model: 'M3' } },
        default: { panelCount: 10, actualSystemKwp: 5.5, totalCost: 1200000000, costPerWatt: 20000, wattPerM2: 210, panelWattage: 550, panel: { brand: 'Test', model: 'M2' } }
      }
    },
    dataSource: {
      monthlySunHours: {
        JAN: 3.5, FEB: 4, MAR: 4.5, APR: 5, MAY: 5.5, JUN: 6, JUL: 6, AUG: 5.5, SEP: 5, OCT: 4.5, NOV: 4, DEC: 3.5
      }
    },
    dailyConsumptionEstimate: { monthlyKwh: 500 }
  });
});

app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));

const server = app.listen(3003, async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    // Inject state into localStorage so state.targets = ['solar'], state.city = 'تهران'
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('userFlowState', JSON.stringify({
        theme: 'light',
        targets: ['solar'],
        locationType: null,
        area: 100,
        usableArea: 70,
        city: 'تهران',
        gridConnected: true,
        gridStable: true,
        appliances: [],
        essentialAppliances: [],
        supportHours: 2,
        actualMonthlyKwh: null,
        notifications: []
      }));
    });

    await page.goto('http://localhost:3003/result', { waitUntil: 'networkidle0' });
    
    // Check if #root is empty
    const rootHtml = await page.$eval('#root', el => el.innerHTML);
    if (rootHtml.includes('Something went wrong')) {
      console.log("ERROR BOUNDARY TRIGGERED!");
    } else if (!rootHtml) {
      console.log("ROOT IS EMPTY - REACT CRASHED!");
    } else {
      console.log("ROOT HAS CONTENT");
    }
    
    await browser.close();
  } catch (err) {
    console.error(err);
  } finally {
    server.close();
  }
});
