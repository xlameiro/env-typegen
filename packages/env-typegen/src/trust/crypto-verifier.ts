import { createHash, createVerify } from "node:crypto";

import type { PolicyPackTrustEnvelope } from "../policy/policy-pack.js";
import { lookupKeyringEntry, type PolicyPackKeyring } from "./keyring.js";

type CanonicalValue =
  | null
  | string
  | number
  | boolean
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

export type CryptoVerificationResult = {
  isValid: boolean;
  reasons: string[];
  verifiedWith: "legacy-checksum" | "rsa-signature" | "none";
  keyId?: string;
  fingerprint?: string;
};

function toCanonicalValue(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) {
    return value.map((entry) => toCanonicalValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, nested]) => [key, toCanonicalValue(nested)]));
  }

  return value;
}

function stripTrustEnvelope(content: string): CanonicalValue {
  const parsed = JSON.parse(content) as CanonicalValue;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return parsed;
  }

  const { trust: _trust, ...rest } = parsed as {
    trust?: unknown;
  } & {
    [key: string]: CanonicalValue;
  };

  return toCanonicalValue(rest);
}

function computeCanonicalChecksum(content: string): string {
  const canonical = JSON.stringify(stripTrustEnvelope(content));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function verifyLegacyChecksum(params: {
  trust: PolicyPackTrustEnvelope;
  content: string;
}): CryptoVerificationResult {
  if (params.trust.signatureChecksum === undefined) {
    return {
      isValid: false,
      reasons: ["Legacy checksum envelope is missing trust.signatureChecksum."],
      verifiedWith: "none",
    };
  }

  const checksum = computeCanonicalChecksum(params.content);
  if (checksum !== params.trust.signatureChecksum) {
    return {
      isValid: false,
      reasons: [
        `Policy pack checksum mismatch. Expected ${params.trust.signatureChecksum}, received ${checksum}.`,
      ],
      verifiedWith: "legacy-checksum",
    };
  }

  return {
    isValid: true,
    reasons: [],
    verifiedWith: "legacy-checksum",
  };
}

function verifyRsaSignature(params: {
  trust: PolicyPackTrustEnvelope;
  content: string;
  keyring: PolicyPackKeyring;
}): CryptoVerificationResult {
  if (params.trust.keyId === undefined) {
    return {
      isValid: false,
      reasons: ["Signature envelope is missing trust.keyId."],
      verifiedWith: "none",
    };
  }

  if (params.trust.signature === undefined) {
    return {
      isValid: false,
      reasons: ["Signature envelope is missing trust.signature."],
      verifiedWith: "none",
    };
  }

  const keyLookup = lookupKeyringEntry({
    keyring: params.keyring,
    keyId: params.trust.keyId,
    signer: params.trust.signer,
  });

  if (!keyLookup.found) {
    return {
      isValid: false,
      reasons: [keyLookup.reason],
      verifiedWith: "rsa-signature",
      keyId: params.trust.keyId,
    };
  }

  const payload = JSON.stringify(stripTrustEnvelope(params.content));
  const verifier = createVerify("RSA-SHA256");
  verifier.update(payload, "utf8");
  verifier.end();

  const signatureBuffer = Buffer.from(params.trust.signature, "base64");
  const isSignatureValid = verifier.verify(keyLookup.key.publicKeyPem, signatureBuffer);

  if (!isSignatureValid) {
    return {
      isValid: false,
      reasons: [`RSA signature validation failed for key ${params.trust.keyId}.`],
      verifiedWith: "rsa-signature",
      keyId: params.trust.keyId,
      ...(keyLookup.key.fingerprint === undefined
        ? {}
        : { fingerprint: keyLookup.key.fingerprint }),
    };
  }

  return {
    isValid: true,
    reasons: [],
    verifiedWith: "rsa-signature",
    keyId: params.trust.keyId,
    ...(keyLookup.key.fingerprint === undefined ? {} : { fingerprint: keyLookup.key.fingerprint }),
  };
}

export function verifyPolicyPackTrustEnvelope(params: {
  trust: PolicyPackTrustEnvelope | undefined;
  content: string;
  keyring?: PolicyPackKeyring;
}): CryptoVerificationResult {
  if (params.trust === undefined) {
    return {
      isValid: false,
      reasons: ["Policy pack is missing trust envelope metadata."],
      verifiedWith: "none",
    };
  }

  const hasRsaEnvelope =
    params.trust.algorithm === "rsa-sha256" ||
    params.trust.signature !== undefined ||
    params.trust.keyId !== undefined;

  if (hasRsaEnvelope) {
    if (params.keyring === undefined) {
      return {
        isValid: false,
        reasons: ["Trust verification requires an external keyring for RSA signatures."],
        verifiedWith: "none",
      };
    }

    return verifyRsaSignature({
      trust: params.trust,
      content: params.content,
      keyring: params.keyring,
    });
  }

  return verifyLegacyChecksum({
    trust: params.trust,
    content: params.content,
  });
}
