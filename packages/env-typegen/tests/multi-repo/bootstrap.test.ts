import path from "node:path";

import { describe, expect, it } from "vitest";

import { bootstrapFromManifest, createBootstrapPlan } from "../../src/multi-repo/bootstrap.js";
import { loadRepoManifest } from "../../src/multi-repo/repo-manifest.js";

const fixturesDirectory = path.resolve("tests/fixtures/multi-repo");

describe("multi-repo bootstrap", () => {
  it("should load a valid manifest and create deterministic bootstrap targets", async () => {
    const manifestPath = path.join(fixturesDirectory, "fleet-manifest.valid.json");

    const manifest = await loadRepoManifest(manifestPath);
    const plan = createBootstrapPlan(manifest);

    expect(manifest.version).toBe(1);
    expect(plan.version).toBe(1);
    expect(plan.manifestVersion).toBe(1);
    expect(plan.summary.total).toBe(2);
    expect(plan.summary.enforce).toBe(1);
    expect(plan.summary.apply).toBe(1);
    expect(plan.targets[0]?.template).toBe("library");
    expect(plan.targets[0]?.enforcementLevel).toBe("standard");
    expect(plan.targets[0]?.policyChannel).toBe("dev");
    expect(plan.targets[1]?.template).toBe("web-app");
    expect(plan.targets[1]?.enforcementLevel).toBe("strict");
    expect(plan.targets[1]?.policyChannel).toBe("prod");
    expect(plan.targets[0]?.verifyCommand).toContain("env-typegen verify");
    expect(plan.targets[1]?.conformanceCommand).toContain(
      "qa-test/env-typegen-conformance-smoke.mjs",
    );
  });

  it("should support direct bootstrap from manifest file path", async () => {
    const manifestPath = path.join(fixturesDirectory, "fleet-manifest.valid.json");

    const plan = await bootstrapFromManifest(manifestPath);

    expect(plan.targets).toHaveLength(2);
    expect(plan.targets[0]?.root).toContain("services/catalog");
  });

  it("should throw for invalid manifests", async () => {
    const manifestPath = path.join(fixturesDirectory, "fleet-manifest.invalid.json");

    await expect(loadRepoManifest(manifestPath)).rejects.toThrow(
      "fleet[0].provider must be a non-empty string",
    );
  });
});
