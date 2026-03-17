import { readFile } from "node:fs/promises";
import path from "node:path";

import { warn } from "../utils/logger.js";

type LoadEnvSourceOptions = {
  filePath: string;
  allowMissing?: boolean;
};

function stripWrappingQuotes(value: string): string {
  if (value.length < 2) return value;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnvSourceContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_]\w*)=(.*)$/.exec(trimmed);
    if (match === null) continue;
    const key = match[1] ?? "";
    const rawValue = match[2] ?? "";
    result[key] = stripWrappingQuotes(rawValue.trim());
  }

  return result;
}

export async function loadEnvSource(
  options: LoadEnvSourceOptions,
): Promise<Record<string, string>> {
  const resolvedPath = path.resolve(options.filePath);
  try {
    const content = await readFile(resolvedPath, "utf8");
    return parseEnvSourceContent(content);
  } catch (error_) {
    if (
      options.allowMissing === true &&
      error_ instanceof Error &&
      "code" in error_ &&
      error_.code === "ENOENT"
    ) {
      // UX-02: warn explicitly so users know the file is absent instead of silently
      // treating a typo'd path as an empty environment.
      warn(`Target file not found: ${options.filePath} — treating as empty`);
      return {};
    }
    throw error_;
  }
}
