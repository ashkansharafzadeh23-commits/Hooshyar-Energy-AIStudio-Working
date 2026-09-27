import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function runDirectBypassCheck() {
  console.log(`================================================================`);
  console.log(`HOOSHYAR ENERGY — PH-2 DIRECT BYPASS REGRESSION TEST`);
  console.log(`================================================================`);

  // We grep the src/api and src/services directory to ensure NO file directly imports db from index.js
  
  let passed = 0;
  let failed = 0;

  try {
    const apiFilesOutput = execSync('grep -rnE "import.*db.*from.*db/index" src/api/ || true', { encoding: 'utf8' }).trim();
    if (apiFilesOutput.length > 0) {
      // Check if it's a test file or exception
      const lines = apiFilesOutput.split('\n');
      const realBypasses = lines.filter(l => !l.includes('test_') && !l.includes('.test.') && !l.includes('.spec.'));
      if (realBypasses.length > 0) {
        console.error(`[FAIL] Found prohibited direct DB bypasses in API controllers:`);
        console.error(realBypasses.join('\n'));
        failed++;
      } else {
        console.log(`[PASS] Zero production DB bypasses found in src/api/`);
        passed++;
      }
    } else {
      console.log(`[PASS] Zero production DB bypasses found in src/api/`);
      passed++;
    }

    const servicesFilesOutput = execSync('grep -rnE "import.*db.*from.*db/index" src/services/ || true', { encoding: 'utf8' }).trim();
    if (servicesFilesOutput.length > 0) {
      const lines = servicesFilesOutput.split('\n');
      const realBypasses = lines.filter(l => !l.includes('test_') && !l.includes('.test.') && !l.includes('.spec.'));
      if (realBypasses.length > 0) {
        console.error(`[FAIL] Found prohibited direct DB bypasses in Services:`);
        console.error(realBypasses.join('\n'));
        failed++;
      } else {
        console.log(`[PASS] Zero production DB bypasses found in src/services/`);
        passed++;
      }
    } else {
      console.log(`[PASS] Zero production DB bypasses found in src/services/`);
      passed++;
    }

    // Check src/reliability
    const reliabilityFilesOutput = execSync('grep -rnE "import.*db.*from.*db/index" src/reliability/ || true', { encoding: 'utf8' }).trim();
    if (reliabilityFilesOutput.length > 0) {
      console.error(`[FAIL] Found prohibited direct DB bypasses in src/reliability:`, reliabilityFilesOutput);
      failed++;
    } else {
      console.log(`[PASS] Zero production DB bypasses found in src/reliability/`);
      passed++;
    }

    // Check api/lib/solarIrradiance.js
    const solarIrradianceOutput = execSync('grep -rnE "import.*db.*from.*db/index" api/lib/solarIrradiance.js || true', { encoding: 'utf8' }).trim();
    if (solarIrradianceOutput.length > 0) {
      console.error(`[FAIL] Found prohibited direct DB bypass in api/lib/solarIrradiance.js:`, solarIrradianceOutput);
      failed++;
    } else {
      console.log(`[PASS] Zero production DB bypasses found in api/lib/solarIrradiance.js`);
      passed++;
    }

  } catch (err: any) {
    console.error(`Error running grep:`, err);
    failed++;
  }

  console.log(`================================================================`);
  console.log(`Critical direct DB bypasses remaining: ${failed}`);
  console.log(`DIRECT BYPASS REGRESSION TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDirectBypassCheck();
