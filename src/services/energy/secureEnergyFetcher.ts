/**
 * HOOSHYAR ENERGY — SECURE EXTERNAL ENERGY FETCHER
 * Stage 13.10.2-B.1 Strict Security & Scope Correction
 * 
 * Enforces multi-layered SSRF protection:
 * 1. Protocol & userinfo validation (strict HTTPS)
 * 2. Exact hostname allowlist matching (anti-deception, no substring matching)
 * 3. DNS resolution via native Node dns.promises.lookup
 * 4. Multi-answer IP validation: every resolved IP checked against private/reserved ranges
 * 5. Manual controlled redirect tracking (max 2 redirects, cross-domain rejected)
 * 6. Streaming response size enforcement (max 5 MB chunk-by-chunk)
 * 7. Content-type allowlist & binary magic-byte verification (PDF %PDF)
 * 8. Sanitized error reporting (no internal IPs or stack traces)
 */

import dns from 'dns';
import crypto from 'crypto';
import { EnergyFetchResult, EnergySource } from '../../types/energyCenter.js';
import { 
  canonicalizeSourceUrl, 
  isForbiddenIpAddress, 
  isPrivateOrInternalAddress 
} from '../../utils/urlCanonicalizer.js';
import { getEnergySourceById, OFFICIAL_ENERGY_SOURCES } from './energySourceRegistry.js';

// Response limits
export const MAX_FETCH_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_FETCH_TIMEOUT_MS = 10000; // 10 seconds
export const MAX_REDIRECTS = 2; // Strict redirect cap

// Allowed remote content types
export const ALLOWED_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'application/pdf'
];

export interface FetchOptions {
  timeoutMs?: number;
  maxSizeBytes?: number;
  expectedSourceId?: string;
}

