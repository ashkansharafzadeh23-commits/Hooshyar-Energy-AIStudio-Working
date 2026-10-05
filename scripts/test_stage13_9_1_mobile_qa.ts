import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING STAGE 13.9.1 QA VERIFICATION TEST SUITE');
  console.log('Mobile Form UX, Location Deduplication, Partner Auth Polish & Ads Discoverability');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Defect #1: Location Deduplication
  const smartAnalyzerPath = path.resolve('./src/components/SmartAnalyzer.tsx');
  const smartAnalyzerContent = fs.readFileSync(smartAnalyzerPath, 'utf8');
  assert(
    smartAnalyzerContent.includes('defaultCity ?') &&
    smartAnalyzerContent.includes('محل پروژه') &&
    smartAnalyzerContent.includes('ویرایش محل پروژه'),
    '1. SmartAnalyzer shows read-only contextual summary and edit action when canonical location is provided'
  );

  assert(
    smartAnalyzerContent.includes('province') && smartAnalyzerContent.includes('onEditLocation'),
    '1b. SmartAnalyzer supports province and onEditLocation props from canonical flow'
  );

  const solarAnalysisPath = path.resolve('./src/pages/SolarAnalysisExperience.tsx');
  const solarAnalysisContent = fs.readFileSync(solarAnalysisPath, 'utf8');
  assert(
    solarAnalysisContent.includes('province={province}') &&
    solarAnalysisContent.includes('onEditLocation={() => setCurrentStep(2)}'),
    '1c. SolarAnalysisExperience feeds canonical province and edit-location callback to downstream step'
  );

  // 2. Defect #2: Monthly Electricity Consumption Input Collision
  const consumptionStepPath = path.resolve('./src/components/analysis/ConsumptionStep.tsx');
  const consumptionStepContent = fs.readFileSync(consumptionStepPath, 'utf8');
  assert(
    consumptionStepContent.includes('id="consumption-input"') &&
    !consumptionStepContent.includes('pl-28 text-left') &&
    consumptionStepContent.includes('کیلووات‌ساعت در ماه'),
    '2. ConsumptionStep eliminates brittle absolute positioning overlap on monthly consumption input'
  );

  assert(
    consumptionStepContent.includes('min-h-[44px]'),
    '2b. ConsumptionStep enforces >=44px touch targets on input and unit badges'
  );

  // 3. Site Details Step input polish
  const siteDetailsPath = path.resolve('./src/components/analysis/SiteDetailsStep.tsx');
  const siteDetailsContent = fs.readFileSync(siteDetailsPath, 'utf8');
  assert(
    siteDetailsContent.includes('id="area-input"') &&
    !siteDetailsContent.includes('pl-24 text-left') &&
    siteDetailsContent.includes('min-h-[44px]'),
    '3. SiteDetailsStep area input uses non-colliding layout with >=44px touch target'
  );

  // 4. Partner Auth Polish
  const contractorAuthPath = path.resolve('./src/pages/ContractorAuth.tsx');
  const contractorAuthContent = fs.readFileSync(contractorAuthPath, 'utf8');
  assert(
    contractorAuthContent.includes('/vendor-auth') &&
    contractorAuthContent.includes('/technician-auth') &&
    contractorAuthContent.includes('/customer-login'),
    '4. ContractorAuth provides full symmetrical partner switcher'
  );
  assert(
    contractorAuthContent.includes('inputMode="tel"') &&
    contractorAuthContent.includes('paddingLeft: \'3.5rem\'') &&
    contractorAuthContent.includes('min-h-[48px]'),
    '4a2. ContractorAuth phone and password enforce non-colliding physical spacing with >=48px touch targets'
  );

  const vendorAuthPath = path.resolve('./src/pages/VendorAuth.tsx');
  const vendorAuthContent = fs.readFileSync(vendorAuthPath, 'utf8');
  assert(
    vendorAuthContent.includes('/contractor-auth') &&
    vendorAuthContent.includes('/technician-auth') &&
    vendorAuthContent.includes('/customer-login'),
    '4b. VendorAuth provides full symmetrical partner switcher'
  );
  assert(
    vendorAuthContent.includes('inputMode="tel"') &&
    vendorAuthContent.includes('paddingLeft: \'3.5rem\'') &&
    vendorAuthContent.includes('min-h-[48px]'),
    '4b2. VendorAuth phone and password enforce non-colliding physical spacing with >=48px touch targets'
  );

  const technicianAuthPath = path.resolve('./src/pages/TechnicianAuth.tsx');
  const technicianAuthContent = fs.readFileSync(technicianAuthPath, 'utf8');
  assert(
    technicianAuthContent.includes('/contractor-auth') &&
    technicianAuthContent.includes('/vendor-auth') &&
    technicianAuthContent.includes('/customer-login'),
    '4c. TechnicianAuth provides full symmetrical partner switcher'
  );
  assert(
    technicianAuthContent.includes('inputMode="tel"') &&
    technicianAuthContent.includes('paddingLeft: \'3.5rem\'') &&
    technicianAuthContent.includes('min-h-[48px]'),
    '4c2. TechnicianAuth phone and password enforce non-colliding physical spacing with >=48px touch targets'
  );

  // 5. Ads Discoverability
  const partnersHubPath = path.resolve('./src/pages/PartnersHub.tsx');
  const partnersHubContent = fs.readFileSync(partnersHubPath, 'utf8');
  assert(
    partnersHubContent.includes('/ads/portal') &&
    partnersHubContent.includes('ثبت تبلیغات و معرفی برند'),
    '5. PartnersHub provides dedicated Ads Portal discoverability card'
  );

  const landingPath = path.resolve('./src/pages/Landing.tsx');
  const landingContent = fs.readFileSync(landingPath, 'utf8');
  assert(
    landingContent.includes('/ads/portal') &&
    landingContent.includes('پرتال تبلیغات'),
    '5b. Landing page provides prominent Ads Portal link in vendor ecosystem card'
  );

  // 6. Protected file baselines
  const expectedSmHash = 'b4b6bc9e0728dc2af8e8a385fb2b5e0041aa32fd9f49e2d85ee66a197c8383eb';
  const currentSmHash = crypto.createHash('sha256').update(fs.readFileSync('./src/pages/dev/SmartMaintenancePreview.tsx')).digest('hex');
  assert(
    currentSmHash === expectedSmHash,
    '6. SmartMaintenance protected baseline (commit 6363d191) remains byte-for-byte identical'
  );

  const expectedPkgHash = '90486ca155c8ea72b179c001d32af8c2eac08259837a1817520326b9194379cc';
  const currentPkgHash = crypto.createHash('sha256').update(fs.readFileSync('./package.json')).digest('hex');
  assert(
    currentPkgHash === expectedPkgHash,
    '6b. package.json remains byte-for-byte identical'
  );

  const expectedDbHash = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
  const currentDbHash = crypto.createHash('sha256').update(fs.readFileSync('./db.json')).digest('hex');
  assert(
    currentDbHash === expectedDbHash,
    '6c. db.json remains byte-for-byte identical'
  );

  const expectedBunHash = '79ef5b3a7ccbd526c213eac475e3485120c6823b5f71980721b972f5e4bf5386';
  const currentBunHash = crypto.createHash('sha256').update(fs.readFileSync('./bun.lock')).digest('hex');
  assert(
    currentBunHash === expectedBunHash,
    '6d. bun.lock remains byte-for-byte identical'
  );

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
