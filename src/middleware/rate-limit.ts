/**
 * Simple in-memory rate limiter
 * Production: Use Redis-based rate limiting
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter
 */
export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed and consume a token
   * Returns true if allowed, false if rate limited
   */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now > entry.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + this.config.windowMs });
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   */
  remaining(key: string): number {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || now > entry.resetAt) return this.config.maxRequests;
    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.resetAt) this.entries.delete(key);
    }
  }
}

/**
 * Create rate limiter from config
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const limiter = new RateLimiter(config);

  // Periodic cleanup every 5 minutes
  const interval = setInterval(() => limiter.cleanup(), 5 * 60 * 1000);
  interval.unref?.();

  return limiter;
}
