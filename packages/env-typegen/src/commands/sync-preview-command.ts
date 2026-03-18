import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { loadAdapter } from "../adapters/loader.js";
import type { EnvMap } from "../adapters/types.js";
import { loadConfig, type EnvTypegenConfig } from "../config.js";
import { evaluatePolicy } from "../policy/policy-evaluator.js";
import { formatSyncPreviewOutput } from "../reporting/policy-report.js";
import { buildChangeSetFromMaps, calculateChangeSetHash } from "../sync/change-set.js";
import { createPreflightProof } from "../sync/preflight-proof.js";
import { createPreflightAttestation } from "../trust/preflight-attestation.js";
import { loadEnvSource } from "../validation/env-source.js";
import type { ValidationReport } from "../validation/types.js";

type SyncPreviewArgValues = {
  provider?: string;
  env?: string;
  "env-file"?: string;
  config?: string;
  json?: boolean;
  help?: boolean;
};

type LoadConfigModule = {
  default?: EnvTypegenConfig;
};

const SYNC_PREVIEW_HELP_TEXT = [
  "Usage: env-typegen sync-preview <provider> [options]",
  "",
  "Options:",
  "  --provider <name>         Provider name (fallback if positional omitted)",
  "  --env <name>              Logical environment (default: development)",
  "  --env-file <path>         Local env file to compare (default: .env)",
  "  -c, --config <path>       Config file path",
  "  --json                    Emit machine-readable JSON output",
  "  -h, --help                Show this help",
  "",
  "Exit codes:",
  "  0  Preview completed with allow/warn policy decision",
  "  1  Preview completed with block policy decision or invalid usage",
].join("\n");

function resolveProviderName(values: SyncPreviewArgValues, positionals: string[]): string {
  const providerName = values.provider ?? positionals[0];
  if (providerName === undefined || providerName.trim().length === 0) {
    throw new Error("Provider is required. Use `env-typegen sync-preview <provider>`.");
  }
  return providerName;
}

async function loadSyncPreviewConfig(
  configPath: string | undefined,
): Promise<EnvTypegenConfig | undefined> {
  if (configPath === undefined) {
    return loadConfig(process.cwd());
  }

  const resolvedPath = path.resolve(configPath);
  if (!existsSync(resolvedPath)) {
    const displayPath = path.isAbsolute(configPath)
      ? configPath
      : `${configPath} (resolved: ${resolvedPath})`;
    throw new Error(`Config file not found: ${displayPath}`);
  }

  const moduleValue = (await import(pathToFileURL(resolvedPath).href)) as LoadConfigModule;
  return moduleValue.default;
}

function createDriftReport(params: {
  environment: string;
  localValues: EnvMap;
  remoteValues: EnvMap;
}): {
  report: ValidationReport;
  missingInRemote: string[];
  extraInRemote: string[];
  mismatches: string[];
} {
  const localKeys = Object.keys(params.localValues).sort((left, right) =>
    left.localeCompare(right),
  );
  const remoteKeys = Object.keys(params.remoteValues).sort((left, right) =>
    left.localeCompare(right),
  );

  const remoteSet = new Set(remoteKeys);
  const localSet = new Set(localKeys);

  const missingInRemote = localKeys.filter((key) => !remoteSet.has(key));
  const extraInRemote = remoteKeys.filter((key) => !localSet.has(key));
  const mismatches = localKeys
    .filter((key) => remoteSet.has(key))
    .filter((key) => (params.localValues[key] ?? "") !== (params.remoteValues[key] ?? ""))
    .sort((left, right) => left.localeCompare(right));

  const issues = [
    ...missingInRemote.map((key) => ({
      code: "ENV_MISSING" as const,
      type: "missing" as const,
      severity: "warning" as const,
      key,
      environment: params.environment,
      message: `Variable ${key} is missing in remote source.`,
      value: null,
    })),
    ...extraInRemote.map((key) => ({
      code: "ENV_EXTRA" as const,
      type: "extra" as const,
      severity: "warning" as const,
      key,
      environment: params.environment,
      message: `Variable ${key} exists only in remote source.`,
      value: null,
    })),
    ...mismatches.map((key) => ({
      code: "ENV_INVALID_VALUE" as const,
      type: "invalid_value" as const,
      severity: "warning" as const,
      key,
      environment: params.environment,
      message: `Variable ${key} differs between local and remote values.`,
      value: null,
    })),
  ];

  const report: ValidationReport = {
    schemaVersion: 1,
    status: issues.length > 0 ? "fail" : "ok",
    summary: {
      errors: 0,
      warnings: issues.length,
      total: issues.length,
    },
    issues,
    meta: {
      env: params.environment,
      timestamp: new Date().toISOString(),
    },
    recommendations: issues.length
      ? [
          "Review sync drift before any write operation.",
          "Resolve missing, extra, and mismatched variables before production sync.",
        ]
      : ["No drift detected between local and remote sources."],
  };

  return { report, missingInRemote, extraInRemote, mismatches };
}

