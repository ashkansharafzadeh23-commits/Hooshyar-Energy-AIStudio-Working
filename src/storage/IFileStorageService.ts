/**
 * Storage Abstraction Types and Interface
 * Provider-neutral contract for private file storage.
 * Application code depends ONLY on this interface and NEVER on AWS SDK types.
 */

export interface PutObjectParams {
  key: string;
  body: Buffer;
  contentType: string;
  contentLength: number;
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  key: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  etag?: string;
  uploadedAt: string;
}

export interface GetSignedUrlParams {
  key: string;
  expiresInSeconds?: number;
  responseContentDisposition?: string;
}

export interface StoredObjectMetadata {
  key: string;
  sizeBytes: number;
  contentType: string;
  lastModified?: string;
  metadata?: Record<string, string>;
}

export interface IFileStorageService {
  isConfigured(): boolean;
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
  deleteObject(key: string): Promise<boolean>;
  getSignedDownloadUrl(params: GetSignedUrlParams): Promise<string>;
  objectExists(key: string): Promise<boolean>;
  getObjectMetadata?(key: string): Promise<StoredObjectMetadata | null>;
}
