import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyLiveWrites,
  buildBlockedPushResult,
  buildSnapshotPushResult,
  readAwsSnapshotPayloads,
  resolveAwsRuntimeMode,
} from "../../src/adapters/aws-runtime.js";

describe("aws runtime", () => {
  it("should default to snapshot mode when runtimeMode is not set", () => {
    expect(resolveAwsRuntimeMode({})).toBe("snapshot");
    expect(resolveAwsRuntimeMode({ runtimeMode: "live" })).toBe("live");
  });

  it("should read snapshot payloads from configured files", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "env-typegen-aws-runtime-"));
    const snapshotPath = path.join(tempDir, "snapshot.json");
    await writeFile(snapshotPath, JSON.stringify({ Parameters: [{ Name: "A", Value: "1" }] }));

    const payloads = await readAwsSnapshotPayloads({ snapshotFile: snapshotPath }, "aws-ssm");

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toMatchObject({ Parameters: [{ Name: "A", Value: "1" }] });
  });

  it("should return deterministic blocked and snapshot push results", () => {
    const blocked = buildBlockedPushResult({ B_KEY: "2", A_KEY: "1" }, "writes disabled");
    const snapshot = buildSnapshotPushResult({ B_KEY: "2", A_KEY: "1" }, "simulated");

    expect(blocked.outcome).toBe("blocked");
    expect(blocked.operations.map((operation) => operation.key)).toEqual(["A_KEY", "B_KEY"]);
    expect(blocked.summary).toMatchObject({ applied: 0, failed: 0, skipped: 2, total: 2 });

    expect(snapshot.outcome).toBe("applied");
    expect(snapshot.operations.map((operation) => operation.key)).toEqual(["A_KEY", "B_KEY"]);
    expect(snapshot.summary).toMatchObject({ applied: 2, failed: 0, skipped: 0, total: 2 });
  });

  it("should report partial-failure outcomes in live writes", async () => {
    const writes: string[] = [];

    const result = await applyLiveWrites({ A_KEY: "1", FAIL_KEY: "2" }, async (key) => {
      if (key === "FAIL_KEY") {
        throw new Error("network timeout");
      }
      writes.push(key);
    });

    expect(result.outcome).toBe("partial-failure");
    expect(result.summary).toMatchObject({ applied: 1, failed: 1, skipped: 0, total: 2 });
    expect(writes).toEqual(["A_KEY"]);
    expect(result.operations.find((operation) => operation.key === "FAIL_KEY")?.failureKind).toBe(
      "transient",
    );
  });
});
