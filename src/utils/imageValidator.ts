/**
 * Image Validation and Normalization Service (Stage 11.3)
 * Enforces strict MIME types, base64 payload normalization,
 * size boundaries, and magic-byte inspection.
 */

export interface ValidatedImage {
  name: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64Data: string;
  sizeBytes: number;
}

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class ImageValidationError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ImageValidationError';
    this.statusCode = statusCode;
  }
}

/**
 * Validates, checks magic bytes, checks size limit, and normalizes an image input.
 * Accepts:
 *  - Data URL string: data:image/jpeg;base64,...
 *  - Raw base64 string
 *  - Object: { name?: string, data?: string, base64?: string, mimeType?: string, type?: string }
 */
export function validateAndNormalizeImage(
  input: any,
  index = 0
): ValidatedImage {
  if (!input) {
    throw new ImageValidationError('داده تصویر ارائه نشده است.');
  }

  let rawString = '';
  let declaredName = `photo_${index + 1}.jpg`;
  let declaredMime = '';

  if (typeof input === 'string') {
    rawString = input.trim();
  } else if (typeof input === 'object') {
    rawString = (input.data || input.base64 || input.preview || '').toString().trim();
    declaredName = input.name || input.filename || declaredName;
    declaredMime = (input.mimeType || input.type || '').toString().toLowerCase().trim();
  }

  if (!rawString) {
    throw new ImageValidationError('داده تصویر ارسالی خالی است.');
  }

  // 1. Separate Data URL scheme if present
  let base64Payload = rawString;
  if (rawString.startsWith('data:')) {
    const dataUrlMatch = rawString.match(/^data:([^;]+);base64,(.+)$/s);
    if (!dataUrlMatch) {
      throw new ImageValidationError('فرمت داده تصویر (Base64) نامعتبر است.');
    }
    declaredMime = dataUrlMatch[1].toLowerCase().trim();
    base64Payload = dataUrlMatch[2].trim();
  }

  // 2. Reject if base64 contains invalid characters
  // Normalize whitespace
  base64Payload = base64Payload.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(base64Payload)) {
    throw new ImageValidationError('فرمت داده تصویر (Base64) نامعتبر است.');
  }

  // Check padding
  if (base64Payload.length % 4 !== 0) {
    throw new ImageValidationError('فرمت داده تصویر (Base64) نامعتبر است.');
  }

  // 3. Decode base64 to binary buffer
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Payload, 'base64');
  } catch {
    throw new ImageValidationError('فرمت داده تصویر (Base64) نامعتبر است.');
  }

  if (buffer.length === 0) {
    throw new ImageValidationError('فرمت داده تصویر (Base64) نامعتبر است.');
  }

  // 4. Validate image size limit (5 MB)
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageValidationError('حجم تصویر بیش از حد مجاز است. حداکثر ۵ مگابایت مجاز است.', 413);
  }

  // 5. Inspect magic bytes for real content type (not trusting extension alone)
  let detectedMime: 'image/jpeg' | 'image/png' | 'image/webp' | null = null;

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedMime = 'image/jpeg';
  }
  // PNG: 89 50 4E 47
  else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    detectedMime = 'image/png';
  }
  // WebP: RIFF....WEBP
  else if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    detectedMime = 'image/webp';
  }

  if (!detectedMime) {
    throw new ImageValidationError(
      'فرمت تصویر پشتیبانی نمیشود. لطفاً تصویر JPG، PNG یا WebP بارگذاری کنید.',
      415
    );
  }

  // If declared MIME was provided and unsupported, double check
  if (declaredMime && !SUPPORTED_MIME_TYPES.has(declaredMime) && declaredMime !== detectedMime) {
    throw new ImageValidationError(
      'فرمت تصویر پشتیبانی نمیشود. لطفاً تصویر JPG، PNG یا WebP بارگذاری کنید.',
      415
    );
  }

  return {
    name: declaredName,
    mimeType: detectedMime,
    base64Data: base64Payload,
    sizeBytes: buffer.length
  };
}
