export class RateLimitEntry {
  count: number;
  resetTime: number; // Unix timestamp in milliseconds
  firstRequestTime: number; // Unix timestamp in milliseconds

  constructor(ttlSeconds: number) {
    this.count = 0;
    this.firstRequestTime = Date.now();
    this.resetTime = this.firstRequestTime + ttlSeconds * 1000;
  }

  /**
   * Increment the request count
   */
  increment(): void {
    this.count++;
  }

  /**
   * Check if the entry has expired
   */
  isExpired(): boolean {
    return Date.now() > this.resetTime;
  }

  /**
   * Reset the entry with a new TTL
   */
  reset(ttlSeconds: number): void {
    this.count = 0;
    this.firstRequestTime = Date.now();
    this.resetTime = this.firstRequestTime + ttlSeconds * 1000;
  }

  /**
   * Get remaining time until reset in seconds
   */
  getRemainingTime(): number {
    const now = Date.now();
    const remainingMs = this.resetTime - now;

    if (remainingMs <= 0) {
      return 0;
    }

    return Math.ceil(remainingMs / 1000);
  }

  /**
   * Convert to JSON for storage
   */
  toJSON(): object {
    return {
      count: this.count,
      resetTime: this.resetTime,
      firstRequestTime: this.firstRequestTime,
    };
  }

  /**
   * Create from JSON storage
   */
  static fromJSON(data: any): RateLimitEntry {
    const entry = Object.create(RateLimitEntry.prototype);
    entry.count = data.count;
    entry.resetTime = data.resetTime;
    entry.firstRequestTime = data.firstRequestTime;
    return entry;
  }
}