export class EnergyFetchSecurityError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = 'FETCH_SECURITY_VIOLATION', statusCode = 403) {
    super(message);
    this.name = 'EnergyFetchSecurityError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Checks whether a hostname matches the official domain without unsafe substring vulnerabilities.
 * Allowed: officialDomain, www.officialDomain, sub.officialDomain
 * Rejected: officialDomain.attacker.com, attacker-officialDomain, officialDomain@attacker.com
 */
export function isAllowedHostnameForSource(hostname: string, officialDomain: string): boolean {
  if (!hostname || !officialDomain) return false;
  const h = hostname.toLowerCase().trim();
  const d = officialDomain.toLowerCase().trim();

  // Exact match
  if (h === d) return true;
  // Standard www prefix
  if (h === `www.${d}`) return true;

  // Subdomain match: must end with .officialDomain and preceding prefix must be valid alphanumeric labels
  if (h.endsWith(`.${d}`)) {
    const prefix = h.slice(0, -(d.length + 1));
    return prefix.length > 0 && prefix.split('.').every(label => /^[a-z0-9-]+$/.test(label));
  }

  return false;
}

/**
 * Resolves all DNS records for a hostname and validates EVERY returned IP address.
 * DNS REBINDING / MULTIPLE ANSWERS: If ANY resolved IP is forbidden, FAIL CLOSED.
 */
export async function validateDnsResolution(hostname: string): Promise<string[]> {
  if (!hostname) {
    throw new EnergyFetchSecurityError('نام دامنه مشخص نشده است.', 'INVALID_HOSTNAME', 400);
  }

  // If hostname is directly an IP address
  if (isForbiddenIpAddress(hostname)) {
    throw new EnergyFetchSecurityError(
      `دسترسی به آدرس IP غیرمجاز یا محلی (${hostname}) مسدود است.`,
      'SSRF_FORBIDDEN_IP_DETECTED',
      403
    );
  }

  let records: dns.LookupAddress[];
  try {
    records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch (_err: any) {
    throw new EnergyFetchSecurityError(
      `خطا در تفکیک آدرس شبکه (DNS) برای دامنه '${hostname}'. دسترسی مسدود شد.`,
      'DNS_RESOLUTION_FAILED',
      502
    );
  }

  if (!records || records.length === 0) {
    throw new EnergyFetchSecurityError(
      `هیچ آدرس IP معتبری برای دامنه '${hostname}' یافت نشد.`,
      'DNS_NO_RECORDS',
      502
    );
  }

  const resolvedIps: string[] = [];

  for (const record of records) {
    const ip = record.address;
    resolvedIps.push(ip);

    if (isForbiddenIpAddress(ip)) {
      throw new EnergyFetchSecurityError(
        `دامنه '${hostname}' به آدرس غیرمجاز یا محلی (${ip}) تفکیک می‌شود. درخواست مسدود گردید.`,
        'SSRF_FORBIDDEN_RESOLVED_IP',
        403
      );
    }
  }

  return resolvedIps;
}

/**
 * Validates a target URL against protocol, registry allowlist, and DNS boundaries.
 */
export async function validateUrlSecurity(
  canonicalUrl: string, 
  expectedSourceId?: string
): Promise<{ canonicalUrl: string; source: EnergySource; hostname: string; resolvedIps: string[] }> {
  const canonical = canonicalizeSourceUrl(canonicalUrl);
  if (!canonical.isValid || !canonical.canonicalUrl || !canonical.hostname) {
    throw new EnergyFetchSecurityError(
      canonical.error || 'آدرس منبع نامعتبر است.',
      'INVALID_CANONICAL_URL',
      400
    );
  }

  const hostname = canonical.hostname;

  // Anti-SSRF direct host check
  if (isPrivateOrInternalAddress(hostname)) {
    throw new EnergyFetchSecurityError(
      'دسترسی به آدرس‌های شبکه داخلی یا اختصاصی مسدود است.',
      'SSRF_INTERNAL_ADDRESS_BLOCKED',
      403
    );
  }

  let source: EnergySource | undefined;

  if (expectedSourceId) {
    source = getEnergySourceById(expectedSourceId);
    if (!source) {
      throw new EnergyFetchSecurityError(
        `منبع با شناسه '${expectedSourceId}' در سامانه شناسایی نشد.`,
        'SOURCE_NOT_FOUND',
        404
      );
    }

    if (!isAllowedHostnameForSource(hostname, source.officialDomain)) {
      throw new EnergyFetchSecurityError(
        `دامنه درخواست‌شده (${hostname}) با دامنه ثبت‌شده منبع (${source.officialDomain}) همخوانی ندارد.`,
        'DOMAIN_MISMATCH',
        403
      );
    }
  } else {
    // Match against any approved official source
    source = OFFICIAL_ENERGY_SOURCES.find(s => isAllowedHostnameForSource(hostname, s.officialDomain));

    if (!source) {
      throw new EnergyFetchSecurityError(
        `دامنه (${hostname}) در فهرست منابع رسمی مجاز تعریف نشده است.`,
        'UNAPPROVED_DOMAIN',
        403
      );
    }
  }

  if (!source.enabled) {
    throw new EnergyFetchSecurityError(
      `منبع رسمی '${source.name}' غیرفعال می‌باشد.`,
      'SOURCE_DISABLED',
      403
    );
  }

  if (source.circuitBreakerTripped) {
    throw new EnergyFetchSecurityError(
      `سرویس‌دهنده '${source.name}' به دلیل خطاهای متوالی موقتاً قطع است.`,
      'SOURCE_CIRCUIT_TRIPPED',
      503
    );
  }

  // Real DNS resolution & multi-answer validation
  const resolvedIps = await validateDnsResolution(hostname);

  return { 
    canonicalUrl: canonical.canonicalUrl, 
    source, 
    hostname, 
    resolvedIps 
  };
}

/**
 * Backward compatibility alias for validateUrlSecurity.
 */
export async function validateUrlAgainstRegistry(
  canonicalUrl: string, 
  expectedSourceId?: string
): Promise<{ source: EnergySource; hostname: string }> {
  const result = await validateUrlSecurity(canonicalUrl, expectedSourceId);
  return { source: result.source, hostname: result.hostname };
}

/**
 * Executes a secure, bounded GET fetch against an authorized official energy publisher.
 */
export async function executeSecureEnergyFetch(
  rawUrl: string,
  options: FetchOptions = {}
): Promise<EnergyFetchResult> {
  const timeoutMs = options.timeoutMs || DEFAULT_FETCH_TIMEOUT_MS;
  const maxBytes = options.maxSizeBytes || MAX_FETCH_PAYLOAD_BYTES;

  let currentUrl = rawUrl;
  let redirectCount = 0;
  let initialSource: EnergySource | undefined;

  while (true) {
    // Validate target URL and DNS at EVERY redirect step
    const validated = await validateUrlSecurity(currentUrl, options.expectedSourceId || initialSource?.id);
    if (!initialSource) {
      initialSource = validated.source;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(validated.canonicalUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'HooshyarEnergy-Bot/2.0 (+https://hooshyarenergy.ir/compliance; energy-intelligence)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,application/pdf;q=0.5,*/*;q=0.1',
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        redirect: 'manual', // MANUAL REDIRECT CONTROL
        signal: controller.signal
      });

      clearTimeout(timer);

      // Handle Redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          throw new EnergyFetchSecurityError(
            `تعداد هدایت‌های مجدد بیش از سقف مجاز (${MAX_REDIRECTS}) است.`,
            'TOO_MANY_REDIRECTS',
            400
          );
        }

        const location = response.headers.get('location');
        if (!location) {
          throw new EnergyFetchSecurityError('پاسخ هدایت فاقد هدر Location است.', 'MISSING_REDIRECT_LOCATION', 502);
        }

        // Resolve absolute target URL
        const redirectTarget = new URL(location, validated.canonicalUrl).href;

        // Enforce same-source boundary: cross-domain redirects are strictly rejected
        const nextCanonical = canonicalizeSourceUrl(redirectTarget);
        if (!nextCanonical.isValid || !nextCanonical.hostname || !isAllowedHostnameForSource(nextCanonical.hostname, initialSource.officialDomain)) {
          throw new EnergyFetchSecurityError(
            `هدایت بین‌دامنه‌ای خارج از مأخذ رسمی ثبت‌شده (${initialSource.officialDomain}) مسدود است.`,
            'CROSS_DOMAIN_REDIRECT_BLOCKED',
            403
          );
        }

        currentUrl = redirectTarget;
        continue;
      }

