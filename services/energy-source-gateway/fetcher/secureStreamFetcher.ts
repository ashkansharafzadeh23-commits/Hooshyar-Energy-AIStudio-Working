/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — SECURE STREAMING FETCHER
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Secure outbound HTTPS engine enforcing:
 * - HTTPS only (rejects http://)
 * - Anti-SSRF and DNS rebinding protections
 * - Strict redirect bounds (max 2) with re-validation on every hop
 * - Streaming payload size limits (aborts stream if > 5 MB)
 * - Timeout handling (max 10 seconds)
 * - Content-type allowlist enforcement
 * - Magic byte verification (%PDF)
 * - Safe metadata header extraction (etag, last-modified)
 * - Exact SHA-256 calculation over raw bytes
 */

import https from 'node:https';
import crypto from 'node:crypto';
import { GatewaySecurityError } from '../errors.js';
import { EnergyGatewayResourcePolicy, GatewayPayloadEncoding, GatewayResponseSafeHeaders } from '../types.js';
import { getAuthoritativeGatewaySource, isAllowedGatewaySourceHostname } from '../sourceRegistry.js';
import { resolveAndValidateDns, createSafeHttpsAgent } from '../security/dnsRebindingGuard.js';
import { MAX_GATEWAY_PAYLOAD_BYTES, DEFAULT_FETCH_TIMEOUT_MS, MAX_ALLOWED_REDIRECTS } from '../config.js';

export interface UpstreamFetchResult {
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  contentLength: number;
  payloadSha256: string;
  payloadEncoding: GatewayPayloadEncoding;
  payload: string;
  fetchedAt: string;
  headers?: GatewayResponseSafeHeaders;
}

export interface StreamFetcherOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * Executes a secure streaming fetch against an authorized official source URL.
 */
export async function executeSecureStreamFetch(
  policy: EnergyGatewayResourcePolicy,
  options: StreamFetcherOptions = {}
): Promise<UpstreamFetchResult> {
  const timeoutMs = options.timeoutMs || DEFAULT_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes || policy.maxPayloadBytes || MAX_GATEWAY_PAYLOAD_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_ALLOWED_REDIRECTS;

  const authoritativeSource = getAuthoritativeGatewaySource(policy.sourceId);

  let currentUrl = policy.targetUrl;
  let redirectCount = 0;
  const agent = createSafeHttpsAgent();

  while (true) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      throw new GatewaySecurityError('آدرس اینترنتی نامعتبر است.', 'RESOURCE_POLICY_VIOLATION', 400);
    }

    // Step 8: HTTPS only
    if (parsedUrl.protocol !== 'https:') {
      throw new GatewaySecurityError(
        'پروتکل ارتباطی باید الزماً HTTPS باشد. پروتکل ناامن رد شد.',
        'ORIGIN_UNREACHABLE',
        403
      );
    }

    // Hostname validation against authoritative source
    const hostname = parsedUrl.hostname.toLowerCase();
    if (!isAllowedGatewaySourceHostname(hostname, authoritativeSource)) {
      throw new GatewaySecurityError(
        `دامنه (${hostname}) با مأخذ رسمی منبع (${authoritativeSource.officialDomain}) همخوانی ندارد.`,
        'SOURCE_DOMAIN_MISMATCH',
        403
      );
    }

    // Explicit pre-flight DNS validation before connection
    await resolveAndValidateDns(hostname);

    const fetchResult = await new Promise<{
      isRedirect: boolean;
      redirectLocation?: string;
      status: number;
      contentType: string;
      headers: GatewayResponseSafeHeaders;
      rawBuffer: Buffer;
    }>((resolve, reject) => {
      let isTimedOut = false;
      const reqTimer = setTimeout(() => {
        isTimedOut = true;
        req.destroy(new GatewaySecurityError('مهلت زمان واکشی منبع به پایان رسید.', 'UPSTREAM_TIMEOUT', 504));
      }, timeoutMs);

      const requestOptions: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: 'GET',
        agent,
        headers: {
          'User-Agent': 'HooshyarEnergy-SourceGateway/1.0 (+https://hooshyarenergy.ir/compliance)',
          'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.5,*/*;q=0.1',
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
          'Connection': 'close'
        }
      };

      const req = https.request(requestOptions, (res) => {
        const statusCode = res.statusCode || 500;

        // Redirect handling (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(statusCode)) {
          clearTimeout(reqTimer);
          res.resume(); // Discard redirect body
          const location = res.headers['location'];
          return resolve({
            isRedirect: true,
            redirectLocation: location,
            status: statusCode,
            contentType: '',
            headers: {},
            rawBuffer: Buffer.alloc(0)
          });
        }

        // Only explicitly acceptable 2xx responses are processed into ingestion envelopes
        if (statusCode < 200 || statusCode >= 300) {
          clearTimeout(reqTimer);
          res.destroy();
          return reject(
            new GatewaySecurityError(
              `منبع خارجی وضعیت خطای ${statusCode} بازگرداند. تنها پاسخ‌های موفق (2xx) پذیرفته می‌شوند.`,
              'INVALID_UPSTREAM_RESPONSE',
              502
            )
          );
        }

        // Validate content-type
        const rawContentType = (res.headers['content-type'] || 'text/html').toLowerCase();
        const cleanContentType = rawContentType.split(';')[0].trim();

        const allowedTypes = policy.allowedContentTypes && policy.allowedContentTypes.length > 0
          ? policy.allowedContentTypes
          : ['text/html', 'application/xhtml+xml', 'text/plain', 'application/pdf'];

        const isAllowedType = allowedTypes.some(t => cleanContentType.includes(t.toLowerCase()));
        if (!isAllowedType) {
          clearTimeout(reqTimer);
          res.destroy();
          return reject(
            new GatewaySecurityError(
              `نوع محتوای بازگشتی (${cleanContentType}) مجاز نیست.`,
              'UNSUPPORTED_CONTENT_TYPE',
              415
            )
          );
        }

        // Content-Length header pre-check
        const declaredLength = Number(res.headers['content-length'] || 0);
        if (declaredLength > maxBytes) {
          clearTimeout(reqTimer);
          res.destroy();
          return reject(
            new GatewaySecurityError(
              `حجم اعلام‌شده پاسخ (${declaredLength} بایت) از سقف مجاز فراتر است.`,
              'PAYLOAD_TOO_LARGE',
              413
            )
          );
        }

        // Safe metadata extraction
        const safeHeaders: GatewayResponseSafeHeaders = {};
        if (typeof res.headers['etag'] === 'string') {
          safeHeaders.etag = res.headers['etag'];
        }
        if (typeof res.headers['last-modified'] === 'string') {
          safeHeaders.lastModified = res.headers['last-modified'];
        }

        // Streaming chunk accumulation with strict 5 MB cutoff
        const chunks: Buffer[] = [];
        let accumulatedBytes = 0;

        res.on('data', (chunk: Buffer) => {
          accumulatedBytes += chunk.length;
          if (accumulatedBytes > maxBytes) {
            clearTimeout(reqTimer);
            res.destroy();
            return reject(
              new GatewaySecurityError(
                `حجم داده‌های دریافتی حین استریم از سقف مجاز (${maxBytes} بایت) فراتر رفت.`,
                'PAYLOAD_TOO_LARGE',
                413
              )
            );
          }
          chunks.push(chunk);
        });

        res.on('end', () => {
          clearTimeout(reqTimer);
          const rawBuffer = Buffer.concat(chunks);
          resolve({
            isRedirect: false,
            status: statusCode,
            contentType: cleanContentType,
            headers: safeHeaders,
            rawBuffer
          });
        });

        res.on('error', (err) => {
          clearTimeout(reqTimer);
          reject(err);
        });
      });

      req.on('error', (err: any) => {
        clearTimeout(reqTimer);
        if (isTimedOut) return;
        if (err instanceof GatewaySecurityError) {
          return reject(err);
        }
        reject(new GatewaySecurityError(`خطا در برقراری ارتباط با منبع: ${err.message}`, 'ORIGIN_UNREACHABLE', 502));
      });

      req.end();
    });

    // Handle Redirect
    if (fetchResult.isRedirect) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new GatewaySecurityError(
          `تعداد هدایت‌های مجدد بیش از سقف مجاز (${maxRedirects}) است.`,
          'REDIRECT_POLICY_VIOLATION',
          400
        );
      }

      if (!fetchResult.redirectLocation) {
        throw new GatewaySecurityError('پاسخ هدایت فاقد نشانی مقصد (Location) است.', 'INVALID_UPSTREAM_RESPONSE', 502);
      }

      const nextTargetUrl = new URL(fetchResult.redirectLocation, currentUrl).href;
      const nextParsed = new URL(nextTargetUrl);

      // Disallow HTTP downgrade
      if (nextParsed.protocol !== 'https:') {
        throw new GatewaySecurityError('هدایت به پروتکل ناامن غیرمجاز است.', 'REDIRECT_POLICY_VIOLATION', 403);
      }

      // Disallow cross-domain redirect outside authorized source
      if (!isAllowedGatewaySourceHostname(nextParsed.hostname, authoritativeSource)) {
        throw new GatewaySecurityError(
          `هدایت به دامنه غیرمجاز (${nextParsed.hostname}) مسدود است.`,
          'REDIRECT_POLICY_VIOLATION',
          403
        );
      }

      currentUrl = nextTargetUrl;
      continue;
    }

    // Success response processing
    const rawBuffer = fetchResult.rawBuffer;
    const isPdf = fetchResult.contentType.includes('application/pdf');

    // PDF Magic bytes check (%PDF)
    if (isPdf) {
      const isPdfMagic = rawBuffer.length >= 4 && rawBuffer.toString('utf8', 0, 4) === '%PDF';
      if (!isPdfMagic) {
        throw new GatewaySecurityError('سند PDF دارای امضای باینری نامعتبر است.', 'INVALID_UPSTREAM_RESPONSE', 400);
      }
    }

    const payloadSha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    // Determine encoding: utf8 for text only when exact roundtrip byte preservation is guaranteed, else base64
    let payloadEncoding: GatewayPayloadEncoding = 'utf8';
    let payloadStr: string;

    if (isPdf) {
      payloadEncoding = 'base64';
      payloadStr = rawBuffer.toString('base64');
    } else {
      const utf8Candidate = rawBuffer.toString('utf8');
      if (Buffer.from(utf8Candidate, 'utf8').equals(rawBuffer)) {
        payloadEncoding = 'utf8';
        payloadStr = utf8Candidate;
      } else {
        // Fallback to base64 for arbitrary/non-UTF-8 bytes to guarantee 100% byte fidelity
        payloadEncoding = 'base64';
        payloadStr = rawBuffer.toString('base64');
      }
    }

    return {
      requestedUrl: policy.targetUrl,
      finalUrl: currentUrl,
      httpStatus: fetchResult.status,
      contentType: fetchResult.contentType,
      contentLength: rawBuffer.length,
      payloadSha256,
      payloadEncoding,
      payload: payloadStr,
      fetchedAt: new Date().toISOString(),
      headers: Object.keys(fetchResult.headers).length > 0 ? fetchResult.headers : undefined
    };
  }
}
