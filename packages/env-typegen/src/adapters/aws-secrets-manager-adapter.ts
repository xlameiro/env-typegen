import {
  applyLiveWrites,
  buildBlockedPushResult,
  buildSnapshotPushResult,
  readAwsSnapshotPayloads,
  resolveAwsRuntimeMode,
} from "./aws-runtime.js";
import type {
  AdapterCompareResult,
  AdapterContext,
  AdapterDiffEntry,
  AdapterPullResult,
  AdapterPushResult,
  EnvAdapter,
  EnvMap,
} from "./types.js";

type AwsSecretsProviderConfig = {
  snapshotFile?: string;
  snapshotFiles?: string[];
  allowWrite?: boolean;
  runtimeMode?: "snapshot" | "live";
  liveRuntime?: {
    pullSecrets?: () => Promise<AwsSecretEntry[] | AwsSecretsPayload>;
    putSecretValue?: (params: { name: string; value: string }) => Promise<void>;
  };
};

type AwsSecretEntry = {
  Name?: string;
  name?: string;
  SecretString?: string;
  secretString?: string;
  Value?: string;
  value?: string;
};

type AwsSecretsPayload = {
  SecretList?: AwsSecretEntry[];
  Secrets?: AwsSecretEntry[];
};

function toProviderConfig(context: AdapterContext): AwsSecretsProviderConfig {
  return (context.providerConfig ?? {}) as AwsSecretsProviderConfig;
}

function normalizeKey(name: string): string {
  const segments = name.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? name;
}

function readLiveEntries(payload: AwsSecretEntry[] | AwsSecretsPayload): AwsSecretEntry[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return getEntries(payload);
}

async function readEntries(
  config: AwsSecretsProviderConfig,
): Promise<{ entries: AwsSecretEntry[]; pages: number; mode: "snapshot" | "live" }> {
  const mode = resolveAwsRuntimeMode(config);

  if (mode === "live") {
    const pullSecrets = config.liveRuntime?.pullSecrets;
    if (typeof pullSecrets !== "function") {
      throw new Error(
        "aws-secrets-manager live mode requires providerConfig.liveRuntime.pullSecrets().",
      );
    }

    const payload = await pullSecrets();
    return { entries: readLiveEntries(payload), pages: 1, mode };
  }

  const payloads = await readAwsSnapshotPayloads(config, "aws-secrets-manager");
  const entries = payloads.flatMap((payload) => getEntries(payload as AwsSecretsPayload));
  return { entries, pages: payloads.length, mode };
}

function getEntries(payload: AwsSecretsPayload): AwsSecretEntry[] {
  return payload.SecretList ?? payload.Secrets ?? [];
}

function readSecretValue(entry: AwsSecretEntry): string | undefined {
  return entry.SecretString ?? entry.secretString ?? entry.Value ?? entry.value;
}

function compareMaps(localValues: EnvMap, remoteValues: EnvMap): AdapterCompareResult {
  const localKeys = new Set(Object.keys(localValues));
  const remoteKeys = new Set(Object.keys(remoteValues));

  const missingInRemote: string[] = [];
  const extraInRemote: string[] = [];
  const mismatches: AdapterDiffEntry[] = [];

  for (const key of localKeys) {
    if (!remoteKeys.has(key)) {
      missingInRemote.push(key);
      continue;
    }
    if (localValues[key] !== remoteValues[key]) {
      mismatches.push({ key, reason: "mismatch" });
    }
  }

  for (const key of remoteKeys) {
    if (!localKeys.has(key)) {
      extraInRemote.push(key);
    }
  }

  return { missingInRemote, extraInRemote, mismatches };
}

async function pull(context: AdapterContext): Promise<AdapterPullResult> {
  const providerConfig = toProviderConfig(context);
  const runtimeData = await readEntries(providerConfig);

  const values: EnvMap = {};
  const warnings: string[] = [];

  for (const entry of runtimeData.entries) {
    const name = entry.Name ?? entry.name;
    if (name === undefined) {
      warnings.push("Secret entry skipped because Name is missing.");
      continue;
    }

    const value = readSecretValue(entry);
    values[normalizeKey(name)] = value ?? "";
    if (value === undefined) {
      warnings.push(`Secret entry ${name} has no value; defaulting to empty string.`);
    }
  }

  return {
    values,
    ...(warnings.length > 0 ? { warnings } : {}),
    metadata: {
      source: "aws-secrets-manager",
      environment: context.environment,
      mode: runtimeData.mode,
      pages: runtimeData.pages,
      count: Object.keys(values).length,
      writeEnabled: providerConfig.allowWrite === true,
    },
  };
}

async function push(context: AdapterContext, values: EnvMap): Promise<AdapterPushResult> {
  const providerConfig = toProviderConfig(context);
  if (providerConfig.allowWrite !== true) {
    return buildBlockedPushResult(
      values,
      "aws-secrets-manager adapter push is disabled. Set providerConfig.allowWrite=true to enable apply.",
    );
  }

  const mode = resolveAwsRuntimeMode(providerConfig);
  if (mode === "snapshot") {
    return buildSnapshotPushResult(
      values,
      "Snapshot mode: write simulated for deterministic apply.",
    );
  }

  const putSecretValue = providerConfig.liveRuntime?.putSecretValue;
  if (typeof putSecretValue !== "function") {
    throw new Error(
      "aws-secrets-manager live mode requires providerConfig.liveRuntime.putSecretValue().",
    );
  }

  return applyLiveWrites(values, async (key, value) => {
    await putSecretValue({ name: key, value });
  });
}

async function compare(
  _context: AdapterContext,
  localValues: EnvMap,
  remoteValues: EnvMap,
): Promise<AdapterCompareResult> {
  return compareMaps(localValues, remoteValues);
}

export const awsSecretsManagerAdapter: EnvAdapter = {
  name: "aws-secrets-manager",
  pull,
  push,
  compare,
  meta: () => ({
    name: "aws-secrets-manager",
    capabilities: {
      pull: true,
      push: true,
      compare: true,
      redactValuesByDefault: true,
      writeSemantics: "idempotent",
    },
    supportedEnvironments: ["development", "preview", "production"],
  }),
};

export default awsSecretsManagerAdapter;
