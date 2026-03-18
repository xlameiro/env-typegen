import { describe, expect, it } from "vitest";

import { buildReconciliationPlan } from "../../src/sync/reconciliation-plan.js";
import { simulateRollbackPlan } from "../../src/sync/rollback-simulation.js";

describe("simulateRollbackPlan", () => {
  it("should mark applied operations as rollback-planned and failed operations as blocked", () => {
    const plan = buildReconciliationPlan({
      operations: [
        {
          key: "A_KEY",
          action: "update",
          status: "applied",
          message: "Applied.",
        },
        {
          key: "B_KEY",
          action: "create",
          status: "failed",
          message: "Failed.",
        },
        {
          key: "C_KEY",
          action: "no-op",
          status: "skipped",
          message: "Skipped.",
        },
      ],
    });

    const simulation = simulateRollbackPlan(plan);

    expect(simulation.version).toBe(1);
    expect(simulation.canRollback).toBe(true);
    expect(simulation.summary.rollbackPlanned).toBe(1);
    expect(simulation.summary.rollbackBlocked).toBe(1);
    expect(simulation.summary.noRollback).toBe(1);
    expect(simulation.summary.total).toBe(3);
  });
});
