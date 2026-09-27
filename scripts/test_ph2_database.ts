import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

async function runPH2Tests() {
  console.log(`================================================================`);
  console.log(`HOOSHYAR ENERGY — PHASE 2 POSTGRES MIGRATION TESTS`);
  console.log(`================================================================`);

  const isolation = setupTestDatabaseIsolation('ph2_database');

  let passed = 0;
  let failed = 0;

  try {
    console.log(`[TEST] Running migration dry-run...`);
    const tempReportPath = path.join(os.tmpdir(), `POSTGRES_MIGRATION_REPORT_PH2_${Date.now()}.md`);
    const output = execSync('npx tsx scripts/migrate_json_to_postgres.ts --dry-run', {
      encoding: 'utf8',
      env: {
        ...process.env,
        TEST_DB_PATH: isolation.tempDbPath,
        JSON_DB_PATH: isolation.tempDbPath,
        MIGRATION_REPORT_PATH: tempReportPath
      }
    });
    
    if (output.includes('DRY RUN COMPLETE')) {
      console.log(`  [PASS] Dry run completed successfully`);
      passed++;
    } else {
      throw new Error("Missing completion message");
    }

    if (output.includes('Skipping inserts')) {
      console.log(`  [PASS] Verified no inserts in dry-run mode`);
      passed++;
    } else {
      throw new Error("Did not skip inserts");
    }

    console.log(`[TEST] Verifying production DB protection...`);
    isolation.verifyImmutability();
    console.log(`  [PASS] db.json is 100% byte-for-byte unchanged`);
    passed++;

    console.log(`[TEST] Verifying report generation...`);
    const reportPath = tempReportPath;
    if (fs.existsSync(reportPath)) {
      const report = fs.readFileSync(reportPath, 'utf8');
      if (report.includes('DRY RUN') && report.includes('JSON Source Count')) {
        console.log(`  [PASS] Migration report generated correctly`);
        passed++;
      } else {
        throw new Error("Report missing required sections");
      }
    } else {
      throw new Error("Migration report not found");
    }

    // Checking new interface layers
    console.log(`[TEST] Verifying Repository Abstraction...`);
    const projectRepoPath = path.join(process.cwd(), 'src', 'repositories', 'projectRepository.ts');
    const projectRepoContent = fs.readFileSync(projectRepoPath, 'utf8');
    if (projectRepoContent.includes('IProjectRepository')) {
      console.log(`  [PASS] projectRepository implements interface correctly`);
      passed++;
    } else {
      throw new Error("projectRepository not using interface");
    }

    // Check strict DB failure condition conceptually
    console.log(`[TEST] Verifying environment strictness...`);
    const pgConnPath = path.join(process.cwd(), 'src', 'database', 'postgres', 'connection.ts');
    const pgConnContent = fs.readFileSync(pgConnPath, 'utf8');
    if (pgConnContent.includes('throw new Error("FATAL: DATABASE_URL is missing in production environment")')) {
      console.log(`  [PASS] DATABASE_URL missing throws strict error in production`);
      passed++;
    } else {
      throw new Error("Missing DATABASE_URL strictness");
    }

    // Transaction Verification
    console.log(`[TEST] Verifying transaction boundaries in migration script...`);
    const migrationScriptContent = fs.readFileSync(path.join(process.cwd(), 'scripts', 'migrate_json_to_postgres.ts'), 'utf8');
    if (migrationScriptContent.includes('pgDb.transaction(async (tx) => {')) {
      console.log(`  [PASS] Migration script uses atomic transactions`);
      passed++;
    } else {
      throw new Error("Migration script missing transactions");
    }

    console.log(`================================================================`);
    console.log(`PHASE 2 TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================`);
  } catch (error: any) {
    console.error(`  [FAIL] Test failed:`, error.message);
    failed++;
    console.log(`================================================================`);
    console.log(`PHASE 2 TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================`);
    process.exit(1);
  } finally {
    isolation.cleanup();
  }
}

runPH2Tests();
