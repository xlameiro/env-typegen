import { createHash } from "node:crypto";

import type { AuditEvent } from "../audit/audit-event.js";

export type ForensicsIndex = {
  version: 1;
  indexId: string;
  indexHash: string;
  eventCount: number;
  eventHashes: string[];
  evidenceBundleId: string;
  evidenceBundleHash: string;
  lifecycleHash: string;
  signatureId: string;
  generatedAt: string;
};

function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hashEvent(event: AuditEvent): string {
  return hashText(
    JSON.stringify({
      timestamp: event.timestamp,
      event: event.event,
      level: event.level,
      correlationId: event.correlationId ?? null,
      changeSetHash: event.changeSetHash ?? null,
      policyDecision: event.policyDecision,
      message: event.message,
    }),
  );
}

export function buildForensicsIndex(params: {
  auditEvents: AuditEvent[];
  evidenceBundleId: string;
  evidenceBundleHash: string;
  lifecycleHash: string;
  signatureId: string;
  generatedAt?: string;
}): ForensicsIndex {
  const eventHashes = params.auditEvents.map(hashEvent);
  const joined = eventHashes.join(":");
  const indexHash = hashText(
    `${params.evidenceBundleHash}:${params.lifecycleHash}:${params.signatureId}:${joined}`,
  );

  return {
    version: 1,
    indexId: hashText(`${params.evidenceBundleId}:${indexHash}`).slice(0, 24),
    indexHash,
    eventCount: params.auditEvents.length,
    eventHashes,
    evidenceBundleId: params.evidenceBundleId,
    evidenceBundleHash: params.evidenceBundleHash,
    lifecycleHash: params.lifecycleHash,
    signatureId: params.signatureId,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
  };
}
