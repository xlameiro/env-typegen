import { readFile } from "node:fs/promises";
import path from "node:path";

export type FleetGovernanceStage = "advisory-enforce" | "enforce" | "apply";

export type FleetRepoManifestEntry = {
  id: string;
  repository: string;
  root: string;
  provider: string;
  environment: string;
  stage: FleetGovernanceStage;
  verifyCommand?: string;
  conformanceCommand?: string;
};

export type FleetRepoManifest = {
  version: 1;
  fleet: FleetRepoManifestEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(params: {
  source: Record<string, unknown>;
  field: string;
  itemLabel: string;
}): string {
  const value = params.source[params.field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `${params.itemLabel}.${params.field} must be a non-empty string in fleet manifest.`,
    );
  }

  return value;
}

function parseStage(rawStage: unknown, itemLabel: string): FleetGovernanceStage {
  if (rawStage === "advisory-enforce" || rawStage === "enforce" || rawStage === "apply") {
    return rawStage;
  }

  throw new Error(`${itemLabel}.stage must be one of: advisory-enforce, enforce, apply.`);
}

function parseOptionalStringField(params: {
  source: Record<string, unknown>;
  field: string;
  itemLabel: string;
}): string | undefined {
  const value = params.source[params.field];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `${params.itemLabel}.${params.field} must be a non-empty string when provided.`,
    );
  }

  return value;
}

function parseManifestEntry(entry: unknown, index: number): FleetRepoManifestEntry {
  if (!isRecord(entry)) {
    throw new Error(`fleet[${index}] must be an object.`);
  }

  const itemLabel = `fleet[${index}]`;

  const verifyCommand = parseOptionalStringField({
    source: entry,
    field: "verifyCommand",
    itemLabel,
  });
  const conformanceCommand = parseOptionalStringField({
    source: entry,
    field: "conformanceCommand",
    itemLabel,
  });

  return {
    id: readStringField({ source: entry, field: "id", itemLabel }),
    repository: readStringField({ source: entry, field: "repository", itemLabel }),
    root: readStringField({ source: entry, field: "root", itemLabel }),
    provider: readStringField({ source: entry, field: "provider", itemLabel }),
    environment: readStringField({ source: entry, field: "environment", itemLabel }),
    stage: parseStage(entry.stage, itemLabel),
    ...(verifyCommand === undefined ? {} : { verifyCommand }),
    ...(conformanceCommand === undefined ? {} : { conformanceCommand }),
  };
}

export function parseRepoManifestContent(content: string): FleetRepoManifest {
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Manifest root must be an object.");
  }

  if (parsed.version !== 1) {
    throw new Error("Manifest version must be 1.");
  }

  if (!Array.isArray(parsed.fleet)) {
    throw new TypeError("Manifest fleet must be an array.");
  }

  const fleet = parsed.fleet.map((entry, index) => parseManifestEntry(entry, index));
  if (fleet.length === 0) {
    throw new Error("Manifest fleet must contain at least one repository entry.");
  }

  return {
    version: 1,
    fleet,
  };
}

export async function loadRepoManifest(filePath: string): Promise<FleetRepoManifest> {
  const content = await readFile(path.resolve(filePath), "utf8");
  return parseRepoManifestContent(content);
}
