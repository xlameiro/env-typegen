import { describe, expect, it } from "vitest";

import {
  buildChangeSetFromMaps,
  buildChangeSetFromValidationReport,
  calculateChangeSetHash,
  type ChangeSet,
} from "../../src/sync/change-set.js";
import type { ValidationIssue, ValidationReport } from "../../src/validation/types.js";

function createIssue(overrides: Partial<ValidationIssue>): ValidationIssue {
  return {
    code: "ENV_INVALID_VALUE",
    type: "invalid_value",
    severity: "error",
    key: "GENERIC_KEY",
    environment: ".env",
    message: "Generic issue",
    value: null,
    ...overrides,
  };
}

function createReport(issues: ValidationIssue[]): ValidationReport {
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return {
    schemaVersion: 1,
    status: issues.length === 0 ? "ok" : "fail",
    summary: {
      errors,
      warnings,
      total: issues.length,
    },
    issues,
    meta: {
      env: ".env",
      timestamp: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    },
  };
}

describe("change-set", () => {
  it("should map validation issues into deterministic operations with summary counts", () => {
    const report = createReport([
      createIssue({
        code: "ENV_MISSING",
        type: "missing",
        key: "MISSING_KEY",
        message: "Missing key",
      }),
      createIssue({
        code: "ENV_EXTRA",
        type: "extra",
        key: "EXTRA_KEY",
        severity: "warning",
        message: "Extra key",
      }),
      createIssue({
        code: "ENV_INVALID_TYPE",
        type: "invalid_type",
        key: "TYPE_KEY",
        message: "Type mismatch",
      }),
      createIssue({
        code: "ENV_INVALID_VALUE",
        type: "invalid_value",
        key: "VALUE_KEY",
        message: "Value mismatch",
      }),
      createIssue({
        code: "ENV_CONFLICT",
        type: "conflict",
        key: "CONFLICT_KEY",
        message: "Conflict found",
      }),
      createIssue({
        code: "ENV_SECRET_EXPOSED",
        type: "secret_exposed",
        key: "SECRET_KEY",
        message: "Secret exposed",
      }),
    ]);

    const changeSet = buildChangeSetFromValidationReport(report);
    const byKey = new Map(changeSet.operations.map((operation) => [operation.key, operation]));

    expect(changeSet.version).toBe(1);
    expect(changeSet.source).toBe("validation-report");
    expect(changeSet.operations.map((operation) => operation.key)).toEqual([
      "CONFLICT_KEY",
      "EXTRA_KEY",
      "MISSING_KEY",
      "SECRET_KEY",
      "TYPE_KEY",
      "VALUE_KEY",
    ]);
    expect(byKey.get("MISSING_KEY")?.action).toBe("create");
    expect(byKey.get("EXTRA_KEY")?.action).toBe("delete");
    expect(byKey.get("TYPE_KEY")?.action).toBe("update");
    expect(byKey.get("VALUE_KEY")?.action).toBe("update");
    expect(byKey.get("CONFLICT_KEY")?.impact).toBe("high");
    expect(byKey.get("SECRET_KEY")?.reason).toContain("exposed secret");
    expect(changeSet.summary).toEqual({
      create: 1,
      update: 4,
      delete: 1,
      noOp: 0,
      total: 6,
    });
  });

  it("should build env-diff operations for create, update, delete, and no-op paths", () => {
    const changeSet = buildChangeSetFromMaps({
      localValues: {
        APP_ONLY: "local",
        SAME: "value",
        UPDATED: "new",
      },
      remoteValues: {
        REMOTE_ONLY: "remote",
        SAME: "value",
        UPDATED: "old",
      },
    });

    const byKey = new Map(changeSet.operations.map((operation) => [operation.key, operation]));

    expect(changeSet.version).toBe(1);
    expect(changeSet.source).toBe("env-diff");
    expect(changeSet.operations.map((operation) => operation.key)).toEqual([
      "APP_ONLY",
      "REMOTE_ONLY",
      "SAME",
      "UPDATED",
    ]);
    expect(byKey.get("APP_ONLY")).toMatchObject({
      action: "create",
      impact: "medium",
      localValue: "local",
      remoteValue: null,
    });
    expect(byKey.get("REMOTE_ONLY")).toMatchObject({
      action: "delete",
      impact: "high",
      localValue: null,
      remoteValue: "remote",
    });
    expect(byKey.get("UPDATED")).toMatchObject({
      action: "update",
      impact: "medium",
      localValue: "new",
      remoteValue: "old",
    });
    expect(byKey.get("SAME")).toMatchObject({
      action: "no-op",
      impact: "low",
      localValue: "value",
      remoteValue: "value",
    });
    expect(changeSet.summary).toEqual({
      create: 1,
      update: 1,
      delete: 1,
      noOp: 1,
      total: 4,
    });
  });

  it("should produce stable hashes for semantically equivalent operation orderings", () => {
    const ordered: ChangeSet = {
      version: 1,
      source: "env-diff",
      operations: [
        {
          sequence: 1,
          key: "ALPHA",
          action: "update",
          impact: "medium",
          reason: "first",
          localValue: "1",
          remoteValue: "0",
        },
        {
          sequence: 1,
          key: "ALPHA",
          action: "delete",
          impact: "high",
          reason: "same-sequence-different-action",
          localValue: null,
          remoteValue: "to-delete",
        },
        {
          sequence: 2,
          key: "BRAVO",
          action: "create",
          impact: "medium",
          reason: "second",
          localValue: "x",
          remoteValue: null,
        },
        {
          key: "CHARLIE",
          action: "no-op",
          impact: "low",
          reason: "missing sequence should sort last",
          localValue: "same",
          remoteValue: "same",
        },
      ],
      summary: {
        create: 1,
        update: 1,
        delete: 1,
        noOp: 1,
        total: 4,
      },
    };

    const shuffled: ChangeSet = {
      ...ordered,
      operations: [...ordered.operations].reverse(),
    };

    expect(calculateChangeSetHash(ordered)).toBe(calculateChangeSetHash(shuffled));
  });

  it("should change hash when semantically relevant content changes", () => {
    const base: ChangeSet = {
      version: 1,
      source: "validation-report",
      operations: [
        {
          sequence: 0,
          key: "PORT",
          action: "update",
          impact: "medium",
          reason: "Value changed",
          localValue: "3000",
          remoteValue: "8080",
        },
      ],
      summary: {
        create: 0,
        update: 1,
        delete: 0,
        noOp: 0,
        total: 1,
      },
    };

    const changedSource: ChangeSet = {
      ...base,
      source: "env-diff",
    };

    expect(calculateChangeSetHash(base)).not.toBe(calculateChangeSetHash(changedSource));
  });
});
