import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  AdapterCompareResult,
  AdapterContext,
  AdapterDiffEntry,
  AdapterPullResult,
  EnvAdapter,
  EnvMap,
} from "./types.js";

type DockerProviderConfig = {
  composeFile?: string;
  envFile?: string | string[];
};

type ParsedComposeContent = {
  envFiles: string[];
  environmentValues: EnvMap;
};

type MergeEnvFilesOptions = {
  values: EnvMap;
  warnings: string[];
  envFiles: string[];
  resolvePath: (envFile: string) => string;
  missingWarningPrefix: string;
};

function getIndentation(line: string): number {
  return line.length - line.trimStart().length;
}

function parseKeyValueLine(line: string): { key: string; value: string } | undefined {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) return undefined;

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) {
    return { key: trimmed, value: "" };
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  const first = value.at(0);
  const last = value.at(-1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    value = value.slice(1, -1);
  }
  if (key.length === 0) return undefined;
  return { key, value };
}

function parseEnvContent(content: string): EnvMap {
  const values: EnvMap = {};
  for (const line of content.split(/\r?\n/u)) {
    const parsed = parseKeyValueLine(line);
    if (parsed === undefined) continue;
    values[parsed.key] = parsed.value;
  }
  return values;
}

function parseComposeEnvironmentEntry(line: string): { key: string; value: string } | undefined {
  const colonIndex = line.indexOf(":");
  const equalsIndex = line.indexOf("=");
  const shouldParseAsYamlPair = colonIndex > 0 && (equalsIndex < 0 || colonIndex < equalsIndex);

  if (shouldParseAsYamlPair) {
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    const first = value.at(0);
    const last = value.at(-1);
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1);
    }

    if (key.length === 0) {
      return undefined;
    }

    return { key, value };
  }

  const fromKeyValue = parseKeyValueLine(line);
  if (fromKeyValue !== undefined) {
    return fromKeyValue;
  }

  return undefined;
}

function parseInlineYamlArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }

  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) {
    return [];
  }

  return inner
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const first = item.at(0);
      const last = item.at(-1);
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return item.slice(1, -1);
      }
      return item;
    });
}

function toNormalizedLines(content: string): string[] {
  return content.split(/\r?\n/u).map((line) => line.replaceAll("\t", "  "));
}

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith("#");
}

function collectBlockLines(lines: string[], startIndex: number, blockIndent: number): string[] {
  const blockLines: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (isBlankOrComment(line)) {
      continue;
    }

    if (getIndentation(line) <= blockIndent) {
      break;
    }

    blockLines.push(line.trim());
  }

  return blockLines;
}

function parseInlineEnvFileReference(inline: string): string[] {
  if (inline.length === 0) {
    return [];
  }

  if (inline.startsWith("-")) {
    return [inline.slice(1).trim()];
  }

  const fromArray = parseInlineYamlArray(inline);
  if (fromArray.length > 0) {
    return fromArray;
  }

  return [inline];
}

function parseEnvFileBlockEntries(blockLines: string[]): string[] {
  return blockLines.map((line) => (line.startsWith("-") ? line.slice(1).trim() : line));
}

function parseEnvironmentBlockEntries(blockLines: string[]): EnvMap {
  const values: EnvMap = {};

  for (const line of blockLines) {
    const normalized = line.startsWith("-") ? line.slice(1).trim() : line;
    const parsed = parseComposeEnvironmentEntry(normalized);
    if (parsed !== undefined) {
      values[parsed.key] = parsed.value;
    }
  }

  return values;
}

function parseComposeContent(content: string): ParsedComposeContent {
  const envFiles: string[] = [];
  const environmentValues: EnvMap = {};
  const lines = toNormalizedLines(content);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (isBlankOrComment(line)) {
      continue;
    }

    if (trimmed.startsWith("env_file:")) {
      const inline = trimmed.slice("env_file:".length).trim();
      const blockLines = collectBlockLines(lines, index + 1, getIndentation(line));
      envFiles.push(
        ...parseInlineEnvFileReference(inline),
        ...parseEnvFileBlockEntries(blockLines),
      );
      continue;
    }

    if (trimmed.startsWith("environment:")) {
      const blockLines = collectBlockLines(lines, index + 1, getIndentation(line));
      Object.assign(environmentValues, parseEnvironmentBlockEntries(blockLines));
    }
  }

  return { envFiles, environmentValues };
}

