import { describe, expect, it } from "vitest";

import { finalizeVerifyReport } from "../../src/commands/verify-command.js";
import { evaluatePolicy } from "../../src/policy/policy-evaluator.js";
import { resolvePolicyWithPacks } from "../../src/policy/policy-pack-registry.js";
import type { ValidationReport } from "../../src/validation/types.js";

function createReport(overrides: Partial<ValidationReport> = {}): ValidationReport {
  return {
    schemaVersion: 1,
    status: "ok",
    summary: { errors: 0, warnings: 0, total: 0 },
    issues: [],
    meta: {
      env: ".env",
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe("verify command", () => {
  // -----------------------------------------------------------------------
  // Status resolution
  // -----------------------------------------------------------------------

  it("should keep ok status when no warnings or errors exist", () => {
    const report = createReport();

    const finalized = finalizeVerifyReport(report);

    expect(finalized.status).toBe("ok");
    expect(finalized.summary.errors).toBe(0);
    expect(finalized.summary.warnings).toBe(0);
  });

  it("should fail when warnings exist (warnings are errors in verify semantics)", () => {
    const report = createReport({
      summary: { errors: 0, warnings: 1, total: 1 },
      issues: [
        {
          code: "ENV_EXTRA",
          type: "extra",
          severity: "warning",
          key: "DEBUG",
          environment: ".env",
          message: "Extra variable",
          value: "true",
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.status).toBe("fail");
    // Value must be redacted by default
    expect(finalized.issues[0]?.value).toBeNull();
  });

  it("should fail when errors exist (no warnings)", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_MISSING",
          type: "missing",
          severity: "error",
          key: "SECRET_KEY",
          environment: ".env",
          message: "Missing variable",
          value: null,
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.status).toBe("fail");
  });

  it("should fail when both errors and warnings coexist", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 1, total: 2 },
      issues: [
        {
          code: "ENV_MISSING",
          type: "missing",
          severity: "error",
          key: "API_KEY",
          environment: ".env",
          message: "Missing",
          value: null,
        },
        {
          code: "ENV_EXTRA",
          type: "extra",
          severity: "warning",
          key: "EXTRA_VAR",
          environment: ".env",
          message: "Extra",
          value: "extra-val",
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.status).toBe("fail");
    expect(finalized.summary.errors).toBe(1);
    expect(finalized.summary.warnings).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Redaction behaviour
  // -----------------------------------------------------------------------

  it("should redact issue values by default", () => {
    const report = createReport({
      summary: { errors: 0, warnings: 1, total: 1 },
      issues: [
        {
          code: "ENV_EXTRA",
          type: "extra",
          severity: "warning",
          key: "DEBUG",
          environment: ".env",
          message: "Extra variable",
          value: "sensitive-value",
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.issues[0]?.value).toBeNull();
  });

  it("should preserve issue values when redactValuesByDefault is explicitly false", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_INVALID_TYPE",
          type: "invalid_type",
          severity: "error",
          key: "PORT",
          environment: ".env",
          message: "Invalid type",
          value: "not-a-number",
        },
      ],
    });

    const finalized = finalizeVerifyReport(report, { redactValuesByDefault: false });

    expect(finalized.issues[0]?.value).toBe("not-a-number");
  });

  it("should keep null values as null when redactValuesByDefault is false", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_MISSING",
          type: "missing",
          severity: "error",
          key: "API_KEY",
          environment: ".env",
          message: "Missing variable",
          value: null,
        },
      ],
    });

    const finalized = finalizeVerifyReport(report, { redactValuesByDefault: false });

    expect(finalized.issues[0]?.value).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Drift recommendations
  // -----------------------------------------------------------------------

  it("should include drift recommendations for missing variables", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_MISSING",
          type: "missing",
          severity: "error",
          key: "API_KEY",
          environment: ".env.production",
          message: "Missing variable",
          value: null,
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.recommendations?.some((item) => item.includes("missing variable"))).toBe(true);
  });

  it("should include drift recommendations for type mismatches", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_INVALID_TYPE",
          type: "invalid_type",
          severity: "error",
          key: "PORT",
          environment: ".env",
          message: "Type mismatch",
          value: null,
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.recommendations?.some((item) => item.includes("mismatch"))).toBe(true);
  });

  it("should include drift recommendations for invalid values", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_INVALID_VALUE",
          type: "invalid_value",
          severity: "error",
          key: "NODE_ENV",
          environment: ".env",
          message: "Value is outside allowed enum",
          value: null,
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.recommendations?.some((item) => item.includes("invalid value"))).toBe(true);
  });

  it("should include drift recommendations for exposed secrets", () => {
    const report = createReport({
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_SECRET_EXPOSED",
          type: "secret_exposed",
          severity: "error",
          key: "NEXT_PUBLIC_API_KEY",
          environment: ".env",
          message: "Secret should not be exposed to client runtime",
          value: "leaky",
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.recommendations?.some((item) => item.includes("exposed secret"))).toBe(true);
  });

  it("should include drift recommendations for extra undeclared variables", () => {
    const report = createReport({
      summary: { errors: 0, warnings: 1, total: 1 },
      issues: [
        {
          code: "ENV_EXTRA",
          type: "extra",
          severity: "warning",
          key: "ORPHAN",
          environment: ".env",
          message: "Extra variable",
          value: "val",
        },
      ],
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.recommendations?.some((item) => item.includes("undeclared variable"))).toBe(
      true,
    );
  });

  it("should deduplicate recommendations when the same type appears multiple times", () => {
    const report = createReport({
      summary: { errors: 3, warnings: 0, total: 3 },
      issues: [
        {
          code: "ENV_MISSING",
          type: "missing",
          severity: "error",
          key: "KEY_A",
          environment: ".env",
          message: "Missing",
          value: null,
        },
        {
          code: "ENV_MISSING",
          type: "missing",
          severity: "error",
          key: "KEY_B",
          environment: ".env",
          message: "Missing",
          value: null,
        },
        {
          code: "ENV_MISSING",
          type: "missing",
          severity: "error",
          key: "KEY_C",
          environment: ".env",
          message: "Missing",
          value: null,
        },
      ],
      recommendations: ["Add missing variables"],
    });

    const finalized = finalizeVerifyReport(report);
    const recs = finalized.recommendations ?? [];

    // All entries must be unique — no duplicate strings
    expect(recs.length).toBe(new Set(recs).size);
    // The single missing-count recommendation must reference 3 variables
    expect(recs.some((item) => item.includes("3 missing variable"))).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Meta passthrough
  // -----------------------------------------------------------------------

  it("should preserve the original meta in the finalized report", () => {
    const timestamp = "2026-03-18T00:00:00.000Z";
    const report = createReport({
      meta: { env: ".env.staging", timestamp },
    });

    const finalized = finalizeVerifyReport(report);

    expect(finalized.meta.env).toBe(".env.staging");
    expect(finalized.meta.timestamp).toBe(timestamp);
  });

  it("should respect inline policy over overlay/base policy packs", async () => {
    const report = createReport({
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
    });

    const resolvedPolicy = await resolvePolicyWithPacks({
      policy: {
        packs: {
          base: ["tests/fixtures/policy/packs/base-governance.policy.json"],
          overlay: ["tests/fixtures/policy/packs/production-strict.policy.json"],
        },
        rules: [
          {
            id: "inline-allow-extra",
            match: { issueTypes: ["extra"] },
            decision: "allow",
            reason: "Inline override should win.",
          },
        ],
      },
      cwd: process.cwd(),
    });

    const evaluation = evaluatePolicy(report, resolvedPolicy);
    expect(evaluation.decision).toBe("allow");
    expect(evaluation.matchedRule).toBe("inline-allow-extra");
  });
});
