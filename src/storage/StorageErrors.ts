/**
 * Storage Errors
 * Normalized, secure error model preventing credential leakage or raw stack exposure.
 */

export class StorageError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = 'STORAGE_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class StorageNotConfiguredError extends StorageError {
  constructor(message = 'فضای ذخیره‌سازی ابری پیکربندی نشده است.') {
    super(message, 'STORAGE_NOT_CONFIGURED', 503);
    this.name = 'StorageNotConfiguredError';
  }
}

export class StorageObjectNotFoundError extends StorageError {
  constructor(key: string) {
    super(`فایل مورد نظر یافت نشد: ${key}`, 'OBJECT_NOT_FOUND', 404);
    this.name = 'StorageObjectNotFoundError';
  }
}

export class FileValidationError extends StorageError {
  constructor(message: string, statusCode = 400) {
    super(message, 'FILE_VALIDATION_ERROR', statusCode);
    this.name = 'FileValidationError';
  }
}
