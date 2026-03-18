import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { loadAdapter } from "../adapters/loader.js";
import { loadConfig, type EnvTypegenConfig } from "../config.js";

type PullArgValues = {
  provider?: string;
  env?: string;
  config?: string;
  json?: boolean;
  help?: boolean;
};

type LoadConfigModule = {
  default?: EnvTypegenConfig;
};

const PULL_HELP_TEXT = [
  "Usage: env-typegen pull <provider> [options]",
  "",
  "Options:",
  "  --provider <name>         Provider name (fallback if positional is omitted)",
  "  --env <name>              Logical environment (default: development)",
  "  -c, --config <path>       Config file path",
  "  --json                    Emit machine-readable JSON output",
  "  -h, --help                Show this help",
  "",
  "Exit codes:",
  "  0  Pull completed successfully",
  "  1  Pull failed (config, adapter, or provider error)",
].join("\n");

function resolveProviderName(values: PullArgValues, positionals: string[]): string {
  const providerName = values.provider ?? positionals[0];
  if (providerName === undefined || providerName.trim().length === 0) {
    throw new Error("Provider is required. Use `env-typegen pull <provider>`.");
  }
  return providerName;
}

async function loadPullConfig(
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

function formatHumanOutput(params: {
  providerName: string;
  environment: string;
  keys: string[];
}): string {
  const lines: string[] = [];
  lines.push(
    `Pulled ${params.keys.length} variable(s) from ${params.providerName} (${params.environment}).`,
  );
  if (params.keys.length > 0) {
    lines.push("", "Keys:");
    for (const key of params.keys) {
      lines.push(`- ${key}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export async function runPullCommand(argv: string[]): Promise<number> {
  const parsedArgs = parseArgs({
    args: argv,
    options: {
      provider: { type: "string" },
      env: { type: "string" },
      config: { type: "string", short: "c" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    } as const,
    allowPositionals: true,
  });

  const values = parsedArgs.values as PullArgValues;
  if (values.help === true) {
    console.log(PULL_HELP_TEXT);
    return 0;
  }

  try {
    const providerName = resolveProviderName(values, parsedArgs.positionals);
    const environment = values.env ?? "development";

    const config = await loadPullConfig(values.config);
    const providerConfig = config?.providers?.[providerName];
    if (providerConfig === undefined) {
      throw new Error(`Provider "${providerName}" is not configured in env-typegen config.`);
    }

    const pullContext = {
      environment,
      redactValues: true,
      ...(providerConfig.projectId !== undefined && { projectId: providerConfig.projectId }),
      ...(providerConfig.token !== undefined && { token: providerConfig.token }),
      ...(providerConfig.options !== undefined && { providerConfig: providerConfig.options }),
    };

    const adapter = await loadAdapter(providerConfig.adapter, { cwd: process.cwd() });
    const pullResult = await adapter.pull(pullContext);

    const keys = Object.keys(pullResult.values).sort((left, right) => left.localeCompare(right));

    if (values.json === true) {
      const jsonPayload: Record<string, unknown> = {
        provider: providerName,
        environment,
        keys,
        count: keys.length,
      };
      if (pullResult.warnings !== undefined && pullResult.warnings.length > 0) {
        jsonPayload.warnings = pullResult.warnings;
      }
      process.stdout.write(`${JSON.stringify(jsonPayload)}\n`);
      return 0;
    }

    process.stdout.write(formatHumanOutput({ providerName, environment, keys }));
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`env-typegen pull: ${message}\n`);
    return 1;
  }
}
