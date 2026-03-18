import { describe, expect, it, vi } from "vitest";

import type { EnvAdapter } from "../../src/adapters/types.js";
import { runApplyEngineV2 } from "../../src/sync/apply-engine-v2.js";
import type { ChangeSet } from "../../src/sync/change-set.js";

function makeChangeSet(): ChangeSet {
  return {
    version: 1,
    source: "env-diff",
    operations: [
      {
        key: "API_URL",
        action: "update",
        impact: "medium",
        reason: "Value differs between local and remote.",
        localValue: "https://local.example.com",
        remoteValue: "https://remote.example.com",
      },
      {
        key: "PORT",
        action: "no-op",
        impact: "low",
        reason: "Aligned.",
        localValue: "3000",
        remoteValue: "3000",
      },
    ],
    summary: {
      create: 0,
      update: 1,
      delete: 0,
      noOp: 1,
      total: 2,
    },
  };
}

function makeAdapter(pushImpl?: EnvAdapter["push"]): EnvAdapter {
  return {
    name: "test-adapter",
    pull: vi.fn().mockResolvedValue({ values: {} }),
    ...(pushImpl !== undefined && { push: pushImpl }),
  };
}

describe("runApplyEngineV2", () => {
  it("should keep deterministic planned/skipped statuses in dry-run", async () => {
    const result = await runApplyEngineV2({
      adapter: makeAdapter(),
      adapterContext: { environment: "development" },
      localValues: { API_URL: "https://local.example.com", PORT: "3000" },
      changeSet: makeChangeSet(),
      mode: "dry-run",
    });

    expect(result.summary.mode).toBe("dry-run");
    expect(result.summary.planned).toBe(1);
    expect(result.summary.applied).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(1);
    expect(result.operations[0]?.status).toBe("planned");
    expect(result.operations[1]?.status).toBe("skipped");
    expect(result.compensationPlan.summary.total).toBe(2);
    expect(result.compensationPlan.summary.planned).toBe(0);
    expect(result.reconciliationPlan.deterministic).toBe(true);
    expect(result.reconciliationPlan.summary.planned).toBe(1);
    expect(result.rollbackSimulation.summary.noRollback).toBe(2);
    expect(result.budget.allowed).toBe(true);
  });

  it("should mark operation failures as transient for retryable push errors", async () => {
    const push = vi.fn().mockRejectedValue(new Error("HTTP 503 timeout"));
    const result = await runApplyEngineV2({
      adapter: makeAdapter(push),
      adapterContext: { environment: "production" },
      localValues: { API_URL: "https://local.example.com", PORT: "3000" },
      changeSet: makeChangeSet(),
      mode: "apply",
      retryPolicy: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2 },
    });

    expect(result.summary.failed).toBe(1);
    expect(result.operations[0]?.status).toBe("failed");
    expect(result.operations[0]?.failureKind).toBe("transient");
    expect(result.operations[1]?.status).toBe("skipped");
    expect(result.operations[1]?.failureKind).toBe("none");
    expect(result.compensationPlan.summary.planned).toBe(0);
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("should mark operations as applied with failureKind none on success", async () => {
    let calls = 0;
    const push = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("HTTP 503 timeout");
      }

      return {
        outcome: "applied" as const,
        operations: [],
        summary: {
          applied: 1,
          failed: 0,
          skipped: 0,
          total: 1,
        },
      };
    });
    const result = await runApplyEngineV2({
      adapter: makeAdapter(push),
      adapterContext: { environment: "production" },
      localValues: { API_URL: "https://local.example.com", PORT: "3000" },
      changeSet: makeChangeSet(),
      mode: "apply",
      retryPolicy: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2 },
    });

    expect(result.summary.applied).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.operations[0]?.status).toBe("applied");
    expect(result.operations[0]?.failureKind).toBe("none");
    expect(result.compensationPlan.summary.planned).toBe(0);
    expect(result.reconciliationPlan.summary.applied).toBe(1);
    expect(result.rollbackSimulation.summary.rollbackPlanned).toBe(1);
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("should flag budget violations when operation count exceeds limit", async () => {
    const push = vi.fn().mockResolvedValue(undefined);
    const result = await runApplyEngineV2({
      adapter: makeAdapter(push),
      adapterContext: { environment: "production" },
      localValues: { API_URL: "https://local.example.com", PORT: "3000" },
      changeSet: makeChangeSet(),
      mode: "apply",
      executionBudget: {
        maxOperations: 1,
      },
    });

    expect(result.budget.allowed).toBe(false);
    expect(result.budget.reasons.join(" ")).toContain("maxOperations");
    expect(result.budget.limitsApplied).toContain("maxOperations");
  });
});
