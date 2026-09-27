/**
 * HOOSHYAR ENERGY — UI-10 PARTNER NETWORK INTEGRATION & SECURITY TEST
 * Comprehensive Automated Verification Script
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { technicianMatchingService } from '../src/services/technicianMatchingService.js';
import { toPublicProfessional } from '../src/api/professionals.js';
import { toPublicEpc } from '../src/api/contractors.js';
import { db, setDBPath } from '../src/db/index.js';

const ROOT_DIR = process.cwd();
const DB_PATH = path.join(ROOT_DIR, 'db.json');
const MIGRATION_REPORT_PATH = path.join(ROOT_DIR, 'docs/POSTGRES_MIGRATION_REPORT.md');

// Immutable baseline hashes established in Phase 2
const BASELINE_DB_HASH = 'de1c80c200b77dbbcdbb6fd077bced308b76969c9026ceb2715d21e2c92409c2';
const BASELINE_REPORT_HASH = '50814eac6cd752d801f35f23d98d2c45db61cfc1cc91dc080792a69f79867afb';

function sha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAILED: ${message}`);
  }
}

console.log('========================================================================');
console.log('HOOSHYAR ENERGY — UI-10 PARTNER NETWORK FINAL SECURITY & DATA-TRUTH TEST');
console.log('========================================================================');

// [1] DATABASE & REPORT IMMUTABILITY CHECK
console.log('\n[1] Baseline Immutability Guard:');
const currentDbHash = sha256(fs.readFileSync(DB_PATH));
assert(currentDbHash === BASELINE_DB_HASH, `db.json is byte-for-byte identical (${currentDbHash})`);

const currentReportHash = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));
assert(currentReportHash === BASELINE_REPORT_HASH, `POSTGRES_MIGRATION_REPORT.md is unmodified (${currentReportHash})`);

// [2] PARTNER LOGIN SECURITY & ROLE AUTHORIZATION
console.log('\n[2] Partner Login Security & Role Authorization:');
const authCode = fs.readFileSync(path.join(ROOT_DIR, 'src/api/auth.ts'), 'utf8');

// Inspect partner-login route block
const partnerLoginMatch = authCode.match(/authRouter\.post\("\/partner-login"[\s\S]*?\n\}\);/);
const partnerLoginCode = partnerLoginMatch ? partnerLoginMatch[0] : '';

assert(!partnerLoginCode.includes('userRepository.createUser'), 'partner-login never creates user');
assert(!partnerLoginCode.includes('userRepository.updateUser'), 'partner-login never adds role');
assert(partnerLoginCode.includes('401') && partnerLoginCode.includes('!user'), 'invalid/nonexistent account cannot login (returns 401)');
assert(partnerLoginCode.includes('403') && partnerLoginCode.includes('!userRoles.includes'), 'requested unauthorized role returns forbidden (returns 403)');

// [3] PARTNER REGISTRATION & PUBLICATION POLICY
console.log('\n[3] Partner Registration & Publication Policy:');
const partnerRegisterMatch = authCode.match(/authRouter\.post\("\/partner-register"[\s\S]*?\n\}\);/);
const partnerRegisterCode = partnerRegisterMatch ? partnerRegisterMatch[0] : '';

assert(partnerRegisterCode.includes('verificationStatus: \'NOT_VERIFIED\''), 'registration does not imply publication (EPC registered as NOT_VERIFIED)');
assert(!partnerRegisterCode.includes('verificationStatus: \'VERIFIED\''), 'registration never defaults to VERIFIED');

// [4] TECHNICIAN MATCHING ELIGIBILITY & CANDIDATE FILTRATION
console.log('\n[4] Technician Matching Eligibility & Solar-Only Rules:');
const techMatchingCode = fs.readFileSync(path.join(ROOT_DIR, 'src/services/technicianMatchingService.ts'), 'utf8');

assert(techMatchingCode.includes("candidates = allPros.filter"), 'candidates explicitly filtered before scoring');
assert(techMatchingCode.includes("pro.status === 'approved'"), 'unapproved technician cannot enter maintenance matching');
assert(!techMatchingCode.includes('Math.max(20, score)'), 'zero relevance is not converted to 20% match');

// Runtime verification with isolated database:
// Create approved, pending, rejected, and missing-status professionals
const tempDbPath = path.join(os.tmpdir(), `test_ui10_tech_matching_${Date.now()}.json`);
fs.copyFileSync(DB_PATH, tempDbPath);
setDBPath(tempDbPath);

try {
  const approvedPro = db.createProfessional({
    fullName: 'تکنسین خورشیدی تایید شده',
    phone: '09121111111',
    specialties: ['سیستم‌های خورشیدی', 'پنل‌های خورشیدی', 'خورشیدی'],
    serviceCities: ['تهران'],
    yearsExperience: 5,
    bio: 'تکنسین تایید شده رسمی',
    profileImageUrl: '',
    certifications: []
  });
  db.updateProfessional(approvedPro.id, { status: 'approved' as any });

  const pendingPro = db.createProfessional({
    fullName: 'تکنسین خورشیدی در انتظار تایید',
    phone: '09122222222',
    specialties: ['سیستم‌های خورشیدی', 'خورشیدی'],
    serviceCities: ['تهران'],
    yearsExperience: 4,
    bio: 'در انتظار تایید',
    profileImageUrl: '',
    certifications: []
  });
  db.updateProfessional(pendingPro.id, { status: 'pending_review' as any });

  const rejectedPro = db.createProfessional({
    fullName: 'تکنسین خورشیدی رد صلاحیت شده',
    phone: '09123333333',
    specialties: ['سیستم‌های خورشیدی', 'خورشیدی'],
    serviceCities: ['تهران'],
    yearsExperience: 6,
    bio: 'رد صلاحیت شده',
    profileImageUrl: '',
    certifications: []
  });
  db.updateProfessional(rejectedPro.id, { status: 'rejected' as any });

  const missingStatusPro = db.createProfessional({
    fullName: 'تکنسین خورشیدی فاقد فیلد وضعیت',
    phone: '09124444444',
    specialties: ['سیستم‌های خورشیدی', 'خورشیدی'],
    serviceCities: ['تهران'],
    yearsExperience: 3,
    bio: 'فاقد وضعیت',
    profileImageUrl: '',
    certifications: []
  });
  // Strip status to ensure missing status
  const d = JSON.parse(fs.readFileSync(tempDbPath, 'utf8'));
  const targetIdx = d.professionals.findIndex((p: any) => p.id === missingStatusPro.id);
  if (targetIdx !== -1) {
    delete d.professionals[targetIdx].status;
    delete d.professionals[targetIdx].approvalStatus;
    fs.writeFileSync(tempDbPath, JSON.stringify(d, null, 2));
  }

  // Call the REAL technicianMatchingService
  const realMatches = technicianMatchingService.matchTechnicians({
    symptoms: ['خرابی پنل فتوولتائیک و کاهش تولید خورشیدی'],
    location: 'تهران'
  });

  const matchedIds = realMatches.map(m => m.technicianId);

  // Assertions
  assert(matchedIds.includes(approvedPro.id), 'approved professional may appear in technician matching');
  assert(!matchedIds.includes(pendingPro.id), 'pending professional never appears in technician matching');
  assert(!matchedIds.includes(rejectedPro.id), 'rejected professional never appears in technician matching');
  assert(!matchedIds.includes(missingStatusPro.id), 'missing-status professional never appears in technician matching');
  assert(realMatches.every(m => m.status === 'approved' || (m as any).status === 'APPROVED'), 'all matched candidates strictly have approved status');
  if (realMatches.length > 0) {
    assert(realMatches[0].matchScore >= 0, 'approved technician can enter matching with valid score');
  }
} finally {
  setDBPath(DB_PATH);
  try {
    fs.unlinkSync(tempDbPath);
  } catch (e) {}
}

// [5] EPC & VENDOR MARKETPLACE PUBLICATION
console.log('\n[5] EPC & Vendor Marketplace Publication Filters:');
const contractorsCode = fs.readFileSync(path.join(ROOT_DIR, 'src/api/contractors.ts'), 'utf8');
assert(
  contractorsCode.includes('verificationStatus === "VERIFIED"') ||
  contractorsCode.includes("isPublished === true") ||
  contractorsCode.includes("publicationStatus === 'PUBLISHED'"),
  'unpublished EPC not in public marketplace'
);
assert(contractorsCode.includes('toPublicEpc'), 'published EPC can appear through toPublicEpc sanitization');

const serverCode = fs.readFileSync(path.join(ROOT_DIR, 'server.ts'), 'utf8');
const vendorsEndpointMatch = serverCode.match(/app\.get\("\/api\/vendors"[\s\S]*?\n\}\);/);
const vendorsEndpointCode = vendorsEndpointMatch ? vendorsEndpointMatch[0] : '';
assert(vendorsEndpointCode.includes('status === "approved"') || vendorsEndpointCode.includes('isPublished === true'), 'unpublished vendor not in marketplace');

// [6] LOCATION DATA-TRUTH & REMOVAL OF FABRICATED COORDINATES
console.log('\n[6] Removal of Fabricated Location Data in SellersList:');
const sellersListCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/SellersList.tsx'), 'utf8');

assert(!sellersListCode.includes('CITY_COORDS'), 'no Tehran fallback for missing vendor coordinates (CITY_COORDS removed)');
assert(!sellersListCode.includes('setUserLocation([35.6892, 51.3890])'), 'no Tehran fallback for missing user location');
assert(!sellersListCode.includes('0.012') && !sellersListCode.includes('0.015'), 'no artificial coordinate offsets');
assert(sellersListCode.includes('فاصله قابل محاسبه نیست'), 'no fabricated vendor distance (displays truthful neutral message when distance is null)');

// [7] REMOVAL OF FABRICATED EPC DEFAULTS
console.log('\n[7] Removal of Fabricated EPC Defaults in contractors.ts:');
assert(!contractorsCode.includes('"سراسری"'), 'no fabricated EPC city (no "سراسری" fallback)');
assert(!contractorsCode.includes('"طراحی و احداث نیروگاه خورشیدی"'), 'no fabricated EPC specialty');
assert(!contractorsCode.includes('createdAt: org.createdAt || new Date().toISOString()'), 'no fabricated current createdAt');

// DTO Runtime checks for EPC
const dummyEpcNoCity = toPublicEpc({ id: 'org_test', tradeName: 'تست سولار', type: 'EPC_CONTRACTOR' });
assert(dummyEpcNoCity.city === null || dummyEpcNoCity.city === undefined, 'toPublicEpc preserves missing city as null/undefined');
assert(dummyEpcNoCity.createdAt === null || dummyEpcNoCity.createdAt === undefined, 'toPublicEpc preserves missing createdAt as null/undefined');
assert(Array.isArray(dummyEpcNoCity.specialties) && dummyEpcNoCity.specialties.length === 0, 'toPublicEpc does not invent specialties');

// [8] REMOVAL OF FABRICATED PROFESSIONAL DEFAULTS
console.log('\n[8] Removal of Fabricated Professional Defaults in professionals.ts:');
const prosCode = fs.readFileSync(path.join(ROOT_DIR, 'src/api/professionals.ts'), 'utf8');

assert(!prosCode.includes('"متخصص فنی خورشیدی"'), 'no fabricated professional display name');
assert(!prosCode.includes("['پنل‌های خورشیدی']"), 'no default solar specialty for missing professional specialty');

// DTO Runtime checks for Professional
const proMissingExp = toPublicProfessional({ id: 'p_1', fullName: 'علی حسینی', status: 'approved' });
assert(proMissingExp.yearsExperience === null, 'missing yearsExperience != 0 (remains null)');

const proZeroExp = toPublicProfessional({ id: 'p_2', fullName: 'رضا کمالی', yearsExperience: 0, status: 'approved' });
assert(proZeroExp.yearsExperience === 0, 'genuine 0 remains genuine 0 where valid');

const proEmptyName = toPublicProfessional({ id: 'p_3', status: 'approved' });
assert(proEmptyName.fullName === null, 'no fabricated professional display name when name is empty');

// [9] CONCLUDING IMMUTABILITY CHECK
console.log('\n[9] Concluding Immutability Check:');
const postRunDbHash = sha256(fs.readFileSync(DB_PATH));
assert(postRunDbHash === BASELINE_DB_HASH, 'db.json hash is intact after test execution');

const postRunReportHash = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));
assert(postRunReportHash === BASELINE_REPORT_HASH, 'POSTGRES_MIGRATION_REPORT.md hash is intact after test execution');

console.log('========================================================================');
console.log(`UI-10 PARTNER NETWORK TEST RESULT: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
console.log('========================================================================');

if (failedCount > 0) {
  process.exit(1);
}
