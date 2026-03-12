/**
 * In-memory sliding window rate limiter.
 *
 * Suitable for single-instance deployments (local dev, single container).
 * For production deployments with multiple replicas, replace the in-memory store
 * with a distributed store such as Upstash Redis or Vercel KV.
 */

type RateLimitResult = {
  /** Whether the request is allowed to proceed. */
  isAllowed: boolean;
  /** Remaining requests in the current window (0 when rate-limited). */
  remaining: number;
  /** Seconds to wait before the next request is allowed (0 when allowed). */
  retryAfterSeconds: number;
};

type RateLimiterOptions = {
  /** Maximum number of requests allowed within a single window. */
  max: number;
  /** Rolling window duration in milliseconds. */
  windowMs: number;
};

type RateLimiter = {
  check: (key: string) => RateLimitResult;
};

/**
 * Creates an in-memory sliding window rate limiter.
 *
 * Each call returns an independent limiter instance with its own store,
 * which prevents state leakage between tests and between different routes.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });
 * const { isAllowed, retryAfterSeconds } = limiter.check(clientIp);
 * if (!isAllowed) {
 *   return new Response("Too Many Requests", {
 *     status: 429,
 *     headers: { "Retry-After": String(retryAfterSeconds) },
 *   });
 * }
 * ```
 */
export function createRateLimiter({
  max,
  windowMs,
}: RateLimiterOptions): RateLimiter {
  // Maps a rate-limit key (e.g., IP address) to an array of request timestamps.
  const store = new Map<string, number[]>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Prune timestamps that have fallen outside the current window.
      const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

      if (timestamps.length >= max) {
        // The oldest timestamp in the window determines when the next slot opens.
        const oldestInWindow = timestamps.at(0) ?? now;
        const retryAfterSeconds = Math.ceil(
          (oldestInWindow + windowMs - now) / 1000,
        );
        store.set(key, timestamps);
        return { isAllowed: false, retryAfterSeconds, remaining: 0 };
      }

      timestamps.push(now);
      store.set(key, timestamps);

      // Periodic cleanup: prevent unbounded Map growth under sustained unique-key traffic.
      // For production at scale, use a TTL-capable distributed store instead.
      if (store.size > 10_000) {
        for (const [storeKey, stored] of store) {
          if (stored.every((t) => t <= windowStart)) {
            store.delete(storeKey);
          }
        }
      }

      return {
        isAllowed: true,
        retryAfterSeconds: 0,
        remaining: max - timestamps.length,
      };
    },
  };
}
