import { describe, expect, it } from "vitest";

import { evaluateFleetRollout } from "../../src/fleet/rollout-controller.js";

describe("evaluateFleetRollout", () => {
  it("should advance from canary when orchestration and SLO are healthy", () => {
    const decision = evaluateFleetRollout({
      stage: "advisory",
      strategy: "fail-fast",
      orchestration: {
        aborted: false,
        rejected: 0,
      },
      sloEvaluation: {
        status: "healthy",
        allowPromotion: true,
      },
    });

    expect(decision.action).toBe("advance");
    expect(decision.cohort).toBe("canary");
    expect(decision.nextCohort).toBe("ramp");
    expect(decision.canProceed).toBe(true);
  });

  it("should freeze rollout on degraded SLO signals", () => {
    const decision = evaluateFleetRollout({
      stage: "enforce",
      strategy: "fail-fast",
      orchestration: {
        aborted: false,
        rejected: 0,
      },
      sloEvaluation: {
        status: "degraded",
        allowPromotion: true,
      },
    });

    expect(decision.action).toBe("freeze");
    expect(decision.cohort).toBe("ramp");
    expect(decision.nextCohort).toBe("ramp");
    expect(decision.sloGate).toBe("freeze");
    expect(decision.canProceed).toBe(false);
  });

  it("should rollback rollout when orchestration rejects targets", () => {
    const decision = evaluateFleetRollout({
      stage: "apply",
      strategy: "fail-late",
      orchestration: {
        aborted: false,
        rejected: 2,
      },
      sloEvaluation: {
        status: "healthy",
        allowPromotion: true,
      },
    });

    expect(decision.action).toBe("rollback");
    expect(decision.cohort).toBe("global");
    expect(decision.nextCohort).toBe("global");
    expect(decision.canProceed).toBe(false);
    expect(decision.reason).toContain("rejected");
  });
});
