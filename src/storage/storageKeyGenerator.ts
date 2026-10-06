import crypto from 'crypto';
import path from 'path';

export interface StorageKeyOptions {
  scope: 'projects' | 'maintenance' | 'rfq' | 'bids' | 'assets' | 'partners' | 'contractors' | 'vendors' | 'technicians';
  entityId: string;
  category: string;
  extension: string;
}

/**
 * Generate a non-guessable, structured, private storage key.
 * Pattern: {scope}/{sanitizedEntityId}/{sanitizedCategory}/{date}/{uuid}.{ext}
 * 
 * Invariants:
 * - Client NEVER controls the object key or destination path.
 * - Path traversal tokens (../, null bytes, backslashes) are strictly neutralized.
 * - Original filename is NEVER in the storage key (preventing injection, collisions, or guessing).
 */
export function generateStorageKey(options: StorageKeyOptions): string {
  const scope = options.scope;
  
  // Sanitize entityId to prevent directory traversal
  const cleanEntityId = (options.entityId || 'unassigned')
    .replace(/\0/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 64) || 'unassigned';

  // Sanitize category
  const cleanCategory = (options.category || 'general')
    .replace(/\0/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 32) || 'general';

  // Sanitize extension
  let cleanExt = (options.extension || '')
    .replace(/\0/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 10);
  
  if (cleanExt.startsWith('.')) {
    cleanExt = cleanExt.slice(1);
  }
  const extPart = cleanExt ? `.${cleanExt}` : '';

  // Non-guessable random UUIDv4 and date partition
  const uniqueId = crypto.randomUUID();
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return `${scope}/${cleanEntityId}/${cleanCategory}/${dateStr}/${uniqueId}${extPart}`;
}

/**
 * Validates that an existing key is well-formed and does not attempt directory traversal.
 */
export function validateStorageKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.includes('\0')) return false;
  if (key.includes('..')) return false;
  if (key.startsWith('/') || key.startsWith('\\')) return false;
  
  // Normalized path must match original string without path traversal reduction
  const normalized = path.posix.normalize(key);
  if (normalized !== key) return false;
  
  // Must match valid character pattern
  return /^[a-zA-Z0-9_\-/.]+$/.test(key);
}
