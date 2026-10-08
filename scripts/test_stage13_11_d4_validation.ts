/**
 * Deterministic Test Suite for Stage 13.11-D.4:
 * Final Trust Copy & Strict API Query Validation Integration Tests
 */

import { strict as assert } from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from '../src/db/index.js';

// Baseline SHA256 checksums from verified baseline 7b9b67ceea23d26aea91df8f5a4f1b90a2de03d6
const PROTECTED_BASELINE_HASHES: Record<string, string> = {
  'db.json': '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f',
  'package.json': '90486ca155c8ea72b179c001d32af8c2eac08259837a1817520326b9194379cc',
  'bun.lock': '79ef5b3a7ccbd526c213eac475e3485120c6823b5f71980721b972f5e4bf5386',
  'src/types/maintenance.ts': '3b7702bd6e55fdf7a0fe6d8a3c067a2c0920580f4b0706a8b0c0392dc6ac9c22'
};

function calculateFileSha256(filePath: string): string {
  const fullPath = path.resolve(filePath);
  const fileBuffer = fs.readFileSync(fullPath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function runStage13_11_D4_Tests() {
  console.log('=== STARTING STAGE 13.11-D.4 TRUST COPY & STRICT QUERY VALIDATION TESTS ===\n');

  // =========================================================================
  // TEST 1: Protected Files Bit-for-Bit Hash Integrity
  // =========================================================================
  console.log('Test 1: Verifying protected files SHA256 against baseline 7b9b67c...');
  for (const [relativePath, expectedHash] of Object.entries(PROTECTED_BASELINE_HASHES)) {
    const actualHash = calculateFileSha256(relativePath);
    assert.strictEqual(
      actualHash,
      expectedHash,
      `Protected file ${relativePath} has been modified! Expected ${expectedHash}, got ${actualHash}`
    );
    console.log(`  ✓ ${relativePath}: ${actualHash.substring(0, 16)}... (VERIFIED UNCHANGED)`);
  }

  // =========================================================================
  // TEST 2: Trust Copy Inspection in GeneratorSupplierDiscovery.tsx
  // =========================================================================
  console.log('\nTest 2: Verifying trust copy in GeneratorSupplierDiscovery.tsx...');
  const uiFileContent = fs.readFileSync(path.resolve('src/components/generator/GeneratorSupplierDiscovery.tsx'), 'utf-8');

  // Must not claim identity verification
  assert.strictEqual(
    uiFileContent.includes('تأیید هویت'),
    false,
    'UI MUST NOT claim "تأیید هویت" (identity-verified) without KYC/document backing'
  );
  assert.strictEqual(
    uiFileContent.includes('فروشگاه‌های تأیید هویت شده'),
    false,
    'UI MUST NOT contain "فروشگاه‌های تأیید هویت شده"'
  );
  assert.strictEqual(
    uiFileContent.includes('فروشگاه تأیید هویت شده'),
    false,
    'UI MUST NOT contain "فروشگاه تأیید هویت شده"'
  );

  // Must contain accurate system-approved terminology
  assert(
    uiFileContent.includes('فروشندگان تأییدشده در سامانه'),
    'Header must state "فروشندگان تأییدشده در سامانه"'
  );
  assert(
    uiFileContent.includes('فروشنده تأییدشده در سامانه'),
    'Badge must state "فروشنده تأییدشده در سامانه"'
  );
  console.log('  ✓ UI trust copy strictly uses "فروشنده تأییدشده در سامانه" and zero misleading identity verification claims');

  // =========================================================================
  // TEST 3: Strict Validation: Invalid kw and kva Rejected with HTTP 400
  // =========================================================================
  console.log('\nTest 3: Testing HTTP 400 rejection of invalid kw/kva...');
  const invalidNumericCases = [
    { query: 'kw=abc', desc: 'string abc' },
    { query: 'kw=10abc', desc: 'partial numeric string 10abc (must reject parseFloat partial match)' },
    { query: 'kw=0', desc: 'zero kw' },
    { query: 'kw=-5', desc: 'negative kw' },
    { query: 'kw=NaN', desc: 'literal NaN' },
    { query: 'kw=Infinity', desc: 'Infinity' },
    { query: 'kva=xyz', desc: 'string xyz for kva' },
    { query: 'kva=-12.5', desc: 'negative kva' },
    { query: 'kva=0', desc: 'zero kva' }
  ];

  for (const tc of invalidNumericCases) {
    const res = await fetch(`http://localhost:3000/api/vendors/generator-discovery?${tc.query}`);
    assert.strictEqual(res.status, 400, `Expected 400 for ${tc.desc}, got ${res.status}`);
    const json: any = await res.json();
    assert(json.error, `Response must contain error object for ${tc.desc}`);
    assert(Array.isArray(json.validationErrors), `Response must contain validationErrors array for ${tc.desc}`);
    console.log(`  ✓ Successfully rejected ${tc.desc} with HTTP 400`);
  }

  // =========================================================================
  // TEST 4: Strict Validation: Invalid Phase Rejected with HTTP 400
  // =========================================================================
  console.log('\nTest 4: Testing HTTP 400 rejection of invalid phase...');
  const invalidPhaseCases = ['TWO_PHASE', '4', 'INVALID_PHASE', 'MULTI_PHASE'];
  for (const p of invalidPhaseCases) {
    const res = await fetch(`http://localhost:3000/api/vendors/generator-discovery?phase=${p}`);
    assert.strictEqual(res.status, 400, `Expected 400 for phase=${p}, got ${res.status}`);
    const json: any = await res.json();
    assert(json.validationErrors.some((e: any) => e.field === 'phase'), `Error must mention phase for phase=${p}`);
    console.log(`  ✓ Successfully rejected phase=${p} with HTTP 400`);
  }

  // =========================================================================
  // TEST 5: Strict Validation: Invalid FuelType Rejected with HTTP 400
  // =========================================================================
  console.log('\nTest 5: Testing HTTP 400 rejection of invalid fuelType...');
  const invalidFuelCases = ['NUCLEAR', 'SOLAR', 'HYDROGEN', 'WATER', 'UNKNOWN_FUEL'];
  for (const f of invalidFuelCases) {
    const res = await fetch(`http://localhost:3000/api/vendors/generator-discovery?fuelType=${f}`);
    assert.strictEqual(res.status, 400, `Expected 400 for fuelType=${f}, got ${res.status}`);
    const json: any = await res.json();
    assert(json.validationErrors.some((e: any) => e.field === 'fuelType'), `Error must mention fuelType for fuelType=${f}`);
    console.log(`  ✓ Successfully rejected fuelType=${f} with HTTP 400`);
  }

  // =========================================================================
  // TEST 6: Strict Validation: Excessive City/Province String Length Rejected with HTTP 400
  // =========================================================================
  console.log('\nTest 6: Testing HTTP 400 rejection of oversized city/province...');
  const longStr = 'A'.repeat(80);
  const cityRes = await fetch(`http://localhost:3000/api/vendors/generator-discovery?city=${longStr}`);
  assert.strictEqual(cityRes.status, 400, 'Expected 400 for oversized city');
  const cityJson: any = await cityRes.json();
  assert(cityJson.validationErrors.some((e: any) => e.field === 'city'));

  const provRes = await fetch(`http://localhost:3000/api/vendors/generator-discovery?province=${longStr}`);
  assert.strictEqual(provRes.status, 400, 'Expected 400 for oversized province');
  const provJson: any = await provRes.json();
  assert(provJson.validationErrors.some((e: any) => e.field === 'province'));
  console.log('  ✓ Successfully rejected oversized string parameters with HTTP 400');

  // =========================================================================
  // TEST 7: Valid Queries Succeed with HTTP 200 & Correct Result Structure
  // =========================================================================
  console.log('\nTest 7: Testing HTTP 200 acceptance for valid query parameter sets...');
  const validQueries = [
    '',
    'kw=10',
    'kw=10.5&kva=13.125',
    'phase=SINGLE_PHASE',
    'phase=THREE_PHASE',
    'phase=1',
    'phase=3',
    'phase=UNKNOWN',
    'fuelType=DIESEL',
    'fuelType=GASOLINE',
    'fuelType=NATURAL_GAS',
    'fuelType=DUAL_FUEL',
    'province=%D8%AA%D9%87%D8%B1%D8%A7%D9%86',
    'city=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&kw=15&phase=THREE_PHASE&fuelType=DIESEL'
  ];

  for (const q of validQueries) {
    const url = `http://localhost:3000/api/vendors/generator-discovery${q ? `?${q}` : ''}`;
    const res = await fetch(url);
    assert.strictEqual(res.status, 200, `Expected 200 for valid query "${q}", got ${res.status}`);
    const data: any = await res.json();
    assert(data.suppliers !== undefined, 'Response must have suppliers');
    assert(data.totalSuppliersCount >= 0, 'Response must have totalSuppliersCount');
  }
  console.log('  ✓ All valid query combinations returned HTTP 200 with structured response');

  // =========================================================================
  // TEST 8: Endpoint Ordering & Not-Found Precedence
  // =========================================================================
  console.log('\nTest 8: Verifying endpoint ordering before /api/vendors/:id...');
  const discoveryRes = await fetch('http://localhost:3000/api/vendors/generator-discovery');
  assert.strictEqual(discoveryRes.status, 200);

  const nonExistentRes = await fetch('http://localhost:3000/api/vendors/non-existent-vendor-id-12345');
  assert.strictEqual(nonExistentRes.status, 404);
  const nonExistentJson: any = await nonExistentRes.json();
  assert.strictEqual(nonExistentJson.error, 'فروشگاه یافت نشد.');
  console.log('  ✓ Route ordering verified: generator-discovery handled before :id wildcard');

  // =========================================================================
  // TEST 9: Grounded Vendor Eligibility (vendor_001 only, status: approved)
  // =========================================================================
  console.log('\nTest 9: Verifying strict server-side eligibility against database...');
  const resDiscovery = await fetch('http://localhost:3000/api/vendors/generator-discovery');
  const discData: any = await resDiscovery.json();
  const dbVendors = db.getVendors() || [];
  const approvedDbVendors = dbVendors.filter((v: any) => v && v.status === 'approved');

  assert.strictEqual(
    discData.totalSuppliersCount,
    approvedDbVendors.length,
    'totalSuppliersCount must equal approved vendors in DB'
  );
  // All returned suppliers must have verified: true (i.e. status: approved)
  for (const s of discData.suppliers) {
    assert.strictEqual(s.verified, true, 'Every returned supplier must have verified: true');
    const dbMatch = dbVendors.find((v: any) => v.id === s.id);
    assert.strictEqual(dbMatch?.status, 'approved', 'Every returned supplier must be approved in DB');
  }
  console.log('  ✓ Server-side vendor approval policy confirmed; no unapproved or non-existent vendors returned');

  console.log('\n=== ALL STAGE 13.11-D.4 DETERMINISTIC TESTS PASSED SUCCESSFULLY ===');
}

runStage13_11_D4_Tests().catch(err => {
  console.error('\n❌ STAGE 13.11-D.4 TEST FAILED:', err);
  process.exit(1);
});
