export function isSafeLegacyUrl(item: string): boolean {
  if (typeof item !== 'string') return false;
  const trimmed = item.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function isDangerousScheme(item: string): boolean {
  if (typeof item !== 'string') return false;
  const trimmed = item.trim().toLowerCase();
  return (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('ftp:') ||
    trimmed.startsWith('vbscript:')
  );
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export function validateClientFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: 'هیچ فایلی انتخاب نشده است.' };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'فایل انتخابی خالی است (حجم صفر).' };
  }

  const name = file.name.toLowerCase();
  const matchedExt = ALLOWED_DOCUMENT_EXTENSIONS.some(ext => name.endsWith(ext));
  if (!matchedExt) {
    return {
      isValid: false,
      error: 'فرمت فایل مجاز نیست. تنها فایل‌های PDF، JPG، PNG و WebP پشتیبانی می‌شوند.'
    };
  }

  const isPdf = name.endsWith('.pdf');
  if (isPdf && file.size > MAX_PDF_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'حجم سند PDF بیش از سقف مجاز (۱۵ مگابایت) است.'
    };
  }

  if (!isPdf && file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'حجم تصویر بیش از سقف مجاز (۵ مگابایت) است.'
    };
  }

  return { isValid: true };
}

/**
 * Filters out legacy string document entries whose exact name exists in the secure documents list.
 * Authoritative secure documents take precedence in the UI.
 */
export function filterLegacyDocuments(
  legacyList: string[],
  secureList: { name: string }[]
): string[] {
  if (!Array.isArray(legacyList) || legacyList.length === 0) return [];
  if (!Array.isArray(secureList) || secureList.length === 0) return [...legacyList];
  const secureNames = new Set(secureList.map(d => d.name));
  return legacyList.filter(name => !secureNames.has(name));
}

export type LegacyPresentationType = 'SAFE_URL' | 'DANGEROUS_URI' | 'PLAIN_TEXT';

export interface ClassifiedLegacyDocument {
  type: LegacyPresentationType;
  displayText: string;
  isClickable: boolean;
  url?: string;
}

/**
 * Classifies a legacy document string for secure rendering in the UI.
 */
export function classifyLegacyDocumentItem(item: string): ClassifiedLegacyDocument {
  if (isDangerousScheme(item)) {
    return {
      type: 'DANGEROUS_URI',
      displayText: 'سند با نشانی غیراستاندارد (غیرفعال)',
      isClickable: false
    };
  }
  if (isSafeLegacyUrl(item)) {
    return {
      type: 'SAFE_URL',
      displayText: item,
      isClickable: true,
      url: item
    };
  }
  return {
    type: 'PLAIN_TEXT',
    displayText: item,
    isClickable: false
  };
}

