import { readFile } from "node:fs/promises";
import type { PolicyPackLockEntryProvenance } from "../policy/policy-pack-lock.js";
import type { PolicyPackTrustEnvelope } from "../policy/policy-pack.js";
import { verifyPolicyPackTrustEnvelope } from "./crypto-verifier.js";
import { parsePolicyPackKeyring, type PolicyPackKeyring } from "./keyring.js";

export type PolicyPackTrustMode = "strict" | "tolerant";

export type TrustEnforcementMode = "shadow" | "enforce";

export type PolicyPackTrustConfig = {
  mode?: PolicyPackTrustMode;
  allowedSigners?: string[];
  enforceExpiry?: boolean;
  enforcement?: TrustEnforcementMode;
  keyringPath?: string;
  keyring?: PolicyPackKeyring;
};

export type PolicyPackSignatureValidation = {
  isValid: boolean;
  mode: PolicyPackTrustMode;
  enforcement: TrustEnforcementMode;
  reasons: string[];
  signer?: string;
  signatureChecksum?: string;
  keyId?: string;
  fingerprint?: string;
  verifiedWith: "legacy-checksum" | "rsa-signature" | "none";
};

function resolveMode(config: PolicyPackTrustConfig | undefined): PolicyPackTrustMode {
  return config?.mode ?? "tolerant";
}

function resolveEnforcement(config: PolicyPackTrustConfig | undefined): TrustEnforcementMode {
  if (config?.mode !== "strict") {
    return "enforce";
  }

  return config.enforcement ?? "shadow";
}

function isExpired(expiresAt: string, now: Date): boolean {
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return true;
  }

  return expiryDate.getTime() < now.getTime();
}

async function resolveKeyring(
  config: PolicyPackTrustConfig | undefined,
): Promise<PolicyPackKeyring | undefined> {
  if (config?.keyring !== undefined) {
    return config.keyring;
  }

  if (config?.keyringPath !== undefined) {
    const content = await readFile(config.keyringPath, "utf8");
    return parsePolicyPackKeyring(content, config.keyringPath);
  }

  return undefined;
}

function appendLockProvenanceReasons(params: {
  source: string;
  trust: PolicyPackTrustEnvelope;
  lockProvenance: PolicyPackLockEntryProvenance | undefined;
  fingerprint: string | undefined;
  reasons: string[];
}): void {
  if (
    params.lockProvenance?.expectedSigner !== undefined &&
    params.lockProvenance.expectedSigner !== params.trust.signer
  ) {
    params.reasons.push(
      `Lock provenance signer mismatch for ${params.source}. Expected ${params.lockProvenance.expectedSigner}, received ${params.trust.signer}.`,
    );
  }

  if (
    params.lockProvenance?.expectedSignatureChecksum !== undefined &&
    params.lockProvenance.expectedSignatureChecksum !== params.trust.signatureChecksum
  ) {
    params.reasons.push(
      `Lock provenance signature checksum mismatch for ${params.source}. Expected ${params.lockProvenance.expectedSignatureChecksum}, received ${params.trust.signatureChecksum}.`,
    );
  }

  if (
    params.lockProvenance?.expectedKeyId !== undefined &&
    params.lockProvenance.expectedKeyId !== params.trust.keyId
  ) {
    params.reasons.push(
      `Lock provenance key mismatch for ${params.source}. Expected ${params.lockProvenance.expectedKeyId}, received ${params.trust.keyId ?? "<missing>"}.`,
    );
  }

  if (
    params.lockProvenance?.expectedFingerprint !== undefined &&
    params.lockProvenance.expectedFingerprint !== params.fingerprint
  ) {
    params.reasons.push(
      `Lock provenance fingerprint mismatch for ${params.source}. Expected ${params.lockProvenance.expectedFingerprint}, received ${params.fingerprint ?? "<missing>"}.`,
    );
  }
}

export async function validatePolicyPackSignature(params: {
  source: string;
  content: string;
  trust: PolicyPackTrustEnvelope | undefined;
  lockProvenance: PolicyPackLockEntryProvenance | undefined;
  config: PolicyPackTrustConfig | undefined;
  now?: Date;
}): Promise<PolicyPackSignatureValidation> {
  const reasons: string[] = [];
  const mode = resolveMode(params.config);
  const enforcement = resolveEnforcement(params.config);
  const now = params.now ?? new Date();
  const keyring = await resolveKeyring(params.config);

  if (params.trust === undefined) {
    if (mode === "strict") {
      reasons.push(`Policy pack ${params.source} is missing trust signature metadata.`);
    }

    return {
      isValid: reasons.length === 0,
      mode,
      enforcement,
      reasons,
      verifiedWith: "none",
    };
  }

  const verification = verifyPolicyPackTrustEnvelope({
    trust: params.trust,
    content: params.content,
    ...(keyring === undefined ? {} : { keyring }),
  });
  reasons.push(...verification.reasons);

  if (
    Array.isArray(params.config?.allowedSigners) &&
    params.config.allowedSigners.length > 0 &&
    !params.config.allowedSigners.includes(params.trust.signer)
  ) {
    reasons.push(`Signer ${params.trust.signer} is not allowed by trust policy.`);
  }

  if (params.config?.enforceExpiry === true && params.trust.expiresAt !== undefined) {
    if (isExpired(params.trust.expiresAt, now)) {
      reasons.push(`Policy pack signature for ${params.source} is expired.`);
    }
  }

  appendLockProvenanceReasons({
    source: params.source,
    trust: params.trust,
    lockProvenance: params.lockProvenance,
    fingerprint: verification.fingerprint,
    reasons,
  });

  return {
    isValid: reasons.length === 0,
    mode,
    enforcement,
    reasons,
    signer: params.trust.signer,
    ...(params.trust.signatureChecksum === undefined
      ? {}
      : { signatureChecksum: params.trust.signatureChecksum }),
    ...(params.trust.keyId === undefined ? {} : { keyId: params.trust.keyId }),
    ...(verification.fingerprint === undefined ? {} : { fingerprint: verification.fingerprint }),
    verifiedWith: verification.verifiedWith,
  };
}
