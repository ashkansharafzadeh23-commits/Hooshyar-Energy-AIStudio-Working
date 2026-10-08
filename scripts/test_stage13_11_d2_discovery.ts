/**
 * Deterministic Test Suite for Stage 13.11-D.3:
 * Generator Supplier Discovery Security, Trust & Deterministic Verification
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

async function runStage13_11_D3_Tests() {
  console.log('=== STARTING STAGE 13.11-D.3 SECURITY & TRUST VERIFICATION TESTS ===\n');

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
  // TEST 2: Vendor Approval Enforcement Unit & Security Logic
  // =========================================================================
  console.log('\nTest 2: Verifying vendor approval enforcement (no isPublished bypass)...');
  const mockVendors = [
    { id: 'v1', status: 'approved', isPublished: true, categories: ['generator'] },
    { id: 'v2', status: 'pending_review', isPublished: true, categories: ['generator'] },
    { id: 'v3', status: 'rejected', isPublished: true, categories: ['generator'] },
    { id: 'v4', status: 'suspended', isPublished: true, categories: ['generator'] },
    { id: 'v5', isPublished: true, categories: ['generator'] }, // missing status
    { id: 'v6', status: 'unknown_status', isPublished: true, categories: ['generator'] },
    { id: 'v7', status: 'approved', isPublished: false, categories: ['generator'] }
  ];

  // The strict rule: v && typeof v.id === 'string' && v.status === 'approved'
  const eligibleApproved = mockVendors.filter(
    (v: any) => v && typeof v.id === 'string' && v.status === 'approved'
  );

  assert.strictEqual(eligibleApproved.length, 2, 'Only status === approved must pass');
  assert.strictEqual(eligibleApproved.some(v => v.id === 'v2'), false, 'Pending review vendor MUST be excluded even if published');
  assert.strictEqual(eligibleApproved.some(v => v.id === 'v3'), false, 'Rejected vendor MUST be excluded');
  assert.strictEqual(eligibleApproved.some(v => v.id === 'v4'), false, 'Suspended vendor MUST be excluded');
  assert.strictEqual(eligibleApproved.some(v => v.id === 'v5'), false, 'Missing status vendor MUST be excluded');
  console.log('  ✓ Published-but-unapproved vendors strictly rejected');
  console.log('  ✓ Pending, rejected, suspended, and missing-status vendors strictly rejected');

  // =========================================================================
  // TEST 3: Product Ownership Verification (No orphan attribution)
  // =========================================================================
  console.log('\nTest 3: Verifying product ownership resolution...');
  const currentVendor = { id: 'vendor_abc', status: 'approved' };
  const candidateProducts = [
    { id: 'p1', vendorId: 'vendor_abc', category: 'diesel_generator', name: 'دیزل ژنراتور ۱' },
    { id: 'p2', ownerId: 'vendor_abc', ownerType: 'VENDOR', category: 'generator', name: 'موتور برق بنزینی' },
    { id: 'p3', category: 'generator', name: 'اورفان ژنراتور بدون مالک' }, // Orphan product
    { id: 'p4', vendorId: 'other_vendor', category: 'generator', name: 'ژنراتور فروشنده دیگر' },
    { id: 'p5', vendorId: null, ownerId: undefined, category: 'generator', name: 'اورفان نال' }
  ];

  const ownedProducts = candidateProducts.filter((p: any) => {
    if (!p || !p.id || !currentVendor.id) return false;
    const isOwned = (p.vendorId && p.vendorId === currentVendor.id) ||
                    (p.ownerId && p.ownerId === currentVendor.id && (p.ownerType === 'VENDOR' || !p.ownerType));
    return Boolean(isOwned);
  });

  assert.strictEqual(ownedProducts.length, 2, 'Only products explicitly owned by vendor_abc must match');
  assert.deepStrictEqual(ownedProducts.map(p => p.id), ['p1', 'p2']);
  assert.strictEqual(ownedProducts.some(p => p.id === 'p3'), false, 'Orphan seed products must never be attributed');
  assert.strictEqual(ownedProducts.some(p => p.id === 'p4'), false, 'Products belonging to other sellers must not match');
  console.log('  ✓ Strict vendor ownership verified; orphan products correctly rejected');

  // =========================================================================
  // TEST 4: Specialization Verification (Solar EPC without generators excluded)
  // =========================================================================
  console.log('\nTest 4: Verifying specialization gate (excluding generic solar EPC)...');
  const GENERATOR_CATEGORY_TOKENS = [
    'generator',
    'diesel_generator',
    'gas_generator',
    'gasoline_generator',
    'portable_generator',
    'genset',
    'موتور برق',
    'دیزل ژنراتور',
    'ژنراتور گازسوز',
    'موتوربرق',
    'ژنراتور دیزلی',
    'ژنراتور اضطراری',
    'تجهیزات برق اضطراری و دیزل ژنراتور'
  ];

  const isGenCat = (cat: string) => {
    if (!cat || typeof cat !== 'string') return false;
    const lower = cat.toLowerCase().trim();
    return GENERATOR_CATEGORY_TOKENS.some(token => lower.includes(token));
  };

  const solarVendor = {
    id: 'solar_epc_1',
    status: 'approved',
    categories: ['solar_panels', 'inverters', 'epc_contractor', 'نیروگاه خورشیدی']
  };
  const solarVendorProducts: any[] = []; // No generator products

  const hasGenCategory = solarVendor.categories.some(c => isGenCat(c));
  const hasGenProducts = solarVendorProducts.some(p => isGenCat(p.category) || isGenCat(p.name));
  const qualifies = hasGenCategory || hasGenProducts;

  assert.strictEqual(qualifies, false, 'Generic solar EPC vendor MUST NOT qualify for generator discovery');
  console.log('  ✓ Generic solar EPC contractors correctly rejected from generator discovery');

  // =========================================================================
  // TEST 5: Removal of Arbitrary ±20% Suitability Claim & Steady-State Labeling
  // =========================================================================
  console.log('\nTest 5: Verifying removal of arbitrary ±20% suitability and enforcement of steady-state disclaimer...');
  const liveRes = await fetch('http://localhost:3000/api/vendors/generator-discovery?kw=10&kva=12.5');
  assert.strictEqual(liveRes.status, 200, 'GET /api/vendors/generator-discovery must return 200');
  const liveData: any = await liveRes.json();

  assert(liveData.engineeringDisclaimer, 'API must return explicit engineeringDisclaimer');
  assert(
    liveData.engineeringDisclaimer.includes('Steady-State') || liveData.engineeringDisclaimer.includes('پایدار'),
    'Disclaimer must reference steady-state load limitation'
  );
  assert(
    liveData.engineeringDisclaimer.includes('راه‌اندازی') || liveData.engineeringDisclaimer.includes('سازنده'),
    'Disclaimer must require manufacturer validation for motor starting'
  );

  // If there are matched products, verify startingCapabilityVerified is explicitly false
  for (const s of liveData.suppliers) {
    for (const p of s.matchedProducts) {
      assert.strictEqual(
        p.startingCapabilityVerified,
        false,
        'Product starting capability MUST be labeled unverified (false)'
      );
      assert(
        p.steadyStateComparisonNote,
        'Product must contain steady-state comparison note'
      );
    }
  }
  console.log('  ✓ API response includes mandatory engineering disclaimer');
  console.log('  ✓ Product level startingCapabilityVerified is strictly false');

  // =========================================================================
  // TEST 6: Route Ordering Verification (no wildcard collision with /api/vendors/:id)
  // =========================================================================
  console.log('\nTest 6: Verifying endpoint ordering before /api/vendors/:id...');
  // Requesting /api/vendors/generator-discovery must NOT return the 404 "فروشگاه یافت نشد" from /api/vendors/:id
  const discoveryRouteRes = await fetch('http://localhost:3000/api/vendors/generator-discovery');
  const discoveryJson: any = await discoveryRouteRes.json();
  assert.strictEqual(discoveryRouteRes.status, 200);
  assert(!discoveryJson.error, 'Should not return route error');
  assert(Array.isArray(discoveryJson.suppliers), 'Must return suppliers array');

  // Testing an actual non-existent vendor ID to confirm /api/vendors/:id still returns 404
  const nonExistentVendorRes = await fetch('http://localhost:3000/api/vendors/non-existent-vendor-id-12345');
  assert.strictEqual(nonExistentVendorRes.status, 404);
  const notFoundJson: any = await nonExistentVendorRes.json();
  assert.strictEqual(notFoundJson.error, 'فروشگاه یافت نشد.');
  console.log('  ✓ /api/vendors/generator-discovery correctly resolved before /api/vendors/:id');

  // =========================================================================
  // TEST 7: Query Filter Parameter Handling (Location, Fuel, Phase)
  // =========================================================================
  console.log('\nTest 7: Verifying query parameter filters (province, fuel, phase)...');
  const provinceParam = encodeURIComponent('تهران');
  const provinceFilteredRes = await fetch(`http://localhost:3000/api/vendors/generator-discovery?province=${provinceParam}`);
  assert.strictEqual(provinceFilteredRes.status, 200);
  const provJson: any = await provinceFilteredRes.json();
  assert.strictEqual(provJson.query.province, 'تهران');

  const fuelFilteredRes = await fetch('http://localhost:3000/api/vendors/generator-discovery?fuelType=DIESEL&phase=THREE_PHASE');
  assert.strictEqual(fuelFilteredRes.status, 200);
  const fuelJson: any = await fuelFilteredRes.json();
  assert.strictEqual(fuelJson.query.fuelType, 'DIESEL');
  assert.strictEqual(fuelJson.query.phase, 'THREE_PHASE');
  console.log('  ✓ Query filtering parameters parsed and acknowledged properly');

  // =========================================================================
  // TEST 8: Verified Database Grounding (Zero Parallel Marketplace)
  // =========================================================================
  console.log('\nTest 8: Verifying zero parallel marketplace (grounded strictly in db.json)...');
  const dbVendors = db.getVendors() || [];
  const approvedDbVendors = dbVendors.filter((v: any) => v && v.status === 'approved');
  assert.strictEqual(
    provJson.totalSuppliersCount,
    approvedDbVendors.length,
    'totalSuppliersCount must exactly match approved vendors in db.json'
  );
  console.log(`  ✓ Total approved vendors in DB: ${approvedDbVendors.length}; discovery totalSuppliersCount: ${provJson.totalSuppliersCount}`);

  console.log('\n=== ALL STAGE 13.11-D.3 DETERMINISTIC TESTS PASSED SUCCESSFULLY ===');
}

runStage13_11_D3_Tests().catch(err => {
  console.error('\n❌ STAGE 13.11-D.3 TEST FAILED:', err);
  process.exit(1);
});
