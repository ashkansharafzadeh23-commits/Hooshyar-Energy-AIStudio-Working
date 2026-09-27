/**
 * Hooshyar Energy — Phase 4 Reliability & Hardening Test Suite (PH-4)
 * 
 * Verifies:
 * 1. Finite configurable timeouts & abort signals
 * 2. Circuit breaker state transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
 * 3. Safe fallback classifications
 * 4. Liveness probe (GET /health/live)
 * 5. Readiness probe (GET /health/ready)
 * 6. Database readiness health abstraction & truthful PostgreSQL reporting
 * 7. Two-tier idempotency (Local in-memory replay & durable domain invariants)
 * 8. External error log redaction (sanitized metadata, zero raw payload dumps)
 * 9. NASA solar irradiance factual boundary (VERIFIED_SOURCE vs REFERENCE_ESTIMATE)
 */

import express from 'express';
import http from 'http';
import { CircuitBreaker } from '../src/reliability/circuitBreaker.js';
import {
  executeWithTimeout,
  callExternalService,
  ExternalServiceTimeoutError,
  DEFAULT_TIMEOUTS
} from '../src/reliability/externalClient.js';
import { extractSafeExternalErrorMetadata } from '../src/reliability/errorRedaction.js';
import { idempotencyMiddleware, idempotencyStore, IDEMPOTENCY_TIERS } from '../src/reliability/idempotency.js';
import { checkDatabaseReadiness } from '../src/database/health.js';
import healthRouter from '../src/api/health.js';
import { getSunHoursForCity } from '../api/lib/solarIrradiance.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';
import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runPH4Tests() {
  console.log(`================================================================`);
  console.log(`HOOSHYAR ENERGY — PRODUCTION HARDENING (PH-4) RELIABILITY SUITE`);
  console.log(`================================================================`);

  const isolation = setupTestDatabaseIsolation('ph4_reliability');

  try {
  // -------------------------------------------------------------
  // TEST 1: TIMEOUTS & ABORT SIGNALS
  // -------------------------------------------------------------
  console.log(`\n--- TEST 1: CONFIGURED TIMEOUTS & SAFE CANCELLATION ---`);

  try {
    await executeWithTimeout(async (signal) => {
      return new Promise((resolve) => setTimeout(() => resolve('completed'), 20));
    }, 'TEST_FAST_SERVICE', 100);
    assert(true, 'Operation completing within timeout succeeds');
  } catch (err) {
    assert(false, 'Fast operation should not fail timeout');
  }

  try {
    await executeWithTimeout(async (signal) => {
      return new Promise((resolve) => setTimeout(() => resolve('too_slow'), 150));
    }, 'TEST_SLOW_SERVICE', 40);
    assert(false, 'Slow operation should have timed out');
  } catch (err: any) {
    assert(err instanceof ExternalServiceTimeoutError, 'Throws ExternalServiceTimeoutError');
    assert(err.statusCode === 504, 'Timeout error status code is 504');
    assert(err.code === 'EXTERNAL_SERVICE_TIMEOUT', 'Timeout error code is EXTERNAL_SERVICE_TIMEOUT');
  }

  // Non-idempotent mutation retry prohibition
  let mutationAttempts = 0;
  try {
    await callExternalService(async () => {
      mutationAttempts++;
      throw new Error('Network timeout during payment initiation');
    }, {
      service: 'PAYMENT_GATEWAY',
      operation: 'initiatePayment',
      timeoutMs: 50,
      isIdempotent: false, // NON-IDEMPOTENT MUTATION
      maxRetries: 3
    });
  } catch (err) {
    assert(mutationAttempts === 1, 'Non-idempotent mutation is strictly NOT retried (attempts === 1)');
  }

  // -------------------------------------------------------------
  // TEST 2: CIRCUIT BREAKER STATE MACHINE
  // -------------------------------------------------------------
  console.log(`\n--- TEST 2: CIRCUIT BREAKER STATE MACHINE ---`);

  const cb = new CircuitBreaker({
    name: 'TEST_BREAKER',
    failureThreshold: 2,
    resetTimeoutMs: 100,
    halfOpenSuccessThreshold: 1
  });

  assert(cb.getState() === 'CLOSED', 'Circuit starts in CLOSED state');

  // Trigger 2 failures to open circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.execute(async () => { throw new Error('API failure'); });
    } catch {}
  }

  assert(cb.getState() === 'OPEN', 'Circuit transitions to OPEN after 2 failures');

  // Fast fail when OPEN
  let underlyingCalled = false;
  try {
    await cb.execute(async () => {
      underlyingCalled = true;
      return 'ok';
    });
    assert(false, 'Should have failed fast while OPEN');
  } catch (err: any) {
    assert(err.code === 'CIRCUIT_BREAKER_OPEN', 'Fails fast with CIRCUIT_BREAKER_OPEN');
    assert(!underlyingCalled, 'Underlying action is NOT invoked when circuit is OPEN');
  }

  // Wait for reset timeout to transition to HALF_OPEN
  await new Promise((r) => setTimeout(r, 120));
  assert(cb.getState() === 'HALF_OPEN', 'Circuit transitions to HALF_OPEN after reset timeout');

  // Probe succeeds in HALF_OPEN -> reset to CLOSED
  await cb.execute(async () => 'probe_success');
  assert(cb.getState() === 'CLOSED', 'Circuit resets to CLOSED upon successful probe in HALF_OPEN');

  // -------------------------------------------------------------
  // TEST 3: EXTERNAL ERROR LOG REDACTION
  // -------------------------------------------------------------
  console.log(`\n--- TEST 3: EXTERNAL ERROR LOG REDACTION ---`);

  const rawGeminiError = {
    status: 404,
    message: '{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available.","status":"NOT_FOUND"}}',
    headers: { authorization: 'Bearer super-secret-key-12345' }
  };

  const safeGemini = extractSafeExternalErrorMetadata('GEMINI_AI', rawGeminiError);
  assert(safeGemini.provider === 'GEMINI_AI', 'Provider is GEMINI_AI');
  assert(safeGemini.httpStatus === 404, 'HTTP status is correctly extracted as 404');
  assert(safeGemini.errorCategory === 'NOT_FOUND', 'Categorized as NOT_FOUND');
  assert(!safeGemini.safeSummary.includes('super-secret-key'), 'Zero sensitive authorization tokens in log summary');
  assert(!safeGemini.safeSummary.includes('models/gemini-2.5-flash'), 'Zero raw response JSON in safe log summary');

  const rawNasaTimeout = new ExternalServiceTimeoutError('NASA_POWER', 10000);
  const safeNasa = extractSafeExternalErrorMetadata('NASA_POWER', rawNasaTimeout);
  assert(safeNasa.errorCategory === 'TIMEOUT', 'Categorized as TIMEOUT');
  assert(safeNasa.isTransient === true, 'Timeout is recognized as transient');

  // -------------------------------------------------------------
  // TEST 4: DATABASE HEALTH ABSTRACTION & READINESS
  // -------------------------------------------------------------
  console.log(`\n--- TEST 4: DATABASE READINESS ABSTRACTION & TRUTHFUL REPORTING ---`);

  const originalDriver = process.env.DB_DRIVER;
  const originalEnv = process.env.NODE_ENV;
  const originalDbUrl = process.env.DATABASE_URL;

  // Scenario A: Dev JSON mode without PostgreSQL
  delete process.env.DB_DRIVER;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = 'development';

  const devResult = await checkDatabaseReadiness();
  assert(devResult.activeDriver === 'json', 'Active driver is json in dev mode');
  assert(devResult.status === 'UP', 'JSON storage is UP in dev mode');
  assert(devResult.postgres.status === 'NOT_CONFIGURED', 'PostgreSQL is truthfully reported as NOT_CONFIGURED');
  assert(devResult.postgres.verified === false, 'PostgreSQL is NOT marked as verified');
  assert(!devResult.details.includes('PostgreSQL UP'), 'PostgreSQL is never falsely claimed UP based on JSON');

  // Scenario B: Production mode with JSON storage (MUST NOT claim PostgreSQL UP)
  process.env.NODE_ENV = 'production';
  delete process.env.DB_DRIVER;
  delete process.env.DATABASE_URL;

  const prodJsonResult = await checkDatabaseReadiness();
  assert(prodJsonResult.status === 'DOWN', 'Production with JSON storage reports database DOWN');
  assert(prodJsonResult.isProductionVerified === false, 'isProductionVerified is false');
  assert(prodJsonResult.postgres.status === 'NOT_CONFIGURED', 'PostgreSQL remains NOT_CONFIGURED in production without URL');

  // Restore env
  process.env.NODE_ENV = originalEnv || 'test';
  if (originalDriver) process.env.DB_DRIVER = originalDriver; else delete process.env.DB_DRIVER;
  if (originalDbUrl) process.env.DATABASE_URL = originalDbUrl; else delete process.env.DATABASE_URL;

  // -------------------------------------------------------------
  // TEST 5: HTTP HEALTH PROBES (LIVENESS & READINESS)
  // -------------------------------------------------------------
  console.log(`\n--- TEST 5: HTTP HEALTH PROBES (LIVE & READY) ---`);

  const app = express();
  app.use(express.json());
  app.use('/health', healthRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 5.1 Liveness Probe
    const liveRes = await fetch(`${baseUrl}/health/live`);
    const liveBody = await liveRes.json();
    assert(liveRes.status === 200, 'GET /health/live returns HTTP 200');
    assert(liveBody.status === 'UP', 'Liveness report status is UP');
    assert(typeof liveBody.uptimeSeconds === 'number', 'Liveness report includes uptimeSeconds');

    // 5.2 Readiness Probe
    const readyRes = await fetch(`${baseUrl}/health/ready`);
    const readyBody = await readyRes.json();
    assert(readyRes.status === 200 || readyRes.status === 503, 'GET /health/ready returns valid status code');
    assert(['READY', 'DEGRADED', 'NOT_READY'].includes(readyBody.status), 'Readiness report status is valid enum');
    assert(readyBody.components.database !== undefined, 'Readiness report contains database component');
    assert(readyBody.components.configuration !== undefined, 'Readiness report contains configuration component');
    assert(readyBody.components.memory !== undefined, 'Readiness report contains memory component');
    assert(readyBody.components.circuitBreakers !== undefined, 'Readiness report contains circuitBreakers');
  } finally {
    server.close();
  }

  // -------------------------------------------------------------
  // TEST 6: TWO-TIER IDEMPOTENCY
  // -------------------------------------------------------------
  console.log(`\n--- TEST 6: TWO-TIER IDEMPOTENCY ---`);

  assert(IDEMPOTENCY_TIERS.LOCAL_IDEMPOTENCY !== undefined, 'LOCAL_IDEMPOTENCY tier is documented');
  assert(IDEMPOTENCY_TIERS.DURABLE_DOMAIN_IDEMPOTENCY !== undefined, 'DURABLE_DOMAIN_IDEMPOTENCY tier is documented');
  assert(IDEMPOTENCY_TIERS.DISTRIBUTED_IDEMPOTENCY.includes('NOT_YET_VERIFIED'), 'DISTRIBUTED_IDEMPOTENCY is truthfully marked NOT_YET_VERIFIED');

  // Test local transport idempotency middleware
  const idemApp = express();
  idemApp.use(express.json());
  let mutationExecCount = 0;

  idemApp.post('/test-idem-mutation', idempotencyMiddleware('test-scope'), (req, res) => {
    mutationExecCount++;
    res.status(201).json({ createdId: 'res-123', count: mutationExecCount });
  });

  const idemServer = http.createServer(idemApp);
  await new Promise<void>((resolve) => idemServer.listen(0, resolve));
  const idemPort = (idemServer.address() as any).port;

  try {
    const key = `idem-key-${Date.now()}`;
    // First request: executes mutation
    const res1 = await fetch(`http://localhost:${idemPort}/test-idem-mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ action: 'create' })
    });
    const body1 = await res1.json();
    assert(res1.status === 201, 'First idempotent request succeeds with 201');
    assert(body1.count === 1, 'First request executes underlying handler (count === 1)');
    assert(res1.headers.get('x-idempotent-replay') === null, 'First request is not marked replay');

    // Second request: replayed from cache
    const res2 = await fetch(`http://localhost:${idemPort}/test-idem-mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ action: 'create' })
    });
    const body2 = await res2.json();
    assert(res2.status === 201, 'Repeated request returns same status 201');
    assert(body2.count === 1, 'Repeated request DOES NOT execute handler again (count remains 1)');
    assert(res2.headers.get('x-idempotent-replay') === 'true', 'Repeated request has X-Idempotent-Replay: true header');
  } finally {
    idemServer.close();
  }

  // -------------------------------------------------------------
  // TEST 7: NASA FACTUAL BOUNDARIES (VERIFIED_SOURCE vs REFERENCE_ESTIMATE)
  // -------------------------------------------------------------
  console.log(`\n--- TEST 7: NASA SOLAR IRRADIANCE FACTUAL BOUNDARIES ---`);

  // City with fallback regional estimate
  const regionalResult = await getSunHoursForCity('شهر_ناشناخته_تستی');
  assert(regionalResult.dataClassification === 'REFERENCE_ESTIMATE', 'Fallback solar estimate has dataClassification = REFERENCE_ESTIMATE');
  assert(regionalResult.isVerifiedSource === false, 'Fallback solar estimate isVerifiedSource === false');
  assert(regionalResult.isReferenceOnly === true, 'Fallback solar estimate isReferenceOnly === true');
  assert(regionalResult.source === 'REGIONAL_REFERENCE_ESTIMATE', 'Fallback solar estimate source is explicitly REGIONAL_REFERENCE_ESTIMATE');
  assert(regionalResult.warning !== undefined, 'Fallback solar estimate carries explanatory warning');

  // Verify cached / verified source properties
  const knownResult = await getSunHoursForCity('تهران');
  assert(['VERIFIED_SOURCE', 'REFERENCE_ESTIMATE'].includes(knownResult.dataClassification), 'Known city returns valid dataClassification');
  if (knownResult.dataClassification === 'VERIFIED_SOURCE') {
    assert(knownResult.isVerifiedSource === true, 'Verified source has isVerifiedSource === true');
    assert(knownResult.isReferenceOnly === false, 'Verified source has isReferenceOnly === false');
  } else {
    assert(knownResult.isReferenceOnly === true, 'Regional fallback is flagged reference only');
  }

  // -------------------------------------------------------------
  // TEST 8: ZERO LEGACY DB BYPASSES IN CRITICAL CODE
  // -------------------------------------------------------------
  console.log(`\n--- TEST 8: ZERO LEGACY DB BYPASSES ---`);

  const healthCode = fs.readFileSync(path.join(process.cwd(), 'src', 'api', 'health.ts'), 'utf8');
  assert(!healthCode.includes("from '../db/index"), 'src/api/health.ts does NOT import db/index');
  assert(!healthCode.includes('db.getUsers'), 'src/api/health.ts does NOT use db.getUsers()');

  const solarCode = fs.readFileSync(path.join(process.cwd(), 'api', 'lib', 'solarIrradiance.js'), 'utf8');
  assert(!solarCode.includes("from '../../src/db/index"), 'api/lib/solarIrradiance.js does NOT import db/index');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log(`\n================================================================`);
  console.log(`PH-4 RELIABILITY TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================`);
  } finally {
    isolation.cleanup();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runPH4Tests();
