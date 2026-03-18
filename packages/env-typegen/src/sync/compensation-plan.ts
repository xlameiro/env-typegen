import type { ApplyOperationResultV2 } from "./apply-engine-v2.js";

export type CompensationAction = "create" | "update" | "delete" | "none";

export type CompensationOperation = {
  key: string;
  status: "compensation-planned" | "compensation-not-required";
  action: CompensationAction;
  reason: string;
};

export type CompensationPlan = {
  version: 1;
  deterministic: true;
  operations: CompensationOperation[];
  summary: {
    planned: number;
    notRequired: number;
    total: number;
  };
};

function toCompensationAction(action: ApplyOperationResultV2["action"]): CompensationAction {
  if (action === "create") return "delete";
  if (action === "delete") return "create";
  if (action === "update") return "update";
  return "none";
}

function toSummary(operations: readonly CompensationOperation[]): CompensationPlan["summary"] {
  const planned = operations.filter(
    (operation) => operation.status === "compensation-planned",
  ).length;
  const notRequired = operations.filter(
    (operation) => operation.status === "compensation-not-required",
  ).length;

  return {
    planned,
    notRequired,
    total: operations.length,
  };
}

export function buildCompensationPlan(params: {
  operations: ApplyOperationResultV2[];
}): CompensationPlan {
  const hasFailures = params.operations.some((operation) => operation.status === "failed");

  const operations = [...params.operations]
    .slice()
    .reverse()
    .map((operation): CompensationOperation => {
      if (hasFailures && operation.status === "applied" && operation.action !== "no-op") {
        return {
          key: operation.key,
          status: "compensation-planned",
          action: toCompensationAction(operation.action),
          reason: "Compensation is planned because later operations failed.",
        };
      }

      return {
        key: operation.key,
        status: "compensation-not-required",
        action: "none",
        reason: "No compensation required for this operation.",
      };
    });

  return {
    version: 1,
    deterministic: true,
    operations,
    summary: toSummary(operations),
  };
}
