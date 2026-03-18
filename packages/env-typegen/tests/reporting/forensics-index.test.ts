import { describe, expect, it } from "vitest";

import type { AuditEvent } from "../../src/audit/audit-event.js";
import { buildForensicsIndex } from "../../src/reporting/forensics-index.js";

function makeEvents(): AuditEvent[] {
  return [
    {
      timestamp: "2026-03-18T10:00:00.000Z",
      event: "sync-apply.requested",
      level: "info",
      command: "sync-apply",
      provider: "demo",
      environment: "production",
      mode: "apply",
      policyDecision: "allow",
      correlationId: "corr",
      changeSetHash: "hash",
      message: "requested",
    },
    {
      timestamp: "2026-03-18T10:00:01.000Z",
      event: "sync-apply.completed",
      level: "info",
      command: "sync-apply",
      provider: "demo",
      environment: "production",
      mode: "apply",
      policyDecision: "allow",
      correlationId: "corr",
      changeSetHash: "hash",
      message: "completed",
    },
  ];
}

describe("forensics-index", () => {
  it("should build deterministic forensic metadata for the same inputs", () => {
    const first = buildForensicsIndex({
      auditEvents: makeEvents(),
      evidenceBundleId: "bundle-id",
      evidenceBundleHash: "bundle-hash",
      lifecycleHash: "lifecycle-hash",
      signatureId: "signature-id",
      generatedAt: "2026-03-18T11:00:00.000Z",
    });
    const second = buildForensicsIndex({
      auditEvents: makeEvents(),
      evidenceBundleId: "bundle-id",
      evidenceBundleHash: "bundle-hash",
      lifecycleHash: "lifecycle-hash",
      signatureId: "signature-id",
      generatedAt: "2026-03-18T11:00:00.000Z",
    });

    expect(first.indexHash).toBe(second.indexHash);
    expect(first.indexId).toBe(second.indexId);
    expect(first.eventCount).toBe(2);
    expect(first.eventHashes).toHaveLength(2);
  });
});
