import type { AdapterContext, EnvAdapter, EnvMap } from "../adapters/types.js";
import { runApplyEngineV2 } from "./apply-engine-v2.js";
import type { ChangeSet, ChangeSetOperation } from "./change-set.js";

export type ApplyMode = "dry-run" | "apply";

export type ApplyOperationStatus = "planned" | "applied" | "failed" | "skipped";

export type ApplyOperationResult = {
  key: string;
  action: ChangeSetOperation["action"];
  status: ApplyOperationStatus;
  message: string;
};

export type ApplySummary = {
  mode: ApplyMode;
  applied: number;
  failed: number;
  skipped: number;
  total: number;
  atomic: false;
};

export type ApplyExecutionResult = {
  summary: ApplySummary;
  operations: ApplyOperationResult[];
};

export async function runApplyEngine(params: {
  adapter: EnvAdapter;
  adapterContext: AdapterContext;
  localValues: EnvMap;
  changeSet: ChangeSet;
  mode: ApplyMode;
}): Promise<ApplyExecutionResult> {
  const v2Result = await runApplyEngineV2(params);

  return {
    summary: {
      mode: v2Result.summary.mode,
      applied: v2Result.summary.applied,
      failed: v2Result.summary.failed,
      skipped: v2Result.summary.skipped,
      total: v2Result.summary.total,
      atomic: false,
    },
    operations: v2Result.operations.map(
      (operation): ApplyOperationResult => ({
        key: operation.key,
        action: operation.action,
        status: operation.status,
        message: operation.message,
      }),
    ),
  };
}
