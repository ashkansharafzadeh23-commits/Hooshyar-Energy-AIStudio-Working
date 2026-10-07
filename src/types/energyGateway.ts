/**
 * HOOSHYAR ENERGY — SOURCE GATEWAY CONTRACT TYPES
 * Stage 13.10.2-C2B: Secure Source Gateway Protocol Foundation
 * 
 * Versioned protocol definitions for communication between the main backend
 * and the isolated Iran-side source gateway service.
 * 
 * CRITICAL BOUNDARIES:
 * - Version: 1.0
 * - Does NOT accept arbitrary URLs from frontend/clients
 * - Resource keys are server-controlled representations resolved against trusted policies
 * - Enforces exact payload hash verification, bounded payload sizes, and replay protection
 * - Contains zero editorial/publication logic
 */

export type GatewayProtocolVersion = '1.0';

export type GatewayPayloadEncoding = 'utf8' | 'base64';

export interface GatewayResponseSafeHeaders {
  etag?: string;
  lastModified?: string;
}

/**
 * Server-controlled request sent from Main Backend to Gateway.
 * resourceKey represents a verified catalog key, NEVER an arbitrary client URL.
 */
export interface GatewayFetchRequest {
  schemaVersion: GatewayProtocolVersion;
  requestId: string;
  sourceId: string;
  resourceKey: string;
  timestamp: string;
  nonce: string;
}

/**
 * Versioned response envelope returned by Gateway to Main Backend.
 * Cryptographically binds all transport metadata and exact raw payload bytes.
 */
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

/**
 * Contract/Interface for source-specific resource policies.
 * Enables strict path/host restrictions for each source without hardcoding arbitrary URLs.
 */
export interface EnergyGatewayResourcePolicy {
  sourceId: string;
  resourceKey: string;
  allowedHostnames: string[];
  allowedPathPatterns: string[];
  method: 'GET';
  maxPayloadBytes: number;
  allowedContentTypes: string[];
}

/**
 * Abstraction for replay protection nonce stores.
 * PILOT LIMITATION: In-memory store is single-instance only.
 * Future horizontal scaling will substitute this with a distributed/Redis atomic store.
 */
export interface IGatewayNonceStore {
  hasSeen(nonce: string): Promise<boolean> | boolean;
  markSeen(nonce: string, ttlMs?: number): Promise<void> | void;
  cleanup(): Promise<void> | void;
}

export interface GatewayVerificationResult {
  isValid: boolean;
  envelope?: GatewayFetchResponseEnvelope;
  rawPayloadBuffer?: Buffer;
  decodedText?: string;
  error?: string;
  errorCode?: string;
}
