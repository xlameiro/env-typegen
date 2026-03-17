/**
 * Machine-readable CI contract types for env-typegen V1 JSON output.
 *
 * Stable JSON schema emitted by `env-typegen check --json` and consumed by
 * CI pipelines, dashboards, and automation tools.
 *
 * Property order on {@link CiReport} is intentional and stable:
 * `schemaVersion` → `status` → `summary` → `issues` → `meta`
 *
 * @module
 */

/**
 * Stable machine-readable issue category code.
 * Used in {@link Issue.code} to enable programmatic filtering and alerting.
 *
 * - `ENV_MISSING`        — a required variable is absent from the env file
 * - `ENV_EXTRA`          — a variable exists in the env file but not in the contract
 * - `ENV_INVALID_TYPE`   — the value cannot be coerced to the declared type
 * - `ENV_INVALID_VALUE`  — the value fails a constraint (enum, min, max)
 * - `ENV_CONFLICT`       — the variable has inconsistent values across environments
 * - `ENV_SECRET_EXPOSED` — a secret variable has a non-empty value in a public file
 *
 * @public
 */
export type IssueCode =
  | "ENV_MISSING"
  | "ENV_EXTRA"
  | "ENV_INVALID_TYPE"
  | "ENV_INVALID_VALUE"
  | "ENV_CONFLICT"
  | "ENV_SECRET_EXPOSED";

/**
 * The expected shape of an environment variable, expressed as a discriminated
 * union on `type`. Used in {@link Issue.expected} to communicate the declared
 * expectation when a validation failure occurs.
 *
 * @public
 */
export type Expected =
  | { type: "string" }
  | { type: "number"; min?: number; max?: number }
  | { type: "boolean" }
  | { type: "enum"; values: string[] }
  | { type: "url" }
  | { type: "email" }
  | { type: "json" }
  | { type: "semver" }
  | { type: "unknown" };

/**
 * Deployment environment against which a check was run.
 *
 * @public
 */
export type Environment = "local" | "example" | "production" | "preview" | "test" | "cloud";

/**
 * Whether a validation issue is blocking (`error`) or advisory (`warning`).
 *
 * @public
 */
export type IssueSeverity = "error" | "warning";

/**
 * Overall check result: `"ok"` when no errors; `"fail"` when at least one
 * error-severity issue exists.
 *
 * @public
 */
export type ReportStatus = "ok" | "fail";

/**
 * A single validation issue found during `env-typegen check`.
 *
 * @public
 */
export type Issue = {
  /** Stable machine-readable category code. Use this for programmatic filtering. */
  code: IssueCode;
  /** Human-readable description of the issue category (maps 1-to-1 with `code`). */
  type: string;
  /** The environment variable key that caused the issue. */
  key: string;
  /** What the contract declared was expected for this variable. */
  expected: Expected;
  /** The raw received value when applicable and not a secret. Absent otherwise. */
  received?: string;
  /** The environment context where this issue was detected. */
  environment: Environment;
  /** Whether this issue blocks deployment (`error`) or is advisory (`warning`). */
  severity: IssueSeverity;
  /**
   * Always `null` in V1 JSON output.
   *
   * Prevents accidental secret exposure in machine-readable reports stored in
   * CI artefacts, logs, or dashboards. Use `--debug-values` for human-readable
   * output that shows the actual value for non-secret variables.
   */
  value: null;
};

/**
 * Top-level V1 JSON report emitted by `env-typegen check --json`.
 *
 * The property order is stable and intentional:
 * `schemaVersion` → `status` → `summary` → `issues` → `meta`
 *
 * When `schemaVersion` is incremented, it indicates a breaking change to this
 * type shape. Consumers should guard on `schemaVersion === 1` before reading.
 *
 * @public
 */
export type CiReport = {
  /** Integer schema version. Incremented on breaking changes to this type shape. */
  schemaVersion: 1;
  /** `"ok"` when no errors were found; `"fail"` when at least one error-severity issue exists. */
  status: ReportStatus;
  /** Issue counts by severity. */
  summary: { errors: number; warnings: number };
  /** All issues found during the check, in source order. */
  issues: Issue[];
  /** Execution context: which env file was checked and when. */
  meta: { env: string; timestamp: string };
};
