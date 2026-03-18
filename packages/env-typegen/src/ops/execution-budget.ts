import type { SloEvaluation, SloPolicy } from "./slo-policy.js";
import { evaluateSloPolicy } from "./slo-policy.js";

export type ExecutionBudget = {
  maxOperations?: number;
  maxDurationMs?: number;
  maxFailedOperations?: number;
  maxFailureRate?: number;
  sloPolicy?: SloPolicy;
};

export type ExecutionBudgetSnapshot = {
  planned: number;
  applied: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
};

export type ExecutionBudgetEvaluation = {
  allowed: boolean;
  reasons: string[];
  limitsApplied: string[];
  slo: SloEvaluation;
};

function exceedsFailureRate(failed: number, total: number, maxFailureRate: number): boolean {
  if (total === 0) {
    return false;
  }

  return failed / total > maxFailureRate;
}

export function evaluateExecutionBudget(params: {
  budget: ExecutionBudget | undefined;
  snapshot: ExecutionBudgetSnapshot;
}): ExecutionBudgetEvaluation {
  const reasons: string[] = [];
  const limitsApplied: string[] = [];
  const slo = evaluateSloPolicy({
    policy: params.budget?.sloPolicy,
    snapshot: params.snapshot,
  });

  if (params.budget === undefined) {
    return {
      allowed: true,
      reasons,
      limitsApplied,
      slo,
    };
  }

  const { budget, snapshot } = params;

  if (budget.maxOperations !== undefined) {
    limitsApplied.push("maxOperations");
    if (snapshot.total > budget.maxOperations) {
      reasons.push(
        `Execution budget exceeded maxOperations (${snapshot.total} > ${budget.maxOperations}).`,
      );
    }
  }

  if (budget.maxDurationMs !== undefined) {
    limitsApplied.push("maxDurationMs");
    if (snapshot.durationMs > budget.maxDurationMs) {
      reasons.push(
        `Execution budget exceeded maxDurationMs (${snapshot.durationMs} > ${budget.maxDurationMs}).`,
      );
    }
  }

  if (budget.maxFailedOperations !== undefined) {
    limitsApplied.push("maxFailedOperations");
    if (snapshot.failed > budget.maxFailedOperations) {
      reasons.push(
        `Execution budget exceeded maxFailedOperations (${snapshot.failed} > ${budget.maxFailedOperations}).`,
      );
    }
  }

  if (budget.maxFailureRate !== undefined) {
    limitsApplied.push("maxFailureRate");
    if (exceedsFailureRate(snapshot.failed, snapshot.total, budget.maxFailureRate)) {
      reasons.push(
        `Execution budget exceeded maxFailureRate (${snapshot.failed}/${snapshot.total} > ${budget.maxFailureRate}).`,
      );
    }
  }

  if (!slo.allowPromotion) {
    limitsApplied.push("sloPolicy");
    reasons.push(...slo.violations);
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    limitsApplied,
    slo,
  };
}
