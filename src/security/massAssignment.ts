/**
 * Mass Assignment Protection
 * Filters untrusted input objects against strict field whitelists and explicitly strips protected fields.
 */

export const PROTECTED_SYSTEM_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'ownerId',
  'organizationId',
  'createdBy',
  'createdById',
  'readinessScore',
  'verificationStatus',
  'approvedBy',
  'approvedAt',
  'systemScore',
  'internalStatus',
  'isAdmin',
  'role',
  'status' // when status is workflow-driven
]);

/**
 * Safely picks only allowed fields from input object
 */
export function pickAllowedFields<T extends Record<string, any>>(
  input: any,
  allowedFields: (keyof T | string)[]
): Partial<T> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const result: Partial<T> = {};
  const allowedSet = new Set(allowedFields as string[]);

  for (const field of allowedSet) {
    if (Object.prototype.hasOwnProperty.call(input, field) && input[field] !== undefined) {
      result[field as keyof T] = input[field];
    }
  }

  return result;
}

/**
 * Strips all protected system fields from input object
 */
export function stripProtectedFields<T extends Record<string, any>>(
  input: T,
  additionalProtected?: string[]
): Partial<T> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const protectedSet = new Set(PROTECTED_SYSTEM_FIELDS);
  if (additionalProtected) {
    additionalProtected.forEach(f => protectedSet.add(f));
  }

  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!protectedSet.has(key)) {
      result[key as keyof T] = value;
    }
  }

  return result;
}
