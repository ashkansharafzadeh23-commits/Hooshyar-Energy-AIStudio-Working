/**
 * HOOSHYAR ENERGY — STAGE 13.10.2-C2B VERIFICATION TEST SUITE
 * SECURE SOURCE GATEWAY CONTRACT & BACKEND FOUNDATION
 * 
 * Verifies all 36 specified security, protocol, and contract invariants:
 * - Deterministic HMAC request signing & canonical string construction
 * - Constant-time verification & malformed signature resilience
 * - Timestamp skew boundaries & sliding-window replay protection
 * - Official domain and subdomain validation without deceptive bypasses
 * - Payload decoding (UTF-8, Base64), actual length, and SHA-256 integrity
 * - 5 MB size ceilings and %PDF magic byte enforcement
 * - Versioned envelope response signing and anti-tampering verification
 * - Strict publication boundary: 0 public records, publication disabled
 * - Database immutability (db.json canonical hash invariant)
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { 
  GatewayFetchRequest, 
  GatewayFetchResponseEnvelope 
} from '../src/types/energyGateway.js';
import { 
  getGatewayHmacSecret,
  timingSafeEqualHex,
  buildCanonicalRequestString,
  signGatewayRequest,
  verifyGatewayRequestSignature,
  buildCanonicalResponseString,
  signGatewayResponseEnvelope,
  verifyGatewayResponseSignature,
  validateTimestampFreshness,
  decodeAndVerifyPayload,
  MAX_GATEWAY_PAYLOAD_BYTES
} from '../src/services/energy/gateway/gatewayCrypto.js';
import { 
  InMemoryGatewayNonceStore, 
  generateGatewayNonce 
} from '../src/services/energy/gateway/nonceStore.js';
import { 
  GatewaySecurityError 
} from '../src/services/energy/gateway/gatewayErrors.js';
import { 
  EnergyGatewayClient, 
  IGatewayTransport 
} from '../src/services/energy/gateway/energyGatewayClient.js';
import { 
  defaultResourcePolicyRegistry 
} from '../src/services/energy/gateway/resourcePolicyRegistry.js';
import { energyCenterRepository } from '../src/repositories/energyCenterRepository.js';
import { publishCandidate, ReviewWorkflowError } from '../src/services/energy/energyReviewService.js';
import { setupTestDatabaseIsolation } from './test_isolation_guard.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    process.exitCode = 1;
  }
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('STAGE 13.10.2-C2B: SOURCE GATEWAY CONTRACT VERIFICATION SUITE');
  console.log('===============================================================\n');

  // Database isolation guard
  const isolation = setupTestDatabaseIsolation('gateway_contract_test');

  const TEST_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const OTHER_SECRET = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  // --------------------------------------------------------------------------
  // GROUP 1: Request Signing, Canonical Representation & Verification
  // --------------------------------------------------------------------------
  console.log('--- 1. Request Signing & HMAC Verification ---');

  const testBody = JSON.stringify({
    schemaVersion: '1.0',
    requestId: 'req_test_01',
    sourceId: 'src_satba',
    resourceKey: 'official_news_index',
    timestamp: '2026-10-07T12:00:00.000Z',
    nonce: 'nonce_test_01'
  });

  // 1. Valid request signing
  const sig1 = signGatewayRequest('POST', '/api/v1/fetch', '2026-10-07T12:00:00.000Z', 'nonce_test_01', testBody, TEST_SECRET);
  assert(/^[0-9a-f]{64}$/.test(sig1), '1. Valid request signing generates 64-char hex signature');

  // 2. Deterministic canonical string
  const can1 = buildCanonicalRequestString('POST', '/api/v1/fetch', '2026-10-07T12:00:00.000Z', 'nonce_test_01', testBody);
  const can2 = buildCanonicalRequestString('POST', '/api/v1/fetch', '2026-10-07T12:00:00.000Z', 'nonce_test_01', testBody);
  assert(can1 === can2, '2. Canonical request string is 100% deterministic');

  // 3. Invalid secret / signature
  const isValidOtherSecret = verifyGatewayRequestSignature(sig1, 'POST', '/api/v1/fetch', '2026-10-07T12:00:00.000Z', 'nonce_test_01', testBody, OTHER_SECRET);
  assert(isValidOtherSecret === false, '3. Signature verified with wrong secret is rejected');

  // 4. Malformed signature
  assert(timingSafeEqualHex('malformed_sig', sig1) === false, '4. Malformed signature string rejected safely');
  assert(timingSafeEqualHex('', sig1) === false, '4b. Empty signature string rejected safely');

  // 5. Timing-safe verification path
  assert(timingSafeEqualHex(sig1, sig1) === true, '5. Timing-safe equality returns true for identical signatures');
  const tamperedSig = sig1.slice(0, 62) + (sig1.endsWith('a') ? 'b' : 'a');
  assert(timingSafeEqualHex(sig1, tamperedSig) === false, '5b. Timing-safe equality returns false for 1-bit discrepancy');

  // --------------------------------------------------------------------------
  // GROUP 2: Timestamp Freshness & Skew Policy
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Timestamp Skew Policy ---');
  const baseNow = Date.now();

  // 6. Expired timestamp (>300s in past)
  const expiredPastIso = new Date(baseNow - 301 * 1000).toISOString();
  let expiredCaught = false;
  try {
    validateTimestampFreshness(expiredPastIso, baseNow);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'REQUEST_TIMESTAMP_EXPIRED') {
      expiredCaught = true;
    }
  }
  assert(expiredCaught === true, '6. Timestamp >300s in past throws REQUEST_TIMESTAMP_EXPIRED');

  // 7. Future timestamp (>60s in future)
  const excessiveFutureIso = new Date(baseNow + 65 * 1000).toISOString();
  let futureCaught = false;
  try {
    validateTimestampFreshness(excessiveFutureIso, baseNow);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'REQUEST_TIMESTAMP_IN_FUTURE') {
      futureCaught = true;
    }
  }
  assert(futureCaught === true, '7. Timestamp >60s in future throws REQUEST_TIMESTAMP_IN_FUTURE');

  // 8. Valid timestamp
  let validTimestampSuccess = false;
  try {
    validateTimestampFreshness(new Date(baseNow - 120 * 1000).toISOString(), baseNow);
    validateTimestampFreshness(new Date(baseNow + 30 * 1000).toISOString(), baseNow);
    validTimestampSuccess = true;
  } catch {}
  assert(validTimestampSuccess === true, '8. Timestamp within permissible skew window (-300s to +60s) accepted');

  // --------------------------------------------------------------------------
  // GROUP 3: Nonce Generation & Replay Protection
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Nonce & Replay Protection ---');

  // 9. Nonce generation uniqueness
  const nonces = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    nonces.add(generateGatewayNonce());
  }
  assert(nonces.size === 1000, '9. 1,000 cryptographically random nonces have zero collisions');

  // 10. Replay detection
  const testNonceStore = new InMemoryGatewayNonceStore(1000); // 1s retention for quick test
  const testNonce = 'nonce_replay_001';
  assert(testNonceStore.hasSeen(testNonce) === false, '10a. Unseen nonce returns hasSeen = false');
  testNonceStore.markSeen(testNonce);
  assert(testNonceStore.hasSeen(testNonce) === true, '10. Replayed nonce returns hasSeen = true (replay detected)');

  // 11. Nonce expiration
  await new Promise(r => setTimeout(r, 1100)); // Wait for 1.1s
  testNonceStore.cleanup();
  assert(testNonceStore.hasSeen(testNonce) === false, '11. Expired nonce is pruned and returns false after retention TTL');

  // --------------------------------------------------------------------------
  // GROUP 4: Source & Domain Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Source & Domain Validation ---');
  const client = new EnergyGatewayClient({ hmacSecret: TEST_SECRET });

  // 12. Known sourceId
  const validReq = client.buildRequest('src_satba', 'official_news_index');
  assert(validReq.sourceId === 'src_satba', '12. Known sourceId src_satba accepted');

  // 13. Unknown sourceId
  let unknownSourceCaught = false;
  try {
    client.buildRequest('src_unknown_fake', 'key');
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'UNKNOWN_SOURCE') {
      unknownSourceCaught = true;
    }
  }
  assert(unknownSourceCaught === true, '13. Unknown sourceId throws UNKNOWN_SOURCE');

  // Helper to build a signed valid mock envelope
  function makeMockEnvelope(overrides: Partial<GatewayFetchResponseEnvelope> = {}): GatewayFetchResponseEnvelope {
    const rawContent = overrides.payload !== undefined 
      ? overrides.payload 
      : '<html><head><title>خبر رسمی ساتبا</title></head><body>متن خبر</body></html>';
    
    const encoding = overrides.payloadEncoding || 'utf8';
    const rawBuf = encoding === 'utf8' ? Buffer.from(rawContent, 'utf8') : Buffer.from(rawContent, 'base64');
    const hash = crypto.createHash('sha256').update(rawBuf).digest('hex');

    const envData: Omit<GatewayFetchResponseEnvelope, 'signature'> = {
      schemaVersion: '1.0',
      gatewayId: 'gw-iran-01',
      requestId: 'req_mock_123',
      requestNonce: 'nonce_mock_456',
      sourceId: 'src_satba',
      requestedUrl: 'https://news.satba.gov.ir/fa/news/3698',
      finalUrl: 'https://news.satba.gov.ir/fa/news/3698',
      httpStatus: 200,
      contentType: 'text/html; charset=utf-8',
      contentLength: rawBuf.length,
      payloadSha256: hash,
      payloadEncoding: encoding,
      payload: rawContent,
      responseTimestamp: new Date().toISOString(),
      fetchedAt: new Date(Date.now() - 5000).toISOString(),
      headers: { etag: '"3b4a-123"' },
      ...overrides
    };

    const signature = signGatewayResponseEnvelope(envData, TEST_SECRET);
    return { ...envData, signature };
  }

  // 14. Valid official domain
  const validEnvelope = makeMockEnvelope();
  const vResult = client.verifyEnvelope(validEnvelope);
  assert(vResult.isValid === true && vResult.decodedText?.includes('خبر رسمی ساتبا'), '14. Valid official domain news.satba.gov.ir accepted');

  // 15. Deceptive domain
  let deceptiveCaught = false;
  try {
    const deceptiveEnv = makeMockEnvelope({
      requestedUrl: 'https://satba.gov.ir.attacker.com/news',
      finalUrl: 'https://satba.gov.ir.attacker.com/news'
    });
    client.verifyEnvelope(deceptiveEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'SOURCE_DOMAIN_MISMATCH') {
      deceptiveCaught = true;
    }
  }
  assert(deceptiveCaught === true, '15. Deceptive domain satba.gov.ir.attacker.com throws SOURCE_DOMAIN_MISMATCH');

  // 16. RequestedUrl mismatch
  let reqMismatchCaught = false;
  try {
    const mismatchReqEnv = makeMockEnvelope({
      requestedUrl: 'https://unauthorized-domain.com/news'
    });
    client.verifyEnvelope(mismatchReqEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'SOURCE_DOMAIN_MISMATCH') {
      reqMismatchCaught = true;
    }
  }
  assert(reqMismatchCaught === true, '16. RequestedUrl with unapproved domain throws SOURCE_DOMAIN_MISMATCH');

  // 17. FinalUrl mismatch
  let finalMismatchCaught = false;
  try {
    const mismatchFinalEnv = makeMockEnvelope({
      finalUrl: 'https://attacker-redirect.com/news'
    });
    client.verifyEnvelope(mismatchFinalEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'SOURCE_DOMAIN_MISMATCH') {
      finalMismatchCaught = true;
    }
  }
  assert(finalMismatchCaught === true, '17. FinalUrl redirected to unauthorized domain throws SOURCE_DOMAIN_MISMATCH');

  // --------------------------------------------------------------------------
  // GROUP 5: Payload Decoding, Integrity & Size Ceilings
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Payload Decoding & Integrity ---');

  // 18. UTF-8 payload
  const utf8Env = makeMockEnvelope({ payload: 'اطلاعیه فارسی ساتبا', payloadEncoding: 'utf8' });
  const utf8Res = client.verifyEnvelope(utf8Env);
  assert(utf8Res.decodedText === 'اطلاعیه فارسی ساتبا', '18. UTF-8 payload verified and decoded cleanly');

  // 19. Valid Base64 payload
  const sampleBinary = Buffer.from('محتوای باینری شبیه‌سازی شده', 'utf8');
  const b64Str = sampleBinary.toString('base64');
  const b64Env = makeMockEnvelope({
    payload: b64Str,
    payloadEncoding: 'base64',
    contentType: 'text/plain; charset=utf-8'
  });
  const b64Res = client.verifyEnvelope(b64Env);
  assert(b64Res.rawPayloadBuffer?.toString('utf8') === 'محتوای باینری شبیه‌سازی شده', '19. Valid Base64 payload verified and decoded byte-for-byte');

  // 20. Malformed Base64
  let malformedB64Caught = false;
  try {
    const malformedB64Env = makeMockEnvelope({
      payload: 'invalid!!base64==padding',
      payloadEncoding: 'base64'
    });
    client.verifyEnvelope(malformedB64Env);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_PAYLOAD_ENCODING') {
      malformedB64Caught = true;
    }
  }
  assert(malformedB64Caught === true, '20. Malformed Base64 throws INVALID_PAYLOAD_ENCODING');

  // 21. Correct payload SHA-256
  const rawBytesSample = Buffer.from('داده معتبر برای هش', 'utf8');
  const validHash = crypto.createHash('sha256').update(rawBytesSample).digest('hex');
  const correctHashEnv = makeMockEnvelope({
    payload: 'داده معتبر برای هش',
    payloadSha256: validHash
  });
  assert(client.verifyEnvelope(correctHashEnv).isValid === true, '21. Correct payload SHA-256 passes verification');

  // 22. Payload hash tampering
  let tamperedHashCaught = false;
  try {
    const tamperedHashEnv = makeMockEnvelope({
      payload: 'داده معتبر برای هش',
      payloadSha256: '0000000000000000000000000000000000000000000000000000000000000000'
    });
    client.verifyEnvelope(tamperedHashEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'PAYLOAD_HASH_MISMATCH') {
      tamperedHashCaught = true;
    }
  }
  assert(tamperedHashCaught === true, '22. Payload hash tampering throws PAYLOAD_HASH_MISMATCH');

  // 23. ContentLength mismatch
  let lengthMismatchCaught = false;
  try {
    const lengthMismatchEnv = makeMockEnvelope({
      payload: 'چهار بایت',
      contentLength: 999
    });
    client.verifyEnvelope(lengthMismatchEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'PAYLOAD_LENGTH_MISMATCH') {
      lengthMismatchCaught = true;
    }
  }
  assert(lengthMismatchCaught === true, '23. ContentLength mismatch throws PAYLOAD_LENGTH_MISMATCH');

  // 24. Payload >5 MB
  let oversizedCaught = false;
  try {
    const largeBuf = Buffer.alloc(MAX_GATEWAY_PAYLOAD_BYTES + 1024, 'a');
    const largeHash = crypto.createHash('sha256').update(largeBuf).digest('hex');
    const largeEnv = makeMockEnvelope({
      payload: largeBuf.toString('utf8'),
      contentLength: largeBuf.length,
      payloadSha256: largeHash
    });
    client.verifyEnvelope(largeEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'PAYLOAD_TOO_LARGE') {
      oversizedCaught = true;
    }
  }
  assert(oversizedCaught === true, '24. Decoded payload >5 MB throws PAYLOAD_TOO_LARGE');

  // 25. Valid PDF magic bytes
  const validPdfBuf = Buffer.from('%PDF-1.7\nSample PDF Header\n%%EOF');
  const pdfEnv = makeMockEnvelope({
    contentType: 'application/pdf',
    payload: validPdfBuf.toString('base64'),
    payloadEncoding: 'base64'
  });
  assert(client.verifyEnvelope(pdfEnv).isValid === true, '25. Valid PDF magic bytes (%PDF) accepted');

  // 26. Invalid PDF magic bytes
  let invalidPdfMagicCaught = false;
  try {
    const fakePdfBuf = Buffer.from('FAKE-NOT-A-PDF-DOCUMENT');
    const fakePdfEnv = makeMockEnvelope({
      contentType: 'application/pdf',
      payload: fakePdfBuf.toString('base64'),
      payloadEncoding: 'base64'
    });
    client.verifyEnvelope(fakePdfEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_PDF_MAGIC') {
      invalidPdfMagicCaught = true;
    }
  }
  assert(invalidPdfMagicCaught === true, '26. Invalid PDF magic bytes throws INVALID_PDF_MAGIC');

  // 27. Safe metadata allowlist
  const safeMetaEnv = makeMockEnvelope({
    headers: { etag: '"safe-etag-1"', lastModified: 'Wed, 07 Oct 2026 12:00:00 GMT' }
  });
  const safeMetaRes = client.verifyEnvelope(safeMetaEnv);
  assert(Boolean(safeMetaRes.envelope?.headers?.etag && safeMetaRes.envelope?.headers?.lastModified), '27. Safe metadata allowlist (etag, lastModified) preserved cleanly');

  // 28. Unsupported schema version
  let unsupportedVersionCaught = false;
  try {
    const badVersionEnv = makeMockEnvelope({ schemaVersion: '2.0' as any });
    client.verifyEnvelope(badVersionEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'UNSUPPORTED_GATEWAY_PROTOCOL') {
      unsupportedVersionCaught = true;
    }
  }
  assert(unsupportedVersionCaught === true, '28. Unsupported schema version throws UNSUPPORTED_GATEWAY_PROTOCOL');

  // 29. RequestId mismatch
  let reqIdMismatchCaught = false;
  try {
    const badReqIdEnv = makeMockEnvelope({ requestId: 'req_different_999' });
    client.verifyEnvelope(badReqIdEnv, { expectedRequestId: 'req_expected_111' });
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'REQUEST_ID_MISMATCH') {
      reqIdMismatchCaught = true;
    }
  }
  assert(reqIdMismatchCaught === true, '29. RequestId mismatch throws REQUEST_ID_MISMATCH');

  // 29b. C2B.1: RequestNonce cryptographic binding tests
  // 1. Valid matching request nonce accepted
  const validNonceEnv = makeMockEnvelope({ requestId: 'req_123', requestNonce: 'nonce_abc' });
  const validNonceRes = client.verifyEnvelope(validNonceEnv, { expectedRequestId: 'req_123', expectedNonce: 'nonce_abc' });
  assert(validNonceRes.isValid === true, '29b.1. Valid matching request nonce accepted');

  // 2. Modified response requestNonce rejected
  let modifiedNonceCaught = false;
  try {
    const tamperedNonceEnv = makeMockEnvelope({ requestId: 'req_123', requestNonce: 'nonce_tampered' });
    client.verifyEnvelope(tamperedNonceEnv, { expectedRequestId: 'req_123', expectedNonce: 'nonce_abc' });
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'GATEWAY_REQUEST_NONCE_MISMATCH') {
      modifiedNonceCaught = true;
    }
  }
  assert(modifiedNonceCaught === true, '29b.2. Modified response requestNonce rejected with GATEWAY_REQUEST_NONCE_MISMATCH');

  // 3. Response from request A cannot be reused for request B
  let crossReqReuseCaught = false;
  try {
    const respA = makeMockEnvelope({ requestId: 'req_A', requestNonce: 'nonce_A' });
    // Attempting to verify against request B expected identifiers
    client.verifyEnvelope(respA, { expectedRequestId: 'req_B', expectedNonce: 'nonce_B' });
  } catch (err: any) {
    if (err instanceof GatewaySecurityError) {
      crossReqReuseCaught = true;
    }
  }
  assert(crossReqReuseCaught === true, '29b.3. Response from request A cannot be reused for request B');

  // 4. Changing nonce invalidates response signature
  const baseSignedEnv = makeMockEnvelope({ requestNonce: 'nonce_original' });
  const envelopeWithAlteredNonce = { ...baseSignedEnv, requestNonce: 'nonce_altered' };
  assert(verifyGatewayResponseSignature(envelopeWithAlteredNonce, TEST_SECRET) === false, '29b.4. Changing nonce invalidates response signature');

  // 5. RequestId match alone is insufficient
  let nonceRequiredCaught = false;
  try {
    const matchingReqIdWrongNonce = makeMockEnvelope({ requestId: 'req_identical', requestNonce: 'nonce_wrong' });
    client.verifyEnvelope(matchingReqIdWrongNonce, { expectedRequestId: 'req_identical', expectedNonce: 'nonce_expected' });
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'GATEWAY_REQUEST_NONCE_MISMATCH') {
      nonceRequiredCaught = true;
    }
  }
  assert(nonceRequiredCaught === true, '29b.5. RequestId match alone is insufficient (nonce mismatch triggers GATEWAY_REQUEST_NONCE_MISMATCH)');

  // 30. SourceId mismatch
  let sourceIdMismatchCaught = false;
  try {
    const badSourceEnv = makeMockEnvelope({ sourceId: 'src_tavanir', requestedUrl: 'https://tavanir.org.ir/feed', finalUrl: 'https://tavanir.org.ir/feed' });
    client.verifyEnvelope(badSourceEnv, { expectedSourceId: 'src_satba' });
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'SOURCE_ID_MISMATCH') {
      sourceIdMismatchCaught = true;
    }
  }
  assert(sourceIdMismatchCaught === true, '30. SourceId mismatch throws SOURCE_ID_MISMATCH');

  // --------------------------------------------------------------------------
  // GROUP 6: Envelope Signing, Tampering & Mock Transport
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Envelope Signing, Anti-Tampering & Transport ---');

  // 31. Valid response HMAC
  const freshEnvelope = makeMockEnvelope();
  assert(verifyGatewayResponseSignature(freshEnvelope, TEST_SECRET) === true, '31. Valid response HMAC verifies successfully');

  // 32. Modified envelope rejected
  const envelopeMetadataTampered: GatewayFetchResponseEnvelope = {
    ...freshEnvelope,
    finalUrl: 'https://news.satba.gov.ir/fa/news/MODIFIED' // tampered field after signing
  };
  assert(verifyGatewayResponseSignature(envelopeMetadataTampered, TEST_SECRET) === false, '32. Metadata-tampered envelope signature rejected');

  // 32b. Response timestamp freshness & tampering tests (C2B.1)
  const nowMs = Date.now();
  // Valid responseTimestamp
  const validTimeEnv = makeMockEnvelope({ responseTimestamp: new Date(nowMs - 10000).toISOString() });
  assert(client.verifyEnvelope(validTimeEnv, { nowMs }).isValid === true, '32b.1. Valid responseTimestamp accepted');

  // Expired responseTimestamp (>300s in past)
  let expiredRespCaught = false;
  try {
    const expiredTimeEnv = makeMockEnvelope({ responseTimestamp: new Date(nowMs - 301 * 1000).toISOString() });
    client.verifyEnvelope(expiredTimeEnv, { nowMs });
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'REQUEST_TIMESTAMP_EXPIRED') {
      expiredRespCaught = true;
    }
  }
  assert(expiredRespCaught === true, '32b.2. Expired responseTimestamp (>300s in past) rejected with REQUEST_TIMESTAMP_EXPIRED');

  // Future responseTimestamp (>60s in future)
  let futureRespCaught = false;
  try {
    const futureTimeEnv = makeMockEnvelope({ responseTimestamp: new Date(nowMs + 65 * 1000).toISOString() });
    client.verifyEnvelope(futureTimeEnv, { nowMs });
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'REQUEST_TIMESTAMP_IN_FUTURE') {
      futureRespCaught = true;
    }
  }
  assert(futureRespCaught === true, '32b.3. Future responseTimestamp (>60s in future) rejected with REQUEST_TIMESTAMP_IN_FUTURE');

  // Modified responseTimestamp invalidates signature
  const signedEnvelopeForTime = makeMockEnvelope({ responseTimestamp: new Date(nowMs).toISOString() });
  const tamperedTimeEnv = { ...signedEnvelopeForTime, responseTimestamp: new Date(nowMs - 50000).toISOString() };
  assert(verifyGatewayResponseSignature(tamperedTimeEnv, TEST_SECRET) === false, '32b.4. Modified responseTimestamp invalidates response signature');

  // 33. Modified payload without recomputing hash rejected with PAYLOAD_HASH_MISMATCH
  let modifiedPayloadCaught = false;
  try {
    const payloadTamperedEnv: GatewayFetchResponseEnvelope = {
      ...freshEnvelope,
      payload: freshEnvelope.payload.slice(0, -1) + 'X' // 1 byte tampered, length preserved
    };
    client.verifyEnvelope(payloadTamperedEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'PAYLOAD_HASH_MISMATCH') {
      modifiedPayloadCaught = true;
    }
  }
  assert(modifiedPayloadCaught === true, '33. Modifying payload without recomputing hash fails with PAYLOAD_HASH_MISMATCH');

  // 33a. Modifying payload AND recomputing hash without HMAC secret fails with INVALID_RESPONSE_SIGNATURE
  let forgedPayloadCaught = false;
  try {
    const forgedPayloadStr = '<html><body>Forged Content</body></html>';
    const forgedBuf = Buffer.from(forgedPayloadStr, 'utf8');
    const forgedHash = crypto.createHash('sha256').update(forgedBuf).digest('hex');
    const forgedEnv: GatewayFetchResponseEnvelope = {
      ...freshEnvelope,
      payload: forgedPayloadStr,
      contentLength: forgedBuf.length,
      payloadSha256: forgedHash // hash updated by attacker, but signature remains old/unforgeable
    };
    client.verifyEnvelope(forgedEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_RESPONSE_SIGNATURE') {
      forgedPayloadCaught = true;
    }
  }
  assert(forgedPayloadCaught === true, '33a. Modifying payload and recomputing hash without HMAC secret fails with INVALID_RESPONSE_SIGNATURE');

  // --------------------------------------------------------------------------
  // GROUP 6b: Base64 Strictness & Edge Cases (C2B.1)
  // --------------------------------------------------------------------------
  console.log('\n--- 6b. Base64 Strictness Tests ---');

  // Base64 invalid alphabet
  let b64InvalidCharCaught = false;
  try {
    const badCharEnv = makeMockEnvelope({ payload: 'SGVsbG8@', payloadEncoding: 'base64' });
    client.verifyEnvelope(badCharEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_PAYLOAD_ENCODING') {
      b64InvalidCharCaught = true;
    }
  }
  assert(b64InvalidCharCaught === true, '33c.1. Base64 invalid alphabet rejected');

  // Base64 invalid padding (===)
  let b64InvalidPadCaught = false;
  try {
    const badPadEnv = makeMockEnvelope({ payload: 'SGVsbG8===', payloadEncoding: 'base64' });
    client.verifyEnvelope(badPadEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_PAYLOAD_ENCODING') {
      b64InvalidPadCaught = true;
    }
  }
  assert(b64InvalidPadCaught === true, '33c.2. Base64 invalid padding (triple equals) rejected');

  // Base64 misplaced padding
  let b64MisplacedPadCaught = false;
  try {
    const badPad2Env = makeMockEnvelope({ payload: 'SGV=bG8=', payloadEncoding: 'base64' });
    client.verifyEnvelope(badPad2Env);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_PAYLOAD_ENCODING') {
      b64MisplacedPadCaught = true;
    }
  }
  assert(b64MisplacedPadCaught === true, '33c.3. Base64 misplaced padding rejected');

  // Base64 truncated encoding (length not multiple of 4)
  let b64TruncatedCaught = false;
  try {
    const truncEnv = makeMockEnvelope({ payload: 'SGVsbG8', payloadEncoding: 'base64' });
    client.verifyEnvelope(truncEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_PAYLOAD_ENCODING') {
      b64TruncatedCaught = true;
    }
  }
  assert(b64TruncatedCaught === true, '33c.4. Base64 truncated encoding rejected');

  // Non-canonical Base64 (unused padding bits set)
  let nonCanonicalCaught = false;
  try {
    // "YR==" has unused bits set to 1 instead of 0 for "a" ("YQ==")
    const nonCanonicalEnv = makeMockEnvelope({ payload: 'YR==', payloadEncoding: 'base64' });
    client.verifyEnvelope(nonCanonicalEnv);
  } catch (err: any) {
    if (err instanceof GatewaySecurityError && err.code === 'INVALID_PAYLOAD_ENCODING') {
      nonCanonicalCaught = true;
    }
  }
  assert(nonCanonicalCaught === true, '33c.5. Non-canonical Base64 (unused padding bits set) rejected');

  // --------------------------------------------------------------------------
  // GROUP 6c: Resource Policy Safety (C2B.1)
  // --------------------------------------------------------------------------
  console.log('\n--- 6c. Resource Policy Safety Check ---');
  // Confirm NO verified SATBA path has been invented
  const satbaPolicy = defaultResourcePolicyRegistry.getPolicy('src_satba', 'official_news_index');
  assert(satbaPolicy === undefined, '33d.1. No speculative live SATBA resource policy registered in production registry (0 live SATBA mappings)');

  // Mock transport roundtrip
  const mockTransport: IGatewayTransport = {
    async send(_url, req, _sig) {
      return makeMockEnvelope({
        requestId: req.requestId,
        requestNonce: req.nonce,
        sourceId: req.sourceId
      });
    }
  };

  const clientWithMock = new EnergyGatewayClient({
    hmacSecret: TEST_SECRET,
    transport: mockTransport
  });

  const roundtripResult = await clientWithMock.fetchViaGateway('src_satba', 'official_news_index');
  assert(roundtripResult.isValid === true && roundtripResult.envelope?.sourceId === 'src_satba', '33e. Mock transport roundtrip completes with 100% contract verification');

  // --------------------------------------------------------------------------
  // GROUP 7: Publication Boundary & Database Invariants
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Publication Boundary & Immutability ---');

  // 34. Publication remains disabled
  let pubDisabled = false;
  try {
    publishCandidate('cand_test_01', 'admin_user');
  } catch (err: any) {
    if (err instanceof ReviewWorkflowError && err.code === 'PUBLICATION_DISABLED_IN_STAGE_13_10_2') {
      pubDisabled = true;
    }
  }
  assert(pubDisabled === true, '34. publishCandidate() throws PUBLICATION_DISABLED_IN_STAGE_13_10_2');

  // 35. No public record created
  const publicRecords = energyCenterRepository.getAllPublicRecords();
  assert(publicRecords.length === 0, '35. Public records count remains strictly 0 (no public record created)');

  // 36. db.json unchanged
  isolation.verifyImmutability();
  isolation.cleanup();
  const dbContent = fs.readFileSync('db.json', 'utf8');
  const dbHash = crypto.createHash('sha256').update(dbContent).digest('hex');
  const CANONICAL_DB_HASH = '60e0a9ebb91794ee43f4fb8daa4a18feb2830f1ef3c993ab60981ae7a0b3d68f';
  assert(dbHash === CANONICAL_DB_HASH, '36. db.json SHA-256 matches canonical hash exactly');

  // Final summary
  console.log('\n===============================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    console.log('✓ STAGE 13.10.2-C2B VERIFICATION PASSED WITH 100% SUCCESS.');
  } else {
    console.error('✗ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
