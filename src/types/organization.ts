export type VerificationStatus = 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface EpcPortfolioProject {
  id: string;
  title: string;
  projectType: string;
  province: string;
  city: string;
  installedCapacityKw?: number | null;
  completionYear?: number | string | null;
  description: string;
  images: string[];
  createdAt: string;
}

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
  city?: string;
  logoUrl?: string;
  logoKey?: string;
  bio?: string;
  specialties?: string[];
  projectPortfolio?: EpcPortfolioProject[];
  verificationStatus: VerificationStatus;
  type?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}
