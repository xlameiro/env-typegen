import type { IssueCode, IssueType } from "../validation/types.js";

export type PolicyDecision = "allow" | "warn" | "block";

export type PolicyRiskLevel = "low" | "medium" | "high";

export type PolicyMode = "read-only" | "advisory";

export type PolicyRuleMatch = {
  minErrors?: number;
  minWarnings?: number;
  issueCodes?: IssueCode[];
  issueTypes?: IssueType[];
  riskAtLeast?: PolicyRiskLevel;
};

export type PolicyRule = {
  id: string;
  match: PolicyRuleMatch;
  decision: PolicyDecision;
  risk?: PolicyRiskLevel;
  reason: string;
};

export type EnvTypegenPolicyDefaults = {
  onClean?: PolicyDecision;
  onWarnings?: PolicyDecision;
  onErrors?: PolicyDecision;
};

export type PolicyPackReference =
  | string
  | {
      source: string;
      checksum?: string;
    };

export type EnvTypegenPolicyPacks = {
  base?: PolicyPackReference[];
  overlay?: PolicyPackReference[];
};

export type EnvTypegenPolicyConfig = {
  mode?: PolicyMode;
  defaults?: EnvTypegenPolicyDefaults;
  rules?: PolicyRule[];
  packs?: EnvTypegenPolicyPacks;
};

export type ResolvedPolicyConfig = {
  mode: PolicyMode;
  defaults: {
    onClean: PolicyDecision;
    onWarnings: PolicyDecision;
    onErrors: PolicyDecision;
  };
  rules: PolicyRule[];
};

export type PolicyEvaluation = {
  decision: PolicyDecision;
  risk: PolicyRiskLevel;
  mode: PolicyMode;
  matchedRule?: string;
  reasons: string[];
  summary: {
    errors: number;
    warnings: number;
    total: number;
  };
};

export const DEFAULT_POLICY_CONFIG: ResolvedPolicyConfig = {
  mode: "read-only",
  defaults: {
    onClean: "allow",
    onWarnings: "block",
    onErrors: "block",
  },
  rules: [],
};

export function resolvePolicyConfig(
  policy: EnvTypegenPolicyConfig | undefined,
): ResolvedPolicyConfig {
  if (policy === undefined) {
    return DEFAULT_POLICY_CONFIG;
  }

  return {
    mode: policy.mode ?? DEFAULT_POLICY_CONFIG.mode,
    defaults: {
      onClean: policy.defaults?.onClean ?? DEFAULT_POLICY_CONFIG.defaults.onClean,
      onWarnings: policy.defaults?.onWarnings ?? DEFAULT_POLICY_CONFIG.defaults.onWarnings,
      onErrors: policy.defaults?.onErrors ?? DEFAULT_POLICY_CONFIG.defaults.onErrors,
    },
    rules: policy.rules ?? [],
  };
}
