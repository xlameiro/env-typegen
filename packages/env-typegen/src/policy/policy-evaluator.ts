import type { ValidationIssue, ValidationReport } from "../validation/types.js";
import type {
  EnvTypegenPolicyConfig,
  PolicyDecision,
  PolicyEvaluation,
  PolicyRiskLevel,
  PolicyRule,
} from "./policy-model.js";
import { resolvePolicyConfig } from "./policy-model.js";

const RISK_ORDER: Readonly<Record<PolicyRiskLevel, number>> = {
  low: 1,
  medium: 2,
  high: 3,
};

function isRiskAtLeast(left: PolicyRiskLevel, right: PolicyRiskLevel): boolean {
  return RISK_ORDER[left] >= RISK_ORDER[right];
}

function hasAnyIssueCode(issues: readonly ValidationIssue[], codes: readonly string[]): boolean {
  return issues.some((issue) => codes.includes(issue.code));
}

function hasAnyIssueType(issues: readonly ValidationIssue[], types: readonly string[]): boolean {
  return issues.some((issue) => types.includes(issue.type));
}

function inferBaselineRisk(report: ValidationReport): PolicyRiskLevel {
  const hasSecretExposure = report.issues.some((issue) => issue.type === "secret_exposed");
  if (hasSecretExposure || report.summary.errors > 0) return "high";
  if (report.summary.warnings > 0) return "medium";
  return "low";
}

function ruleMatches(
  rule: PolicyRule,
  report: ValidationReport,
  baselineRisk: PolicyRiskLevel,
): boolean {
  const match = rule.match;

  if (match.minErrors !== undefined && report.summary.errors < match.minErrors) {
    return false;
  }
  if (match.minWarnings !== undefined && report.summary.warnings < match.minWarnings) {
    return false;
  }
  if (match.issueCodes !== undefined && match.issueCodes.length > 0) {
    if (!hasAnyIssueCode(report.issues, match.issueCodes)) {
      return false;
    }
  }
  if (match.issueTypes !== undefined && match.issueTypes.length > 0) {
    if (!hasAnyIssueType(report.issues, match.issueTypes)) {
      return false;
    }
  }
  if (match.riskAtLeast !== undefined && !isRiskAtLeast(baselineRisk, match.riskAtLeast)) {
    return false;
  }

  return true;
}

function fallbackDecision(
  report: ValidationReport,
  policy: ReturnType<typeof resolvePolicyConfig>,
): PolicyDecision {
  if (report.summary.errors > 0) return policy.defaults.onErrors;
  if (report.summary.warnings > 0) return policy.defaults.onWarnings;
  return policy.defaults.onClean;
}

export function evaluatePolicy(
  report: ValidationReport,
  policyConfig: EnvTypegenPolicyConfig | undefined,
): PolicyEvaluation {
  const resolvedPolicy = resolvePolicyConfig(policyConfig);
  const orderedRules = resolvedPolicy.rules.filter((rule) => rule.id.trim().length > 0);
  const baselineRisk = inferBaselineRisk(report);

  let decision = fallbackDecision(report, resolvedPolicy);
  let risk = baselineRisk;
  const reasons: string[] = [];
  let matchedRule: string | undefined;

  for (const rule of orderedRules) {
    if (!ruleMatches(rule, report, baselineRisk)) {
      continue;
    }

    decision = rule.decision;
    risk = rule.risk ?? baselineRisk;
    matchedRule = rule.id;
    reasons.push(rule.reason);
    break;
  }

  if (matchedRule === undefined) {
    if (decision === "allow") reasons.push("No policy violations found for current report.");
    if (decision === "warn") reasons.push("Policy allows execution with warnings.");
    if (decision === "block") reasons.push("Policy blocks execution when issues are present.");
  }

  if (resolvedPolicy.mode === "advisory" && decision === "block") {
    decision = "warn";
    reasons.push("Advisory mode downgraded block decision to warn.");
  }

  return {
    decision,
    risk,
    mode: resolvedPolicy.mode,
    ...(matchedRule !== undefined && { matchedRule }),
    reasons,
    summary: {
      errors: report.summary.errors,
      warnings: report.summary.warnings,
      total: report.summary.total,
    },
  };
}
