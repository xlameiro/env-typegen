import type { FleetRolloutDecision } from "../fleet/rollout-controller.js";
import type { ApplyMode } from "../sync/apply-engine.js";

export type GovernancePromotionStage = "advisory" | "enforce" | "apply";

export type GovernanceSummary = {
  stage: GovernancePromotionStage;
  provider: string;
  environment: string;
  mode: ApplyMode;
  policyDecision: "allow" | "warn" | "block";
  guardAllowed: boolean;
  hasFailures: boolean;
  totals: {
    planned: number;
    applied: number;
    failed: number;
    skipped: number;
    total: number;
  };
  auditEvents: number;
  outcome: "pass" | "fail";
  operationalReadiness?: {
    sloStatus: "healthy" | "degraded" | "breach";
    incidentStatus: "normal" | "degraded" | "incident";
    throttleFactor: number;
    allowPromotion: boolean;
  };
  rollout?: Pick<
    FleetRolloutDecision,
    "cohort" | "nextCohort" | "action" | "reason" | "trace" | "sloGate" | "canProceed"
  >;
  evidence?: {
    schemaVersion: 1;
    bundleId: string;
    bundleHash: string;
    lifecycleHash: string;
  };
  generatedAt: string;
};

function resolveStage(params: {
  mode: ApplyMode;
  guardAllowed: boolean;
  policyDecision: "allow" | "warn" | "block";
}): GovernancePromotionStage {
  if (params.mode === "apply" && params.guardAllowed && params.policyDecision === "allow") {
    return "apply";
  }

  if (params.guardAllowed && params.policyDecision !== "block") {
    return "enforce";
  }

  return "advisory";
}

export function buildGovernanceSummary(params: {
  provider: string;
  environment: string;
  mode: ApplyMode;
  policyDecision: "allow" | "warn" | "block";
  guardAllowed: boolean;
  auditEvents: number;
  applySummary?: {
    planned: number;
    applied: number;
    failed: number;
    skipped: number;
    total: number;
  };
  operationalReadiness?: {
    sloStatus: "healthy" | "degraded" | "breach";
    incidentStatus: "normal" | "degraded" | "incident";
    throttleFactor: number;
    allowPromotion: boolean;
  };
  rollout?: Pick<
    FleetRolloutDecision,
    "cohort" | "nextCohort" | "action" | "reason" | "trace" | "sloGate" | "canProceed"
  >;
  evidence?: {
    schemaVersion: 1;
    bundleId: string;
    bundleHash: string;
    lifecycleHash: string;
  };
}): GovernanceSummary {
  const totals = params.applySummary ?? {
    planned: 0,
    applied: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  const hasFailures = !params.guardAllowed || totals.failed > 0;

  return {
    stage: resolveStage({
      mode: params.mode,
      guardAllowed: params.guardAllowed,
      policyDecision: params.policyDecision,
    }),
    provider: params.provider,
    environment: params.environment,
    mode: params.mode,
    policyDecision: params.policyDecision,
    guardAllowed: params.guardAllowed,
    hasFailures,
    totals,
    auditEvents: params.auditEvents,
    outcome: hasFailures ? "fail" : "pass",
    ...(params.operationalReadiness === undefined
      ? {}
      : { operationalReadiness: params.operationalReadiness }),
    ...(params.rollout === undefined ? {} : { rollout: params.rollout }),
    ...(params.evidence === undefined ? {} : { evidence: params.evidence }),
    generatedAt: new Date().toISOString(),
  };
}
