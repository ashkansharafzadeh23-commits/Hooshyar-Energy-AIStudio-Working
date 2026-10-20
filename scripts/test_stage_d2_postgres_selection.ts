/**
 * Stage D.2 Final Validation — PostgreSQL Boundary Defect Fix, Keyset Progression & Parity Test Suite
 *
 * Verifies:
 * 1. Bounded keyset batching past revoked consent (25 records: 15 withdrawn, 10 valid).
 * 2. All-invalid records dataset fails closed to empty array.
 * 3. Mixed invalid records (consent, evidence, capacity, title, location, measurements, time-series).
 * 4. Maximum public result cap enforcement (clamped to 20).
 * 5. Deterministic unique ID tie-breaking when displayOrder and updatedAt are identical.
 * 6. Multi-batch progression across batch boundaries.
 * 7. Database query failures reject safely without exposing partial batches.
 * 8. Malformed JSON row mapping fails closed without server crash or data corruption.
 * 9. More than 200 invalid published records followed by valid projects (eliminating 200-candidate truncation).
 * 10. Multiple keyset pages with identical displayOrder and updatedAt values (valid equal-timestamp ID ordering).
 * 11. Exhausted dataset returns fewer than the requested limit cleanly without error.
 * 12. Non-progressing (stagnant) pagination cursor guard throws explicit error.
 * 13. Backward-moving pagination cursor rejection (displayOrder backward, updatedAt backward, id backward).
 * 14. Invalid or non-finite timestamp rejection before comparison.
 * 15. Malformed cursor ordering values (NaN displayOrder, invalid string, empty id) rejected without silent normalization.
 * 16. Result limit satisfied returns immediately without unnecessary cursor construction or validation on final batch rows.
 * 17. Protective scan budget & exact boundary conditions:
 *     - 17A: Protective scan budget exceeded throws explicit error on infinite candidate stream.
 *     - 17B: Exactly 2,000 published ineligible records exhausts dataset cleanly (returns empty array without throwing).
 *     - 17C: 2,001 published ineligible records halts and throws explicit scan budget error (fails closed).
 *     - 17D: 1,999 published ineligible records exhausts dataset cleanly on 100th batch (returns empty array).
 *     - 17E: Early-termination cases (limit 10 on 2,000 / 2,001 candidate sets returns in 1 query; partial match exhausts vs throws).
 * 18. ACTUAL PARITY: Both JSONShowcaseRepository and PostgresShowcaseRepository executed against identical datasets.
 * 19. Public DTO projection leakage guard: zero exposure of internal IDs, consent docs, or private metadata.
 * 20. Immutability guard: canonical db.json verified byte-for-byte identical (SHA-256 match).
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { PostgresShowcaseRepository } from '../src/repositories/PostgresShowcaseRepository.js';
import { JSONShowcaseRepository } from '../src/repositories/JSONShowcaseRepository.js';
import {
  toPublicShowcaseDTO,
  ShowcaseProjectRecord,
  isRecordEligibleForPublicShowcase
} from '../src/types/showcase.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

console.log('=== STARTING STAGE D.2 POSTGRESQL SHOWCASE SELECTION & BOUNDARY DEFECT TESTS ===');
console.log('[TEST ARCHITECTURE DISTINCTION]');
console.log('  * Mock Engine Tests (This Suite): Evaluates PostgresShowcaseRepository using isolated mock Drizzle query');
console.log('    builder to deterministically verify keyset progression, backward movement rejection, non-finite timestamp');
console.log('    handling, malformed value guards, scan budget limits, exact 2000/2001 boundaries, and exact parity with JSONShowcaseRepository.');
console.log('  * Real Database Tests: Live PostgreSQL connection, schema validation, Drizzle ORM, and database migration');
console.log('    are verified in `scripts/test_stage_d2_p2b2a_showcase_postgres.ts` requiring active DATABASE_URL.\n');

// Immutability baseline
const CANONICAL_DB_PATH = path.resolve(process.cwd(), 'db.json');
const initialHash = crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_DB_PATH)).digest('hex');
const EXPECTED_DB_HASH = initialHash;
assert.strictEqual(initialHash, EXPECTED_DB_HASH, 'Initial db.json hash mismatch!');

let testCount = 0;
function pass(msg: string) {
  testCount++;
  console.log(`[PASS] ${testCount}. ${msg}`);
}

/**
 * Isolated Mock Database Engine simulating Drizzle ORM query builder with keyset cursor pagination.
 */
class MockDrizzleDB {
  public rows: any[] = [];
  public queryCount = 0;
  public failOnQueryIndex: number | null = null;
  public failureError: Error | null = null;
  public simulateNonProgressingCursor = false;

  constructor(rows: any[]) {
    this.rows = rows;
  }

  select() {
    const self = this;
    return {
      from(_table: any) {
        return {
          where(cond: any) {
            return {
              orderBy(..._orders: any[]) {
                return {
                  limit(limitCount: number) {
                    self.queryCount++;
                    if (self.failOnQueryIndex !== null && self.queryCount >= self.failOnQueryIndex) {
                      throw self.failureError || new Error('SIMULATED_DB_QUERY_FAILURE');
                    }

                    // Recursively extract params from Drizzle condition chunks
                    function extractParams(chunk: any): any[] {
                      const p: any[] = [];
                      if (!chunk) return p;
                      if (chunk.value !== undefined) p.push(chunk.value);
                      if (Array.isArray(chunk)) chunk.forEach(c => p.push(...extractParams(c)));
                      if (chunk.queryChunks) p.push(...extractParams(chunk.queryChunks));
                      return p;
                    }

                    const params = extractParams(cond);
                    const cursorOrder = params.find(p => typeof p === 'number');
                    const cursorUpdated = params.find(p => p instanceof Date);
                    const cursorId = params.find(p => typeof p === 'string' && p !== 'PUBLISHED');

                    // Filter publicationStatus = 'PUBLISHED'
                    let matching = self.rows.filter(r => r.publicationStatus === 'PUBLISHED');

                    // Sort deterministically: displayOrder ASC, updatedAt DESC, id ASC
                    matching.sort((a, b) => {
                      const oA = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
                      const oB = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
                      if (oA !== oB) return oA - oB;

                      const tA = (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt || 0)).getTime();
                      const tB = (b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt || 0)).getTime();
                      if (tA !== tB) return tB - tA; // DESC

                      return String(a.id).localeCompare(String(b.id)); // ASC
                    });

                    // Keyset cursor evaluation: row must be strictly after (cursorOrder, cursorUpdated, cursorId)
                    if (cursorOrder !== undefined && cursorUpdated && cursorId) {
                      if (self.simulateNonProgressingCursor) {
                        // Return the same previous row to simulate non-progressing cursor
                        const stagnantRow = matching.find(r => r.id === cursorId);
                        if (stagnantRow) {
                          return Promise.resolve([stagnantRow]);
                        }
                      }

                      const cTime = cursorUpdated.getTime();
                      matching = matching.filter(r => {
                        const rOrder = typeof r.displayOrder === 'number' ? r.displayOrder : 0;
                        if (rOrder > cursorOrder) return true;
                        if (rOrder < cursorOrder) return false;

                        const rTime = (r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt || 0)).getTime();
                        if (rTime < cTime) return true; // DESC: older comes after newer
                        if (rTime > cTime) return false;

                        return String(r.id) > String(cursorId); // ASC
                      });
                    }

                    return Promise.resolve(matching.slice(0, limitCount));
                  }
                };
              }
            };
          }
        };
      }
    };
  }
}

