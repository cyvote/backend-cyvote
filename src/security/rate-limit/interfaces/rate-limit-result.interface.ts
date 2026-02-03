export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until next allowed request
  currentCount?: number;
  limit?: number;
  resetTime?: number;
}

export interface RateLimitStats {
  count: number;
  limit: number;
  resetTime: number;
  remaining: number;
  retryAfter: number;
}
