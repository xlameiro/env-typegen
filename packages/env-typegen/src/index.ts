/**
 * env-typegen — programmatic API
 *
 * Parse `.env.example` files, infer types, and generate TypeScript interfaces,
 * Zod v4 schemas, `@t3-oss/env-nextjs` configuration, or `.d.ts` declaration
 * files. Can also be driven end-to-end via {@link runGenerate}.
 *
 * @example
 * ```ts
 * import { parseEnvFile, generateTypeScriptTypes } from "@xlameiro/env-typegen";
 *
 * const parsed = parseEnvFile(".env.example");
 * const ts = generateTypeScriptTypes(parsed);
 * console.log(ts);
 * ```
 *
 * @module
 */

/**
 * Core domain types shared across the public API.
 * - {@link EnvVarType} — inferred primitive type for an env var (`string` | `number` | `boolean` | `url` | `email`)
 * - {@link ParsedEnvVar} — single parsed entry (name, raw value, inferred type, JSDoc annotations)
 * - {@link ParsedEnvFile} — collection of {@link ParsedEnvVar} entries produced by the parser
 */
export type { EnvVarType, ParsedEnvFile, ParsedEnvVar } from "./parser/types.js";

/**
 * Parse a JSDoc annotation block that appears above an env var assignment.
 *
 * @example
 * ```ts
 * const annotations = parseCommentBlock("# @type {string}\n# @description API base URL");
 * ```
 */
export { parseCommentBlock } from "./parser/comment-parser.js";

/** Structured JSDoc annotations extracted from a comment block above an env var. */
export type { CommentAnnotations } from "./parser/comment-parser.js";

/**
 * Read and parse a `.env.example` file from disk.
 * - {@link parseEnvFile} — reads a file by path, then delegates to `parseEnvFileContent`
 * - {@link parseEnvFileContent} — parses a raw string; useful in tests or when content is already in memory
 * - {@link inferType} — infer the {@link EnvVarType} for a single raw env value
 */
export { inferenceRules } from "./inferrer/rules.js";
export type { InferenceRule } from "./inferrer/rules.js";
export { inferType, inferTypesFromParsedVars as inferTypes } from "./inferrer/type-inferrer.js";
export { parseEnvFile, parseEnvFileContent } from "./parser/env-parser.js";

/**
 * Generate a TypeScript source file declaring env var types.
 * - {@link generateTypeScriptTypes} — produces a `type Env = { ... }` declaration
 * - {@link generateEnvValidation} — produces a runtime validation helper alongside the type
 */
export {
  generateEnvValidation,
  generateTypeScriptTypes,
} from "./generators/typescript-generator.js";

/**
 * Generate a Zod v4 schema from a parsed env file.
 *
 * Numeric values become `z.coerce.number()`, booleans become `z.coerce.boolean()`,
 * URLs become `z.string().url()`, emails become `z.string().email()`.
 */
export { generateZodSchema } from "./generators/zod-generator.js";

/**
 * Generate a TypeScript `.d.ts` declaration file that augments `NodeJS.ProcessEnv`
 * with the parsed env vars.
 */
export { generateDeclaration } from "./generators/declaration-generator.js";

/**
 * Generate a `@t3-oss/env-nextjs` `createEnv` call from a parsed env file.
 * Splits vars into `server` and `client` (prefixed `NEXT_PUBLIC_*`) buckets automatically.
 */
export { generateT3Env } from "./generators/t3-generator.js";

/**
 * Configuration API — define and load `env-typegen.config.ts` / `env-typegen.config.js`.
 * - {@link defineConfig} — type-safe config factory (identity function for inference)
 * - {@link loadConfig} — searches for a config file starting from a given directory
 */
export { defineConfig, loadConfig } from "./config.js";

/**
 * Configuration types.
 * - {@link EnvTypegenConfig} — full config object shape; all fields optional
 * - {@link GeneratorName} — union of valid generator ids: `'typescript' | 'zod' | 't3' | 'declaration'`
 */
export type { EnvTypegenConfig, GeneratorName } from "./config.js";

/**
 * Run the full generate pipeline programmatically.
 *
 * Reads the input file, runs the requested generators, optionally formats with
 * Prettier, writes output to disk, and logs a success message.
 *
 * @example
 * ```ts
 * import { runGenerate } from "@xlameiro/env-typegen";
 *
 * await runGenerate({
 *   input: ".env.example",
 *   output: "src/env.generated.ts",
 *   generators: ["typescript", "zod"],
 *   format: true,
 * });
 * ```
 */
export { runGenerate } from "./pipeline.js";

/**
 * Options accepted by {@link runGenerate}.
 *
 * - `input` — path to the source `.env.example` file
 * - `output` — base path for the generated file(s); when multiple generators are
 *   specified the generator name is inserted before the extension
 * - `generators` — one or more generator ids to run
 * - `format` — when `true`, the output is formatted with Prettier before writing
 */
export type { RunGenerateOptions } from "./pipeline.js";
