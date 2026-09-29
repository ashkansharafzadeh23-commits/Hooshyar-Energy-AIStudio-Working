import crypto from 'crypto';
import path from 'path';
import { FileValidationError } from './StorageErrors.js';

export interface ValidatedBinaryFile {
  originalFilename: string;
  sanitizedFilename: string;
  extension: string;
  detectedMimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  buffer: Buffer;
}

export interface FileValidationOptions {
  allowedTypes?: ('PDF' | 'IMAGE')[];
  maxImageSizeBytes?: number;
  maxPdfSizeBytes?: number;
}

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;  // 15 MB

/**
 * Sanitizes original filename strictly for display and metadata.
 * Strips directory traversal tokens, control characters, null bytes, and unsafe characters.
 */
export function sanitizeOriginalFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') return 'unnamed_file';
  
  // 1. Remove null bytes and control chars
  let cleaned = filename.replace(/[\0\x00-\x1F\x7F]/g, '');
  
  // 2. Remove directory traversal sequences
  cleaned = cleaned.replace(/(\.\.(\/|\\))/g, '');
  
  // 3. Extract basename
  cleaned = path.basename(cleaned);
  
  // 4. Normalize unicode (NFKC)
  cleaned = cleaned.normalize('NFKC');
  
  // 5. Replace potentially dangerous symbols while preserving Persian, Arabic, English, digits, dash, underscore, dot
  cleaned = cleaned.replace(/[^\u0600-\u06FF\uFB8A\u067E\u0686\u06AFa-zA-Z0-9_\-\. ]/g, '_').trim();
  
  // 6. Avoid leading dot (hidden file) or double dots
  cleaned = cleaned.replace(/^\.+/, '').replace(/\.{2,}/g, '.');

  return cleaned || 'unnamed_file';
}

/**
 * Validates binary buffer inspecting magic bytes, file size, extension, and computing SHA-256.
 * Rejects SVG, HTML, JS, EXE, shell scripts, and unknown binary formats.
 */
export function validateBinaryFile(
  buffer: Buffer,
  filename: string,
  declaredMimeType?: string,
  options?: FileValidationOptions
): ValidatedBinaryFile {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new FileValidationError('داده فایل ارائه نشده است.', 400);
  }

  if (buffer.length === 0) {
    throw new FileValidationError('فایل ارسالی خالی است (حجم صفر).', 400);
  }

  const allowedTypes = options?.allowedTypes || ['PDF', 'IMAGE'];
  const maxImageSize = options?.maxImageSizeBytes || MAX_IMAGE_SIZE_BYTES;
  const maxPdfSize = options?.maxPdfSizeBytes || MAX_PDF_SIZE_BYTES;

  const sanitizedFilename = sanitizeOriginalFilename(filename);
  const rawExt = path.extname(sanitizedFilename).toLowerCase();

  // Inspect binary magic bytes
  let detectedType: 'PDF' | 'JPEG' | 'PNG' | 'WEBP' | null = null;
  let detectedMime = '';

  // 1. PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    detectedType = 'PDF';
    detectedMime = 'application/pdf';
  }
  // 2. JPEG: FF D8 FF
  else if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedType = 'JPEG';
    detectedMime = 'image/jpeg';
  }
  // 3. PNG: 89 50 4E 47 0D 0A 1A 0A
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedType = 'PNG';
    detectedMime = 'image/png';
  }
  // 4. WebP: RIFF....WEBP
  else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    detectedType = 'WEBP';
    detectedMime = 'image/webp';
  }

  // Reject unsupported / dangerous / unknown files
  if (!detectedType) {
    // Check if user uploaded HTML, SVG, script, or executable
    const headerAscii = buffer.subarray(0, 100).toString('utf-8', 0, Math.min(100, buffer.length)).toLowerCase();
    if (headerAscii.includes('<svg') || headerAscii.includes('<?xml')) {
      throw new FileValidationError('بارگذاری فایل‌های برداری SVG به دلیل ریسک‌های امنیتی مجاز نمی‌باشد.', 415);
    }
    if (headerAscii.includes('<html') || headerAscii.includes('<!doctype html') || headerAscii.includes('<script')) {
      throw new FileValidationError('بارگذاری اسکریپت یا اسناد وب (HTML/JS) مجاز نمی‌باشد.', 415);
    }
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      throw new FileValidationError('بارگذاری فایل‌های اجرایی (EXE/DLL) اکیداً ممنوع است.', 415);
    }

    throw new FileValidationError(
      'نوع فایل نامعتبر است یا با پسوند آن همخوانی ندارد. تنها فایل‌های PDF، JPG، PNG و WebP پشتیبانی می‌شوند.',
      415
    );
  }

  // Category check
  const isImage = detectedType === 'JPEG' || detectedType === 'PNG' || detectedType === 'WEBP';
  if (isImage && !allowedTypes.includes('IMAGE')) {
    throw new FileValidationError('بارگذاری تصویر در این بخش مجاز نیست.', 400);
  }
  if (detectedType === 'PDF' && !allowedTypes.includes('PDF')) {
    throw new FileValidationError('بارگذاری سند PDF در این بخش مجاز نیست.', 400);
  }

  // Size limit checks
  if (isImage && buffer.length > maxImageSize) {
    throw new FileValidationError(
      `حجم تصویر ارسالی بیش از سقف مجاز (${Math.round(maxImageSize / (1024 * 1024))} مگابایت) است.`,
      413
    );
  }
  if (detectedType === 'PDF' && buffer.length > maxPdfSize) {
    throw new FileValidationError(
      `حجم سند PDF بیش از سقف مجاز (${Math.round(maxPdfSize / (1024 * 1024))} مگابایت) است.`,
      413
    );
  }

  // Mismatch check between declared MIME/extension and detected magic bytes
  if (declaredMimeType) {
    const cleanDeclared = declaredMimeType.toLowerCase().trim();
    // Allow standard octet-stream fallback from some clients, but if specific image/pdf declared it must match
    if (cleanDeclared !== 'application/octet-stream' && cleanDeclared !== detectedMime) {
      // Allow image/jpg vs image/jpeg
      const isJpgMatch = (cleanDeclared === 'image/jpg' || cleanDeclared === 'image/jpeg') && detectedMime === 'image/jpeg';
      if (!isJpgMatch) {
        throw new FileValidationError('تناقض بین نوع محتوای اظهار شده و بایت‌های واقعی فایل.', 400);
      }
    }
  }

  // Calculate deterministic SHA-256 checksum
  const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // Determine standard file extension
  let standardExt = '.bin';
  if (detectedType === 'PDF') standardExt = '.pdf';
  else if (detectedType === 'JPEG') standardExt = '.jpg';
  else if (detectedType === 'PNG') standardExt = '.png';
  else if (detectedType === 'WEBP') standardExt = '.webp';

  return {
    originalFilename: filename,
    sanitizedFilename,
    extension: standardExt,
    detectedMimeType: detectedMime,
    sizeBytes: buffer.length,
    checksumSha256,
    buffer
  };
}
