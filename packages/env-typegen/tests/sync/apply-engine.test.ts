import { describe, expect, it, vi } from "vitest";

import type { EnvAdapter } from "../../src/adapters/types.js";
import { runApplyEngine } from "../../src/sync/apply-engine.js";
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

describe("runApplyEngine", () => {
  it("should mark operations as planned/skipped in dry-run mode", async () => {
    const result = await runApplyEngine({
      adapter: makeAdapter(),
      adapterContext: { environment: "development" },
      localValues: { API_URL: "https://local.example.com", PORT: "3000" },
      changeSet: makeChangeSet(),
      mode: "dry-run",
    });

    expect(result.summary.mode).toBe("dry-run");
    expect(result.summary.applied).toBe(0);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.skipped).toBe(1);
    expect(result.operations[0]?.status).toBe("planned");
    expect(result.operations[1]?.status).toBe("skipped");
  });

  it("should mark operations as applied when push succeeds", async () => {
    const push = vi.fn().mockResolvedValue(undefined);
    const result = await runApplyEngine({
      adapter: makeAdapter(push),
      adapterContext: { environment: "production" },
      localValues: { API_URL: "https://local.example.com", PORT: "3000" },
      changeSet: makeChangeSet(),
      mode: "apply",
    });

    expect(push).toHaveBeenCalledOnce();
    expect(result.summary.mode).toBe("apply");
    expect("planned" in result.summary).toBe(false);
    expect(result.summary.applied).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.operations[0]?.status).toBe("applied");
    expect(result.operations[1]?.status).toBe("skipped");
  });

  it("should mark non-noop operations as failed when push throws", async () => {
    const push = vi.fn().mockRejectedValue(new Error("permission denied"));
    const result = await runApplyEngine({
      adapter: makeAdapter(push),
      adapterContext: { environment: "production" },
      localValues: { API_URL: "https://local.example.com", PORT: "3000" },
      changeSet: makeChangeSet(),
      mode: "apply",
    });

    expect(result.summary.failed).toBe(1);
    expect(result.summary.applied).toBe(0);
    expect(result.operations[0]?.status).toBe("failed");
    expect(result.operations[0]?.message).toContain("Provider apply failed after");
  });
});
