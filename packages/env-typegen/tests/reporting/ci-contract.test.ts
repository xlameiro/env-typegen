import { describe, expect, it } from "vitest";

import type {
  CiReport,
  Environment,
  Expected,
  Issue,
  IssueCode,
  IssueSeverity,
  ReportStatus,
} from "../../src/reporting/ci-contract.js";

describe("CiReport shape", () => {
  it("should accept a valid CiReport with a passing status and no issues", () => {
    const report: CiReport = {
      schemaVersion: 1,
      status: "ok",
      summary: { errors: 0, warnings: 0 },
      issues: [],
      meta: { env: ".env.example", timestamp: "2026-01-01T00:00:00.000Z" },
    };
    expect(report.schemaVersion).toBe(1);
    expect(report.status).toBe("ok");
    expect(report.issues).toHaveLength(0);
  });

  it("should accept a valid CiReport with a failing status and one issue", () => {
    const issue: Issue = {
      code: "ENV_MISSING",
      type: "Missing variable",
      key: "DATABASE_URL",
      expected: { type: "url" },
      environment: "production",
      severity: "error",
      value: null,
    };
    const report: CiReport = {
      schemaVersion: 1,
      status: "fail",
      summary: { errors: 1, warnings: 0 },
      issues: [issue],
      meta: { env: ".env.production", timestamp: "2026-03-17T00:00:00.000Z" },
    };
    expect(report.schemaVersion).toBe(1);
    expect(report.status).toBe("fail");
    expect(report.summary.errors).toBe(1);
    expect(report.summary.warnings).toBe(0);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]?.code).toBe("ENV_MISSING");
    expect(report.issues[0]?.value).toBeNull();
  });

  it("should accept an issue without a received value (secret variable case)", () => {
    const issue: Issue = {
      code: "ENV_SECRET_EXPOSED",
      type: "Secret exposed",
      key: "AUTH_SECRET",
      expected: { type: "string" },
      environment: "local",
      severity: "error",
      value: null,
    };
    expect(issue.received).toBeUndefined();
    expect(issue.value).toBeNull();
  });

  it("should accept an issue with a received value (non-secret type mismatch)", () => {
    const issue: Issue = {
      code: "ENV_INVALID_TYPE",
      type: "Invalid type",
      key: "PORT",
      expected: { type: "number" },
      received: "not-a-number",
      environment: "test",
      severity: "warning",
      value: null,
    };
    expect(issue.received).toBe("not-a-number");
    expect(issue.value).toBeNull();
  });
});

describe("IssueCode values", () => {
  it("should include all six canonical codes", () => {
    const codes: IssueCode[] = [
      "ENV_MISSING",
      "ENV_EXTRA",
      "ENV_INVALID_TYPE",
      "ENV_INVALID_VALUE",
      "ENV_CONFLICT",
      "ENV_SECRET_EXPOSED",
    ];
    expect(codes).toHaveLength(6);
  });
});

describe("Expected discriminated union", () => {
  it("should accept a string expected type", () => {
    const expected: Expected = { type: "string" };
    expect(expected.type).toBe("string");
  });

  it("should accept a number expected type with optional min/max", () => {
    const expected: Expected = { type: "number", min: 1, max: 65535 };
    expect(expected.type).toBe("number");
    if (expected.type === "number") {
      expect(expected.min).toBe(1);
      expect(expected.max).toBe(65535);
    }
  });

  it("should accept an enum expected type with a values array", () => {
    const expected: Expected = { type: "enum", values: ["development", "staging", "production"] };
    expect(expected.type).toBe("enum");
    if (expected.type === "enum") {
      expect(expected.values).toEqual(["development", "staging", "production"]);
    }
  });

  it("should accept url, email, boolean, json, semver, and unknown expected types", () => {
    const types: Expected["type"][] = ["url", "email", "boolean", "json", "semver", "unknown"];
    for (const expectedType of types) {
      const expected: Expected = { type: expectedType } as Expected;
      expect(expected.type).toBe(expectedType);
    }
  });
});

describe("Environment values", () => {
  it("should include all six canonical environments", () => {
    const environments: Environment[] = [
      "local",
      "example",
      "production",
      "preview",
      "test",
      "cloud",
    ];
    expect(environments).toHaveLength(6);
  });
});

describe("IssueSeverity and ReportStatus", () => {
  it("should accept both severity values", () => {
    const severities: IssueSeverity[] = ["error", "warning"];
    expect(severities).toHaveLength(2);
  });

  it("should accept both report status values", () => {
    const statuses: ReportStatus[] = ["ok", "fail"];
    expect(statuses).toHaveLength(2);
  });
});

describe("CiReport JSON serialization", () => {
  it("should serialize to JSON with stable property order", () => {
    const report: CiReport = {
      schemaVersion: 1,
      status: "ok",
      summary: { errors: 0, warnings: 0 },
      issues: [],
      meta: { env: ".env.example", timestamp: "2026-01-01T00:00:00.000Z" },
    };
    const keys = Object.keys(report);
    expect(keys).toEqual(["schemaVersion", "status", "summary", "issues", "meta"]);
  });
});
