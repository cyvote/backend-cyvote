import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRateLimitStorage } from './rate-limit-storage.interface';
import { RateLimitEntry } from '../../domain/rate-limit-entry';
import { SecurityLoggerService } from '../../../utils/security-logger.service';
import { AllConfigType } from '../../../../config/config.type';

@Injectable()
export class InMemoryRateLimitStorageService
  implements IRateLimitStorage, OnModuleInit, OnModuleDestroy
{
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly logger: SecurityLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  onModuleInit(): void {
    const cleanupInterval = this.configService.get(
      'security.rateLimit.storage.cleanupInterval',
      { infer: true },
    );

    if (cleanupInterval && cleanupInterval > 0) {
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
    let deletedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug('Rate limit cleanup completed', {
        deletedCount,
        remainingCount: this.store.size,
      });
    }

    return Promise.resolve(deletedCount);
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
