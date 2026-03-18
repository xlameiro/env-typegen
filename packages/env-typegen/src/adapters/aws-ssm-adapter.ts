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

type AwsSsmProviderConfig = {
  snapshotFile?: string;
  snapshotFiles?: string[];
  parameterPathPrefix?: string;
  allowWrite?: boolean;
  runtimeMode?: "snapshot" | "live";
  liveRuntime?: {
    pullParameters?: () => Promise<AwsSsmEntry[] | AwsSsmPayload>;
    putParameter?: (params: { name: string; value: string }) => Promise<void>;
  };
};

type AwsSsmEntry = {
  Name?: string;
  name?: string;
  Value?: string;
  value?: string;
};

type AwsSsmPayload = {
  Parameters?: AwsSsmEntry[];
};

function toProviderConfig(context: AdapterContext): AwsSsmProviderConfig {
  return (context.providerConfig ?? {}) as AwsSsmProviderConfig;
}

function readEntryValue(entry: AwsSsmEntry): { name?: string; value?: string } {
  return {
    ...(entry.Name !== undefined ? { name: entry.Name } : {}),
    ...(entry.Name === undefined && entry.name !== undefined ? { name: entry.name } : {}),
    ...(entry.Value !== undefined ? { value: entry.Value } : {}),
    ...(entry.Value === undefined && entry.value !== undefined ? { value: entry.value } : {}),
  };
}

function normalizeKey(name: string, prefix: string | undefined): string {
  const withoutPrefix =
    prefix !== undefined && name.startsWith(prefix) ? name.slice(prefix.length) : name;
  const segments = withoutPrefix.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? withoutPrefix;
}

function readLiveEntries(payload: AwsSsmEntry[] | AwsSsmPayload): AwsSsmEntry[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const fromPayload = payload.Parameters;
  if (Array.isArray(fromPayload)) {
    return fromPayload;
  }

  throw new Error("aws-ssm live runtime pull must return an array or { Parameters: [] } payload.");
}

async function readEntries(
  config: AwsSsmProviderConfig,
): Promise<{ entries: AwsSsmEntry[]; pages: number; mode: "snapshot" | "live" }> {
  const mode = resolveAwsRuntimeMode(config);

  if (mode === "live") {
    const pullParameters = config.liveRuntime?.pullParameters;
    if (typeof pullParameters !== "function") {
      throw new Error("aws-ssm live mode requires providerConfig.liveRuntime.pullParameters().");
    }

    const payload = await pullParameters();
    return { entries: readLiveEntries(payload), pages: 1, mode };
  }

  const payloads = await readAwsSnapshotPayloads(config, "aws-ssm");
  const entries = payloads.flatMap((payload) => (payload as AwsSsmPayload).Parameters ?? []);
  return { entries, pages: payloads.length, mode };
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
    const normalized = readEntryValue(entry);
    if (normalized.name === undefined) {
      warnings.push("SSM entry skipped because Name is missing.");
      continue;
    }

    const key = normalizeKey(normalized.name, providerConfig.parameterPathPrefix);
    values[key] = normalized.value ?? "";

    if (normalized.value === undefined) {
      warnings.push(`SSM entry ${normalized.name} has no value; defaulting to empty string.`);
    }
  }

  return {
    values,
    ...(warnings.length > 0 ? { warnings } : {}),
    metadata: {
      source: "aws-ssm",
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
      "aws-ssm adapter push is disabled. Set providerConfig.allowWrite=true to enable apply.",
    );
  }

  const mode = resolveAwsRuntimeMode(providerConfig);
  if (mode === "snapshot") {
    return buildSnapshotPushResult(
      values,
      "Snapshot mode: write simulated for deterministic apply.",
    );
  }

  const putParameter = providerConfig.liveRuntime?.putParameter;
  if (typeof putParameter !== "function") {
    throw new Error("aws-ssm live mode requires providerConfig.liveRuntime.putParameter().");
  }

  return applyLiveWrites(values, async (key, value) => {
    const prefix = providerConfig.parameterPathPrefix ?? "";
    const name = `${prefix}${key}`;
    await putParameter({ name, value });
  });
}

async function compare(
  _context: AdapterContext,
  localValues: EnvMap,
  remoteValues: EnvMap,
): Promise<AdapterCompareResult> {
  return compareMaps(localValues, remoteValues);
}

export const awsSsmAdapter: EnvAdapter = {
  name: "aws-ssm",
  pull,
  push,
  compare,
  meta: () => ({
    name: "aws-ssm",
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

export default awsSsmAdapter;
