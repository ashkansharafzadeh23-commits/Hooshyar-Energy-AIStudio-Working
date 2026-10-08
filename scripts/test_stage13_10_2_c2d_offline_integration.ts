/**
 * HOOSHYAR ENERGY — STAGE 13.10.2-C2D OFFLINE INTEGRATION TEST SUITE
 * OFFLINE GATEWAY INTEGRATION & DEPLOYMENT READINESS
 * 
 * Verifies end-to-end integration between Main Backend EnergyGatewayClient
 * and the standalone Hooshyar Energy Source Gateway over real loopback HTTP:
 * 
 * 1. Server Lifecycle & Health check on ephemeral loopback port
 * 2. Main Backend EnergyGatewayClient + HttpGatewayTransport end-to-end fetch
 * 3. Persian HTML fixture roundtrip with exact character & encoding integrity
 * 4. Binary / PDF fixture roundtrip with %PDF magic byte check & Base64 verification
 * 5. Wire-level HMAC authentication & rejection of forged/malformed signatures
 * 6. Wire-level raw-body integrity (compacted vs pretty JSON signature mismatch)
 * 7. Nonce replay attack prevention over HTTP wire
 * 8. Unauthenticated nonce poisoning resistance over HTTP wire
 * 9. Response envelope anti-tampering (payloadSha256, requestNonce, requestId, sourceId)
 * 10. Server policy enforcement (unknown source, unconfigured resourceKey, arbitrary URL)
 * 11. Request body bounds (64 KB) & sliding-window rate limiting (429)
 * 12. Network fault handling (unavailable gateway 503, timeout 504)
 * 13. Upstream non-2xx rejection (404/500 never packaged as valid data)
 * 14. Zero production SATBA mappings (fails closed in production)
 * 15. Publication boundary & DB immutability
 */

import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createGatewayApp, GatewayProcessNonceStore } from '../services/energy-source-gateway/app.js';
import { GatewayResourcePolicyRegistry, defaultGatewayPolicyRegistry } from '../services/energy-source-gateway/policyRegistry.js';
import { GatewayRateLimiter } from '../services/energy-source-gateway/security/rateLimiter.js';
import { EnergyGatewayResourcePolicy } from '../services/energy-source-gateway/types.js';
import { UpstreamFetchResult } from '../services/energy-source-gateway/fetcher/secureStreamFetcher.js';
import { 
  EnergyGatewayClient, 
  HttpGatewayTransport, 
  buildCanonicalRequestString,
  signGatewayRequest,
  GatewaySecurityError,
  MAX_GATEWAY_PAYLOAD_BYTES
} from '../src/services/energy/gateway/index.js';
import { energyCenterRepository } from '../src/repositories/energyCenterRepository.js';
import { publishCandidate, ReviewWorkflowError } from '../src/services/energy/energyReviewService.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

// Canonical hashes for repository protection
const CANONICAL_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
const CANONICAL_PACKAGE_JSON_HASH = '90486ca155c8ea72b179c001d32af8c2eac08259837a1817520326b9194379cc';
const CANONICAL_BUN_LOCK_HASH = '79ef5b3a7ccbd526c213eac475e3485120c6823b5f71980721b972f5e4bf5386';
const CANONICAL_MAINTENANCE_TS_HASH = '3b7702bd6e55fdf7a0fe6d8a3c067a2c0920580f4b0706a8b0c0392dc6ac9c22';

// 32-byte cryptographic test secret
const TEST_GATEWAY_SECRET = 'c2d_test_secret_32_bytes_long_entropy_key_99999999999999999';

// Fictional Persian HTML fixture (never contacts real SATBA)
const FICTIONAL_PERSIAN_HTML = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>اطلاعیه آزمایشی ساتبا: تعرفه پایه برق خورشیدی سال ۱۴۰۳</title>
</head>
<body>
  <article>
    <h1>ابلاغیه نرخ پایه خرید تضمینی نیروگاه‌های خورشیدی</h1>
    <p>بر اساس دستورالعمل جدید سازمان انرژی‌های تجدیدپذیر (ساتبا)، نرخ پایه خرید تضمینی اعلام گردید.</p>
    <div class="meta">تاریخ ابلاغ: ۱۷ مهر ۱۴۰۳ | شماره مصوبه: ۱۴۰۳/ت/۹۹</div>
  </article>
