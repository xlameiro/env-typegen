import type { IncidentState } from "./incident-state.js";
import type { SloEvaluation } from "./slo-policy.js";

export type PromotionStage = "advisory" | "enforce" | "apply";

export type OrchestrationStrategy = "fail-fast" | "fail-late";

export type OrchestrationTask<result> = {
  target: string;
  stage: PromotionStage;
  run: () => Promise<result>;
};

export type OrchestrationTaskResult<result> =
  | {
      target: string;
      stage: PromotionStage;
      status: "fulfilled";
      value: result;
    }
  | {
      target: string;
      stage: PromotionStage;
      status: "rejected";
      errorMessage: string;
    }
  | {
      target: string;
      stage: PromotionStage;
      status: "skipped";
      reason: string;
    };

export type OrchestrationSummary = {
  total: number;
  fulfilled: number;
  rejected: number;
  skipped: number;
  maxConcurrency: number;
  effectiveConcurrency: number;
  strategy: OrchestrationStrategy;
  aborted: boolean;
  sloStatus: "healthy" | "degraded" | "breach";
  incidentStatus: "normal" | "degraded" | "incident";
  throttleFactor: number;
};

export type OrchestrationResult<result> = {
  results: OrchestrationTaskResult<result>[];
  summary: OrchestrationSummary;
};

function normalizeConcurrency(maxConcurrency: number): number {
  if (!Number.isFinite(maxConcurrency)) {
    return 1;
  }

  const rounded = Math.floor(maxConcurrency);
  return rounded > 0 ? rounded : 1;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildSummary<result>(params: {
  results: OrchestrationTaskResult<result>[];
  maxConcurrency: number;
  effectiveConcurrency: number;
  strategy: OrchestrationStrategy;
  aborted: boolean;
  sloStatus: "healthy" | "degraded" | "breach";
  incidentStatus: "normal" | "degraded" | "incident";
  throttleFactor: number;
}): OrchestrationSummary {
  const fulfilled = params.results.filter((result) => result.status === "fulfilled").length;
  const rejected = params.results.filter((result) => result.status === "rejected").length;
  const skipped = params.results.filter((result) => result.status === "skipped").length;

  return {
    total: params.results.length,
    fulfilled,
    rejected,
    skipped,
    maxConcurrency: params.maxConcurrency,
    effectiveConcurrency: params.effectiveConcurrency,
    strategy: params.strategy,
    aborted: params.aborted,
    sloStatus: params.sloStatus,
    incidentStatus: params.incidentStatus,
    throttleFactor: params.throttleFactor,
  };
}

function resolveThrottleFactor(params: {
  sloEvaluation?: SloEvaluation;
  incidentState?: IncidentState;
}): number {
  const sloFactor = params.sloEvaluation?.throttleFactor ?? 1;
  const incidentFactor = params.incidentState?.throttleFactor ?? 1;
  const combined = Math.min(sloFactor, incidentFactor);

  if (!Number.isFinite(combined)) {
    return 1;
  }

  if (combined <= 0) {
    return 0.1;
  }

  if (combined > 1) {
    return 1;
  }

  return combined;
}

export async function runBoundedOrchestration<result>(params: {
  tasks: OrchestrationTask<result>[];
  maxConcurrency: number;
  strategy: OrchestrationStrategy;
  sloEvaluation?: SloEvaluation;
  incidentState?: IncidentState;
}): Promise<OrchestrationResult<result>> {
  const maxConcurrency = normalizeConcurrency(params.maxConcurrency);
  const throttleFactor = resolveThrottleFactor({
    ...(params.sloEvaluation === undefined ? {} : { sloEvaluation: params.sloEvaluation }),
    ...(params.incidentState === undefined ? {} : { incidentState: params.incidentState }),
  });
  const effectiveConcurrency = normalizeConcurrency(
    Math.max(1, Math.floor(maxConcurrency * throttleFactor)),
  );
  const results: OrchestrationTaskResult<result>[] = Array.from(
    { length: params.tasks.length },
    () => ({ target: "", stage: "advisory", status: "skipped", reason: "pending" }),
  );

  let nextIndex = 0;
  let aborted = false;

  async function runWorker(): Promise<void> {
    while (nextIndex < params.tasks.length) {
      const index = nextIndex;
      nextIndex += 1;
      const task = params.tasks[index];
      if (task === undefined) {
        return;
      }

      if (aborted && params.strategy === "fail-fast") {
        results[index] = {
          target: task.target,
          stage: task.stage,
          status: "skipped",
          reason: "Skipped because a previous stage failed under fail-fast strategy.",
        };
        continue;
      }

      try {
        const value = await task.run();
        results[index] = {
          target: task.target,
          stage: task.stage,
          status: "fulfilled",
          value,
        };
      } catch (error) {
        results[index] = {
          target: task.target,
          stage: task.stage,
          status: "rejected",
          errorMessage: toErrorMessage(error),
        };

        if (params.strategy === "fail-fast") {
          aborted = true;
        }
      }
    }
  }

  const workerCount = Math.min(effectiveConcurrency, Math.max(1, params.tasks.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return {
    results,
    summary: buildSummary({
      results,
      maxConcurrency,
      effectiveConcurrency,
      strategy: params.strategy,
      aborted,
      sloStatus: params.sloEvaluation?.status ?? "healthy",
      incidentStatus: params.incidentState?.status ?? "normal",
      throttleFactor,
    }),
  };
}
