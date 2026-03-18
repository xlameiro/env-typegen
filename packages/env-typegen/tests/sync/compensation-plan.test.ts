import { describe, expect, it } from "vitest";

import { buildCompensationPlan } from "../../src/sync/compensation-plan.js";

describe("compensation-plan", () => {
  it("should plan reverse compensation for applied operations after failures", () => {
    const plan = buildCompensationPlan({
      operations: [
        {
          key: "A_KEY",
          action: "create",
          status: "applied",
          failureKind: "none",
          message: "applied",
        },
        {
          key: "B_KEY",
          action: "update",
          status: "applied",
          failureKind: "none",
          message: "applied",
        },
        {
          key: "C_KEY",
          action: "delete",
          status: "failed",
          failureKind: "transient",
          message: "failed",
        },
      ],
    });

    expect(plan.deterministic).toBe(true);
    expect(plan.summary.planned).toBe(2);
    expect(plan.summary.total).toBe(3);
    expect(plan.operations[0]?.key).toBe("C_KEY");
    expect(plan.operations[1]?.key).toBe("B_KEY");
    expect(plan.operations[2]?.key).toBe("A_KEY");
    expect(plan.operations[1]?.action).toBe("update");
    expect(plan.operations[2]?.action).toBe("delete");
  });

  it("should skip compensation when no operation failed", () => {
    const plan = buildCompensationPlan({
      operations: [
        {
          key: "A_KEY",
          action: "create",
          status: "applied",
          failureKind: "none",
          message: "applied",
        },
      ],
    });

    expect(plan.summary.planned).toBe(0);
    expect(plan.summary.notRequired).toBe(1);
  });
});
