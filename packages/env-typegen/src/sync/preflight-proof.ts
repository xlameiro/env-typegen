import { randomUUID } from "node:crypto";

export type PreflightProof = {
  version: 1;
  command: "plan" | "sync-preview";
  proofId: string;
  generatedAt: string;
  expiresAt: string;
  provider: string;
  environment: string;
  changeSetHash: string;
  policyDecision: "allow" | "warn" | "block";
};

export type PreflightProofValidationResult = {
  isValid: boolean;
  reasons: string[];
};

export function createPreflightProof(params: {
  command: "plan" | "sync-preview";
  provider: string;
  environment: string;
  changeSetHash: string;
  policyDecision: "allow" | "warn" | "block";
  now?: Date;
  ttlSeconds?: number;
}): PreflightProof {
  const now = params.now ?? new Date();
  const ttlSeconds = params.ttlSeconds ?? 900;

  return {
    version: 1,
    command: params.command,
    proofId: randomUUID(),
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    provider: params.provider,
    environment: params.environment,
    changeSetHash: params.changeSetHash,
    policyDecision: params.policyDecision,
  };
}

function parseIsoDate(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function validatePreflightProof(params: {
  proof: unknown;
  provider: string;
  environment: string;
  changeSetHash: string;
  now?: Date;
}): PreflightProofValidationResult {
  const reasons: string[] = [];

  if (typeof params.proof !== "object" || params.proof === null) {
    return {
      isValid: false,
      reasons: ["Preflight proof must be a JSON object."],
    };
  }

  const proof = params.proof as Partial<PreflightProof>;
  if (proof.version !== 1) {
    reasons.push("Preflight proof version must be 1.");
  }

  if (proof.provider !== params.provider) {
    reasons.push("Preflight proof provider does not match current provider.");
  }

  if (proof.environment !== params.environment) {
    reasons.push("Preflight proof environment does not match current environment.");
  }

  if (proof.changeSetHash !== params.changeSetHash) {
    reasons.push("Preflight proof change-set hash does not match current drift state.");
  }

  if (typeof proof.generatedAt !== "string" || parseIsoDate(proof.generatedAt) === null) {
    reasons.push("Preflight proof generatedAt must be a valid ISO timestamp.");
  }

  const expiresAtMs = typeof proof.expiresAt === "string" ? parseIsoDate(proof.expiresAt) : null;
  if (expiresAtMs === null) {
    reasons.push("Preflight proof expiresAt must be a valid ISO timestamp.");
  } else {
    const nowMs = (params.now ?? new Date()).getTime();
    if (expiresAtMs <= nowMs) {
      reasons.push("Preflight proof has expired and cannot be used for apply.");
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons,
  };
}
