import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  AdapterPushFailureKind,
  AdapterPushOperationResult,
  AdapterPushResult,
  EnvMap,
} from "./types.js";

export type AwsRuntimeMode = "snapshot" | "live";

export type AwsRuntimeProviderConfig = {
  snapshotFile?: string;
  snapshotFiles?: string[];
  runtimeMode?: AwsRuntimeMode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function classifyFailure(error: unknown): AdapterPushFailureKind {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = rawMessage.toLowerCase();

  const transientPattern =
    /timeout|timed out|rate limit|429|\b5\d\d\b|network|temporar|econnreset|eai_again/u;
  return transientPattern.test(message) ? "transient" : "permanent";
}

function summarizeOperations(
  operations: readonly AdapterPushOperationResult[],
): AdapterPushResult["summary"] {
  const applied = operations.filter((operation) => operation.status === "applied").length;
  const failed = operations.filter((operation) => operation.status === "failed").length;
  const skipped = operations.filter((operation) => operation.status === "skipped").length;

  return {
    applied,
    failed,
    skipped,
    total: operations.length,
  };
}

function deriveOutcome(
  operations: readonly AdapterPushOperationResult[],
): AdapterPushResult["outcome"] {
  const summary = summarizeOperations(operations);

  if (summary.failed > 0 && summary.applied > 0) {
    return "partial-failure";
  }

  if (summary.failed > 0 && summary.applied === 0) {
    return "blocked";
  }

  if (summary.applied > 0) {
    return "applied";
  }

  return "no-change";
}

function toSortedKeys(values: EnvMap): string[] {
  return Object.keys(values).sort((left, right) => left.localeCompare(right));
}

export function resolveAwsRuntimeMode(config: AwsRuntimeProviderConfig): AwsRuntimeMode {
  return config.runtimeMode === "live" ? "live" : "snapshot";
}

export async function readAwsSnapshotPayloads(
  config: AwsRuntimeProviderConfig,
  providerLabel: string,
): Promise<Record<string, unknown>[]> {
  const files = [
    ...(config.snapshotFiles ?? []),
    ...(config.snapshotFile === undefined ? [] : [config.snapshotFile]),
  ];

  if (files.length === 0) {
    throw new Error(
      `${providerLabel} adapter requires providerConfig.snapshotFile or providerConfig.snapshotFiles in snapshot mode.`,
    );
  }

  const payloads: Record<string, unknown>[] = [];
  for (const file of files) {
    const raw = await readFile(path.resolve(file), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      throw new Error(`Invalid snapshot payload in ${file}: expected object root.`);
    }
    payloads.push(parsed);
  }

  return payloads;
}

export function buildBlockedPushResult(values: EnvMap, reason: string): AdapterPushResult {
  const operations: AdapterPushOperationResult[] = toSortedKeys(values).map((key) => ({
    key,
    status: "skipped",
    message: reason,
    failureKind: "none",
  }));

  return {
    outcome: "blocked",
    operations,
    summary: summarizeOperations(operations),
  };
}

export function buildSnapshotPushResult(values: EnvMap, message: string): AdapterPushResult {
  const operations: AdapterPushOperationResult[] = toSortedKeys(values).map((key) => ({
    key,
    status: "applied",
    message,
    failureKind: "none",
  }));

  return {
    outcome: deriveOutcome(operations),
    operations,
    summary: summarizeOperations(operations),
  };
}

export async function applyLiveWrites(
  values: EnvMap,
  writeOperation: (key: string, value: string) => Promise<void>,
): Promise<AdapterPushResult> {
  const operations: AdapterPushOperationResult[] = [];

  for (const key of toSortedKeys(values)) {
    const value = values[key];
    if (value === undefined) {
      operations.push({
        key,
        status: "skipped",
        message: "Value is undefined; write skipped.",
        failureKind: "none",
      });
      continue;
    }

    try {
      await writeOperation(key, value);
      operations.push({
        key,
        status: "applied",
        message: "Value written to provider.",
        failureKind: "none",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      operations.push({
        key,
        status: "failed",
        message,
        failureKind: classifyFailure(error),
      });
    }
  }

  return {
    outcome: deriveOutcome(operations),
    operations,
    summary: summarizeOperations(operations),
  };
}
