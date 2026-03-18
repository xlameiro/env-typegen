import { migrateAdapterPushResultToV4 } from "./contract-migration-v4.js";
import type { AdapterContext, EnvAdapter, EnvMap } from "./types.js";

export type AdapterContractScenario = {
  context: AdapterContext;
  localValues?: EnvMap;
};

export type AdapterContractResult = {
  hasPull: boolean;
  hasCompare: boolean;
  hasPush: boolean;
  pullValuesAreObject: boolean;
  compareShapeIsValid: boolean;
  pushResultIsValid: boolean;
  metaCapabilitiesAreValid: boolean;
  conformanceV3MetaIsValid: boolean;
  conformanceV4MetaIsValid: boolean;
  migrationToV4IsValid: boolean;
  errors: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCompareShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.missingInRemote)) return false;
  if (!Array.isArray(value.extraInRemote)) return false;
  if (!Array.isArray(value.mismatches)) return false;
  return true;
}

function validatePushShape(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const validOutcomes = new Set(["applied", "partial-failure", "no-change", "blocked"]);
  if (typeof value.outcome !== "string" || !validOutcomes.has(value.outcome)) {
    return false;
  }

  if (!Array.isArray(value.operations)) {
    return false;
  }

  const validStatuses = new Set(["applied", "failed", "skipped"]);
  const validFailureKinds = new Set(["none", "transient", "permanent"]);
  const hasInvalidOperation = value.operations.some((operation) => {
    if (!isRecord(operation)) return true;
    if (typeof operation.key !== "string") return true;
    if (typeof operation.message !== "string") return true;
    if (typeof operation.failureKind !== "string") return true;
    if (!validFailureKinds.has(operation.failureKind)) return true;
    if (!validStatuses.has(operation.status as string)) return true;
    return false;
  });
  if (hasInvalidOperation) {
    return false;
  }

  if (!isRecord(value.summary)) {
    return false;
  }

  if (
    typeof value.summary.applied !== "number" ||
    typeof value.summary.failed !== "number" ||
    typeof value.summary.skipped !== "number" ||
    typeof value.summary.total !== "number"
  ) {
    return false;
  }

  if (value.outcome === "partial-failure") {
    const hasFailedOperation = value.operations.some(
      (operation) => isRecord(operation) && operation.status === "failed",
    );
    if (!hasFailedOperation) {
      return false;
    }
  }

  return true;
}

function validatePushShapeV4(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.contractVersion !== 4) return false;

  const validOutcomes = new Set(["applied", "partial-failure", "no-change", "blocked"]);
  if (typeof value.outcome !== "string" || !validOutcomes.has(value.outcome)) {
    return false;
  }

  if (!Array.isArray(value.operations)) {
    return false;
  }

  const validStatuses = new Set(["applied", "failed", "skipped"]);
  const validFailureKinds = new Set(["none", "transient", "permanent"]);
  const validActions = new Set(["upsert", "delete", "no-op"]);
  const hasInvalidOperation = value.operations.some((operation) => {
    if (!isRecord(operation)) return true;
    if (typeof operation.key !== "string") return true;
    if (typeof operation.message !== "string") return true;
    if (typeof operation.failureKind !== "string") return true;
    if (!validFailureKinds.has(operation.failureKind)) return true;
    if (!validStatuses.has(operation.status as string)) return true;
    if (!validActions.has(operation.action as string)) return true;
    if (typeof operation.attempts !== "number" || operation.attempts < 1) return true;
    return false;
  });
  if (hasInvalidOperation) {
    return false;
  }

  if (!isRecord(value.summary)) {
    return false;
  }

  if (
    typeof value.summary.applied !== "number" ||
    typeof value.summary.failed !== "number" ||
    typeof value.summary.skipped !== "number" ||
    typeof value.summary.total !== "number"
  ) {
    return false;
  }

  return true;
}

async function evaluatePull(
  adapter: EnvAdapter,
  scenario: AdapterContractScenario,
): Promise<{ isValid: boolean; errors: string[]; remoteValues: EnvMap }> {
  const errors: string[] = [];
  let remoteValues: EnvMap = {};

  try {
    const pullResult = await adapter.pull(scenario.context);
    remoteValues = pullResult.values;
    const isValid = isRecord(pullResult.values);
    if (!isValid) {
      errors.push("pull() must return an object in values");
    }
    return { isValid, errors, remoteValues };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`pull() failed: ${message}`);
    return { isValid: false, errors, remoteValues };
  }
}

async function evaluateCompare(
  adapter: EnvAdapter,
  scenario: AdapterContractScenario,
  remoteValues: EnvMap,
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  if (adapter.compare === undefined) {
    return { isValid: false, errors };
  }

  try {
    const compareResult = await adapter.compare(
      scenario.context,
      scenario.localValues ?? {},
      remoteValues,
    );
    const isValid = validateCompareShape(compareResult);
    if (!isValid) {
      errors.push("compare() must return { missingInRemote, extraInRemote, mismatches }");
    }
    return { isValid, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`compare() failed: ${message}`);
    return { isValid: false, errors };
  }
}

async function evaluatePush(
  adapter: EnvAdapter,
  scenario: AdapterContractScenario,
): Promise<{ isValid: boolean; migrationToV4IsValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  if (adapter.push === undefined) {
    return { isValid: false, migrationToV4IsValid: false, errors };
  }

  try {
    const pushResult = await adapter.push(scenario.context, scenario.localValues ?? {});
    const isValidV3 = validatePushShape(pushResult);
    const isValidV4 = validatePushShapeV4(pushResult);
    const isValid = isValidV3 || isValidV4;
    const migrated = migrateAdapterPushResultToV4(pushResult);
    const migrationToV4IsValid = validatePushShapeV4(migrated);
    if (!isValid) {
      errors.push(
        "push() must return operation-level result with outcome, operations, and summary (v3 or v4)",
      );
    }
    if (!migrationToV4IsValid) {
      errors.push("v3->v4 migration must produce a valid v4 operation contract result");
    }
    return { isValid, migrationToV4IsValid, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`push() failed: ${message}`);
    return { isValid: false, migrationToV4IsValid: false, errors };
  }
}

