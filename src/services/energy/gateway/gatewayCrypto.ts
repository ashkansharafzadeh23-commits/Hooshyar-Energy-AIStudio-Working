/**
 * HOOSHYAR ENERGY — GATEWAY CRYPTOGRAPHIC & VERIFICATION HELPERS
 * Stage 13.10.2-C2B: Secure Source Gateway Protocol Foundation
 * 
 * Implements deterministic HMAC-SHA256 signing, constant-time comparison,
 * timestamp validation, payload decoding, and hash integrity checks.
 */

import crypto from 'node:crypto';
import { 
  GatewayFetchRequest, 
  GatewayFetchResponseEnvelope, 
  GatewayProtocolVersion 
} from '../../../types/energyGateway.js';
import { GatewaySecurityError } from './gatewayErrors.js';

export const MAX_GATEWAY_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_TIMESTAMP_PAST_SKEW_MS = 300 * 1000; // 300 seconds past tolerance
export const MAX_TIMESTAMP_FUTURE_SKEW_MS = 60 * 1000; // 60 seconds future tolerance

export const SUPPORTED_GATEWAY_PROTOCOL_VERSION: GatewayProtocolVersion = '1.0';

/**
 * Retrieves the configured HMAC secret from environment.
 * Throws GatewaySecurityError with GATEWAY_SECRET_NOT_CONFIGURED if missing.
 */
export function getGatewayHmacSecret(overrideSecret?: string): string {
  const secret = overrideSecret || process.env.ENERGY_GATEWAY_HMAC_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new GatewaySecurityError(
      'کلید امنیتی امضای گیت‌وی (ENERGY_GATEWAY_HMAC_SECRET) پیکربندی نشده است.',
      'GATEWAY_SECRET_NOT_CONFIGURED',
      500
    );
  }
  return secret.trim();
}

/**
 * Performs constant-time comparison of two hexadecimal signatures.
 * Validates length and format beforehand to prevent unexpected exceptions.
 */
