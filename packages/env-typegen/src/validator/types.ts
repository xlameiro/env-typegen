import type { Environment, Expected, IssueCode, IssueSeverity } from "../reporting/ci-contract.js";

/**
 * Options controlling how `validateContract` handles edge cases.
 *
 * @internal
 */
export type ValidateContractOptions = {
  /**
   * The deployment environment under validation.
   * Defaults to `"local"` when not specified.
   */
  environment?: Environment;
  /**
   * When true, variables not declared in the contract are treated as errors
   * instead of warnings. Matches the `strict` option in `EnvTypegenConfig`.
   *
   * Defaults to `true` (strict by default in V1).
   */
  strict?: boolean;
};

/**
 * A single found validation issue, as produced by the validator engine.
 * Used internally before being converted to a {@link CiReport} via the reporter.
 *
 * @internal
 */
export type ValidationIssue = {
  code: IssueCode;
  key: string;
  expected: Expected;
  received?: string;
  environment: Environment;
  severity: IssueSeverity;
};

/**
 * The full result of running `validateContract` against a parsed env file.
 *
 * @internal
 */
export type ValidationResult = {
  issues: ValidationIssue[];
};
