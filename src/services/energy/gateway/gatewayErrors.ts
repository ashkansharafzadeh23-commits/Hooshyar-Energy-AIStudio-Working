/**
 * HOOSHYAR ENERGY — GATEWAY SECURITY & PROTOCOL ERRORS
 * Stage 13.10.2-C2B: Secure Source Gateway Protocol Foundation
 * 
 * Sanitized error types with deterministic machine-readable codes.
 * Ensures internal secrets, raw keys, and full payloads are never leaked in error messages.
 */

export type GatewayErrorCode = 
  | 'GATEWAY_SECRET_NOT_CONFIGURED'
  | 'UNSUPPORTED_GATEWAY_PROTOCOL'
  | 'INVALID_GATEWAY_SIGNATURE'
  | 'INVALID_RESPONSE_SIGNATURE'
  | 'REQUEST_TIMESTAMP_EXPIRED'
  | 'REQUEST_TIMESTAMP_IN_FUTURE'
  | 'REPLAY_DETECTED'
  | 'UNKNOWN_SOURCE'
  | 'SOURCE_DOMAIN_MISMATCH'
  | 'INVALID_PAYLOAD_ENCODING'
  | 'PAYLOAD_HASH_MISMATCH'
  | 'PAYLOAD_LENGTH_MISMATCH'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_PDF_MAGIC'
  | 'INVALID_GATEWAY_ENVELOPE'
  | 'REQUEST_ID_MISMATCH'
  | 'GATEWAY_REQUEST_NONCE_MISMATCH'
  | 'SOURCE_ID_MISMATCH'
  | 'RESOURCE_POLICY_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'REQUEST_BODY_TOO_LARGE'
  | 'ARBITRARY_URL_NOT_PERMITTED'
  | 'UPSTREAM_FETCH_FAILED'
  | 'GATEWAY_TIMEOUT'
  | 'GATEWAY_UNAVAILABLE'
  | 'GATEWAY_HTTP_ERROR';

export class GatewaySecurityError extends Error {
  public readonly code: GatewayErrorCode;
  public readonly statusCode: number;
  public readonly requestId?: string;

  constructor(message: string, code: GatewayErrorCode, statusCode = 400, requestId?: string) {
    super(message);
    this.name = 'GatewaySecurityError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    Object.setPrototypeOf(this, GatewaySecurityError.prototype);
  }
}
