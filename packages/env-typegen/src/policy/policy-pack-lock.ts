import { readFile } from "node:fs/promises";

import { computePolicyPackChecksum, normalizePolicyPackSource } from "./policy-pack.js";

export type PolicyPackLockEntry = {
  source: string;
  checksum: string;
  provenance?: PolicyPackLockEntryProvenance;
};

export type PolicyPackLockEntryProvenance = {
  expectedSigner?: string;
  expectedSignatureChecksum?: string;
  expectedKeyId?: string;
  expectedFingerprint?: string;
  sourceType?: "file" | "http" | "https";
};

export type PolicyPackLockFile = {
  version: number;
  entries: PolicyPackLockEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidChecksum(value: string): boolean {
  return /^[a-f0-9]{64}$/u.test(value);
}

function parseSourceType(value: unknown): PolicyPackLockEntryProvenance["sourceType"] {
  if (value === "file" || value === "http" || value === "https") {
    return value;
  }

  return undefined;
}

function parseProvenance(value: unknown): PolicyPackLockEntryProvenance | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const sourceType = parseSourceType(value.sourceType);

  return {
    ...(typeof value.expectedSigner === "string" ? { expectedSigner: value.expectedSigner } : {}),
    ...(typeof value.expectedSignatureChecksum === "string"
      ? { expectedSignatureChecksum: value.expectedSignatureChecksum }
      : {}),
    ...(typeof value.expectedKeyId === "string" ? { expectedKeyId: value.expectedKeyId } : {}),
    ...(typeof value.expectedFingerprint === "string"
      ? { expectedFingerprint: value.expectedFingerprint }
      : {}),
    ...(sourceType === undefined ? {} : { sourceType }),
  };
}

function parseLockEntry(params: {
  entry: unknown;
  index: number;
  source: string;
}): PolicyPackLockEntry {
  if (!isRecord(params.entry)) {
    throw new TypeError(
      `Invalid policy pack lock at ${params.source}: entries[${params.index}] must be an object.`,
    );
  }

  if (typeof params.entry.source !== "string" || params.entry.source.trim().length === 0) {
    throw new TypeError(
      `Invalid policy pack lock at ${params.source}: entries[${params.index}].source must be a non-empty string.`,
    );
  }

  if (typeof params.entry.checksum !== "string" || !isValidChecksum(params.entry.checksum)) {
    throw new TypeError(
      `Invalid policy pack lock at ${params.source}: entries[${params.index}].checksum must be a sha256 hex string.`,
    );
  }

  const provenance = parseProvenance(params.entry.provenance);

  return {
    source: params.entry.source,
    checksum: params.entry.checksum,
    ...(provenance === undefined ? {} : { provenance }),
  };
}

export function parsePolicyPackLock(content: string, source: string): PolicyPackLockFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse policy pack lock at ${source}: ${message}`);
  }

  if (!isRecord(parsed)) {
    throw new TypeError(`Invalid policy pack lock at ${source}: root must be an object.`);
  }

  if (typeof parsed.version !== "number" || !Number.isInteger(parsed.version)) {
    throw new TypeError(`Invalid policy pack lock at ${source}: "version" must be an integer.`);
  }

  if (!Array.isArray(parsed.entries)) {
    throw new TypeError(`Invalid policy pack lock at ${source}: "entries" must be an array.`);
  }

  const entries: PolicyPackLockEntry[] = parsed.entries.map((entry, index) => {
    return parseLockEntry({
      entry,
      index,
      source,
    });
  });

  return {
    version: parsed.version,
    entries,
  };
}

export async function readPolicyPackLock(params: {
  lockFilePath: string;
  cwd: string;
}): Promise<PolicyPackLockFile> {
  const resolvedPath = normalizePolicyPackSource(params.lockFilePath, params.cwd);
  if (resolvedPath.startsWith("http://") || resolvedPath.startsWith("https://")) {
    throw new Error("Policy pack lock file must be a local file path.");
  }

  const content = await readFile(resolvedPath, "utf8");
  return parsePolicyPackLock(content, resolvedPath);
}

export function validatePolicyPackLockEntry(params: {
  source: string;
  content: string;
  lock: PolicyPackLockFile;
  cwd: string;
  strict: boolean;
}): PolicyPackLockEntry | undefined {
  const normalizedSource = normalizePolicyPackSource(params.source, params.cwd);
  const lockEntry = params.lock.entries.find((entry) => {
    return normalizePolicyPackSource(entry.source, params.cwd) === normalizedSource;
  });

  if (lockEntry === undefined) {
    if (params.strict) {
      throw new Error(
        `Policy pack lock missing entry for ${params.source}. Add this source to the lock file to continue.`,
      );
    }
    return undefined;
  }

  const actualChecksum = computePolicyPackChecksum(params.content);
  if (actualChecksum !== lockEntry.checksum) {
    throw new Error(
      `Policy pack lock mismatch for ${params.source}. Expected ${lockEntry.checksum}, received ${actualChecksum}.`,
    );
  }

  return lockEntry;
}
