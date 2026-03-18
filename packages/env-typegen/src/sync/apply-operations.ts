import type { AdapterContext, EnvAdapter, EnvMap } from "../adapters/types.js";
import type { ApplyOperationResultV2 } from "./apply-engine-v2.js";
import type { ChangeSetOperation } from "./change-set.js";
import { runWithRetry, type RetryPolicy } from "./retry-policy.js";

function toOperationPayload(params: {
  operation: ChangeSetOperation;
  localValues: EnvMap;
}): EnvMap {
  if (params.operation.action === "delete") {
    return {
      [params.operation.key]: undefined,
    };
  }

  return {
    [params.operation.key]: params.localValues[params.operation.key],
  };
}

export async function executeApplyOperations(params: {
  operations: ChangeSetOperation[];
  adapter: EnvAdapter;
  adapterContext: AdapterContext;
  localValues: EnvMap;
  retryPolicy?: Partial<RetryPolicy>;
}): Promise<ApplyOperationResultV2[]> {
  const results: ApplyOperationResultV2[] = [];

  for (const operation of params.operations) {
    if (operation.action === "no-op") {
      results.push({
        key: operation.key,
        action: operation.action,
        status: "skipped",
        failureKind: "none",
        message: "No-op operation; remote value already aligned.",
      });
      continue;
    }

    if (typeof params.adapter.push !== "function") {
      results.push({
        key: operation.key,
        action: operation.action,
        status: "failed",
        failureKind: "permanent",
        message: "Adapter does not implement push() for write-enabled sync.",
      });
      continue;
    }

    const payload = toOperationPayload({ operation, localValues: params.localValues });
    const retryResult = await runWithRetry({
      policy: params.retryPolicy,
      task: async () => params.adapter.push?.(params.adapterContext, payload),
    });

    if (retryResult.status === "fulfilled") {
      results.push({
        key: operation.key,
        action: operation.action,
        status: "applied",
        failureKind: "none",
        message: `Operation applied after ${retryResult.attempts} attempt(s).`,
      });
      continue;
    }

    results.push({
      key: operation.key,
      action: operation.action,
      status: "failed",
      failureKind: retryResult.failureKind,
      message: `Provider apply failed after ${retryResult.attempts} attempt(s). ${retryResult.errorMessage}`,
    });
  }

  return results;
}
