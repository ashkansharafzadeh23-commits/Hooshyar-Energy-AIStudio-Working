/**
 * HOOSHYAR ENERGY — STAGE 10 FINAL STEP
 * IMAGE ANALYSIS INTEGRITY & SIZING PIPELINE VERIFICATION SUITE
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import analyzeImagesHandler from '../api/energy/analyze-images.js';
import { calculateSolarSizing } from '../src/api/engine.js';
import { getSunHoursForCity } from '../api/lib/solarIrradiance.js';

const ROOT_DIR = process.cwd();
const DB_PATH = path.join(ROOT_DIR, 'db.json');
const BASELINE_DB_HASH = '52c7c5ec80711b1cb0f5db51c644fee109bf122184c391eef4bc826cb0b25918';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

function sha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Mock HTTP helper for direct handler testing
async function invokeHandler(body: any): Promise<{ status: number; body: any }> {
  let statusCode = 200;
  let responseData: any = null;

  const req = {
    method: 'POST',
    body
  };

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    }
  };

  await analyzeImagesHandler(req, res);
  return { status: statusCode, body: responseData };
}

async function runSuite() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY — STAGE 10 FINAL STEP: IMAGE ANALYSIS INTEGRITY AUDIT');
  console.log('========================================================================');

  // 1. IMMUTABILITY GUARD
  console.log('\n[Guard 1] Repository db.json Immutability:');
  const currentDbHash = sha256(fs.readFileSync(DB_PATH));
  assert(currentDbHash === BASELINE_DB_HASH, 'db.json byte-for-byte unmodified', `Expected ${BASELINE_DB_HASH}, got ${currentDbHash}`);

  // 2. STATIC CODE AUDIT FOR UNVERIFIED ASSUMPTIONS
  console.log('\n[Guard 2] Removal of Fixed Engineering Assumptions in analyze-images.js:');
  const code = fs.readFileSync(path.join(ROOT_DIR, 'api/energy/analyze-images.js'), 'utf8');
  assert(!code.includes('~4.5 kWh/day'), 'Eliminated fixed ~4.5 kWh/day assumption');
  assert(!code.includes('135 kWh/month'), 'Eliminated fixed 135 kWh/month assumption');
  assert(!code.includes('~5 sqm of area'), 'Eliminated fixed ~5 sqm per kWp assumption');
  assert(code.includes('DO NOT calculate solar system capacity'), 'Instructs vision AI not to fabricate capacity');
  assert(code.includes('calculateSolarSizing'), 'Routes sizing through deterministic engine');
  assert(code.includes('getSunHoursForCity'), 'Routes irradiation through solarIrradiance service');

  // 3. HANDLER INTEGRATION: MISSING DATA HANDLING (STRICT NULL, NO FAKE ZERO)
  console.log('\n[Guard 3] Missing Consumption Handling & Strict Null Representation:');
  const missingConsumptionRes = await invokeHandler({
    area: 100,
    city: 'تهران'
  });
  assert(missingConsumptionRes.status === 200, 'Returns 200 with structured data-truth payload');
  assert(missingConsumptionRes.body.status === 'INSUFFICIENT_DATA', 'Identifies status as INSUFFICIENT_DATA');
  assert(missingConsumptionRes.body.missingFields.includes('monthlyConsumptionKwh'), 'Flags monthlyConsumptionKwh as missing');
  assert(missingConsumptionRes.body.monthlyConsumptionKwh === null, 'monthlyConsumptionKwh is strictly null (not 0) when missing');
  assert(missingConsumptionRes.body.solarCapacityKwp === null, 'solarCapacityKwp is strictly null (not 0) when missing');
  assert(missingConsumptionRes.body.recommendedDesign.includes('مصرف'), 'Provides actionable Persian guidance for missing consumption');

  console.log('\n[Guard 4] Missing Irradiance/City Handling & Strict Null Representation:');
  const missingCityRes = await invokeHandler({
    manualConsumption: 450,
    area: 100
  });
  assert(missingCityRes.body.status === 'INSUFFICIENT_DATA', 'Identifies missing city/sunHours');
  assert(missingCityRes.body.missingFields.includes('city_or_sunHours'), 'Flags city_or_sunHours in missingFields');
  assert(missingCityRes.body.solarCapacityKwp === null, 'solarCapacityKwp is strictly null (not 0) without attributed irradiance');
  assert(missingCityRes.body.dataProvenance.irradiance.sunHours === null, 'Irradiance sunHours is null when unknown');

  // 4. CUSTOM IRRADIANCE VALIDATION
  console.log('\n[Guard 5] Custom Irradiance Input Validation:');
  const invalidHoursRes = await invokeHandler({
    manualConsumption: 500,
    area: 100,
    customSunHours: 15.0, // Invalid: exceeds 12.0
    customSunHoursSource: 'گزارش شرکت مشاور'
  });
  assert(invalidHoursRes.status === 400, 'Rejects customSunHours > 12.0 with HTTP 400');
  assert(invalidHoursRes.body.code === 'INVALID_IRRADIANCE_DATA', 'Returns INVALID_IRRADIANCE_DATA error code');

  const lowHoursRes = await invokeHandler({
    manualConsumption: 500,
    area: 100,
    customSunHours: 0.5, // Invalid: below 1.0
    customSunHoursSource: 'گزارش شرکت مشاور'
  });
  assert(lowHoursRes.status === 400, 'Rejects customSunHours < 1.0 with HTTP 400');

  const missingSourceRes = await invokeHandler({
    manualConsumption: 500,
    area: 100,
    customSunHours: 5.2
    // Missing customSunHoursSource
  });
  assert(missingSourceRes.status === 400, 'Rejects customSunHours without source with HTTP 400');
  assert(missingSourceRes.body.code === 'MISSING_IRRADIANCE_SOURCE', 'Returns MISSING_IRRADIANCE_SOURCE error code');

  const validCustomRes = await invokeHandler({
    manualConsumption: 600,
    area: 120,
    customSunHours: 5.5,
    customSunHoursSource: 'ایستگاه سینوپتیک محلی'
  });
  assert(validCustomRes.status === 200, 'Accepts valid custom irradiance within 1.0-12.0 with source');
  assert(validCustomRes.body.dataProvenance.irradiance.sunHours === 5.5, 'Applies custom sun hours (5.5)');
  assert(validCustomRes.body.dataProvenance.irradiance.source === 'ایستگاه سینوپتیک محلی', 'Records custom irradiance source');

  // 5. DETERMINISTIC SIZING WITH DATA PROVENANCE
  console.log('\n[Guard 6] User-Provided Data Provenance & Deterministic Sizing:');
  const tehranSun = await getSunHoursForCity('تهران');
  const validRes = await invokeHandler({
    manualConsumption: 600,
    area: 150,
    city: 'تهران'
  });

  assert(validRes.body.status === 'SUCCESS', 'Returns SUCCESS status for complete valid inputs');
  assert(validRes.body.monthlyConsumptionKwh === 600, 'Preserves exact consumption');
  assert(validRes.body.dataProvenance.consumption.source === 'USER_MANUAL_INPUT', 'Correctly attributes consumption source to USER_MANUAL_INPUT');
  assert(validRes.body.dataProvenance.consumption.classification === 'USER_PROVIDED', 'Correctly classifies consumption as USER_PROVIDED');
  assert(validRes.body.dataProvenance.irradiance.sunHours === tehranSun.sunHours, 'Uses real NASA/cached sun hours for Tehran');

  // Calculate expected deterministic sizing
  const expectedSizing = calculateSolarSizing(600 / 30, 150, tehranSun.sunHours, 550, { performanceRatio: 0.775, sqMetersPerKwp: 6.5 });
  assert(validRes.body.solarCapacityKwp === expectedSizing.finalKwp, `Matches deterministic sizing (${expectedSizing.finalKwp} kWp)`, `Got ${validRes.body.solarCapacityKwp}`);
  assert(validRes.body.engineeringSizing.numberOfPanels === expectedSizing.numberOfPanels, `Matches panel count (${expectedSizing.numberOfPanels})`);

  // 6. SPACE CONSTRAINED SCENARIOS
  console.log('\n[Guard 7] Space Constraint Detection:');
  const constrainedRes = await invokeHandler({
    manualConsumption: 3000, // Requires ~20+ kWp
    area: 26,                // Max space for ~4 kWp
    city: 'تهران'
  });
  assert(constrainedRes.body.engineeringSizing.spaceConstrained === true, 'Correctly flags space constraint');
  const maxPossible = +(26 / 6.5).toFixed(2);
  assert(constrainedRes.body.solarCapacityKwp === maxPossible, `Caps capacity to available area (${maxPossible} kWp)`, `Got ${constrainedRes.body.solarCapacityKwp}`);

  // 7. GENUINE ZERO CONSUMPTION DISTINCTION
  console.log('\n[Guard 8] Legitimate Zero Consumption Handling (Preserves 0, distinct from null):');
  const zeroRes = await invokeHandler({
    manualConsumption: 0,
    area: 100,
    city: 'تهران'
  });
  assert(zeroRes.body.monthlyConsumptionKwh === 0, 'Preserves genuine 0 kWh (not converted to null)');
  assert(zeroRes.body.solarCapacityKwp === 0, 'Sizing is 0 for 0 consumption');
  assert(zeroRes.body.recommendedDesign.includes('فروش کامل برق'), 'Suggests utility-scale sale model rather than fabricating residential consumption');

  // 8. BACKWARD COMPATIBILITY & TYPE CONTRACT
  console.log('\n[Guard 9] Backward Compatibility Contract:');
  assert(validRes.body.monthlyConsumptionKwh === 600, 'Exposes numeric monthlyConsumptionKwh when present');
  assert(validRes.body.solarCapacityKwp === expectedSizing.finalKwp, 'Exposes numeric solarCapacityKwp when present');
  assert(typeof validRes.body.recommendedDesign === 'string', 'Exposes top-level recommendedDesign as string');
  assert(Array.isArray(validRes.body.disclaimers) && validRes.body.disclaimers.length > 0, 'Includes engineering disclaimers');

  // 9. FRONTEND CONSUMER INTEGRITY & PERSIAN NULL RENDERING
  console.log('\n[Guard 10] Frontend Consumer Integrity:');
  const analyzerCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/SmartAnalyzer.tsx'), 'utf8');
  assert(analyzerCode.includes('POPULAR_CITIES') || analyzerCode.includes('selectedCity'), 'SmartAnalyzer supports city selection');
  assert(analyzerCode.includes('INSUFFICIENT_DATA'), 'SmartAnalyzer handles INSUFFICIENT_DATA status');
  assert(analyzerCode.includes('اطلاعات کافی نیست'), 'SmartAnalyzer renders "اطلاعات کافی نیست" for null/missing metrics');
  assert(analyzerCode.includes('disclaimers') || analyzerCode.includes('عدم قطعیت و تعهد مهندسی'), 'SmartAnalyzer renders engineering disclaimers');
  assert(analyzerCode.includes('dataProvenance'), 'SmartAnalyzer renders data provenance');

  const stepCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/analysis/ConsumptionStep.tsx'), 'utf8');
  assert(stepCode.includes('city={city}'), 'ConsumptionStep forwards city to SmartAnalyzer');

  const checklistCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/Checklist.tsx'), 'utf8');
  assert(checklistCode.includes('city={state.city}'), 'Checklist forwards city to SmartAnalyzer');

  console.log('\n========================================================================');
  console.log(`STAGE 10 FINAL AUDIT: ${passed} passed, ${failed} failed`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch(err => {
  console.error('Fatal error during test suite:', err);
  process.exit(1);
});
