import type { EnvVarType } from "./types.js";

/**
 * Structured annotations extracted from a JSDoc-style comment block
 * that precedes an env var declaration.
 *
 * @example
 * ```
 * # @description PostgreSQL connection string
 * # @required
 * # @type string
 * DATABASE_URL=
 * ```
 */
export type CommentAnnotations = {
  /** Type explicitly declared with `@type` in the comment block */
  annotatedType?: EnvVarType;

  /** Description from `@description` or the first free-form comment line */
  description?: string;

  /** true when the `@required` annotation is present in the comment block */
  isRequired: boolean;

  /** Allowed literal values from a `@enum` annotation (comma-separated list) */
  enumValues?: string[];

  /** Numeric range constraints from `@min` and/or `@max` annotations */
  constraints?: { min?: number; max?: number };

  /** Runtime scope from a `@runtime` annotation (`server` | `client` | `edge`) */
  runtime?: "server" | "client" | "edge";

  /** true when the `@secret` annotation is present — value must never appear in reports */
  isSecret?: boolean;
};

const VALID_ENV_VAR_TYPES = new Set<string>([
  "string",
  "number",
  "boolean",
  "url",
  "email",
  "semver",
  "json",
  "unknown",
]);

function isEnvVarType(value: string): value is EnvVarType {
  return VALID_ENV_VAR_TYPES.has(value);
}

/** Internal mutable accumulator used while processing annotation lines. */
type AnnotationState = {
  isRequired: boolean;
  annotatedType?: EnvVarType;
  description?: string;
  enumValues?: string[];
  minConstraint?: number;
  maxConstraint?: number;
  runtime?: "server" | "client" | "edge";
  isSecret?: boolean;
};

function applyTypeAnnotation(state: AnnotationState, content: string): void {
  const typeStr = content.slice("@type ".length).trim();
  if (isEnvVarType(typeStr)) state.annotatedType = typeStr;
}

function applyEnumAnnotation(state: AnnotationState, content: string): void {
  const values = content
    .slice("@enum ".length)
    .trim()
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (values.length > 0) state.enumValues = values;
}

function applyMinAnnotation(state: AnnotationState, content: string): void {
  const num = Number(content.slice("@min ".length).trim());
  if (Number.isFinite(num)) state.minConstraint = num;
}

function applyMaxAnnotation(state: AnnotationState, content: string): void {
  const num = Number(content.slice("@max ".length).trim());
  if (Number.isFinite(num)) state.maxConstraint = num;
}

function applyRuntimeAnnotation(state: AnnotationState, content: string): void {
  const scope = content.slice("@runtime ".length).trim();
  if (scope === "server" || scope === "client" || scope === "edge") {
    state.runtime = scope;
  }
}

function processAnnotationContent(state: AnnotationState, content: string): void {
  const trimmed = content.trim();
  if (trimmed === "@required") {
    state.isRequired = true;
    return;
  }
  if (trimmed === "@secret") {
    state.isSecret = true;
    return;
  }
  if (trimmed === "@optional") return;
  if (content.startsWith("@description ")) {
    state.description = content.slice("@description ".length).trim();
  } else if (content.startsWith("@type ")) {
    applyTypeAnnotation(state, content);
  } else if (content.startsWith("@enum ")) {
    applyEnumAnnotation(state, content);
  } else if (content.startsWith("@min ")) {
    applyMinAnnotation(state, content);
  } else if (content.startsWith("@max ")) {
    applyMaxAnnotation(state, content);
  } else if (content.startsWith("@runtime ")) {
    applyRuntimeAnnotation(state, content);
  } else if (state.description === undefined && trimmed.length > 0) {
    // First non-empty, non-annotation line is a fallback description
    state.description = trimmed;
  }
}

/**
 * Parse a block of consecutive comment lines (each starting with `#`) and
 * extract JSDoc-style annotations.
 *
 * Recognised annotations:
 * - `@description <text>` — sets the variable description
 * - `@required`           — marks the variable as required regardless of value
 * - `@optional`           — informational (isRequired stays false)
 * - `@type <EnvVarType>`  — overrides the inferred type
 * - `@enum val1,val2,...` — declares allowed literal values (comma-separated)
 * - `@min <number>`       — declares a numeric minimum constraint
 * - `@max <number>`       — declares a numeric maximum constraint
 * - `@runtime <scope>`    — declares runtime scope: `server` | `client` | `edge`
 * - `@secret`             — marks the value as sensitive (never logged or reported)
 *
 * Non-annotation comment lines act as a fallback description when no
 * `@description` annotation is present (first non-empty line wins).
 *
 * @param lines - Raw comment lines from the .env file, e.g. `["# @required"]`
 */
export function parseCommentBlock(lines: readonly string[]): CommentAnnotations {
  const state: AnnotationState = { isRequired: false };

  for (const line of lines) {
    processAnnotationContent(state, line.replace(/^#\s*/, "").trimEnd());
  }

  let constraints: { min?: number; max?: number } | undefined;
  if (state.minConstraint !== undefined || state.maxConstraint !== undefined) {
    constraints = {};
    if (state.minConstraint !== undefined) constraints.min = state.minConstraint;
    if (state.maxConstraint !== undefined) constraints.max = state.maxConstraint;
  }

  const result: CommentAnnotations = { isRequired: state.isRequired };
  if (state.annotatedType !== undefined) result.annotatedType = state.annotatedType;
  if (state.description !== undefined) result.description = state.description;
  if (state.enumValues !== undefined) result.enumValues = state.enumValues;
  if (constraints !== undefined) result.constraints = constraints;
  if (state.runtime !== undefined) result.runtime = state.runtime;
  if (state.isSecret !== undefined) result.isSecret = state.isSecret;
  return result;
}
