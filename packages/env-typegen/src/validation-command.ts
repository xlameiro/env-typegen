import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { loadCloudSource, type CloudProvider } from "./cloud/connectors.js";
import { loadConfig, type EnvTypegenConfig } from "./config.js";
import { loadValidationContract } from "./contract.js";
import {
  applyContractPlugins,
  applyReportPlugins,
  applySourcePlugins,
  loadPlugins,
  type PluginReference,
} from "./plugins.js";
import {
  diffEnvironmentSources,
  buildDoctorReport,
  validateAgainstContract,
} from "./validation/engine.js";
import { loadEnvSource } from "./validation/env-source.js";
import { emitValidationReport } from "./validation/output.js";
import type { ValidationReport } from "./validation/types.js";

type ValidationCommand = "check" | "diff" | "doctor";
type JsonMode = "off" | "compact" | "pretty";

type ValidationArgValues = {
  env?: string[];
  targets?: string;
  contract?: string;
  example?: string;
  strict?: boolean;
  "no-strict"?: boolean;
  json?: boolean;
  "output-file"?: string;
  "debug-values"?: boolean;
  "cloud-provider"?: string;
  "cloud-file"?: string;
  plugin?: string[];
  config?: string;
  help?: boolean;
};

type ParsedValidationArgs = {
  values: ValidationArgValues;
  jsonMode: JsonMode;
};

type LoadCommandConfigModule = {
  default?: EnvTypegenConfig;
};

const HELP_TEXT: Record<ValidationCommand, string> = {
  check: [
    "Usage: env-typegen check [options]",
    "",
    "Options:",
    "  --env <path>              Environment file to validate (default: .env)",
    "  --contract <path>         Contract file path (default: env.contract.ts)",
    "  --example <path>          Fallback .env.example used to bootstrap contract",
    "  --strict                  Validate extras as errors (default: true)",
    "  --no-strict               Downgrade extras to warnings",
    "  --json                    Emit machine-readable JSON report",
    "  --json=pretty             Emit pretty JSON report",
    "  --output-file <path>      Persist JSON report to a file",
    "  --debug-values            Include raw values in issues (unsafe for CI logs)",
    "  --cloud-provider <name>   vercel | cloudflare | aws",
    "  --cloud-file <path>       Cloud snapshot JSON file",
    "  --plugin <path>           Plugin module path (repeatable)",
    "  -c, --config <path>       Config file path",
    "  -h, --help                Show this help",
  ].join("\n"),
  diff: [
    "Usage: env-typegen diff [options]",
    "",
    "Options:",
    "  --targets <list>          Comma-separated targets (default: .env,.env.example,.env.production)",
    "  --contract <path>         Contract file path (default: env.contract.ts)",
    "  --example <path>          Fallback .env.example used to bootstrap contract",
    "  --strict                  Validate extras as errors (default: true)",
    "  --no-strict               Downgrade extras to warnings",
    "  --json                    Emit machine-readable JSON report",
    "  --json=pretty             Emit pretty JSON report",
    "  --output-file <path>      Persist JSON report to a file",
    "  --debug-values            Include raw values in issues (unsafe for CI logs)",
    "  --cloud-provider <name>   vercel | cloudflare | aws",
    "  --cloud-file <path>       Cloud snapshot JSON file added to diff sources",
    "  --plugin <path>           Plugin module path (repeatable)",
    "  -c, --config <path>       Config file path",
    "  -h, --help                Show this help",
  ].join("\n"),
  doctor: [
    "Usage: env-typegen doctor [options]",
    "",
    "Options:",
    "  --env <path>              Environment file to validate (default: .env)",
    "  --targets <list>          Comma-separated targets for drift analysis",
    "  --contract <path>         Contract file path (default: env.contract.ts)",
    "  --example <path>          Fallback .env.example used to bootstrap contract",
    "  --strict                  Validate extras as errors (default: true)",
    "  --no-strict               Downgrade extras to warnings",
    "  --json                    Emit machine-readable JSON report",
    "  --json=pretty             Emit pretty JSON report",
    "  --output-file <path>      Persist JSON report to a file",
    "  --debug-values            Include raw values in issues (unsafe for CI logs)",
    "  --cloud-provider <name>   vercel | cloudflare | aws",
    "  --cloud-file <path>       Cloud snapshot JSON file",
    "  --plugin <path>           Plugin module path (repeatable)",
    "  -c, --config <path>       Config file path",
    "  -h, --help                Show this help",
  ].join("\n"),
};

