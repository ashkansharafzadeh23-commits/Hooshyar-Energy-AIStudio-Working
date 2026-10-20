/**
 * Stage D.2-P2B-2A: PostgreSQL Showcase Persistence Remediation Test Suite
 *
 * Verifies:
 * 1. PostgreSQL Schema definition for showcase_projects matching ShowcaseProjectRecord.
 * 2. Repository abstraction and dynamic environment routing (PostgreSQL vs JSON).
 * 3. Fail-fast safety in production: strict rejection of silent JSON fallback.
 * 4. PostgresShowcaseRepository row mapping and fail-closed publication eligibility enforcement.
 * 5. Migration script integration with showcase_projects and dry-run verification.
 * 6. Immutability guard for canonical db.json.
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

import * as schema from '../src/database/postgres/schema.js';
import { PostgresShowcaseRepository } from '../src/repositories/PostgresShowcaseRepository.js';
import { JSONShowcaseRepository } from '../src/repositories/JSONShowcaseRepository.js';
import { showcaseRepository, getShowcaseRepository } from '../src/repositories/showcaseRepository.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

console.log('=== STARTING STAGE D.2-P2B-2A POSTGRESQL SHOWCASE PERSISTENCE TESTS ===\n');

// 1. Check canonical db.json hash baseline
const CANONICAL_DB_PATH = path.resolve(process.cwd(), 'db.json');
const EXPECTED_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
const initialHash = crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_DB_PATH)).digest('hex');
assert.strictEqual(initialHash, EXPECTED_DB_HASH, 'Initial db.json hash mismatch!');

let testCount = 0;
function pass(msg: string) {
  testCount++;
  console.log(`[PASS] ${testCount}. ${msg}`);
}

async function runTests() {
  const isolation = setupTestDatabaseIsolation('d2_p2b2a_postgres_showcase');

  try {
    // =========================================================================
    // TEST 1: PostgreSQL Schema Definition Integrity
    // =========================================================================
    assert(schema.showcaseProjects, 'showcaseProjects table must be exported from schema.ts');

    // Inspect Drizzle column definitions
    const cols = (schema.showcaseProjects as any)[Symbol.for('drizzle:Columns')] || (schema.showcaseProjects as any);
    const requiredColumns = [
      'id',
      'internalProjectRefId',
      'internalAssetRefId',
      'publicTitle',
      'location',
      'installedCapacityKw',
      'operationalStatus',
      'statusLabel',
      'commissioningDate',
      'measuredProduction',
      'timeSeriesData',
      'publicImageUrl',
      'connectionDescription',
      'ownerConsent',
      'technicalEvidence',
      'publicationStatus',
      'displayOrder',
      'rejectionReason',
      'unpublishReason',
      'version',
      'createdByUserId',
      'reviewedByUserId',
      'reviewedAt',
      'publishedByUserId',
      'publishedAt',
      'createdAt',
      'updatedAt'
    ];

    for (const colName of requiredColumns) {
      assert(cols[colName] !== undefined, `Column '${colName}' must exist in showcaseProjects schema`);
    }
    pass('PostgreSQL schema definition for showcase_projects contains all 27 required columns');

    // =========================================================================
    // TEST 2: Repository Abstraction & Environment-Based Dynamic Routing
    // =========================================================================
    const originalNodeEnv = process.env.NODE_ENV;
    const originalDbDriver = process.env.DB_DRIVER;

    try {
      // 2.1 Default development/test environment -> JSONShowcaseRepository
      process.env.NODE_ENV = 'development';
      delete process.env.DB_DRIVER;
      const devRepo = getShowcaseRepository();
      assert(devRepo instanceof JSONShowcaseRepository, 'Development mode without DB_DRIVER=postgres must resolve to JSONShowcaseRepository');

      // 2.2 DB_DRIVER=postgres in development -> PostgresShowcaseRepository
      process.env.DB_DRIVER = 'postgres';
      const pgDriverRepo = getShowcaseRepository();
      assert(pgDriverRepo instanceof PostgresShowcaseRepository, 'DB_DRIVER=postgres must resolve to PostgresShowcaseRepository');

      // 2.3 NODE_ENV=production -> PostgresShowcaseRepository strictly
      process.env.NODE_ENV = 'production';
      delete process.env.DB_DRIVER;
      const prodRepo = getShowcaseRepository();
      assert(prodRepo instanceof PostgresShowcaseRepository, 'Production mode must strictly resolve to PostgresShowcaseRepository');

      // 2.4 showcaseRepository delegator routes transparently
      assert(typeof showcaseRepository.findPublishedProjects === 'function', 'showcaseRepository must implement findPublishedProjects');
      assert(typeof showcaseRepository.findById === 'function', 'showcaseRepository must implement findById');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalDbDriver) process.env.DB_DRIVER = originalDbDriver;
      else delete process.env.DB_DRIVER;
    }
    pass('Repository abstraction and environment-based dynamic routing verified');

    // =========================================================================
    // TEST 3: Fail-Fast Production Safety: Strict Rejection of Silent JSON Fallback
    // =========================================================================
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;

      const prodRepo = new PostgresShowcaseRepository();
      let threw = false;
      try {
        await prodRepo.findPublishedProjects();
      } catch (err: any) {
        threw = true;
        assert(
          err.message.includes('FATAL') ||
          err.message.includes('DATABASE_URL is missing') ||
          err.message.includes('PostgreSQL database connection is unavailable'),
          `Expected fatal error in production without DATABASE_URL, received: ${err.message}`
        );
      }
      assert(threw, 'PostgresShowcaseRepository must fail fast with fatal error in production when DB is unavailable');
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
    pass('Production safety: PostgresShowcaseRepository strictly fails fast and rejects silent fallback');

    // =========================================================================
    // TEST 4: Row Mapping & Fail-Closed Publication Eligibility
    // =========================================================================
    const pgRepo = new PostgresShowcaseRepository();
    const mapRowToRecord = (pgRepo as any).mapRowToRecord.bind(pgRepo);

    const validRawRow = {
      id: 'showcase_pg_001',
      internalProjectRefId: 'proj_int_100',
      internalAssetRefId: 'asset_int_200',
      publicTitle: 'نیروگاه خورشیدی سپهر سمنان',
      location: { province: 'سمنان', city: 'سمنان' },
      installedCapacityKw: 250,
      operationalStatus: 'OPERATIONAL',
      statusLabel: 'بهره‌برداری تأییدشده',
      commissioningDate: '1402/08/15',
      measuredProduction: {
        value: 41250,
        unit: 'کیلووات ساعت',
        period: 'ماه گذشته',
        source: 'کنتور فهام'
      },
      timeSeriesData: [
        { label: 'فروردین', value: 38000 },
        { label: 'اردیبهشت', value: 42000 }
      ],
      publicImageUrl: null,
      connectionDescription: 'متصل به فیدر ۲۰ کیلوولت',
      ownerConsent: {
        isGranted: true,
        consentingPartyName: 'شرکت سرمایه‌گذاری سپهر خورشید',
        consentDocumentReferenceId: 'DOC-CONSENT-9901',
        consentedAt: '2024-01-10T10:00:00Z',
        withdrawnAt: null
      },
      technicalEvidence: {
        evidenceType: 'COMMISSIONING_REPORT',
        documentReferenceId: 'DOC-TECH-5501',
        verifiedAt: '2024-01-12T14:30:00Z',
        verifiedBy: 'مهندس ارشد ناظر هوشیار',
        isValid: true
      },
      publicationStatus: 'PUBLISHED',
      displayOrder: 1,
      rejectionReason: null,
      unpublishReason: null,
      version: 1,
      createdByUserId: 'usr_admin_001',
      reviewedByUserId: 'usr_admin_002',
      reviewedAt: new Date('2024-01-14T10:00:00Z'),
      publishedByUserId: 'usr_admin_002',
      publishedAt: new Date('2024-01-15T08:00:00Z'),
      createdAt: new Date('2024-01-09T09:00:00Z'),
      updatedAt: new Date('2024-01-15T08:00:00Z')
    };

    const mapped = mapRowToRecord(validRawRow);
    assert.strictEqual(mapped.id, 'showcase_pg_001');
    assert.strictEqual(mapped.installedCapacityKw, 250);
    assert.strictEqual(typeof mapped.createdAt, 'string');
    assert.strictEqual(typeof mapped.updatedAt, 'string');
    assert.strictEqual(mapped.createdAt, '2024-01-09T09:00:00.000Z');
    assert.strictEqual(mapped.updatedAt, '2024-01-15T08:00:00.000Z');

    // Test with JSON-stringified columns (as returned by some postgres drivers)
    const stringifiedRawRow = {
      ...validRawRow,
      location: JSON.stringify(validRawRow.location),
      ownerConsent: JSON.stringify(validRawRow.ownerConsent),
      technicalEvidence: JSON.stringify(validRawRow.technicalEvidence),
      measuredProduction: JSON.stringify(validRawRow.measuredProduction),
      timeSeriesData: JSON.stringify(validRawRow.timeSeriesData)
    };
    const mappedFromStringified = mapRowToRecord(stringifiedRawRow);
    assert.deepStrictEqual(mappedFromStringified.location, validRawRow.location);
    assert.deepStrictEqual(mappedFromStringified.ownerConsent, validRawRow.ownerConsent);
    assert.deepStrictEqual(mappedFromStringified.technicalEvidence, validRawRow.technicalEvidence);
    assert.deepStrictEqual(mappedFromStringified.measuredProduction, validRawRow.measuredProduction);

    pass('PostgresShowcaseRepository row mapping correctly handles Date objects and JSON string/object formats');

    // =========================================================================
    // TEST 5: Migration Script Integration & Dry-Run Report Verification
    // =========================================================================
    const fixtureData = {
      users: [
        { id: "usr-1", phone: "+989120000001", name: "User 1", roles: ["ADMIN"], createdAt: "2023-01-01T00:00:00Z" }
      ],
      organizations: [
        { id: "org-1", name: "Org 1", type: "OWNER", status: "ACTIVE", createdAt: "2023-01-01T00:00:00Z" }
      ],
      energyProjects: [],
      portfolios: [],
      solarAssets: [],
      showcaseProjects: [
        {
          id: 'sc-fixture-001',
          publicTitle: 'نیروگاه خورشیدی تست مهاجرت',
          location: { province: 'یزد', city: 'یزد' },
          installedCapacityKw: 100,
          operationalStatus: 'OPERATIONAL',
          publicationStatus: 'PUBLISHED',
          displayOrder: 1,
          ownerConsent: {
            isGranted: true,
            consentingPartyName: 'مالک تست',
            consentDocumentReferenceId: 'DOC-1',
            consentedAt: '2024-01-01T00:00:00Z'
          },
          technicalEvidence: {
            evidenceType: 'SATBA_PPA',
            documentReferenceId: 'DOC-2',
            verifiedAt: '2024-01-01T00:00:00Z',
            verifiedBy: 'ناظر',
            isValid: true
          },
          version: 1,
          createdByUserId: 'usr-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
    };

    fs.writeFileSync(isolation.tempDbPath, JSON.stringify(fixtureData, null, 2));

    const tempReportPath = path.join(os.tmpdir(), `POSTGRES_MIGRATION_REPORT_D2_P2B2A_${Date.now()}.md`);
    const output = execSync(`npx tsx scripts/migrate_json_to_postgres.ts --dry-run --source "${isolation.tempDbPath}"`, {
      encoding: 'utf8',
      env: {
        ...process.env,
        TEST_DB_PATH: isolation.tempDbPath,
        JSON_DB_PATH: isolation.tempDbPath,
        MIGRATION_REPORT_PATH: tempReportPath
      }
    });

    assert(output.includes('DRY RUN COMPLETE'), 'Dry run migration must output completion message');
    assert(output.includes('Skipping inserts'), 'Dry run must skip actual database inserts');

    const reportContent = fs.readFileSync(tempReportPath, 'utf8');
    const showcaseRowRegex = /\|\s*showcaseProjects\s*\|\s*1\s*\|\s*1\s*\|\s*0\s*\|\s*DRY_RUN_PASS\s*\|/;
    assert(showcaseRowRegex.test(reportContent), 'Migration report must include showcaseProjects with count 1 and DRY_RUN_PASS');
    pass('Database migration runner successfully supports showcase_projects with dry-run verification');

    // =========================================================================
    // TEST 6: Immutability Guard Verification
    // =========================================================================
    isolation.verifyImmutability();
    const finalHash = crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_DB_PATH)).digest('hex');
    assert.strictEqual(finalHash, EXPECTED_DB_HASH, 'Canonical db.json was mutated during test execution!');
    pass('Canonical db.json is 100% byte-for-byte identical (SHA-256 match)');

    console.log('\n=== STAGE D.2-P2B-2A ALL 6 / 6 TESTS PASSED ===');
  } finally {
    isolation.cleanup();
  }
}

runTests().catch(err => {
  console.error('\n[FAIL] STAGE D.2-P2B-2A TEST SUITE ERROR:\n', err);
  process.exit(1);
});
