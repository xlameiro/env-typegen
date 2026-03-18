import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { computePolicyPackChecksum, normalizePolicyPackSource } from "./policy-pack.js";

type PolicyPackCacheRecord = {
  source: string;
  fetchedAtMs: number;
  content: string;
};

export type PolicyPackFetchOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  cacheTtlMs?: number;
  cacheDir?: string;
  offline?: boolean;
  nowMs?: () => number;
};

export type PolicyPackFetchProvenance = {
  normalizedSource: string;
  sourceType: "file" | "http" | "https";
  fetchedAtMs: number;
  cacheHit: boolean;
};

const DEFAULT_FETCH_OPTIONS: Required<Omit<PolicyPackFetchOptions, "nowMs">> = {
  timeoutMs: 5_000,
  maxRetries: 2,
  retryDelayMs: 100,
  cacheTtlMs: 5 * 60_000,
  cacheDir: path.join(os.tmpdir(), "env-typegen-policy-pack-cache"),
  offline: false,
};

function getOptions(options: PolicyPackFetchOptions | undefined): Required<PolicyPackFetchOptions> {
  return {
    timeoutMs: options?.timeoutMs ?? DEFAULT_FETCH_OPTIONS.timeoutMs,
    maxRetries: options?.maxRetries ?? DEFAULT_FETCH_OPTIONS.maxRetries,
    retryDelayMs: options?.retryDelayMs ?? DEFAULT_FETCH_OPTIONS.retryDelayMs,
    cacheTtlMs: options?.cacheTtlMs ?? DEFAULT_FETCH_OPTIONS.cacheTtlMs,
    cacheDir: options?.cacheDir ?? DEFAULT_FETCH_OPTIONS.cacheDir,
    offline: options?.offline ?? DEFAULT_FETCH_OPTIONS.offline,
    nowMs: options?.nowMs ?? (() => Date.now()),
  };
}

function isHttpLike(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function getCacheFilePath(source: string, cacheDir: string): string {
  return path.join(cacheDir, `${computePolicyPackChecksum(source)}.json`);
}

async function readCacheRecord(cacheFilePath: string): Promise<PolicyPackCacheRecord | undefined> {
  try {
    const raw = await readFile(cacheFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { source?: unknown }).source === "string" &&
      typeof (parsed as { fetchedAtMs?: unknown }).fetchedAtMs === "number" &&
      typeof (parsed as { content?: unknown }).content === "string"
    ) {
      return {
        source: (parsed as { source: string }).source,
        fetchedAtMs: (parsed as { fetchedAtMs: number }).fetchedAtMs,
        content: (parsed as { content: string }).content,
      };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

async function writeCacheRecord(params: {
  cacheFilePath: string;
  source: string;
  fetchedAtMs: number;
  content: string;
}): Promise<void> {
  await mkdir(path.dirname(params.cacheFilePath), { recursive: true });
  const record: PolicyPackCacheRecord = {
    source: params.source,
    fetchedAtMs: params.fetchedAtMs,
    content: params.content,
  };
  await writeFile(params.cacheFilePath, JSON.stringify(record), "utf8");
}

async function wait(delayMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function buildFetchError(source: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`Failed to fetch policy pack from ${source}: ${message}`);
}

async function fetchRemoteContentWithRetry(params: {
  source: string;
  options: Required<PolicyPackFetchOptions>;
}): Promise<string> {
  let lastFetchError: Error | undefined;

  for (let attempt = 0; attempt <= params.options.maxRetries; attempt += 1) {
    try {
      const response = await fetch(params.source, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(params.options.timeoutMs),
      });

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < params.options.maxRetries) {
          await wait(params.options.retryDelayMs * 2 ** attempt);
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return response.text();
    } catch (error) {
      lastFetchError = buildFetchError(params.source, error);
      if (attempt < params.options.maxRetries) {
        await wait(params.options.retryDelayMs * 2 ** attempt);
        continue;
      }
    }
  }

  if (lastFetchError !== undefined) {
    throw lastFetchError;
  }

  throw new Error(`Failed to fetch policy pack from ${params.source}.`);
}

function resolveOfflineContent(params: {
  source: string;
  cacheRecord: PolicyPackCacheRecord | undefined;
}): string {
  if (params.cacheRecord !== undefined) {
    return params.cacheRecord.content;
  }

  throw new Error(`Policy pack fetch is offline and cache is missing for ${params.source}.`);
}

export async function fetchPolicyPackContent(params: {
  source: string;
  cwd: string;
  options?: PolicyPackFetchOptions;
}): Promise<string> {
  const result = await fetchPolicyPackContentWithProvenance(params);
  return result.content;
}

export async function fetchPolicyPackContentWithProvenance(params: {
  source: string;
  cwd: string;
  options?: PolicyPackFetchOptions;
}): Promise<{ content: string; provenance: PolicyPackFetchProvenance }> {
  const options = getOptions(params.options);
  const normalizedSource = normalizePolicyPackSource(params.source, params.cwd);
  let sourceType: "file" | "http" | "https" = "file";
  if (normalizedSource.startsWith("https://")) {
    sourceType = "https";
  } else if (normalizedSource.startsWith("http://")) {
    sourceType = "http";
  }

  if (!isHttpLike(normalizedSource)) {
    const content = await readFile(normalizedSource, "utf8");
    return {
      content,
      provenance: {
        normalizedSource,
        sourceType,
        fetchedAtMs: options.nowMs(),
        cacheHit: false,
      },
    };
  }

  const cacheFilePath = getCacheFilePath(normalizedSource, options.cacheDir);
  const cacheRecord = await readCacheRecord(cacheFilePath);
  const nowMs = options.nowMs();
  const isCacheFresh =
    cacheRecord !== undefined && nowMs - cacheRecord.fetchedAtMs <= options.cacheTtlMs;

  if (options.offline) {
    const content = resolveOfflineContent({ source: normalizedSource, cacheRecord });
    return {
      content,
      provenance: {
        normalizedSource,
        sourceType,
        fetchedAtMs: nowMs,
        cacheHit: true,
      },
    };
  }

  try {
    const content = await fetchRemoteContentWithRetry({
      source: normalizedSource,
      options,
    });

    await writeCacheRecord({
      cacheFilePath,
      source: normalizedSource,
      fetchedAtMs: nowMs,
      content,
    });
    return {
      content,
      provenance: {
        normalizedSource,
        sourceType,
        fetchedAtMs: nowMs,
        cacheHit: false,
      },
    };
  } catch (error) {
    if (isCacheFresh && cacheRecord !== undefined) {
      return {
        content: cacheRecord.content,
        provenance: {
          normalizedSource,
          sourceType,
          fetchedAtMs: nowMs,
          cacheHit: true,
        },
      };
    }

    throw buildFetchError(normalizedSource, error);
  }
}
