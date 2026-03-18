import {
  type PolicyPackTrustConfig,
  validatePolicyPackSignature,
} from "../trust/policy-pack-signature.js";
import { isPolicyDistributionChannel, type PolicyDistributionChannel } from "./policy-channel.js";
import type { EnvTypegenPolicyConfig, PolicyPackReference } from "./policy-model.js";
import {
  fetchPolicyPackContentWithProvenance,
  type PolicyPackFetchOptions,
} from "./policy-pack-fetch.js";
import {
  type PolicyPackLockFile,
  readPolicyPackLock,
  validatePolicyPackLockEntry,
} from "./policy-pack-lock.js";
import {
  mergePolicyConfigs,
  normalizePolicyPackSource,
  parsePolicyPack,
  stripPolicyPacks,
  validatePolicyPackChecksum,
} from "./policy-pack.js";

function normalizeReference(reference: PolicyPackReference): { source: string; checksum?: string } {
  if (typeof reference === "string") {
    return { source: reference };
  }

  return reference;
}

async function loadPacksFromReferences(params: {
  references: PolicyPackReference[];
  expectedLayer: "base" | "overlay";
  channel: PolicyDistributionChannel | undefined;
  cwd: string;
  lock: PolicyPackLockFile | undefined;
  lockStrict: boolean;
  fetch: PolicyPackFetchOptions | undefined;
  trust: PolicyPackTrustConfig | undefined;
}): Promise<Omit<EnvTypegenPolicyConfig, "packs">[]> {
  const loadedPolicies: Omit<EnvTypegenPolicyConfig, "packs">[] = [];

  for (const reference of params.references) {
    const parsedPack = await loadPolicyPackReference({
      reference,
      cwd: params.cwd,
      lock: params.lock,
      lockStrict: params.lockStrict,
      fetch: params.fetch,
      trust: params.trust,
    });
    validatePolicyPackLayer({
      id: parsedPack.id,
      layer: parsedPack.layer,
      expectedLayer: params.expectedLayer,
    });
    validatePolicyPackChannel({
      id: parsedPack.id,
      source: normalizeReference(reference).source,
      packChannel: parsedPack.distribution?.channel,
      expectedChannel: params.channel,
    });

    const normalizedPolicy: EnvTypegenPolicyConfig = {
      ...(parsedPack.policy.mode === undefined ? {} : { mode: parsedPack.policy.mode }),
      ...(parsedPack.policy.defaults === undefined ? {} : { defaults: parsedPack.policy.defaults }),
      ...(parsedPack.policy.rules === undefined ? {} : { rules: parsedPack.policy.rules }),
    };

    loadedPolicies.push(stripPolicyPacks(normalizedPolicy));
  }

  return loadedPolicies;
}

function validatePolicyPackChannel(params: {
  id: string;
  source: string;
  packChannel: PolicyDistributionChannel | undefined;
  expectedChannel: PolicyDistributionChannel | undefined;
}): void {
  if (params.expectedChannel === undefined || params.packChannel === undefined) {
    return;
  }

  if (params.packChannel !== params.expectedChannel) {
    throw new Error(
      `Policy pack ${params.id} from ${params.source} targets channel ${params.packChannel}, expected ${params.expectedChannel}.`,
    );
  }
}

