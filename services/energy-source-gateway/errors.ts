/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — SANITIZED ERROR MODEL
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Sanitized, machine-readable protocol error types.
 * Prevents leaks of internal secrets, network addresses, or stack traces.
 */

export type GatewayServiceErrorCode =
  | 'INVALID_GATEWAY_SIGNATURE'
  | 'GATEWAY_SECRET_NOT_CONFIGURED'
  | 'REQUEST_TIMESTAMP_EXPIRED'
  | 'REQUEST_TIMESTAMP_IN_FUTURE'
  | 'REPLAY_DETECTED'
  | 'GATEWAY_REQUEST_NONCE_MISMATCH'
  | 'UNKNOWN_SOURCE'
  | 'RESOURCE_POLICY_VIOLATION'
  | 'SOURCE_DOMAIN_MISMATCH'
  | 'ORIGIN_UNREACHABLE'
  | 'UPSTREAM_TIMEOUT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'REDIRECT_POLICY_VIOLATION'
  | 'INVALID_UPSTREAM_RESPONSE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'REQUEST_BODY_TOO_LARGE'
  | 'INVALID_REQUEST_PAYLOAD'
  | 'ARBITRARY_URL_NOT_PERMITTED'
  | 'SSRF_BLOCKED'
  | 'UNSUPPORTED_GATEWAY_PROTOCOL';

export class GatewaySecurityError extends Error {
  public readonly code: GatewayServiceErrorCode;
  public readonly statusCode: number;
  public readonly requestId?: string;

  constructor(message: string, code: GatewayServiceErrorCode, statusCode = 400, requestId?: string) {
    super(message);
    this.name = 'GatewaySecurityError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    Object.setPrototypeOf(this, GatewaySecurityError.prototype);
  }

  public toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      requestId: this.requestId
    };
  }
}
