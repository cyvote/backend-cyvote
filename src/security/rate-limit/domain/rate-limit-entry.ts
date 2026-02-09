export class RateLimitEntry {
  count: number;
  resetTime: number; // Unix timestamp in milliseconds
  firstRequestTime: number; // Unix timestamp in milliseconds
  lastActivityTime: number; // Unix timestamp in milliseconds - tracks last request activity

  constructor(ttlSeconds: number) {
    const now = Date.now();
    this.count = 0;
    this.firstRequestTime = now;
    this.lastActivityTime = now;
    this.resetTime = now + ttlSeconds * 1000;
  }

  /**
   * Increment the request count and update last activity time
   */
  increment(): void {
    this.count++;
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if the entry has expired
   */
  isExpired(): boolean {
    return Date.now() > this.resetTime;
  }

  /**
   * Check if the entry is stale (no activity for longer than maxInactivityMs).
   * A stale entry is one that has had no new requests for a period longer
   * than the given threshold, indicating the client has stopped retrying.
   * @param maxInactivityMs - Maximum allowed inactivity period in milliseconds
   */
  isStale(maxInactivityMs: number): boolean {
    return Date.now() - this.lastActivityTime > maxInactivityMs;
  }

  /**
   * Reset the entry with a new TTL
   */
  reset(ttlSeconds: number): void {
    const now = Date.now();
    this.count = 0;
    this.firstRequestTime = now;
    this.lastActivityTime = now;
    this.resetTime = now + ttlSeconds * 1000;
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
      lastActivityTime: this.lastActivityTime,
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
    entry.lastActivityTime = data.lastActivityTime ?? data.firstRequestTime;
    return entry;
  }
}
