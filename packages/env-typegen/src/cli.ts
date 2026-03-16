// CLI entry point — shebang (#!/usr/bin/env node) is injected by tsup banner config.
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspect, parseArgs } from "node:util";

import { loadConfig, type EnvTypegenConfig, type GeneratorName } from "./config.js";
import { runGenerate, type RunGenerateOptions } from "./pipeline.js";
import { error } from "./utils/logger.js";
import { startWatch } from "./watch.js";

// Re-export for consumers who import programmatic API via this file
export { runGenerate } from "./pipeline.js";
export type { RunGenerateOptions } from "./pipeline.js";

const _require = createRequire(import.meta.url);
const VERSION = (_require("../package.json") as { version: string }).version;

const HELP_TEXT = [
  "env-typegen — Generate TypeScript types from .env.example",
  "",
  "Usage:",
  "  env-typegen -i <path> [options]",
  "",
  "Options:",
  "  -i, --input <path>         Path to .env.example file(s). May be specified multiple times.",
  "  -o, --output <path>        Output file path (default: env.generated.ts)",
  "  -f, --format <name>        Generator format: ts|zod|t3|declaration",
  "                             May be specified multiple times.",
  "  -g, --generator <name>     Backward-compatible alias for --format",
  "      --stdout               Print generated output to stdout",
  "      --dry-run              Parse and generate without writing files",
  "      --no-format            Disable prettier formatting",
  "  -s, --silent               Suppress success logs",
  "  -w, --watch                Watch for changes and regenerate",
  "  -c, --config <path>        Path to config file",
  "  -v, --version              Print version",
  "  -h, --help                 Show this help",
].join("\n");

const FORMAT_TO_GENERATOR: Readonly<Record<string, GeneratorName>> = {
  ts: "typescript",
  typescript: "typescript",
  zod: "zod",
  t3: "t3",
  declaration: "declaration",
};

function normalizeGenerator(input: string): GeneratorName | undefined {
  return FORMAT_TO_GENERATOR[input] ?? FORMAT_TO_GENERATOR[input.toLowerCase()];
}

function getErrorMessage(errorValue: unknown): string {
  if (errorValue instanceof Error) {
    return errorValue.message;
  }

  return inspect(errorValue, { depth: 2 });
}

/** Resolve a config-file path relative to the config file's directory when relative. */
function resolveConfigRelative(value: string | undefined, configDir: string): string | undefined {
  if (value === undefined || path.isAbsolute(value)) return value;
  return path.resolve(configDir, value);
}

/** Apply resolved (config-dir-relative) input/output paths onto a raw config object. */
function applyConfigPaths(config: EnvTypegenConfig, configDir: string): EnvTypegenConfig {
  let input: string | string[] | undefined;
  if (Array.isArray(config.input)) {
    input = config.input.map((v) => resolveConfigRelative(v, configDir) ?? v);
  } else {
    input = resolveConfigRelative(config.input, configDir);
  }
  const output = resolveConfigRelative(config.output, configDir);
  return {
    ...config,
    ...(input !== undefined && { input }),
    ...(output !== undefined && { output }),
  };
}

/**
 * Parses command-line arguments and runs the CLI.
 *
 * Exported for unit testing — pass a custom argv array to avoid reading
 * from process.argv.
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { values } = parseArgs({
    args: argv,
    options: {
      input: { type: "string", short: "i", multiple: true },
      output: { type: "string", short: "o" },
      generator: { type: "string", short: "g", multiple: true },
      format: { type: "string", short: "f", multiple: true },
      "no-format": { type: "boolean" },
      stdout: { type: "boolean" },
      "dry-run": { type: "boolean" },
      silent: { type: "boolean", short: "s" },
      watch: { type: "boolean", short: "w" },
      config: { type: "string", short: "c" },
      version: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    } as const,
  });

  if (values.version === true) {
    console.log(VERSION);
    return;
  }

  if (values.help === true) {
    console.log(HELP_TEXT);
    return;
  }

  // Load config file — explicit path from --config, or auto-discover in cwd
  let fileConfig: EnvTypegenConfig | undefined;
  if (values.config === undefined) {
    fileConfig = await loadConfig(process.cwd());
  } else {
    const configPath = path.resolve(values.config);
    const configDir = path.dirname(configPath);
    const mod = (await import(pathToFileURL(configPath).href)) as {
      default?: EnvTypegenConfig;
    };
    const rawConfig = mod.default;
    // Resolve input/output paths relative to the config file's directory so that
    // configs in subdirectories (e.g. config/env-typegen.config.mjs) work correctly.
    if (rawConfig) {
      fileConfig = applyConfigPaths(rawConfig, configDir);
    }
  }

  // Merge: CLI flags take precedence over config file values
  const cliInput = values.input?.length ? values.input : undefined;
  const input: string | string[] | undefined = cliInput ?? fileConfig?.input;
  if (input === undefined) {
    error("No input file specified. Use -i <path> or set input in env-typegen.config.ts");
    process.exit(1);
  }

  const output = values.output ?? fileConfig?.output ?? "env.generated.ts";

  // Collect and validate generators from --format (spec) and --generator (compat)
  const rawFormats = values.format;
  const rawGenerators = values.generator;

  const requested = [...(rawFormats ?? []), ...(rawGenerators ?? [])].map(String);
  let generators: GeneratorName[];
  if (requested.length > 0) {
    const normalizedGenerators = requested
      .map((item) => normalizeGenerator(item))
      .filter((item): item is GeneratorName => item !== undefined);

    const invalid = requested.filter((item) => normalizeGenerator(item) === undefined);
    if (invalid.length > 0) {
      error(`Unknown format(s): ${invalid.join(", ")}. Valid: ts, zod, t3, declaration`);
      process.exit(1);
    }

    generators = [...new Set(normalizedGenerators)];
  } else {
    generators =
      fileConfig?.generators ?? (["typescript", "zod", "t3", "declaration"] as GeneratorName[]);
  }

  const shouldFormat = values["no-format"] === true ? false : (fileConfig?.format ?? true);
  const useStdout = values.stdout ?? false;
  const isDryRun = values["dry-run"] ?? false;
  const isSilent = values.silent ?? false;
  const shouldWatch = values.watch ?? false;

  const options: RunGenerateOptions = {
    input,
    output,
    generators,
    format: shouldFormat,
    stdout: useStdout,
    dryRun: isDryRun,
    silent: isSilent,
    ...(fileConfig?.inferenceRules !== undefined && { inferenceRules: fileConfig.inferenceRules }),
  };

  if (shouldWatch) {
    startWatch({ inputPath: input, runOptions: options });
  } else {
    await runGenerate(options);
  }
}

// Only auto-execute when this file is the CLI entry point, not when imported.
// realpathSync resolves both sides so the comparison works when invoked via an
// npm .bin/ symlink (where process.argv[1] is the symlink, not the real file).
if (
  process.argv[1] !== undefined &&
  (() => {
    try {
      return (
        realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
      );
    } catch {
      return false;
    }
  })()
) {
  await runCli().catch((err: unknown) => {
    error(getErrorMessage(err));
    process.exit(1);
  });
}
