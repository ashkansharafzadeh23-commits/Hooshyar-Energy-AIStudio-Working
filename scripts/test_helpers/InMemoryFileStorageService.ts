import {
  IFileStorageService,
  PutObjectParams,
  PutObjectResult,
  GetSignedUrlParams,
  StoredObjectMetadata
} from '../../src/storage/IFileStorageService.js';
import crypto from 'crypto';

/**
 * In-Memory test double for IFileStorageService.
 * Strictly for unit/integration testing without network or real cloud credentials.
 * NEVER used in production code.
 */
export class InMemoryFileStorageService implements IFileStorageService {
  private configured: boolean;
  public objects = new Map<string, { body: Buffer; contentType: string; metadata?: Record<string, string> }>();
  public signedUrlTtl: number;

  constructor(isConfigured = true, signedUrlTtl = 300) {
    this.configured = isConfigured;
    this.signedUrlTtl = signedUrlTtl;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    if (!this.configured) {
      throw new Error('STORAGE_NOT_CONFIGURED');
    }
    this.objects.set(params.key, {
      body: params.body,
      contentType: params.contentType,
      metadata: params.metadata
    });
    const checksumSha256 = crypto.createHash('sha256').update(params.body).digest('hex');
    return {
      key: params.key,
      contentType: params.contentType,
      sizeBytes: params.contentLength,
      checksumSha256,
      etag: 'mock-etag-' + checksumSha256.slice(0, 8),
      uploadedAt: new Date().toISOString()
    };
  }

  async deleteObject(key: string): Promise<boolean> {
    if (!this.configured) {
      throw new Error('STORAGE_NOT_CONFIGURED');
    }
    return this.objects.delete(key);
  }

  async getSignedDownloadUrl(params: GetSignedUrlParams): Promise<string> {
    if (!this.configured) {
      throw new Error('STORAGE_NOT_CONFIGURED');
    }
    if (!this.objects.has(params.key)) {
      throw new Error('OBJECT_NOT_FOUND');
    }
    const ttl = params.expiresInSeconds || this.signedUrlTtl;
    return `https://mock-storage.test/download/${encodeURIComponent(params.key)}?X-Amz-Expires=${ttl}&mockSignature=valid`;
  }

  async objectExists(key: string): Promise<boolean> {
    if (!this.configured) return false;
    return this.objects.has(key);
  }

  async getObjectMetadata(key: string): Promise<StoredObjectMetadata | null> {
    if (!this.configured) return null;
    const obj = this.objects.get(key);
    if (!obj) return null;
    return {
      key,
      sizeBytes: obj.body.length,
      contentType: obj.contentType,
      lastModified: new Date().toISOString(),
      metadata: obj.metadata
    };
  }
}
