import type { ChangeSetOperation } from "./change-set.js";
import type { CompensationPlan } from "./compensation-plan.js";

export type ReconciliationRollbackAction = "create" | "update" | "delete" | "none";

export type ReconciliationOperation = {
  sequence?: number;
  key: string;
  action: ChangeSetOperation["action"];
  status: "planned" | "applied" | "failed" | "skipped";
  reason: string;
  rollbackAction: ReconciliationRollbackAction;
  compensationStatus?: "compensation-planned" | "compensation-not-required";
  compensationAction?: ReconciliationRollbackAction;
};

export type ReconciliationPlan = {
  version: 1;
  deterministic: true;
  operations: ReconciliationOperation[];
  summary: {
    planned: number;
    applied: number;
    failed: number;
    skipped: number;
    total: number;
  };
};

function toRollbackAction(action: ChangeSetOperation["action"]): ReconciliationRollbackAction {
  if (action === "create") {
    return "delete";
  }

  if (action === "delete") {
    return "create";
  }

  if (action === "update") {
    return "update";
  }

  return "none";
}

function toSummary(operations: readonly ReconciliationOperation[]): ReconciliationPlan["summary"] {
  const planned = operations.filter((operation) => operation.status === "planned").length;
  const applied = operations.filter((operation) => operation.status === "applied").length;
  const failed = operations.filter((operation) => operation.status === "failed").length;
  const skipped = operations.filter((operation) => operation.status === "skipped").length;

  return {
    planned,
    applied,
    failed,
    skipped,
    total: operations.length,
  };
}

function toCompensationIndex(
  compensationPlan: CompensationPlan | undefined,
): ReadonlyMap<string, CompensationPlan["operations"][number]> {
  if (compensationPlan === undefined) {
    return new Map();
  }

  return new Map(compensationPlan.operations.map((operation) => [operation.key, operation]));
}

export function buildReconciliationPlan(params: {
  operations: Array<{
    sequence?: number;
    key: string;
    action: ChangeSetOperation["action"];
    status: "planned" | "applied" | "failed" | "skipped";
    message: string;
  }>;
  compensationPlan?: CompensationPlan;
}): ReconciliationPlan {
  const compensationIndex = toCompensationIndex(params.compensationPlan);
  const operations = [...params.operations]
    .sort((left, right) => {
      const leftSequence = left.sequence ?? Number.MAX_SAFE_INTEGER;
      const rightSequence = right.sequence ?? Number.MAX_SAFE_INTEGER;
      if (leftSequence !== rightSequence) {
        return leftSequence - rightSequence;
      }

      return left.key.localeCompare(right.key);
    })
    .map((operation): ReconciliationOperation => {
      const compensation = compensationIndex.get(operation.key);

      return {
        ...(operation.sequence === undefined ? {} : { sequence: operation.sequence }),
        key: operation.key,
        action: operation.action,
        status: operation.status,
        reason: operation.message,
        rollbackAction: toRollbackAction(operation.action),
        ...(compensation === undefined
          ? {}
          : {
              compensationStatus: compensation.status,
              compensationAction: compensation.action,
            }),
      };
    });

  return {
    version: 1,
    deterministic: true,
    operations,
    summary: toSummary(operations),
  };
}
