/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — PROTOCOL TYPES
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Version 1.0 Gateway Protocol Definitions.
 * Fully compatible with C2B/C2B.1 contract specifications.
 */

export type GatewayProtocolVersion = '1.0';
export type GatewayPayloadEncoding = 'utf8' | 'base64';

export interface GatewayResponseSafeHeaders {
  etag?: string;
  lastModified?: string;
}

export interface GatewayFetchRequest {
  schemaVersion: GatewayProtocolVersion;
  requestId: string;
  sourceId: string;
  resourceKey: string;
  timestamp: string;
  nonce: string;
}

export interface GatewayFetchResponseEnvelope {
  schemaVersion: GatewayProtocolVersion;
  gatewayId: string;
  requestId: string;
  requestNonce: string;
  sourceId: string;
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  contentLength: number;
  payloadSha256: string;
  payloadEncoding: GatewayPayloadEncoding;
  payload: string;
  responseTimestamp: string;
  fetchedAt: string;
  headers?: GatewayResponseSafeHeaders;
  signature: string;
}

export interface GatewaySourceConfig {
  id: string;
  name: string;
  officialDomain: string;
  allowedSubdomains: string[];
  isActive: boolean;
}

export interface EnergyGatewayResourcePolicy {
  sourceId: string;
  resourceKey: string;
  targetUrl: string;
  allowedHostnames: string[];
  allowedPathPatterns: string[];
  method: 'GET';
  maxPayloadBytes: number;
  allowedContentTypes: string[];
}
