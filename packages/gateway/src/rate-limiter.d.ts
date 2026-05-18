/**
 * Rate Limiter — Per-user rate limiting for gateway messages.
 */
export declare class RateLimiter {
    private buckets;
    private maxPerMinute;
    constructor(maxPerMinute?: number);
    /** Check if a user is within rate limits. Returns true if allowed. */
    check(userId: string): boolean;
    /** Get remaining quota for a user */
    remaining(userId: string): number;
    /** Reset rate limit for a user */
    reset(userId: string): void;
    /** Clean up expired buckets */
    cleanup(): void;
}
//# sourceMappingURL=rate-limiter.d.ts.map