/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — ENVELOPE BUILDER & SIGNER
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Cryptographically constructs and signs the GatewayFetchResponseEnvelope
 * in 100% compliance with C2B/C2B.1 contract specifications.
 */

import crypto from 'node:crypto';
import { 
  GatewayFetchRequest, 
  GatewayFetchResponseEnvelope, 
  GatewayProtocolVersion 
} from '../types.js';
import { UpstreamFetchResult } from './secureStreamFetcher.js';
import { getGatewayServiceSecret } from '../config.js';

export const PROTOCOL_VERSION: GatewayProtocolVersion = '1.0';

/**
 * Constructs the deterministic canonical response string.
 * Bound to requestNonce, responseTimestamp, and payloadSha256.
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
 * Signs the response envelope data using HMAC-SHA256.
 */
export function signResponseEnvelope(
  envelopeData: Omit<GatewayFetchResponseEnvelope, 'signature'>,
  secret?: string
): string {
  const hmacSecret = getGatewayServiceSecret(secret);
  const canonicalString = buildCanonicalResponseString(envelopeData);
  return crypto.createHmac('sha256', hmacSecret).update(canonicalString).digest('hex');
}

/**
 * Builds and signs a complete GatewayFetchResponseEnvelope.
 */
export function buildSignedResponseEnvelope(
  gatewayId: string,
  request: GatewayFetchRequest,
  fetchResult: UpstreamFetchResult,
  secret?: string,
  overrideResponseTimestamp?: string
): GatewayFetchResponseEnvelope {
  const responseTimestamp = overrideResponseTimestamp || new Date().toISOString();

  const envelopeData: Omit<GatewayFetchResponseEnvelope, 'signature'> = {
    schemaVersion: PROTOCOL_VERSION,
    gatewayId,
    requestId: request.requestId,
    requestNonce: request.nonce, // Mirrors original request nonce
    sourceId: request.sourceId,
    requestedUrl: fetchResult.requestedUrl,
    finalUrl: fetchResult.finalUrl,
    httpStatus: fetchResult.httpStatus,
    contentType: fetchResult.contentType,
    contentLength: fetchResult.contentLength,
    payloadSha256: fetchResult.payloadSha256,
    payloadEncoding: fetchResult.payloadEncoding,
    payload: fetchResult.payload,
    responseTimestamp, // Gateway authentication time
    fetchedAt: fetchResult.fetchedAt, // Upstream fetch time
    headers: fetchResult.headers
  };

  const signature = signResponseEnvelope(envelopeData, secret);

  return {
    ...envelopeData,
    signature
  };
}
