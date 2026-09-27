import { db } from '../db/index.js';
import { Organization } from '../types/organization.js';

export const organizationRepository = {
  findAll: () => db.getOrganizations(),
  findById: (id: string) => db.getOrganizationById(id),
  create: (org: Omit<Organization, "id" | "createdAt" | "updatedAt">) => db.createOrganization(org),
  getMembers: (orgId: string) => db.getOrganizationMembers(orgId),
  findMember: (orgId: string, userId: string) => db.getOrganizationMember(orgId, userId),
  addMember: (data: { organizationId: string; userId: string; role: any; status: any }) => db.createOrganizationMember(data),
};
