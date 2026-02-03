export class RateLimitConfig {
  constructor(
    public readonly ttl: number, // Time to live in seconds
    public readonly limit: number, // Maximum number of requests
  ) {
    this.validate();
  }

  /**
   * Validate the configuration
   */
  validate(): boolean {
    if (this.ttl <= 0) {
      throw new Error('Rate limit TTL must be greater than 0');
    }

    if (this.limit <= 0) {
      throw new Error('Rate limit must be greater than 0');
    }

    return true;
  }

  /**
   * Get TTL in milliseconds
   */
  getTtlMs(): number {
    return this.ttl * 1000;
  }
}
