import type { ValidationIssue, ValidationReport } from "../validation/types.js";

export type DriftImpactProfile = {
  low: number;
  medium: number;
  high: number;
};

function countIssueType(issues: readonly ValidationIssue[], type: ValidationIssue["type"]): number {
  return issues.filter((issue) => issue.type === type).length;
}

function addRecommendationIfAny(
  recommendations: string[],
  count: number,
  buildMessage: (count: number) => string,
): void {
  if (count <= 0) {
    return;
  }

  recommendations.push(buildMessage(count));
}

export function redactDriftReportValues(report: ValidationReport): ValidationReport {
  return {
    ...report,
    issues: report.issues.map((issue) => ({
      ...issue,
      value: null,
    })),
  };
}

export function buildDriftRecommendations(report: ValidationReport): string[] {
  const recommendations: string[] = [...(report.recommendations ?? [])];

  const missingCount = countIssueType(report.issues, "missing");
  const extraCount = countIssueType(report.issues, "extra");
  const invalidTypeCount = countIssueType(report.issues, "invalid_type");
  const invalidValueCount = countIssueType(report.issues, "invalid_value");
  const conflictCount = countIssueType(report.issues, "conflict");
  const secretExposedCount = countIssueType(report.issues, "secret_exposed");

  addRecommendationIfAny(
    recommendations,
    missingCount,
    (count) =>
      `Add ${count} missing variable${count === 1 ? "" : "s"} to the target environment before deploy.`,
  );
  addRecommendationIfAny(
    recommendations,
    invalidTypeCount,
    (count) => `Fix ${count} type mismatch${count === 1 ? "" : "es"} to match the contract schema.`,
  );
  addRecommendationIfAny(
    recommendations,
    invalidValueCount,
    (count) =>
      `Fix ${count} invalid value violation${count === 1 ? "" : "s"} to satisfy allowed contract constraints.`,
  );
  addRecommendationIfAny(
    recommendations,
    conflictCount,
    (count) =>
      `Resolve ${count} environment conflict${count === 1 ? "" : "s"} so each key has a single intended source of truth.`,
  );
  addRecommendationIfAny(
    recommendations,
    secretExposedCount,
    (count) =>
      `Move ${count} exposed secret${count === 1 ? "" : "s"} to a server-only environment and rotate credentials if leaked.`,
  );

  if (extraCount > 0) {
    recommendations.push(
      `Review ${extraCount} undeclared variable${extraCount === 1 ? "" : "s"} and remove or add them intentionally to the schema.`,
    );
  }

  return [...new Set(recommendations)];
}

function classifyIssueImpact(issue: ValidationIssue): keyof DriftImpactProfile {
  if (issue.type === "secret_exposed" || issue.type === "conflict" || issue.type === "extra") {
    return "high";
  }

  if (issue.type === "missing" || issue.type === "invalid_type" || issue.type === "invalid_value") {
    return "medium";
  }

  return "low";
}

export function buildDriftImpactProfile(report: ValidationReport): DriftImpactProfile {
  return report.issues.reduce<DriftImpactProfile>(
    (acc, issue) => {
      const impact = classifyIssueImpact(issue);
      acc[impact] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 },
  );
}
