import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../../src/policy/policy-evaluator.js";
import type { EnvTypegenPolicyConfig } from "../../src/policy/policy-model.js";
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

describe("evaluatePolicy", () => {
  it("should allow clean reports by default", () => {
    const evaluation = evaluatePolicy(createReport(), undefined);

    expect(evaluation.decision).toBe("allow");
    expect(evaluation.risk).toBe("low");
    expect(evaluation.mode).toBe("read-only");
  });

  it("should block warning-only reports by default", () => {
    const report = createReport({
      status: "fail",
      summary: { errors: 0, warnings: 1, total: 1 },
      issues: [
        {
          code: "ENV_EXTRA",
          type: "extra",
          severity: "warning",
          key: "EXTRA",
          environment: ".env",
          message: "Extra variable",
          value: null,
        },
      ],
    });

    const evaluation = evaluatePolicy(report, undefined);

    expect(evaluation.decision).toBe("block");
    expect(evaluation.risk).toBe("medium");
  });

  it("should match custom rules before fallback defaults", () => {
    const report = createReport({
      status: "fail",
      summary: { errors: 0, warnings: 2, total: 2 },
      issues: [
        {
          code: "ENV_EXTRA",
          type: "extra",
          severity: "warning",
          key: "A",
          environment: ".env",
          message: "Extra",
          value: null,
        },
        {
          code: "ENV_EXTRA",
          type: "extra",
          severity: "warning",
          key: "B",
          environment: ".env",
          message: "Extra",
          value: null,
        },
      ],
    });

    const policy: EnvTypegenPolicyConfig = {
      rules: [
        {
          id: "allow-extra-warnings",
          match: { issueTypes: ["extra"] },
          decision: "allow",
          risk: "low",
          reason: "Extra variables are tolerated in pre-production.",
        },
      ],
    };

    const evaluation = evaluatePolicy(report, policy);

    expect(evaluation.decision).toBe("allow");
    expect(evaluation.risk).toBe("low");
    expect(evaluation.matchedRule).toBe("allow-extra-warnings");
  });

  it("should downgrade block decisions to warn in advisory mode", () => {
    const report = createReport({
      status: "fail",
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

    const evaluation = evaluatePolicy(report, { mode: "advisory" });

    expect(evaluation.decision).toBe("warn");
    expect(evaluation.mode).toBe("advisory");
    expect(evaluation.reasons.some((reason) => reason.includes("downgraded"))).toBe(true);
  });

  it("should support riskAtLeast matchers", () => {
    const report = createReport({
      status: "fail",
      summary: { errors: 1, warnings: 0, total: 1 },
      issues: [
        {
          code: "ENV_INVALID_TYPE",
          type: "invalid_type",
          severity: "error",
          key: "PORT",
          environment: ".env",
          message: "Invalid type",
          value: null,
        },
      ],
    });

    const policy: EnvTypegenPolicyConfig = {
      defaults: { onErrors: "allow" },
      rules: [
        {
          id: "high-risk-block",
          match: { riskAtLeast: "high" },
          decision: "block",
          reason: "High-risk reports must be blocked.",
        },
      ],
    };

    const evaluation = evaluatePolicy(report, policy);

    expect(evaluation.decision).toBe("block");
    expect(evaluation.matchedRule).toBe("high-risk-block");
  });
});
