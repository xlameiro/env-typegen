import type { ApplyFailureKind } from "./apply-engine-v2.js";

export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export type RetryExecutionResult<result> =
  | {
      status: "fulfilled";
      value: result;
      attempts: number;
    }
  | {
      status: "rejected";
      failureKind: ApplyFailureKind;
      errorMessage: string;
      attempts: number;
    };

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 25,
  maxDelayMs: 500,
};

export function classifyRetryFailure(error: unknown): ApplyFailureKind {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage.toLowerCase();

  const transientPattern =
    /timeout|timed out|rate limit|429|\b5\d\d\b|network|temporar|econnreset|eai_again/u;
  return transientPattern.test(message) ? "transient" : "permanent";
}

export function shouldRetry(params: {
  failureKind: ApplyFailureKind;
  attempt: number;
  maxAttempts: number;
}): boolean {
  if (params.failureKind !== "transient") {
    return false;
  }

  return params.attempt < params.maxAttempts;
}

export function calculateRetryDelayMs(params: {
  attempt: number;
  baseDelayMs: number;
  maxDelayMs: number;
}): number {
  const exponentialDelay = params.baseDelayMs * 2 ** (params.attempt - 1);
  return Math.min(params.maxDelayMs, Math.max(0, exponentialDelay));
}

async function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function runWithRetry<result>(params: {
  task: () => Promise<result>;
  policy?: Partial<RetryPolicy>;
}): Promise<RetryExecutionResult<result>> {
  const policy: RetryPolicy = {
    maxAttempts: params.policy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
    baseDelayMs: params.policy?.baseDelayMs ?? DEFAULT_RETRY_POLICY.baseDelayMs,
    maxDelayMs: params.policy?.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs,
  };

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      const value = await params.task();
      return {
        status: "fulfilled",
        value,
        attempts: attempt,
      };
    } catch (error) {
      const failureKind = classifyRetryFailure(error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (!shouldRetry({ failureKind, attempt, maxAttempts: policy.maxAttempts })) {
        return {
          status: "rejected",
          failureKind,
          errorMessage,
          attempts: attempt,
        };
      }

      await wait(
        calculateRetryDelayMs({
          attempt,
          baseDelayMs: policy.baseDelayMs,
          maxDelayMs: policy.maxDelayMs,
        }),
      );
    }
  }

  return {
    status: "rejected",
    failureKind: "permanent",
    errorMessage: "Retry policy exhausted before execution could complete.",
    attempts: policy.maxAttempts,
  };
}
