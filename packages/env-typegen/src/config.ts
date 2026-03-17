import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { InferenceRule } from "./inferrer/rules.js";
import type { PluginReference } from "./plugins.js";

export type { InferenceRule } from "./inferrer/rules.js";
export type { PluginReference } from "./plugins.js";

/** Generator identifiers supported by env-typegen. */
export type GeneratorName = "typescript" | "zod" | "t3" | "declaration";

/** Configuration shape accepted by env-typegen's CLI and programmatic API. */
export type EnvTypegenConfig = {
  /** Path(s) to the .env.example file(s) to parse. */
  input: string | string[];
  /** Output directory for generated files. Defaults to the input file's directory. */
  output?: string;
  /** Which generators to run. When omitted, all four generators run. */
  generators?: GeneratorName[];
  /** Format generated output with prettier. Defaults to true. */
  format?: boolean;
  /**
   * Additional inference rules to prepend before the built-in rules.
   * Rules are matched in ascending priority order; lower numbers win.
   */
  inferenceRules?: InferenceRule[];

  /**
   * Path to the contract file (`env.contract.ts`).
   * When provided, the contract is the authoritative source of type information.
   * Relative to the config file directory or `process.cwd()`.
   */
  schemaFile?: string;

  /**
   * When `true`, variables absent from the contract emit errors rather than warnings.
   * Defaults to `true`.
   */
  strict?: boolean;

  /**
   * Resolution strategy for type information.
   * - `"legacy"` (default): inference-first; annotations override inferred types.
   * - `"contract-first"`: contract is authoritative; inference is a fallback only.
   */
  schemaMode?: "legacy" | "contract-first";

  /** Default target files for `env-typegen diff` when --targets is omitted. */
  diffTargets?: string[];

  /** Plugin references (module paths or plugin objects). */
  plugins?: PluginReference[];
};

/** Config file names searched in order when calling loadConfig(). */
export const CONFIG_FILE_NAMES = [
  "env-typegen.config.mjs",
  "env-typegen.config.js",
  "env-typegen.config.ts",
] as const;

/**
 * Type-safe config helper.
 * Returns the config object unchanged — exists purely for IDE autocompletion
 * and compile-time validation of the config shape.
 */
export function defineConfig(config: EnvTypegenConfig): EnvTypegenConfig {
  return config;
}

/**
 * Loads env-typegen config by searching for a config file in `cwd`.
 * Searches for env-typegen.config.ts → .mjs → .js in order.
 * Returns `undefined` when no config file is found.
 */
export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<EnvTypegenConfig | undefined> {
  for (const name of CONFIG_FILE_NAMES) {
    const filePath = path.resolve(cwd, name);
    if (existsSync(filePath)) {
      // Node.js cannot import TypeScript files natively — attempting import()
      // on a .ts path throws "Unknown file extension .ts" and crashes every command.
      // Detect early and emit an actionable error instead.
      if (filePath.endsWith(".ts")) {
        throw new Error(
          `Config file "${name}" was found but TypeScript files cannot be loaded directly at runtime.\n` +
            `Rename it to "env-typegen.config.mjs" and use ESM export syntax:\n\n` +
            `  // env-typegen.config.mjs\n` +
            `  import { defineConfig } from "@xlameiro/env-typegen";\n` +
            `  export default defineConfig({ input: ".env.example" });\n\n` +
            `Tip: keep env-typegen.config.ts for IDE autocompletion and create a sibling\n` +
            `env-typegen.config.mjs for runtime loading.`,
        );
      }
      const fileUrl = pathToFileURL(filePath).href;
      const mod = (await import(fileUrl)) as { default?: EnvTypegenConfig };
      return mod.default;
    }
  }
  return undefined;
}
