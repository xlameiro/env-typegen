import { createHash } from "node:crypto";

import type { AuditEvent } from "../audit/audit-event.js";
import { signEvidenceHash, type EvidenceSignature } from "./evidence-signature.js";
import { buildForensicsIndex, type ForensicsIndex } from "./forensics-index.js";
import type { GovernanceSummary } from "./governance-summary.js";

type EvidenceSerializable =
  | null
  | string
  | number
  | boolean
  | EvidenceSerializable[]
  | { [key: string]: EvidenceSerializable };

export type EvidenceBundle = {
  schemaVersion: 1;
  bundleId: string;
  command: "sync-apply";
  provider: string;
  environment: string;
  mode: "dry-run" | "apply";
  correlationId: string;
  changeSetHash: string;
  generatedAt: string;
  governanceSummary: GovernanceSummary;
  audit: {
    eventCount: number;
    eventTypes: string[];
    lifecycleHash: string;
  };
  apply?: {
    summary: {
      planned: number;
      applied: number;
      failed: number;
      skipped: number;
      total: number;
      mode: "dry-run" | "apply";
    };
    budget: {
      allowed: boolean;
      reasons: string[];
      limitsApplied: string[];
      durationMs: number;
    };
    reconciliation: {
      planned: number;
      applied: number;
      failed: number;
      skipped: number;
      total: number;
    };
    compensation: {
      planned: number;
      notRequired: number;
      total: number;
    };
    rollbackSimulation: {
      canRollback: boolean;
      rollbackPlanned: number;
      rollbackBlocked: number;
      noRollback: number;
      total: number;
    };
  };
  signature: EvidenceSignature;
  forensicsIndex: ForensicsIndex;
  bundleHash: string;
};

function toCanonicalValue(value: EvidenceSerializable): EvidenceSerializable {
  if (Array.isArray(value)) {
    return value.map((entry) => toCanonicalValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, nested]) => [key, toCanonicalValue(nested)]));
  }

  return value;
}

function hashObject(value: EvidenceSerializable): string {
  const canonical = toCanonicalValue(value);
  const serialized = JSON.stringify(canonical);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

function toLifecycleHash(auditEvents: AuditEvent[]): string {
  const lifecycleView = auditEvents.map((event) => ({
    event: event.event,
    level: event.level,
    correlationId: event.correlationId ?? null,
    changeSetHash: event.changeSetHash ?? null,
  }));

  return hashObject(lifecycleView);
}

function toDeterministicBundleView(params: {
  bundleBase: Omit<EvidenceBundle, "bundleHash">;
}): EvidenceSerializable {
  const normalizedGovernanceSummary = {
    ...params.bundleBase.governanceSummary,
    generatedAt: "<normalized>",
  };

  const normalizedApply =
    params.bundleBase.apply === undefined
      ? undefined
      : {
          ...params.bundleBase.apply,
          budget: {
            ...params.bundleBase.apply.budget,
            durationMs: 0,
          },
        };

  return {
    ...params.bundleBase,
    generatedAt: "<normalized>",
    governanceSummary: normalizedGovernanceSummary,
    ...(normalizedApply === undefined ? {} : { apply: normalizedApply }),
  };
}

export function buildEvidenceBundle(params: {
  provider: string;
  environment: string;
  mode: "dry-run" | "apply";
  correlationId: string;
  changeSetHash: string;
  governanceSummary: GovernanceSummary;
  auditEvents: AuditEvent[];
  apply?: {
    summary: {
      planned: number;
      applied: number;
      failed: number;
      skipped: number;
      total: number;
      mode: "dry-run" | "apply";
    };
    budget: {
      allowed: boolean;
      reasons: string[];
      limitsApplied: string[];
      durationMs: number;
    };
    reconciliation: {
      planned: number;
      applied: number;
      failed: number;
      skipped: number;
      total: number;
    };
    compensation: {
      planned: number;
      notRequired: number;
      total: number;
    };
    rollbackSimulation: {
      canRollback: boolean;
      rollbackPlanned: number;
      rollbackBlocked: number;
      noRollback: number;
      total: number;
    };
  };
}): EvidenceBundle {
  const bundleId = `${params.correlationId}:evidence:v1`;
  const generatedAt = new Date().toISOString();

  const bundleBase = {
    schemaVersion: 1 as const,
    bundleId,
    command: "sync-apply" as const,
    provider: params.provider,
    environment: params.environment,
    mode: params.mode,
    correlationId: params.correlationId,
    changeSetHash: params.changeSetHash,
    generatedAt,
    governanceSummary: params.governanceSummary,
    audit: {
      eventCount: params.auditEvents.length,
      eventTypes: params.auditEvents.map((event) => event.event),
      lifecycleHash: toLifecycleHash(params.auditEvents),
    },
    ...(params.apply === undefined ? {} : { apply: params.apply }),
  };

  const bundleHash = hashObject(
    toDeterministicBundleView({
      bundleBase: bundleBase as Omit<EvidenceBundle, "bundleHash">,
    }),
  );

  const signature = signEvidenceHash({
    bundleHash,
    lifecycleHash: bundleBase.audit.lifecycleHash,
  });
  const forensicsIndex = buildForensicsIndex({
    auditEvents: params.auditEvents,
    evidenceBundleId: bundleBase.bundleId,
    evidenceBundleHash: bundleHash,
    lifecycleHash: bundleBase.audit.lifecycleHash,
    signatureId: signature.signatureId,
  });

  return {
    ...bundleBase,
    signature,
    forensicsIndex,
    bundleHash,
  };
}
