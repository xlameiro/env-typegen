import type { PolicyEvaluation } from "../policy/policy-model.js";
import type { ValidationReport } from "../validation/types.js";

export function formatPolicyRecommendation(policy: PolicyEvaluation): string {
  const rule = policy.matchedRule === undefined ? "" : ` rule=${policy.matchedRule}`;
  return `Policy decision: ${policy.decision.toUpperCase()} (risk: ${policy.risk.toUpperCase()}, mode: ${policy.mode})${rule}`;
}

export function attachPolicyEvaluation(
  report: ValidationReport,
  policy: PolicyEvaluation,
): ValidationReport {
  const currentRecommendations = report.recommendations ?? [];
  const nextRecommendations = [
    ...currentRecommendations,
    formatPolicyRecommendation(policy),
    ...policy.reasons,
  ];

  return {
    ...report,
    recommendations: [...new Set(nextRecommendations)],
  };
}

export function formatPlanOutput(params: {
  report: ValidationReport;
  policy: PolicyEvaluation;
}): string {
  const lines: string[] = [];
  lines.push("env-typegen plan");
  lines.push("");
  lines.push(
    `Verification summary: errors=${params.report.summary.errors}, warnings=${params.report.summary.warnings}, total=${params.report.summary.total}`,
  );
  lines.push(
    `Policy decision: ${params.policy.decision.toUpperCase()} (risk=${params.policy.risk}, mode=${params.policy.mode})`,
  );
  if (params.policy.matchedRule !== undefined) {
    lines.push(`Matched rule: ${params.policy.matchedRule}`);
  }
  if (params.policy.reasons.length > 0) {
    lines.push("", "Reasons:");
    for (const reason of params.policy.reasons) {
      lines.push(`- ${reason}`);
    }
  }
  if (params.report.recommendations !== undefined && params.report.recommendations.length > 0) {
    lines.push("", "Recommendations:");
    for (const recommendation of params.report.recommendations) {
      lines.push(`- ${recommendation}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

export function formatSyncPreviewOutput(params: {
  provider: string;
  environment: string;
  missingInRemote: string[];
  extraInRemote: string[];
  mismatches: string[];
  policy: PolicyEvaluation;
}): string {
  const lines: string[] = [];
  lines.push(`env-typegen sync-preview (${params.provider}/${params.environment})`);
  lines.push("");
  lines.push(
    `Drift summary: missingInRemote=${params.missingInRemote.length}, extraInRemote=${params.extraInRemote.length}, mismatches=${params.mismatches.length}`,
  );
  lines.push(
    `Policy decision: ${params.policy.decision.toUpperCase()} (risk=${params.policy.risk}, mode=${params.policy.mode})`,
  );

  if (params.missingInRemote.length > 0) {
    lines.push("", "Missing in remote:");
    for (const key of params.missingInRemote) lines.push(`- ${key}`);
  }
  if (params.extraInRemote.length > 0) {
    lines.push("", "Extra in remote:");
    for (const key of params.extraInRemote) lines.push(`- ${key}`);
  }
  if (params.mismatches.length > 0) {
    lines.push("", "Mismatched values:");
    for (const key of params.mismatches) lines.push(`- ${key}`);
  }
  if (params.policy.reasons.length > 0) {
    lines.push("", "Reasons:");
    for (const reason of params.policy.reasons) lines.push(`- ${reason}`);
  }

  return `${lines.join("\n")}\n`;
}
