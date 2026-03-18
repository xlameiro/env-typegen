import type { FleetGovernanceStage } from "../multi-repo/repo-manifest.js";

export type GovernanceTemplateId = "web-app" | "library";

export type FleetEnforcementLevel = "advisory" | "standard" | "strict";

export type FleetPolicyChannel = "dev" | "stage" | "prod";

export type GovernanceTemplate = {
  id: GovernanceTemplateId;
  version: 1;
  description: string;
  defaults: {
    stage: FleetGovernanceStage;
    enforcementLevel: FleetEnforcementLevel;
    policyChannel: FleetPolicyChannel;
  };
};

export type GovernanceTemplateOverlay = {
  stage?: FleetGovernanceStage;
  enforcementLevel?: FleetEnforcementLevel;
  policyChannel?: FleetPolicyChannel;
};

const governanceTemplates: Record<GovernanceTemplateId, GovernanceTemplate> = {
  "web-app": {
    id: "web-app",
    version: 1,
    description: "Template for application repositories with stricter default progression gates.",
    defaults: {
      stage: "enforce",
      enforcementLevel: "strict",
      policyChannel: "stage",
    },
  },
  library: {
    id: "library",
    version: 1,
    description: "Template for package/library repositories with advisory-first rollout defaults.",
    defaults: {
      stage: "advisory-enforce",
      enforcementLevel: "standard",
      policyChannel: "dev",
    },
  },
};

export function getGovernanceTemplate(templateId: GovernanceTemplateId): GovernanceTemplate {
  return governanceTemplates[templateId];
}

export function listGovernanceTemplates(): readonly GovernanceTemplate[] {
  return Object.values(governanceTemplates);
}

export function isGovernanceTemplateId(value: unknown): value is GovernanceTemplateId {
  return value === "web-app" || value === "library";
}

export function isFleetEnforcementLevel(value: unknown): value is FleetEnforcementLevel {
  return value === "advisory" || value === "standard" || value === "strict";
}

export function isFleetPolicyChannel(value: unknown): value is FleetPolicyChannel {
  return value === "dev" || value === "stage" || value === "prod";
}
