import { Request, Response, NextFunction } from 'express';
import { getSecurityConfig } from './config.js';
import { securityLogger } from './securityLogger.js';

export const mockGuards = {
  /**
   * Asserts that a real production integration is configured before allowing execution.
   * In production mode, if the integration is missing, fails fast with 503 SERVICE_NOT_CONFIGURED.
   * In dev/test mode, allows simulated/mock flow with warning.
   */
  requireServiceConfigured(serviceName: 'SMS' | 'PAYMENT' | 'FINANCING' | 'AI') {
    return (req: Request, res: Response, next: NextFunction) => {
      const config = getSecurityConfig();

      if (!config.isProduction) {
        // In dev/test mode, allow continuation
        return next();
      }

      let isConfigured = false;
      switch (serviceName) {
        case 'SMS':
          isConfigured = config.mocks.smsConfigured;
          break;
        case 'PAYMENT':
          isConfigured = config.mocks.paymentConfigured;
          break;
        case 'AI':
          isConfigured = config.mocks.aiConfigured;
          break;
        case 'FINANCING':
          // In production, financing requires active partner credentials
          isConfigured = Boolean(process.env.FINANCING_PARTNER_SECRET || process.env.BANK_API_KEY);
          break;
      }

      if (!isConfigured) {
        securityLogger.logSecurityEvent({
          type: 'MOCK_BLOCKED',
          requestId: (req as any).id,
          userId: (req as any).user?.id,
          path: req.originalUrl || req.path,
          details: { serviceName, error: 'PROD_MOCK_DISALLOWED' }
        });

        return res.status(503).json({
          code: 'SERVICE_NOT_CONFIGURED',
          message: `The external integration for ${serviceName} is not configured in production. Mock behavior is disabled in production.`,
          requestId: (req as any).id
        });
      }

      next();
    };
  }
};
