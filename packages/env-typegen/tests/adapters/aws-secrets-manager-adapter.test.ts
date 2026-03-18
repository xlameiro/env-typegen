import path from "node:path";

import { describe, expect, it } from "vitest";

import awsSecretsManagerAdapter from "../../src/adapters/aws-secrets-manager-adapter.js";
import { evaluateAdapterContract } from "../../src/adapters/testkit.js";

const fixturePath = path.resolve("tests/fixtures/aws/secrets-list.json");

describe("aws secrets manager adapter", () => {
  it("should pull values from secret list payload and normalize slash names", async () => {
    const result = await awsSecretsManagerAdapter.pull({
      environment: "production",
      providerConfig: {
        snapshotFile: fixturePath,
      },
    });

    expect(result.values).toMatchObject({
      API_TOKEN: "token-123",
      WEBHOOK_SECRET: "whsec_456",
      EMPTY_SECRET: "",
    });
    expect(result.metadata?.source).toBe("aws-secrets-manager");
    expect(result.metadata?.mode).toBe("snapshot");
  });

  it("should return blocked operation results when allowWrite is false", async () => {
    const result = await awsSecretsManagerAdapter.push?.(
      { environment: "production", providerConfig: { allowWrite: false } },
      { API_TOKEN: "new" },
    );

    expect(result?.outcome).toBe("blocked");
    expect(result?.summary).toMatchObject({
      applied: 0,
      failed: 0,
      skipped: 1,
      total: 1,
    });
  });

  it("should support live mode pull and partial-failure push results", async () => {
    const writes: Array<{ name: string; value: string }> = [];

    const pullResult = await awsSecretsManagerAdapter.pull({
      environment: "production",
      providerConfig: {
        runtimeMode: "live",
        liveRuntime: {
          pullSecrets: async () => [
            { Name: "API_TOKEN", SecretString: "live-token" },
            { Name: "WEBHOOK_SECRET", SecretString: "live-webhook" },
          ],
        },
      },
    });

    expect(pullResult.values).toMatchObject({
      API_TOKEN: "live-token",
      WEBHOOK_SECRET: "live-webhook",
    });
    expect(pullResult.metadata?.mode).toBe("live");

    const pushResult = await awsSecretsManagerAdapter.push?.(
      {
        environment: "production",
        providerConfig: {
          runtimeMode: "live",
          allowWrite: true,
          liveRuntime: {
            putSecretValue: async ({ name, value }: { name: string; value: string }) => {
              if (name === "FAIL_SECRET") {
                throw new Error("network timeout");
              }
              writes.push({ name, value });
            },
          },
        },
      },
      { API_TOKEN: "new-token", FAIL_SECRET: "bad" },
    );

    expect(pushResult?.outcome).toBe("partial-failure");
    expect(pushResult?.summary.failed).toBe(1);
    expect(pushResult?.summary.applied).toBe(1);
    expect(writes).toEqual([{ name: "API_TOKEN", value: "new-token" }]);
    expect(
      pushResult?.operations.find((operation) => operation.key === "FAIL_SECRET")?.failureKind,
    ).toBe("transient");
  });

  it("should satisfy adapter contract for write-enabled mode", async () => {
    const contract = await evaluateAdapterContract(awsSecretsManagerAdapter, {
      context: {
        environment: "production",
        providerConfig: {
          snapshotFile: fixturePath,
          allowWrite: true,
        },
      },
      localValues: {
        API_TOKEN: "token-123",
      },
    });

    expect(contract.errors).toEqual([]);
    expect(contract.hasPush).toBe(true);
    expect(contract.pushResultIsValid).toBe(true);
    expect(contract.metaCapabilitiesAreValid).toBe(true);
  });
});
