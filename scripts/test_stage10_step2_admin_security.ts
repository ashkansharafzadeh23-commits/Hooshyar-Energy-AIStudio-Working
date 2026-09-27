/**
 * HOOSHYAR ENERGY V2 — STAGE 10, STEP 2 REGRESSION & SECURITY AUDIT TEST SUITE
 * Admin Access Security, Dev Backdoor Elimination & Role-Based Authorization
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
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

async function runSuite() {
  console.log('========================================================================');
  console.log('HOOSHYAR ENERGY V2 — STAGE 10, STEP 2: SECURE ADMIN ACCESS & AUDIT TEST');
  console.log('========================================================================');

  // 1. Setup isolated database
  const isolation = setupTestDatabaseIsolation('stage10_step2');
  assert(fs.existsSync(isolation.tempDbPath), 'Isolated test database initialized');

  // 2. Start HTTP server with isolated DB
  const express = (await import('express')).default;
  const { default: authRouter } = await import('../src/api/auth.js');
  const { default: userRouter } = await import('../src/api/user.js');
  const { default: assetsRouter } = await import('../src/api/assets.js');
  const { jwtService } = await import('../src/security/jwtService.js');
  const { userRepository } = await import('../src/repositories/userRepository.js');
  const { assetRepository } = await import('../src/repositories/assetRepository.js');

  const app = express();
  app.use(express.json());

  // Mount routers
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/assets', assetsRouter);

  // Catch-all
  app.all('/api/*', (req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: `Not found: ${req.path}` });
  });

  const testServer = http.createServer(app);
  await new Promise<void>((resolve) => testServer.listen(0, resolve));
  const port = (testServer.address() as any).port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[SETUP] Isolated test server listening on ${baseUrl}\n`);

  // Create isolated test users in database
  const regularUser = userRepository.createUser({
    phone: '+989120000001',
    name: 'کاربر عادی',
    roles: ['CUSTOMER'],
    activeSubscriptionId: null
  });

  const projectOwnerUser = userRepository.createUser({
    phone: '+989120000002',
    name: 'مالک پروژه',
    roles: ['PROJECT_OWNER'],
    activeSubscriptionId: null
  });

  const adminUser = userRepository.createUser({
    phone: '+989120000003',
    name: 'مدیر ارشد سامانه',
    roles: ['ADMIN'],
    activeSubscriptionId: null
  });

  // Issue real signed tokens
  const regularUserToken = jwtService.sign({
    userId: regularUser.id,
    phone: regularUser.phone,
    role: 'CUSTOMER'
  });

  const projectOwnerToken = jwtService.sign({
    userId: projectOwnerUser.id,
    phone: projectOwnerUser.phone,
    role: 'PROJECT_OWNER'
  });

  const adminToken = jwtService.sign({
    userId: adminUser.id,
    phone: adminUser.phone,
    role: 'ADMIN'
  });

  // Create an isolated sample asset owned by projectOwnerUser
  const sampleAsset = assetRepository.createSolarAsset({
    projectName: 'نیروگاه خورشیدی تست کاشان',
    ownerId: projectOwnerUser.id,
    epcCompanyId: null,
    location: { city: 'کاشان', lat: null, lon: null },
    capacityKw: 100,
    technology: 'monocrystalline',
    commissionDate: null,
    projectStatus: 'DRAFT',
    projectValueIRR: null,
    expectedAnnualGenerationKwh: 160000,
    projectLifetimeYears: 25,
    verificationStatus: 'not_verified'
  });

  // -------------------------------------------------------------------------
  // TEST 1: Unauthenticated Admin Access Rejection
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Unauthenticated Administrator Access Rejection ---');
  const unauthPendingRes = await requestJson(`${baseUrl}/api/user/pending-roles`);
  assert(unauthPendingRes.status === 401, 'GET /api/user/pending-roles without auth returns HTTP 401');

  const unauthStatusRes = await requestJson(`${baseUrl}/api/assets/${sampleAsset.id}/status`, {
    method: 'PUT',
    body: { projectStatus: 'APPROVED' }
  });
  assert(unauthStatusRes.status === 401, 'PUT /api/assets/:id/status without auth returns HTTP 401');

  // -------------------------------------------------------------------------
  // TEST 2: Authenticated Non-Administrator Access Rejection (HTTP 403)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Authenticated Non-Administrator Access Rejection ---');
  const nonAdminPendingRes = await requestJson(`${baseUrl}/api/user/pending-roles`, {
    headers: { Authorization: `Bearer ${regularUserToken}` }
  });
  assert(nonAdminPendingRes.status === 403, 'GET /api/user/pending-roles with regular user returns HTTP 403');
  assert(nonAdminPendingRes.body.code === 'FORBIDDEN', 'Returns code FORBIDDEN');

  const nonAdminApproveRes = await requestJson(`${baseUrl}/api/user/${regularUser.id}/approve-role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${projectOwnerToken}` }
  });
  assert(nonAdminApproveRes.status === 403, 'PUT /api/user/:id/approve-role by project owner returns HTTP 403');

  const nonAdminStatusRes = await requestJson(`${baseUrl}/api/assets/${sampleAsset.id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${projectOwnerToken}` },
    body: { projectStatus: 'APPROVED' }
  });
  assert(nonAdminStatusRes.status === 403, 'PUT /api/assets/:id/status by project owner returns HTTP 403');

  // -------------------------------------------------------------------------
  // TEST 3: Legitimate Administrator Access (HTTP 200)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Legitimate Administrator Access ---');
  const adminPendingRes = await requestJson(`${baseUrl}/api/user/pending-roles`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminPendingRes.status === 200, 'GET /api/user/pending-roles by ADMIN returns HTTP 200');
  assert(Array.isArray(adminPendingRes.body), 'Returns array of pending roles');

  const adminStatusRes = await requestJson(`${baseUrl}/api/assets/${sampleAsset.id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { projectStatus: 'APPROVED', verificationNotes: 'تأیید مدارک فنی توسط مدیر ارشد' }
  });
  assert(adminStatusRes.status === 200, 'PUT /api/assets/:id/status by ADMIN returns HTTP 200');
  assert(adminStatusRes.body.projectStatus === 'APPROVED', 'Asset projectStatus successfully transitioned to APPROVED');

  // -------------------------------------------------------------------------
  // TEST 4: Direct Request to Dev Privilege-Granting Endpoint (/dev-make-admin)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Direct Requests to /api/user/dev-make-admin Elimination ---');
  const devMakeAdminPostRes = await requestJson(`${baseUrl}/api/user/dev-make-admin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regularUserToken}` }
  });
  assert(devMakeAdminPostRes.status === 404, 'POST /api/user/dev-make-admin returns HTTP 404 NOT_FOUND');
  assert(devMakeAdminPostRes.body.code === 'NOT_FOUND', 'Returns code NOT_FOUND for dev backdoor attempt');

  const devMakeAdminGetRes = await requestJson(`${baseUrl}/api/user/dev-make-admin`, {
    headers: { Authorization: `Bearer ${regularUserToken}` }
  });
  assert(devMakeAdminGetRes.status === 404, 'GET /api/user/dev-make-admin returns HTTP 404 NOT_FOUND');

  // Verify regular user role was NOT escalated in DB
  const regularUserFresh = userRepository.getUserById(regularUser.id);
  const stillNoAdmin = !regularUserFresh?.roles?.includes('ADMIN') && regularUserFresh?.role !== 'ADMIN';
  assert(stillNoAdmin, 'Confirmed: Regular user roles not modified in database');

  // -------------------------------------------------------------------------
  // TEST 5: Normal Project-Owner Workflows
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Normal Project-Owner Workflows ---');
  const createAssetRes = await requestJson(`${baseUrl}/api/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${projectOwnerToken}` },
    body: {
      projectName: 'پروژه ۵۰ کیلووات شیراز',
      location: { city: 'شیراز', lat: null, lon: null },
      capacityKw: 50,
      technology: 'monocrystalline',
      projectLifetimeYears: 25
    }
  });
  assert(createAssetRes.status === 200, 'POST /api/assets creates new project for PROJECT_OWNER');
  assert(createAssetRes.body.id !== undefined, 'New asset created with unique ID');
  assert(createAssetRes.body.ownerId === projectOwnerUser.id, 'Asset ownerId matches PROJECT_OWNER ID');

  // Regular user without PROJECT_OWNER role cannot create projects
  const forbiddenCreateRes = await requestJson(`${baseUrl}/api/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regularUserToken}` },
    body: { projectName: 'پروژه غیرمجاز', capacityKw: 20 }
  });
  assert(forbiddenCreateRes.status === 403, 'POST /api/assets rejected with HTTP 403 for CUSTOMER role');

  const createdAssetId = createAssetRes.body.id;

  // Cross-user access check: another user cannot view draft/private asset of projectOwner
  const anotherUser = userRepository.createUser({
    phone: '+989120000004',
    name: 'کاربر دیگر',
    roles: ['PROJECT_OWNER'],
    activeSubscriptionId: null
  });
  const anotherUserToken = jwtService.sign({
    userId: anotherUser.id,
    phone: anotherUser.phone,
    role: 'PROJECT_OWNER'
  });

  const crossUserGetRes = await requestJson(`${baseUrl}/api/assets/${createdAssetId}`, {
    headers: { Authorization: `Bearer ${anotherUserToken}` }
  });
  assert(crossUserGetRes.status === 403, 'GET /api/assets/:id prevents cross-user access to unapproved asset (HTTP 403)');

  const crossUserPutRes = await requestJson(`${baseUrl}/api/assets/${createdAssetId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${anotherUserToken}` },
    body: { projectName: 'تلاش نفوذ و تغییر نام' }
  });
  assert(crossUserPutRes.status === 403, 'PUT /api/assets/:id prevents cross-user modification of asset (HTTP 403)');

  const ownerGetRes = await requestJson(`${baseUrl}/api/assets/${createdAssetId}`, {
    headers: { Authorization: `Bearer ${projectOwnerToken}` }
  });
  assert(ownerGetRes.status === 200, 'GET /api/assets/:id permits legitimate asset owner (HTTP 200)');

  // -------------------------------------------------------------------------
  // TEST 6: Legitimate Role Request & Admin Approval Flow
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Legitimate Role Request & Admin Approval Flow ---');
  const roleReqRes = await requestJson(`${baseUrl}/api/user/request-role`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${regularUserToken}` }
  });
  assert(roleReqRes.status === 200, 'POST /api/user/request-role succeeds for authenticated user');

  const pendingListRes = await requestJson(`${baseUrl}/api/user/pending-roles`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const foundPending = pendingListRes.body.find((u: any) => u.id === regularUser.id);
  assert(!!foundPending, 'Admin can view requesting user in pending-roles list');

  const approveRoleRes = await requestJson(`${baseUrl}/api/user/${regularUser.id}/approve-role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(approveRoleRes.status === 200, 'Admin successfully approves PROJECT_OWNER role');

  const regularUserApproved = userRepository.getUserById(regularUser.id);
  assert(regularUserApproved?.roles?.includes('PROJECT_OWNER'), 'User database record now contains PROJECT_OWNER role');

  // -------------------------------------------------------------------------
  // TEST 7: Invalid and Expired Authentication Tokens
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Invalid and Expired Authentication Tokens ---');
  const invalidTokenRes = await requestJson(`${baseUrl}/api/user/history`, {
    headers: { Authorization: 'Bearer this_is_an_invalid_tampered_token_xyz' }
  });
  assert(invalidTokenRes.status === 401, 'Tampered token rejected with HTTP 401');

  const expiredToken = jwtService.sign({
    userId: adminUser.id,
    role: 'ADMIN'
  }, { expiresIn: '-10s' });

  const expiredTokenRes = await requestJson(`${baseUrl}/api/user/pending-roles`, {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  assert(expiredTokenRes.status === 401, 'Expired token rejected with HTTP 401');

  // -------------------------------------------------------------------------
  // TEST 8: UI Source Code Inspection — Backdoor & Fallback Elimination
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: UI Source Code Verification ---');
  const adminReviewCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/solar-assets/AdminReview.tsx'), 'utf8');
  const myProjectsCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/solar-assets/MyProjects.tsx'), 'utf8');
  const userApiCode = fs.readFileSync(path.join(ROOT_DIR, 'src/api/user.ts'), 'utf8');

  assert(!adminReviewCode.includes('dev_user'), 'AdminReview.tsx: dev_user fallback eliminated');
  assert(!myProjectsCode.includes('dev_user'), 'MyProjects.tsx: dev_user fallback eliminated');
  assert(!myProjectsCode.includes('dev-make-admin'), 'MyProjects.tsx: dev-make-admin button/call eliminated');
  assert(adminReviewCode.includes('دسترسی مسدود است'), 'AdminReview.tsx: contains clear Persian access-denied state');
  assert(myProjectsCode.includes('دسترسی به بخش مدیریت پروژه‌ها'), 'MyProjects.tsx: contains clear Persian role guidance');
  assert(userApiCode.includes('userRouter.all("/dev-make-admin"'), 'user.ts: dev-make-admin explicitly returns 404');

  // -------------------------------------------------------------------------
  // TEST 9: Immutability Guard Verification
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Repository Immutability Guard ---');
  const postDbHash = sha256(fs.readFileSync(DB_PATH));
  const postReportHash = sha256(fs.readFileSync(MIGRATION_REPORT_PATH));

  assert(postDbHash === BASELINE_DB_HASH, `Repository db.json byte-for-byte identical (${postDbHash})`);
  assert(postReportHash === BASELINE_REPORT_HASH, `POSTGRES_MIGRATION_REPORT.md unmodified (${postReportHash})`);

  // Teardown
  testServer.close();
  isolation.cleanup();

  console.log('========================================================================');
  console.log(`STAGE 10 STEP 2 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