export function timingSafeEqualHex(signatureA: string, signatureB: string): boolean {
  if (!signatureA || !signatureB || typeof signatureA !== 'string' || typeof signatureB !== 'string') {
    return false;
  }

  const cleanA = signatureA.trim().toLowerCase();
  const cleanB = signatureB.trim().toLowerCase();

  // Signatures must be valid hex and match length (64 chars for SHA-256)
  if (!/^[0-9a-f]{64}$/.test(cleanA) || !/^[0-9a-f]{64}$/.test(cleanB)) {
    return false;
  }

  const bufA = Buffer.from(cleanA, 'hex');
  const bufB = Buffer.from(cleanB, 'hex');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Constructs the deterministic canonical string for a Gateway request.
 * METHOD\nPATH\nTIMESTAMP\nNONCE\nSHA256(BODY)
 */
export function buildCanonicalRequestString(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyBytesOrString: Buffer | string
): string {
  const bodyBuf = Buffer.isBuffer(bodyBytesOrString) 
    ? bodyBytesOrString 
    : Buffer.from(bodyBytesOrString || '', 'utf8');

  const bodyHash = crypto.createHash('sha256').update(bodyBuf).digest('hex');

  return [
    method.toUpperCase().trim(),
    path.trim(),
    timestamp.trim(),
    nonce.trim(),
    bodyHash
  ].join('\n');
}

/**
 * Signs a Gateway request canonical string with HMAC-SHA256.
 */
export function signGatewayRequest(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyBytesOrString: Buffer | string,
  secret?: string
): string {
  const hmacKey = getGatewayHmacSecret(secret);
  const canonicalString = buildCanonicalRequestString(method, path, timestamp, nonce, bodyBytesOrString);
  return crypto.createHmac('sha256', hmacKey).update(canonicalString).digest('hex');
}

/**
 * Verifies a Gateway request signature.
 */
export function verifyGatewayRequestSignature(
  signature: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyBytesOrString: Buffer | string,
  secret?: string
): boolean {
  if (!signature) return false;
  try {
    const expected = signGatewayRequest(method, path, timestamp, nonce, bodyBytesOrString, secret);
    return timingSafeEqualHex(signature, expected);
  } catch {
    return false;
  }
}

/**
 * Constructs the deterministic canonical string for a Gateway response envelope.
 * Cryptographically binds all transport metadata and the payload SHA-256.
 */
export function buildCanonicalResponseString(envelope: Omit<GatewayFetchResponseEnvelope, 'signature'>): string {
  return [
    'GATEWAY_RESPONSE_V1',
    envelope.schemaVersion,
    envelope.gatewayId,
    envelope.requestId,
    envelope.requestNonce,
    envelope.sourceId,
    envelope.requestedUrl,
    envelope.finalUrl,
    String(envelope.httpStatus),
    envelope.contentType,
    String(envelope.contentLength),
    envelope.payloadSha256,
    envelope.payloadEncoding,
    envelope.responseTimestamp,
    envelope.fetchedAt
  ].join('\n');
}

/**
 * Signs a Gateway response envelope with HMAC-SHA256.
 */
export function signGatewayResponseEnvelope(
  envelope: Omit<GatewayFetchResponseEnvelope, 'signature'>,
  secret?: string
): string {
  const hmacKey = getGatewayHmacSecret(secret);
  const canonicalString = buildCanonicalResponseString(envelope);
  return crypto.createHmac('sha256', hmacKey).update(canonicalString).digest('hex');
}

/**
 * Verifies a Gateway response envelope signature.
 */
export function verifyGatewayResponseSignature(
  envelope: GatewayFetchResponseEnvelope,
  secret?: string
): boolean {
  if (!envelope || !envelope.signature) return false;
  try {
    const expected = signGatewayResponseEnvelope(envelope, secret);
    return timingSafeEqualHex(envelope.signature, expected);
  } catch {
    return false;
  }
}

/**
 * Validates request/response timestamp against past and future skew bounds.
 */
export function validateTimestampFreshness(
  timestampIso: string,
  nowMs = Date.now(),
  pastSkewMs = MAX_TIMESTAMP_PAST_SKEW_MS,
  futureSkewMs = MAX_TIMESTAMP_FUTURE_SKEW_MS
): void {
  if (!timestampIso || typeof timestampIso !== 'string') {
    throw new GatewaySecurityError('برچسب زمانی نامعتبر یا خالی است.', 'REQUEST_TIMESTAMP_EXPIRED', 401);
  }

  const parsedMs = Date.parse(timestampIso);
  if (isNaN(parsedMs)) {
    throw new GatewaySecurityError('فرمت برچسب زمانی نامعتبر است.', 'REQUEST_TIMESTAMP_EXPIRED', 401);
  }

  if (nowMs - parsedMs > pastSkewMs) {
    throw new GatewaySecurityError('درخواست منقضی شده است (خطای انقضای برچسب زمان).', 'REQUEST_TIMESTAMP_EXPIRED', 401);
  }

  if (parsedMs - nowMs > futureSkewMs) {
    throw new GatewaySecurityError('برچسب زمانی درخواست در آینده غیرمجاز قرار دارد.', 'REQUEST_TIMESTAMP_IN_FUTURE', 401);
  }
}

/**
 * Decodes envelope payload according to payloadEncoding ('utf8' | 'base64'),
 * validates Base64 strictness, size bounds (5 MB), actual byte length, and SHA-256 digest.
 */
export function decodeAndVerifyPayload(envelope: GatewayFetchResponseEnvelope): Buffer {
  if (!envelope || typeof envelope.payload !== 'string') {
    throw new GatewaySecurityError('بدنه داده‌های انولوپ موجود نیست.', 'INVALID_GATEWAY_ENVELOPE', 400);
  }

  let rawBytes: Buffer;

  if (envelope.payloadEncoding === 'utf8') {
    rawBytes = Buffer.from(envelope.payload, 'utf8');
  } else if (envelope.payloadEncoding === 'base64') {
    const cleanB64 = envelope.payload.trim();
    // Validate Base64 formatting strictly (must have valid characters and canonical padding)
    if (
      cleanB64.length === 0 || 
      cleanB64.length % 4 !== 0 || 
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(cleanB64)
    ) {
      throw new GatewaySecurityError('فرمت رمزنگاری Base64 نامعتبر یا مخدوش است.', 'INVALID_PAYLOAD_ENCODING', 400);
    }
    rawBytes = Buffer.from(cleanB64, 'base64');
    // Verify canonical Base64: re-encoding must match exactly (rejects non-canonical padding bits)
    if (rawBytes.toString('base64') !== cleanB64) {
      throw new GatewaySecurityError('داده‌های Base64 غیرکانونیکال است (بیت‌های پدینگ غیرمجاز).', 'INVALID_PAYLOAD_ENCODING', 400);
    }
  } else {
    throw new GatewaySecurityError(
      `نوع رمزنگاری محتوا (${envelope.payloadEncoding}) پشتیبانی نمی‌شود.`,
      'INVALID_PAYLOAD_ENCODING',
      400
    );
  }

  // Enforce 5 MB maximum bound on decoded bytes
  if (rawBytes.length > MAX_GATEWAY_PAYLOAD_BYTES) {
    throw new GatewaySecurityError(
      `حجم داده‌های رمزگشایی‌شده (${rawBytes.length} بایت) از سقف مجاز (${MAX_GATEWAY_PAYLOAD_BYTES} بایت) فراتر است.`,
      'PAYLOAD_TOO_LARGE',
      413
    );
  }

  // Verify byte length matches declared contentLength
  if (rawBytes.length !== envelope.contentLength) {
    throw new GatewaySecurityError(
      `طول واقعی بایت‌های محتوا (${rawBytes.length}) با طول اعلام‌شده در انولوپ (${envelope.contentLength}) مغایرت دارد.`,
      'PAYLOAD_LENGTH_MISMATCH',
      400
    );
  }

  // Independently recalculate SHA-256 over exact decoded raw bytes
  const computedSha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');
  if (computedSha256 !== envelope.payloadSha256.toLowerCase().trim()) {
    throw new GatewaySecurityError(
      'هش محاسبه‌شده داده‌های دریافتی با مقدار ارائه‌شده در انولوپ همخوانی ندارد (دستکاری داده یا ناهماهنگی هش).',
      'PAYLOAD_HASH_MISMATCH',
      400
    );
  }

  // Validate PDF magic bytes if content-type declares PDF
  if (envelope.contentType && envelope.contentType.toLowerCase().includes('application/pdf')) {
    const isPdfMagic = rawBytes.length >= 4 && rawBytes.toString('utf8', 0, 4) === '%PDF';
    if (!isPdfMagic) {
      throw new GatewaySecurityError(
        'فرمت سند PDF نامعتبر است (بایت‌های جادویی %PDF احراز نشد).',
        'INVALID_PDF_MAGIC',
        400
      );
    }
  }

  return rawBytes;
}
