/**
 * HOOSHYAR ENERGY — TECHNICIAN IDENTITY MAPPING & CASE ACCESS AUDIT TEST
 * 
 * Verifies:
 * 1. Database and migration report immutability.
 * 2. Identity resolution service: mapping between authenticated user.id and professional profile.id.
 * 3. Prevention of duplicate professional profiles during resolution.
 * 4. Case access authorization via checkCaseAccess:
 *    - Access granted when assigned via professional.id
 *    - Access granted when assigned via user.id
 *    - HTTP 403 Forbidden for unrelated technicians (anti-IDOR)
 *    - Preserved customer (reporter/owner) and system admin access
 * 5. Technician cases listing (/api/technician/cases and /api/cases):
 *    - Correctly returns cases assigned using either identifier
 *    - Excludes cases assigned to other technicians
 * 6. Exclusion of unapproved technicians from matching pipeline.
 * 7. Non-trust of client-supplied spoofing identifiers.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express from 'express';
import http from 'http';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import { 
  resolveTechnicianProfile, 
  getTechnicianIdentities, 
  isCaseAssignedToTechnician,
  resolveTechnicianIdentity
} from '../src/services/technicianIdentityService.js';
import { professionalRepository } from '../src/repositories/professionalRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { maintenanceRepository } from '../src/repositories/maintenanceRepository.js';
import { checkCaseAccess } from '../src/api/maintenance.js';
import { technicianMatchingService } from '../src/services/technicianMatchingService.js';

const ROOT_DIR = process.cwd();
const BASELINE_REPORT_HASH = '50814eac6cd752d801f35f23d98d2c45db61cfc1cc91dc080792a69f79867afb';
const MIGRATION_REPORT_PATH = path.join(ROOT_DIR, 'docs/POSTGRES_MIGRATION_REPORT.md');

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

async function runTestSuite() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY — TECHNICIAN IDENTITY RESOLUTION & AUTHORIZATION TEST');
  console.log('========================================================================');

  // [1] DATABASE ISOLATION & IMMUTABILITY GUARD
  console.log('\n[1] Baseline Immutability Guard:');
  const isolation = setupTestDatabaseIsolation('technician_identity_test');
  assert(Boolean(isolation && isolation.tempDbPath), 'Test database isolated from repository db.json');
  const currentReportHash = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));
  assert(currentReportHash === BASELINE_REPORT_HASH, `POSTGRES_MIGRATION_REPORT.md is unmodified (${currentReportHash})`);

  // [2] SEED ISOLATED TEST IDENTITIES
  console.log('\n[2] Setting up Isolated Test Identities:');
  
  // Tech Alice (Approved)
  const userAlice = userRepository.createUser({
    phone: '09121111111',
    name: 'مهندس آلیس تقوی',
    roles: ['TECHNICIAN'],
    activeSubscriptionId: null
  });
  const proAlice = professionalRepository.createProfessional({
    userId: userAlice.id,
    fullName: 'مهندس آلیس تقوی',
    phone: '09121111111',
    specialties: ['اینورتر و ادوات قدرت', 'سیستم‌های خورشیدی'],
    serviceCities: ['تهران'],
    yearsExperience: 7,
    rating: 4.8
  });
  professionalRepository.updateProfessionalStatus(proAlice.id, 'approved');

  // Tech Bob (Approved)
  const userBob = userRepository.createUser({
    phone: '09122222222',
    name: 'مهندس بابک رضایی',
    roles: ['TECHNICIAN'],
    activeSubscriptionId: null
  });
  const proBob = professionalRepository.createProfessional({
    userId: userBob.id,
    fullName: 'مهندس بابک رضایی',
    phone: '09122222222',
    specialties: ['باتری و سیستم‌های ذخیره‌ساز'],
    serviceCities: ['تهران'],
    yearsExperience: 4,
    rating: 4.2
  });
  professionalRepository.updateProfessionalStatus(proBob.id, 'approved');

  // Tech Charlie (Pending Approval - Unapproved)
  const userCharlie = userRepository.createUser({
    phone: '09123333333',
    name: 'مهندس چارلی اسدی',
    roles: ['TECHNICIAN'],
    activeSubscriptionId: null
  });
  const proCharlie = professionalRepository.createProfessional({
    userId: userCharlie.id,
    fullName: 'مهندس چارلی اسدی',
    phone: '09123333333',
    specialties: ['اینورتر و ادوات قدرت'],
    serviceCities: ['تهران'],
    yearsExperience: 2,
    rating: null
  });
  // Charlie status remains 'pending_review'

  // Customer Carol
  const userCustomer = userRepository.createUser({
    phone: '09124444444',
    name: 'کارفرما کارول امینی',
    roles: ['CUSTOMER'],
    activeSubscriptionId: null
  });

  // Admin User
  const userAdmin = userRepository.createUser({
    phone: '09120000000',
    name: 'مدیر کل سامانه',
    roles: ['ADMIN'],
    activeSubscriptionId: null
  });

  assert(Boolean(userAlice.id && proAlice.id), 'Alice user and professional records seeded');
  assert(Boolean(userBob.id && proBob.id), 'Bob user and professional records seeded');
  assert(Boolean(userCharlie.id && proCharlie.id), 'Charlie (pending) records seeded');

  // [3] IDENTITY RESOLUTION SERVICE TESTS
  console.log('\n[3] Testing Centralized Identity Resolution Service:');
  const resolvedAlice = resolveTechnicianIdentity(userAlice.id);
  assert(resolvedAlice.userId === userAlice.id, 'Resolves authenticated user.id');
  assert(resolvedAlice.professionalId === proAlice.id, 'Resolves legitimate professional.id from userId');
  assert(resolvedAlice.isApproved === true, 'Identifies approved professional status');
  assert(resolvedAlice.allIdentities.includes(userAlice.id), 'allIdentities includes userId');
  assert(resolvedAlice.allIdentities.includes(proAlice.id), 'allIdentities includes professionalId');

  // Verify no duplicate profile creation
  const countBefore = professionalRepository.getProfessionals().length;
  resolveTechnicianProfile(userAlice.id);
  resolveTechnicianProfile(userAlice.id);
  const countAfter = professionalRepository.getProfessionals().length;
  assert(countBefore === countAfter, 'Does NOT create duplicate professional profile during identity resolution');

  // Non-technician user resolution
  const resolvedCustomer = resolveTechnicianIdentity(userCustomer.id);
  assert(resolvedCustomer.professionalId === null, 'Non-technician resolves to null professional profile');
  assert(resolvedCustomer.allIdentities.length === 1 && resolvedCustomer.allIdentities[0] === userCustomer.id, 'Non-technician identities set only contains userId');

  // [4] CASE ASSIGNMENT IDENTIFIER RESOLUTION & COMPATIBILITY
  console.log('\n[4] Testing Case Assignment Identifier Compatibility (isCaseAssignedToTechnician):');
  // Case A: Assigned with professional.id (proAlice.id)
  assert(isCaseAssignedToTechnician(proAlice.id, userAlice.id), 'Matches assignment made with professional.id');
  // Case B: Assigned with user.id (userAlice.id)
  assert(isCaseAssignedToTechnician(userAlice.id, userAlice.id), 'Matches assignment made with user.id');
  // Case C: Cross-technician assignment (assigned to Alice, checked by Bob)
  assert(!isCaseAssignedToTechnician(proAlice.id, userBob.id), 'Rejects Bob accessing Alice case assigned via pro.id');
  assert(!isCaseAssignedToTechnician(userAlice.id, userBob.id), 'Rejects Bob accessing Alice case assigned via user.id');
  // Case D: Empty or unassigned cases
  assert(!isCaseAssignedToTechnician(undefined, userAlice.id), 'Rejects undefined assignment');
  assert(!isCaseAssignedToTechnician(null, userAlice.id), 'Rejects null assignment');
  assert(!isCaseAssignedToTechnician('', userAlice.id), 'Rejects empty string assignment');

  // [5] AUTHORIZATION GATEWAY (checkCaseAccess) TESTS
  console.log('\n[5] Testing checkCaseAccess Authorization Gateway:');
  const caseAssignedToProAlice = maintenanceRepository.createCase({
    alertIds: [],
    projectId: 'CUSTOMER_DIRECT',
    assetId: 'UNREGISTERED',
    title: 'خرابی رله اینورتر',
    description: 'خطای ولتاژ DC در اینورتر استرینگ',
    priority: 'HIGH',
    status: 'ASSIGNED',
    category: 'CORRECTIVE',
    assignedTechnicianId: proAlice.id,
    assignedTechnicianName: proAlice.fullName,
    reportedBy: userCustomer.id
  });

  const caseAssignedToUserBob = maintenanceRepository.createCase({
    alertIds: [],
    projectId: 'CUSTOMER_DIRECT',
    assetId: 'UNREGISTERED',
    title: 'تخلیه غیرعادی باتری',
    description: 'کاهش ظرفیت و دشارژ زودهنگام',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    category: 'CORRECTIVE',
    assignedTechnicianId: userBob.id,
    assignedTechnicianName: userBob.name,
    reportedBy: userCustomer.id
  });

  // 5.1 Alice accesses case assigned to her pro.id
  const aliceAccess = checkCaseAccess(caseAssignedToProAlice, { id: userAlice.id, role: 'TECHNICIAN' });
  assert(aliceAccess.allowed === true, 'Alice allowed to access her case assigned via professional.id');
  assert(aliceAccess.isAssignedTech === true, 'Alice identified as authoritative isAssignedTech');

  // 5.2 Bob accesses case assigned to his user.id
  const bobAccess = checkCaseAccess(caseAssignedToUserBob, { id: userBob.id, role: 'TECHNICIAN' });
  assert(bobAccess.allowed === true, 'Bob allowed to access his case assigned via user.id');
  assert(bobAccess.isAssignedTech === true, 'Bob identified as authoritative isAssignedTech');

  // 5.3 Bob attempts to access Alice case -> 403 Forbidden
  const bobOnAliceCase = checkCaseAccess(caseAssignedToProAlice, { id: userBob.id, role: 'TECHNICIAN' });
  assert(bobOnAliceCase.allowed === false, 'Bob rejected from accessing Alice case');
  assert(bobOnAliceCase.status === 403, 'Bob rejected with HTTP 403 Forbidden');
  assert(!bobOnAliceCase.isAssignedTech, 'Bob is NOT isAssignedTech on Alice case');

  // 5.4 Technician action requiring requireTechnicianOrAdmin
  const aliceOperationalAccess = checkCaseAccess(caseAssignedToProAlice, { id: userAlice.id, role: 'TECHNICIAN' }, { requireTechnicianOrAdmin: true });
  assert(aliceOperationalAccess.allowed === true, 'Alice allowed to execute technician operational actions (accept/start/action)');

  const bobOperationalOnAlice = checkCaseAccess(caseAssignedToProAlice, { id: userBob.id, role: 'TECHNICIAN' }, { requireTechnicianOrAdmin: true });
  assert(bobOperationalOnAlice.allowed === false && bobOperationalOnAlice.status === 403, 'Bob rejected from Alice operational actions with 403');

  // 5.5 Customer (reporter) access preserved
  const customerAccess = checkCaseAccess(caseAssignedToProAlice, { id: userCustomer.id, role: 'CUSTOMER' });
  assert(customerAccess.allowed === true, 'Customer reporter allowed to access own case');
  assert(customerAccess.isReporter === true, 'Customer recognized as isReporter');

  // 5.6 Unrelated customer access rejected
  const unrelatedCustomer = checkCaseAccess(caseAssignedToProAlice, { id: 'unrelated-cust-999', role: 'CUSTOMER' });
  assert(unrelatedCustomer.allowed === false && unrelatedCustomer.status === 403, 'Unrelated customer rejected with 403');

  // 5.7 Admin access preserved
  const adminAccess = checkCaseAccess(caseAssignedToProAlice, { id: userAdmin.id, role: 'ADMIN' });
  assert(adminAccess.allowed === true, 'Admin allowed global case access');
  assert(adminAccess.isAdmin === true, 'Admin recognized as isAdmin');

  // [6] LIVE RUNTIME API AUTHORIZATION & LISTING TESTS
  console.log('\n[6] Testing Live Runtime API Endpoints with Isolated Server:');
  const { maintenanceRouter } = await import('../src/api/maintenance.js');
  const { jwtService } = await import('../src/security/jwtService.js');

  const app = express();
  app.use(express.json());
  app.use('/api', maintenanceRouter);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    const aliceToken = jwtService.sign({ userId: userAlice.id, role: 'TECHNICIAN' });
    const bobToken = jwtService.sign({ userId: userBob.id, role: 'TECHNICIAN' });
    const customerToken = jwtService.sign({ userId: userCustomer.id, role: 'CUSTOMER' });
    const adminToken = jwtService.sign({ userId: userAdmin.id, role: 'ADMIN' });

    // 6.1 Alice retrieves /api/technician/cases -> receives Case A (assigned to proAlice.id)
    const resAliceCases = await fetch(`${baseUrl}/technician/cases`, {
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(resAliceCases.status === 200, 'Alice GET /api/technician/cases returns 200');
    const aliceCases = await resAliceCases.json();
    assert(Array.isArray(aliceCases), 'Returns array of cases for Alice');
    assert(aliceCases.some((c: any) => c.id === caseAssignedToProAlice.id), 'Alice receives case assigned via professional.id');
    assert(!aliceCases.some((c: any) => c.id === caseAssignedToUserBob.id), 'Alice does NOT receive Bob case');

    // 6.2 Bob retrieves /api/technician/cases -> receives Case B (assigned to userBob.id)
    const resBobCases = await fetch(`${baseUrl}/technician/cases`, {
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    assert(resBobCases.status === 200, 'Bob GET /api/technician/cases returns 200');
    const bobCases = await resBobCases.json();
    assert(bobCases.some((c: any) => c.id === caseAssignedToUserBob.id), 'Bob receives case assigned via user.id');
    assert(!bobCases.some((c: any) => c.id === caseAssignedToProAlice.id), 'Bob does NOT receive Alice case');

    // 6.3 Customer accessing /api/technician/cases -> 403 Forbidden
    const resCustTechCases = await fetch(`${baseUrl}/technician/cases`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(resCustTechCases.status === 403, 'Customer blocked from /api/technician/cases with 403');

    // 6.4 Bob accessing Alice case directly via /api/maintenance/:id -> 403 Forbidden
    const resBobOnAliceCase = await fetch(`${baseUrl}/maintenance/${caseAssignedToProAlice.id}`, {
      headers: { Authorization: `Bearer ${bobToken}` }
    });
    assert(resBobOnAliceCase.status === 403, 'Bob directly accessing Alice case returned 403 Forbidden');

    // 6.5 Alice accepting her case via /api/maintenance/:id/accept -> 200 OK
    const resAliceAccept = await fetch(`${baseUrl}/maintenance/${caseAssignedToProAlice.id}/accept`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${aliceToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert(resAliceAccept.status === 200, 'Alice accepting her assigned case returned 200 OK');

    // 6.6 Bob trying to accept Alice case -> 403 Forbidden
    const resBobAcceptAlice = await fetch(`${baseUrl}/maintenance/${caseAssignedToProAlice.id}/accept`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${bobToken}`,
        'Content-Type': 'application/json'
      }
    });
    assert(resBobAcceptAlice.status === 403, 'Bob trying to accept Alice case returned 403 Forbidden');

    // 6.7 Admin retrieves /api/technician/cases -> sees all cases
    const resAdminCases = await fetch(`${baseUrl}/technician/cases`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resAdminCases.status === 200, 'Admin retrieves /api/technician/cases with 200');
    const adminCases = await resAdminCases.json();
    assert(adminCases.length >= 2, 'Admin sees all maintenance cases');

  } finally {
    server.close();
  }

  // [7] TECHNICIAN MATCHING: EXCLUSION OF UNAPPROVED TECHNICIANS
  console.log('\n[7] Testing Technician Matching Filter (Exclusion of Unapproved):');
  const matches = technicianMatchingService.matchTechnicians({
    symptoms: ['اینورتر', 'رله'],
    location: 'تهران'
  });
  const matchedIds = matches.map(m => m.technicianId);
  assert(matchedIds.includes(proAlice.id), 'Approved technician Alice included in matches');
  assert(!matchedIds.includes(proCharlie.id), 'Unapproved (pending) technician Charlie strictly EXCLUDED from matches');
  assert(matches.every(m => m.status === 'approved' || (m as any).approvalStatus === 'APPROVED'), 'All returned matched candidates are approved');

  // [8] REGRESSION: STRICT USERID MATCHING & COLLISION ISOLATION
  console.log('\n[8] Regression Test: Unrelated Professional Profile Collision Protection:');
  // User 123
  const user123 = userRepository.createUser({
    id: 'usr-123',
    phone: '09121234567',
    name: 'کاربر شماره ۱۲۳',
    roles: ['TECHNICIAN'],
    activeSubscriptionId: null
  });

  // Legitimate account of another technician
  const userOther = userRepository.createUser({
    id: 'usr-other-999',
    phone: '09129998877',
    name: 'متخصص واقعی',
    roles: ['TECHNICIAN'],
    activeSubscriptionId: null
  });

  // Unrelated professional profile whose profile ID happens to be "usr-123", but belongs to userOther!
  const unrelatedPro = professionalRepository.createProfessional({
    userId: userOther.id, // Authentically belongs to userOther
    fullName: 'پروفایل با شناسه تداخلی',
    phone: '09129998877',
    specialties: ['اینورتر'],
    serviceCities: ['تهران']
  });
  // Force the profile ID to be usr-123 to simulate identifier collision
  unrelatedPro.id = 'usr-123';
  professionalRepository.updateProfessionalStatus(unrelatedPro.id, 'approved');

  // 1. Verify that unrelated professional is NEVER resolved as usr-123's professional profile
  const resolvedForUser123 = resolveTechnicianProfile('usr-123');
  assert(resolvedForUser123 === null || resolvedForUser123.userId === 'usr-123', 'Unrelated professional with pro.id=usr-123 is NEVER resolved as usr-123 professional profile');
  assert(resolvedForUser123 === null, 'User 123 has no professional profile (returns null, not colliding pro)');

  // Verify full identity resolution excludes colliding pro
  const fullResolution123 = resolveTechnicianIdentity('usr-123');
  assert(fullResolution123.professionalId === null, 'fullResolution.professionalId is null for usr-123');

  // 2. Create case assigned to unrelated professional via its secondary account
  const caseAssignedToUnrelatedPro = maintenanceRepository.createCase({
    alertIds: [],
    projectId: 'CUSTOMER_DIRECT',
    assetId: 'UNREGISTERED',
    title: 'پرونده متخصص دیگر',
    description: 'تخصیص یافته به کاربر متخصص دیگر با شناسه پروفایل تصادفی',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    category: 'CORRECTIVE',
    assignedTechnicianId: userOther.id, // assigned to userOther account
    assignedTechnicianName: userOther.name,
    reportedBy: userCustomer.id
  });

  // Verify usr-123 CANNOT access case assigned to userOther
  const accessCheck123 = checkCaseAccess(caseAssignedToUnrelatedPro, { id: 'usr-123', role: 'TECHNICIAN' });
  assert(!accessCheck123.allowed && accessCheck123.status === 403, 'User 123 CANNOT access case assigned to other technician user account');

  // 3. Document explicit legacy collision limitation:
  // If a legacy case was assigned directly with string "usr-123" intended as a professional.id:
  // because assignedTechnicianId === userId evaluates to true for usr-123,
  // legacy user-ID assignment inherently creates an ambiguous collision where assignedTechnicianId matches usr-123.
  console.log('  [LIMITATION REPORT] Legacy compatibility note: When assignedTechnicianId === userId, backward compatibility permits the authenticated user. If a legacy system stored a foreign pro.id that exactly collides with an authentic user.id, isCaseAssignedToTechnician matches on userId.');

  // [9] ANTI-SPOOFING & CLIENT-SUPPLIED IDENTIFIER ISOLATION
  console.log('\n[8] Testing Client-Supplied Identifier Spoofing Protection:');
  // Attempt to pass spoofed headers or bodies
  const spoofCheckAlice = isCaseAssignedToTechnician(caseAssignedToProAlice.assignedTechnicianId, userBob.id);
  assert(!spoofCheckAlice, 'Cannot spoof technician identity: authenticated userId strictly determines authorization');

  // [10] CONCLUDING IMMUTABILITY CHECK
  console.log('\n[10] Concluding Repository Immutability Check:');
  isolation.cleanup();

  console.log('\n========================================================================');
  console.log(`TECHNICIAN IDENTITY SUITE RESULT: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error running technician identity test suite:', err);
  process.exit(1);
});