function createValidShowcaseRow(overrides: Partial<any> = {}) {
  const id = overrides.id || `proj_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    internalProjectRefId: `int_proj_${id}`,
    internalAssetRefId: `int_asset_${id}`,
    publicTitle: overrides.publicTitle !== undefined ? overrides.publicTitle : `نیروگاه خورشیدی تست ${id}`,
    location: overrides.location !== undefined ? overrides.location : { province: 'اصفهان', city: 'کاشان' },
    installedCapacityKw: overrides.installedCapacityKw !== undefined ? overrides.installedCapacityKw : 120,
    operationalStatus: overrides.operationalStatus || 'OPERATIONAL',
    statusLabel: overrides.statusLabel || 'بهره‌برداری تأییدشده',
    commissioningDate: overrides.commissioningDate || '1402/10/01',
    measuredProduction: overrides.measuredProduction !== undefined ? overrides.measuredProduction : {
      value: 18500,
      unit: 'کیلووات ساعت',
      period: 'ماه گذشته',
      source: 'کنتور تبادل'
    },
    timeSeriesData: overrides.timeSeriesData !== undefined ? overrides.timeSeriesData : [
      { label: 'دی', value: 17200 },
      { label: 'بهمن', value: 18500 }
    ],
    publicImageUrl: overrides.publicImageUrl || null,
    connectionDescription: overrides.connectionDescription || 'اتصال فشار متوسط',
    ownerConsent: overrides.ownerConsent !== undefined ? overrides.ownerConsent : {
      isGranted: true,
      consentingPartyName: 'مالک قانونی پروژه',
      consentDocumentReferenceId: `DOC-CONSENT-${id}`,
      consentedAt: '2024-01-01T00:00:00Z',
      withdrawnAt: null
    },
    technicalEvidence: overrides.technicalEvidence !== undefined ? overrides.technicalEvidence : {
      evidenceType: 'SATBA_PPA',
      documentReferenceId: `DOC-TECH-${id}`,
      verifiedAt: '2024-01-02T00:00:00Z',
      verifiedBy: 'کارشناس رسمی انرژی',
      isValid: true
    },
    publicationStatus: overrides.publicationStatus || 'PUBLISHED',
    displayOrder: overrides.displayOrder !== undefined ? overrides.displayOrder : 1,
    version: 1,
    createdByUserId: 'usr_admin',
    createdAt: overrides.createdAt !== undefined ? overrides.createdAt : new Date('2024-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt !== undefined ? overrides.updatedAt : new Date('2024-01-05T00:00:00Z')
  };
}

async function runAllTests() {
  const isolation = setupTestDatabaseIsolation('d2_phase1b_postgres_selection');

  try {
    // =========================================================================
    // TEST 1: Bounded Keyset Batching Past Revoked Consent (25 records: 15 withdrawn, 10 valid)
    // =========================================================================
    const test1Rows: any[] = [];
    for (let i = 1; i <= 25; i++) {
      test1Rows.push(createValidShowcaseRow({
        id: `proj_${String(i).padStart(3, '0')}`,
        publicTitle: `نیروگاه خورشیدی شماره ${i}`,
        displayOrder: i,
        ownerConsent: {
          isGranted: true,
          consentingPartyName: `مالک ${i}`,
          consentDocumentReferenceId: `DOC-${i}`,
          consentedAt: '2024-01-01T00:00:00Z',
          withdrawnAt: i <= 15 ? '2024-02-01T00:00:00Z' : null
        }
      }));
    }

    const mockDb1 = new MockDrizzleDB(test1Rows);
    const repo1 = new PostgresShowcaseRepository(mockDb1);
    const results1 = await repo1.findPublishedProjects(10);

    assert.strictEqual(results1.length, 10, 'Must return exactly 10 eligible projects');
    const expectedIds = Array.from({ length: 10 }, (_, idx) => `proj_${String(idx + 16).padStart(3, '0')}`);
    assert.deepStrictEqual(results1.map(r => r.id), expectedIds);
    assert(mockDb1.queryCount >= 2, 'Keyset pagination must have retrieved candidates across multiple bounded batches');
    pass('Twenty-five published records: first 15 withdrawn consent safely bypassed; 10 valid projects returned in order');

    // =========================================================================
    // TEST 2: All Invalid Records Fail Closed to Empty Array
    // =========================================================================
    const test2Rows: any[] = [];
    for (let i = 1; i <= 15; i++) {
      test2Rows.push(createValidShowcaseRow({
        id: `invalid_proj_${i}`,
        displayOrder: i,
        ownerConsent: {
          isGranted: false,
          consentingPartyName: `مالک ${i}`,
          consentDocumentReferenceId: `DOC-${i}`,
          consentedAt: '2024-01-01T00:00:00Z',
          withdrawnAt: null
        }
      }));
    }

    const mockDb2 = new MockDrizzleDB(test2Rows);
    const repo2 = new PostgresShowcaseRepository(mockDb2);
    const results2 = await repo2.findPublishedProjects(10);

    assert.strictEqual(results2.length, 0, 'When all records are invalid, findPublishedProjects must return empty array');
    pass('All invalid records dataset: fails closed to empty array without crashing');

    // =========================================================================
    // TEST 3: Mixed Invalid Edge Cases (Consent, Evidence, Presentation, Measurements, Time-Series)
    // =========================================================================
    const test3Rows = [
      createValidShowcaseRow({ id: 'bad_consent_1', displayOrder: 1, ownerConsent: { isGranted: false } }),
      createValidShowcaseRow({ id: 'bad_consent_2', displayOrder: 2, ownerConsent: null }),
      createValidShowcaseRow({ id: 'bad_evidence_1', displayOrder: 3, technicalEvidence: { isValid: false } }),
      createValidShowcaseRow({ id: 'bad_evidence_2', displayOrder: 4, technicalEvidence: null }),
      createValidShowcaseRow({ id: 'bad_title', displayOrder: 5, publicTitle: '   ' }),
      createValidShowcaseRow({ id: 'bad_location', displayOrder: 6, location: { province: '', city: '' } }),
      createValidShowcaseRow({ id: 'bad_capacity_negative', displayOrder: 7, installedCapacityKw: -100 }),
      createValidShowcaseRow({ id: 'bad_capacity_nan', displayOrder: 8, installedCapacityKw: NaN }),
      createValidShowcaseRow({ id: 'bad_measurement', displayOrder: 9, measuredProduction: { value: -50, unit: '', period: '', source: '' } }),
      createValidShowcaseRow({ id: 'bad_timeseries_oversized', displayOrder: 10, timeSeriesData: Array(50).fill({ label: 'تست', value: 100 }) }),
      createValidShowcaseRow({ id: 'good_project_1', displayOrder: 11, publicTitle: 'پروژه معتبر یزد', installedCapacityKw: 200 })
    ];

    const mockDb3 = new MockDrizzleDB(test3Rows);
    const repo3 = new PostgresShowcaseRepository(mockDb3);
    const results3 = await repo3.findPublishedProjects(10);

    assert.strictEqual(results3.length, 1, 'Only the single valid project must be returned from mixed invalid records');
    assert.strictEqual(results3[0].id, 'good_project_1');
    pass('Mixed invalid consent, evidence, location, capacity, measurements, and oversized time-series safely excluded');

    // =========================================================================
    // TEST 4: Maximum Public Result Cap Enforcement (Hard Limit: 20)
    // =========================================================================
    const test4Rows: any[] = [];
    for (let i = 1; i <= 30; i++) {
      test4Rows.push(createValidShowcaseRow({
        id: `cap_proj_${String(i).padStart(3, '0')}`,
        displayOrder: i
      }));
    }

    const mockDb4 = new MockDrizzleDB(test4Rows);
    const repo4 = new PostgresShowcaseRepository(mockDb4);
    const results4 = await repo4.findPublishedProjects(50); // Requesting 50

    assert.strictEqual(results4.length, 20, 'findPublishedProjects must clamp requested limit to maximum safe limit of 20');
    assert.strictEqual(results4[0].id, 'cap_proj_001');
    assert.strictEqual(results4[19].id, 'cap_proj_020');
    pass('More than twenty eligible records: hard cap of 20 strictly enforced');

    // =========================================================================
    // TEST 5: Deterministic Ordering with Unique ID Tie-Breaker
    // =========================================================================
    const sameDate = new Date('2024-03-01T12:00:00Z');
    const test5Rows = [
      createValidShowcaseRow({ id: 'proj_gamma', displayOrder: 10, updatedAt: sameDate }),
      createValidShowcaseRow({ id: 'proj_alpha', displayOrder: 10, updatedAt: sameDate }),
      createValidShowcaseRow({ id: 'proj_beta', displayOrder: 10, updatedAt: sameDate })
    ];

    const mockDb5 = new MockDrizzleDB(test5Rows);
    const repo5 = new PostgresShowcaseRepository(mockDb5);
    const results5 = await repo5.findPublishedProjects(10);

    assert.strictEqual(results5.length, 3);
    assert.deepStrictEqual(results5.map(r => r.id), ['proj_alpha', 'proj_beta', 'proj_gamma']);
    pass('Deterministic ordering when displayOrder and updatedAt are identical verified via unique ID tie-breaker');

    // =========================================================================
    // TEST 6: Multi-Batch Traversal Across Batch Boundaries
    // =========================================================================
    const test6Rows: any[] = [];
    for (let i = 1; i <= 35; i++) {
      const isValid = (i >= 19 && i <= 20) || (i >= 31 && i <= 35);
      test6Rows.push(createValidShowcaseRow({
        id: `batch_proj_${String(i).padStart(3, '0')}`,
        displayOrder: i,
        ownerConsent: {
          isGranted: isValid,
          consentingPartyName: `مالک ${i}`,
          consentDocumentReferenceId: `DOC-${i}`,
          consentedAt: '2024-01-01T00:00:00Z',
          withdrawnAt: isValid ? null : '2024-02-01T00:00:00Z'
        }
      }));
    }

    const mockDb6 = new MockDrizzleDB(test6Rows);
    const repo6 = new PostgresShowcaseRepository(mockDb6);
    const results6 = await repo6.findPublishedProjects(10);

    assert.strictEqual(results6.length, 7, 'Must traverse batch boundaries and gather all 7 valid projects');
    assert.strictEqual(results6[0].id, 'batch_proj_019');
    assert.strictEqual(results6[6].id, 'batch_proj_035');
    pass('Multiple batches with invalid records spanning batch boundaries gathered seamlessly');

    // =========================================================================
    // TEST 7: Database Query Failure Fails Closed Without Partial Exposure
    // =========================================================================
    const test7Rows: any[] = [];
    for (let i = 1; i <= 30; i++) {
      test7Rows.push(createValidShowcaseRow({
        id: `fail_proj_${i}`,
        displayOrder: i,
        ownerConsent: {
          isGranted: true,
          consentingPartyName: `مالک ${i}`,
          consentDocumentReferenceId: `DOC-${i}`,
          consentedAt: '2024-01-01T00:00:00Z',
          withdrawnAt: i <= 15 ? '2024-02-01T00:00:00Z' : null
        }
      }));
    }

    const mockDb7 = new MockDrizzleDB(test7Rows);
    mockDb7.failOnQueryIndex = 2; // Fail on second batch after gathering 5 valid records in batch 1
    mockDb7.failureError = new Error('DATABASE_CONNECTION_LOST_DURING_PAGINATION');

    const repo7 = new PostgresShowcaseRepository(mockDb7);
    let rejected = false;
    try {
      await repo7.findPublishedProjects(15);
    } catch (err: any) {
      rejected = true;
      assert(err.message.includes('DATABASE_CONNECTION_LOST'), 'Error message must reflect underlying database failure');
    }
    assert(rejected, 'Repository must fail closed and throw upon database failure, never returning a partial array');
    pass('Database query failure: rejects safely without returning partial unvalidated results');

    // =========================================================================
    // TEST 8: Malformed JSON Row Mapping Fails Closed
    // =========================================================================
    const test8Rows = [
      {
        ...createValidShowcaseRow({ id: 'corrupt_row_1', displayOrder: 1 }),
        location: '{INVALID_JSON_SYNTAX_IN_LOCATION: true'
      },
      {
        ...createValidShowcaseRow({ id: 'corrupt_row_2', displayOrder: 2 }),
        ownerConsent: 'MALFORMED_CONSENT_JSON'
      },
      createValidShowcaseRow({ id: 'valid_row_after_corrupt', displayOrder: 3, publicTitle: 'پروژه سالم بعد از داده مخدوش' })
    ];

    const mockDb8 = new MockDrizzleDB(test8Rows);
    const repo8 = new PostgresShowcaseRepository(mockDb8);
    const results8 = await repo8.findPublishedProjects(10);

    assert.strictEqual(results8.length, 1, 'Corrupted JSON rows must fail closed to null and be excluded from results');
    assert.strictEqual(results8[0].id, 'valid_row_after_corrupt');
    pass('Malformed JSON row mapping: fails closed safely without crashing and preserves valid records');

    // =========================================================================
    // TEST 9: More Than 200 Invalid Published Records Followed by Valid Projects
    // =========================================================================
    // 230 records: first 220 have withdrawn consent, followed by 10 valid records
    const test9Rows: any[] = [];
    for (let i = 1; i <= 230; i++) {
      test9Rows.push(createValidShowcaseRow({
        id: `sc_200_${String(i).padStart(4, '0')}`,
        displayOrder: i,
        ownerConsent: {
          isGranted: true,
          consentingPartyName: `مالک ${i}`,
          consentDocumentReferenceId: `DOC-${i}`,
          consentedAt: '2024-01-01T00:00:00Z',
          withdrawnAt: i <= 220 ? '2024-02-01T00:00:00Z' : null // First 220 invalid!
        }
      }));
    }

    const mockDb9 = new MockDrizzleDB(test9Rows);
    const repo9 = new PostgresShowcaseRepository(mockDb9);
    const results9 = await repo9.findPublishedProjects(10);

    assert.strictEqual(results9.length, 10, 'Must continue past 200 invalid candidates and return all 10 valid projects');
    assert.strictEqual(results9[0].id, 'sc_200_0221', 'First returned project must be candidate 221');
    assert.strictEqual(results9[9].id, 'sc_200_0230', 'Tenth returned project must be candidate 230');
    assert(mockDb9.queryCount >= 12, 'Pagination must have executed 12+ bounded batches without early termination');
    pass('More than 200 invalid published records (220 invalid + 10 valid): successfully gathers all 10 valid projects without silent omission');

    // =========================================================================
    // TEST 10: Multiple Keyset Pages with Identical displayOrder and updatedAt Values
    // =========================================================================
    const identicalTimestamp = new Date('2024-06-01T00:00:00Z');
    const test10Rows: any[] = [];
    // 50 records all sharing displayOrder: 1 and updatedAt: identicalTimestamp
    for (let i = 1; i <= 50; i++) {
      test10Rows.push(createValidShowcaseRow({
        id: `dup_keyset_${String(i).padStart(3, '0')}`,
        displayOrder: 1,
        updatedAt: identicalTimestamp,
        ownerConsent: {
          isGranted: true,
          consentingPartyName: `مالک ${i}`,
          consentDocumentReferenceId: `DOC-${i}`,
          consentedAt: '2024-01-01T00:00:00Z',
          withdrawnAt: (i >= 5 && i <= 30) ? '2024-02-01T00:00:00Z' : null // 26 invalid records spanning across batches
        }
      }));
    }

    const mockDb10 = new MockDrizzleDB(test10Rows);
    const repo10 = new PostgresShowcaseRepository(mockDb10);
    const results10 = await repo10.findPublishedProjects(15);

    // Valid IDs: 1..4 (4 records) and 31..41 (11 records) -> 15 records
    assert.strictEqual(results10.length, 15, 'Keyset cursor must progress smoothly through identical order/updatedAt via id ASC tie-breaker');
    assert.strictEqual(results10[0].id, 'dup_keyset_001');
    assert.strictEqual(results10[3].id, 'dup_keyset_004');
    assert.strictEqual(results10[4].id, 'dup_keyset_031');
    assert.strictEqual(results10[14].id, 'dup_keyset_041');
    pass('Multiple keyset pages with identical displayOrder and updatedAt: deterministic unique ID tie-breaking verified');

    // =========================================================================
    // TEST 11: Exhausted Dataset Returns Fewer Than Requested Limit Cleanly
    // =========================================================================
    // Only 4 valid records exist in the entire database, request limit 15
    const test11Rows = [
      createValidShowcaseRow({ id: 'exh_01', displayOrder: 1 }),
      createValidShowcaseRow({ id: 'exh_02', displayOrder: 2 }),
      createValidShowcaseRow({ id: 'exh_invalid', displayOrder: 3, ownerConsent: { isGranted: false } }),
      createValidShowcaseRow({ id: 'exh_03', displayOrder: 4 }),
      createValidShowcaseRow({ id: 'exh_04', displayOrder: 5 })
    ];

    const mockDb11 = new MockDrizzleDB(test11Rows);
    const repo11 = new PostgresShowcaseRepository(mockDb11);
    const results11 = await repo11.findPublishedProjects(15);

    assert.strictEqual(results11.length, 4, 'When database is exhausted before limit is reached, returns all gathered valid projects');
    assert.deepStrictEqual(results11.map(r => r.id), ['exh_01', 'exh_02', 'exh_03', 'exh_04']);
    pass('Exhausted dataset returns fewer than the requested limit cleanly without error or truncation');

    // =========================================================================
    // Custom Batch Mock Database Helper for Precise Pagination Traversal Scenarios
    // =========================================================================
    class CustomBatchMockDB {
      public queryCount = 0;
      constructor(private batches: any[][]) {}
      select() {
        const self = this;
        return {
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => {
                  const batch = self.batches[self.queryCount] || [];
                  self.queryCount++;
                  return Promise.resolve(batch);
                }
              })
            })
          })
        };
      }
    }

    // =========================================================================
    // TEST 12: Non-Progressing (Stagnant) Pagination Cursor Guard
    // =========================================================================
    const test12Batch1: any[] = [];
    for (let i = 1; i <= 20; i++) {
      test12Batch1.push(createValidShowcaseRow({
        id: `stagnant_${String(i).padStart(3, '0')}`,
        displayOrder: 1,
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        ownerConsent: { isGranted: false } // Invalid so pagination attempts to fetch batch 2
      }));
    }
    // Batch 2 returns rows ending with the identical cursor coordinates
    const test12Batch2 = [...test12Batch1];

    const repo12 = new PostgresShowcaseRepository(new CustomBatchMockDB([test12Batch1, test12Batch2]));
    let stagnantDetected = false;
    try {
      await repo12.findPublishedProjects(10);
    } catch (err: any) {
      stagnantDetected = true;
      assert(err.message.includes('Non-progressing (stagnant) pagination cursor detected'), 'Must throw descriptive error for non-progressing cursor');
    }
    assert(stagnantDetected, 'Repository must detect non-progressing cursor and throw explicit error');
    pass('Non-progressing (stagnant) pagination cursor guard: halts and throws explicit error to prevent infinite loops');

    // =========================================================================
    // TEST 13: Backward-Moving Pagination Cursor Rejection
    // =========================================================================
    // 13.1 displayOrder backward movement
    const test13_1_Batch1 = Array.from({ length: 20 }, (_, i) => createValidShowcaseRow({
      id: `ord_b1_${i + 1}`,
      displayOrder: 2,
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      ownerConsent: { isGranted: false }
    }));
    const test13_1_Batch2 = Array.from({ length: 20 }, (_, i) => createValidShowcaseRow({
      id: `ord_b2_${i + 1}`,
      displayOrder: 1, // Moves backward from 2 to 1!
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      ownerConsent: { isGranted: false }
    }));
    let backwardOrderDetected = false;
    try {
      const repo13_1 = new PostgresShowcaseRepository(new CustomBatchMockDB([test13_1_Batch1, test13_1_Batch2]));
      await repo13_1.findPublishedProjects(10);
    } catch (err: any) {
      backwardOrderDetected = true;
      assert(err.message.includes('Backward-moving pagination cursor detected'), 'Must reject backward displayOrder movement');
    }
    assert(backwardOrderDetected, 'Repository must reject backward displayOrder movement');

    // 13.2 updatedAt backward movement (since order is DESC, a newer date is moving backward!)
    const test13_2_Batch1 = Array.from({ length: 20 }, (_, i) => createValidShowcaseRow({
      id: `time_b1_${i + 1}`,
      displayOrder: 1,
      updatedAt: new Date('2024-01-01T00:00:00Z'), // Older
      ownerConsent: { isGranted: false }
    }));
    const test13_2_Batch2 = Array.from({ length: 20 }, (_, i) => createValidShowcaseRow({
      id: `time_b2_${i + 1}`,
      displayOrder: 1,
      updatedAt: new Date('2024-02-01T00:00:00Z'), // Newer timestamp in DESC ordering is backward!
      ownerConsent: { isGranted: false }
    }));
    let backwardTimeDetected = false;
    try {
      const repo13_2 = new PostgresShowcaseRepository(new CustomBatchMockDB([test13_2_Batch1, test13_2_Batch2]));
      await repo13_2.findPublishedProjects(10);
    } catch (err: any) {
      backwardTimeDetected = true;
      assert(err.message.includes('Backward-moving pagination cursor detected'), 'Must reject backward updatedAt movement');
    }
    assert(backwardTimeDetected, 'Repository must reject backward updatedAt movement');

    // 13.3 id tie-breaker backward movement (with identical displayOrder and updatedAt)
    const sameTime = new Date('2024-01-01T00:00:00Z');
    const test13_3_Batch1 = Array.from({ length: 20 }, (_, i) => createValidShowcaseRow({
      id: `id_b1_${String(i + 10).padStart(3, '0')}`, // Ends at id_b1_029
      displayOrder: 1,
      updatedAt: sameTime,
      ownerConsent: { isGranted: false }
    }));
    const test13_3_Batch2 = Array.from({ length: 20 }, (_, i) => createValidShowcaseRow({
      id: `id_b1_${String(i + 1).padStart(3, '0')}`, // Ends at id_b1_020 < id_b1_029!
      displayOrder: 1,
      updatedAt: sameTime,
      ownerConsent: { isGranted: false }
    }));
    let backwardIdDetected = false;
    try {
      const repo13_3 = new PostgresShowcaseRepository(new CustomBatchMockDB([test13_3_Batch1, test13_3_Batch2]));
      await repo13_3.findPublishedProjects(10);
    } catch (err: any) {
      backwardIdDetected = true;
      assert(err.message.includes('Backward-moving pagination cursor detected'), 'Must reject backward id progression');
    }
    assert(backwardIdDetected, 'Repository must reject backward id progression');
    pass('Backward-moving pagination cursor rejection verified across displayOrder, updatedAt DESC, and unique ID');

    // =========================================================================
    // TEST 14: Invalid and Non-Finite Timestamp Rejection Before Comparison
    // =========================================================================
    // 14.1 Invalid date string
    const test14_1_Batch = [
      createValidShowcaseRow({
        id: 'bad_time_str',
        displayOrder: 1,
        updatedAt: 'THIS_IS_NOT_A_VALID_DATE',
        ownerConsent: { isGranted: false }
      })
    ];
    let invalidDateDetected = false;
    try {
      const repo14_1 = new PostgresShowcaseRepository(new CustomBatchMockDB([test14_1_Batch]));
      await repo14_1.findPublishedProjects(10);
    } catch (err: any) {
      invalidDateDetected = true;
      assert(err.message.includes('Invalid non-finite cursor timestamp'), 'Must reject invalid unparseable date strings');
    }
    assert(invalidDateDetected, 'Repository must reject unparseable date strings in cursor');

    // 14.2 Non-finite timestamp (NaN)
    const test14_2_Batch = [
      createValidShowcaseRow({
        id: 'bad_time_nan',
        displayOrder: 1,
        updatedAt: NaN,
        ownerConsent: { isGranted: false }
      })
    ];
    let nanDateDetected = false;
    try {
      const repo14_2 = new PostgresShowcaseRepository(new CustomBatchMockDB([test14_2_Batch]));
      await repo14_2.findPublishedProjects(10);
    } catch (err: any) {
      nanDateDetected = true;
      assert(
        err.message.includes('Invalid non-finite cursor timestamp') || err.message.includes('Malformed cursor updatedAt'),
        'Must reject NaN timestamps'
      );
    }
    assert(nanDateDetected, 'Repository must reject NaN timestamps in cursor');

    // 14.3 Malformed null timestamp
    const test14_3_Batch = [
      createValidShowcaseRow({
        id: 'bad_time_null',
        displayOrder: 1,
        updatedAt: null,
        ownerConsent: { isGranted: false }
      })
    ];
    let nullDateDetected = false;
    try {
      const repo14_3 = new PostgresShowcaseRepository(new CustomBatchMockDB([test14_3_Batch]));
      await repo14_3.findPublishedProjects(10);
    } catch (err: any) {
      nullDateDetected = true;
      assert(err.message.includes('Malformed cursor updatedAt value'), 'Must reject null timestamps');
    }
    assert(nullDateDetected, 'Repository must reject null timestamps in cursor');
    pass('Invalid and non-finite timestamps strictly rejected before cursor comparison');

    // =========================================================================
    // TEST 15: Malformed Cursor Ordering Values Rejected Without Silent Normalization
    // =========================================================================
    // 15.1 NaN displayOrder
    const test15_1_Batch = [
      createValidShowcaseRow({
        id: 'bad_order_nan',
        displayOrder: NaN,
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        ownerConsent: { isGranted: false }
      })
    ];
    let nanOrderDetected = false;
    try {
      const repo15_1 = new PostgresShowcaseRepository(new CustomBatchMockDB([test15_1_Batch]));
      await repo15_1.findPublishedProjects(10);
    } catch (err: any) {
      nanOrderDetected = true;
      assert(err.message.includes('Malformed cursor displayOrder value'), 'Must reject NaN displayOrder');
    }
    assert(nanOrderDetected, 'Repository must reject NaN displayOrder without silently normalizing to 0');

    // 15.2 Malformed string displayOrder
    const test15_2_Batch = [
      createValidShowcaseRow({
        id: 'bad_order_str',
        displayOrder: 'unparseable_display_order',
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        ownerConsent: { isGranted: false }
      })
    ];
    let strOrderDetected = false;
    try {
      const repo15_2 = new PostgresShowcaseRepository(new CustomBatchMockDB([test15_2_Batch]));
      await repo15_2.findPublishedProjects(10);
    } catch (err: any) {
      strOrderDetected = true;
      assert(err.message.includes('Malformed cursor displayOrder value'), 'Must reject unparseable string displayOrder');
    }
    assert(strOrderDetected, 'Repository must reject unparseable string displayOrder without silently normalizing');

    // 15.3 Empty cursor ID
    const test15_3_Batch = [
      createValidShowcaseRow({
        id: '   ',
        displayOrder: 1,
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        ownerConsent: { isGranted: false }
      })
    ];
    let emptyIdDetected = false;
    try {
      const repo15_3 = new PostgresShowcaseRepository(new CustomBatchMockDB([test15_3_Batch]));
      await repo15_3.findPublishedProjects(10);
    } catch (err: any) {
      emptyIdDetected = true;
      assert(err.message.includes('Malformed cursor id value'), 'Must reject empty cursor id');
    }
    assert(emptyIdDetected, 'Repository must reject empty cursor id');
    pass('Malformed cursor ordering values strictly rejected without silent fallback or normalization');

    // =========================================================================
    // TEST 16: Result Limit Satisfied Returns Without Unnecessary Cursor Construction
    // =========================================================================
    // A batch contains 20 records.
    // The first 10 records are fully eligible.
    // The last record contains an invalid timestamp.
    // The requested result limit is 10.
    // Expected behavior: return exactly the first 10 valid projects without a cursor-validation error.
    const test16Batch: any[] = [];
    for (let i = 1; i <= 10; i++) {
      test16Batch.push(createValidShowcaseRow({
        id: `limit_ok_${String(i).padStart(3, '0')}`,
        displayOrder: 1,
        updatedAt: new Date(1704067200000 - i * 1000), // strictly decreasing
        publicTitle: `Valid Project ${i}`
      }));
    }
    for (let i = 11; i <= 19; i++) {
      test16Batch.push(createValidShowcaseRow({
        id: `filler_${String(i).padStart(3, '0')}`,
        displayOrder: 2,
        updatedAt: new Date(1704067200000 - i * 1000)
      }));
    }
    // Record 20 contains an invalid timestamp
    test16Batch.push(createValidShowcaseRow({
      id: 'bad_last_record',
      displayOrder: 3,
      updatedAt: 'INVALID_TIMESTAMP_ON_LAST_ROW',
      ownerConsent: { isGranted: false }
    }));
    assert.strictEqual(test16Batch.length, 20, 'Batch must contain exactly 20 records');

    const repo16 = new PostgresShowcaseRepository(new CustomBatchMockDB([test16Batch]));
    // 16.1 Request limit 10: Must return exactly the 10 valid projects without cursor-validation error
    const results16 = await repo16.findPublishedProjects(10);
    assert.strictEqual(results16.length, 10, 'Must return exactly 10 projects');
    assert.strictEqual(results16[0].id, 'limit_ok_001');
    assert.strictEqual(results16[9].id, 'limit_ok_010');
    results16.forEach(r => assert(isRecordEligibleForPublicShowcase(r), 'Returned record must be eligible'));

    // 16.2 Contrast: If limit is 20, additional pagination / batch completion is required,
    // so the invalid timestamp on the last row is encountered when extracting cursor and fails closed.
    let cursorErrorDetected = false;
    try {
      const repo16_contrast = new PostgresShowcaseRepository(new CustomBatchMockDB([test16Batch]));
      await repo16_contrast.findPublishedProjects(20);
    } catch (err: any) {
      cursorErrorDetected = true;
      assert(
        err.message.includes('Invalid non-finite cursor timestamp') || err.message.includes('Malformed cursor updatedAt'),
        'Must fail closed with invalid timestamp error when pagination cursor is required'
      );
    }
    assert(cursorErrorDetected, 'When additional pagination is required, invalid cursor timestamp must fail closed');
    pass('Result limit satisfied: returns valid projects without unnecessary cursor validation; fails closed when pagination required');

    // =========================================================================
    // TEST 17: Protective Scan Budget & Exact Boundary Conditions
    // =========================================================================

    // Shared CountControlledMockDB to accurately simulate datasets of exact sizes
    class CountControlledMockDB {
      public queryCount = 0;
      constructor(
        public totalRecords: number,
        public eligibleIndices: Set<number> = new Set()
      ) {}

      select() {
        const self = this;
        return {
          from: () => ({
            where: (cond: any) => ({
              orderBy: () => ({
                limit: (limitCount: number) => {
                  self.queryCount++;

                  // Extract cursor if present
                  function extractParams(chunk: any): any[] {
                    const p: any[] = [];
                    if (!chunk) return p;
                    if (chunk.value !== undefined) p.push(chunk.value);
                    if (Array.isArray(chunk)) chunk.forEach(c => p.push(...extractParams(c)));
                    if (chunk.queryChunks) p.push(...extractParams(chunk.queryChunks));
                    return p;
                  }
                  const params = extractParams(cond);
                  const cursorId = params.find(p => typeof p === 'string' && p.startsWith('rec_'));

                  let startIdx = 1;
                  if (cursorId) {
                    const match = cursorId.match(/^rec_(\d+)$/);
                    if (match) {
                      startIdx = parseInt(match[1], 10) + 1;
                    }
                  }

                  const rows = [];
                  for (let i = startIdx; i <= self.totalRecords && rows.length < limitCount; i++) {
                    const isEligible = self.eligibleIndices.has(i);
                    rows.push(createValidShowcaseRow({
                      id: `rec_${String(i).padStart(6, '0')}`,
                      displayOrder: i, // strictly increasing
                      updatedAt: new Date(1800000000000 - i * 1000), // strictly decreasing
                      ownerConsent: isEligible
                        ? { isGranted: true, consentingPartyName: 'Owner', consentDocumentReferenceId: `DOC-${i}`, consentedAt: '2024-01-01', withdrawnAt: null }
                        : { isGranted: false, consentingPartyName: 'None', consentDocumentReferenceId: 'NONE', consentedAt: '2024-01-01' }
                    }));
                  }

                  return Promise.resolve(rows);
                }
              })
            })
          })
        };
      }
    }

    // 17A: Infinite candidate stream fails closed
    class InfiniteInvalidMockDB {
      public queryCount = 0;
      select() {
        const self = this;
        return {
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: (batchSize: number) => {
                  self.queryCount++;
                  const rows = [];
                  for (let i = 0; i < batchSize; i++) {
                    const rowNum = (self.queryCount - 1) * batchSize + i + 1;
                    rows.push(createValidShowcaseRow({
                      id: `endless_${String(rowNum).padStart(6, '0')}`,
                      displayOrder: rowNum, // strictly increasing
                      updatedAt: new Date(1700000000000 - rowNum * 1000), // strictly decreasing
                      ownerConsent: { isGranted: false, consentingPartyName: 'None', consentDocumentReferenceId: 'NONE', consentedAt: '2024-01-01' }
                    }));
                  }
                  return Promise.resolve(rows);
                }
              })
            })
          })
        };
      }
    }

    const infiniteRepo = new PostgresShowcaseRepository(new InfiniteInvalidMockDB());
    let budgetExceeded = false;
    try {
      await infiniteRepo.findPublishedProjects(10);
    } catch (err: any) {
      budgetExceeded = true;
      assert(err.message.includes('scan budget exceeded'), 'Must throw explicit scan budget error');
    }
    assert(budgetExceeded, 'Repository must fail closed when scan budget is exceeded rather than returning incomplete results');
    pass('17A. Protective scan budget exceeded: fails closed explicitly to protect server resources on infinite stream');

    // 17B: EXACTLY 2,000 published ineligible records
    // Must return an empty array without throwing any error!
    const mockDb2000 = new CountControlledMockDB(2000);
    const repo2000 = new PostgresShowcaseRepository(mockDb2000);
    const results2000 = await repo2000.findPublishedProjects(15);
    assert.strictEqual(Array.isArray(results2000), true, 'Must return an array');
    assert.strictEqual(results2000.length, 0, 'Must return empty array when all 2,000 records are ineligible');
    assert.strictEqual(mockDb2000.queryCount, 101, 'Must execute 100 full batches plus 1 probe query checking if table exhausted');
    pass('17B. Boundary test (exactly 2,000 records): returns empty array cleanly without throwing');

    // 17C: 2,001 published ineligible records
    // Must fail closed and throw an explicit protective budget error!
    const mockDb2001 = new CountControlledMockDB(2001);
    const repo2001 = new PostgresShowcaseRepository(mockDb2001);
    let errorThrown2001 = false;
    try {
      await repo2001.findPublishedProjects(15);
    } catch (err: any) {
      errorThrown2001 = true;
      assert(
        err.message.includes('Showcase candidate scan budget exceeded'),
        `Expected scan budget exceeded error, got: ${err.message}`
      );
    }
    assert(errorThrown2001, 'Must throw explicit scan budget error when candidate dataset exceeds 2,000 records');
    pass('17C. Boundary test (2,001 records): protective scan budget correctly halts and fails closed');

    // 17D: 1,999 published ineligible records
    // Must return an empty array without throwing, terminating on the 100th batch (19 rows < batchSize)
    const mockDb1999 = new CountControlledMockDB(1999);
    const repo1999 = new PostgresShowcaseRepository(mockDb1999);
    const results1999 = await repo1999.findPublishedProjects(15);
    assert.strictEqual(Array.isArray(results1999), true, 'Must return an array');
    assert.strictEqual(results1999.length, 0, 'Must return empty array for 1,999 ineligible records');
    assert.strictEqual(mockDb1999.queryCount, 100, 'Must terminate immediately on batch 100 where rows.length (19) < batchSize');
    pass('17D. Boundary test (1,999 records): returns empty array cleanly on final partial batch');

    // 17E: Early-Termination Cases
    // 17E.1: 2,000 records, first 10 eligible, limit 10 requested
    // Must terminate early on batch 1 (only 1 query executed)
    const eligibleFirst10 = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const mockEarly2000 = new CountControlledMockDB(2000, eligibleFirst10);
    const repoEarly2000 = new PostgresShowcaseRepository(mockEarly2000);
    const resEarly2000 = await repoEarly2000.findPublishedProjects(10);
    assert.strictEqual(resEarly2000.length, 10, 'Must return exactly 10 eligible projects');
    assert.strictEqual(mockEarly2000.queryCount, 1, 'Must early-terminate on batch 1 without additional queries');
    resEarly2000.forEach(r => assert(isRecordEligibleForPublicShowcase(r), 'Returned record must be eligible'));
    pass('17E.1 Early-termination: returns requested limit immediately on batch 1 without unnecessary pagination');

    // 17E.2: 2,001 records, first 10 eligible, limit 10 requested
    // Must terminate early without triggering the scan budget error
    const mockEarly2001 = new CountControlledMockDB(2001, eligibleFirst10);
    const repoEarly2001 = new PostgresShowcaseRepository(mockEarly2001);
    const resEarly2001 = await repoEarly2001.findPublishedProjects(10);
    assert.strictEqual(resEarly2001.length, 10, 'Must return exactly 10 eligible projects');
    assert.strictEqual(mockEarly2001.queryCount, 1, 'Must early-terminate on batch 1 without throwing scan budget error');
    pass('17E.2 Early-termination (2,001 records): returns requested limit early without triggering scan budget');

    // 17E.3: 2,000 records total, 5 eligible records scattered within the 2,000, limit 15 requested
    // SafeLimit (15) is not reached, but dataset is fully exhausted at exactly 2,000.
    // Must return the 5 collected eligible projects without throwing!
    const scattered5 = new Set([100, 200, 300, 400, 500]);
    const mockPartial2000 = new CountControlledMockDB(2000, scattered5);
    const repoPartial2000 = new PostgresShowcaseRepository(mockPartial2000);
    const resPartial2000 = await repoPartial2000.findPublishedProjects(15);
    assert.strictEqual(resPartial2000.length, 5, 'Must return all 5 eligible projects from exhausted 2,000 dataset');
    assert.strictEqual(mockPartial2000.queryCount, 101, 'Must evaluate entire dataset through probe query at boundary');
    pass('17E.3 Exhausted dataset at boundary (2,000 records, 5 valid): returns gathered valid projects without error');

    // 17E.4: 2,001 records total, 5 eligible records within first 2,000, limit 15 requested
    // SafeLimit (15) is not reached, scan budget reached, AND candidate 2,001 remains.
    // Must fail closed and throw scan budget error rather than returning incomplete partial result!
    const mockPartial2001 = new CountControlledMockDB(2001, scattered5);
    const repoPartial2001 = new PostgresShowcaseRepository(mockPartial2001);
    let errorPartial2001 = false;
    try {
      await repoPartial2001.findPublishedProjects(15);
    } catch (err: any) {
      errorPartial2001 = true;
      assert(err.message.includes('Showcase candidate scan budget exceeded'), 'Must throw scan budget exceeded error');
    }
    assert(errorPartial2001, 'Must fail closed when candidates remain beyond budget instead of returning incomplete result');
    pass('17E.4 Incomplete result guard (2,001 records, 5 valid): fails closed when more candidates remain beyond budget');

    // =========================================================================
    // TEST 18: ACTUAL PARITY BETWEEN JSONShowcaseRepository AND PostgresShowcaseRepository
    // =========================================================================
    // Both repositories are executed against identical datasets using isolated temporary storage
    const parityDataset = [
      createValidShowcaseRow({ id: 'par_01', displayOrder: 2, updatedAt: new Date('2024-01-01T00:00:00Z') }),
      createValidShowcaseRow({ id: 'par_02', displayOrder: 1, updatedAt: new Date('2024-01-02T00:00:00Z') }),
      createValidShowcaseRow({ id: 'par_03', displayOrder: 1, updatedAt: new Date('2024-01-03T00:00:00Z') }), // Higher updatedAt
      createValidShowcaseRow({ id: 'par_withdrawn', displayOrder: 1, ownerConsent: { isGranted: true, consentingPartyName: 'X', consentDocumentReferenceId: 'D', consentedAt: '2024-01-01', withdrawnAt: '2024-01-02' } }),
      createValidShowcaseRow({ id: 'par_no_consent', displayOrder: 1, ownerConsent: { isGranted: false } }),
      createValidShowcaseRow({ id: 'par_invalid_ev', displayOrder: 1, technicalEvidence: { isValid: false } }),
      createValidShowcaseRow({ id: 'par_invalid_loc', displayOrder: 1, location: { province: '', city: '' } }),
      createValidShowcaseRow({ id: 'par_04', displayOrder: 2, updatedAt: new Date('2024-01-05T00:00:00Z') }),
      createValidShowcaseRow({ id: 'par_05', displayOrder: 3, updatedAt: new Date('2024-01-01T00:00:00Z') })
    ];

    // Inject into isolated temporary DB for JSONShowcaseRepository
    const isolatedDbState = JSON.parse(fs.readFileSync(isolation.tempDbPath, 'utf8'));
    isolatedDbState.showcaseProjects = parityDataset.map(r => ({
      ...r,
      updatedAt: r.updatedAt.toISOString(),
      createdAt: r.createdAt.toISOString()
    }));
    fs.writeFileSync(isolation.tempDbPath, JSON.stringify(isolatedDbState, null, 2));

    const jsonRepo = new JSONShowcaseRepository();
    const pgMockDb = new MockDrizzleDB(parityDataset);
    const pgRepo = new PostgresShowcaseRepository(pgMockDb);

    // Execute both at limit 3
    const jsonRes3 = await jsonRepo.findPublishedProjects(3);
    const pgRes3 = await pgRepo.findPublishedProjects(3);
    assert.deepStrictEqual(
      pgRes3.map(r => r.id),
      jsonRes3.map(r => r.id),
      'PostgreSQL and JSON repositories must produce identical output at limit 3'
    );

    // Execute both at limit 10
    const jsonRes10 = await jsonRepo.findPublishedProjects(10);
    const pgRes10 = await pgRepo.findPublishedProjects(10);
    assert.deepStrictEqual(
      pgRes10.map(r => r.id),
      jsonRes10.map(r => r.id),
      'PostgreSQL and JSON repositories must produce identical output at limit 10'
    );
    assert.deepStrictEqual(
      pgRes10.map(r => r.publicTitle),
      jsonRes10.map(r => r.publicTitle),
      'PostgreSQL and JSON repositories must produce identical titles'
    );

    // Empty dataset parity
    isolatedDbState.showcaseProjects = [];
    fs.writeFileSync(isolation.tempDbPath, JSON.stringify(isolatedDbState, null, 2));
    const emptyPgMock = new MockDrizzleDB([]);
    const emptyPgRepo = new PostgresShowcaseRepository(emptyPgMock);

    const jsonEmpty = await jsonRepo.findPublishedProjects(10);
    const pgEmpty = await emptyPgRepo.findPublishedProjects(10);
    assert.deepStrictEqual(pgEmpty, [], 'Postgres empty result must be empty array');
    assert.deepStrictEqual(jsonEmpty, [], 'JSON empty result must be empty array');
    assert.deepStrictEqual(pgEmpty, jsonEmpty, 'Both repositories must return empty array on empty dataset');

    pass('Actual parity confirmed: JSONShowcaseRepository and PostgresShowcaseRepository produce 100% identical results on equivalent datasets');

    // =========================================================================
    // TEST 19: Public DTO Projection Leakage Guard
    // =========================================================================
    const test15Row = createValidShowcaseRow({
      id: 'privacy_proj_999',
      internalProjectRefId: 'CONFIDENTIAL_INTERNAL_PROJ_999',
      internalAssetRefId: 'CONFIDENTIAL_INTERNAL_ASSET_888',
      createdByUserId: 'usr_secret_agent',
      reviewedByUserId: 'usr_compliance_officer',
      ownerConsent: {
        isGranted: true,
        consentingPartyName: 'آقای علی حسینی — محرمانه',
        consentDocumentReferenceId: 'LEGAL-CONTRACT-DOC-777',
        consentedAt: '2024-01-01T00:00:00Z',
        withdrawnAt: null
      },
      technicalEvidence: {
        evidenceType: 'SATBA_PPA',
        documentReferenceId: 'CONFIDENTIAL-SATBA-PPA-999',
        verifiedAt: '2024-01-02T00:00:00Z',
        verifiedBy: 'مهندس ناظر ارشد',
        isValid: true
      }
    });

    const mockDb15 = new MockDrizzleDB([test15Row]);
    const repo15 = new PostgresShowcaseRepository(mockDb15);
    const records15 = await repo15.findPublishedProjects(5);
    assert.strictEqual(records15.length, 1);

    const publicDto = toPublicShowcaseDTO(records15[0]);
    const dtoKeys = Object.keys(publicDto);

    // Verify absence of sensitive internal references
    assert(!dtoKeys.includes('internalProjectRefId'), 'internalProjectRefId must NOT exist in public DTO');
    assert(!dtoKeys.includes('internalAssetRefId'), 'internalAssetRefId must NOT exist in public DTO');
    assert(!dtoKeys.includes('ownerConsent'), 'ownerConsent must NOT exist in public DTO');
    assert(!dtoKeys.includes('technicalEvidence'), 'technicalEvidence must NOT exist in public DTO');
    assert(!dtoKeys.includes('createdByUserId'), 'createdByUserId must NOT exist in public DTO');
    assert(!dtoKeys.includes('reviewedByUserId'), 'reviewedByUserId must NOT exist in public DTO');

    const jsonStr = JSON.stringify(publicDto);
    assert(!jsonStr.includes('CONFIDENTIAL'), 'DTO serialization must not contain internal reference identifiers');
    assert(!jsonStr.includes('علی حسینی'), 'DTO serialization must not leak consenting party name');
    assert(!jsonStr.includes('LEGAL-CONTRACT'), 'DTO serialization must not leak consent document reference');
    pass('Privacy projection guard: zero leakage of internal IDs, customer identities, or consent contracts');

    // =========================================================================
    // TEST 20: Canonical db.json Immutability Guard
    // =========================================================================
    isolation.verifyImmutability();
    const finalHash = crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_DB_PATH)).digest('hex');
    assert.strictEqual(finalHash, EXPECTED_DB_HASH, 'Canonical db.json was mutated during test execution!');
    pass('Immutability Guard: canonical db.json verified byte-for-byte identical (SHA-256 match)');

    console.log(`\n=== STAGE D.2 FINAL VALIDATION TESTS: ALL ${testCount} / ${testCount} PASSED ===`);
  } finally {
    isolation.cleanup();
  }
}

runAllTests().catch(err => {
  console.error('\n[FAIL] STAGE D.2 FINAL VALIDATION TEST SUITE ERROR:\n', err);
  process.exit(1);
});
