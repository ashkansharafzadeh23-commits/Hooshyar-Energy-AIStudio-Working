import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { securityLogger } from './securityLogger.js';

export interface RequestValidationSchemas {
  params?: ZodSchema<any>;
  query?: ZodSchema<any>;
  body?: ZodSchema<any>;
}

export function validateRequest(schemas: RequestValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        securityLogger.logSecurityEvent({
          type: 'VALIDATION_FAILURE',
          requestId: (req as any).id,
          userId: (req as any).user?.id,
          path: req.originalUrl || req.path,
          details: { issues: error.issues }
        });

        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload or parameters',
          requestId: (req as any).id,
          details: error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        });
      }

      next(error);
    }
  };
}

// Common reusable Zod validators
export const commonSchemas = {
  uuid: z.string().uuid({ message: 'Invalid UUID format' }),
  phone: z.string().regex(/^(\+98|0)?9\d{9}$/, { message: 'Invalid Iranian phone number format' }),
  positiveNumber: z.number().positive({ message: 'Must be a positive number' }),
  nonNegativeNumber: z.number().nonnegative({ message: 'Must be a non-negative number' }),
  shortString: z.string().min(1).max(255),
  longString: z.string().min(1).max(5000),
  dateString: z.string().datetime({ message: 'Must be an ISO 8601 date string' })
};
