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
});