function evaluateMeta(adapter: EnvAdapter): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (adapter.meta === undefined) {
    return { isValid: false, errors };
  }

  try {
    const meta = adapter.meta();
    const capabilities = meta.capabilities;
    const hasValidRedactionFlag = typeof capabilities.redactValuesByDefault === "boolean";
    const hasValidWriteSemantics =
      capabilities.push === false ||
      capabilities.writeSemantics === "best-effort" ||
      capabilities.writeSemantics === "idempotent";

    if (!hasValidRedactionFlag) {
      errors.push("meta().capabilities.redactValuesByDefault must be a boolean");
    }
    if (!hasValidWriteSemantics) {
      errors.push(
        "meta().capabilities.writeSemantics must be 'best-effort' or 'idempotent' when push=true",
      );
    }

    return { isValid: hasValidRedactionFlag && hasValidWriteSemantics, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`meta() failed: ${message}`);
    return { isValid: false, errors };
  }
}

function appendConformanceV3Errors(params: {
  errors: string[];
  capabilities: ReturnType<NonNullable<EnvAdapter["meta"]>>["capabilities"];
}): void {
  const { capabilities, errors } = params;
  if (capabilities.conformanceVersion !== 3) {
    errors.push("meta().capabilities.conformanceVersion must be 3 when push=true");
  }

  const hasReconciliationMode =
    capabilities.reconciliationMode === "deterministic" ||
    capabilities.reconciliationMode === "best-effort";
  if (!hasReconciliationMode) {
    errors.push(
      "meta().capabilities.reconciliationMode must be 'deterministic' or 'best-effort' when push=true",
    );
  }

  const hasIdempotency =
    capabilities.idempotency === "idempotent" || capabilities.idempotency === "non-idempotent";
  if (!hasIdempotency) {
    errors.push(
      "meta().capabilities.idempotency must be 'idempotent' or 'non-idempotent' when push=true",
    );
  }

  if (capabilities.writeSemantics === "idempotent" && capabilities.idempotency !== "idempotent") {
    errors.push(
      "meta().capabilities.idempotency must be 'idempotent' when writeSemantics is 'idempotent'",
    );
  }
}

function evaluateConformanceV3Meta(adapter: EnvAdapter): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (adapter.meta === undefined) {
    return { isValid: false, errors };
  }

  try {
    const meta = adapter.meta();
    const capabilities = meta.capabilities;
    if (!capabilities.push) {
      return { isValid: true, errors };
    }

    appendConformanceV3Errors({ errors, capabilities });
    return { isValid: errors.length === 0, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`meta() failed during v3 conformance validation: ${message}`);
    return { isValid: false, errors };
  }
}

function evaluateConformanceV4Meta(adapter: EnvAdapter): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (adapter.meta === undefined) {
    return { isValid: false, errors };
  }

  try {
    const meta = adapter.meta();
    const capabilities = meta.capabilities;
    if (!capabilities.push) {
      return { isValid: true, errors };
    }

    if (capabilities.conformanceVersion !== 4) {
      errors.push("meta().capabilities.conformanceVersion must be 4 for v4 contract");
    }

    const hasReconciliationMode =
      capabilities.reconciliationMode === "deterministic" ||
      capabilities.reconciliationMode === "best-effort";
    if (!hasReconciliationMode) {
      errors.push(
        "meta().capabilities.reconciliationMode must be 'deterministic' or 'best-effort' when push=true",
      );
    }

    const hasIdempotency =
      capabilities.idempotency === "idempotent" || capabilities.idempotency === "non-idempotent";
    if (!hasIdempotency) {
      errors.push(
        "meta().capabilities.idempotency must be 'idempotent' or 'non-idempotent' when push=true",
      );
    }

    return { isValid: errors.length === 0, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`meta() failed during v4 conformance validation: ${message}`);
    return { isValid: false, errors };
  }
}

export async function evaluateAdapterContract(
  adapter: EnvAdapter,
  scenario: AdapterContractScenario,
): Promise<AdapterContractResult> {
  const pullResult = await evaluatePull(adapter, scenario);
  const compareResult = await evaluateCompare(adapter, scenario, pullResult.remoteValues);
  const pushResult = await evaluatePush(adapter, scenario);
  const metaResult = evaluateMeta(adapter);
  const conformanceResult = evaluateConformanceV3Meta(adapter);
  const conformanceV4Result = evaluateConformanceV4Meta(adapter);

  const errors = [
    ...pullResult.errors,
    ...compareResult.errors,
    ...pushResult.errors,
    ...metaResult.errors,
  ];

  return {
    hasPull: typeof adapter.pull === "function",
    hasCompare: typeof adapter.compare === "function",
    hasPush: typeof adapter.push === "function",
    pullValuesAreObject: pullResult.isValid,
    compareShapeIsValid: compareResult.isValid,
    pushResultIsValid: pushResult.isValid,
    metaCapabilitiesAreValid: metaResult.isValid,
    conformanceV3MetaIsValid: conformanceResult.isValid,
    conformanceV4MetaIsValid: conformanceV4Result.isValid,
    migrationToV4IsValid: pushResult.migrationToV4IsValid,
    errors,
  };
}
