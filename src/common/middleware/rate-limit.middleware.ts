import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store = new Map<string, RateLimitStore>();
  private readonly windowMs = 60000;
  private readonly maxRequests = 100;

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getKey(req);
    const now = Date.now();
    
    let record = this.store.get(key);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + this.windowMs };
      this.store.set(key, record);
    }
    
    record.count++;
    
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);
    
    if (record.count > this.maxRequests) {
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    next();
  }

  private getKey(req: Request): string {
    return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  }
}