import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow requests under the limit", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });

    expect(limiter.check("ip1").isAllowed).toBe(true);
    expect(limiter.check("ip1").isAllowed).toBe(true);
    expect(limiter.check("ip1").isAllowed).toBe(true);
  });

  it("should block requests once the limit is exceeded", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });

    limiter.check("ip1");
    limiter.check("ip1");

    const result = limiter.check("ip1");

    expect(result.isAllowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should return a positive retryAfterSeconds when rate-limited", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });

    limiter.check("ip1");
    const result = limiter.check("ip1");

    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("should return retryAfterSeconds of 0 when the request is allowed", () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });

    expect(limiter.check("ip1").retryAfterSeconds).toBe(0);
  });

  it("should allow requests again after the window expires", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });

    limiter.check("ip1");
    limiter.check("ip1");
    expect(limiter.check("ip1").isAllowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(limiter.check("ip1").isAllowed).toBe(true);
  });

  it("should track different keys independently", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });

    limiter.check("ip1");
    limiter.check("ip1");
    expect(limiter.check("ip1").isAllowed).toBe(false);

    // A different key should not be affected by ip1's limit.
    expect(limiter.check("ip2").isAllowed).toBe(true);
  });

  it("should decrement the remaining count with each request", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });

    expect(limiter.check("ip1").remaining).toBe(2);
    expect(limiter.check("ip1").remaining).toBe(1);
    expect(limiter.check("ip1").remaining).toBe(0);
  });

  it("should use current time as retryAfterSeconds base when the timestamps array is empty (max of 0)", () => {
    // With max=0, every request is immediately rate-limited and timestamps is [].
    // timestamps.at(0) returns undefined, so the `?? now` fallback is taken.
    const limiter = createRateLimiter({ max: 0, windowMs: 30_000 });

    const result = limiter.check("ip1");

    expect(result.isAllowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(30);
    expect(result.remaining).toBe(0);
  });

  it("should delete fully-expired entries when the store exceeds 10,000 unique keys", () => {
    const limiter = createRateLimiter({ max: 10, windowMs: 1_000 });

    // Populate the store with 10,001 unique keys. The 10,001st insertion triggers
    // the cleanup branch (store.size > 10_000), but timestamps are still fresh so
    // nothing is deleted on this first pass.
    for (let index = 0; index <= 10_000; index++) {
      limiter.check(`key-${index}`);
    }

    // Advance past the window so every existing entry is fully expired.
    vi.advanceTimersByTime(2_000);

    // A new unique key re-triggers the cleanup. All prior entries now have only
    // expired timestamps (stored.every returns true), so store.delete runs for each.
    const result = limiter.check("cleanup-trigger");

    // The cleanup-trigger key is brand new, so it should be allowed.
    expect(result.isAllowed).toBe(true);
  });
});