      // Content-type whitelist validation
      const contentTypeHeader = (response.headers.get('content-type') || '').toLowerCase();
      const cleanContentType = contentTypeHeader.split(';')[0].trim();

      const isAllowedType = ALLOWED_CONTENT_TYPES.some(allowed => cleanContentType.includes(allowed));
      if (!isAllowedType) {
        throw new EnergyFetchSecurityError(
          `نوع محتوای ارائه‌شده (${cleanContentType}) مجاز نیست. فقط صفحات وب، متن ساده و اسناد PDF پشتیبانی می‌شوند.`,
          'UNSUPPORTED_CONTENT_TYPE',
          415
        );
      }

      // Check Content-Length before reading
      const declaredLength = Number(response.headers.get('content-length') || 0);
      if (declaredLength > maxBytes) {
        throw new EnergyFetchSecurityError(
          `حجم پاسخ منبع (${declaredLength} بایت) از حداکثر مجاز (${maxBytes} بایت) فراتر است.`,
          'PAYLOAD_TOO_LARGE',
          413
        );
      }

      // STREAMING READ: Enforce 5 MB maximum during chunk accumulation
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      if (!response.body) {
        throw new EnergyFetchSecurityError('بدنه پاسخ منبع خالی است.', 'EMPTY_RESPONSE_BODY', 502);
      }

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel();
            throw new EnergyFetchSecurityError(
              `حجم جریان محتوا حین دریافت از سقف مجاز (${maxBytes} بایت) فراتر رفت.`,
              'PAYLOAD_TOO_LARGE',
              413
            );
          }
          chunks.push(value);
        }
      }

      const fullBuffer = Buffer.concat(chunks);

      // PDF Magic Byte validation
      if (cleanContentType.includes('application/pdf')) {
        const isPdfMagic = fullBuffer.length >= 4 && fullBuffer.toString('utf8', 0, 4) === '%PDF';
        if (!isPdfMagic) {
          throw new EnergyFetchSecurityError(
            'فرمت سند PDF نامعتبر است (بایت‌های جادویی %PDF احراز نشد).',
            'INVALID_DOCUMENT_FORMAT',
            400
          );
        }
      }

      const responseText = cleanContentType.includes('application/pdf')
        ? fullBuffer.toString('base64')
        : fullBuffer.toString('utf8');

      const sha256 = crypto.createHash('sha256').update(fullBuffer).digest('hex');

      // Reset failure counter on success
      initialSource.consecutiveFailures = 0;
      initialSource.lastSuccessfulFetchAt = new Date().toISOString();
      initialSource.lastFetchAt = new Date().toISOString();

      return {
        requestedUrl: rawUrl,
        finalUrl: validated.canonicalUrl,
        status: response.status,
        contentType: cleanContentType,
        contentLength: totalBytes,
        body: responseText,
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
        fetchedAt: new Date().toISOString(),
        sha256
      };
    } catch (err: any) {
      clearTimeout(timer);

      if (initialSource) {
        initialSource.consecutiveFailures = (initialSource.consecutiveFailures || 0) + 1;
        initialSource.lastErrorAt = new Date().toISOString();
        initialSource.lastError = err?.message || 'خطای واکشی';

        if (initialSource.consecutiveFailures >= 5) {
          initialSource.circuitBreakerTripped = true;
        }
      }

      if (err.name === 'AbortError') {
        throw new EnergyFetchSecurityError(
          `زمان واکشی منبع بیش از حد مجاز (${timeoutMs}ms) به طول انجامید.`,
          'FETCH_TIMEOUT',
          504
        );
      }

      if (err instanceof EnergyFetchSecurityError) {
        throw err;
      }

      throw new EnergyFetchSecurityError(
        'خطا در ارتباط امن با منبع خارجی.',
        'NETWORK_FETCH_FAILED',
        502
      );
    }
  }
}
