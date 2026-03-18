import { readFile } from "node:fs/promises";

export type ExternalTrustProvider = "aws-kms" | "gcp-kms" | "hashicorp-vault" | "external";

export type KeyringEntryStatus = "active" | "revoked";

export type KeyringEntry = {
  keyId: string;
  signer: string;
  provider: ExternalTrustProvider;
  algorithm: "rsa-sha256";
  publicKeyPem: string;
  status: KeyringEntryStatus;
  fingerprint?: string;
  activatedAt?: string;
  revokedAt?: string;
};

export type PolicyPackKeyring = {
  version: 1;
  keys: KeyringEntry[];
};

export type KeyringLookupResult =
  | {
      found: true;
      key: KeyringEntry;
    }
  | {
      found: false;
      reason: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProvider(value: unknown): value is ExternalTrustProvider {
  return (
    value === "aws-kms" ||
    value === "gcp-kms" ||
    value === "hashicorp-vault" ||
    value === "external"
  );
}

function isPemPublicKey(value: string): boolean {
  return value.includes("BEGIN PUBLIC KEY") && value.includes("END PUBLIC KEY");
}

function parseKeyringEntry(value: unknown, index: number, source: string): KeyringEntry {
  if (!isRecord(value)) {
    throw new TypeError(`Invalid keyring at ${source}: keys[${index}] must be an object.`);
  }

  if (typeof value.keyId !== "string" || value.keyId.trim().length === 0) {
    throw new TypeError(
      `Invalid keyring at ${source}: keys[${index}].keyId must be a non-empty string.`,
    );
  }

  if (typeof value.signer !== "string" || value.signer.trim().length === 0) {
    throw new TypeError(
      `Invalid keyring at ${source}: keys[${index}].signer must be a non-empty string.`,
    );
  }

  if (!isProvider(value.provider)) {
    throw new TypeError(
      `Invalid keyring at ${source}: keys[${index}].provider must be aws-kms, gcp-kms, hashicorp-vault, or external.`,
    );
  }

  if (value.algorithm !== "rsa-sha256") {
    throw new TypeError(
      `Invalid keyring at ${source}: keys[${index}].algorithm must be rsa-sha256.`,
    );
  }

  if (typeof value.publicKeyPem !== "string" || !isPemPublicKey(value.publicKeyPem)) {
    throw new TypeError(
      `Invalid keyring at ${source}: keys[${index}].publicKeyPem must be a valid PEM public key.`,
    );
  }

  if (value.status !== "active" && value.status !== "revoked") {
    throw new TypeError(
      `Invalid keyring at ${source}: keys[${index}].status must be active or revoked.`,
    );
  }

  return {
    keyId: value.keyId,
    signer: value.signer,
    provider: value.provider,
    algorithm: value.algorithm,
    publicKeyPem: value.publicKeyPem,
    status: value.status,
    ...(typeof value.fingerprint === "string" ? { fingerprint: value.fingerprint } : {}),
    ...(typeof value.activatedAt === "string" ? { activatedAt: value.activatedAt } : {}),
    ...(typeof value.revokedAt === "string" ? { revokedAt: value.revokedAt } : {}),
  };
}

export function parsePolicyPackKeyring(content: string, source: string): PolicyPackKeyring {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse keyring at ${source}: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new TypeError(`Invalid keyring at ${source}: root must be an object.`);
  }

  if (parsed.version !== 1) {
    throw new TypeError(`Invalid keyring at ${source}: version must be 1.`);
  }

  if (!Array.isArray(parsed.keys)) {
    throw new TypeError(`Invalid keyring at ${source}: keys must be an array.`);
  }

  return {
    version: 1,
    keys: parsed.keys.map((entry, index) => parseKeyringEntry(entry, index, source)),
  };
}

export async function readPolicyPackKeyring(params: {
  keyringPath: string;
}): Promise<PolicyPackKeyring> {
  const content = await readFile(params.keyringPath, "utf8");
  return parsePolicyPackKeyring(content, params.keyringPath);
}

export function lookupKeyringEntry(params: {
  keyring: PolicyPackKeyring;
  keyId: string;
  signer: string;
}): KeyringLookupResult {
  const key = params.keyring.keys.find((entry) => entry.keyId === params.keyId);

  if (key === undefined) {
    return {
      found: false,
      reason: `Key ${params.keyId} was not found in configured keyring.`,
    };
  }

  if (key.signer !== params.signer) {
    return {
      found: false,
      reason: `Key ${params.keyId} signer mismatch. Expected ${key.signer}, received ${params.signer}.`,
    };
  }

  if (key.status === "revoked") {
    return {
      found: false,
      reason: `Key ${params.keyId} is revoked and cannot be used for trust validation.`,
    };
  }

  return {
    found: true,
    key,
  };
}

export function mergePolicyPackKeyrings(params: {
  primary: PolicyPackKeyring;
  secondary: PolicyPackKeyring;
}): PolicyPackKeyring {
  const mergedByKeyId = new Map<string, KeyringEntry>();

  for (const entry of params.secondary.keys) {
    mergedByKeyId.set(entry.keyId, entry);
  }

  for (const entry of params.primary.keys) {
    // Primary keyring has precedence for deterministic local override behavior.
    mergedByKeyId.set(entry.keyId, entry);
  }

  return {
    version: 1,
    keys: Array.from(mergedByKeyId.values()),
  };
}
