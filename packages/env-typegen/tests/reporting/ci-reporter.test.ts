import { describe, expect, it } from "vitest";
import { buildCiReport, formatCiReport } from "../../src/reporting/ci-reporter.js";
import type { ValidationResult } from "../../src/validator/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return { issues: [], ...overrides };
}

// ---------------------------------------------------------------------------
// buildCiReport — shape tests
// ---------------------------------------------------------------------------

describe("buildCiReport", () => {
  it("should return a CiReport with schemaVersion: 1", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    expect(report.schemaVersion).toBe(1);
  });

  it("should set status to 'ok' when there are no issues", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    expect(report.status).toBe("ok");
  });

  it("should set status to 'fail' when there is at least one error-severity issue", () => {
    const result = makeResult({
      issues: [
        {
          code: "ENV_MISSING",
          key: "DATABASE_URL",
          expected: { type: "url" },
          environment: "local",
          severity: "error",
        },
      ],
    });

    const report = buildCiReport(result, { env: ".env", timestamp: "2026-01-01T00:00:00Z" });

    expect(report.status).toBe("fail");
  });

  it("should set status to 'ok' when all issues are warnings only", () => {
    const result = makeResult({
      issues: [
        {
          code: "ENV_EXTRA",
          key: "UNKNOWN_VAR",
          expected: { type: "string" },
          environment: "local",
          severity: "warning",
        },
      ],
    });

    const report = buildCiReport(result, { env: ".env", timestamp: "2026-01-01T00:00:00Z" });

    expect(report.status).toBe("ok");
  });

  it("should count errors and warnings in summary", () => {
    const result = makeResult({
      issues: [
        {
          code: "ENV_MISSING",
          key: "DATABASE_URL",
          expected: { type: "url" },
          environment: "local",
          severity: "error",
        },
        {
          code: "ENV_MISSING",
          key: "API_KEY",
          expected: { type: "string" },
          environment: "local",
          severity: "error",
        },
        {
          code: "ENV_EXTRA",
          key: "UNKNOWN_VAR",
          expected: { type: "string" },
          environment: "local",
          severity: "warning",
        },
      ],
    });

    const report = buildCiReport(result, { env: ".env", timestamp: "2026-01-01T00:00:00Z" });

    expect(report.summary).toEqual({ errors: 2, warnings: 1 });
  });

  it("should populate summary with zeros when there are no issues", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    expect(report.summary).toEqual({ errors: 0, warnings: 0 });
  });

  it("should set value: null on every issue in the report", () => {
    const result = makeResult({
      issues: [
        {
          code: "ENV_MISSING",
          key: "DATABASE_URL",
          expected: { type: "url" },
          environment: "local",
          severity: "error",
        },
      ],
    });

    const report = buildCiReport(result, { env: ".env", timestamp: "2026-01-01T00:00:00Z" });

    for (const issue of report.issues) {
      expect(issue.value).toBeNull();
    }
  });

  it("should map ValidationIssue code to Issue.code", () => {
    const result = makeResult({
      issues: [
        {
          code: "ENV_SECRET_EXPOSED",
          key: "JWT_SECRET",
          expected: { type: "string" },
          environment: "production",
          severity: "error",
        },
      ],
    });

    const report = buildCiReport(result, {
      env: ".env.production",
      timestamp: "2026-01-01T00:00:00Z",
    });

    expect(report.issues[0]).toMatchObject({
      code: "ENV_SECRET_EXPOSED",
      key: "JWT_SECRET",
      expected: { type: "string" },
      environment: "production",
      severity: "error",
      value: null,
    });
  });

  it("should forward meta to the report", () => {
    const meta = { env: ".env.production", timestamp: "2026-03-17T10:00:00Z" };
    const report = buildCiReport(makeResult(), meta);
    expect(report.meta).toEqual(meta);
  });

  it("should copy issue.type description from code when building issues", () => {
    const result = makeResult({
      issues: [
        {
          code: "ENV_MISSING",
          key: "DATABASE_URL",
          expected: { type: "url" },
          environment: "local",
          severity: "error",
        },
      ],
    });

    const report = buildCiReport(result, { env: ".env", timestamp: "2026-01-01T00:00:00Z" });

    // Issue.type is the human-readable description string (non-empty)
    expect(typeof report.issues[0]?.type).toBe("string");
    expect(report.issues[0]?.type.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// buildCiReport — property order
// ---------------------------------------------------------------------------

describe("buildCiReport property order", () => {
  it("should emit schemaVersion first in the generated report object", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    const keys = Object.keys(report);
    expect(keys[0]).toBe("schemaVersion");
  });

  it("should have keys in canonical order: schemaVersion → status → summary → issues → meta", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    expect(Object.keys(report)).toEqual(["schemaVersion", "status", "summary", "issues", "meta"]);
  });
});

// ---------------------------------------------------------------------------
// formatCiReport — JSON serialisation
// ---------------------------------------------------------------------------

describe("formatCiReport", () => {
  it("should return valid JSON string", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    const json = formatCiReport(report);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("should produce compact JSON by default (no whitespace)", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    const json = formatCiReport(report);
    expect(json).not.toContain("\n");
  });

  it("should produce pretty-printed JSON when pretty=true", () => {
    const report = buildCiReport(makeResult(), { env: ".env", timestamp: "2026-01-01T00:00:00Z" });
    const json = formatCiReport(report, { pretty: true });
    expect(json).toContain("\n");
  });

  it("should round-trip correctly: JSON.parse(formatCiReport(report)) deep-equals report", () => {
    const result = makeResult({
      issues: [
        {
          code: "ENV_MISSING",
          key: "DATABASE_URL",
          expected: { type: "url" },
          environment: "local",
          severity: "error",
        },
      ],
    });

    const report = buildCiReport(result, { env: ".env", timestamp: "2026-03-17T00:00:00Z" });
    const parsed = JSON.parse(formatCiReport(report));

    expect(parsed).toEqual(report);
  });
});