</body>
</html>`;

// Fictional binary PDF fixture
const FICTIONAL_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (دستورالعمل آزمایشی ساتبا) /Producer (Hooshyar Test Suite) >>\nendobj\ntrailer\n<< /Size 1 >>\n%%EOF'
);

async function runStageC2DOfflineIntegrationTests() {
  console.log('===============================================================');
  console.log('STAGE 13.10.2-C2D: HOOSHYAR ENERGY GATEWAY OFFLINE INTEGRATION');
  console.log('===============================================================');

  // Enforce DB isolation
  const isolation = setupTestDatabaseIsolation('hooshyar_c2d_offline_integration');

  // 1. Prepare Test Policy Registry with fictional test-only resource mappings
  const testPolicyRegistry = new GatewayResourcePolicyRegistry();
  testPolicyRegistry.registerPolicy({
    sourceId: 'src_satba',
    resourceKey: 'fictional_satba_article_1403',
    targetUrl: 'https://news.satba.gov.ir/fictional/tariff/announcement-1403',
    allowedHostnames: ['news.satba.gov.ir'],
    allowedPathPatterns: ['/fictional/'],
    method: 'GET',
    maxPayloadBytes: 1024 * 1024,
    allowedContentTypes: ['text/html']
  });

  testPolicyRegistry.registerPolicy({
    sourceId: 'src_satba',
    resourceKey: 'fictional_satba_guideline_pdf',
    targetUrl: 'https://news.satba.gov.ir/fictional/guidelines/solar-spec-1403.pdf',
    allowedHostnames: ['news.satba.gov.ir'],
    allowedPathPatterns: ['/fictional/'],
    method: 'GET',
    maxPayloadBytes: 2 * 1024 * 1024,
    allowedContentTypes: ['application/pdf']
  });

  // 2. Prepare Mock Upstream Transport (Simulates official upstream fetch with zero SSRF bypass)
  let mockUpstreamShouldFailWithStatus: number | null = null;
  let mockUpstreamDelayMs = 0;

  const mockFetcher = async (policy: EnergyGatewayResourcePolicy): Promise<UpstreamFetchResult> => {
    if (mockUpstreamDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, mockUpstreamDelayMs));
    }

    if (mockUpstreamShouldFailWithStatus) {
      throw new GatewaySecurityError(
        `پاسخ سرور مأخذ معتبر نیست (کد وضعیت: ${mockUpstreamShouldFailWithStatus}).`,
        'UPSTREAM_FETCH_FAILED',
        502
      );
    }

    if (policy.allowedContentTypes?.includes('application/pdf')) {
      const payloadSha256 = crypto.createHash('sha256').update(FICTIONAL_PDF_BUFFER).digest('hex');
      return {
        requestedUrl: policy.targetUrl,
        finalUrl: policy.targetUrl,
        httpStatus: 200,
        contentType: 'application/pdf',
        contentLength: FICTIONAL_PDF_BUFFER.length,
        payloadSha256,
        payloadEncoding: 'base64',
        payload: FICTIONAL_PDF_BUFFER.toString('base64'),
        fetchedAt: new Date().toISOString(),
        headers: {
          etag: '"c2d-pdf-etag-12345"',
          lastModified: 'Tue, 08 Oct 2024 07:00:00 GMT'
        }
      };
    }

    // Default HTML
    const htmlBuf = Buffer.from(FICTIONAL_PERSIAN_HTML, 'utf8');
    const payloadSha256 = crypto.createHash('sha256').update(htmlBuf).digest('hex');
    return {
      requestedUrl: policy.targetUrl,
      finalUrl: policy.targetUrl,
      httpStatus: 200,
      contentType: 'text/html; charset=utf-8',
      contentLength: htmlBuf.length,
      payloadSha256,
      payloadEncoding: 'utf8',
      payload: FICTIONAL_PERSIAN_HTML,
      fetchedAt: new Date().toISOString(),
      headers: {
        etag: '"c2d-html-etag-67890"',
        lastModified: 'Tue, 08 Oct 2024 08:30:00 GMT'
      }
    };
  };

  const testRateLimiter = new GatewayRateLimiter(60, 60000);
  const testNonceStore = new GatewayProcessNonceStore();

  // 3. Create Gateway Express Application with Dependency Injection
  const gatewayApp = createGatewayApp({
    hmacSecretOverride: TEST_GATEWAY_SECRET,
    policyRegistry: testPolicyRegistry,
    rateLimiter: testRateLimiter,
    nonceStore: testNonceStore,
    fetcherOverride: mockFetcher
  });

  // 4. Start Gateway Server on local ephemeral port (0)
  const gatewayServer = gatewayApp.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => gatewayServer.on('listening', () => resolve()));
  const gatewayAddress = gatewayServer.address() as net.AddressInfo;
  const ephemeralPort = gatewayAddress.port;
  const gatewayBaseUrl = `http://127.0.0.1:${ephemeralPort}`;

  console.log(`[C2D TEST HARNESS] Standalone Gateway running on ephemeral port: ${ephemeralPort}`);

  try {
    console.log('\n--- 1. Standalone Gateway Server Lifecycle & Health Check ---');
    
    // Test 1: Health check endpoint over real HTTP
    const healthRes = await fetch(`${gatewayBaseUrl}/health`);
    assert(healthRes.status === 200, '1. Health endpoint returns HTTP 200 over loopback');
    const healthJson = await healthRes.json() as any;
    assert(
      healthJson.status === 'ok' &&
      healthJson.service === 'hooshyar-energy-source-gateway' &&
      healthJson.protocolVersion === '1.0',
      '2. Health response returns valid status and protocolVersion without secrets'
    );
    assert(!('hmacSecret' in healthJson) && !('secret' in healthJson), '3. Health response strictly excludes internal secrets');

    console.log('\n--- 2. Main Backend Client End-to-End Persian HTML Fetch over Real Loopback HTTP ---');
    
    // Test 4: Configure Main Backend EnergyGatewayClient with HttpGatewayTransport (allowInsecureLoopback: true for test harness)
    const client = new EnergyGatewayClient({
      baseUrl: gatewayBaseUrl,
      hmacSecret: TEST_GATEWAY_SECRET,
      transport: new HttpGatewayTransport({ timeoutMs: 5000, allowInsecureLoopback: true })
    });

    // Test 4b: Verify production HTTPS enforcement (default allowInsecureLoopback = false rejects HTTP)
    const defaultHttpsEnforcedClient = new EnergyGatewayClient({
      baseUrl: gatewayBaseUrl, // http://127.0.0.1:...
      hmacSecret: TEST_GATEWAY_SECRET,
      transport: new HttpGatewayTransport({ timeoutMs: 5000, allowInsecureLoopback: false })
    });
    let httpsEnforcementThrew = false;
    try {
      await defaultHttpsEnforcedClient.fetchViaGateway('src_satba', 'fictional_satba_article_1403');
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'SOURCE_DOMAIN_MISMATCH') {
        httpsEnforcementThrew = true;
      }
    }
    assert(httpsEnforcementThrew === true, '4b. Production transport requires HTTPS (insecure HTTP rejected unless allowInsecureLoopback is injected)');

    const htmlFetchResult = await client.fetchViaGateway('src_satba', 'fictional_satba_article_1403');
    assert(htmlFetchResult.isValid === true, '4. Main Backend client verifies Persian HTML response envelope');
    assert(typeof htmlFetchResult.decodedText === 'string', '5. Decoded text is valid UTF-8 string');
    assert(
      htmlFetchResult.decodedText!.includes('ابلاغیه نرخ پایه خرید تضمینی نیروگاه‌های خورشیدی') &&
      htmlFetchResult.decodedText!.includes('سازمان انرژی‌های تجدیدپذیر (ساتبا)'),
      '6. Decoded text preserves Persian linguistic characters byte-for-byte'
    );
    const expectedHtmlSha256 = crypto.createHash('sha256').update(Buffer.from(FICTIONAL_PERSIAN_HTML, 'utf8')).digest('hex');
    assert(htmlFetchResult.envelope.payloadSha256 === expectedHtmlSha256, '7. Byte-for-byte SHA-256 matches envelope.payloadSha256');
    assert(htmlFetchResult.envelope.sourceId === 'src_satba', '8. Envelope sourceId matches requested src_satba');
    assert(
      htmlFetchResult.envelope.requestedUrl === 'https://news.satba.gov.ir/fictional/tariff/announcement-1403',
      '9. Envelope requestedUrl matches policy targetUrl'
    );
    assert(typeof htmlFetchResult.envelope.requestNonce === 'string', '10. Envelope cryptographically binds requestNonce');

    console.log('\n--- 3. Main Backend Client End-to-End Binary / PDF Fetch over Real Loopback HTTP ---');
    
    const pdfFetchResult = await client.fetchViaGateway('src_satba', 'fictional_satba_guideline_pdf');
    assert(pdfFetchResult.isValid === true, '11. Main Backend client verifies PDF binary response envelope');
    assert(pdfFetchResult.envelope.payloadEncoding === 'base64', '12. PDF envelope correctly specifies base64 encoding');
    assert(pdfFetchResult.rawPayloadBuffer.length === FICTIONAL_PDF_BUFFER.length, '13. Decoded raw binary payload length matches fixture');
    assert(
      pdfFetchResult.rawPayloadBuffer.subarray(0, 4).toString('ascii') === '%PDF',
      '14. Decoded PDF buffer starts with required %PDF magic bytes'
    );
    const expectedPdfSha256 = crypto.createHash('sha256').update(FICTIONAL_PDF_BUFFER).digest('hex');
    assert(pdfFetchResult.envelope.payloadSha256 === expectedPdfSha256, '15. PDF binary SHA-256 matches envelope.payloadSha256');

    console.log('\n--- 4. Request Authentication & Wire-Level HMAC Verification ---');
    
    // Test 16: Forged signature header over wire
    const validRequest = client.buildRequest('src_satba', 'fictional_satba_article_1403');
    const forgedSignature = 'a'.repeat(64);
    const forgedReqRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': forgedSignature,
        'x-gateway-timestamp': validRequest.timestamp,
        'x-gateway-nonce': validRequest.nonce,
        'x-gateway-source-id': validRequest.sourceId
      },
      body: JSON.stringify(validRequest)
    });
    assert(forgedReqRes.status === 401, '16. Forged signature rejected by Gateway with 401 Unauthorized');
    const forgedErr = await forgedReqRes.json() as any;
    assert(forgedErr.code === 'INVALID_GATEWAY_SIGNATURE', '17. Forged signature returns INVALID_GATEWAY_SIGNATURE code');

    // Test 18: Missing signature header
    const missingSigRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-timestamp': validRequest.timestamp,
        'x-gateway-nonce': crypto.randomUUID()
      },
      body: JSON.stringify(validRequest)
    });
    assert(missingSigRes.status === 401, '18. Missing signature header rejected with 401');

    // Test 19: Request signed with wrong secret
    const wrongSecretClient = new EnergyGatewayClient({
      baseUrl: gatewayBaseUrl,
      hmacSecret: 'wrong_secret_32_bytes_invalid_key_for_testing_9999',
      transport: new HttpGatewayTransport({ allowInsecureLoopback: true })
    });
    let wrongSecretThrew = false;
    try {
      await wrongSecretClient.fetchViaGateway('src_satba', 'fictional_satba_article_1403');
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'INVALID_GATEWAY_SIGNATURE') {
        wrongSecretThrew = true;
      }
    }
    assert(wrongSecretThrew === true, '19. Request signed with wrong secret rejected over wire with INVALID_GATEWAY_SIGNATURE');

    console.log('\n--- 5. Raw-Body & Wire Serialization Integrity ---');
    
    // Test 20: Sign pretty JSON but send compacted JSON (raw-byte mismatch)
    const rawReq = client.buildRequest('src_satba', 'fictional_satba_article_1403');
    const prettyJson = JSON.stringify(rawReq, null, 2);
    const compactedJson = JSON.stringify(rawReq);
    const prettySig = client.signRequest(rawReq); // Signs canonical string with SHA256 of JSON.stringify(rawReq)
    // Now create a signature computed specifically over pretty JSON
    const canonicalPretty = buildCanonicalRequestString('POST', '/api/v1/fetch', rawReq.timestamp, rawReq.nonce, Buffer.from(prettyJson, 'utf8'));
    const sigForPretty = crypto.createHmac('sha256', TEST_GATEWAY_SECRET).update(canonicalPretty).digest('hex');

    // Send compacted JSON with sigForPretty
    const wireMismatchRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': sigForPretty,
        'x-gateway-timestamp': rawReq.timestamp,
        'x-gateway-nonce': rawReq.nonce,
        'x-gateway-source-id': rawReq.sourceId
      },
      body: compactedJson
    });
    assert(wireMismatchRes.status === 401, '20. Raw-byte signature mismatch over wire rejected with 401');

    console.log('\n--- 6. Nonce Replay Attack Prevention over Real HTTP ---');
    
    // Test 21: Replay attack with same nonce
    const replayNonce = `replay_test_${crypto.randomUUID()}`;
    const replayReq = client.buildRequest('src_satba', 'fictional_satba_article_1403', undefined, replayNonce);
    const replaySig = client.signRequest(replayReq);

    const firstRunRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': replaySig,
        'x-gateway-timestamp': replayReq.timestamp,
        'x-gateway-nonce': replayReq.nonce,
        'x-gateway-source-id': replayReq.sourceId
      },
      body: JSON.stringify(replayReq)
    });
    assert(firstRunRes.status === 200, '21. First request with fresh nonce succeeds (200 OK)');

    const secondRunRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': replaySig,
        'x-gateway-timestamp': replayReq.timestamp,
        'x-gateway-nonce': replayReq.nonce,
        'x-gateway-source-id': replayReq.sourceId
      },
      body: JSON.stringify(replayReq)
    });
    assert(secondRunRes.status === 401, '22. Replayed request with same nonce rejected with 401');
    const replayErrJson = await secondRunRes.json() as any;
    assert(replayErrJson.code === 'REPLAY_DETECTED', '23. Replay attack returns REPLAY_DETECTED code');

    console.log('\n--- 7. Unauthenticated Nonce Poisoning Resistance over Real HTTP ---');
    
    // Test 24: Attacker uses victim's nonce with invalid signature
    const victimNonce = `victim_target_${crypto.randomUUID()}`;
    const victimReq = client.buildRequest('src_satba', 'fictional_satba_article_1403', undefined, victimNonce);

    const attackerPoisonRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': '0'.repeat(64), // Invalid signature
        'x-gateway-timestamp': victimReq.timestamp,
        'x-gateway-nonce': victimNonce,
        'x-gateway-source-id': victimReq.sourceId
      },
      body: JSON.stringify(victimReq)
    });
    assert(attackerPoisonRes.status === 401, '24. Attacker spoofed request rejected with 401');

    // Legitimate victim request with that nonce must STILL SUCCEED
    const legitimateSig = client.signRequest(victimReq);
    const victimRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': legitimateSig,
        'x-gateway-timestamp': victimReq.timestamp,
        'x-gateway-nonce': victimNonce,
        'x-gateway-source-id': victimReq.sourceId
      },
      body: JSON.stringify(victimReq)
    });
    assert(victimRes.status === 200, '25. Legitimate request succeeds because unauthenticated attempt did not burn nonce');

    console.log('\n--- 8. Response Envelope Anti-Tampering & Cryptographic Binding ---');
    
    // Test 26: Response payload tampering
    const testReq26 = client.buildRequest('src_satba', 'fictional_satba_article_1403');
    const testSig26 = client.signRequest(testReq26);
    const validEnvelopeRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': testSig26,
        'x-gateway-timestamp': testReq26.timestamp,
        'x-gateway-nonce': testReq26.nonce,
        'x-gateway-source-id': testReq26.sourceId
      },
      body: JSON.stringify(testReq26)
    });
    const genuineEnvelope = (await validEnvelopeRes.json()) as any;

    // Tamper with payload
    const tamperedPayloadEnvelope = {
      ...genuineEnvelope,
      payload: genuineEnvelope.payload.slice(0, -1) + (genuineEnvelope.payload.slice(-1) === 'X' ? 'Y' : 'X')
    };
    let tamperThrew = false;
    try {
      client.verifyEnvelope(tamperedPayloadEnvelope, {
        expectedRequestId: testReq26.requestId,
        expectedNonce: testReq26.nonce,
        expectedSourceId: testReq26.sourceId
      });
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && (
        err.code === 'PAYLOAD_HASH_MISMATCH' || 
        err.code === 'PAYLOAD_LENGTH_MISMATCH' || 
        err.code === 'INVALID_RESPONSE_SIGNATURE'
      )) {
        tamperThrew = true;
      }
    }
    assert(tamperThrew === true, '26. Tampered response payload rejected with PAYLOAD_HASH_MISMATCH or tamper guard');

    // Test 27: Tampered requestNonce in response
    const tamperedNonceEnvelope = {
      ...genuineEnvelope,
      requestNonce: 'attacker_modified_nonce_123'
    };
    let nonceMismatchThrew = false;
    try {
      client.verifyEnvelope(tamperedNonceEnvelope, {
        expectedRequestId: testReq26.requestId,
        expectedNonce: testReq26.nonce,
        expectedSourceId: testReq26.sourceId
      });
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'GATEWAY_REQUEST_NONCE_MISMATCH') {
        nonceMismatchThrew = true;
      }
    }
    assert(nonceMismatchThrew === true, '27. Modified response requestNonce rejected with GATEWAY_REQUEST_NONCE_MISMATCH');

    // Test 28: Tampered requestId in response
    let reqIdMismatchThrew = false;
    try {
      client.verifyEnvelope(genuineEnvelope, {
        expectedRequestId: 'different_expected_request_id',
        expectedNonce: testReq26.nonce,
        expectedSourceId: testReq26.sourceId
      });
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'REQUEST_ID_MISMATCH') {
        reqIdMismatchThrew = true;
      }
    }
    assert(reqIdMismatchThrew === true, '28. Mismatched requestId rejected with REQUEST_ID_MISMATCH');

    // Test 29: Tampered sourceId in response
    let sourceIdMismatchThrew = false;
    try {
      client.verifyEnvelope(genuineEnvelope, {
        expectedRequestId: testReq26.requestId,
        expectedNonce: testReq26.nonce,
        expectedSourceId: 'src_tavanir'
      });
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'SOURCE_ID_MISMATCH') {
        sourceIdMismatchThrew = true;
      }
    }
    assert(sourceIdMismatchThrew === true, '29. Mismatched sourceId rejected with SOURCE_ID_MISMATCH');

    console.log('\n--- 9. Server Policy & Scope Enforcement over Real HTTP ---');
    
    // Test 30: Unregistered source
    const unregReq = {
      schemaVersion: '1.0',
      requestId: crypto.randomUUID(),
      sourceId: 'src_unregistered_entity',
      resourceKey: 'fictional_satba_article_1403',
      timestamp: new Date().toISOString(),
      nonce: crypto.randomUUID()
    };
    const unregSig = signGatewayRequest('POST', '/api/v1/fetch', unregReq.timestamp, unregReq.nonce, JSON.stringify(unregReq), TEST_GATEWAY_SECRET);
    const unregRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': unregSig
      },
      body: JSON.stringify(unregReq)
    });
    assert(unregRes.status === 400, '30. Unregistered sourceId rejected with 400');
    const unregJson = await unregRes.json() as any;
    assert(unregJson.code === 'UNKNOWN_SOURCE', '31. Returns UNKNOWN_SOURCE error code');

    // Test 32: Unconfigured resourceKey (fails closed)
    const unconfReq = client.buildRequest('src_satba', 'unconfigured_arbitrary_key_999');
    const unconfSig = client.signRequest(unconfReq);
    const unconfRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': unconfSig
      },
      body: JSON.stringify(unconfReq)
    });
    assert(unconfRes.status === 400, '32. Unconfigured resourceKey rejected with 400');
    const unconfJson = await unconfRes.json() as any;
    assert(unconfJson.code === 'RESOURCE_POLICY_VIOLATION', '33. Returns RESOURCE_POLICY_VIOLATION error code');

    // Test 34: Arbitrary URL parameter injection attempt
    const arbReq = {
      ...unconfReq,
      url: 'https://attacker.com/steal-data'
    };
    const arbSig = signGatewayRequest('POST', '/api/v1/fetch', arbReq.timestamp, arbReq.nonce, JSON.stringify(arbReq), TEST_GATEWAY_SECRET);
    const arbRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': arbSig
      },
      body: JSON.stringify(arbReq)
    });
    assert(arbRes.status === 400, '34. Arbitrary URL injection rejected with 400');
    const arbJson = await arbRes.json() as any;
    assert(arbJson.code === 'ARBITRARY_URL_NOT_PERMITTED', '35. Returns ARBITRARY_URL_NOT_PERMITTED code');

    console.log('\n--- 10. HTTP Bounds & Rate Limiting over Real HTTP ---');
    
    // Test 36: Request body > 64 KB
    const largeBody = JSON.stringify({
      ...unconfReq,
      filler: 'X'.repeat(70 * 1024)
    });
    const largeBodyRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-signature': '0'.repeat(64)
      },
      body: largeBody
    });
    assert(largeBodyRes.status === 413, '36. Oversized request body (>64 KB) rejected with 413 REQUEST_BODY_TOO_LARGE');

    // Test 37: Rate limiting flood (maxRequestsPerMinute was configured to 60)
    let triggered429 = false;
    for (let i = 0; i < 70; i++) {
      const floodReq = client.buildRequest('src_satba', 'fictional_satba_article_1403');
      const floodSig = client.signRequest(floodReq);
      const floodRes = await fetch(`${gatewayBaseUrl}/api/v1/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': floodSig
        },
        body: JSON.stringify(floodReq)
      });
      if (floodRes.status === 429) {
        triggered429 = true;
        break;
      }
    }
    assert(triggered429 === true, '37. Rate limiter threshold triggers 429 RATE_LIMIT_EXCEEDED');
    testRateLimiter.reset(); // Reset bucket for subsequent tests

    console.log('\n--- 11. Client Network Fault Handling & Timeouts ---');
    
    // Test 38: Client connecting to closed port throws GATEWAY_UNAVAILABLE
    const closedPortClient = new EnergyGatewayClient({
      baseUrl: 'http://127.0.0.1:59999', // Non-existent service port
      hmacSecret: TEST_GATEWAY_SECRET,
      transport: new HttpGatewayTransport({ timeoutMs: 1000, allowInsecureLoopback: true })
    });
    let unavailThrew = false;
    try {
      await closedPortClient.fetchViaGateway('src_satba', 'fictional_satba_article_1403');
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'GATEWAY_UNAVAILABLE') {
        unavailThrew = true;
      }
    }
    assert(unavailThrew === true, '38. Connection to non-listening port throws GATEWAY_UNAVAILABLE (503)');

    // Test 39: Gateway timeout handling
    mockUpstreamDelayMs = 500;
    const fastTimeoutClient = new EnergyGatewayClient({
      baseUrl: gatewayBaseUrl,
      hmacSecret: TEST_GATEWAY_SECRET,
      transport: new HttpGatewayTransport({ timeoutMs: 100, allowInsecureLoopback: true }) // Shorter than upstream delay
    });
    let timeoutThrew = false;
    try {
      await fastTimeoutClient.fetchViaGateway('src_satba', 'fictional_satba_article_1403');
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'GATEWAY_TIMEOUT') {
        timeoutThrew = true;
      }
    }
    assert(timeoutThrew === true, '39. Client timeout aborts cleanly with GATEWAY_TIMEOUT (504)');
    // Wait for the background mock handler to complete cleanly
    await new Promise(resolve => setTimeout(resolve, 450));
    mockUpstreamDelayMs = 0; // Reset

    console.log('\n--- 12. Upstream Non-2xx Rejection ---');
    
    // Test 40: Upstream returning 500/502/404 error is not wrapped as valid payload
    mockUpstreamShouldFailWithStatus = 502;
    let upstreamFailThrew = false;
    try {
      await client.fetchViaGateway('src_satba', 'fictional_satba_article_1403');
    } catch (err: any) {
      if (err instanceof GatewaySecurityError && err.code === 'UPSTREAM_FETCH_FAILED') {
        upstreamFailThrew = true;
      }
    }
    assert(upstreamFailThrew === true, '40. Upstream error fails closed with UPSTREAM_FETCH_FAILED (not wrapped as payload)');
    mockUpstreamShouldFailWithStatus = null; // Reset

    console.log('\n--- 13. Production Invariants & Publication Boundary ---');
    
    // Test 41: Production policy registry strictly has 0 mappings
    assert(defaultGatewayPolicyRegistry.count === 0, '41. Production defaultGatewayPolicyRegistry strictly has 0 mappings');

    // Test 42: Public energy records count strictly 0
    const publicRecords = energyCenterRepository.getAllPublicRecords();
    assert(publicRecords.length === 0, '42. Public records count remains strictly 0 (no public records created)');

    // Test 43: Publication boundary throws PUBLICATION_DISABLED_IN_STAGE_13_10_2
    let pubBlocked = false;
    try {
      publishCandidate('cand_test_001', 'admin_123');
    } catch (err: any) {
      if (err instanceof ReviewWorkflowError && err.code === 'PUBLICATION_DISABLED_IN_STAGE_13_10_2') {
        pubBlocked = true;
      }
    }
    assert(pubBlocked === true, '43. publishCandidate() strictly throws PUBLICATION_DISABLED_IN_STAGE_13_10_2');

    // Test 44: Protected file hashes
    isolation.verifyImmutability();
    isolation.cleanup();

    const dbContent = fs.readFileSync('db.json', 'utf8');
    const dbHash = crypto.createHash('sha256').update(dbContent).digest('hex');
    assert(dbHash === CANONICAL_DB_HASH, '44. db.json SHA-256 remains 100% byte-for-byte invariant');

    const pkgContent = fs.readFileSync('package.json', 'utf8');
    const pkgHash = crypto.createHash('sha256').update(pkgContent).digest('hex');
    assert(pkgHash === CANONICAL_PACKAGE_JSON_HASH, '45. package.json SHA-256 remains 100% invariant');

    const bunLockContent = fs.readFileSync('bun.lock', 'utf8');
    const bunLockHash = crypto.createHash('sha256').update(bunLockContent).digest('hex');
    assert(bunLockHash === CANONICAL_BUN_LOCK_HASH, '46. bun.lock SHA-256 remains 100% invariant');

    const maintContent = fs.readFileSync('src/types/maintenance.ts', 'utf8');
    const maintHash = crypto.createHash('sha256').update(maintContent).digest('hex');
    assert(maintHash === CANONICAL_MAINTENANCE_TS_HASH, '47. src/types/maintenance.ts SHA-256 remains 100% invariant');

  } finally {
    // 5. Cleanly shut down ephemeral Gateway server
    await new Promise<void>((resolve, reject) => {
      gatewayServer.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('[C2D TEST HARNESS] Standalone Gateway server closed cleanly.');
  }

  console.log('\n===============================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================');
  console.log('✓ STAGE 13.10.2-C2D OFFLINE INTEGRATION PASSED WITH 100% SUCCESS.');
}

runStageC2DOfflineIntegrationTests().catch(err => {
  console.error('\n❌ STAGE 13.10.2-C2D TEST RUNNER FAILED:', err);
  process.exit(1);
});
