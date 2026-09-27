import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { db } from '../src/db/index.js';
import { setupTestDatabaseIsolation, computeFileHash } from './test_isolation_guard.js';
import recommendHandler from '../api/energy/recommend.js';
import analyzeHandler from '../api/analyze.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function request(
  serverUrl: string,
  method: 'GET' | 'POST',
  endpoint: string,
  body?: any
) {
  const res = await fetch(`${serverUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return {
    status: res.status,
    body: json,
  };
}

async function runStage1_1Tests() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY V2 — STAGE 1.1 RECOMMENDATION INTEGRITY TEST SUITE');
  console.log('========================================================================');

  // Database isolation guard
  const repoDbPath = path.resolve(process.cwd(), 'db.json');
  const initialDbHash = computeFileHash(repoDbPath);
  setupTestDatabaseIsolation('hooshyar_stage1_1_recommend');

  const app = express();
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());

  // Mount handlers
  app.post('/api/energy/recommend', (req, res) => recommendHandler(req, res));
  app.post('/api/analyze', (req, res) => analyzeHandler(req, res));

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const serverUrl = `http://localhost:${port}`;
  console.log(`[SETUP] Isolated test server listening on ${serverUrl}`);

  try {
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Missing Consumption in Normal Engineering Mode ---');
    // -------------------------------------------------------------
    const resNoConsumption = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'تهران',
        usableArea: 100,
        gridConnected: true,
        locationType: 'residential'
      }
    });
    assert(resNoConsumption.status === 400, 'Missing consumption rejected with HTTP 400');
    assert(resNoConsumption.body.code === 'INSUFFICIENT_CONSUMPTION_DATA', 'Rejection code is INSUFFICIENT_CONSUMPTION_DATA');
    assert(Array.isArray(resNoConsumption.body.missingInfo), 'missingInfo array returned');

    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Missing Installation Area for Solar Candidate ---');
    // -------------------------------------------------------------
    const resNoArea = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'تهران',
        monthlyConsumptionKwh: 600,
        gridConnected: true,
        locationType: 'residential'
        // usableArea & totalArea missing
      }
    });
    assert(resNoArea.status === 400, 'Missing area rejected with HTTP 400');
    assert(resNoArea.body.code === 'INSUFFICIENT_AREA_DATA', 'Rejection code is INSUFFICIENT_AREA_DATA');

    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Missing Irradiance / Unknown City without User Input ---');
    // -------------------------------------------------------------
    const resUnknownCity = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'شهر_نامشخص_تستی',
        monthlyConsumptionKwh: 600,
        usableArea: 100,
        gridConnected: true,
        locationType: 'residential'
      }
    });
    assert(resUnknownCity.status === 400, 'Unknown city without irradiance rejected with HTTP 400');
    assert(resUnknownCity.body.code === 'INSUFFICIENT_IRRADIANCE_DATA', 'Rejection code is INSUFFICIENT_IRRADIANCE_DATA');

    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Unverified Direct sunHours without Source Attribution ---');
    // -------------------------------------------------------------
    const resUnverifiedSun = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        sunHours: 5.5, // Provided directly without sunHoursSource or valid city
        monthlyConsumptionKwh: 600,
        usableArea: 100,
        gridConnected: true,
        locationType: 'residential'
      }
    });
    assert(resUnverifiedSun.status === 400, 'Unverified direct sunHours without source rejected with HTTP 400');
    assert(resUnverifiedSun.body.code === 'UNVERIFIED_IRRADIANCE_INPUT', 'Rejection code is UNVERIFIED_IRRADIANCE_INPUT');

    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Valid NASA-Sourced Irradiation Recommendation ---');
    // -------------------------------------------------------------
    const resNasa = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'تهران',
        monthlyConsumptionKwh: 600,
        usableArea: 100,
        gridConnected: true,
        locationType: 'residential',
        allowBenchmarkPricing: true
      }
    });
    assert(resNasa.status === 200, 'Valid NASA request succeeds with HTTP 200');
    assert(resNasa.body.dataSource !== null, 'dataSource metadata present');
    assert(resNasa.body.dataSource.dataClassification === 'VERIFIED_SOURCE', 'Classification is VERIFIED_SOURCE');
    assert(resNasa.body.dataSource.isVerifiedSource === true, 'isVerifiedSource is true');
    assert(Array.isArray(resNasa.body.solutions) && resNasa.body.solutions.length > 0, 'Solutions array returned');

    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Valid User-Provided Irradiation with Attribution ---');
    // -------------------------------------------------------------
    const resUserIrradiance = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'روستای_دورافتاده',
        customSunHours: 5.4,
        customSunHoursSource: 'گزارش امکان‌سنجی دانشگاه شریف',
        monthlyConsumptionKwh: 600,
        usableArea: 100,
        gridConnected: true,
        locationType: 'residential',
        allowBenchmarkPricing: true
      }
    });
    assert(resUserIrradiance.status === 200, 'User-provided irradiance succeeds with HTTP 200');
    assert(resUserIrradiance.body.dataSource.dataClassification === 'USER_PROVIDED', 'Classification is USER_PROVIDED');
    assert(resUserIrradiance.body.dataSource.isVerifiedSource === false, 'User-provided is NOT labeled as NASA verified');
    assert(resUserIrradiance.body.dataSource.source === 'USER_PROVIDED', 'Source is USER_PROVIDED');

    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Explicit Hypothetical Scenario with User Inputs ---');
    // -------------------------------------------------------------
    const resHypotheticalValid = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        isHypotheticalScenario: true,
        hypotheticalDailyKwh: 25,
        hypotheticalArea: 150,
        city: 'تهران',
        gridConnected: true,
        allowBenchmarkPricing: true
      }
    });
    assert(resHypotheticalValid.status === 200, 'Valid hypothetical scenario succeeds with HTTP 200');
    assert(resHypotheticalValid.body.isHypothetical === true, 'isHypothetical flag is true');
    assert(resHypotheticalValid.body.classification === 'HYPOTHETICAL_SIMULATION', 'Classification is HYPOTHETICAL_SIMULATION');
    assert(resHypotheticalValid.body.consumptionProvenance.dailyKwh === 25, 'Exact hypothetical consumption preserved as 25');

    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Missing Hypothetical Scenario Inputs (No Silent Fallback) ---');
    // -------------------------------------------------------------
    const resHypotheticalMissing = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        isHypotheticalScenario: true,
        // hypotheticalDailyKwh missing! Must NOT invent 15!
        hypotheticalArea: 150,
        city: 'تهران',
        gridConnected: true
      }
    });
    assert(resHypotheticalMissing.status === 400, 'Missing hypothetical scenario consumption rejected with HTTP 400');
    assert(resHypotheticalMissing.body.code === 'MISSING_SCENARIO_INPUTS', 'Rejection code is MISSING_SCENARIO_INPUTS');

    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Price Data Required State When Benchmark Is Not Enabled ---');
    // -------------------------------------------------------------
    const resPriceRequired = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'تهران',
        monthlyConsumptionKwh: 600,
        usableArea: 100,
        gridConnected: true,
        locationType: 'residential',
        allowBenchmarkPricing: false // Explicitly disabled
      }
    });
    assert(resPriceRequired.status === 200, 'Request succeeds with HTTP 200');
    assert(resPriceRequired.body.pricingStatus === 'PRICE_DATA_REQUIRED', 'pricingStatus is PRICE_DATA_REQUIRED');
    for (const sol of resPriceRequired.body.solutions) {
      assert(sol.estimatedCostIRR === null, `Solution ${sol.systemType} has estimatedCostIRR === null (no fabricated prices)`);
      assert(sol.pricingStatus === 'PRICE_DATA_REQUIRED', `Solution ${sol.systemType} has pricingStatus === PRICE_DATA_REQUIRED`);
    }

    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Explicit Benchmark Pricing Mode Enabled ---');
    // -------------------------------------------------------------
    const resBenchmarkPricing = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'تهران',
        monthlyConsumptionKwh: 600,
        usableArea: 100,
        gridConnected: true,
        locationType: 'residential',
        allowBenchmarkPricing: true // Explicitly enabled
      }
    });
    assert(resBenchmarkPricing.status === 200, 'Benchmark pricing request succeeds (HTTP 200)');
    assert(resBenchmarkPricing.body.pricingStatus === 'PRELIMINARY_BENCHMARK', 'pricingStatus is PRELIMINARY_BENCHMARK');
    for (const sol of resBenchmarkPricing.body.solutions) {
      if (sol.technicalSummary.solarPart && sol.technicalSummary.solarPart.finalKwp > 0) {
        assert(typeof sol.estimatedCostIRR === 'number' && sol.estimatedCostIRR > 0, `Solution ${sol.systemType} contains benchmark cost`);
        assert(sol.pricingStatus === 'PRELIMINARY_BENCHMARK', `Solution ${sol.systemType} tagged as PRELIMINARY_BENCHMARK`);
      }
    }

    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Consistency Between Analysis and Recommendation Endpoints ---');
    // -------------------------------------------------------------
    // Query both endpoints with identical inputs: Tehran, 600 kWh/mo (20 kWh/day), 120 m² area
    const inputPayload = {
      city: 'تهران',
      monthlyKwh: 600,
      area: 120,
      usableArea: 120,
      locationType: 'residential',
      targets: ['solar']
    };

    const resAnalyze = await request(serverUrl, 'POST', '/api/analyze', inputPayload);
    assert(resAnalyze.status === 200, 'Analyze endpoint succeeds (HTTP 200)');

    const resRec = await request(serverUrl, 'POST', '/api/energy/recommend', {
      energyProfile: {
        city: 'تهران',
        monthlyConsumptionKwh: 600,
        usableArea: 120,
        totalArea: 120,
        locationType: 'residential',
        gridConnected: true,
        outageFrequency: 'none',
        backupRequired: false,
        allowBenchmarkPricing: true
      }
    });
    assert(resRec.status === 200, 'Recommend endpoint succeeds (HTTP 200)');

    const analyzeSolar = resAnalyze.body.solar;
    const recommendOngrid = resRec.body.solutions.find((s: any) => s.systemType === 'solar_ongrid');
    assert(recommendOngrid !== undefined, 'solar_ongrid solution found in recommendations');

    const recSolar = recommendOngrid.technicalSummary.solarPart;
    assert(analyzeSolar.finalKwp === recSolar.finalKwp, `Capacity matches exactly: analyze=${analyzeSolar.finalKwp} kWp, recommend=${recSolar.finalKwp} kWp`);
    assert(analyzeSolar.panelCount === recSolar.numberOfPanels, `Panel count matches exactly: analyze=${analyzeSolar.panelCount}, recommend=${recSolar.numberOfPanels}`);
    assert(analyzeSolar.annualGenerationKwh === recSolar.annualGenerationKwh, `Annual kWh matches exactly: analyze=${analyzeSolar.annualGenerationKwh}, recommend=${recSolar.annualGenerationKwh}`);

    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Immutability Guard & DB Isolation ---');
    // -------------------------------------------------------------
    const finalDbHash = computeFileHash(repoDbPath);
    assert(initialDbHash === finalDbHash, `Repository db.json byte-for-byte identical (SHA-256: ${finalDbHash})`);

  } finally {
    server.close();
  }

  console.log('\n========================================================================');
  console.log(`STAGE 1.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================');
}

runStage1_1Tests().catch((err) => {
  console.error('Fatal Stage 1.1 test error:', err);
  process.exit(1);
});
