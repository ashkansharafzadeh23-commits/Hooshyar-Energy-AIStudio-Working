import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import {
  IFileStorageService,
  PutObjectParams,
  PutObjectResult,
  GetSignedUrlParams,
  StoredObjectMetadata
} from './IFileStorageService.js';
import {
  StorageError,
  StorageNotConfiguredError,
  StorageObjectNotFoundError
} from './StorageErrors.js';
import { ObjectStorageConfig } from '../config/environment.js';

export interface S3StorageOptions {
  config: ObjectStorageConfig;
  s3ClientOverride?: S3Client;
}

/**
 * Production-grade S3-Compatible File Storage Service.
 * Implements IFileStorageService for AWS S3, Cloudflare R2, ArvanCloud, Liara, MinIO.
 * 
 * Invariants:
 * - Bucket objects are strictly PRIVATE (no public-read ACL).
 * - Downloads are served via short-lived pre-signed URLs.
 * - Fails closed when credentials/bucket are missing.
 * - No AWS SDK types leak across the interface boundaries.
 * - Credentials and internal provider traces are never exposed in error responses.
 */
export class S3CompatibleFileStorageService implements IFileStorageService {
  private readonly config: ObjectStorageConfig;
  private s3Client: S3Client | null = null;

  constructor(options: S3StorageOptions) {
    this.config = options.config;

    if (options.s3ClientOverride) {
      this.s3Client = options.s3ClientOverride;
    } else if (this.config.isConfigured) {
      this.s3Client = new S3Client({
        region: this.config.region || 'us-east-1',
        endpoint: this.config.endpoint,
        forcePathStyle: this.config.forcePathStyle,
        credentials: {
          accessKeyId: this.config.accessKey || '',
          secretAccessKey: this.config.secretKey || ''
        }
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.s3Client && this.config.isConfigured);
  }

  private ensureConfigured(): S3Client {
    if (!this.s3Client || !this.config.isConfigured) {
      throw new StorageNotConfiguredError();
    }
    return this.s3Client;
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    const client = this.ensureConfigured();

    const checksumSha256 = crypto.createHash('sha256').update(params.body).digest('hex');

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        ContentLength: params.contentLength,
        Metadata: {
          ...params.metadata,
          'sha256-checksum': checksumSha256
        }
        // Strictly private: no ACL header passed, preserving bucket private policy
      });

      const response = await client.send(command);

      return {
        key: params.key,
        contentType: params.contentType,
        sizeBytes: params.contentLength,
        checksumSha256,
        etag: response.ETag?.replace(/"/g, ''),
        uploadedAt: new Date().toISOString()
      };
    } catch (err: any) {
      if (err instanceof StorageError) throw err;
      // Strip credentials/sensitive details from error
      throw new StorageError(
        'خطا در ذخیره‌سازی فایل در مخزن امن داده.',
        'STORAGE_UPLOAD_FAILED',
        500
      );
    }
  }

  async deleteObject(key: string): Promise<boolean> {
    const client = this.ensureConfigured();

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      await client.send(command);
      return true;
    } catch (err: any) {
      if (err instanceof StorageError) throw err;
      throw new StorageError('خطا در حذف فایل از مخزن داده.', 'STORAGE_DELETE_FAILED', 500);
    }
  }

  async getSignedDownloadUrl(params: GetSignedUrlParams): Promise<string> {
    const client = this.ensureConfigured();

    const expiresIn = params.expiresInSeconds && params.expiresInSeconds > 0
      ? params.expiresInSeconds
      : this.config.signedUrlTtlSeconds || 300;

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: params.key,
        ResponseContentDisposition: params.responseContentDisposition
      });

      const signedUrl = await getSignedUrl(client, command, { expiresIn });
      return signedUrl;
    } catch (err: any) {
      if (err instanceof StorageError) throw err;
      throw new StorageError('خطا در صدور پیوند موقت دانلود.', 'SIGNED_URL_FAILED', 500);
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const client = this.ensureConfigured();

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });
      await client.send(command);
      return true;
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound' || err?.code === 'NotFound') {
        return false;
      }
      return false;
    }
  }

  async getObjectMetadata(key: string): Promise<StoredObjectMetadata | null> {
    const client = this.ensureConfigured();

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });
      const response = await client.send(command);
      return {
        key,
        sizeBytes: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified?.toISOString(),
        metadata: response.Metadata
      };
    } catch (err: any) {
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') {
        return null;
      }
      throw new StorageError('خطا در دریافت مشخصات فایل.', 'STORAGE_METADATA_FAILED', 500);
    }
  }
}