export async function runSyncPreviewCommand(argv: string[]): Promise<number> {
  const parsed = parseArgs({
    args: argv,
    options: {
      provider: { type: "string" },
      env: { type: "string" },
      "env-file": { type: "string" },
      config: { type: "string", short: "c" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    } as const,
    allowPositionals: true,
  });

  const values = parsed.values as SyncPreviewArgValues;
  if (values.help === true) {
    console.log(SYNC_PREVIEW_HELP_TEXT);
    return 0;
  }

  try {
    const providerName = resolveProviderName(values, parsed.positionals);
    const environment = values.env ?? "development";
    const envFile = values["env-file"] ?? ".env";

    const config = await loadSyncPreviewConfig(values.config);
    const providerConfig = config?.providers?.[providerName];
    if (providerConfig === undefined) {
      throw new Error(`Provider "${providerName}" is not configured in env-typegen config.`);
    }

    const adapter = await loadAdapter(providerConfig.adapter, { cwd: process.cwd() });
    const remote = await adapter.pull({
      environment,
      ...(providerConfig.projectId !== undefined && { projectId: providerConfig.projectId }),
      ...(providerConfig.token !== undefined && { token: providerConfig.token }),
      ...(providerConfig.options !== undefined && { providerConfig: providerConfig.options }),
      redactValues: true,
    });

    const local = await loadEnvSource({ filePath: envFile, allowMissing: true });
    const drift = createDriftReport({
      environment: `remote:${providerName}/${environment}`,
      localValues: local,
      remoteValues: remote.values,
    });
    const changeSet = buildChangeSetFromMaps({
      localValues: local,
      remoteValues: remote.values,
    });
    const changeSetHash = calculateChangeSetHash(changeSet);
    const policy = evaluatePolicy(drift.report, config?.policy);
    const preflightProof = createPreflightProof({
      command: "sync-preview",
      provider: providerName,
      environment,
      changeSetHash,
      policyDecision: policy.decision,
    });
    const preflightAttestation = createPreflightAttestation({
      command: "sync-preview",
      provider: providerName,
      environment,
      changeSetHash,
      policyDecision: policy.decision,
      correlationId: `sync-preview:${providerName}:${environment}:${changeSetHash}`,
    });

    if (values.json === true) {
      process.stdout.write(
        `${JSON.stringify({
          command: "sync-preview",
          provider: providerName,
          environment,
          missingInRemote: drift.missingInRemote,
          extraInRemote: drift.extraInRemote,
          mismatches: drift.mismatches,
          changeSet,
          changeSetHash,
          preflightProof,
          preflightAttestation,
          summary: drift.report.summary,
          policy,
          adapterWarnings: remote.warnings ?? [],
        })}\n`,
      );
    } else {
      process.stdout.write(
        formatSyncPreviewOutput({
          provider: providerName,
          environment,
          missingInRemote: drift.missingInRemote,
          extraInRemote: drift.extraInRemote,
          mismatches: drift.mismatches,
          policy,
        }),
      );
    }

    return policy.decision === "block" ? 1 : 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`env-typegen sync-preview: ${message}\n`);
    return 1;
  }
}
