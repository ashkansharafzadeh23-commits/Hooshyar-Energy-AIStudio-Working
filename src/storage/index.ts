import { IFileStorageService } from './IFileStorageService.js';
import { S3CompatibleFileStorageService } from './S3CompatibleFileStorageService.js';
import { getEnvironmentConfig } from '../config/environment.js';

let defaultStorageService: IFileStorageService | null = null;

/**
 * Access the shared IFileStorageService singleton.
 * Configured automatically from environment variables.
 */
export function getFileStorageService(): IFileStorageService {
  if (!defaultStorageService) {
    const config = getEnvironmentConfig();
    defaultStorageService = new S3CompatibleFileStorageService({
      config: config.objectStorage
    });
  }
  return defaultStorageService;
}

/**
 * Override storage service singleton for testing / dependency injection.
 */
export function setFileStorageService(service: IFileStorageService | null): void {
  defaultStorageService = service;
}

export * from './IFileStorageService.js';
export * from './S3CompatibleFileStorageService.js';
export * from './StorageErrors.js';
export * from './fileValidator.js';
export * from './storageKeyGenerator.js';
export * from './uploadMiddleware.js';
