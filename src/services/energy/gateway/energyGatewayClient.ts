/**
 * HOOSHYAR ENERGY — BACKEND GATEWAY CLIENT & ENVELOPE VERIFIER
 * Stage 13.10.2-C2B: Secure Source Gateway Protocol Foundation
 * 
 * Client abstraction used exclusively by the Main Hooshyar Energy backend to:
 * 1. Build and HMAC-sign outbound Gateway requests
 * 2. Authenticate, verify, and validate received Gateway response envelopes
 * 3. Enforce strict defense-in-depth source domain ownership and payload integrity
 * 4. Support pluggable mock transport for deterministic testing without network calls
 * 
 * SECURITY BOUNDARY:
 * Zero editorial/publication actions occur here. This service returns only validated raw payload material.
 */

import crypto from 'node:crypto';
import { 
  GatewayFetchRequest, 
  GatewayFetchResponseEnvelope, 
  GatewayVerificationResult, 
  IGatewayNonceStore 
} from '../../../types/energyGateway.js';
import { getEnergySourceById } from '../energySourceRegistry.js';
import { isAllowedHostnameForSource } from '../secureEnergyFetcher.js';
import { 
  SUPPORTED_GATEWAY_PROTOCOL_VERSION, 
  getGatewayHmacSecret, 
  signGatewayRequest, 
  verifyGatewayResponseSignature, 
  validateTimestampFreshness, 
  decodeAndVerifyPayload 
} from './gatewayCrypto.js';
import { GatewaySecurityError } from './gatewayErrors.js';
import { defaultNonceStore, generateGatewayNonce } from './nonceStore.js';

export interface IGatewayTransport {
  send(
    endpointUrl: string, 
    request: GatewayFetchRequest, 
    signature: string
  ): Promise<GatewayFetchResponseEnvelope>;
}

export interface HttpGatewayTransportOptions {
  timeoutMs?: number;
  allowInsecureLoopback?: boolean;
  maxResponseBytes?: number;
}

/**
 * Standard HTTP transport for communication between the Main Backend and the standalone Energy Source Gateway.
 */
export class HttpGatewayTransport implements IGatewayTransport {
  private readonly timeoutMs: number;
  private readonly allowInsecureLoopback: boolean;
  private readonly maxResponseBytes: number;

  constructor(options: HttpGatewayTransportOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.allowInsecureLoopback = options.allowInsecureLoopback ?? false;
    this.maxResponseBytes = options.maxResponseBytes ?? (5 * 1024 * 1024 + 64 * 1024);
  }

  public async send(
    endpointUrl: string, 
    request: GatewayFetchRequest, 
    signature: string
  ): Promise<GatewayFetchResponseEnvelope> {
    // 1. Enforce HTTPS in production; allow HTTP loopback only if explicitly enabled in test config
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(endpointUrl);
    } catch {
      throw new GatewaySecurityError(
        'نشانی سرویس گیت‌وی نامعتبر است.',
        'SOURCE_DOMAIN_MISMATCH',
        400,
        request.requestId
      );
    }

    if (parsedUrl.protocol !== 'https:') {
      const isLoopback = parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '::1';
      if (!isLoopback || !this.allowInsecureLoopback) {
        throw new GatewaySecurityError(
          'پروتکل ارتباط با گیت‌وی در محیط عملیاتی الزماً باید HTTPS باشد. پروتکل ناامن HTTP پذیرفته نمی‌شود.',
          'SOURCE_DOMAIN_MISMATCH',
          403,
          request.requestId
        );
      }
    }