function resolveConfigRelative(value: string | undefined, configDir: string): string | undefined {
  if (value === undefined || path.isAbsolute(value)) return value;
  return path.resolve(configDir, value);
}

function resolvePluginReference(reference: PluginReference, configDir: string): PluginReference {
  if (typeof reference === "string" && !path.isAbsolute(reference)) {
    return path.resolve(configDir, reference);
  }
  return reference;
}

function applyConfigPaths(config: EnvTypegenConfig, configDir: string): EnvTypegenConfig {
  let input: string | string[] | undefined;
  if (Array.isArray(config.input)) {
    input = config.input.map((item) => resolveConfigRelative(item, configDir) ?? item);
  } else {
    input = resolveConfigRelative(config.input, configDir);
  }
  const output = resolveConfigRelative(config.output, configDir);
  const schemaFile = resolveConfigRelative(config.schemaFile, configDir);

  return {
    ...config,
    ...(input !== undefined && { input }),
    ...(output !== undefined && { output }),
    ...(schemaFile !== undefined && { schemaFile }),
    ...(config.diffTargets !== undefined && {
      diffTargets: config.diffTargets.map(
        (target) => resolveConfigRelative(target, configDir) ?? target,
      ),
    }),
    ...(config.plugins !== undefined && {
      plugins: config.plugins.map((reference) => resolvePluginReference(reference, configDir)),
    }),
  };
}

async function loadCommandConfig(
  configPath: string | undefined,
): Promise<EnvTypegenConfig | undefined> {
  if (configPath === undefined) {
    return loadConfig(process.cwd());
  }

  const resolvedPath = path.resolve(configPath);
  const configDir = path.dirname(resolvedPath);
  const moduleValue = (await import(pathToFileURL(resolvedPath).href)) as LoadCommandConfigModule;
  if (moduleValue.default === undefined) return undefined;
  return applyConfigPaths(moduleValue.default, configDir);
}

function preprocessJsonArguments(argv: string[]): {
  normalizedArgs: string[];
  assignedMode: JsonMode;
} {
  const normalizedArgs: string[] = [];
  let assignedMode: JsonMode = "off";

  for (const item of argv) {
    if (item === "--json=pretty") {
      normalizedArgs.push("--json");
      assignedMode = "pretty";
      continue;
    }
    if (item === "--json=compact") {
      normalizedArgs.push("--json");
      assignedMode = "compact";
      continue;
    }
    normalizedArgs.push(item);
  }

  return { normalizedArgs, assignedMode };
}

function parseValidationArgs(argv: string[]): ParsedValidationArgs {
  const { normalizedArgs, assignedMode } = preprocessJsonArguments(argv);
  const { values } = parseArgs({
    args: normalizedArgs,
    options: {
      env: { type: "string", multiple: true },
      targets: { type: "string" },
      contract: { type: "string" },
      example: { type: "string" },
      strict: { type: "boolean" },
      "no-strict": { type: "boolean" },
      json: { type: "boolean" },
      "output-file": { type: "string" },
      "debug-values": { type: "boolean" },
      "cloud-provider": { type: "string" },
      "cloud-file": { type: "string" },
      plugin: { type: "string", multiple: true },
      config: { type: "string", short: "c" },
      help: { type: "boolean", short: "h" },
    } as const,
  });

  const castValues = values as ValidationArgValues;
  let jsonMode: JsonMode = "off";
  if (castValues.json === true) {
    jsonMode = assignedMode === "off" ? "compact" : assignedMode;
  }

  return { values: castValues, jsonMode };
}

function resolveStrict(
  values: ValidationArgValues,
  fileConfig: EnvTypegenConfig | undefined,
): boolean {
  if (values["no-strict"] === true) return false;
  if (values.strict !== undefined) return values.strict;
  if (fileConfig?.strict !== undefined) return fileConfig.strict;
  return true;
}

