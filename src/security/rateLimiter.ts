import { Request, Response, NextFunction } from 'express';
import { securityLogger } from './securityLogger.js';

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  category: 'AUTH_STRICT' | 'AI_EXPENSIVE' | 'UPLOAD' | 'PUBLIC_API' | 'GENERAL_API';
  message?: string;
}

interface ClientBucket {
  count: number;
  resetTime: number;
}

export class InMemoryRateLimiter {
  private clients = new Map<string, ClientBucket>();
  private options: RateLimiterOptions;

  constructor(options: RateLimiterOptions) {
    this.options = options;

    // Periodic cleanup of expired buckets every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.clients.entries()) {
        if (now > bucket.resetTime) {
          this.clients.delete(key);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // In test mode, allow disabling via env if needed, or enforce standard
      if (process.env.DISABLE_RATE_LIMIT === 'true') {
        return next();
      }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      const key = `${this.options.category}:${ip}`;
      const now = Date.now();

      let bucket = this.clients.get(key);
      if (!bucket || now > bucket.resetTime) {
        bucket = {
          count: 1,
          resetTime: now + this.options.windowMs
        };
        this.clients.set(key, bucket);
      } else {
        bucket.count++;
      }

      res.setHeader('X-RateLimit-Limit', this.options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.options.max - bucket.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000));

      if (bucket.count > this.options.max) {
        securityLogger.logSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          requestId: (req as any).id,
          userId: (req as any).user?.id,
          ip,
          path: req.originalUrl || req.path,
          details: { category: this.options.category, count: bucket.count, max: this.options.max }
        });

        return res.status(429).json({
          code: 'RATE_LIMIT_EXCEEDED',
          message: this.options.message || `Too many requests for category ${this.options.category}. Please try again later.`,
          requestId: (req as any).id
        });
      }

      next();
    };
  }

  // Reset helper for tests
  reset(): void {
    this.clients.clear();
  }
}

// Configurable category rate limiters
export const rateLimiters = {
  authStrict: new InMemoryRateLimiter({
    category: 'AUTH_STRICT',
    windowMs: 15 * 60 * 1000, // 15 mins
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    message: 'تعداد درخواست‌های احراز هویت بیش از حد مجاز است. لطفاً دقایقی دیگر تلاش کنید.'
  }),

  aiExpensive: new InMemoryRateLimiter({
    category: 'AI_EXPENSIVE',
    windowMs: 60 * 1000, // 1 min
    max: parseInt(process.env.RATE_LIMIT_AI_MAX || '10', 10),
    message: 'سقف درخواست‌های هوش مصنوعی در این دقیقه تکمیل شده است.'
  }),

  upload: new InMemoryRateLimiter({
    category: 'UPLOAD',
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '20', 10),
    message: 'سقف بارگذاری فایل تکمیل شده است.'
  }),

  publicApi: new InMemoryRateLimiter({
    category: 'PUBLIC_API',
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '60', 10),
    message: 'تعداد درخواست‌های عمومی بیش از حد مجاز است.'
  }),

  generalApi: new InMemoryRateLimiter({
    category: 'GENERAL_API',
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '120', 10),
    message: 'تعداد درخواست‌ها بیش از حد مجاز است.'
  })
};
