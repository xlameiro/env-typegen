import { readFileSync } from "node:fs";

import type { InferenceRule } from "../inferrer/rules.js";
import { inferType } from "../inferrer/type-inferrer.js";
import { parseCommentBlock } from "./comment-parser.js";
import type { ParsedEnvFile, ParsedEnvVar, ParsedEnvWarning } from "./types.js";

export { inferType } from "../inferrer/type-inferrer.js";

/** Options forwarded to the type-inference step during parsing. */
type ParseOptions = {
  /** Additional inference rules to evaluate before the built-in rules. */
  inferenceRules?: InferenceRule[];
};

/** Matches a valid env var declaration: KEY=VALUE (value may be empty) */
const ENV_VAR_RE = /^([A-Z_][A-Z0-9_]*)=(.*)$/;

/**
 * Matches a section header comment of the form:
 * `# --- SectionName ---` or `# === SectionName ===`
 *
 * `\S+(?:\s+\S+)*` replaces `.+?` so that the non-whitespace word tokens
 * cannot overlap with the surrounding `\s+` groups, eliminating the
 * super-linear backtracking that `.+?` combined with `\s+` can trigger.
 */
const SECTION_HEADER_RE = /^#\s+[-=]{3,}\s+(\S+(?:\s+\S+)*)\s+[-=]{3,}\s*$/;

/**
 * Builds a {@link ParsedEnvVar} from a matched env-var line.
 * Extracted from `parseEnvFileContent` to reduce cognitive complexity.
 */
function buildParsedVar(
  params: { key: string; rawValue: string; lineNumber: number; currentGroup: string | undefined },
  commentBlock: string[],
  options: ParseOptions | undefined,
): ParsedEnvVar {
  const annotations = parseCommentBlock(commentBlock);
  // Capture once so TypeScript can narrow the type in the spread below.
  const extraRules = options?.inferenceRules;
  const inferredType = inferType(
    params.key,
    params.rawValue,
    ...(extraRules === undefined ? [] : [{ extraRules }]),
  );
  const isRequired = params.rawValue.length > 0 || annotations.isRequired;
  const isOptional = params.rawValue.length === 0 && !annotations.isRequired;
  const isClientSide = params.key.startsWith("NEXT_PUBLIC_");

  const parsedVar: ParsedEnvVar = {
    key: params.key,
    rawValue: params.rawValue,
    inferredType,
    isRequired,
    isOptional,
    isClientSide,
    lineNumber: params.lineNumber,
  };

  // Only set optional fields when they have a value (exactOptionalPropertyTypes)
  if (annotations.annotatedType !== undefined) {
    parsedVar.annotatedType = annotations.annotatedType;
  }
  if (annotations.description !== undefined) {
    parsedVar.description = annotations.description;
  }
  if (params.currentGroup !== undefined) {
    parsedVar.group = params.currentGroup;
  }
  if (annotations.enumValues !== undefined) {
    parsedVar.enumValues = annotations.enumValues;
  }
  if (annotations.constraints !== undefined) {
    parsedVar.constraints = annotations.constraints;
  }
  if (annotations.runtime !== undefined) {
    parsedVar.runtime = annotations.runtime;
  }
  if (annotations.isSecret !== undefined) {
    parsedVar.isSecret = annotations.isSecret;
  }

  return parsedVar;
}

/**
 * Deduplicate parsed variables with last-wins semantics (mirrors dotenv
 * behaviour). Returns both the deduplicated list and any
 * `ENV_DUPLICATE_KEY` warnings for callers to surface to the user.
 *
 * Extracted from `parseEnvFileContent` to reduce its cognitive complexity.
 */
function deduplicateVars(vars: ParsedEnvVar[]): {
  deduped: ParsedEnvVar[];
  warnings: ParsedEnvWarning[];
} {
  const seenKeys = new Set<string>();
  const deduped: ParsedEnvVar[] = [];
  const warnings: ParsedEnvWarning[] = [];
  for (let i = vars.length - 1; i >= 0; i--) {
    const variable = vars[i];
    if (variable === undefined) continue;
    if (seenKeys.has(variable.key)) {
      // This earlier occurrence is discarded (last-wins) — emit a warning.
      warnings.push({
        code: "ENV_DUPLICATE_KEY",
        message: `Duplicate key "${variable.key}" at line ${variable.lineNumber} — last occurrence wins.`,
        line: variable.lineNumber,
        key: variable.key,
      });
    } else {
      seenKeys.add(variable.key);
      deduped.unshift(variable);
    }
  }
  return { deduped, warnings };
}

/**
 * Parse the string content of a `.env.example` file into a `ParsedEnvFile`.
 *
 * Exposed separately from `parseEnvFile` to enable unit testing without
 * filesystem access.
 *
 * @param content  - Raw file content as a UTF-8 string
 * @param filePath - Used to populate `ParsedEnvFile.filePath` only
 * @param options  - Optional parse configuration (custom inference rules)
 */
export function parseEnvFileContent(
  content: string,
  filePath: string,
  options?: ParseOptions,
): ParsedEnvFile {
  const lines = content.split("\n");
  const vars: ParsedEnvVar[] = [];
  const groups: string[] = [];

  let currentGroup: string | undefined;
  let commentBlock: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNumber = i + 1;
    const trimmed = line.trim();

    // Blank line — break the comment block association
    if (trimmed === "") {
      commentBlock = [];
      continue;
    }

    // Section header — update current group and reset comment block
    const sectionMatch = SECTION_HEADER_RE.exec(trimmed);
    if (sectionMatch !== null) {
      const groupName = (sectionMatch[1] ?? "").trim();
      currentGroup = groupName;
      if (!groups.includes(groupName)) {
        groups.push(groupName);
      }
      commentBlock = [];
      continue;
    }

    // Comment line — accumulate for the next env var
    if (trimmed.startsWith("#")) {
      commentBlock.push(line);
      continue;
    }

    // Env var declaration
    const envMatch = ENV_VAR_RE.exec(trimmed);
    if (envMatch === null) {
      // Unrecognised line — reset comment block
      commentBlock = [];
      continue;
    }

    vars.push(
      buildParsedVar(
        { key: envMatch[1] ?? "", rawValue: envMatch[2] ?? "", lineNumber, currentGroup },
        commentBlock,
        options,
      ),
    );
    commentBlock = [];
  }

  // BUG-06: deduplicate keys — last-wins mirrors dotenv behaviour and prevents
  // "Duplicate identifier" TypeScript errors in generated output.
  // See deduplicateVars() for ENV_DUPLICATE_KEY warning collection.
  const { deduped, warnings } = deduplicateVars(vars);

  return {
    filePath,
    vars: deduped,
    groups,
    ...(warnings.length > 0 && { warnings }),
  };
}

/**
 * Read and parse a `.env.example` file from disk.
 *
 * @param filePath - Absolute or relative path to the file
 */
export function parseEnvFile(filePath: string): ParsedEnvFile {
  const content = readFileSync(filePath, "utf8");
  return parseEnvFileContent(content, filePath);
}
