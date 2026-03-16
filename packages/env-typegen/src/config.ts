import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { InferenceRule } from "./inferrer/rules.js";

export type { InferenceRule };

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
};

/** Config file names searched in order when calling loadConfig(). */
export const CONFIG_FILE_NAMES = [
  "env-typegen.config.ts",
  "env-typegen.config.mjs",
  "env-typegen.config.js",
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
      const fileUrl = pathToFileURL(filePath).href;
      const mod = (await import(fileUrl)) as { default?: EnvTypegenConfig };
      return mod.default;
    }
  }
  return undefined;
}
