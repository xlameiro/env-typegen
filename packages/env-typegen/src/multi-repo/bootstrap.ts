import path from "node:path";

import {
  type FleetEnforcementLevel,
  type FleetPolicyChannel,
  type GovernanceTemplateId,
} from "../templates/governance-template.js";
import { resolveGovernanceTemplate } from "../templates/template-resolver.js";
import {
  loadRepoManifest,
  type FleetGovernanceStage,
  type FleetRepoManifest,
  type FleetRepoManifestEntry,
} from "./repo-manifest.js";

export type FleetBootstrapTarget = {
  id: string;
  repository: string;
  root: string;
  provider: string;
  environment: string;
  stage: FleetGovernanceStage;
  template: GovernanceTemplateId;
  enforcementLevel: FleetEnforcementLevel;
  policyChannel: FleetPolicyChannel;
  verifyCommand: string;
  conformanceCommand: string;
};

export type FleetBootstrapPlan = {
  version: 1;
  manifestVersion: 1;
  generatedAt: string;
  targets: FleetBootstrapTarget[];
  summary: {
    total: number;
    advisoryEnforce: number;
    enforce: number;
    apply: number;
  };
};

function defaultVerifyCommand(entry: FleetRepoManifestEntry): string {
  return `env-typegen verify --env .env --contract env.contract.mjs --json=pretty --output-file reports/env-verify.${entry.id}.json`;
}

function defaultConformanceCommand(entry: FleetRepoManifestEntry): string {
  return `node qa-test/env-typegen-conformance-smoke.mjs --repo ${entry.id}`;
}

function toTarget(entry: FleetRepoManifestEntry): FleetBootstrapTarget {
  const overlay = {
    stage: entry.stage,
    ...(entry.enforcementLevel === undefined ? {} : { enforcementLevel: entry.enforcementLevel }),
    ...(entry.policyChannel === undefined ? {} : { policyChannel: entry.policyChannel }),
  };

  const resolvedTemplate = resolveGovernanceTemplate({
    template: entry.template ?? "web-app",
    overlay,
  });

  return {
    id: entry.id,
    repository: entry.repository,
    root: entry.root,
    provider: entry.provider,
    environment: entry.environment,
    stage: resolvedTemplate.stage,
    template: resolvedTemplate.template,
    enforcementLevel: resolvedTemplate.enforcementLevel,
    policyChannel: resolvedTemplate.policyChannel,
    verifyCommand: entry.verifyCommand ?? defaultVerifyCommand(entry),
    conformanceCommand: entry.conformanceCommand ?? defaultConformanceCommand(entry),
  };
}

function buildSummary(targets: readonly FleetBootstrapTarget[]): FleetBootstrapPlan["summary"] {
  return {
    total: targets.length,
    advisoryEnforce: targets.filter((target) => target.stage === "advisory-enforce").length,
    enforce: targets.filter((target) => target.stage === "enforce").length,
    apply: targets.filter((target) => target.stage === "apply").length,
  };
}

export function createBootstrapPlan(manifest: FleetRepoManifest): FleetBootstrapPlan {
  const targets = manifest.fleet.map((entry) => toTarget(entry));

  return {
    version: 1,
    manifestVersion: manifest.version,
    generatedAt: new Date().toISOString(),
    targets,
    summary: buildSummary(targets),
  };
}

export async function bootstrapFromManifest(manifestPath: string): Promise<FleetBootstrapPlan> {
  const manifest = await loadRepoManifest(path.resolve(manifestPath));
  return createBootstrapPlan(manifest);
}
