import { readFile } from "node:fs/promises";
import path from "node:path";

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

export function parseEnvSourceContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
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
  } catch (errorValue) {
    if (
      options.allowMissing === true &&
      errorValue instanceof Error &&
      "code" in errorValue &&
      errorValue.code === "ENOENT"
    ) {
      return {};
    }
    throw errorValue;
  }
}
