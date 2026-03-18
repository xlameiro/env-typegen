import type { ReconciliationPlan } from "./reconciliation-plan.js";

export type RollbackSimulationOperation = {
  key: string;
  status: "rollback-planned" | "no-rollback" | "rollback-blocked";
  rollbackAction: "create" | "update" | "delete" | "none";
  message: string;
};

export type RollbackSimulationResult = {
  version: 1;
  canRollback: boolean;
  operations: RollbackSimulationOperation[];
  summary: {
    rollbackPlanned: number;
    noRollback: number;
    rollbackBlocked: number;
    total: number;
  };
};

function summarize(
  operations: readonly RollbackSimulationOperation[],
): RollbackSimulationResult["summary"] {
  const rollbackPlanned = operations.filter(
    (operation) => operation.status === "rollback-planned",
  ).length;
  const noRollback = operations.filter((operation) => operation.status === "no-rollback").length;
  const rollbackBlocked = operations.filter(
    (operation) => operation.status === "rollback-blocked",
  ).length;

  return {
    rollbackPlanned,
    noRollback,
    rollbackBlocked,
    total: operations.length,
  };
}

export function simulateRollbackPlan(plan: ReconciliationPlan): RollbackSimulationResult {
  const operations = plan.operations.map((operation): RollbackSimulationOperation => {
    if (operation.compensationStatus === "compensation-planned") {
      return {
        key: operation.key,
        status: "no-rollback",
        rollbackAction: "none",
        message: "Compensation is already planned for this operation.",
      };
    }

    if (operation.status === "applied" && operation.rollbackAction !== "none") {
      return {
        key: operation.key,
        status: "rollback-planned",
        rollbackAction: operation.rollbackAction,
        message: "Rollback can be scheduled for applied operation.",
      };
    }

    if (operation.status === "failed") {
      return {
        key: operation.key,
        status: "rollback-blocked",
        rollbackAction: operation.rollbackAction,
        message: "Rollback blocked because forward operation failed before consistent apply.",
      };
    }

    return {
      key: operation.key,
      status: "no-rollback",
      rollbackAction: "none",
      message: "No rollback required for skipped or planned-only operation.",
    };
  });

  const summary = summarize(operations);
  return {
    version: 1,
    canRollback: summary.rollbackPlanned > 0,
    operations,
    summary,
  };
}
