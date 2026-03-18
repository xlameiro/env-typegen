import type { OrchestrationSummary, PromotionStage } from "../ops/concurrency-orchestrator.js";
import { resolveSloGateAction, type SloEvaluation, type SloGateAction } from "../ops/slo-policy.js";

import {
  getNextFleetRolloutCohort,
  resolveFleetRolloutCohortForStage,
  type FleetRolloutCohortName,
} from "./rollout-cohorts.js";

export type FleetRolloutAction = "advance" | "freeze" | "rollback";

export type FleetRolloutDecision = {
  stage: PromotionStage;
  cohort: FleetRolloutCohortName;
  nextCohort: FleetRolloutCohortName | null;
  action: FleetRolloutAction;
  reason: string;
  trace: string[];
  sloGate: SloGateAction;
  canProceed: boolean;
};

function mapSloGateToRolloutAction(gate: SloGateAction): FleetRolloutAction {
  if (gate === "rollback") {
    return "rollback";
  }

  if (gate === "freeze") {
    return "freeze";
  }

  return "advance";
}

function buildTrace(params: {
  stage: PromotionStage;
  cohort: FleetRolloutCohortName;
  nextCohort: FleetRolloutCohortName | null;
  action: FleetRolloutAction;
  gate: SloGateAction;
  strategy: "fail-fast" | "fail-late";
}): string[] {
  const trace = [
    `stage=${params.stage}`,
    `cohort=${params.cohort}`,
    `strategy=${params.strategy}`,
    `sloGate=${params.gate}`,
    `action=${params.action}`,
  ];

  if (params.nextCohort !== null) {
    trace.push(`nextCohort=${params.nextCohort}`);
  }

  return trace;
}

export function evaluateFleetRollout(params: {
  stage: PromotionStage;
  strategy: "fail-fast" | "fail-late";
  orchestration: Pick<OrchestrationSummary, "aborted" | "rejected">;
  sloEvaluation?: Pick<SloEvaluation, "status" | "allowPromotion">;
}): FleetRolloutDecision {
  const cohort = resolveFleetRolloutCohortForStage(params.stage);
  const gate = resolveSloGateAction(params.sloEvaluation);

  let action = mapSloGateToRolloutAction(gate);
  let reason = "Rollout cohort can progress to the next stage.";

  if (params.orchestration.aborted || params.orchestration.rejected > 0) {
    action = params.stage === "advisory" ? "freeze" : "rollback";
    reason =
      params.strategy === "fail-fast"
        ? "Rollout halted because fail-fast orchestration aborted after a rejected target."
        : "Rollout halted because one or more targets were rejected.";
  } else if (gate === "freeze") {
    reason = "Rollout frozen because SLO gates are degraded.";
  } else if (gate === "rollback") {
    reason = "Rollout rollback required because SLO gates breached policy thresholds.";
  }

  const nextCohort = action === "advance" ? getNextFleetRolloutCohort(cohort.name) : cohort.name;
  const trace = buildTrace({
    stage: params.stage,
    cohort: cohort.name,
    nextCohort,
    action,
    gate,
    strategy: params.strategy,
  });

  return {
    stage: params.stage,
    cohort: cohort.name,
    nextCohort,
    action,
    reason,
    trace,
    sloGate: gate,
    canProceed: action === "advance",
  };
}
