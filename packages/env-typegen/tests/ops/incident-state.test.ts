import { describe, expect, it } from "vitest";

import { deriveIncidentState, type IncidentState } from "../../src/ops/incident-state.js";
import type { SloEvaluation } from "../../src/ops/slo-policy.js";

function makeEvaluation(
  overrides: Partial<SloEvaluation> & Pick<SloEvaluation, "status">,
): SloEvaluation {
  return {
    status: overrides.status,
    violations: overrides.violations ?? [],
    throttleFactor: overrides.throttleFactor ?? 1,
    allowPromotion: overrides.allowPromotion ?? true,
    metrics: overrides.metrics ?? {
      total: 10,
      durationMs: 1000,
      failureRate: 0,
      successRate: 1,
    },
  };
}

describe("incident-state", () => {
  it("should derive incident state from a breach evaluation", () => {
    const state = deriveIncidentState({
      sloEvaluation: makeEvaluation({
        status: "breach",
        violations: ["failure-rate breach"],
        throttleFactor: 0.2,
      }),
      observedAt: "2026-03-18T00:00:00.000Z",
    });

    expect(state.status).toBe("incident");
    expect(state.reason).toContain("failure-rate breach");
    expect(state.since).toBe("2026-03-18T00:00:00.000Z");
    expect(state.consecutiveBreaches).toBe(1);
    expect(state.throttleFactor).toBe(0.2);
  });

  it("should preserve incident since timestamp and increment consecutive breaches", () => {
    const previous: IncidentState = {
      status: "incident",
      reason: "previous breach",
      since: "2026-03-17T00:00:00.000Z",
      consecutiveBreaches: 2,
      throttleFactor: 0.15,
    };
    const state = deriveIncidentState({
      previousState: previous,
      sloEvaluation: makeEvaluation({
        status: "breach",
        violations: ["another breach"],
        throttleFactor: 0.4,
      }),
      observedAt: "2026-03-18T00:00:00.000Z",
    });

    expect(state.since).toBe("2026-03-17T00:00:00.000Z");
    expect(state.consecutiveBreaches).toBe(3);
    expect(state.throttleFactor).toBe(0.15);
  });

  it("should clamp degraded throttle factor to valid boundaries", () => {
    const fromZero = deriveIncidentState({
      sloEvaluation: makeEvaluation({
        status: "degraded",
        violations: [],
        throttleFactor: 0,
      }),
      observedAt: "2026-03-18T00:00:00.000Z",
    });
    expect(fromZero.status).toBe("degraded");
    expect(fromZero.throttleFactor).toBe(0.1);

    const fromHigh = deriveIncidentState({
      sloEvaluation: makeEvaluation({
        status: "degraded",
        violations: [],
        throttleFactor: 3,
      }),
      observedAt: "2026-03-18T00:00:00.000Z",
    });
    expect(fromHigh.throttleFactor).toBe(1);
  });

  it("should derive degraded state with fallback reason when violations are missing", () => {
    const state = deriveIncidentState({
      sloEvaluation: makeEvaluation({
        status: "degraded",
        violations: [],
        throttleFactor: 0.5,
      }),
      observedAt: "2026-03-18T00:00:00.000Z",
    });

    expect(state.status).toBe("degraded");
    expect(state.reason).toContain("soft-degradation");
    expect(state.consecutiveBreaches).toBe(0);
    expect(state.throttleFactor).toBe(0.5);
  });

  it("should derive healthy state with default throttle factor", () => {
    const state = deriveIncidentState({
      sloEvaluation: makeEvaluation({
        status: "healthy",
      }),
      observedAt: "2026-03-18T00:00:00.000Z",
    });

    expect(state.status).toBe("normal");
    expect(state.reason).toContain("healthy");
    expect(state.since).toBe("2026-03-18T00:00:00.000Z");
    expect(state.throttleFactor).toBe(1);
    expect(state.consecutiveBreaches).toBe(0);
  });
});
