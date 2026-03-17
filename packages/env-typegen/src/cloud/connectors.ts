import { readFile } from "node:fs/promises";
import path from "node:path";

export type CloudProvider = "vercel" | "cloudflare" | "aws";

type CloudConnectorLoadOptions = {
  provider: CloudProvider;
  filePath: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readEntryValue(entry: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function getVercelEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value as unknown[];
  if (isRecord(value) && Array.isArray(value.envs)) return value.envs as unknown[];
  return [];
}

function parseVercelPayload(value: unknown): Record<string, string> {
  const entries = getVercelEntries(value);
  const result: Record<string, string> = {};
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const key = readEntryValue(entry, ["key", "name"]);
    if (key === undefined) continue;
    const envValue = readEntryValue(entry, ["value", "targetValue", "content"]) ?? "";
    result[key] = envValue;
  }
  return result;
}

function getCloudflareEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value as unknown[];
  if (isRecord(value) && Array.isArray(value.result)) return value.result as unknown[];
  return [];
}

function parseCloudflarePayload(value: unknown): Record<string, string> {
  const entries = getCloudflareEntries(value);
  const result: Record<string, string> = {};
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const key = readEntryValue(entry, ["name", "key"]);
    if (key === undefined) continue;
    const envValue = readEntryValue(entry, ["text", "value", "secret"]) ?? "";
    result[key] = envValue;
  }
  return result;
}

function parseAwsPayload(value: unknown): Record<string, string> {
  const entries = isRecord(value) && Array.isArray(value.Parameters) ? value.Parameters : [];
  const result: Record<string, string> = {};
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const name = readEntryValue(entry, ["Name", "name"]);
    if (name === undefined) continue;
    const key = name.split("/").findLast((part) => part.length > 0) ?? name;
    const envValue = readEntryValue(entry, ["Value", "value"]) ?? "";
    result[key] = envValue;
  }
  return result;
}

function parseProviderPayload(provider: CloudProvider, value: unknown): Record<string, string> {
  if (provider === "vercel") return parseVercelPayload(value);
  if (provider === "cloudflare") return parseCloudflarePayload(value);
  return parseAwsPayload(value);
}

export async function loadCloudSource(
  options: CloudConnectorLoadOptions,
): Promise<Record<string, string>> {
  const resolvedPath = path.resolve(options.filePath);
  let raw: string;
  try {
    raw = await readFile(resolvedPath, "utf8");
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File not found: ${options.filePath}`);
    }
    throw err;
  }
  const parsed: unknown = JSON.parse(raw);
  return parseProviderPayload(options.provider, parsed);
}
