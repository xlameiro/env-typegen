import { describe, expect, it } from "vitest";

import { evaluateExecutionBudget } from "../../src/ops/execution-budget.js";

describe("evaluateExecutionBudget", () => {
  it("should allow execution when no budget is configured", () => {
    const result = evaluateExecutionBudget({
      budget: undefined,
      snapshot: {
        planned: 1,
        applied: 1,
        failed: 0,
        skipped: 0,
        total: 1,
        durationMs: 10,
      },
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.limitsApplied).toEqual([]);
    expect(result.slo.status).toBe("healthy");
  });

  it("should fail when maxDurationMs is exceeded", () => {
    const result = evaluateExecutionBudget({
      budget: {
        maxDurationMs: 50,
      },
      snapshot: {
        planned: 1,
        applied: 1,
        failed: 0,
        skipped: 0,
        total: 1,
        durationMs: 80,
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.join(" ")).toContain("maxDurationMs");
    expect(result.limitsApplied).toContain("maxDurationMs");
    expect(result.slo.status).toBe("healthy");
  });

  it("should deny execution when SLO policy blocks promotion", () => {
    const result = evaluateExecutionBudget({
      budget: {
        sloPolicy: {
          maxFailureRate: 0.1,
          blockPromotionOnBreach: true,
        },
      },
      snapshot: {
        planned: 4,
        applied: 2,
        failed: 2,
        skipped: 0,
        total: 4,
        durationMs: 12,
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.limitsApplied).toContain("sloPolicy");
    expect(result.slo.status).toBe("breach");
    expect(result.reasons.join(" ")).toContain("SLO maxFailureRate breached");
  });
});