function parseCloudProvider(value: string | undefined): CloudProvider | undefined {
  if (value === undefined) return undefined;
  if (value === "vercel" || value === "cloudflare" || value === "aws") return value;
  throw new Error(`Unknown cloud provider: ${value}. Valid: vercel, cloudflare, aws`);
}

function parseTargets(
  values: ValidationArgValues,
  fileConfig: EnvTypegenConfig | undefined,
): string[] {
  const fromCli = values.targets;
  if (fromCli !== undefined) {
    return fromCli
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (fileConfig?.diffTargets !== undefined && fileConfig.diffTargets.length > 0) {
    return fileConfig.diffTargets;
  }

  return [".env", ".env.example", ".env.production"];
}

async function prepareCommonContext(values: ValidationArgValues): Promise<{
  fileConfig: EnvTypegenConfig | undefined;
  strict: boolean;
  debugValues: boolean;
  outputFile: string | undefined;
  contractPath: string | undefined;
  fallbackExamplePath: string;
  cloudProvider: CloudProvider | undefined;
  cloudFile: string | undefined;
  plugins: Awaited<ReturnType<typeof loadPlugins>>;
}> {
  const fileConfig = await loadCommandConfig(values.config);
  const strict = resolveStrict(values, fileConfig);
  const debugValues = values["debug-values"] ?? false;
  const contractPath = values.contract ?? fileConfig?.schemaFile;
  const fallbackExamplePath = values.example ?? ".env.example";
  const cloudProvider = parseCloudProvider(values["cloud-provider"]);
  const cloudFile = values["cloud-file"];
  const pluginLoadOptions = {
    pluginPaths: values.plugin ?? [],
    cwd: process.cwd(),
    ...(fileConfig?.plugins !== undefined && { configPlugins: fileConfig.plugins }),
  };
  const plugins = await loadPlugins(pluginLoadOptions);

  return {
    fileConfig,
    strict,
    debugValues,
    outputFile: values["output-file"],
    contractPath,
    fallbackExamplePath,
    cloudProvider,
    cloudFile,
    plugins,
  };
}

async function emitAndReturnExitCode(
  report: ValidationReport,
  params: {
    jsonMode: JsonMode;
    outputFile?: string;
  },
): Promise<number> {
  const emitOptions = {
    report,
    jsonMode: params.jsonMode,
    ...(params.outputFile !== undefined && { outputFile: params.outputFile }),
  };
  await emitValidationReport(emitOptions);
  return report.status === "fail" ? 1 : 0;
}

async function runCheckCommand(args: ParsedValidationArgs): Promise<number> {
  const context = await prepareCommonContext(args.values);
  const loadContractOptions = {
    fallbackExamplePath: context.fallbackExamplePath,
    cwd: process.cwd(),
    ...(context.contractPath !== undefined && { contractPath: context.contractPath }),
  };
  const contract = applyContractPlugins(
    await loadValidationContract(loadContractOptions),
    context.plugins,
  );

  const provider = context.cloudProvider;
  let environment = args.values.env?.[0] ?? ".env";
  let sourceValues: Record<string, string>;

  if (provider === undefined) {
    sourceValues = await loadEnvSource({ filePath: environment, allowMissing: true });
  } else {
    const cloudFile = context.cloudFile ?? `${provider}.env.json`;
    sourceValues = await loadCloudSource({ provider, filePath: cloudFile });
    environment = `cloud:${provider}`;
  }

  sourceValues = applySourcePlugins({ environment, values: sourceValues }, context.plugins);

  const report = applyReportPlugins(
    validateAgainstContract({
      contract,
      values: sourceValues,
      environment,
      strict: context.strict,
      debugValues: context.debugValues,
    }),
    context.plugins,
  );

  return emitAndReturnExitCode(report, {
    jsonMode: args.jsonMode,
    ...(context.outputFile !== undefined && { outputFile: context.outputFile }),
  });
}

async function runDiffCommand(args: ParsedValidationArgs): Promise<number> {
  const context = await prepareCommonContext(args.values);
  const loadContractOptions = {
    fallbackExamplePath: context.fallbackExamplePath,
    cwd: process.cwd(),
    ...(context.contractPath !== undefined && { contractPath: context.contractPath }),
  };
  const contract = applyContractPlugins(
    await loadValidationContract(loadContractOptions),
    context.plugins,
  );

  const sources: Record<string, Record<string, string>> = {};
  for (const target of parseTargets(args.values, context.fileConfig)) {
    const values = await loadEnvSource({ filePath: target, allowMissing: true });
    sources[target] = applySourcePlugins({ environment: target, values }, context.plugins);
  }

  if (context.cloudProvider !== undefined) {
    const cloudFile = context.cloudFile ?? `${context.cloudProvider}.env.json`;
    const cloudEnvironment = `cloud:${context.cloudProvider}`;
    const cloudValues = await loadCloudSource({
      provider: context.cloudProvider,
      filePath: cloudFile,
    });
    sources[cloudEnvironment] = applySourcePlugins(
      { environment: cloudEnvironment, values: cloudValues },
      context.plugins,
    );
  }

  const report = applyReportPlugins(
    diffEnvironmentSources({
      contract,
      sources,
      strict: context.strict,
      debugValues: context.debugValues,
    }),
    context.plugins,
  );

  return emitAndReturnExitCode(report, {
    jsonMode: args.jsonMode,
    ...(context.outputFile !== undefined && { outputFile: context.outputFile }),
  });
}

async function runDoctorCommand(args: ParsedValidationArgs): Promise<number> {
  const context = await prepareCommonContext(args.values);
  const loadContractOptions = {
    fallbackExamplePath: context.fallbackExamplePath,
    cwd: process.cwd(),
    ...(context.contractPath !== undefined && { contractPath: context.contractPath }),
  };
  const contract = applyContractPlugins(
    await loadValidationContract(loadContractOptions),
    context.plugins,
  );

  const checkEnvironment = args.values.env?.[0] ?? ".env";
  let checkValues = await loadEnvSource({ filePath: checkEnvironment, allowMissing: true });
  checkValues = applySourcePlugins(
    { environment: checkEnvironment, values: checkValues },
    context.plugins,
  );

  const checkReport = validateAgainstContract({
    contract,
    values: checkValues,
    environment: checkEnvironment,
    strict: context.strict,
    debugValues: context.debugValues,
  });

  const sources: Record<string, Record<string, string>> = {};
  for (const target of parseTargets(args.values, context.fileConfig)) {
    const values = await loadEnvSource({ filePath: target, allowMissing: true });
    sources[target] = applySourcePlugins({ environment: target, values }, context.plugins);
  }

  if (context.cloudProvider !== undefined) {
    const cloudFile = context.cloudFile ?? `${context.cloudProvider}.env.json`;
    const cloudEnvironment = `cloud:${context.cloudProvider}`;
    const cloudValues = await loadCloudSource({
      provider: context.cloudProvider,
      filePath: cloudFile,
    });
    sources[cloudEnvironment] = applySourcePlugins(
      { environment: cloudEnvironment, values: cloudValues },
      context.plugins,
    );
  }

  const diffReport = diffEnvironmentSources({
    contract,
    sources,
    strict: context.strict,
    debugValues: context.debugValues,
  });

  const report = applyReportPlugins(
    buildDoctorReport({ checkReport, diffReport }),
    context.plugins,
  );

  return emitAndReturnExitCode(report, {
    jsonMode: args.jsonMode,
    ...(context.outputFile !== undefined && { outputFile: context.outputFile }),
  });
}

export async function runValidationCommand(params: {
  command: ValidationCommand;
  argv: string[];
}): Promise<number> {
  const parsed = parseValidationArgs(params.argv);
  if (parsed.values.help === true) {
    console.log(HELP_TEXT[params.command]);
    return 0;
  }

  if (params.command === "check") {
    return runCheckCommand(parsed);
  }
  if (params.command === "diff") {
    return runDiffCommand(parsed);
  }
  return runDoctorCommand(parsed);
}
