import { describe, expect, it, vi } from "vitest";

import type { EnvAdapter } from "../../src/adapters/types.js";
import { executeApplyOperations } from "../../src/sync/apply-operations.js";
import type { ChangeSetOperation } from "../../src/sync/change-set.js";

function makeOperations(): ChangeSetOperation[] {
  return [
    {
      sequence: 0,
      key: "A_KEY",
      action: "update",
      impact: "medium",
      reason: "Mismatch",
      localValue: "new",
      remoteValue: "old",
    },
    {
      sequence: 1,
      key: "B_KEY",
      action: "no-op",
      impact: "low",
      reason: "Aligned",
      localValue: "same",
      remoteValue: "same",
    },
    {
      sequence: 2,
      key: "C_KEY",
      action: "delete",
      impact: "high",
      reason: "Only remote",
      localValue: null,
      remoteValue: "stale",
    },
  ];
}

describe("apply-operations", () => {
  it("should execute operations with retry and keep no-op as skipped", async () => {
    let calls = 0;
    const push = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("HTTP 503 timeout");
      }

      return {
        outcome: "applied" as const,
        operations: [],
        summary: { applied: 1, failed: 0, skipped: 0, total: 1 },
      };
    });

    const adapter: EnvAdapter = {
      name: "test",
      pull: async () => ({ values: {} }),
      push,
    };

    const results = await executeApplyOperations({
      operations: makeOperations(),
      adapter,
      adapterContext: { environment: "production" },
      localValues: { A_KEY: "new", B_KEY: "same" },
      retryPolicy: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2 },
    });

    expect(results).toHaveLength(3);
    expect(results[0]?.status).toBe("applied");
    expect(results[1]?.status).toBe("skipped");
    expect(results[2]?.status).toBe("applied");
    expect(push).toHaveBeenCalledTimes(3);
  });

  it("should fail non no-op operations when adapter has no push", async () => {
    const adapter: EnvAdapter = {
      name: "read-only",
      pull: async () => ({ values: {} }),
    };

    const results = await executeApplyOperations({
      operations: makeOperations(),
      adapter,
      adapterContext: { environment: "production" },
      localValues: { A_KEY: "new" },
    });

    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.failureKind).toBe("permanent");
    expect(results[1]?.status).toBe("skipped");
    expect(results[2]?.status).toBe("failed");
  });
});