async function loadPolicyPackReference(params: {
  reference: PolicyPackReference;
  cwd: string;
  lock: PolicyPackLockFile | undefined;
  lockStrict: boolean;
  fetch: PolicyPackFetchOptions | undefined;
  trust: PolicyPackTrustConfig | undefined;
}): Promise<ReturnType<typeof parsePolicyPack>> {
  const normalizedReference = normalizeReference(params.reference);
  const fetched = await fetchPolicyPackContentWithProvenance({
    source: normalizedReference.source,
    cwd: params.cwd,
    ...(params.fetch === undefined ? {} : { options: params.fetch }),
  });
  const rawContent = fetched.content;

  if (normalizedReference.checksum !== undefined) {
    validatePolicyPackChecksum(rawContent, normalizedReference.checksum);
  }

  const lockEntry =
    params.lock === undefined
      ? undefined
      : validatePolicyPackLockEntry({
          source: normalizedReference.source,
          content: rawContent,
          lock: params.lock,
          cwd: params.cwd,
          strict: params.lockStrict,
        });

  const normalizedSource = normalizePolicyPackSource(normalizedReference.source, params.cwd);
  const parsedPack = parsePolicyPack(rawContent, normalizedSource);
  const signatureValidation = await validatePolicyPackSignature({
    source: normalizedSource,
    content: rawContent,
    trust: parsedPack.trust,
    lockProvenance: lockEntry?.provenance,
    config: params.trust,
  });
  if (!signatureValidation.isValid) {
    const message = signatureValidation.reasons.join(" ");
    const shouldEnforce =
      signatureValidation.mode !== "strict" || signatureValidation.enforcement === "enforce";

    if (shouldEnforce) {
      throw new Error(message);
    }

    // Strict mode starts in shadow to collect telemetry without blocking rollout.
    process.stderr.write(`TRUST_VIOLATION_SHADOW:${normalizedSource}:${message}\n`);
  }

  if (
    lockEntry?.provenance?.sourceType !== undefined &&
    lockEntry.provenance.sourceType !== fetched.provenance.sourceType
  ) {
    throw new Error(
      `Policy pack source type mismatch for ${normalizedReference.source}. Expected ${lockEntry.provenance.sourceType}, received ${fetched.provenance.sourceType}.`,
    );
  }

  return parsedPack;
}

function validatePolicyPackLayer(params: {
  id: string;
  layer: "base" | "overlay";
  expectedLayer: "base" | "overlay";
}): void {
  if (params.layer !== params.expectedLayer) {
    throw new Error(
      `Policy pack ${params.id} has layer ${params.layer}, expected ${params.expectedLayer}.`,
    );
  }
}

export async function resolvePolicyWithPacks(params: {
  policy: EnvTypegenPolicyConfig | undefined;
  channel?: PolicyDistributionChannel;
  cwd?: string;
  lock?: {
    lockFilePath: string;
    strict?: boolean;
  };
  fetch?: PolicyPackFetchOptions;
  trust?: PolicyPackTrustConfig;
}): Promise<Omit<EnvTypegenPolicyConfig, "packs">> {
  if (params.channel !== undefined && !isPolicyDistributionChannel(params.channel)) {
    throw new Error(`Invalid policy distribution channel: ${params.channel}.`);
  }

  const inlinePolicy = stripPolicyPacks(params.policy);
  const policyPacks = params.policy?.packs;
  if (policyPacks === undefined) {
    return inlinePolicy;
  }

  const cwd = params.cwd ?? process.cwd();
  const lock =
    params.lock === undefined
      ? undefined
      : await readPolicyPackLock({
          lockFilePath: params.lock.lockFilePath,
          cwd,
        });

  const basePolicies = await loadPacksFromReferences({
    references: policyPacks.base ?? [],
    expectedLayer: "base",
    channel: params.channel,
    cwd,
    lock,
    lockStrict: params.lock?.strict ?? true,
    fetch: params.fetch,
    trust: params.trust,
  });
  const overlayPolicies = await loadPacksFromReferences({
    references: policyPacks.overlay ?? [],
    expectedLayer: "overlay",
    channel: params.channel,
    cwd,
    lock,
    lockStrict: params.lock?.strict ?? true,
    fetch: params.fetch,
    trust: params.trust,
  });

  let resolvedPolicy: Omit<EnvTypegenPolicyConfig, "packs"> = {};

  for (const basePolicy of basePolicies) {
    resolvedPolicy = mergePolicyConfigs({
      basePolicy: resolvedPolicy,
      overlayPolicy: basePolicy,
    });
  }

  for (const overlayPolicy of overlayPolicies) {
    resolvedPolicy = mergePolicyConfigs({
      basePolicy: resolvedPolicy,
      overlayPolicy: overlayPolicy,
    });
  }

  resolvedPolicy = mergePolicyConfigs({
    basePolicy: resolvedPolicy,
    overlayPolicy: inlinePolicy,
  });

  return resolvedPolicy;
}
