import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { EnvContract } from "./schema-model.js";

/**
 * Contract file names searched in order when calling {@link loadContract}.
 * Mirrors the search strategy used by `loadConfig` in `config.ts`.
 */
export const CONTRACT_FILE_NAMES = [
  "env.contract.ts",
  "env.contract.mjs",
  "env.contract.js",
] as const;

/**
 * Type-safe contract factory. Returns the contract object unchanged — exists
 * purely for IDE autocompletion and compile-time validation of the contract shape.
 *
 * Use this in your `env.contract.ts` file:
 *
 * @example
 * ```ts
 * // env.contract.ts
 * import { defineContract } from "@xlameiro/env-typegen";
 *
 * export default defineContract({
 *   vars: [
 *     { name: "DATABASE_URL", expectedType: "url", required: true, isSecret: true },
 *     { name: "PORT", expectedType: "number", required: false, default: "3000" },
 *     {
 *       name: "NODE_ENV",
 *       expectedType: "string",
 *       required: true,
 *       enumValues: ["development", "staging", "production"],
 *     },
 *   ],
 * });
 * ```
 *
 * @public
 */
export function defineContract(contract: EnvContract): EnvContract {
  return contract;
}

/**
 * Loads an env contract by searching for a contract file starting from `cwd`.
 *
 * Search order: `env.contract.ts` → `env.contract.mjs` → `env.contract.js`
 *
 * Returns `undefined` when no contract file is found. The contract file must
 * use a default export of an {@link EnvContract} object, typically produced
 * by {@link defineContract}.
 *
 * @param cwd - Directory to start searching from. Defaults to `process.cwd()`.
 *
 * @public
 */
export async function loadContract(cwd: string = process.cwd()): Promise<EnvContract | undefined> {
  for (const name of CONTRACT_FILE_NAMES) {
    const filePath = path.resolve(cwd, name);
    if (existsSync(filePath)) {
      const fileUrl = pathToFileURL(filePath).href;
      const mod = (await import(fileUrl)) as { default?: EnvContract };
      return mod.default;
    }
  }
  return undefined;
}
