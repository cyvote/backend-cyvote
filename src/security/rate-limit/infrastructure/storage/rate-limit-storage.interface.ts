import { RateLimitEntry } from '../../domain/rate-limit-entry';

export interface IRateLimitStorage {
  /**
   * Get rate limit entry by key
   */
  get(key: string): Promise<RateLimitEntry | null>;

  /**
   * Set rate limit entry
   */
  set(key: string, entry: RateLimitEntry): Promise<void>;

  /**
   * Delete rate limit entry
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all rate limit entries
   */
  clear(): Promise<void>;

  /**
   * Cleanup expired entries
   * @returns Number of deleted entries
   */
  cleanup(): Promise<number>;
}

export const RATE_LIMIT_STORAGE = Symbol('RATE_LIMIT_STORAGE');
