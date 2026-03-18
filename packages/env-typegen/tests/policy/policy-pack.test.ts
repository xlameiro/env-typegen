import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../../src/policy/policy-evaluator.js";
import { resolvePolicyWithPacks } from "../../src/policy/policy-pack-registry.js";
import {
  computePolicyPackChecksum,
  mergePolicyConfigs,
  normalizePolicyPackSource,
  parsePolicyPack,
  stripPolicyPacks,
  validatePolicyPackChecksum,
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

  it("should parse policy distribution channel metadata", () => {
    const content = JSON.stringify({
      id: "channel-aware",
      version: 1,
      layer: "base",
      distribution: {
        channel: "stage",
      },
      policy: {
        rules: [],
      },
    });

    const parsed = parsePolicyPack(content, "channel-aware.policy.json");
    expect(parsed.distribution?.channel).toBe("stage");
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

  it("should fail when policy pack channel does not match expected channel", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-policy-channel-"));
    const channelPackPath = path.join(temporaryDirectory, "channel-mismatch.policy.json");

    await writeFile(
      channelPackPath,
      JSON.stringify(
        {
          id: "channel-mismatch",
          version: 1,
          layer: "base",
          distribution: {
            channel: "dev",
          },
          policy: {
            rules: [
              {
                id: "allow-all",
                match: {
                  issueTypes: ["extra"],
                },
                decision: "allow",
                reason: "test",
              },
            ],
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await expect(
      resolvePolicyWithPacks({
        policy: {
          packs: {
            base: [channelPackPath],
          },
        },
        channel: "prod",
      }),
    ).rejects.toThrowError(/targets channel dev, expected prod/u);
  });

  it("should reject malformed policy pack JSON", () => {
    expect(() => parsePolicyPack("{", "invalid.policy.json")).toThrowError(
      /Failed to parse policy pack/u,
    );
  });

  it("should reject policy packs with invalid layer", () => {
    expect(() =>
      parsePolicyPack(
        JSON.stringify({
          id: "invalid-layer",
          version: 1,
          layer: "invalid",
          policy: {},
        }),
        "invalid-layer.policy.json",
      ),
    ).toThrowError(/layer/u);
  });

  it("should reject policy packs with invalid trust envelope", () => {
    expect(() =>
      parsePolicyPack(
        JSON.stringify({
          id: "invalid-trust",
          version: 1,
          layer: "base",
          trust: {
            signer: "governance-bot",
            issuedAt: "2026-03-18T00:00:00.000Z",
          },
          policy: {},
        }),
        "invalid-trust.policy.json",
      ),
    ).toThrowError(/trust must include either signatureChecksum/u);
  });

  it("should parse policy packs with rsa trust envelope", () => {
    const parsed = parsePolicyPack(
      JSON.stringify({
        id: "rsa-trust",
        version: 1,
        layer: "base",
        trust: {
          signer: "governance-bot",
          algorithm: "rsa-sha256",
          keyId: "aws-kms://env-typegen/governance/v1",
          signature: "signed-payload",
          issuedAt: "2026-03-18T00:00:00.000Z",
        },
        policy: {},
      }),
      "rsa-trust.policy.json",
    );

    expect(parsed.trust?.algorithm).toBe("rsa-sha256");
    expect(parsed.trust?.keyId).toBe("aws-kms://env-typegen/governance/v1");
  });

  it("should reject policy packs with invalid distribution type", () => {
    expect(() =>
      parsePolicyPack(
        JSON.stringify({
          id: "invalid-distribution",
          version: 1,
          layer: "base",
          distribution: "invalid",
          policy: {},
        }),
        "invalid-distribution.policy.json",
      ),
    ).toThrowError(/distribution/u);
  });

  it("should reject policy packs with invalid distribution channel", () => {
    expect(() =>
      parsePolicyPack(
        JSON.stringify({
          id: "invalid-channel",
          version: 1,
          layer: "base",
          distribution: {
            channel: "qa",
          },
          policy: {},
        }),
        "invalid-channel.policy.json",
      ),
    ).toThrowError(/distribution.channel/u);
  });

  it("should normalize local and remote policy pack sources", () => {
    const cwd = process.cwd();
    const local = normalizePolicyPackSource("./packs/base.policy.json", cwd);
    const remote = normalizePolicyPackSource("https://example.com/base.policy.json", cwd);

    expect(local).toContain(path.join("packs", "base.policy.json"));
    expect(remote).toBe("https://example.com/base.policy.json");
  });

  it("should validate policy pack checksum and reject mismatches", () => {
    const content = '{"id":"checksum"}';
    const checksum = computePolicyPackChecksum(content);

    expect(() => validatePolicyPackChecksum(content, checksum)).not.toThrow();
    expect(() =>
      validatePolicyPackChecksum(content, computePolicyPackChecksum("different")),
    ).toThrow(/checksum mismatch/u);
  });

  it("should strip pack declarations from policy config", () => {
    const stripped = stripPolicyPacks({
      mode: "read-only",
      defaults: { onWarnings: "warn" },
      rules: [
        {
          id: "rule-1",
          match: { issueTypes: ["extra"] },
          decision: "warn",
          reason: "warn extras",
        },
      ],
      packs: {
        base: ["./base.policy.json"],
      },
    });

    expect(stripped.mode).toBe("read-only");
    expect(stripped.defaults?.onWarnings).toBe("warn");
    expect(stripped.rules?.[0]?.id).toBe("rule-1");
  });
});
