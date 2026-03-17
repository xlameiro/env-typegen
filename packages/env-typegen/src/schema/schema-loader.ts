import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { EnvContract } from "./schema-model.js";

/**
 * Contract file names searched in order when calling {@link loadContract}.
 * BUG-01: .mjs and .js are searched before .ts — TypeScript files cannot be
 * loaded by Node.js import() at runtime without a loader like tsx or ts-node.
 * Discovering a .mjs file first prevents a confusing ERR_UNKNOWN_FILE_EXTENSION
 * failure when both .ts and .mjs files coexist in the same directory.
 */
export const CONTRACT_FILE_NAMES = [
  "env.contract.mjs",
  "env.contract.js",
  "env.contract.ts",
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
      // BUG-01: .ts files cannot be imported by Node.js at runtime without tsx / ts-node.
      // Produce an actionable error instead of the raw ERR_UNKNOWN_FILE_EXTENSION crash.
      if (filePath.endsWith(".ts")) {
        throw new Error(
          `Contract file ${filePath} is a TypeScript file and cannot be loaded at runtime by Node.js.\n` +
            `Rename it to ${filePath.replace(/\.ts$/, ".mjs")} and use ESM syntax (export default ...), ` +
            `or run via \`tsx\` / \`ts-node\` as a loader.`,
        );
      }
      const fileUrl = pathToFileURL(filePath).href;
      const mod = (await import(fileUrl)) as { default?: EnvContract };
      return mod.default;
    }
  }
  return undefined;
}
