import { buildDriftRecommendations, redactDriftReportValues } from "../reporting/drift-report.js";
import type { ValidationReport } from "../validation/types.js";

type FinalizeVerifyReportOptions = {
  /** Verify defaults to redacted values to avoid accidental secret leaks in CI logs. */
  redactValuesByDefault?: boolean;
};

export function finalizeVerifyReport(
  report: ValidationReport,
  options: FinalizeVerifyReportOptions = {},
): ValidationReport {
  const shouldRedact = options.redactValuesByDefault ?? true;
  const baseReport = shouldRedact ? redactDriftReportValues(report) : report;

  const hasErrors = baseReport.summary.errors > 0;
  const hasWarnings = baseReport.summary.warnings > 0;

  return {
    ...baseReport,
    status: hasErrors || hasWarnings ? "fail" : "ok",
    recommendations: buildDriftRecommendations(baseReport),
  };
}
