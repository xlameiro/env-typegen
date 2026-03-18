import { describe, expect, it } from "vitest";

import { createPreflightProof, validatePreflightProof } from "../../src/sync/preflight-proof.js";

describe("preflight proof", () => {
  it("should create a valid proof and validate it", () => {
    const proof = createPreflightProof({
      command: "sync-preview",
      provider: "aws-ssm",
      environment: "production",
      changeSetHash: "abc123",
      policyDecision: "warn",
      now: new Date("2026-03-18T10:00:00.000Z"),
      ttlSeconds: 60,
    });

    const validation = validatePreflightProof({
      proof,
      provider: "aws-ssm",
      environment: "production",
      changeSetHash: "abc123",
      now: new Date("2026-03-18T10:00:30.000Z"),
    });

    expect(validation.isValid).toBe(true);
    expect(validation.reasons).toEqual([]);
  });

  it("should fail validation when hash or context does not match", () => {
    const proof = createPreflightProof({
      command: "sync-preview",
      provider: "aws-ssm",
      environment: "production",
      changeSetHash: "abc123",
      policyDecision: "warn",
      now: new Date("2026-03-18T10:00:00.000Z"),
      ttlSeconds: 600,
    });

    const validation = validatePreflightProof({
      proof,
      provider: "aws-secrets-manager",
      environment: "production",
      changeSetHash: "zzz",
      now: new Date("2026-03-18T10:05:00.000Z"),
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("provider");
    expect(validation.reasons.join(" ")).toContain("change-set hash");
  });

  it("should fail validation when proof is expired", () => {
    const proof = createPreflightProof({
      command: "plan",
      provider: "local-validation",
      environment: "default",
      changeSetHash: "abc123",
      policyDecision: "allow",
      now: new Date("2026-03-18T10:00:00.000Z"),
      ttlSeconds: 30,
    });

    const validation = validatePreflightProof({
      proof,
      provider: "local-validation",
      environment: "default",
      changeSetHash: "abc123",
      now: new Date("2026-03-18T10:01:00.000Z"),
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons).toContain(
      "Preflight proof has expired and cannot be used for apply.",
    );
  });
});
