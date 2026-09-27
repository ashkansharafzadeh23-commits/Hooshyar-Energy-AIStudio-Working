import { Request, Response, NextFunction } from 'express';
import { projectRepository } from '../repositories/projectRepository.js';
import { organizationRepository } from '../repositories/organizationRepository.js';
import { assetRepository } from '../repositories/assetRepository.js';
import { securityLogger } from '../security/securityLogger.js';

declare global {
  namespace Express {
    interface Request {
      project?: any;
      organization?: any;
      asset?: any;
      portfolio?: any;
    }
  }
}

/**
 * Ensures request has an authenticated user
 */
export const requireAuthenticatedUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    securityLogger.logSecurityEvent({
      type: 'AUTH_FAILURE',
      requestId: (req as any).id,
      path: req.originalUrl || req.path,
      details: { reason: 'UNAUTHENTICATED' }
    });
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required to access this resource',
      requestId: (req as any).id
    });
  }
  next();
};

/**
 * Ensures authenticated user has Global Admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      requestId: (req as any).id
    });
  }

  const roleUpper = (req.user.role || '').toUpperCase();
  if (roleUpper !== 'ADMIN' && roleUpper !== 'SUPER_ADMIN') {
    securityLogger.logSecurityEvent({
      type: 'AUTHZ_DENIED',
      requestId: (req as any).id,
      userId: req.user.id,
      path: req.originalUrl || req.path,
      details: { required: 'ADMIN', actual: req.user.role }
    });
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Administrative privileges required',
      requestId: (req as any).id
    });
  }
  next();
};

/**
 * Ensures authenticated user has access to specified project
 */
export const requireProjectAccess = (allowedMemberRoles?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: (req as any).id
      });
    }

    const rawProjectId = req.params.projectId || req.params.id;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Project ID parameter is required',
        requestId: (req as any).id
      });
    }

    const project = projectRepository.findById(projectId);
    if (!project) {
      return res.status(404).json({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
        requestId: (req as any).id
      });
    }

    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
      req.project = project;
      return next();
    }

    const isOwner = project.ownerId === req.user.id;
    if (isOwner) {
      req.project = project;
      return next();
    }

    const members = projectRepository.getMembers(projectId) || [];
    const member = members.find(m => m.userId === req.user.id && (!m.status || m.status === 'ACTIVE'));

    if (!member) {
      securityLogger.logSecurityEvent({
        type: 'IDOR_ATTEMPT',
        requestId: (req as any).id,
        userId: req.user.id,
        path: req.originalUrl || req.path,
        details: { targetProjectId: projectId }
      });
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'شما به این پروژه دسترسی ندارید (عدم عضویت)',
        requestId: (req as any).id
      });
    }

    if (allowedMemberRoles && allowedMemberRoles.length > 0) {
      if (!allowedMemberRoles.includes(member.role)) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'سطح دسترسی شما برای این عملیات کافی نیست',
          requestId: (req as any).id
        });
      }
    }

    req.project = project;
    next();
  };
};

/**
 * Ensures authenticated user has access to specified organization
 */
export const requireOrganizationAccess = (allowedRoles?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: (req as any).id
      });
    }

    const rawOrgId = req.params.organizationId || req.params.orgId || req.params.id;
    const orgId = Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId;
    if (!orgId || typeof orgId !== 'string') {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Organization ID parameter is required',
        requestId: (req as any).id
      });
    }

    const org = organizationRepository.findById(orgId);
    if (!org) {
      return res.status(404).json({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
        requestId: (req as any).id
      });
    }

    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
      req.organization = org;
      return next();
    }

    const members = organizationRepository.getMembers(orgId) || [];
    const member = members.find(m => m.userId === req.user.id && (!m.status || m.status === 'ACTIVE'));

    // Check if user is creator/owner
    const isCreator = org.createdById === req.user.id;
    if (isCreator) {
      req.organization = org;
      return next();
    }

    if (!member) {
      securityLogger.logSecurityEvent({
        type: 'IDOR_ATTEMPT',
        requestId: (req as any).id,
        userId: req.user.id,
        path: req.originalUrl || req.path,
        details: { targetOrgId: orgId }
      });
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'شما به این سازمان دسترسی ندارید',
        requestId: (req as any).id
      });
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'نقش کاربری شما برای این عملیات در سازمان مجاز نیست',
          requestId: (req as any).id
        });
      }
    }

    req.organization = org;
    next();
  };
};

/**
 * Ensures authenticated user has access to specified asset
 */
export const requireAssetAccess = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        requestId: (req as any).id
      });
    }

    const rawAssetId = req.params.assetId || req.params.id;
    const assetId = Array.isArray(rawAssetId) ? rawAssetId[0] : rawAssetId;
    if (!assetId || typeof assetId !== 'string') {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Asset ID parameter is required',
        requestId: (req as any).id
      });
    }

    const asset = assetRepository.getAssetById(assetId);
    if (!asset) {
      return res.status(404).json({
        code: 'ASSET_NOT_FOUND',
        message: 'Asset not found',
        requestId: (req as any).id
      });
    }

    const roleUpper = (req.user.role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
      req.asset = asset;
      return next();
    }

    if (asset.ownerId === req.user.id) {
      req.asset = asset;
      return next();
    }

    if (asset.projectId) {
      const project = projectRepository.findById(asset.projectId);
      if (project && project.ownerId === req.user.id) {
        req.asset = asset;
        return next();
      }
      const members = projectRepository.getMembers(asset.projectId) || [];
      if (members.some(m => m.userId === req.user.id && (!m.status || m.status === 'ACTIVE'))) {
        req.asset = asset;
        return next();
      }
    }

    securityLogger.logSecurityEvent({
      type: 'IDOR_ATTEMPT',
      requestId: (req as any).id,
      userId: req.user.id,
      path: req.originalUrl || req.path,
      details: { targetAssetId: assetId }
    });

    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'شما به این تجهیز یا دارایی دسترسی ندارید',
      requestId: (req as any).id
    });
  };
};
