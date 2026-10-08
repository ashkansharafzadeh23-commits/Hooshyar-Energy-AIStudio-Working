/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — HTTP APPLICATION
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Production Express application providing:
 * - GET /health: lightweight liveness & protocol status
 * - POST /api/v1/fetch: authenticated, server-policy-controlled source fetch
 * - Strict defense-in-depth: rate limiting, body size limits, anti-SSRF,
 *   canonical HMAC verification, zero arbitrary URL inputs, replay protection.
 */

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { loadGatewayConfig } from './config.js';
import { GatewaySecurityError } from './errors.js';
import { GatewayFetchRequest, GatewayFetchResponseEnvelope } from './types.js';
import { getAuthoritativeGatewaySource } from './sourceRegistry.js';
import { defaultGatewayPolicyRegistry, GatewayResourcePolicyRegistry } from './policyRegistry.js';
import { defaultGatewayRateLimiter, GatewayRateLimiter } from './security/rateLimiter.js';
import { executeSecureStreamFetch, UpstreamFetchResult } from './fetcher/secureStreamFetcher.js';
import { buildSignedResponseEnvelope } from './fetcher/envelopeBuilder.js';

// Replay protection store (single-instance pilot)
interface StoredNonce {
  expiresAt: number;
}
export class GatewayProcessNonceStore {
  private readonly nonces: Map<string, StoredNonce> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs = 10 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  public hasSeen(nonce: string): boolean {
    if (!nonce) return false;
    const entry = this.nonces.get(nonce);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.nonces.delete(nonce);
      return false;
    }
    return true;
  }

  public markSeen(nonce: string): void {
    if (!nonce) return;
    this.nonces.set(nonce, { expiresAt: Date.now() + this.ttlMs });
  }

  public clear(): void {
    this.nonces.clear();
  }
}

export const defaultGatewayNonceStore = new GatewayProcessNonceStore();

export interface GatewayAppDependencies {
  policyRegistry?: GatewayResourcePolicyRegistry;
  rateLimiter?: GatewayRateLimiter;
  nonceStore?: GatewayProcessNonceStore;
  hmacSecretOverride?: string;
  fetcherOverride?: (policy: any) => Promise<UpstreamFetchResult>;
}

/**
 * Constant-time comparison of two hexadecimal signatures.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(cleanA) || !/^[0-9a-f]{64}$/.test(cleanB)) return false;
  const bufA = Buffer.from(cleanA, 'hex');
  const bufB = Buffer.from(cleanB, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Builds canonical request string: METHOD\nPATH\nTIMESTAMP\nNONCE\nSHA256(BODY)
 */
