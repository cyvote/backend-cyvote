import { Inject, Injectable } from '@nestjs/common';
import {
  IRateLimitStorage,
  RATE_LIMIT_STORAGE,
} from '../infrastructure/storage/rate-limit-storage.interface';
import { RateLimitEntry } from '../domain/rate-limit-entry';
import { RateLimitConfig } from '../domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../utils/security-audit-logger.service';
import {
  RateLimitCheckResult,
  RateLimitStats,
} from '../interfaces/rate-limit-result.interface';

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(RATE_LIMIT_STORAGE)
    private readonly storage: IRateLimitStorage,
    private readonly logger: SecurityAuditLoggerService,
  ) {}

  /**
   * Check if the request is within rate limit
   */
  async checkLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitCheckResult> {
    try {
      const key = this.buildKey(identifier, endpoint);

      let entry = await this.storage.get(key);

      // No entry exists - create new one
      if (!entry) {
        entry = new RateLimitEntry(config.ttl);
        entry.count = 1;
        await this.storage.set(key, entry);

        this.logger.debug('New rate limit entry created', {
          key,
          limit: config.limit,
        });

        return {
          allowed: true,
          currentCount: 1,
          limit: config.limit,
          resetTime: entry.resetTime,
        };
      }

      // Entry exists - check if expired
      if (entry.isExpired()) {
        entry.reset(config.ttl);
        entry.count = 1;
        await this.storage.set(key, entry);

        this.logger.debug('Rate limit window reset', {
          key,
        });

        return {
          allowed: true,
          currentCount: 1,
          limit: config.limit,
          resetTime: entry.resetTime,
        };
      }

      // Already over the limit from a previous request - return blocked without incrementing
      // This prevents the counter from growing unboundedly on repeated blocked requests
      if (entry.count > config.limit) {
        const retryAfter = entry.getRemainingTime();

        this.logger.logRateLimitExceeded({
          identifier,
          endpoint,
          limit: config.limit,
          count: entry.count,
          retryAfter,
          timestamp: new Date(),
        });

        return {
          allowed: false,
          retryAfter,
          currentCount: entry.count,
          limit: config.limit,
          resetTime: entry.resetTime,
        };
      }

      // Within or at the limit - increment and check
      entry.increment();
      await this.storage.set(key, entry);

      if (entry.count > config.limit) {
        // Just exceeded the limit with this request
        const retryAfter = entry.getRemainingTime();

        this.logger.logRateLimitExceeded({
          identifier,
          endpoint,
          limit: config.limit,
          count: entry.count,
          retryAfter,
          timestamp: new Date(),
        });

        return {
          allowed: false,
          retryAfter,
          currentCount: entry.count,
          limit: config.limit,
          resetTime: entry.resetTime,
        };
      }

      this.logger.debug('Request counted', {
        key,
        count: entry.count,
        limit: config.limit,
      });

      return {
        allowed: true,
        currentCount: entry.count,
        limit: config.limit,
        resetTime: entry.resetTime,
      };
    } catch (error) {
      // On storage error, fail open to prevent service disruption
      this.logger.error('Error checking rate limit, allowing request', {
        error,
        identifier,
        endpoint,
      });

      return {
        allowed: true,
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier and endpoint
   */
  async resetLimit(identifier: string, endpoint: string): Promise<void> {
    const key = this.buildKey(identifier, endpoint);
    await this.storage.delete(key);

    this.logger.log('Rate limit reset', {
      key,
    });
  }

  /**
   * Get rate limit statistics
   */
  async getStats(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<RateLimitStats> {
    const key = this.buildKey(identifier, endpoint);
    const entry = await this.storage.get(key);

    if (!entry || entry.isExpired()) {
      return {
        count: 0,
        limit: config.limit,
        resetTime: 0,
        remaining: config.limit,
        retryAfter: 0,
      };
    }

    return {
      count: entry.count,
      limit: config.limit,
      resetTime: entry.resetTime,
      remaining: Math.max(0, config.limit - entry.count),
      retryAfter: entry.getRemainingTime(),
    };
  }

  /**
   * Build storage key from identifier and endpoint
   */
  private buildKey(identifier: string, endpoint: string): string {
    return `${identifier}:${endpoint}`;
  }
}
