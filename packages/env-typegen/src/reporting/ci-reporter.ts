/**
 * Build and format the V1 JSON report for `env-typegen check --json`.
 *
 * @module
 */

import type { ValidationIssue, ValidationResult } from "../validator/types.js";
import type { CiReport, Issue, IssueCode } from "./ci-contract.js";

// ---------------------------------------------------------------------------
// Human-readable descriptions (maps 1-to-1 with IssueCode)
// ---------------------------------------------------------------------------

const ISSUE_TYPE_MAP: Record<IssueCode, string> = {
  ENV_MISSING: "Required variable is missing from the env file",
  ENV_EXTRA: "Variable is present in the env file but not declared in the contract",
  ENV_INVALID_TYPE: "Value cannot be coerced to the declared type",
  ENV_INVALID_VALUE: "Value fails a constraint check (enum, min, max)",
  ENV_CONFLICT: "Variable has inconsistent values across environments",
  ENV_SECRET_EXPOSED: "Secret variable has a non-empty value in a public env file",
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toIssue(vi: ValidationIssue): Issue {
  const issue: Issue = {
    code: vi.code,
    type: ISSUE_TYPE_MAP[vi.code],
    key: vi.key,
    expected: vi.expected,
    environment: vi.environment,
    severity: vi.severity,
    value: null,
  };
  // Guard required by exactOptionalPropertyTypes — never assign `undefined`
  if (vi.received !== undefined) {
    issue.received = vi.received;
  }
  return issue;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Options for {@link formatCiReport}.
 *
 * @public
 */
export type FormatCiReportOptions = {
  /** When `true`, the output is pretty-printed with 2-space indentation. */
  pretty?: boolean;
};

/**
 * Convert a {@link ValidationResult} into a stable V1 {@link CiReport}.
 *
 * The returned object's property order is canonical:
 * `schemaVersion` → `status` → `summary` → `issues` → `meta`
 *
 * @public
 */
export function buildCiReport(
  result: ValidationResult,
  meta: { env: string; timestamp: string },
): CiReport {
  const issues = result.issues.map(toIssue);
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  return {
    schemaVersion: 1,
    status: errors > 0 ? "fail" : "ok",
    summary: { errors, warnings },
    issues,
    meta,
  };
}

/**
 * Serialise a {@link CiReport} to JSON.
 *
 * @param report   The report produced by {@link buildCiReport}.
 * @param opts     Optional formatting options.
 * @returns        JSON string. Compact by default; pretty-printed when `opts.pretty === true`.
 *
 * @public
 */
export function formatCiReport(report: CiReport, opts?: FormatCiReportOptions): string {
  return JSON.stringify(report, null, opts?.pretty === true ? 2 : undefined);
}
