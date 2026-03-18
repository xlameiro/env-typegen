import type { AdapterContext, EnvAdapter, EnvMap } from "../adapters/types.js";
import {
  evaluateExecutionBudget,
  type ExecutionBudget,
  type ExecutionBudgetEvaluation,
} from "../ops/execution-budget.js";
import { executeApplyOperations } from "./apply-operations.js";
import type { ChangeSet, ChangeSetOperation } from "./change-set.js";
import { buildCompensationPlan, type CompensationPlan } from "./compensation-plan.js";
import { buildReconciliationPlan, type ReconciliationPlan } from "./reconciliation-plan.js";
import type { RetryPolicy } from "./retry-policy.js";
import { simulateRollbackPlan, type RollbackSimulationResult } from "./rollback-simulation.js";

export type ApplyMode = "dry-run" | "apply";

export type ApplyOperationStatus = "planned" | "applied" | "failed" | "skipped";

export type ApplyFailureKind = "none" | "transient" | "permanent";

export type ApplyOperationResultV2 = {
  key: string;
  action: ChangeSetOperation["action"];
  status: ApplyOperationStatus;
  failureKind: ApplyFailureKind;
  message: string;
};

export type ApplySummaryV2 = {
  mode: ApplyMode;
  planned: number;
  applied: number;
  failed: number;
  skipped: number;
  total: number;
  atomic: false;
};

export type ApplyExecutionResultV2 = {
  summary: ApplySummaryV2;
  operations: ApplyOperationResultV2[];
  compensationPlan: CompensationPlan;
  reconciliationPlan: ReconciliationPlan;
  rollbackSimulation: RollbackSimulationResult;
  budget: ExecutionBudgetEvaluation & { durationMs: number };
};

function withMeta(params: {
  mode: ApplyMode;
  operations: ApplyOperationResultV2[];
  compensationPlan: CompensationPlan;
  startedAt: number;
  budget: ExecutionBudget | undefined;
}): ApplyExecutionResultV2 {
  const durationMs = Math.max(0, Date.now() - params.startedAt);
  const summary = summarize(params.mode, params.operations);
  const budget = evaluateExecutionBudget({
    budget: params.budget,
    snapshot: {
      planned: summary.planned,
      applied: summary.applied,
      failed: summary.failed,
      skipped: summary.skipped,
      total: summary.total,
      durationMs,
    },
  });
  const reconciliationPlan = buildReconciliationPlan({
    operations: params.operations,
    compensationPlan: params.compensationPlan,
  });
  const rollbackSimulation = simulateRollbackPlan(reconciliationPlan);

  return {
    summary,
    operations: params.operations,
    compensationPlan: params.compensationPlan,
    reconciliationPlan,
    rollbackSimulation,
    budget: {
      ...budget,
      durationMs,
    },
  };
}

function toPlannedResult(operation: ChangeSetOperation): ApplyOperationResultV2 {
  if (operation.action === "no-op") {
    return {
      key: operation.key,
      action: operation.action,
      status: "skipped",
      failureKind: "none",
      message: "No-op operation; remote value already aligned.",
    };
  }

  return {
    key: operation.key,
    action: operation.action,
    status: "planned",
    failureKind: "none",
    message: operation.reason,
  };
}

function summarize(mode: ApplyMode, operations: readonly ApplyOperationResultV2[]): ApplySummaryV2 {
  const planned = operations.filter((operation) => operation.status === "planned").length;
  const applied = operations.filter((operation) => operation.status === "applied").length;
  const failed = operations.filter((operation) => operation.status === "failed").length;
  const skipped = operations.filter((operation) => operation.status === "skipped").length;

  return {
    mode,
    planned,
    applied,
    failed,
    skipped,
    total: operations.length,
    atomic: false,
  };
}

export async function runApplyEngineV2(params: {
  adapter: EnvAdapter;
  adapterContext: AdapterContext;
  localValues: EnvMap;
  changeSet: ChangeSet;
  mode: ApplyMode;
  retryPolicy?: Partial<RetryPolicy>;
  executionBudget?: ExecutionBudget;
}): Promise<ApplyExecutionResultV2> {
  const startedAt = Date.now();
  const plannedOperations = params.changeSet.operations.map(toPlannedResult);
  const plannedCompensationPlan = buildCompensationPlan({
    operations: plannedOperations,
  });

  if (params.mode === "dry-run") {
    return withMeta({
      mode: "dry-run",
      operations: plannedOperations,
      compensationPlan: plannedCompensationPlan,
      startedAt,
      budget: params.executionBudget,
    });
  }

  const operations = await executeApplyOperations({
    operations: params.changeSet.operations,
    adapter: params.adapter,
    adapterContext: params.adapterContext,
    localValues: params.localValues,
    ...(params.retryPolicy === undefined ? {} : { retryPolicy: params.retryPolicy }),
  });
  const compensationPlan = buildCompensationPlan({ operations });

  return withMeta({
    mode: "apply",
    operations,
    compensationPlan,
    startedAt,
    budget: params.executionBudget,
  });
}
