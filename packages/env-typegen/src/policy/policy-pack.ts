import { createHash } from "node:crypto";
import path from "node:path";

import { isPolicyDistributionChannel, type PolicyDistributionChannel } from "./policy-channel.js";
import type {
  EnvTypegenPolicyConfig,
  EnvTypegenPolicyDefaults,
  PolicyRule,
} from "./policy-model.js";

export type PolicyPackLayer = "base" | "overlay";

export type PolicyPackTrustEnvelope = {
  signer: string;
  signatureChecksum?: string;
  algorithm?: "rsa-sha256";
  keyId?: string;
  signature?: string;
  issuedAt: string;
  expiresAt?: string;
};

export type PolicyPackFile = {
  id: string;
  version: number;
  layer: PolicyPackLayer;
  distribution?: {
    channel?: PolicyDistributionChannel;
  };
  trust?: PolicyPackTrustEnvelope;
  policy: {
    mode?: EnvTypegenPolicyConfig["mode"];
    defaults?: EnvTypegenPolicyDefaults;
    rules?: PolicyRule[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePolicyPackDistribution(
  value: unknown,
  source: string,
): PolicyPackFile["distribution"] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new TypeError(`Invalid policy pack at ${source}: "distribution" must be an object.`);
  }

  const channel = value.channel;
  if (channel !== undefined && !isPolicyDistributionChannel(channel)) {
    throw new TypeError(
      `Invalid policy pack at ${source}: "distribution.channel" must be one of: dev, stage, prod.`,
    );
  }

  return {
    ...(channel === undefined ? {} : { channel }),
  };
}

function asPolicyPackLayer(value: unknown): PolicyPackLayer | undefined {
  if (value === "base" || value === "overlay") {
    return value;
  }
  return undefined;
}

function parsePolicyPackTrust(value: unknown, source: string): PolicyPackTrustEnvelope | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new TypeError(`Invalid policy pack at ${source}: "trust" must be an object.`);
  }

  if (typeof value.signer !== "string" || value.signer.trim().length === 0) {
    throw new TypeError(
      `Invalid policy pack at ${source}: "trust.signer" must be a non-empty string.`,
    );
  }

  const legacyChecksum: string | undefined =
    typeof value.signatureChecksum === "string" && /^[a-f0-9]{64}$/u.test(value.signatureChecksum)
      ? value.signatureChecksum
      : undefined;
  const hasLegacyChecksum = legacyChecksum !== undefined;
  const hasRsaEnvelope =
    value.algorithm === "rsa-sha256" &&
    typeof value.keyId === "string" &&
    value.keyId.trim().length > 0 &&
    typeof value.signature === "string" &&
    value.signature.trim().length > 0;

  if (!hasLegacyChecksum && !hasRsaEnvelope) {
    throw new TypeError(
      `Invalid policy pack at ${source}: trust must include either signatureChecksum (legacy) or algorithm/keyId/signature (rsa envelope).`,
    );
  }

  if (typeof value.issuedAt !== "string" || value.issuedAt.trim().length === 0) {
    throw new TypeError(
      `Invalid policy pack at ${source}: "trust.issuedAt" must be a non-empty string.`,
    );
  }

  return {
    signer: value.signer,
    ...(legacyChecksum === undefined ? {} : { signatureChecksum: legacyChecksum }),
    ...(value.algorithm === "rsa-sha256" ? { algorithm: "rsa-sha256" as const } : {}),
    ...(typeof value.keyId === "string" ? { keyId: value.keyId } : {}),
    ...(typeof value.signature === "string" ? { signature: value.signature } : {}),
    issuedAt: value.issuedAt,
    ...(typeof value.expiresAt === "string" ? { expiresAt: value.expiresAt } : {}),
  };
}

export function computePolicyPackChecksum(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function normalizePolicyPackSource(source: string, cwd: string): string {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    return source;
  }
  return path.isAbsolute(source) ? source : path.resolve(cwd, source);
}

export function validatePolicyPackChecksum(content: string, expectedChecksum: string): void {
  const actual = computePolicyPackChecksum(content);
  if (actual !== expectedChecksum) {
    throw new Error(
      `Policy pack checksum mismatch. Expected ${expectedChecksum}, received ${actual}.`,
    );
  }
}

export function parsePolicyPack(content: string, source: string): PolicyPackFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse policy pack at ${source}: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new TypeError(`Invalid policy pack at ${source}: root must be an object.`);
  }

  if (typeof parsed.id !== "string" || parsed.id.trim().length === 0) {
    throw new TypeError(`Invalid policy pack at ${source}: "id" must be a non-empty string.`);
  }

  if (typeof parsed.version !== "number" || Number.isNaN(parsed.version)) {
    throw new TypeError(`Invalid policy pack at ${source}: "version" must be a number.`);
  }

  const layer = asPolicyPackLayer(parsed.layer);
  if (layer === undefined) {
    throw new TypeError(`Invalid policy pack at ${source}: "layer" must be "base" or "overlay".`);
  }

  if (!isRecord(parsed.policy)) {
    throw new TypeError(`Invalid policy pack at ${source}: "policy" must be an object.`);
  }

  const trust = parsePolicyPackTrust(parsed.trust, source);
  const distribution = parsePolicyPackDistribution(parsed.distribution, source);

  const policy: PolicyPackFile["policy"] = {
    ...(parsed.policy.mode === "read-only" || parsed.policy.mode === "advisory"
      ? { mode: parsed.policy.mode }
      : {}),
    ...(isRecord(parsed.policy.defaults) ? { defaults: parsed.policy.defaults } : {}),
    ...(Array.isArray(parsed.policy.rules) ? { rules: parsed.policy.rules as PolicyRule[] } : {}),
  };

  return {
    id: parsed.id,
    version: parsed.version,
    layer,
    ...(distribution === undefined ? {} : { distribution }),
    ...(trust === undefined ? {} : { trust }),
    policy,
  };
}

export function stripPolicyPacks(
  policy: EnvTypegenPolicyConfig | undefined,
): Omit<EnvTypegenPolicyConfig, "packs"> {
  if (policy === undefined) {
    return {};
  }

  return {
    ...(policy.mode === undefined ? {} : { mode: policy.mode }),
    ...(policy.defaults === undefined ? {} : { defaults: policy.defaults }),
    ...(policy.rules === undefined ? {} : { rules: policy.rules }),
  };
}

export function mergePolicyConfigs(params: {
  basePolicy: Omit<EnvTypegenPolicyConfig, "packs">;
  overlayPolicy: Omit<EnvTypegenPolicyConfig, "packs">;
}): Omit<EnvTypegenPolicyConfig, "packs"> {
  const defaults = {
    ...params.basePolicy.defaults,
    ...params.overlayPolicy.defaults,
  };

  const mergedMode = params.overlayPolicy.mode ?? params.basePolicy.mode;
  const mergedRules = [...(params.overlayPolicy.rules ?? []), ...(params.basePolicy.rules ?? [])];

  return {
    ...(mergedMode === undefined ? {} : { mode: mergedMode }),
    ...(Object.keys(defaults).length > 0 ? { defaults } : {}),
    ...(mergedRules.length > 0 ? { rules: mergedRules } : {}),
  };
}
