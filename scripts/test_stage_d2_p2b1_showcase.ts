/**
 * Stage D.2-P2B-1: Showcase Data Foundation & Public Read API Test Suite
 *
 * Verifies:
 * - Empty database behavior
 * - Legacy database handling (missing showcaseProjects key)
 * - Malformed collection handling (fail-closed)
 * - Publication eligibility state machine (Draft, Pending, Rejected, Unpublished, Consent withdrawn, Invalid evidence)
 * - Safe published project inclusion and display ordering
 * - Explicit allowlist projection and zero leakage of private fields
 * - Live HTTP endpoint behavior, response headers (Cache-Control: no-store), and serialized JSON
 * - Production environment safety invariants (no unsafe fallback to JSON)
 * - Immutability Guard for canonical db.json
 */

import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { db, setDBPath, getDBPath, validateDBStructure } from '../src/db/index.js';
import {
  ShowcaseProjectRecord,
  isRecordEligibleForPublicShowcase,
  toPublicShowcaseDTO
} from '../src/types/showcase.js';
import { showcaseRepository } from '../src/repositories/showcaseRepository.js';
import { validateEnvironment } from '../src/config/environment.js';

console.log('=== STARTING STAGE D.2-P2B-1 SHOWCASE BACKEND TESTS ===\n');

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
  const originalDbPath = getDBPath();
  const tmpDir = os.tmpdir();
  const testDbPath = path.join(tmpDir, `test_showcase_p2b1_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`);

  try {
    // =========================================================================
    // TEST 1: Legacy Database Handling (Missing showcaseProjects collection)
    // =========================================================================
    // Create an isolated legacy db file lacking showcaseProjects key
    const legacyData = {
      solarAssets: [],
      assetDocuments: [],
      assetAuditLogs: [],
      users: [],
      otps: [],
      professionals: [],
      ads: [],
      analysisHistory: [],
      transactions: [],
      subscriptions: [],
      cityIrradianceCache: [],
      subscriptionPlans: []
    };
    fs.writeFileSync(testDbPath, JSON.stringify(legacyData, null, 2), 'utf-8');
    setDBPath(testDbPath);

    const legacyProjects = db.getShowcaseProjects();
    assert(Array.isArray(legacyProjects), 'Legacy DB must safely return an array');
    assert.strictEqual(legacyProjects.length, 0, 'Legacy DB must default to empty collection in memory');
    pass('Legacy database without showcase collection defaults safely to empty array');

    // =========================================================================
    // TEST 2: Malformed Showcase Collection Fails Closed
    // =========================================================================
    const malformedData = {
      ...legacyData,
      showcaseProjects: "THIS_IS_CORRUPTED_STRING_NOT_ARRAY"
    };
    assert.throws(
      () => validateDBStructure(malformedData),
      /Collection 'showcaseProjects' must be an Array/,
      'Malformed showcase collection must fail closed via validateDBStructure'
    );

    const malformedRecordData = {
      ...legacyData,
      showcaseProjects: [null, "not-an-object", 123]
    };
    assert.throws(
      () => validateDBStructure(malformedRecordData),
      /Record at index 0 in collection 'showcaseProjects' must be an object/,
      'Collection with invalid non-object records must fail closed'
    );
    pass('Malformed showcase collections and corrupted records fail closed');

    // =========================================================================
    // TEST 3: Publication Eligibility Rules (Fail-Closed State Machine)
    // =========================================================================
    const baselineValidRecord: ShowcaseProjectRecord = {
      id: 'showcase_rec_001',
      internalProjectRefId: 'proj_priv_secret_123',
      internalAssetRefId: 'asset_priv_secret_456',
      publicTitle: 'نیروگاه خورشیدی یک مگاواتی سمنان',
      location: {
        province: 'سمنان',
        city: 'سمنان'
      },
      installedCapacityKw: 1000,
      operationalStatus: 'OPERATIONAL',
      statusLabel: 'بهره‌برداری تجاری',
      commissioningDate: '۱۴۰۲',
      measuredProduction: {
        value: 1750,
        unit: 'MWh',
        period: 'سال مالی ۱۴۰۲',
        source: 'کنتور رسمی تبادل توانیر'
      },
      timeSeriesData: [
        { label: 'فروردین', value: 140 },
        { label: 'اردیبهشت', value: 160 }
      ],
      publicImageUrl: null,
      connectionDescription: 'اتصال به شبکه فوق توزیع ۶۳ کیلوولت',
      ownerConsent: {
        isGranted: true,
        consentingPartyName: 'شرکت سرمایه‌گذاری تابان انرژی',
        consentDocumentReferenceId: 'doc_consent_priv_789',
        consentedAt: '2024-01-15T10:00:00.000Z',
        withdrawnAt: null
      },
      technicalEvidence: {
        evidenceType: 'COMMISSIONING_REPORT',
        documentReferenceId: 'doc_commissioning_priv_999',
        verifiedAt: '2024-01-16T11:00:00.000Z',
        verifiedBy: 'admin_technical_auditor_01',
        isValid: true
      },
      publicationStatus: 'PUBLISHED',
      displayOrder: 1,
      rejectionReason: null,
      unpublishReason: null,
      version: 1,
      createdByUserId: 'usr_admin_001',
      reviewedByUserId: 'usr_admin_reviewer_002',
      reviewedAt: '2024-01-16T12:00:00.000Z',
      publishedByUserId: 'usr_admin_publisher_003',
      publishedAt: '2024-01-16T12:30:00.000Z',
      createdAt: '2024-01-15T09:00:00.000Z',
      updatedAt: '2024-01-16T12:30:00.000Z'
    };

    // 3a. Baseline record is eligible
    assert.strictEqual(isRecordEligibleForPublicShowcase(baselineValidRecord), true, 'Valid published record must be eligible');

    // 3b. Unpublished statuses must be rejected
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, publicationStatus: 'DRAFT' }), false, 'DRAFT status must be rejected');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, publicationStatus: 'PENDING_REVIEW' }), false, 'PENDING_REVIEW status must be rejected');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, publicationStatus: 'APPROVED' }), false, 'APPROVED (not yet published) must be rejected');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, publicationStatus: 'REJECTED' }), false, 'REJECTED status must be rejected');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, publicationStatus: 'UNPUBLISHED' }), false, 'UNPUBLISHED status must be rejected');
    pass('Publication State Machine: Only strictly PUBLISHED records are eligible');

    // 3c. Consent checks
    assert.strictEqual(isRecordEligibleForPublicShowcase({
      ...baselineValidRecord,
      ownerConsent: { ...baselineValidRecord.ownerConsent, isGranted: false }
    }), false, 'Record without owner consent must be rejected');

    assert.strictEqual(isRecordEligibleForPublicShowcase({
      ...baselineValidRecord,
      ownerConsent: { ...baselineValidRecord.ownerConsent, withdrawnAt: '2024-05-01T00:00:00.000Z' }
    }), false, 'Record with withdrawn owner consent must be immediately rejected');

    assert.strictEqual(isRecordEligibleForPublicShowcase({
      ...baselineValidRecord,
      ownerConsent: { ...baselineValidRecord.ownerConsent, consentingPartyName: '' }
    }), false, 'Record without consenting party name must be rejected');
    pass('Consent Invariant: Missing, false, or withdrawn consent strictly rejects publication');

    // 3d. Technical verification evidence checks
    assert.strictEqual(isRecordEligibleForPublicShowcase({
      ...baselineValidRecord,
      technicalEvidence: { ...baselineValidRecord.technicalEvidence, isValid: false }
    }), false, 'Record with invalid technical evidence must be rejected');

    assert.strictEqual(isRecordEligibleForPublicShowcase({
      ...baselineValidRecord,
      technicalEvidence: { ...baselineValidRecord.technicalEvidence, documentReferenceId: '' }
    }), false, 'Record lacking evidence document reference must be rejected');
    pass('Technical Evidence Invariant: Unverified or missing evidence rejects publication');

    // 3e. Invalid technical values
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, installedCapacityKw: 0 }), false, 'Zero capacity must fail');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, installedCapacityKw: -100 }), false, 'Negative capacity must fail');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, installedCapacityKw: NaN }), false, 'NaN capacity must fail');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, publicTitle: '' }), false, 'Empty title must fail');
    assert.strictEqual(isRecordEligibleForPublicShowcase({ ...baselineValidRecord, operationalStatus: 'DECOMMISSIONED' as any }), false, 'Invalid status must fail');
    pass('Data Integrity: Non-finite, non-positive or invalid technical values fail validation');

    // =========================================================================
    // TEST 4: Projection Allowlist & Zero Leakage of Private Fields
    // =========================================================================
    const publicDTO = toPublicShowcaseDTO(baselineValidRecord);

    // Assert allowlisted fields exist
    assert.strictEqual(publicDTO.id, 'showcase_rec_001');
    assert.strictEqual(publicDTO.title, 'نیروگاه خورشیدی یک مگاواتی سمنان');
    assert.strictEqual(publicDTO.location, 'سمنان');
    assert.strictEqual(publicDTO.capacityKw, 1000);
    assert.strictEqual(publicDTO.status, 'OPERATIONAL');
    assert.strictEqual(publicDTO.statusLabel, 'بهره‌برداری تجاری');
    assert.strictEqual(publicDTO.commissioningDate, '۱۴۰۲');
    assert.strictEqual(publicDTO.measuredProduction?.value, 1750);
    assert.strictEqual(publicDTO.connectionDescription, 'اتصال به شبکه فوق توزیع ۶۳ کیلوولت');

    // Assert private fields are strictly excluded
    const serializedDTO = JSON.stringify(publicDTO);
    const privateTokens = [
      'proj_priv_secret_123',
      'asset_priv_secret_456',
      'internalProjectRefId',
      'internalAssetRefId',
      'ownerConsent',
      'consentingPartyName',
      'doc_consent_priv_789',
      'technicalEvidence',
      'doc_commissioning_priv_999',
      'admin_technical_auditor_01',
      'usr_admin_001',
      'usr_admin_reviewer_002',
      'usr_admin_publisher_003',
      'createdByUserId',
      'reviewedByUserId',
      'publishedByUserId',
      'version',
      'rejectionReason'
    ];

    for (const token of privateTokens) {
      assert(
        !serializedDTO.includes(token),
        `SECURITY VIOLATION: Private token "${token}" was detected in serialized public DTO!`
      );
    }
    pass('Privacy Invariant: Zero leakage of private references, user IDs, or consent documents in DTO');

    // =========================================================================
    // TEST 5: Repository Filtering and Display Ordering
    // =========================================================================
    const recordOrder2: ShowcaseProjectRecord = {
      ...baselineValidRecord,
      id: 'showcase_rec_002',
      publicTitle: 'نیروگاه ۵۰۰ کیلوواتی کاشان',
      displayOrder: 2,
      updatedAt: '2024-01-16T12:00:00.000Z'
    };
    const recordOrder1: ShowcaseProjectRecord = {
      ...baselineValidRecord,
      id: 'showcase_rec_003',
      publicTitle: 'نیروگاه ۲۰۰ کیلوواتی یزد',
      displayOrder: 1,
      updatedAt: '2024-01-17T12:00:00.000Z'
    };
    const recordDraft: ShowcaseProjectRecord = {
      ...baselineValidRecord,
      id: 'showcase_rec_004',
      publicTitle: 'پروژه پیش‌نویس غیرمجاز',
      publicationStatus: 'DRAFT',
      displayOrder: 0
    };

    const multiDbData = {
      ...legacyData,
      showcaseProjects: [recordOrder2, recordDraft, recordOrder1]
    };
    fs.writeFileSync(testDbPath, JSON.stringify(multiDbData, null, 2), 'utf-8');

    const publishedRecords = await showcaseRepository.findPublishedProjects();
    assert.strictEqual(publishedRecords.length, 2, 'Only 2 published records must be returned (draft excluded)');
    assert.strictEqual(publishedRecords[0].id, 'showcase_rec_003', 'Item with displayOrder 1 must be first');
    assert.strictEqual(publishedRecords[1].id, 'showcase_rec_002', 'Item with displayOrder 2 must be second');
    pass('Showcase Repository: Fail-closed filtering and consistent displayOrder sorting verified');

    // =========================================================================
    // TEST 6: Live HTTP Endpoint Verification (GET /api/public/showcase-projects)
    // =========================================================================
    // Revert back to canonical path for live endpoint test
    setDBPath(CANONICAL_DB_PATH);

    const httpRes = await fetch('http://localhost:3000/api/public/showcase-projects');
    assert.strictEqual(httpRes.status, 200, `Live endpoint returned HTTP ${httpRes.status}`);

    // Verify Cache-Control header is strictly no-store
    const cacheHeader = httpRes.headers.get('cache-control');
    assert(cacheHeader && cacheHeader.includes('no-store'), 'Endpoint must enforce Cache-Control: no-store');
    const pragmaHeader = httpRes.headers.get('pragma');
    assert(pragmaHeader && pragmaHeader.includes('no-cache'), 'Endpoint must enforce Pragma: no-cache');

    const httpBody: any = await httpRes.json();
    assert.strictEqual(httpBody.success, true, 'Response must have success: true');
    assert(Array.isArray(httpBody.data), 'Response data must be an array');
    assert(typeof httpBody.meta === 'object', 'Response meta must be an object');
    assert(typeof httpBody.meta.count === 'number', 'Response meta.count must be a number');
    assert(typeof httpBody.meta.timestamp === 'string', 'Response meta.timestamp must be an ISO string');
    pass('Live HTTP Endpoint: HTTP 200, Cache-Control: no-store, and valid JSON structure confirmed');

    // =========================================================================
    // TEST 7: Production Environment Safety (No unsafe silent fallback to JSON)
    // =========================================================================
    const prodReportWithoutDb = validateEnvironment({
      NODE_ENV: 'production',
      DATABASE_URL: ''
    });
    assert.strictEqual(prodReportWithoutDb.isValid, false, 'Production without DATABASE_URL must be invalid');
    assert(
      prodReportWithoutDb.errors.some(e => e.includes('DATABASE_URL is missing in production mode')),
      'Production mode must explicitly error on missing DATABASE_URL'
    );
    pass('Production Invariant: Silent fallback to JSON storage is strictly prohibited in production');

  } finally {
    // Restore original DB path and cleanup temp file
    setDBPath(originalDbPath);
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
  }

  // =========================================================================
  // TEST 8: Canonical db.json Hash Integrity Guard
  // =========================================================================
  const finalHash = crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_DB_PATH)).digest('hex');
  assert.strictEqual(finalHash, EXPECTED_DB_HASH, 'db.json was altered during test execution!');
  pass('Immutability Guard: db.json verified 100% byte-for-byte identical (SHA-256 match)');
}

runTests()
  .then(() => {
    console.log(`\n=== STAGE D.2-P2B-1 ALL ${testCount} / ${testCount} TESTS PASSED ===`);
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error('\nTest failure:', err);
    process.exit(1);
  });
