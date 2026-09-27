import path from 'path';

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.dwg',
  '.dxf',
  '.xlsx',
  '.csv',
  '.zip'
]);

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/acad',
  'image/vnd.dwg'
]);

export const uploadSecurity = {
  /**
   * Sanitizes a filename to remove path traversal sequences, null bytes, and non-alphanumeric special characters
   */
  sanitizeFileName(filename: string): string {
    if (!filename) return 'unnamed_file';
    
    // Remove null bytes and directory traversal tokens
    let cleaned = filename.replace(/\0/g, '').replace(/(\.\.(\/|\\))/g, '');
    
    // Extract basename
    cleaned = path.basename(cleaned);

    // Keep only safe characters: letters, digits, dash, underscore, dot
    cleaned = cleaned.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    return cleaned || 'unnamed_file';
  },

  /**
   * Validates that the file extension is strictly within the allowed whitelist
   */
  isExtensionAllowed(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
  },

  /**
   * Validates MIME type
   */
  isMimeTypeAllowed(mime: string): boolean {
    return ALLOWED_MIME_TYPES.has(mime.toLowerCase());
  }
};
