import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  isFleetEnforcementLevel,
  isFleetPolicyChannel,
  isGovernanceTemplateId,
  type FleetEnforcementLevel,
  type FleetPolicyChannel,
  type GovernanceTemplateId,
} from "../templates/governance-template.js";

export type FleetGovernanceStage = "advisory-enforce" | "enforce" | "apply";

export type FleetRepoManifestEntry = {
  id: string;
  repository: string;
  root: string;
  provider: string;
  environment: string;
  stage: FleetGovernanceStage;
  template?: GovernanceTemplateId;
  enforcementLevel?: FleetEnforcementLevel;
  policyChannel?: FleetPolicyChannel;
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

function parseOptionalTemplateField(params: {
  source: Record<string, unknown>;
  itemLabel: string;
}): GovernanceTemplateId | undefined {
  const value = params.source.template;
  if (value === undefined) {
    return undefined;
  }

  if (!isGovernanceTemplateId(value)) {
    throw new Error(`${params.itemLabel}.template must be one of: web-app, library.`);
  }

  return value;
}

function parseOptionalEnforcementLevelField(params: {
  source: Record<string, unknown>;
  itemLabel: string;
}): FleetEnforcementLevel | undefined {
  const value = params.source.enforcementLevel;
  if (value === undefined) {
    return undefined;
  }

  if (!isFleetEnforcementLevel(value)) {
    throw new Error(
      `${params.itemLabel}.enforcementLevel must be one of: advisory, standard, strict.`,
    );
  }

  return value;
}

function parseOptionalPolicyChannelField(params: {
  source: Record<string, unknown>;
  itemLabel: string;
}): FleetPolicyChannel | undefined {
  const value = params.source.policyChannel;
  if (value === undefined) {
    return undefined;
  }

  if (!isFleetPolicyChannel(value)) {
    throw new Error(`${params.itemLabel}.policyChannel must be one of: dev, stage, prod.`);
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
  const template = parseOptionalTemplateField({ source: entry, itemLabel });
  const enforcementLevel = parseOptionalEnforcementLevelField({ source: entry, itemLabel });
  const policyChannel = parseOptionalPolicyChannelField({ source: entry, itemLabel });

  return {
    id: readStringField({ source: entry, field: "id", itemLabel }),
    repository: readStringField({ source: entry, field: "repository", itemLabel }),
    root: readStringField({ source: entry, field: "root", itemLabel }),
    provider: readStringField({ source: entry, field: "provider", itemLabel }),
    environment: readStringField({ source: entry, field: "environment", itemLabel }),
    stage: parseStage(entry.stage, itemLabel),
    ...(template === undefined ? {} : { template }),
    ...(enforcementLevel === undefined ? {} : { enforcementLevel }),
    ...(policyChannel === undefined ? {} : { policyChannel }),
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
