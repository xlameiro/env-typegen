import { describe, expect, it } from "vitest";

import { evaluateSloPolicy } from "../../src/ops/slo-policy.js";

describe("evaluateSloPolicy", () => {
  it("should return healthy defaults when policy is not configured", () => {
    const result = evaluateSloPolicy({
      policy: undefined,
      snapshot: {
        planned: 2,
        applied: 2,
        failed: 0,
        skipped: 0,
        total: 2,
        durationMs: 12,
      },
    });

    expect(result.status).toBe("healthy");
    expect(result.allowPromotion).toBe(true);
    expect(result.throttleFactor).toBe(1);
    expect(result.violations).toEqual([]);
  });

  it("should mark breach when hard thresholds are exceeded", () => {
    const result = evaluateSloPolicy({
      policy: {
        maxFailureRate: 0.2,
        maxDurationMs: 50,
        minSuccessRate: 0.7,
        blockPromotionOnBreach: true,
      },
      snapshot: {
        planned: 5,
        applied: 2,
        failed: 3,
        skipped: 0,
        total: 5,
        durationMs: 120,
      },
    });

    expect(result.status).toBe("breach");
    expect(result.allowPromotion).toBe(false);
    expect(result.throttleFactor).toBe(0.25);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("should mark degraded when soft signal is enabled and failures occur", () => {
    const result = evaluateSloPolicy({
      policy: {
        degradeOnAnyFailure: true,
        throttleMultiplierOnDegrade: 0.4,
      },
      snapshot: {
        planned: 4,
        applied: 3,
        failed: 1,
        skipped: 0,
        total: 4,
        durationMs: 30,
      },
    });

    expect(result.status).toBe("degraded");
    expect(result.allowPromotion).toBe(true);
    expect(result.throttleFactor).toBe(0.4);
    expect(result.violations).toEqual([]);
  });
});
