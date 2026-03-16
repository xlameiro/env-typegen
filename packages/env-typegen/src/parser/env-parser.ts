import { readFileSync } from "node:fs";

import type { InferenceRule } from "../inferrer/rules.js";
import { inferType } from "../inferrer/type-inferrer.js";
import { parseCommentBlock } from "./comment-parser.js";
import type { ParsedEnvFile, ParsedEnvVar } from "./types.js";

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
 */
const SECTION_HEADER_RE = /^#\s+[-=]{3,}\s+(.+?)\s+[-=]{3,}\s*$/;

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
    if (envMatch !== null) {
      const key = envMatch[1] ?? "";
      const rawValue = envMatch[2] ?? "";
      const annotations = parseCommentBlock(commentBlock);
      const inferredType = inferType(
        key,
        rawValue,
        ...(options?.inferenceRules !== undefined ? [{ extraRules: options.inferenceRules }] : []),
      );
      const isRequired = rawValue.length > 0 || annotations.isRequired;
      const isOptional = rawValue.length === 0 && !annotations.isRequired;
      const isClientSide = key.startsWith("NEXT_PUBLIC_");

      const parsedVar: ParsedEnvVar = {
        key,
        rawValue,
        inferredType,
        isRequired,
        isOptional,
        isClientSide,
        lineNumber,
      };

      // Only set optional fields when they have a value (exactOptionalPropertyTypes)
      if (annotations.annotatedType !== undefined) {
        parsedVar.annotatedType = annotations.annotatedType;
      }
      if (annotations.description !== undefined) {
        parsedVar.description = annotations.description;
      }
      if (currentGroup !== undefined) {
        parsedVar.group = currentGroup;
      }

      vars.push(parsedVar);
      commentBlock = [];
    } else {
      // Unrecognised line — reset comment block
      commentBlock = [];
    }
  }

  return { filePath, vars, groups };
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
