import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { publishPolicyPack } from "../../src/policy/policy-pack-publisher.js";

const fixturesDirectory = path.resolve("tests/fixtures/policy/packs");

describe("policy pack publisher", () => {
  it("should publish a policy pack to local channel destination", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-publish-local-"));
    const source = path.join(fixturesDirectory, "base-governance.policy.json");
    const content = await readFile(source, "utf8");

    const result = await publishPolicyPack({
      source,
      content,
      channel: "dev",
      target: {
        sink: "local",
        destination: temporaryDirectory,
      },
    });

    expect(result.channel).toBe("dev");
    expect(result.sink).toBe("local");
    expect(result.destination).toContain(path.join("dev", "base-governance@1.policy.json"));
  });

  it("should emit remote publish descriptor for non-local sinks", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-publish-remote-"));
    const source = path.join(fixturesDirectory, "production-strict.policy.json");
    const content = await readFile(source, "utf8");

    const result = await publishPolicyPack({
      source,
      content,
      channel: "stage",
      promotedFrom: "dev",
      target: {
        sink: "github-packages",
        destination: temporaryDirectory,
      },
    });

    expect(result.sink).toBe("github-packages");
    expect(result.destination).toContain(
      path.join("stage", "production-strict@1.publish-request.json"),
    );
    expect(result.promotedFrom).toBe("dev");
  });

  it("should reject invalid promotion path", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "env-typegen-publish-invalid-"),
    );
    const source = path.join(fixturesDirectory, "base-governance.policy.json");
    const content = await readFile(source, "utf8");

    await expect(
      publishPolicyPack({
        source,
        content,
        channel: "prod",
        promotedFrom: "dev",
        target: {
          sink: "local",
          destination: temporaryDirectory,
        },
      }),
    ).rejects.toThrowError(/Invalid policy promotion path/u);
  });
});
