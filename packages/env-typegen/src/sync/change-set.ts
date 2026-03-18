import { createHash } from "node:crypto";
import type { EnvMap } from "../adapters/types.js";
import type { ValidationIssue, ValidationReport } from "../validation/types.js";

export type ChangeSetImpact = "low" | "medium" | "high";

export type ChangeSetAction = "create" | "update" | "delete" | "no-op";

export type ChangeSetSource = "validation-report" | "env-diff";

export type ChangeSetOperation = {
  sequence?: number;
  key: string;
  action: ChangeSetAction;
  impact: ChangeSetImpact;
  reason: string;
  localValue: string | null;
  remoteValue: string | null;
};

export type ChangeSetSummary = {
  create: number;
  update: number;
  delete: number;
  noOp: number;
  total: number;
};

export type ChangeSet = {
  version: 1;
  source: ChangeSetSource;
  operations: ChangeSetOperation[];
  summary: ChangeSetSummary;
};

function toCanonicalChangeSet(changeSet: ChangeSet): ChangeSet {
  const operations = [...changeSet.operations].sort((left, right) => {
    const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
    const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;
    if (leftSequence !== rightSequence) {
      return leftSequence - rightSequence;
    }

    const byKey = left.key.localeCompare(right.key);
    if (byKey !== 0) {
      return byKey;
    }

    return left.action.localeCompare(right.action);
  });

  return {
    version: changeSet.version,
    source: changeSet.source,
    operations,
    summary: changeSet.summary,
  };
}

export function calculateChangeSetHash(changeSet: ChangeSet): string {
  const serialized = JSON.stringify(toCanonicalChangeSet(changeSet));
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

function countByAction(operations: readonly ChangeSetOperation[], action: ChangeSetAction): number {
  return operations.filter((operation) => operation.action === action).length;
}

function toSummary(operations: readonly ChangeSetOperation[]): ChangeSetSummary {
  const create = countByAction(operations, "create");
  const update = countByAction(operations, "update");
  const del = countByAction(operations, "delete");
  const noOp = countByAction(operations, "no-op");

  return {
    create,
    update,
    delete: del,
    noOp,
    total: operations.length,
  };
}

function impactFromIssue(issue: ValidationIssue): ChangeSetImpact {
  if (issue.type === "conflict" || issue.type === "secret_exposed") {
    return "high";
  }
  if (issue.type === "extra") {
    return "high";
  }
  return "medium";
}

function actionFromIssue(issue: ValidationIssue): ChangeSetAction {
  if (issue.type === "missing") return "create";
  if (issue.type === "extra") return "delete";
  return "update";
}

function reasonFromIssue(issue: ValidationIssue): string {
  if (issue.type === "missing") {
    return "Variable declared in contract but missing in source.";
  }
  if (issue.type === "extra") {
    return "Variable exists in source but is not declared in contract.";
  }
  if (issue.type === "invalid_type") {
    return "Variable type differs from contract expectation.";
  }
  if (issue.type === "invalid_value") {
    return "Variable value does not satisfy contract constraints.";
  }
  if (issue.type === "conflict") {
    return "Variable has conflicting values across sources.";
  }
  return "Variable is marked as exposed secret and requires remediation.";
}

export function buildChangeSetFromValidationReport(report: ValidationReport): ChangeSet {
  const operations: ChangeSetOperation[] = report.issues
    .map((issue, index) => ({
      sequence: index,
      key: issue.key,
      action: actionFromIssue(issue),
      impact: impactFromIssue(issue),
      reason: reasonFromIssue(issue),
      localValue: null,
      remoteValue: null,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    version: 1,
    source: "validation-report",
    operations,
    summary: toSummary(operations),
  };
}

export function buildChangeSetFromMaps(params: {
  localValues: EnvMap;
  remoteValues: EnvMap;
}): ChangeSet {
  const allKeys = [
    ...new Set([...Object.keys(params.localValues), ...Object.keys(params.remoteValues)]),
  ].sort((left, right) => left.localeCompare(right));

  const operations: ChangeSetOperation[] = allKeys.map((key, index) => {
    const localValue = params.localValues[key] ?? null;
    const remoteValue = params.remoteValues[key] ?? null;

    if (remoteValue === null && localValue !== null) {
      return {
        sequence: index,
        key,
        action: "create",
        impact: "medium",
        reason: "Key exists locally and is missing remotely.",
        localValue,
        remoteValue,
      };
    }

    if (remoteValue !== null && localValue === null) {
      return {
        sequence: index,
        key,
        action: "delete",
        impact: "high",
        reason: "Key exists remotely and is missing locally.",
        localValue,
        remoteValue,
      };
    }

    if (remoteValue !== localValue) {
      return {
        sequence: index,
        key,
        action: "update",
        impact: "medium",
        reason: "Key exists in both sources but values differ.",
        localValue,
        remoteValue,
      };
    }

    return {
      sequence: index,
      key,
      action: "no-op",
      impact: "low",
      reason: "Key is already aligned between local and remote sources.",
      localValue,
      remoteValue,
    };
  });

  return {
    version: 1,
    source: "env-diff",
    operations,
    summary: toSummary(operations),
  };
}
