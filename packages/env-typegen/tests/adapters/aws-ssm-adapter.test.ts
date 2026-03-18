import path from "node:path";

import { describe, expect, it } from "vitest";

import awsSsmAdapter from "../../src/adapters/aws-ssm-adapter.js";
import { evaluateAdapterContract } from "../../src/adapters/testkit.js";

const fixturePath = path.resolve("tests/fixtures/aws/ssm-page-1.json");

describe("aws ssm adapter", () => {
  it("should pull values from snapshot payload and normalize keys by prefix", async () => {
    const result = await awsSsmAdapter.pull({
      environment: "production",
      providerConfig: {
        snapshotFile: fixturePath,
        parameterPathPrefix: "/app/prod/",
      },
    });

    expect(result.values).toMatchObject({
      DB_URL: "postgres://prod",
      API_KEY: "super-secret",
      FEATURE_FLAG: "enabled",
    });
    expect(result.metadata?.source).toBe("aws-ssm");
    expect(result.metadata?.mode).toBe("snapshot");
  });

  it("should return blocked operation results when allowWrite is false", async () => {
    const result = await awsSsmAdapter.push?.(
      { environment: "production", providerConfig: { allowWrite: false } },
      { API_KEY: "new" },
    );

    expect(result?.outcome).toBe("blocked");
    expect(result?.summary).toMatchObject({
      applied: 0,
      failed: 0,
      skipped: 1,
      total: 1,
    });
  });

  it("should return applied operation results in snapshot mode", async () => {
    const result = await awsSsmAdapter.push?.(
      { environment: "production", providerConfig: { allowWrite: true } },
      { API_KEY: "new" },
    );

    expect(result?.outcome).toBe("applied");
    expect(result?.summary).toMatchObject({
      applied: 1,
      failed: 0,
      skipped: 0,
      total: 1,
    });
  });

  it("should support live mode pull and partial-failure push results", async () => {
    const writes: Array<{ name: string; value: string }> = [];

    const pullResult = await awsSsmAdapter.pull({
      environment: "production",
      providerConfig: {
        runtimeMode: "live",
        parameterPathPrefix: "/app/prod/",
        liveRuntime: {
          pullParameters: async () => [
            { Name: "/app/prod/API_KEY", Value: "live-key" },
            { Name: "/app/prod/DB_URL", Value: "postgres://live" },
          ],
        },
      },
    });

    expect(pullResult.values).toMatchObject({
      API_KEY: "live-key",
      DB_URL: "postgres://live",
    });
    expect(pullResult.metadata?.mode).toBe("live");

    const pushResult = await awsSsmAdapter.push?.(
      {
        environment: "production",
        providerConfig: {
          runtimeMode: "live",
          allowWrite: true,
          parameterPathPrefix: "/app/prod/",
          liveRuntime: {
            putParameter: async ({ name, value }: { name: string; value: string }) => {
              if (name.endsWith("FAIL_KEY")) {
                throw new Error("rate limit exceeded");
              }
              writes.push({ name, value });
            },
          },
        },
      },
      { OK_KEY: "ok", FAIL_KEY: "nope" },
    );

    expect(pushResult?.outcome).toBe("partial-failure");
    expect(pushResult?.summary.failed).toBe(1);
    expect(pushResult?.summary.applied).toBe(1);
    expect(writes).toEqual([{ name: "/app/prod/OK_KEY", value: "ok" }]);
    expect(
      pushResult?.operations.find((operation) => operation.key === "FAIL_KEY")?.failureKind,
    ).toBe("transient");
  });

  it("should satisfy adapter contract for write-enabled mode", async () => {
    const contract = await evaluateAdapterContract(awsSsmAdapter, {
      context: {
        environment: "production",
        providerConfig: {
          snapshotFile: fixturePath,
          parameterPathPrefix: "/app/prod/",
          allowWrite: true,
        },
      },
      localValues: {
        API_KEY: "super-secret",
      },
    });

    expect(contract.errors).toEqual([]);
    expect(contract.hasPush).toBe(true);
    expect(contract.pushResultIsValid).toBe(true);
    expect(contract.metaCapabilitiesAreValid).toBe(true);
  });
});
