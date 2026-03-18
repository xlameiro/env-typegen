import { describe, expect, it } from "vitest";

import {
  createPreflightAttestation,
  validatePreflightAttestation,
} from "../../src/trust/preflight-attestation.js";

describe("preflight attestation", () => {
  it("should create a valid attestation and validate it", () => {
    const attestation = createPreflightAttestation({
      command: "sync-preview",
      provider: "demo",
      environment: "production",
      changeSetHash: "hash-123",
      policyDecision: "allow",
      correlationId: "corr-123",
      now: new Date("2026-03-18T10:00:00.000Z"),
      ttlSeconds: 60,
    });

    const validation = validatePreflightAttestation({
      attestation,
      provider: "demo",
      environment: "production",
      changeSetHash: "hash-123",
      expectedCorrelationId: "corr-123",
      usedAttestationIds: new Set<string>(),
      now: new Date("2026-03-18T10:00:30.000Z"),
    });

    expect(validation.isValid).toBe(true);
    expect(validation.reasons).toEqual([]);
  });

  it("should reject stale and context-mismatched attestations", () => {
    const attestation = createPreflightAttestation({
      command: "plan",
      provider: "demo",
      environment: "preview",
      changeSetHash: "hash-123",
      policyDecision: "warn",
      correlationId: "corr-123",
      now: new Date("2026-03-18T10:00:00.000Z"),
      ttlSeconds: 10,
    });

    const validation = validatePreflightAttestation({
      attestation,
      provider: "demo",
      environment: "production",
      changeSetHash: "hash-999",
      expectedCorrelationId: "corr-999",
      now: new Date("2026-03-18T10:01:00.000Z"),
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("environment");
    expect(validation.reasons.join(" ")).toContain("change-set hash");
    expect(validation.reasons.join(" ")).toContain("correlationId");
    expect(validation.reasons.join(" ")).toContain("expired");
  });

  it("should reject replayed attestation ids in the same process lifecycle", () => {
    const attestation = createPreflightAttestation({
      command: "sync-preview",
      provider: "demo",
      environment: "development",
      changeSetHash: "hash-123",
      policyDecision: "allow",
      correlationId: "corr-123",
    });

    const usedAttestationIds = new Set<string>([attestation.attestationId]);
    const validation = validatePreflightAttestation({
      attestation,
      provider: "demo",
      environment: "development",
      changeSetHash: "hash-123",
      expectedCorrelationId: "corr-123",
      usedAttestationIds,
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("replay");
  });
});
