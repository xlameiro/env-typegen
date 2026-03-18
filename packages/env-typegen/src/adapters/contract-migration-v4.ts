import type {
  AdapterPushOperationResult,
  AdapterPushOperationResultV4,
  AdapterPushResult,
  AdapterPushResultAny,
  AdapterPushResultV4,
} from "./types.js";

function toV4Operation(operation: AdapterPushOperationResult): AdapterPushOperationResultV4 {
  return {
    key: operation.key,
    action: operation.status === "skipped" ? "no-op" : "upsert",
    status: operation.status,
    message: operation.message,
    failureKind: operation.failureKind,
    attempts: 1,
  };
}

export function isAdapterPushResultV4(result: AdapterPushResultAny): result is AdapterPushResultV4 {
  return (
    typeof result === "object" &&
    result !== null &&
    "contractVersion" in result &&
    result.contractVersion === 4
  );
}

export function migrateAdapterPushResultToV4(result: AdapterPushResultAny): AdapterPushResultV4 {
  if (isAdapterPushResultV4(result)) {
    return result;
  }

  const legacyResult: AdapterPushResult = result;
  return {
    contractVersion: 4,
    outcome: legacyResult.outcome,
    operations: legacyResult.operations.map(toV4Operation),
    summary: legacyResult.summary,
  };
}
