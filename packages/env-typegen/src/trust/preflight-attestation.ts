import { randomUUID } from "node:crypto";

type AttestationCommand = "plan" | "sync-preview";

export type PreflightAttestation = {
  version: 1;
  command: AttestationCommand;
  attestationId: string;
  correlationId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  provider: string;
  environment: string;
  changeSetHash: string;
  policyDecision: "allow" | "warn" | "block";
};

export type PreflightAttestationValidationResult = {
  isValid: boolean;
  reasons: string[];
};

function parseIsoDate(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function validateRequiredFields(
  attestation: Partial<PreflightAttestation>,
  reasons: string[],
): void {
  if (attestation.version !== 1) {
    reasons.push("Preflight attestation version must be 1.");
  }

  if (typeof attestation.attestationId !== "string" || attestation.attestationId.length === 0) {
    reasons.push("Preflight attestation attestationId must be a non-empty string.");
  }

  if (typeof attestation.correlationId !== "string" || attestation.correlationId.length === 0) {
    reasons.push("Preflight attestation correlationId must be a non-empty string.");
  }

  if (typeof attestation.nonce !== "string" || attestation.nonce.length === 0) {
    reasons.push("Preflight attestation nonce must be a non-empty string.");
  }
}

function validateContextBinding(params: {
  attestation: Partial<PreflightAttestation>;
  provider: string;
  environment: string;
  changeSetHash: string;
  expectedCorrelationId?: string;
  reasons: string[];
}): void {
  if (params.attestation.provider !== params.provider) {
    params.reasons.push("Preflight attestation provider does not match current provider.");
  }

  if (params.attestation.environment !== params.environment) {
    params.reasons.push("Preflight attestation environment does not match current environment.");
  }

  if (params.attestation.changeSetHash !== params.changeSetHash) {
    params.reasons.push(
      "Preflight attestation change-set hash does not match current drift state.",
    );
  }

  if (
    params.expectedCorrelationId !== undefined &&
    params.attestation.correlationId !== params.expectedCorrelationId
  ) {
    params.reasons.push(
      "Preflight attestation correlationId does not match current execution context.",
    );
  }
}

function validateTimestamps(
  attestation: Partial<PreflightAttestation>,
  reasons: string[],
  now: Date,
): void {
  if (typeof attestation.issuedAt !== "string" || parseIsoDate(attestation.issuedAt) === null) {
    reasons.push("Preflight attestation issuedAt must be a valid ISO timestamp.");
  }

  const expiresAtMs =
    typeof attestation.expiresAt === "string" ? parseIsoDate(attestation.expiresAt) : null;
  if (expiresAtMs === null) {
    reasons.push("Preflight attestation expiresAt must be a valid ISO timestamp.");
    return;
  }

  if (expiresAtMs <= now.getTime()) {
    reasons.push("Preflight attestation has expired and cannot be used for apply.");
  }
}

function validateReplay(params: {
  attestation: Partial<PreflightAttestation>;
  usedAttestationIds?: Set<string>;
  reasons: string[];
}): void {
  if (
    params.usedAttestationIds !== undefined &&
    typeof params.attestation.attestationId === "string" &&
    params.usedAttestationIds.has(params.attestation.attestationId)
  ) {
    params.reasons.push("Preflight attestation replay detected for this process lifecycle.");
  }
}

export function createPreflightAttestation(params: {
  command: AttestationCommand;
  provider: string;
  environment: string;
  changeSetHash: string;
  policyDecision: "allow" | "warn" | "block";
  correlationId?: string;
  now?: Date;
  ttlSeconds?: number;
}): PreflightAttestation {
  const now = params.now ?? new Date();
  const ttlSeconds = params.ttlSeconds ?? 900;

  return {
    version: 1,
    command: params.command,
    attestationId: randomUUID(),
    correlationId: params.correlationId ?? randomUUID(),
    nonce: randomUUID(),
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    provider: params.provider,
    environment: params.environment,
    changeSetHash: params.changeSetHash,
    policyDecision: params.policyDecision,
  };
}

export function validatePreflightAttestation(params: {
  attestation: unknown;
  provider: string;
  environment: string;
  changeSetHash: string;
  expectedCorrelationId?: string;
  usedAttestationIds?: Set<string>;
  now?: Date;
}): PreflightAttestationValidationResult {
  const reasons: string[] = [];

  if (typeof params.attestation !== "object" || params.attestation === null) {
    return {
      isValid: false,
      reasons: ["Preflight attestation must be a JSON object."],
    };
  }

  const attestation = params.attestation as Partial<PreflightAttestation>;
  validateRequiredFields(attestation, reasons);
  validateContextBinding({
    attestation,
    provider: params.provider,
    environment: params.environment,
    changeSetHash: params.changeSetHash,
    ...(params.expectedCorrelationId === undefined
      ? {}
      : { expectedCorrelationId: params.expectedCorrelationId }),
    reasons,
  });
  validateTimestamps(attestation, reasons, params.now ?? new Date());
  validateReplay({
    attestation,
    ...(params.usedAttestationIds === undefined
      ? {}
      : { usedAttestationIds: params.usedAttestationIds }),
    reasons,
  });

  return {
    isValid: reasons.length === 0,
    reasons,
  };
}
