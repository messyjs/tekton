/**
 * Rate Limiter — Per-user rate limiting for gateway messages.
 */
export class RateLimiter {
  private buckets: Map<string, number[]> = new Map();
  private maxPerMinute: number;

  constructor(maxPerMinute = 30) {
    this.maxPerMinute = maxPerMinute;
  }

  /** Check if a user is within rate limits. Returns true if allowed. */
  check(userId: string): boolean {
    const now = Date.now();
    const window = 60_000; // 1 minute
    let bucket = this.buckets.get(userId);

    if (!bucket) {
      bucket = [now];
      this.buckets.set(userId, bucket);
      return true;
    }

    // Remove expired entries
    bucket = bucket.filter((t) => now - t < window);
    this.buckets.set(userId, bucket);

    if (bucket.length >= this.maxPerMinute) {
      return false;
    }

    bucket.push(now);
    return true;
  }

  /** Get remaining quota for a user */
  remaining(userId: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(userId)?.filter((t) => now - t < 60_000) ?? [];
    return Math.max(0, this.maxPerMinute - bucket.length);
  }

  /** Reset rate limit for a user */
  reset(userId: string): void {
    this.buckets.delete(userId);
  }

  /** Clean up expired buckets */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, bucket] of this.buckets) {
      const filtered = bucket.filter((t) => now - t < 60_000);
      if (filtered.length === 0) {
        this.buckets.delete(userId);
      } else {
        this.buckets.set(userId, filtered);
      }
    }
  }
}