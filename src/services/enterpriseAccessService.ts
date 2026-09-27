import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { EnterpriseRole, OrganizationMember, Portfolio } from '../types/portfolio.js';
import { Organization } from '../types/organization.js';

export interface AccessResult {
  allowed: boolean;
  status: number;
  error?: string;
  member?: OrganizationMember;
  organization?: Organization;
  isGlobalAdmin?: boolean;
}

export const enterpriseAccessService = {
  /**
   * Validates if a user has access to the specified organization.
   */
  checkOrganizationAccess(
    orgId: string, 
    user: any, 
    requiredRoles?: EnterpriseRole[]
  ): AccessResult {
    if (!user || !user.id) {
      return { allowed: false, status: 401, error: 'Authentication required' };
    }

    const org = organizationRepository.findById(orgId);
    if (!org) {
      return { allowed: false, status: 404, error: 'Organization not found' };
    }

    const roleUpper = (user.role || (Array.isArray(user.roles) ? user.roles[0] : ''))?.toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
      return { allowed: true, status: 200, organization: org, isGlobalAdmin: true };
    }

    const members = portfolioRepository.getOrganizationMembers(orgId);
    const member = members.find(m => m.userId === user.id && m.status === 'ACTIVE');

    if (!member) {
      return { 
        allowed: false, 
        status: 403, 
        error: 'شما دسترسی مجاز به این سازمان ندارید (عدم عضویت یا حساب کاربری غیرفعال)' 
      };
    }

    if (requiredRoles && requiredRoles.length > 0) {
      // Role hierarchy check: OWNER has all rights, ADMIN has almost all
      const hasPermission = this.hasRolePermission(member.role, requiredRoles);
      if (!hasPermission) {
        return { 
          allowed: false, 
          status: 403, 
          error: 'سطح دسترسی شما در این سازمان برای انجام این عملیات کافی نیست', 
          member, 
          organization: org 
        };
      }
    }

    return { allowed: true, status: 200, member, organization: org };
  },

  /**
   * Validates if a user has access to a specific portfolio.
   */
  checkPortfolioAccess(
    portfolioId: string, 
    user: any, 
    requiredRoles?: EnterpriseRole[]
  ): AccessResult & { portfolio?: Portfolio } {
    if (!user || !user.id) {
      return { allowed: false, status: 401, error: 'Authentication required' };
    }

    const portfolio = portfolioRepository.getPortfolioById(portfolioId);
    if (!portfolio) {
      return { allowed: false, status: 404, error: 'Portfolio not found' };
    }

    const orgAccess = this.checkOrganizationAccess(portfolio.organizationId, user, requiredRoles);
    if (!orgAccess.allowed) {
      return { ...orgAccess, portfolio };
    }

    return { ...orgAccess, portfolio };
  },

  /**
   * Checks if user has access to a project within the enterprise/organization scope.
   */
  checkEnterpriseProjectAccess(
    projectId: string, 
    orgId: string, 
    user: any
  ): AccessResult {
    const orgAccess = this.checkOrganizationAccess(orgId, user);
    if (!orgAccess.allowed) return orgAccess;

    const project = projectRepository.findById(projectId);
    if (!project) {
      return { allowed: false, status: 404, error: 'Project not found' };
    }

    // Verify project belongs to this organization
    if (project.organizationId && project.organizationId !== orgId) {
      return { 
        allowed: false, 
        status: 403, 
        error: 'این پروژه متعلق به این سازمان نمی‌باشد (خطای جداسازی سازمانی)' 
      };
    }

    return orgAccess;
  },

  /**
   * Role hierarchy and capability matching.
   */
  hasRolePermission(userRole: EnterpriseRole, requiredRoles: EnterpriseRole[]): boolean {
    if (userRole === 'OWNER') return true;
    if (userRole === 'ADMIN' && !requiredRoles.includes('OWNER')) return true;
    return requiredRoles.includes(userRole);
  }
};
