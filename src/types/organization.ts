export type VerificationStatus = 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Organization {
  id: string;
  legalName: string;
  tradeName: string;
  registrationNumber?: string;
  nationalId?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  verificationStatus: VerificationStatus;
  type?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}
