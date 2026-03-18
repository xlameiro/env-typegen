import { describe, expect, it } from "vitest";

import type { ValidationReport } from "../../src/validation/types.js";
import {
  buildDriftImpactProfile,
  buildDriftRecommendations,
  redactDriftReportValues,
} from "../../src/reporting/drift-report.js";

function makeReport(): ValidationReport {
  return {
    schemaVersion: 1,
    status: "fail",
    summary: { errors: 3, warnings: 3, total: 6 },
    issues: [
      {
        code: "ENV_MISSING",
        type: "missing",
        severity: "warning",
        key: "A",
        environment: ".env",
        message: "Missing A",
        value: "secret-a",
      },
      {
        code: "ENV_EXTRA",
        type: "extra",
        severity: "warning",
        key: "B",
        environment: ".env",
        message: "Extra B",
        value: "secret-b",
      },
      {
        code: "ENV_INVALID_TYPE",
        type: "invalid_type",
        severity: "error",
        key: "C",
        environment: ".env",
        message: "Invalid type C",
        value: "1",
      },
      {
        code: "ENV_INVALID_VALUE",
        type: "invalid_value",
        severity: "warning",
        key: "D",
        environment: ".env",
        message: "Invalid value D",
        value: "x",
      },
      {
        code: "ENV_CONFLICT",
        type: "conflict",
        severity: "error",
        key: "E",
        environment: ".env",
        message: "Conflict E",
        value: "y",
      },
      {
        code: "ENV_SECRET_EXPOSED",
        type: "secret_exposed",
        severity: "error",
        key: "F",
        environment: ".env",
        message: "Secret exposed F",
        value: "z",
      },
    ],
    recommendations: ["existing-recommendation"],
    meta: {
      env: ".env",
      timestamp: "2026-03-18T00:00:00.000Z",
    },
  };
}

describe("drift-report", () => {
  it("should redact all issue values", () => {
    const redacted = redactDriftReportValues(makeReport());
    expect(redacted.issues.every((issue) => issue.value === null)).toBe(true);
  });

  it("should build recommendations from issue mix and keep uniqueness", () => {
    const recommendations = buildDriftRecommendations(makeReport());

    expect(recommendations).toContain("existing-recommendation");
    expect(recommendations.some((value) => value.includes("missing variable"))).toBe(true);
    expect(recommendations.some((value) => value.includes("type mismatch"))).toBe(true);
    expect(recommendations.some((value) => value.includes("invalid value"))).toBe(true);
    expect(recommendations.some((value) => value.includes("environment conflict"))).toBe(true);
    expect(recommendations.some((value) => value.includes("exposed secret"))).toBe(true);
    expect(recommendations.some((value) => value.includes("undeclared variable"))).toBe(true);
    expect(
      recommendations.filter((recommendation) => recommendation === "existing-recommendation"),
    ).toHaveLength(1);
  });

  it("should build drift impact profile by issue type", () => {
    const impact = buildDriftImpactProfile(makeReport());

    expect(impact.high).toBe(3);
    expect(impact.medium).toBe(3);
    expect(impact.low).toBe(0);
  });
});
