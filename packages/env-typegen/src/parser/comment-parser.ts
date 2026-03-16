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

/**
 * Parse a block of consecutive comment lines (each starting with `#`) and
 * extract JSDoc-style annotations.
 *
 * Recognised annotations:
 * - `@description <text>` — sets the variable description
 * - `@required`           — marks the variable as required regardless of value
 * - `@optional`           — informational (isRequired stays false)
 * - `@type <EnvVarType>`  — overrides the inferred type
 *
 * Non-annotation comment lines act as a fallback description when no
 * `@description` annotation is present (first non-empty line wins).
 *
 * @param lines - Raw comment lines from the .env file, e.g. `["# @required"]`
 */
export function parseCommentBlock(lines: readonly string[]): CommentAnnotations {
  let annotatedType: EnvVarType | undefined;
  let description: string | undefined;
  let isRequired = false;

  for (const line of lines) {
    // Strip the leading `#` and any trailing whitespace
    const content = line.replace(/^#\s*/, "").trimEnd();

    if (content.startsWith("@description ")) {
      description = content.slice("@description ".length).trim();
    } else if (content.startsWith("@type ")) {
      const typeStr = content.slice("@type ".length).trim();
      if (isEnvVarType(typeStr)) {
        annotatedType = typeStr;
      }
    } else if (content.trim() === "@required") {
      isRequired = true;
    } else if (content.trim() === "@optional") {
      // Informational only — isRequired stays false (which is already the default)
    } else if (description === undefined && content.trim().length > 0) {
      // First non-empty, non-annotation line is a fallback description
      description = content.trim();
    }
  }

  const result: CommentAnnotations = { isRequired };
  if (annotatedType !== undefined) result.annotatedType = annotatedType;
  if (description !== undefined) result.description = description;
  return result;
}
