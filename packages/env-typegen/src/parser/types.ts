/**
 * Supported TypeScript types that env-typegen can infer or generate.
 * The inference engine maps each .env.example value to one of these.
 */
export type EnvVarType =
  | "string"
  | "number"
  | "boolean"
  | "url"
  | "email"
  | "semver"
  | "json"
  | "unknown";

/**
 * A single parsed environment variable from a .env.example file.
 * Produced by the parser after reading and associating comment blocks.
 */
export type ParsedEnvVar = {
  /** The variable name as written in .env.example (e.g. DATABASE_URL) */
  key: string;

  /** Raw string value from .env.example before any processing */
  rawValue: string;

  /** Type inferred by the inference engine from key pattern and value */
  inferredType: EnvVarType;

  /** Type explicitly declared with @type in a preceding JSDoc comment block */
  annotatedType?: EnvVarType;

  /** Description from @description annotation or a free-form comment on the preceding line */
  description?: string;

  /** true when the value is non-empty OR the variable has @required annotation */
  isRequired: boolean;

  /** true when the value is empty and there is no @required annotation */
  isOptional: boolean;

  /** true when the key starts with NEXT_PUBLIC_ */
  isClientSide: boolean;

  /** Nearest enclosing section header, e.g. "--- Auth ---" → "Auth" */
  group?: string;

  /** 1-based line number of the KEY=VALUE line in the source file */
  lineNumber: number;

  /** Allowed literal values from a `@enum` annotation (e.g. `["development", "staging", "production"]`). */
  enumValues?: string[];

  /** Numeric range constraints from `@min` / `@max` annotations. */
  constraints?: { min?: number; max?: number };

  /** Runtime scope from a `@runtime` annotation (`server` | `client` | `edge`). */
  runtime?: "server" | "client" | "edge";

  /**
   * When true, the variable's value must never appear in reports or generated
   * output — declared via a `@secret` annotation.
   */
  isSecret?: boolean;
};

/**
 * A non-fatal issue detected during parsing (e.g. a duplicate key).
 * Collected in {@link ParsedEnvFile.warnings} when the parser encounters
 * degenerate-but-valid input.
 */
export type ParsedEnvWarning = {
  /** Machine-readable code for programmatic handling. */
  code: "ENV_DUPLICATE_KEY";
  /** Human-readable description of the issue. */
  message: string;
  /** 1-based line number of the earlier (discarded) occurrence. */
  line: number;
  /** The duplicated variable name. */
  key: string;
};

/**
 * The complete result of parsing a single .env.example file.
 * Passed to generators to produce TypeScript / Zod / t3-env output.
 */
export type ParsedEnvFile = {
  /** Resolved absolute path to the source .env.example file */
  filePath: string;

  /** All parsed variables in source order */
  vars: ParsedEnvVar[];

  /** Unique group names found in the file, in order of appearance */
  groups: string[];

  /**
   * Non-fatal issues detected during parsing (e.g. duplicate keys).
   * Undefined when no issues were found so the field is omitted in clean parses.
   */
  warnings?: ParsedEnvWarning[];
};
