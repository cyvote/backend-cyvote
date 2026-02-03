import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig } from '../domain/rate-limit-config';
import { SecurityLoggerService } from '../../utils/security-logger.service';
import { RateLimitExceededException } from '../exceptions/rate-limit-exceeded.exception';

@Injectable()
export abstract class BaseRateLimitGuard implements CanActivate {
  protected abstract rateLimitConfig: RateLimitConfig;
  protected abstract endpointIdentifier: string;

  constructor(
    protected readonly rateLimitService: RateLimitService,
    protected readonly logger: SecurityLoggerService,
  ) {}

  /**
   * Get identifier for rate limiting (IP or session)
   * Must be implemented by subclasses
   */
  protected abstract getIdentifier(request: Request): string;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<Request>();

      const identifier = this.getIdentifier(request);
      const endpoint = this.endpointIdentifier || this.getEndpoint(request);

      const result = await this.rateLimitService.checkLimit(
        identifier,
        endpoint,
        this.rateLimitConfig,
      );

      if (result.allowed) {
        return true;
      }

      // Rate limit exceeded
      this.logger.warn('Rate limit exceeded in guard', {
        identifier,
        endpoint,
        retryAfter: result.retryAfter,
        currentCount: result.currentCount,
        limit: result.limit,
      });

      throw new RateLimitExceededException(
        result.retryAfter || 60,
        `Rate limit exceeded for ${endpoint}. Please try again later.`,
      );
    } catch (error) {
      // If it's already a RateLimitExceededException, re-throw it
      if (error instanceof RateLimitExceededException) {
        throw error;
      }

      // On unexpected error, fail open (allow request)
      this.logger.error('Error in rate limit guard, allowing request', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return true;
    }
  }

  /**
   * Get endpoint identifier from request
   */
  protected getEndpoint(request: Request): string {
    const method = request.method;
    const path = request.route?.path || request.url;
    return `${method}:${path}`;
  }
}
