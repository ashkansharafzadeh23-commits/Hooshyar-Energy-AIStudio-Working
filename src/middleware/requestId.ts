import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime?: number;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header('x-request-id');
  // Accept safe incoming request IDs (UUID or alphanumeric slug 8-64 chars) to prevent header injection
  const isSafeId = incoming && /^[a-zA-Z0-9\-_]{8,64}$/.test(incoming);
  const correlationId = isSafeId ? incoming : uuidv4();
  
  req.id = correlationId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', correlationId);
  
  next();
};
