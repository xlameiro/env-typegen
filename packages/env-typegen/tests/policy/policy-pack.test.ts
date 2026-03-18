import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../../src/policy/policy-evaluator.js";
import { resolvePolicyWithPacks } from "../../src/policy/policy-pack-registry.js";
import {
  computePolicyPackChecksum,
  mergePolicyConfigs,
  parsePolicyPack,
} from "../../src/policy/policy-pack.js";
import type { ValidationReport } from "../../src/validation/types.js";

const fixtureDirectory = path.resolve("tests/fixtures/policy/packs");

function createReportWithExtraWarning(): ValidationReport {
  return {
    schemaVersion: 1,
    status: "fail",
    summary: { errors: 0, warnings: 1, total: 1 },
    issues: [
      {
        code: "ENV_EXTRA",
        type: "extra",
        severity: "warning",
        key: "EXTRA_VAR",
        environment: ".env",
        message: "Extra variable",
        value: null,
      },
    ],
    meta: {
      env: ".env",
      timestamp: new Date().toISOString(),
    },
  };
}

describe("policy packs", () => {
  it("should parse a valid policy pack fixture", async () => {
    const content = await readFile(
      path.join(fixtureDirectory, "base-governance.policy.json"),
      "utf8",
    );
    const parsed = parsePolicyPack(content, "base-governance.policy.json");

    expect(parsed.id).toBe("base-governance");
    expect(parsed.layer).toBe("base");
    expect(parsed.policy.rules?.[0]?.id).toBe("base-allow-extra");
  });

  it("should compose base -> overlay -> inline precedence", async () => {
    const resolvedPolicy = await resolvePolicyWithPacks({
      policy: {
        packs: {
          base: [path.join(fixtureDirectory, "base-governance.policy.json")],
          overlay: [path.join(fixtureDirectory, "production-strict.policy.json")],
        },
        rules: [
          {
            id: "inline-allow-extra",
            match: { issueTypes: ["extra"] },
            decision: "allow",
            reason: "Inline policy has highest precedence.",
          },
        ],
      },
    });

    const evaluation = evaluatePolicy(createReportWithExtraWarning(), resolvedPolicy);
    expect(evaluation.decision).toBe("allow");
    expect(evaluation.matchedRule).toBe("inline-allow-extra");
  });

  it("should enforce checksum when provided", async () => {
    const content = await readFile(
      path.join(fixtureDirectory, "base-governance.policy.json"),
      "utf8",
    );
    const checksum = computePolicyPackChecksum(content);

    const resolvedPolicy = await resolvePolicyWithPacks({
      policy: {
        packs: {
          base: [
            {
              source: path.join(fixtureDirectory, "base-governance.policy.json"),
              checksum,
            },
          ],
        },
      },
    });

    expect(resolvedPolicy.rules?.[0]?.id).toBe("base-allow-extra");
  });

  it("should merge policy defaults and rules from overlay over base", () => {
    const merged = mergePolicyConfigs({
      basePolicy: {
        defaults: { onWarnings: "allow" },
        rules: [
          {
            id: "base",
            match: { issueTypes: ["extra"] },
            decision: "allow",
            reason: "base",
          },
        ],
      },
      overlayPolicy: {
        defaults: { onWarnings: "block" },
        rules: [
          {
            id: "overlay",
            match: { issueTypes: ["extra"] },
            decision: "block",
            reason: "overlay",
          },
        ],
      },
    });

    expect(merged.defaults?.onWarnings).toBe("block");
    expect(merged.rules?.[0]?.id).toBe("overlay");
    expect(merged.rules?.[1]?.id).toBe("base");
  });

  it("should resolve enterprise packs with lockfile pinning", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-policy-lock-"));

    const basePackSource = path.join(fixtureDirectory, "enterprise-baseline.policy.json");
    const overlayPackSource = path.join(fixtureDirectory, "enterprise-production.policy.json");

    const baseContent = await readFile(basePackSource, "utf8");
    const overlayContent = await readFile(overlayPackSource, "utf8");

    const lockFilePath = path.join(temporaryDirectory, "policy-pack.lock.json");
    await writeFile(
      lockFilePath,
      JSON.stringify({
        version: 1,
        entries: [
          {
            source: basePackSource,
            checksum: computePolicyPackChecksum(baseContent),
          },
          {
            source: overlayPackSource,
            checksum: computePolicyPackChecksum(overlayContent),
          },
        ],
      }),
      "utf8",
    );

    const resolvedPolicy = await resolvePolicyWithPacks({
      policy: {
        packs: {
          base: [basePackSource],
          overlay: [overlayPackSource],
        },
      },
      cwd: process.cwd(),
      lock: {
        lockFilePath,
        strict: true,
      },
    });

    expect(resolvedPolicy.rules?.[0]?.id).toBe("enterprise-overlay-block-errors");
    expect(resolvedPolicy.rules?.[1]?.id).toBe("enterprise-base-allow-extra");
  });

  it("should fail when strict lockfile does not include a referenced source", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "env-typegen-policy-lock-miss-"),
    );
    const basePackSource = path.join(fixtureDirectory, "enterprise-baseline.policy.json");

    const lockFilePath = path.join(temporaryDirectory, "policy-pack.lock.json");
    await writeFile(
      lockFilePath,
      JSON.stringify({
        version: 1,
        entries: [],
      }),
      "utf8",
    );

    await expect(
      resolvePolicyWithPacks({
        policy: {
          packs: {
            base: [basePackSource],
          },
        },
        lock: {
          lockFilePath,
          strict: true,
        },
      }),
    ).rejects.toThrowError(/missing entry/u);
  });

  it("should keep strict mode in shadow by default", async () => {
    const resolvedPolicy = await resolvePolicyWithPacks({
      policy: {
        packs: {
          base: [path.join(fixtureDirectory, "base-governance.policy.json")],
        },
      },
      trust: {
        mode: "strict",
      },
    });

    expect(resolvedPolicy.rules?.[0]?.id).toBe("base-allow-extra");
  });

  it("should block unsigned packs when strict enforce mode is enabled", async () => {
    await expect(
      resolvePolicyWithPacks({
        policy: {
          packs: {
            base: [path.join(fixtureDirectory, "base-governance.policy.json")],
          },
        },
        trust: {
          mode: "strict",
          enforcement: "enforce",
        },
      }),
    ).rejects.toThrowError(/missing trust signature/u);
  });

  it("should allow unsigned packs in tolerant trust mode", async () => {
    const resolvedPolicy = await resolvePolicyWithPacks({
      policy: {
        packs: {
          base: [path.join(fixtureDirectory, "base-governance.policy.json")],
        },
      },
      trust: {
        mode: "tolerant",
      },
    });

    expect(resolvedPolicy.rules?.[0]?.id).toBe("base-allow-extra");
  });
});
