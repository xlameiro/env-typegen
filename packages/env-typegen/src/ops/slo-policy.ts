export type SloStatus = "healthy" | "degraded" | "breach";

export type SloPolicy = {
  maxFailureRate?: number;
  maxDurationMs?: number;
  minSuccessRate?: number;
  degradeOnAnyFailure?: boolean;
  throttleMultiplierOnDegrade?: number;
  blockPromotionOnBreach?: boolean;
};

export type SloSnapshot = {
  planned: number;
  applied: number;
  failed: number;
  skipped: number;
  total: number;
  durationMs: number;
};

export type SloEvaluation = {
  status: SloStatus;
  violations: string[];
  throttleFactor: number;
  allowPromotion: boolean;
  metrics: {
    total: number;
    durationMs: number;
    failureRate: number;
    successRate: number;
  };
};

export type SloGateAction = "advance" | "freeze" | "rollback";

function normalizeRate(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeThrottleMultiplier(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0.5;
  }

  if (value <= 0) {
    return 0.1;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function computeRates(snapshot: SloSnapshot): { failureRate: number; successRate: number } {
  if (snapshot.total === 0) {
    return {
      failureRate: 0,
      successRate: 1,
    };
  }

  return {
    failureRate: snapshot.failed / snapshot.total,
    successRate: snapshot.applied / snapshot.total,
  };
}

export function evaluateSloPolicy(params: {
  policy: SloPolicy | undefined;
  snapshot: SloSnapshot;
}): SloEvaluation {
  const rates = computeRates(params.snapshot);

  if (params.policy === undefined) {
    return {
      status: "healthy",
      violations: [],
      throttleFactor: 1,
      allowPromotion: true,
      metrics: {
        total: params.snapshot.total,
        durationMs: params.snapshot.durationMs,
        failureRate: rates.failureRate,
        successRate: rates.successRate,
      },
    };
  }

  const violations: string[] = [];
  const maxFailureRate = normalizeRate(params.policy.maxFailureRate);
  const minSuccessRate = normalizeRate(params.policy.minSuccessRate);

  if (maxFailureRate !== undefined && rates.failureRate > maxFailureRate) {
    violations.push(
      `SLO maxFailureRate breached (${rates.failureRate.toFixed(3)} > ${maxFailureRate}).`,
    );
  }

  if (
    params.policy.maxDurationMs !== undefined &&
    Number.isFinite(params.policy.maxDurationMs) &&
    params.snapshot.durationMs > params.policy.maxDurationMs
  ) {
    violations.push(
      `SLO maxDurationMs breached (${params.snapshot.durationMs} > ${params.policy.maxDurationMs}).`,
    );
  }

  if (minSuccessRate !== undefined && rates.successRate < minSuccessRate) {
    violations.push(
      `SLO minSuccessRate breached (${rates.successRate.toFixed(3)} < ${minSuccessRate}).`,
    );
  }

  const hasSoftDegradeSignal =
    params.policy.degradeOnAnyFailure === true && params.snapshot.failed > 0;
  let status: SloStatus = "healthy";
  if (violations.length > 0) {
    status = "breach";
  } else if (hasSoftDegradeSignal) {
    status = "degraded";
  }

  const degradeMultiplier = normalizeThrottleMultiplier(params.policy.throttleMultiplierOnDegrade);
  let throttleFactor = 1;
  if (status === "degraded") {
    throttleFactor = degradeMultiplier;
  } else if (status === "breach") {
    throttleFactor = 0.25;
  }

  return {
    status,
    violations,
    throttleFactor,
    allowPromotion: !(status === "breach" && params.policy.blockPromotionOnBreach !== false),
    metrics: {
      total: params.snapshot.total,
      durationMs: params.snapshot.durationMs,
      failureRate: rates.failureRate,
      successRate: rates.successRate,
    },
  };
}

export function resolveSloGateAction(
  evaluation: Pick<SloEvaluation, "status" | "allowPromotion"> | undefined,
): SloGateAction {
  if (evaluation === undefined) {
    return "advance";
  }

  if (evaluation.status === "breach" || evaluation.allowPromotion === false) {
    return "rollback";
  }

  if (evaluation.status === "degraded") {
    return "freeze";
  }

  return "advance";
}
