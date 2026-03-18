import type { SloEvaluation } from "./slo-policy.js";

export type IncidentStatus = "normal" | "degraded" | "incident";

export type IncidentState = {
  status: IncidentStatus;
  reason: string;
  since: string;
  consecutiveBreaches: number;
  throttleFactor: number;
};

function clampThrottleFactor(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  if (value <= 0) {
    return 0.1;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function toTimestamp(value: string | undefined): string {
  if (value !== undefined) {
    return value;
  }

  return new Date().toISOString();
}

export function deriveIncidentState(params: {
  previousState?: IncidentState;
  sloEvaluation: SloEvaluation;
  observedAt?: string;
}): IncidentState {
  const observedAt = toTimestamp(params.observedAt);

  if (params.sloEvaluation.status === "breach") {
    return {
      status: "incident",
      reason:
        params.sloEvaluation.violations[0] ?? "SLO breach detected during governance execution.",
      since: params.previousState?.status === "incident" ? params.previousState.since : observedAt,
      consecutiveBreaches: (params.previousState?.consecutiveBreaches ?? 0) + 1,
      throttleFactor: clampThrottleFactor(
        Math.min(params.sloEvaluation.throttleFactor, params.previousState?.throttleFactor ?? 0.25),
      ),
    };
  }

  if (params.sloEvaluation.status === "degraded") {
    return {
      status: "degraded",
      reason:
        params.sloEvaluation.violations[0] ??
        "SLO soft-degradation signal detected; applying conservative throttling.",
      since: params.previousState?.status === "degraded" ? params.previousState.since : observedAt,
      consecutiveBreaches: 0,
      throttleFactor: clampThrottleFactor(params.sloEvaluation.throttleFactor),
    };
  }

  return {
    status: "normal",
    reason: "SLO signals are healthy.",
    since: observedAt,
    consecutiveBreaches: 0,
    throttleFactor: 1,
  };
}
