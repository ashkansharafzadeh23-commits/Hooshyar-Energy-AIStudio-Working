import { Request, Response, NextFunction } from 'express';
import { getSecurityConfig } from '../security/config.js';
import { logger } from '../observability/logger.js';
import { metrics } from '../observability/metrics.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
  const config = getSecurityConfig();
  const statusCode = err.statusCode || 500;
  const requestId = (req as any).id || (req.headers['x-request-id'] as string) || 'unknown';

  // Safe default code and message
  const code = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  
  // In production, never leak sensitive server errors, stack traces, paths, or db details
  let message = err.message;
  if (config.isProduction && statusCode >= 500) {
    message = 'An unexpected internal server error occurred. Please try again later.';
  }

  const responsePayload: Record<string, any> = {
    code,
    message,
    requestId
  };

  if (err.details && statusCode < 500) {
    responsePayload.details = err.details;
  }

  // Only include stack trace if explicitly in non-production mode
  if (!config.isProduction && err.stack) {
    responsePayload.stack = err.stack;
  }

  // Structured Error Logging
  if (statusCode >= 500 || !err.isOperational) {
    logger.error(`Unhandled/Server error: ${code} (${statusCode})`, err, {
      requestId,
      event: 'HTTP_SERVER_ERROR',
      service: 'API_GATEWAY',
      metadata: {
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode,
        code
      }
    });
  } else {
    logger.warn(`Operational HTTP error: ${code} (${statusCode})`, {
      requestId,
      event: 'HTTP_CLIENT_ERROR',
      service: 'API_GATEWAY',
      metadata: {
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode,
        code,
        message: err.message
      }
    });
  }

  metrics.recordHttpRequest(req.method, req.path, statusCode, 0);

  if (!res.headersSent) {
    res.status(statusCode).json(responsePayload);
  }
};