function resolveFromCompose(composeFilePath: string, referencedPath: string): string {
  if (path.isAbsolute(referencedPath)) {
    return referencedPath;
  }

  return path.resolve(path.dirname(composeFilePath), referencedPath);
}

function sanitizeEnvFileReferences(references: string[]): string[] {
  return references
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const first = entry.at(0);
      const last = entry.at(-1);
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return entry.slice(1, -1);
      }
      return entry;
    });
}

async function safeReadFile(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

async function mergeEnvFiles(options: MergeEnvFilesOptions): Promise<void> {
  const { values, warnings, envFiles, resolvePath, missingWarningPrefix } = options;

  for (const envFile of envFiles) {
    const resolvedPath = resolvePath(envFile);
    const content = await safeReadFile(resolvedPath);
    if (content === undefined) {
      warnings.push(`${missingWarningPrefix}: ${resolvedPath}`);
      continue;
    }

    Object.assign(values, parseEnvContent(content));
  }
}

async function mergeComposeValues(
  values: EnvMap,
  warnings: string[],
  composeFilePath: string,
): Promise<void> {
  const composeContent = await safeReadFile(composeFilePath);
  if (composeContent === undefined) {
    warnings.push(`compose file not found: ${composeFilePath}`);
    return;
  }

  const parsedCompose = parseComposeContent(composeContent);
  const composeEnvFiles = sanitizeEnvFileReferences(parsedCompose.envFiles);
  await mergeEnvFiles({
    values,
    warnings,
    envFiles: composeEnvFiles,
    resolvePath: (envFile) => resolveFromCompose(composeFilePath, envFile),
    missingWarningPrefix: "compose env_file not found",
  });
  Object.assign(values, parsedCompose.environmentValues);
}

function buildCompareResult(localValues: EnvMap, remoteValues: EnvMap): AdapterCompareResult {
  const localKeys = new Set(Object.keys(localValues));
  const remoteKeys = new Set(Object.keys(remoteValues));

  const missingInRemote: string[] = [];
  const extraInRemote: string[] = [];
  const mismatches: AdapterDiffEntry[] = [];

  for (const key of localKeys) {
    if (!remoteKeys.has(key)) {
      missingInRemote.push(key);
      continue;
    }
    if (localValues[key] !== remoteValues[key]) {
      mismatches.push({ key, reason: "mismatch" });
    }
  }

  for (const key of remoteKeys) {
    if (!localKeys.has(key)) {
      extraInRemote.push(key);
    }
  }

  return { missingInRemote, extraInRemote, mismatches };
}

async function pull(context: AdapterContext): Promise<AdapterPullResult> {
  const providerConfig = (context.providerConfig ?? {}) as DockerProviderConfig;
  let envFiles: string[] = [];
  if (Array.isArray(providerConfig.envFile)) {
    envFiles = providerConfig.envFile;
  } else if (providerConfig.envFile !== undefined) {
    envFiles = [providerConfig.envFile];
  }

  const values: EnvMap = {};
  const warnings: string[] = [];

  await mergeEnvFiles({
    values,
    warnings,
    envFiles,
    resolvePath: (envFile) => path.resolve(envFile),
    missingWarningPrefix: "env_file not found",
  });

  if (providerConfig.composeFile !== undefined) {
    await mergeComposeValues(values, warnings, path.resolve(providerConfig.composeFile));
  }

  return {
    values,
    warnings,
    metadata: {
      source: "docker",
      count: Object.keys(values).length,
    },
  };
}

async function compare(
  _context: AdapterContext,
  localValues: EnvMap,
  remoteValues: EnvMap,
): Promise<AdapterCompareResult> {
  return buildCompareResult(localValues, remoteValues);
}

export const dockerAdapter: EnvAdapter = {
  name: "docker",
  pull,
  compare,
  meta: () => ({
    name: "docker",
    capabilities: {
      pull: true,
      push: false,
      compare: true,
      redactValuesByDefault: true,
    },
    supportedEnvironments: ["development", "preview", "production"],
  }),
};

export default dockerAdapter;
