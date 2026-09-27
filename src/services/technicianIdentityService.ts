import { professionalRepository } from '../repositories/professionalRepository.js';

export interface TechnicianIdentityResolution {
  userId: string;
  professionalId: string | null;
  allIdentities: string[];
  isApproved: boolean;
  professional: any | null;
}

/**
 * Resolves the authenticated technician's professional profile using the authoritative
 * server-side userId relationship.
 * 
 * Security rules:
 * 1. Strictly relies on verified user.id from server-authenticated session.
 * 2. Matches professional profile ONLY via authoritative p.userId === userId.
 *    A profile is NEVER associated merely because p.id === userId.
 * 3. Never trusts client-supplied identifiers as proof of identity.
 * 4. Does NOT create duplicate professional profiles if none exists.
 */
export function resolveTechnicianProfile(userId: string): any | null {
  if (!userId) return null;
  
  if (typeof professionalRepository.getProfessionalByUserId === 'function') {
    const found = professionalRepository.getProfessionalByUserId(userId);
    if (found) return found;
  }
  
  const pros = professionalRepository.getProfessionals?.() || [];
  return pros.find((p: any) => p.userId === userId) || null;
}

/**
 * Resolves all legitimate server-authoritative identifiers representing the authenticated technician.
 * Includes:
 * - user.id (User account identifier)
 * - professional.id (Professional profile identifier, resolved strictly through verified userId relationship)
 */
export function getTechnicianIdentities(userId: string): Set<string> {
  const ids = new Set<string>();
  if (!userId) return ids;

  ids.add(userId);

  const pro = resolveTechnicianProfile(userId);
  if (pro) {
    if (pro.id) ids.add(pro.id);
  }

  return ids;
}

/**
 * Verifies whether a maintenance case is assigned to the authenticated technician.
 * 
 * Supports:
 * - Cases assigned with professional.id (e.g. from technician matching)
 * - Cases assigned with user.id (e.g. direct admin or system assignment for backward compatibility)
 * 
 * Enforces strict boundary isolation:
 * - Returns FALSE if assignedTechnicianId is missing or empty.
 * - Returns FALSE if assignedTechnicianId does not belong to the authenticated user.
 * - Prevents cross-technician IDOR.
 */
export function isCaseAssignedToTechnician(
  assignedTechnicianId: string | undefined | null,
  userId: string | undefined | null
): boolean {
  if (!assignedTechnicianId || !userId) return false;

  // Direct fast equality check for backward compatibility with actual user.id assignment
  if (assignedTechnicianId === userId) return true;

  const legitimateIdentities = getTechnicianIdentities(userId);
  return legitimateIdentities.has(assignedTechnicianId);
}

/**
 * Full identity resolution metadata for an authenticated technician.
 */
export function resolveTechnicianIdentity(userId: string): TechnicianIdentityResolution {
  const pro = resolveTechnicianProfile(userId);
  const isApproved = Boolean(
    pro && (pro.status === 'approved' || (pro as any).approvalStatus === 'APPROVED')
  );

  return {
    userId,
    professionalId: pro?.id || null,
    allIdentities: Array.from(getTechnicianIdentities(userId)),
    isApproved,
    professional: pro
  };
}