    const bodyStr = JSON.stringify(request);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': signature,
          'x-gateway-timestamp': request.timestamp,
          'x-gateway-nonce': request.nonce,
          'x-gateway-source-id': request.sourceId,
          'x-gateway-key-id': 'default'
        },
        body: bodyStr,
        signal: controller.signal
      });

      // Enforce response size bounds via Content-Length header if present
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(declaredLength) && declaredLength > this.maxResponseBytes) {
          throw new GatewaySecurityError(
            `حجم پاسخ دریافتی از گیت‌وی (${declaredLength} بایت) از سقف مجاز (${this.maxResponseBytes} بایت) فراتر است.`,
            'PAYLOAD_TOO_LARGE',
            413,
            request.requestId
          );
        }
      }

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          // Non-JSON error body
        }
        const message = errorData?.error || `درخواست گیت‌وی با کد وضعیت ${response.status} با خطا مواجه شد.`;
        const code = errorData?.code || (
          response.status === 401 ? 'INVALID_GATEWAY_SIGNATURE' :
          response.status === 429 ? 'RATE_LIMIT_EXCEEDED' :
          response.status === 413 ? 'REQUEST_BODY_TOO_LARGE' :
          'GATEWAY_HTTP_ERROR'
        );
        throw new GatewaySecurityError(message, code, response.status, request.requestId);
      }

      // Read text and enforce maximum byte size limit
      const responseText = await response.text();
      if (Buffer.byteLength(responseText, 'utf8') > this.maxResponseBytes) {
        throw new GatewaySecurityError(
          `حجم داده‌های پاسخ گیت‌وی از سقف مجاز (${this.maxResponseBytes} بایت) فراتر است.`,
          'PAYLOAD_TOO_LARGE',
          413,
          request.requestId
        );
      }

      let envelope: GatewayFetchResponseEnvelope;
      try {
        envelope = JSON.parse(responseText) as GatewayFetchResponseEnvelope;
      } catch {
        throw new GatewaySecurityError('ساختار داده‌های پاسخ گیت‌وی JSON معتبر نیست.', 'INVALID_GATEWAY_ENVELOPE', 400, request.requestId);
      }
      return envelope;
    } catch (err: any) {
      if (err instanceof GatewaySecurityError) {
        throw err;
      }
      if (err.name === 'AbortError' || err.message?.includes('aborted') || err.name === 'TimeoutError') {
        throw new GatewaySecurityError(
          'مهلت زمانی اتصال به گیت‌وی به پایان رسید (Timeout).',
          'GATEWAY_TIMEOUT',
          504,
          request.requestId
        );
      }
      throw new GatewaySecurityError(
        `خطا در برقراری ارتباط با سرویس گیت‌وی: ${err.message}`,
        'GATEWAY_UNAVAILABLE',
        503,
        request.requestId
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}

export interface GatewayClientConfig {
  baseUrl?: string;
  hmacSecret?: string;
  nonceStore?: IGatewayNonceStore;
  transport?: IGatewayTransport;
}

export class EnergyGatewayClient {
  private readonly baseUrl: string;
  private readonly hmacSecret?: string;
  private readonly nonceStore: IGatewayNonceStore;
  private readonly transport?: IGatewayTransport;

  constructor(config: GatewayClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.ENERGY_GATEWAY_BASE_URL || 'https://gateway.internal';
    this.hmacSecret = config.hmacSecret;
    this.nonceStore = config.nonceStore || defaultNonceStore;
    this.transport = config.transport || (config.baseUrl ? new HttpGatewayTransport() : undefined);
  }

  /**
   * Constructs a server-controlled GatewayFetchRequest.
   * resourceKey is a trusted server-side identifier, NEVER an arbitrary client URL.
   */
  public buildRequest(
    sourceId: string, 
    resourceKey: string, 
    customRequestId?: string,
    customNonce?: string,
    customTimestamp?: string
  ): GatewayFetchRequest {
    const registeredSource = getEnergySourceById(sourceId);
    if (!registeredSource) {
      throw new GatewaySecurityError(`منبع با شناسه '${sourceId}' در سامانه شناسایی نشد.`, 'UNKNOWN_SOURCE', 400);
    }

    return {
      schemaVersion: SUPPORTED_GATEWAY_PROTOCOL_VERSION,
      requestId: customRequestId || crypto.randomUUID(),
      sourceId: registeredSource.id,
      resourceKey: resourceKey.trim(),
      timestamp: customTimestamp || new Date().toISOString(),
      nonce: customNonce || generateGatewayNonce()
    };
  }

  /**
   * Signs a GatewayFetchRequest using HMAC-SHA256 over the canonical request string.
   */
  public signRequest(request: GatewayFetchRequest, overrideSecret?: string): string {
    const secret = this.hmacSecret || overrideSecret;
    const bodyStr = JSON.stringify(request);
    return signGatewayRequest('POST', '/api/v1/fetch', request.timestamp, request.nonce, bodyStr, secret);
  }

  /**
   * Validates and verifies an incoming GatewayFetchResponseEnvelope with multi-layered checks:
   * 1. Schema version check
   * 2. RequestId & SourceId match check
   * 3. Source registration in energySourceRegistry
   * 4. Domain & Subdomain allowlist matching against source officialDomain
   * 5. Timestamp freshness (past & future skew tolerance)
   * 6. Replay protection check on request/envelope context
   * 7. HMAC response signature constant-time verification
   * 8. Payload decoding, Base64 validation, size bound (5 MB), actual length check, and SHA-256 digest match
   * 9. %PDF magic byte check for PDF documents
   */
  public verifyEnvelope(
    envelope: GatewayFetchResponseEnvelope,
    options: {
      expectedRequestId?: string;
      expectedNonce?: string;
      expectedSourceId?: string;
      overrideSecret?: string;
      nowMs?: number;
    } = {}
  ): GatewayVerificationResult {
    if (!envelope || typeof envelope !== 'object') {
      throw new GatewaySecurityError('انولوپ پاسخ گیت‌وی ارائه نشده یا نامعتبر است.', 'INVALID_GATEWAY_ENVELOPE', 400);
    }

    // 1. Schema version check
    if (envelope.schemaVersion !== SUPPORTED_GATEWAY_PROTOCOL_VERSION) {
      throw new GatewaySecurityError(
        `نسخه پروتکل انولوپ (${envelope.schemaVersion}) پشتیبانی نمی‌شود. نسخه معتبر: ${SUPPORTED_GATEWAY_PROTOCOL_VERSION}.`,
        'UNSUPPORTED_GATEWAY_PROTOCOL',
        400
      );
    }

    // 2. RequestId match
    if (options.expectedRequestId && envelope.requestId !== options.expectedRequestId) {
      throw new GatewaySecurityError(
        `شناسه درخواست در انولوپ (${envelope.requestId}) با شناسه مورد انتظار (${options.expectedRequestId}) مطابقت ندارد.`,
        'REQUEST_ID_MISMATCH',
        400
      );
    }

    // 2b. RequestNonce match (cryptographic binding to original request nonce)
    if (options.expectedNonce && envelope.requestNonce !== options.expectedNonce) {
      throw new GatewaySecurityError(
        `نانس درخواست در انولوپ (${envelope.requestNonce}) با نانس درخواست مورد انتظار (${options.expectedNonce}) مطابقت ندارد.`,
        'GATEWAY_REQUEST_NONCE_MISMATCH',
        400
      );
    }

    // 3. SourceId match
    if (options.expectedSourceId && envelope.sourceId !== options.expectedSourceId) {
      throw new GatewaySecurityError(
        `شناسه منبع در انولوپ (${envelope.sourceId}) با شناسه مورد انتظار (${options.expectedSourceId}) مطابقت ندارد.`,
        'SOURCE_ID_MISMATCH',
        400
      );
    }

    // 4. Source registration check
    const registeredSource = getEnergySourceById(envelope.sourceId);
    if (!registeredSource) {
      throw new GatewaySecurityError(
        `منبع اطلاعاتی با شناسه '${envelope.sourceId}' در سامانه ثبت نشده است.`,
        'UNKNOWN_SOURCE',
        400
      );
    }

    // 5. Defense-in-depth: Validate requestedUrl and finalUrl against registered source domain
    let parsedRequestedUrl: URL;
    let parsedFinalUrl: URL;
    try {
      parsedRequestedUrl = new URL(envelope.requestedUrl);
      parsedFinalUrl = new URL(envelope.finalUrl);
    } catch {
      throw new GatewaySecurityError('آدرس‌های اینترنتی انولوپ دارای ساختار نامعتبر هستند.', 'SOURCE_DOMAIN_MISMATCH', 403);
    }

    if (!isAllowedHostnameForSource(parsedRequestedUrl.hostname, registeredSource.officialDomain)) {
      throw new GatewaySecurityError(
        `دامنه درخواستی (${parsedRequestedUrl.hostname}) با مأخذ رسمی منبع (${registeredSource.officialDomain}) همخوانی ندارد.`,
        'SOURCE_DOMAIN_MISMATCH',
        403
      );
    }

    if (!isAllowedHostnameForSource(parsedFinalUrl.hostname, registeredSource.officialDomain)) {
      throw new GatewaySecurityError(
        `دامنه نهایی (${parsedFinalUrl.hostname}) با مأخذ رسمی منبع (${registeredSource.officialDomain}) همخوانی ندارد.`,
        'SOURCE_DOMAIN_MISMATCH',
        403
      );
    }

    // 6. Response authentication timestamp validation
    validateTimestampFreshness(envelope.responseTimestamp, options.nowMs);

    // 7. HMAC Response signature verification
    const secret = options.overrideSecret || this.hmacSecret;
    const isSignatureValid = verifyGatewayResponseSignature(envelope, secret);
    if (!isSignatureValid) {
      throw new GatewaySecurityError(
        'امضای دیجیتال انولوپ پاسخ گیت‌وی نامعتبر است (عدم تطابق امضا یا دستکاری کلید).',
        'INVALID_RESPONSE_SIGNATURE',
        401
      );
    }

    // 8. Payload decoding & exact byte-for-byte SHA-256 verification
    const rawPayloadBuffer = decodeAndVerifyPayload(envelope);

    const decodedText = envelope.payloadEncoding === 'utf8' 
      ? rawPayloadBuffer.toString('utf8')
      : undefined;

    return {
      isValid: true,
      envelope,
      rawPayloadBuffer,
      decodedText
    };
  }

  /**
   * Dispatches a fetch request through the configured gateway transport and verifies the response envelope.
   */
  public async fetchViaGateway(
    sourceId: string, 
    resourceKey: string,
    overrideSecret?: string
  ): Promise<GatewayVerificationResult> {
    const request = this.buildRequest(sourceId, resourceKey);
    const signature = this.signRequest(request, overrideSecret);

    if (!this.transport) {
      throw new GatewaySecurityError(
        'ترنسپورت ارتباط با گیت‌وی پیکربندی نشده است.',
        'GATEWAY_SECRET_NOT_CONFIGURED',
        500
      );
    }

    const endpointUrl = `${this.baseUrl}/api/v1/fetch`;
    const responseEnvelope = await this.transport.send(endpointUrl, request, signature);

    return this.verifyEnvelope(responseEnvelope, {
      expectedRequestId: request.requestId,
      expectedNonce: request.nonce,
      expectedSourceId: request.sourceId,
      overrideSecret
    });
  }
}
