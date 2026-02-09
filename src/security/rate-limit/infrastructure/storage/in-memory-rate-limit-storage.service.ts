import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRateLimitStorage } from './rate-limit-storage.interface';
import { RateLimitEntry } from '../../domain/rate-limit-entry';
import { SecurityAuditLoggerService } from '../../../utils/security-audit-logger.service';
import { AllConfigType } from '../../../../config/config.type';

@Injectable()
export class InMemoryRateLimitStorageService
  implements IRateLimitStorage, OnModuleInit, OnModuleDestroy
{
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number = 60000; // Default cleanup interval in ms

  constructor(
    private readonly logger: SecurityAuditLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  onModuleInit(): void {
    const cleanupInterval = this.configService.get(
      'security.rateLimit.storage.cleanupInterval',
      { infer: true },
    );

    if (cleanupInterval && cleanupInterval > 0) {
      this.cleanupIntervalMs = cleanupInterval;

      this.cleanupIntervalId = setInterval(() => {
        this.cleanup().catch((error) => {
          this.logger.error('Error during cleanup', { error });
        });
      }, cleanupInterval);

      this.logger.log('Rate limit storage initialized', {
        cleanupInterval,
      });
    }
  }

  onModuleDestroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.store.clear();
    this.logger.log('Rate limit storage destroyed');
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (entry.isExpired()) {
      await this.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);

    this.logger.debug('Rate limit entry stored', {
      key,
      count: entry.count,
      resetTime: entry.resetTime,
    });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.store.clear();
    this.logger.log('All rate limit entries cleared');
    return Promise.resolve();
  }

  cleanup(): Promise<number> {
    let expiredCount = 0;
    let staleCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      // Primary check: remove entries whose TTL has fully expired
      if (entry.resetTime < now) {
        this.store.delete(key);
        expiredCount++;
        continue;
      }

      // Secondary check: remove stale entries that have had no activity
      // for longer than the cleanup interval. This ensures blocked entries
      // (e.g., rate-limited voters) are flushed even when their TTL
      // exceeds the cleanup interval, preventing indefinite lockout.
      if (entry.isStale(this.cleanupIntervalMs)) {
        this.store.delete(key);
        staleCount++;
      }
    }

    const totalDeleted = expiredCount + staleCount;

    if (totalDeleted > 0) {
      this.logger.debug('Rate limit cleanup completed', {
        deletedCount: totalDeleted,
        expiredCount,
        staleCount,
        remainingCount: this.store.size,
      });
    }

    return Promise.resolve(totalDeleted);
  }

  /**
   * Get current storage stats (for monitoring)
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}
