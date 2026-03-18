import type { FleetGovernanceStage } from "../multi-repo/repo-manifest.js";
import {
  getGovernanceTemplate,
  type FleetEnforcementLevel,
  type FleetPolicyChannel,
  type GovernanceTemplateId,
  type GovernanceTemplateOverlay,
} from "./governance-template.js";

export type GovernanceTemplateResolutionInput = {
  template: GovernanceTemplateId;
  overlay?: GovernanceTemplateOverlay;
};

export type GovernanceTemplateResolution = {
  template: GovernanceTemplateId;
  stage: FleetGovernanceStage;
  enforcementLevel: FleetEnforcementLevel;
  policyChannel: FleetPolicyChannel;
};

export function resolveGovernanceTemplate(
  input: GovernanceTemplateResolutionInput,
): GovernanceTemplateResolution {
  const template = getGovernanceTemplate(input.template);
  const overlay = input.overlay;

  return {
    template: template.id,
    stage: overlay?.stage ?? template.defaults.stage,
    enforcementLevel: overlay?.enforcementLevel ?? template.defaults.enforcementLevel,
    policyChannel: overlay?.policyChannel ?? template.defaults.policyChannel,
  };
}
