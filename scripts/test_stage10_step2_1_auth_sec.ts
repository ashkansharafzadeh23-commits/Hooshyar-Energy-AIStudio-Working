/**
 * HOOSHYAR ENERGY V2 — STAGE 10, STEP 2.1 REGRESSION & SECURITY TEST SUITE
 * Server-Authoritative Identity & Token Fallback Elimination Audit
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

const ROOT_DIR = process.cwd();
const DB_PATH = path.join(ROOT_DIR, 'db.json');
const MIGRATION_REPORT_PATH = path.join(ROOT_DIR, 'docs/POSTGRES_MIGRATION_REPORT.md');

function sha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const BASELINE_DB_HASH = sha256(fs.readFileSync(DB_PATH));
const BASELINE_REPORT_HASH = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${msg}`);
  } else {
    failed++;
    console.error(`[FAIL] ${msg}`);
  }
}

async function requestJson(url: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const parsed = new URL(url);
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : undefined;
    const req = http.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsedBody = data;
        try {
          parsedBody = JSON.parse(data);
        } catch {
          // keep as string
        }
        resolve({ status: res.statusCode || 0, headers: res.headers, body: parsedBody });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STAGE 10, STEP 2.1: FINAL AUTHENTICATION SECURITY AUDIT');
  console.log('================================================================\n');

  // 1. Database Isolation
  console.log('--- Step 1: Setting up isolated test database ---');
  const isolated = setupTestDatabaseIsolation('stage10_step2_1_auth_sec');
  console.log(`Isolated DB: ${isolated.tempDbPath}`);

  // Dynamically import app components after DB isolation
  const { setDBPath } = await import('../src/db/index.js');
  setDBPath(isolated.tempDbPath);

  const { userRepository } = await import('../src/repositories/userRepository.js');
  const { jwtService } = await import('../src/security/jwtService.js');
  const authRouter = (await import('../src/api/auth.js')).default;
  const { verifyAuthToken, requireAuth } = await import('../src/api/auth.js');
  const userRouter = (await import('../src/api/user.js')).default;
  const assetsRouter = (await import('../src/api/assets.js')).default;

  // Setup Express Test Server
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/assets', assetsRouter);

  // Protected dummy route with requireAuth
  app.get('/api/test-protected', verifyAuthToken, requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}\n`);

  try {
    // 2. Setup Seed Users in Isolated Database
    console.log('--- Step 2: Seeding test accounts in isolated DB ---');
    const legitAdmin = userRepository.createUser({
      phone: '09121111111',
      name: 'Legit Admin User',
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    const legitProjectOwner = userRepository.createUser({
      phone: '09122222222',
      name: 'Legit Project Owner',
      role: 'PROJECT_OWNER',
      roles: ['PROJECT_OWNER']
    });

    const legitCustomer = userRepository.createUser({
      phone: '09123333333',
      name: 'Legit Customer',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });

    const userToBeDeleted = userRepository.createUser({
      phone: '09124444444',
      name: 'To Be Deleted',
      role: 'ADMIN', // created with ADMIN
      roles: ['ADMIN']
    });

    const userWithRevokedRole = userRepository.createUser({
      phone: '09125555555',
      name: 'User With Revoked Role',
      role: 'CUSTOMER',
      roles: ['CUSTOMER']
    });

    console.log('Accounts seeded successfully.\n');

    // 3. Test Cases: Nonexistent User with Validly Signed Token
    console.log('--- Step 3: Nonexistent User with Signed Token (Fallback Elimination Test) ---');
    const nonexistentUserId = 'usr_nonexistent_99999999';
    // Attacker crafts or holds a valid JWT with forged or obsolete claims (e.g. role: ADMIN)
    const tokenNonexistentUser = jwtService.sign({
      userId: nonexistentUserId,
      phone: '09129999999',
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    // 3.1: Protected dummy route
    const resNonexistentProtected = await requestJson(`${baseUrl}/api/test-protected`, {
      headers: { Authorization: `Bearer ${tokenNonexistentUser}` }
    });
    assert(
      resNonexistentProtected.status === 401,
      `Nonexistent user with validly signed token is rejected with 401 UNAUTHORIZED on /api/test-protected (got ${resNonexistentProtected.status})`
    );

    // 3.2: /api/auth/me
    const resNonexistentMe = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenNonexistentUser}` }
    });
    assert(
      resNonexistentMe.status === 401,
      `Nonexistent user with validly signed token is rejected with 401 on /api/auth/me (got ${resNonexistentMe.status})`
    );

    // 3.3: Admin-only /api/user/pending-roles
    const resNonexistentAdmin = await requestJson(`${baseUrl}/api/user/pending-roles`, {
      headers: { Authorization: `Bearer ${tokenNonexistentUser}` }
    });
    assert(
      resNonexistentAdmin.status === 401,
      `Nonexistent user claiming ADMIN in token cannot access /api/user/pending-roles (got ${resNonexistentAdmin.status})`
    );

    // 4. Test Cases: Deleted User with Active Token
    console.log('\n--- Step 4: Deleted User with Active Token ---');
    const tokenDeletedUser = jwtService.sign({
      userId: userToBeDeleted.id,
      phone: userToBeDeleted.phone,
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    // Verify token works before deletion
    const resBeforeDelete = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDeletedUser}` }
    });
    assert(resBeforeDelete.status === 200, `User can access /api/auth/me before deletion (status 200)`);

    // Delete user from isolated database
    const dbRaw = JSON.parse(fs.readFileSync(isolated.tempDbPath, 'utf8'));
    dbRaw.users = dbRaw.users.filter((u: any) => u.id !== userToBeDeleted.id);
    fs.writeFileSync(isolated.tempDbPath, JSON.stringify(dbRaw, null, 2));

    // Request again with the token of deleted user
    const resAfterDelete = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenDeletedUser}` }
    });
    assert(
      resAfterDelete.status === 401,
      `Deleted user with active token is rejected with 401 on /api/auth/me (got ${resAfterDelete.status})`
    );

    const resDeletedAdminAction = await requestJson(`${baseUrl}/api/user/pending-roles`, {
      headers: { Authorization: `Bearer ${tokenDeletedUser}` }
    });
    assert(
      resDeletedAdminAction.status === 401,
      `Deleted user cannot access privileged /api/user/pending-roles (got ${resDeletedAdminAction.status})`
    );

    // 5. Test Cases: Revoked Roles in Authoritative Database
    console.log('\n--- Step 5: Revoked Roles & Server-Authoritative Role Verification ---');
    // Issue token claiming ADMIN for user who is actually CUSTOMER in database
    const tokenRevokedRole = jwtService.sign({
      userId: userWithRevokedRole.id,
      phone: userWithRevokedRole.phone,
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    const resRevokedAdminAction = await requestJson(`${baseUrl}/api/user/pending-roles`, {
      headers: { Authorization: `Bearer ${tokenRevokedRole}` }
    });
    assert(
      resRevokedAdminAction.status === 403,
      `User with token claiming ADMIN but DB having CUSTOMER is rejected with 403 FORBIDDEN on pending-roles (got ${resRevokedAdminAction.status})`
    );

    const { assetRepository } = await import('../src/repositories/assetRepository.js');
    const sampleAsset = assetRepository.createSolarAsset({
      projectName: 'نیروگاه تست بررسی وضعیت',
      ownerId: legitProjectOwner.id,
      epcCompanyId: null,
      location: { city: 'کاشان', lat: 33.9, lon: 51.4 },
      capacityKw: 100,
      technology: 'monocrystalline',
      commissionDate: null,
      projectStatus: 'DRAFT',
      projectValueIRR: null,
      expectedAnnualGenerationKwh: 160000,
      projectLifetimeYears: 25,
      verificationStatus: 'not_verified'
    });

    const resRevokedAssetStatus = await requestJson(`${baseUrl}/api/assets/${sampleAsset.id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenRevokedRole}` },
      body: { projectStatus: 'APPROVED' }
    });
    assert(
      resRevokedAssetStatus.status === 403,
      `User with token claiming ADMIN cannot approve assets when DB says CUSTOMER (got ${resRevokedAssetStatus.status})`
    );

    // 6. Test Cases: Invalid & Expired Tokens
    console.log('\n--- Step 6: Invalid & Expired Tokens ---');
    // 6.1: Malformed token
    const resMalformed = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer not-a-valid-jwt-token' }
    });
    assert(resMalformed.status === 401, `Malformed token returns 401 UNAUTHORIZED (got ${resMalformed.status})`);

    // 6.2: Tampered signature
    const legitAdminToken = jwtService.sign({ userId: legitAdmin.id, role: 'ADMIN' });
    const parts = legitAdminToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: legitAdmin.id, role: 'ADMIN', foo: 'bar' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const resTampered = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tamperedToken}` }
    });
    assert(resTampered.status === 401, `Tampered token returns 401 UNAUTHORIZED (got ${resTampered.status})`);

    // 6.3: Expired token
    const expiredToken = jwtService.sign(
      { userId: legitAdmin.id, role: 'ADMIN' },
      { expiresIn: '-10s' }
    );
    const resExpired = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(resExpired.status === 401, `Expired token returns 401 UNAUTHORIZED (got ${resExpired.status})`);

    // 6.4: Empty token
    const resNoToken = await requestJson(`${baseUrl}/api/auth/me`);
    assert(resNoToken.status === 401, `Missing token returns 401 UNAUTHORIZED (got ${resNoToken.status})`);

    // 7. Test Cases: Legitimate User Workflows
    console.log('\n--- Step 7: Legitimate Workflows Preservation ---');
    // 7.1: Legitimate Admin access
    const resLegitAdminMe = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${legitAdminToken}` }
    });
    assert(
      resLegitAdminMe.status === 200 && resLegitAdminMe.body?.user?.id === legitAdmin.id,
      `Legitimate Admin can access /api/auth/me (got 200, user id matches)`
    );

    const resLegitAdminRoles = await requestJson(`${baseUrl}/api/user/pending-roles`, {
      headers: { Authorization: `Bearer ${legitAdminToken}` }
    });
    assert(
      resLegitAdminRoles.status === 200,
      `Legitimate Admin can access /api/user/pending-roles (got ${resLegitAdminRoles.status})`
    );

    // 7.2: Legitimate Project Owner access
    const legitOwnerToken = jwtService.sign({ userId: legitProjectOwner.id, role: 'PROJECT_OWNER' });
    const resLegitOwnerMe = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${legitOwnerToken}` }
    });
    assert(
      resLegitOwnerMe.status === 200 && resLegitOwnerMe.body?.user?.id === legitProjectOwner.id,
      `Legitimate Project Owner can access /api/auth/me (got 200)`
    );

    const resOwnerCreateAsset = await requestJson(`${baseUrl}/api/assets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${legitOwnerToken}` },
      body: {
        projectName: 'پروژه نیروگاه تست مالک',
        location: { city: 'تهران', lat: 35.7, lon: 51.4 },
        capacityKw: 100,
        technology: 'MONO_PERC'
      }
    });
    assert(
      resOwnerCreateAsset.status === 200,
      `Legitimate Project Owner can create new solar assets (got ${resOwnerCreateAsset.status})`
    );

    // 7.3: Legitimate Customer access
    const legitCustomerToken = jwtService.sign({ userId: legitCustomer.id, role: 'CUSTOMER' });
    const resCustomerMe = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${legitCustomerToken}` }
    });
    assert(
      resCustomerMe.status === 200,
      `Legitimate Customer can access /api/auth/me (got 200)`
    );

    const resCustomerAdminForbidden = await requestJson(`${baseUrl}/api/user/pending-roles`, {
      headers: { Authorization: `Bearer ${legitCustomerToken}` }
    });
    assert(
      resCustomerAdminForbidden.status === 403,
      `Legitimate Customer cannot access admin routes (got 403 FORBIDDEN)`
    );

    // 8. Test Cases: Partner registration and login
    console.log('\n--- Step 8: Partner Registration & Login Workflows ---');
    const resPartnerRegister = await requestJson(`${baseUrl}/api/auth/partner-register`, {
      method: 'POST',
      body: {
        phone: '09126666666',
        name: 'شرکت مهندسی توان گستر',
        companyName: 'شرکت مهندسی توان گستر',
        role: 'CONTRACTOR',
        city: 'اصفهان'
      }
    });
    assert(
      resPartnerRegister.status === 200 && !!resPartnerRegister.body?.token,
      `Partner registration succeeds and returns token (got ${resPartnerRegister.status})`
    );

    const contractorToken = resPartnerRegister.body.token;
    const resContractorMe = await requestJson(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${contractorToken}` }
    });
    assert(
      resContractorMe.status === 200 && resContractorMe.body?.user?.roles?.includes('CONTRACTOR'),
      `Registered contractor can access /api/auth/me with authoritative CONTRACTOR role`
    );

    const resPartnerLogin = await requestJson(`${baseUrl}/api/auth/partner-login`, {
      method: 'POST',
      body: {
        phone: '09126666666',
        role: 'CONTRACTOR'
      }
    });
    assert(
      resPartnerLogin.status === 200 && !!resPartnerLogin.body?.token,
      `Partner login succeeds for registered contractor (got ${resPartnerLogin.status})`
    );

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    isolated.cleanup();
    console.log('\nIsolated database cleaned up.');
  }

  // 9. Integrity checks on baseline files
  console.log('\n--- Step 9: Baseline Files Integrity Check ---');
  const currentDbHash = sha256(fs.readFileSync(DB_PATH));
  const currentReportHash = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));

  assert(
    currentDbHash === BASELINE_DB_HASH,
    `Production db.json is untouched (Hash: ${currentDbHash.substring(0, 16)}...)`
  );
  assert(
    currentReportHash === BASELINE_REPORT_HASH,
    `POSTGRES_MIGRATION_REPORT.md is untouched (Hash: ${currentReportHash.substring(0, 16)}...)`
  );

  console.log('\n================================================================');
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
