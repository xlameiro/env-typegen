import { describe, expect, it } from "vitest";

import type { PolicyEvaluation } from "../../src/policy/policy-model.js";
import type { ValidationReport } from "../../src/validation/types.js";
import {
  attachPolicyEvaluation,
  formatPlanOutput,
  formatPolicyRecommendation,
  formatSyncPreviewOutput,
} from "../../src/reporting/policy-report.js";

function makePolicy(overrides: Partial<PolicyEvaluation> = {}): PolicyEvaluation {
  return {
    decision: "warn",
    risk: "medium",
    mode: "read-only",
    reasons: ["reason-1"],
    summary: { errors: 0, warnings: 0, total: 0 },
    ...overrides,
  };
}

function makeReport(): ValidationReport {
  return {
    schemaVersion: 1,
    status: "fail",
    summary: { errors: 0, warnings: 2, total: 2 },
    issues: [
      {
        code: "ENV_MISSING",
        type: "missing",
        severity: "warning",
        key: "API_URL",
        environment: ".env",
        message: "Missing API_URL",
        value: null,
      },
      {
        code: "ENV_EXTRA",
        type: "extra",
        severity: "warning",
        key: "OLD_VAR",
        environment: ".env",
        message: "Extra OLD_VAR",
        value: null,
      },
    ],
    meta: {
      env: ".env",
      timestamp: "2026-03-18T10:00:00.000Z",
    },
    recommendations: ["existing-recommendation"],
  };
}

describe("policy-report", () => {
  it("should format policy recommendation with and without matched rule", () => {
    const withoutRule = formatPolicyRecommendation(makePolicy());
    expect(withoutRule).toBe("Policy decision: WARN (risk: MEDIUM, mode: read-only)");

    const withRule = formatPolicyRecommendation(makePolicy({ matchedRule: "rule-1" }));
    expect(withRule).toContain("rule=rule-1");
  });

  it("should attach policy evaluation recommendations without duplicates", () => {
    const report = makeReport();
    const policy = makePolicy({
      matchedRule: "rule-2",
      reasons: ["existing-recommendation", "reason-2"],
    });

    const next = attachPolicyEvaluation(report, policy);

    expect(next.recommendations).toBeDefined();
    expect(next.recommendations).toContain("existing-recommendation");
    expect(next.recommendations).toContain("reason-2");
    expect(
      next.recommendations?.filter(
        (recommendation) => recommendation === "existing-recommendation",
      ),
    ).toHaveLength(1);
  });

  it("should format plan output including matched rule, reasons, and recommendations", () => {
    const output = formatPlanOutput({
      report: makeReport(),
      policy: makePolicy({
        decision: "block",
        risk: "high",
        matchedRule: "rule-prod-block",
        reasons: ["policy reason"],
      }),
    });

    expect(output).toContain("env-typegen plan");
    expect(output).toContain("Verification summary: errors=0, warnings=2, total=2");
    expect(output).toContain("Policy decision: BLOCK (risk=high, mode=read-only)");
    expect(output).toContain("Matched rule: rule-prod-block");
    expect(output).toContain("Reasons:");
    expect(output).toContain("- policy reason");
    expect(output).toContain("Recommendations:");
    expect(output).toContain("- existing-recommendation");
  });

  it("should format sync-preview output with drift sections and policy reasons", () => {
    const output = formatSyncPreviewOutput({
      provider: "vercel",
      environment: "production",
      missingInRemote: ["A", "B"],
      extraInRemote: ["C"],
      mismatches: ["D"],
      policy: makePolicy({
        decision: "warn",
        reasons: ["review before apply"],
      }),
    });

    expect(output).toContain("env-typegen sync-preview (vercel/production)");
    expect(output).toContain("missingInRemote=2");
    expect(output).toContain("Extra in remote:");
    expect(output).toContain("- C");
    expect(output).toContain("Mismatched values:");
    expect(output).toContain("- D");
    expect(output).toContain("Reasons:");
    expect(output).toContain("- review before apply");
  });
});
