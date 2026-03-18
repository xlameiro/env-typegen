import { describe, expect, it } from "vitest";

import { buildReconciliationPlan } from "../../src/sync/reconciliation-plan.js";

describe("buildReconciliationPlan", () => {
  it("should produce deterministic operation ordering and summary", () => {
    const result = buildReconciliationPlan({
      operations: [
        {
          key: "Z_KEY",
          action: "delete",
          status: "failed",
          message: "Delete failed.",
        },
        {
          key: "A_KEY",
          action: "update",
          status: "applied",
          message: "Updated successfully.",
        },
      ],
    });

    expect(result.version).toBe(1);
    expect(result.deterministic).toBe(true);
    expect(result.operations[0]?.key).toBe("A_KEY");
    expect(result.operations[1]?.key).toBe("Z_KEY");
    expect(result.operations[0]?.rollbackAction).toBe("update");
    expect(result.operations[1]?.rollbackAction).toBe("create");
    expect(result.summary.applied).toBe(1);
    expect(result.summary.failed).toBe(1);
    expect(result.summary.total).toBe(2);
  });
});
