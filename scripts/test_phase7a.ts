import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../src/db/index.js';
import { projectRepository } from '../src/repositories/projectRepository.js';
import { assetRepository } from '../src/repositories/assetRepository.js';
import { monitoringRepository } from '../src/repositories/monitoringRepository.js';
import { monitoringService, sanitizeTelemetrySource } from '../src/services/monitoringService.js';
import { checkProjectAccess } from '../src/api/projects.js';

async function runPhase7aTest() {
  console.log('====================================================');
  console.log('HOOSHYAR ENERGY — PHASE 7-A TEST SUITE (ISOLATED STORAGE)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // STEP 0: Storage Isolation Setup
  const originalDbPath = db.getDBPath();
  const originalDbExists = fs.existsSync(originalDbPath);
  const originalDbContent = originalDbExists ? fs.readFileSync(originalDbPath, 'utf-8') : null;

  const tempDbFile = path.join(
    os.tmpdir(),
    `hooshyar_phase7a_test_${Date.now()}_${Math.random().toString(36).substring(7)}.json`
  );

  console.log(`[ISOLATION] Original DB Path: ${originalDbPath}`);
  console.log(`[ISOLATION] Setting temporary isolated DB Path: ${tempDbFile}`);
  db.setDBPath(tempDbFile);

  try {
    assert(db.getDBPath() === tempDbFile, 'Database path successfully redirected to isolated temp DB');

    // 1. Create project
    console.log('\n--- Test 1: Create Project ---');
    const project = projectRepository.create({
      projectCode: 'PRJ-MON-001',
      title: 'نیروگاه خورشیدی مانیتورینگ یزد',
      projectType: 'SOLAR',
      status: 'OPERATIONAL',
      ownerId: 'user-owner-a',
      targetCapacityKw: 500,
      location: {
        country: 'Iran',
        province: 'یزد',
        city: 'یزد',
        address: 'منطقه ویژه اقتصادی خورشیدی'
      }
    });
    assert(!!project && project.id.length > 0, 'Project created successfully');

    // Also create second project for IDOR and cross-project testing
    const projectB = projectRepository.create({
      projectCode: 'PRJ-MON-002',
      title: 'نیروگاه خورشیدی پروژه ب',
      projectType: 'SOLAR',
      status: 'OPERATIONAL',
      ownerId: 'user-owner-b',
      targetCapacityKw: 250,
      location: { country: 'Iran', province: 'کرمان', city: 'سیرجان' }
    });
    assert(!!projectB && projectB.id.length > 0, 'Secondary Project B created for security tests');

    // 2. Create operational EnergyAsset
    console.log('\n--- Test 2: Create Operational EnergyAsset ---');
    const asset = assetRepository.createAsset({
      projectId: project.id,
      ownerId: project.ownerId,
      name: 'دارایی اصلی نیروگاه یزد',
      assetType: 'SOLAR',
      status: 'OPERATIONAL',
      installedCapacityKw: 500,
      technology: 'SOLAR_PV',
      location: 'یزد، منطقه ویژه',
      verificationStatus: 'VERIFIED',
      passportVersion: 1
    });
    assert(!!asset && asset.id.length > 0, 'Operational EnergyAsset created');
    assert(asset.installedCapacityKw === 500, 'Asset capacity verified');

    // Asset for Project B
    const assetB = assetRepository.createAsset({
      projectId: projectB.id,
      ownerId: projectB.ownerId,
      name: 'دارایی نیروگاه کرمان',
      assetType: 'SOLAR',
      status: 'OPERATIONAL',
      installedCapacityKw: 250,
      technology: 'SOLAR_PV',
      location: 'سیرجان',
      verificationStatus: 'VERIFIED',
      passportVersion: 1
    });
    assert(!!assetB && assetB.id.length > 0, 'Asset for Project B created');

    // 3. Register telemetry source
    console.log('\n--- Test 3: Register Telemetry Source ---');
    const source = monitoringService.registerTelemetrySource(
      asset.id,
      {
        assetId: asset.id,
        sourceType: 'INVERTER',
        provider: 'Sungrow',
        name: 'اینورتر مرکزی شماره ۱',
        status: 'ACTIVE',
        samplingIntervalSeconds: 300,
        configuration: {
          ip: '192.168.1.100',
          port: 502,
          apiKey: 'super_secret_api_key_12345'
        }
      },
      'user-owner-a'
    );
    assert(!!source && source.id.length > 0, 'Telemetry source registered');
    assert(source.assetId === asset.id, 'Source correctly linked to Asset A');
    assert(source.projectId === project.id, 'Source projectId strictly derived from Asset');

    // Test masking of credentials in sanitized output
    const sanitized = sanitizeTelemetrySource(source);
    assert(sanitized.configuration?.apiKey === '********', 'Credentials masked in telemetry source output');

    // Also register smart meter source
    const meterSource = monitoringService.registerTelemetrySource(
      asset.id,
      {
        assetId: asset.id,
        sourceType: 'SMART_METER',
        provider: 'Janitza',
        name: 'کنتور مبادی تحویل توان',
        status: 'ACTIVE',
        samplingIntervalSeconds: 900
      },
      'user-owner-a'
    );
    assert(!!meterSource && meterSource.id.length > 0, 'Smart meter source registered');

    // Source for Asset B
    const sourceB = monitoringService.registerTelemetrySource(
      assetB.id,
      {
        assetId: assetB.id,
        sourceType: 'INVERTER',
        provider: 'SMA',
        name: 'اینورتر پروژه ب',
        status: 'ACTIVE'
      },
      'user-owner-b'
    );
    assert(!!sourceB && sourceB.id.length > 0, 'Source registered for Asset B');

    // 4. Reject source for wrong/non-existent asset
    console.log('\n--- Test 4: Reject Source for Wrong/Non-existent Asset ---');
    let rejectedNonExistentAsset = false;
    try {
      monitoringService.registerTelemetrySource(
        'non-existent-asset-id',
        {
          assetId: 'non-existent-asset-id',
          sourceType: 'INVERTER',
          provider: 'Huawei',
          name: 'اینورتر نامعتبر',
          status: 'ACTIVE'
        },
        'user-owner-a'
      );
    } catch (err: any) {
      rejectedNonExistentAsset = true;
      assert(err.message.includes('ASSET_NOT_FOUND'), 'Rejected registration on non-existent asset');
    }
    assert(rejectedNonExistentAsset, 'Registration fails gracefully for invalid asset');

    // 5. Ingest valid reading
    console.log('\n--- Test 5: Ingest Valid Reading ---');
    const nowIso = new Date().toISOString();
    const validReadingResult = monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: source.id,
          timestamp: nowIso,
          metricType: 'POWER_KW',
          value: 410.5,
          unit: 'kW',
          quality: 'VALID'
        }
      ],
      'user-owner-a'
    );
    assert(validReadingResult.acceptedCount === 1, 'Valid reading accepted');
    assert(validReadingResult.rejectedCount === 0, 'No rejections for valid reading');
    assert(validReadingResult.readings[0].value === 410.5, 'Reading value stored accurately');

    // Verify source lastSyncAt updated
    const updatedSource = monitoringRepository.getSourceById(source.id);
    assert(!!updatedSource?.lastSyncAt, 'Telemetry source lastSyncAt updated after ingestion');

    // 6. Reject invalid reading
    console.log('\n--- Test 6: Reject Invalid Reading ---');
    // Non-numeric value
    const nonNumericResult = monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: source.id,
          timestamp: nowIso,
          metricType: 'POWER_KW',
          value: 'not_a_number'
        }
      ],
      'user-owner-a'
    );
    assert(nonNumericResult.rejectedCount === 1, 'Non-numeric reading rejected');
    assert(nonNumericResult.acceptedCount === 0, 'No records saved for invalid non-numeric reading');

    // Missing value (must remain missing, not converted to 0)
    const missingValueResult = monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: source.id,
          timestamp: nowIso,
          metricType: 'POWER_KW',
          value: null
        }
      ],
      'user-owner-a'
    );
    assert(missingValueResult.rejectedCount === 1, 'Missing telemetry value rejected');

    // Invalid timestamp
    const invalidDateResult = monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: source.id,
          timestamp: 'invalid-date-string',
          metricType: 'POWER_KW',
          value: 350
        }
      ],
      'user-owner-a'
    );
    assert(invalidDateResult.rejectedCount === 1, 'Invalid timestamp rejected');

    // Unsupported metric type
    const unsupportedMetricResult = monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: source.id,
          timestamp: nowIso,
          metricType: 'UNKNOWN_MAGIC_METRIC',
          value: 100
        }
      ],
      'user-owner-a'
    );
    assert(unsupportedMetricResult.rejectedCount === 1, 'Unsupported metric type rejected');

    // 7. Bulk ingest mixed valid/invalid readings
    console.log('\n--- Test 7: Bulk Ingest Mixed Valid/Invalid Readings ---');
    const pastTime1 = new Date(Date.now() - 3600 * 1000).toISOString();
    const pastTime2 = new Date(Date.now() - 1800 * 1000).toISOString();
    const mixedBatchResult = monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: source.id,
          timestamp: pastTime1,
          metricType: 'POWER_KW',
          value: 395.0,
          unit: 'kW'
        },
        {
          sourceId: source.id,
          timestamp: pastTime1,
          metricType: 'POWER_KW',
          value: -50.0 // Physically invalid negative solar power
        },
        {
          sourceId: meterSource.id,
          timestamp: pastTime2,
          metricType: 'ENERGY_KWH',
          value: 125000.0,
          unit: 'kWh'
        },
        {
          sourceId: 'non-existent-source',
          timestamp: pastTime2,
          metricType: 'VOLTAGE',
          value: 400
        }
      ],
      'user-owner-a'
    );
    assert(mixedBatchResult.acceptedCount === 2, 'Accepted exactly 2 valid readings in mixed batch');
    assert(mixedBatchResult.rejectedCount === 2, 'Rejected exactly 2 invalid readings in mixed batch');
    assert(mixedBatchResult.errors.length === 2, 'Detailed error messages provided for rejected records');

    // 8. Retrieve telemetry with filters
    console.log('\n--- Test 8: Retrieve Telemetry with Filters ---');
    const allReadings = monitoringService.getAssetTelemetry(asset.id);
    assert(allReadings.length === 3, 'Retrieved all stored readings for asset (1 from test 5 + 2 from test 7)');

    const powerOnlyReadings = monitoringService.getAssetTelemetry(asset.id, { metricType: 'POWER_KW' });
    assert(powerOnlyReadings.length === 2, 'Filtered readings strictly by metricType=POWER_KW');

    const meterReadings = monitoringService.getAssetTelemetry(asset.id, { sourceId: meterSource.id });
    assert(meterReadings.length === 1, 'Filtered readings strictly by sourceId');

    // 9. Calculate performance without baseline → INSUFFICIENT_DATA
    console.log('\n--- Test 9: Calculate Performance Without Baseline → INSUFFICIENT_DATA ---');
    const pStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const pEnd = new Date().toISOString();
    const noBaselineSnapshot = monitoringService.calculateAssetPerformance(
      asset.id,
      pStart,
      pEnd,
      'user-owner-a'
    );
    assert(noBaselineSnapshot.status === 'INSUFFICIENT_DATA', 'Performance calculation without baseline returns INSUFFICIENT_DATA');
    assert(noBaselineSnapshot.expectedGenerationKwh === null, 'expectedGenerationKwh is not fabricated (null)');
    assert(noBaselineSnapshot.performanceRatioPercent === null, 'performanceRatioPercent is not fabricated (null)');

    // 10. Add verified baseline
    console.log('\n--- Test 10: Add Verified Baseline ---');
    const verifiedBaseline = assetRepository.createAssetPerformanceBaseline({
      assetId: asset.id,
      annualGenerationKwh: 850000,
      monthlyGenerationKwh: 70833,
      performanceRatioPercent: 82.0,
      availabilityPercent: 99.0,
      degradationPercent: 0.5,
      source: 'ENGINEERING_COMMISSIONING_VERIFIED',
      version: 1
    });
    assert(!!verifiedBaseline && verifiedBaseline.id.length > 0, 'Verified baseline added to Asset A');

    // Ingest cumulative energy readings to simulate 7-day period
    const t0 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const tEnd = new Date().toISOString();
    monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: meterSource.id,
          timestamp: t0,
          metricType: 'ENERGY_KWH',
          value: 120000.0,
          unit: 'kWh'
        },
        {
          sourceId: meterSource.id,
          timestamp: tEnd,
          metricType: 'ENERGY_KWH',
          value: 135500.0, // Delta = 15,500 kWh produced in 7 days
          unit: 'kWh'
        }
      ],
      'user-owner-a'
    );

    // 11. Calculate performance with verified baseline
    console.log('\n--- Test 11: Calculate Performance with Verified Baseline ---');
    const perfSnapshot = monitoringService.calculateAssetPerformance(
      asset.id,
      t0,
      tEnd,
      'user-owner-a'
    );
    assert(perfSnapshot.status !== 'INSUFFICIENT_DATA', 'Status is not INSUFFICIENT_DATA when baseline and telemetry exist');
    assert(perfSnapshot.actualGenerationKwh === 15500, `Actual generation computed correctly: ${perfSnapshot.actualGenerationKwh} kWh`);
    assert(typeof perfSnapshot.expectedGenerationKwh === 'number', `Expected generation derived from baseline: ${perfSnapshot.expectedGenerationKwh} kWh`);
    assert(typeof perfSnapshot.performanceRatioPercent === 'number', `Performance Ratio computed: ${perfSnapshot.performanceRatioPercent}%`);
    assert(typeof perfSnapshot.capacityFactorPercent === 'number', `Capacity Factor computed: ${perfSnapshot.capacityFactorPercent}%`);

    // Test performance deviation calculation
    const deviation = monitoringService.calculatePerformanceDeviation(perfSnapshot.actualGenerationKwh, perfSnapshot.expectedGenerationKwh!);
    assert(typeof deviation.deviationPercent === 'number', `Performance deviation calculated: ${deviation.deviationPercent}%`);
    assert(['NORMAL', 'WARNING', 'CRITICAL'].includes(deviation.severity), `Deviation severity categorized: ${deviation.severity}`);

    // 12. Calculate health assessment
    console.log('\n--- Test 12: Calculate Health Assessment ---');
    const health = monitoringService.calculateHealthAssessment(
      asset.id,
      t0,
      tEnd,
      'user-owner-a'
    );
    assert(health.status !== 'INSUFFICIENT_DATA', 'Health status evaluated when data exists');
    assert(typeof health.score === 'number' && health.score >= 0 && health.score <= 100, `Health score computed deterministically: ${health.score}`);
    assert(!!health.factorBreakdown, 'Deterministic factor breakdown provided with explicit weights');
    assert(health.factorBreakdown?.weights.performanceDeviation === 0.4, 'Performance weight is 40%');
    assert(health.factorBreakdown?.weights.availability === 0.25, 'Availability weight is 25%');

    // Test health assessment without baseline on Asset B -> must return INSUFFICIENT_DATA
    const healthB = monitoringService.calculateHealthAssessment(
      assetB.id,
      t0,
      tEnd,
      'user-owner-b'
    );
    assert(healthB.status === 'INSUFFICIENT_DATA', 'Health assessment without baseline returns INSUFFICIENT_DATA');
    assert(healthB.score === null, 'Health score is null when data is insufficient');

    // 13. Cross-project telemetry access rejected
    console.log('\n--- Test 13: Cross-Project Telemetry Access Rejected (IDOR Prevention) ---');
    // Owner of Project B trying to access Project A
    const crossAccess = checkProjectAccess(project.id, 'user-owner-b', 'USER');
    assert(crossAccess.allowed === false, 'Owner B denied access to Project A');

    // 14. Unauthenticated access rejected
    console.log('\n--- Test 14: Unauthenticated Access Rejected ---');
    const unauthAccess = checkProjectAccess(project.id, undefined, undefined);
    assert(unauthAccess.allowed === false, 'Unauthenticated user rejected');
    assert(unauthAccess.status === 401, 'Unauthenticated status is 401');

    // 15. Invalid source/asset relationship rejected
    console.log('\n--- Test 15: Invalid Source/Asset Relationship Rejected ---');
    // Attempting to ingest telemetry for Asset A using Source B (which belongs to Asset B)
    const mismatchedSourceResult = monitoringService.ingestTelemetryReadings(
      asset.id,
      [
        {
          sourceId: sourceB.id, // Belongs to Asset B!
          timestamp: new Date().toISOString(),
          metricType: 'POWER_KW',
          value: 200.0
        }
      ],
      'user-owner-a'
    );
    assert(mismatchedSourceResult.acceptedCount === 0, 'Mismatched source reading rejected');
    assert(mismatchedSourceResult.rejectedCount === 1, 'Mismatched source record recorded in rejection list');
    assert(
      mismatchedSourceResult.errors[0]?.error.includes('متعلق به این دارایی انرژی نیست'),
      'Clear error explaining source does not belong to asset'
    );

    // 16. Verify Activity Log behavior
    console.log('\n--- Test 16: Meaningful ProjectActivity Audit Logging ---');
    const activities = projectRepository.getActivities(project.id);
    const sourceRegAct = activities.filter(a => a.eventType === 'TELEMETRY_SOURCE_REGISTERED');
    const perfSnapAct = activities.filter(a => a.eventType === 'PERFORMANCE_SNAPSHOT_CREATED');
    const healthAct = activities.filter(a => a.eventType === 'HEALTH_ASSESSMENT_CREATED');
    assert(sourceRegAct.length >= 1, 'TELEMETRY_SOURCE_REGISTERED logged in ProjectActivity');
    assert(perfSnapAct.length >= 1, 'PERFORMANCE_SNAPSHOT_CREATED logged in ProjectActivity');
    assert(healthAct.length >= 1, 'HEALTH_ASSESSMENT_CREATED logged in ProjectActivity');

    // Verify readings did NOT flood the activity log
    const readingActs = activities.filter(a => a.eventType.includes('READING'));
    assert(readingActs.length === 0, 'No spam activity logs generated per telemetry reading');

  } finally {
    // STEP 9: Storage Isolation Cleanup & Integrity Verification
    console.log('\n--- Storage Isolation Cleanup & Integrity Verification ---');

    if (fs.existsSync(tempDbFile)) {
      fs.unlinkSync(tempDbFile);
      console.log(`[CLEANUP] Deleted temporary test DB: ${tempDbFile}`);
    }

    db.setDBPath(originalDbPath);
    console.log(`[RESTORE] Restored DB path to: ${originalDbPath}`);

    if (originalDbExists && originalDbContent !== null) {
      const currentContent = fs.readFileSync(originalDbPath, 'utf-8');
      assert(currentContent === originalDbContent, 'Original production db.json was 100% UNTOUCHED');
    } else if (!originalDbExists) {
      assert(!fs.existsSync(originalDbPath), 'Original db.json was not created/polluted');
    }
  }

  console.log('\n====================================================');
  console.log(`PHASE 7-A TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7aTest().catch(err => {
  console.error('Phase 7-A test failed with unexpected error:', err);
  process.exit(1);
});