function buildCanonicalRequestString(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  rawBody: Buffer | string
): string {
  const bodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf8');
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
 * Factory for creating the Gateway Express application.
 */
export function createGatewayApp(deps: GatewayAppDependencies = {}): express.Express {
  const app = express();
  const config = loadGatewayConfig(deps.hmacSecretOverride);
  const policyRegistry = deps.policyRegistry || defaultGatewayPolicyRegistry;
  const rateLimiter = deps.rateLimiter || defaultGatewayRateLimiter;
  const nonceStore = deps.nonceStore || defaultGatewayNonceStore;

  // Disable powered-by banner
  app.disable('x-powered-by');

  // Step 20: Body limit (64 KB max incoming payload)
  app.use(express.json({
    limit: '64kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Body size error handler
  app.use((err: any, _req: Request, _res: Response, next: NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return next(new GatewaySecurityError('حجم بدنه درخواست از سقف مجاز فراتر است.', 'REQUEST_BODY_TOO_LARGE', 413));
    }
    next(err);
  });

  // Step 3 & Step 21: GET /health
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'hooshyar-energy-source-gateway',
      protocolVersion: '1.0'
    });
  });

  // Step 3 & Step 4: POST /api/v1/fetch
  app.post('/api/v1/fetch', async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    // Do not trust spoofable proxy headers unless explicitly configured
    const clientIdentifier = req.socket.remoteAddress || 'gateway_client';

    try {
      // Step 19: Rate limit enforcement
      rateLimiter.checkAndConsume(clientIdentifier);

      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new GatewaySecurityError('ساختار بدنه درخواست نامعتبر است.', 'INVALID_REQUEST_PAYLOAD', 400);
      }

      // Step 7 & 8: Strict schema validation — permit ONLY the 6 allowed contract fields
      const allowedContractFields = new Set(['schemaVersion', 'requestId', 'sourceId', 'resourceKey', 'timestamp', 'nonce']);
      const bodyKeys = Object.keys(body);

      // Explicitly check for arbitrary URL parameters
      const forbiddenUrlFields = ['url', 'targetUrl', 'hostname', 'protocol', 'port', 'redirectUrl', 'domain'];
      for (const field of forbiddenUrlFields) {
        if (field in body) {
          throw new GatewaySecurityError(
            `فیلد غیرمجاز '${field}' در درخواست ارسال شده است. گیت‌وی هیچ آدرس ورودی دلخواهی را نمی‌پذیرد.`,
            'ARBITRARY_URL_NOT_PERMITTED',
            400
          );
        }
      }

      // Reject any other unexpected property
      for (const key of bodyKeys) {
        if (!allowedContractFields.has(key)) {
          throw new GatewaySecurityError(`فیلد ناشناخته و غیرمجاز '${key}' در بدنه درخواست یافت شد.`, 'INVALID_REQUEST_PAYLOAD', 400);
        }
      }

      // Validate required contract fields
      const { schemaVersion, requestId, sourceId, resourceKey, timestamp, nonce } = body as GatewayFetchRequest;

      if (schemaVersion !== '1.0') {
        throw new GatewaySecurityError(
          `نسخه پروتکل درخواست (${schemaVersion}) پشتیبانی نمی‌شود. نسخه معتبر: 1.0.`,
          'UNSUPPORTED_GATEWAY_PROTOCOL',
          400,
          requestId
        );
      }

      if (
        !requestId || typeof requestId !== 'string' || requestId.trim().length === 0 || requestId.length > 128 ||
        !sourceId || typeof sourceId !== 'string' || sourceId.trim().length === 0 || sourceId.length > 64 ||
        !resourceKey || typeof resourceKey !== 'string' || resourceKey.trim().length === 0 || resourceKey.length > 128 ||
        !nonce || typeof nonce !== 'string' || nonce.trim().length === 0 || nonce.length > 128 ||
        !timestamp || typeof timestamp !== 'string' || timestamp.length > 64
      ) {
        throw new GatewaySecurityError('فیلدهای الزامی پروتکل درخواست ناقص یا خارج از حدود مجاز هستند.', 'INVALID_REQUEST_PAYLOAD', 400, requestId);
      }

      // Step 4: Timestamp validation (-300s past to +60s future)
      const parsedTimeMs = Date.parse(timestamp);
      if (isNaN(parsedTimeMs)) {
        throw new GatewaySecurityError('فرمت برچسب زمانی درخواست نامعتبر است.', 'REQUEST_TIMESTAMP_EXPIRED', 401, requestId);
      }

      const nowMs = Date.now();
      if (nowMs - parsedTimeMs > 300 * 1000) {
        throw new GatewaySecurityError('درخواست منقضی شده است (انحراف زمان بیش از ۳۰۰ ثانیه در گذشته).', 'REQUEST_TIMESTAMP_EXPIRED', 401, requestId);
      }
      if (parsedTimeMs - nowMs > 60 * 1000) {
        throw new GatewaySecurityError('برچسب زمانی درخواست در آینده غیرمجاز قرار دارد (بیش از ۶۰ ثانیه).', 'REQUEST_TIMESTAMP_IN_FUTURE', 401, requestId);
      }

      // Step 5: Canonical request signature verification
      // Require canonical header 'x-gateway-signature' only
      const signatureHeader = req.headers['x-gateway-signature'];
      if (!signatureHeader || typeof signatureHeader !== 'string') {
        throw new GatewaySecurityError('امضای دیجیتال درخواست (x-gateway-signature) ارائه نشده است.', 'INVALID_GATEWAY_SIGNATURE', 401, requestId);
      }

      // Step 6: Use exact raw request bytes captured during body parsing
      const rawBody = (req as any).rawBody;
      if (!Buffer.isBuffer(rawBody)) {
        throw new GatewaySecurityError('خطا در دریافت بایت‌های خام درخواست جهت بررسی امضا.', 'INVALID_REQUEST_PAYLOAD', 400, requestId);
      }

      const canonicalReq = buildCanonicalRequestString('POST', '/api/v1/fetch', timestamp, nonce, rawBody);
      const expectedSignature = crypto.createHmac('sha256', config.hmacSecret).update(canonicalReq).digest('hex');

      if (!timingSafeEqualHex(signatureHeader, expectedSignature)) {
        throw new GatewaySecurityError('امضای دیجیتال درخواست نامعتبر است.', 'INVALID_GATEWAY_SIGNATURE', 401, requestId);
      }

      // Step 7: Nonce consumption order — ONLY after signature verification succeeds!
      // Prevents nonce poisoning DoS attacks
      if (nonceStore.hasSeen(nonce)) {
        throw new GatewaySecurityError('درخواست تکراری تشخیص داده شد (حمله بازپخش / Replay).', 'REPLAY_DETECTED', 401, requestId);
      }
      nonceStore.markSeen(nonce);

      // Step 5: Authoritative source registry lookup
      const authoritativeSource = getAuthoritativeGatewaySource(sourceId);

      // Step 6: Resource policy lookup (fails closed if unconfigured)
      const policy = policyRegistry.resolvePolicy(authoritativeSource.id, resourceKey);

      // Execute secure outbound fetch
      let fetchResult: UpstreamFetchResult;
      if (deps.fetcherOverride) {
        fetchResult = await deps.fetcherOverride(policy);
      } else {
        fetchResult = await executeSecureStreamFetch(policy);
      }

      // Step 12 & 13: Build and sign response envelope
      const envelope: GatewayFetchResponseEnvelope = buildSignedResponseEnvelope(
        config.gatewayId,
        body,
        fetchResult,
        config.hmacSecret
      );

      // Step 18: Structured logging (sanitized, zero secrets)
      const durationMs = Date.now() - startTime;
      console.log(JSON.stringify({
        level: 'info',
        event: 'GATEWAY_FETCH_COMPLETED',
        requestId,
        sourceId,
        resourceKey,
        targetHostname: new URL(fetchResult.finalUrl).hostname,
        statusCode: fetchResult.httpStatus,
        durationMs,
        payloadBytes: fetchResult.contentLength,
        payloadSha256: fetchResult.payloadSha256,
        resultCode: 'SUCCESS'
      }));

      res.status(200).json(envelope);
    } catch (err: any) {
      next(err);
    }
  });

  // Sanitized error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || (err instanceof GatewaySecurityError ? err.statusCode : 500);
    const code = err.code || (err instanceof GatewaySecurityError ? err.code : 'GATEWAY_ERROR');
    const message = err.message || 'خطای امنیتی در پردازش درخواست گیت‌وی.';
    const requestId = err.requestId;

    // Structured sanitized log
    console.error(JSON.stringify({
      level: 'error',
      event: 'GATEWAY_ERROR',
      code,
      statusCode,
      requestId,
      message
    }));

    res.status(statusCode).json({
      error: message,
      code,
      statusCode,
      requestId
    });
  });

  return app;
}
