import { db } from '../db/index.js';
import { Portfolio, OrganizationMember } from '../types/portfolio.js';

export const portfolioRepository = {
  getPortfoliosByOrg: (orgId: string): Portfolio[] => db.getPortfolios(orgId),
  getAllPortfolios: (): Portfolio[] => db.getPortfolios(),
  getPortfolioById: (id: string): Portfolio | undefined => db.getPortfolioById(id),
  createPortfolio: (portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Portfolio => db.createPortfolio(portfolio),
  updatePortfolio: (id: string, updates: Partial<Portfolio>): Portfolio | null => db.updatePortfolio(id, updates),
  deletePortfolio: (id: string): boolean => db.deletePortfolio(id),

  // Organization Members
  getOrganizationMembers: (orgId: string): OrganizationMember[] => db.getOrganizationMembers(orgId),
  getOrganizationMember: (orgId: string, userId: string): OrganizationMember | undefined => db.getOrganizationMember(orgId, userId),
  getUserMemberships: (userId: string): OrganizationMember[] => db.getOrganizationMembersByUserId(userId),
  addOrganizationMember: (member: Omit<OrganizationMember, 'id' | 'createdAt'>): OrganizationMember => db.createOrganizationMember(member),
  updateOrganizationMember: (id: string, updates: Partial<OrganizationMember>): OrganizationMember | null => db.updateOrganizationMember(id, updates),
  deleteOrganizationMember: (id: string): boolean => db.deleteOrganizationMember(id)
};
