import type { ParsedEnvFile, ParsedEnvVar } from "../parser/types.js";
import type { Expected } from "../reporting/ci-contract.js";
import type { EnvContract, EnvContractEntry } from "../schema/schema-model.js";
import type { ValidateContractOptions, ValidationIssue, ValidationResult } from "./types.js";

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

// ---------------------------------------------------------------------------
// Internal type helpers
// ---------------------------------------------------------------------------

/**
 * Maps an `EnvContractEntry` to an `Expected` discriminated union member
 * for use in issue payloads.
 */
function buildExpected(entry: EnvContractEntry): Expected {
  if (entry.enumValues !== undefined && entry.enumValues.length > 0) {
    return { type: "enum", values: entry.enumValues };
  }

  switch (entry.expectedType) {
    case "number":
      return {
        type: "number",
        ...(entry.constraints?.min !== undefined && { min: entry.constraints.min }),
        ...(entry.constraints?.max !== undefined && { max: entry.constraints.max }),
      };
    case "boolean":
      return { type: "boolean" };
    case "url":
      return { type: "url" };
    case "email":
      return { type: "email" };
    case "json":
      return { type: "json" };
    case "semver":
      return { type: "semver" };
    case "unknown":
      return { type: "unknown" };
    default:
      return { type: "string" };
  }
}

// ---------------------------------------------------------------------------
// Per-rule validator functions
// ---------------------------------------------------------------------------

/**
 * ENV_SECRET_EXPOSED — a variable marked as `isSecret` has a non-empty raw value.
 * This indicates the secret is committed to source control or a public example file.
 */
function checkSecretExposed(
  variable: ParsedEnvVar,
  entry: EnvContractEntry,
  environment: NonNullable<ValidateContractOptions["environment"]>,
): ValidationIssue | undefined {
  if (entry.isSecret !== true) return undefined;
  if (variable.rawValue === "") return undefined;

  return {
    code: "ENV_SECRET_EXPOSED",
    key: variable.key,
    expected: buildExpected(entry),
    environment,
    severity: "error",
  };
}

/**
 * ENV_INVALID_TYPE — the raw value cannot be coerced to the declared type.
 */
function checkInvalidType(
  variable: ParsedEnvVar,
  entry: EnvContractEntry,
  environment: NonNullable<ValidateContractOptions["environment"]>,
): ValidationIssue | undefined {
  const value = variable.rawValue;
  const expected = buildExpected(entry);

  switch (entry.expectedType) {
    case "number": {
      if (!Number.isFinite(Number(value))) {
        return {
          code: "ENV_INVALID_TYPE",
          key: variable.key,
          expected,
          environment,
          severity: "error",
        };
      }
      break;
    }
    case "boolean": {
      if (value !== "true" && value !== "false") {
        return {
          code: "ENV_INVALID_TYPE",
          key: variable.key,
          expected,
          environment,
          severity: "error",
        };
      }
      break;
    }
    case "url": {
      try {
        new URL(value);
      } catch {
        return {
          code: "ENV_INVALID_TYPE",
          key: variable.key,
          expected,
          environment,
          severity: "error",
        };
      }
      break;
    }
    case "email": {
      if (!value.includes("@") || !value.includes(".")) {
        return {
          code: "ENV_INVALID_TYPE",
          key: variable.key,
          expected,
          environment,
          severity: "error",
        };
      }
      break;
    }
    case "semver": {
      if (!SEMVER_RE.test(value)) {
        return {
          code: "ENV_INVALID_TYPE",
          key: variable.key,
          expected,
          environment,
          severity: "error",
        };
      }
      break;
    }
    default:
      // "string", "json", "unknown" — no structural coercion check in V1
      break;
  }

  return undefined;
}

/** Checks numeric range constraints. Returns an issue if the value is outside [min, max]. */
function checkNumericConstraints(
  variable: ParsedEnvVar,
  entry: EnvContractEntry,
  environment: NonNullable<ValidateContractOptions["environment"]>,
): ValidationIssue | undefined {
  if (entry.expectedType !== "number" || entry.constraints === undefined) return undefined;

  const num = Number(variable.rawValue);
  if (!Number.isFinite(num)) return undefined;

  const { min, max } = entry.constraints;
  const outsideMin = min !== undefined && num < min;
  const outsideMax = max !== undefined && num > max;

  if (outsideMin || outsideMax) {
    return {
      code: "ENV_INVALID_VALUE",
      key: variable.key,
      expected: buildExpected(entry),
      environment,
      severity: "error",
    };
  }

  return undefined;
}

/**
 * ENV_INVALID_VALUE — the value fails an enum or numeric range constraint.
 * Only checked after type validation passes.
 */
function checkInvalidValue(
  variable: ParsedEnvVar,
  entry: EnvContractEntry,
  environment: NonNullable<ValidateContractOptions["environment"]>,
): ValidationIssue | undefined {
  const value = variable.rawValue;

  // Enum constraint takes precedence over min/max
  if (entry.enumValues !== undefined && entry.enumValues.length > 0) {
    if (!entry.enumValues.includes(value)) {
      return {
        code: "ENV_INVALID_VALUE",
        key: variable.key,
        expected: { type: "enum", values: entry.enumValues },
        environment,
        severity: "error",
      };
    }
    return undefined;
  }

  return checkNumericConstraints(variable, entry, environment);
}

type CheckVariableContext = {
  contractByName: Map<string, EnvContractEntry>;
  environment: NonNullable<ValidateContractOptions["environment"]>;
  strict: boolean;
};

/**
 * Run all per-variable checks for a single parsed variable.
 * Returns all issues found (may be empty).
 */
function checkVariable(variable: ParsedEnvVar, context: CheckVariableContext): ValidationIssue[] {
  const { contractByName, environment, strict } = context;
  const entry = contractByName.get(variable.key);

  if (entry === undefined) {
    return [
      {
        code: "ENV_EXTRA",
        key: variable.key,
        expected: { type: "string" },
        environment,
        severity: strict ? "error" : "warning",
      },
    ];
  }

  const found: ValidationIssue[] = [];

  // ENV_SECRET_EXPOSED — checked first
  const secretIssue = checkSecretExposed(variable, entry, environment);
  if (secretIssue !== undefined) found.push(secretIssue);

  // Skip further checks for empty values
  if (variable.rawValue === "") return found;

  // ENV_INVALID_TYPE
  const typeIssue = checkInvalidType(variable, entry, environment);
  if (typeIssue !== undefined) {
    found.push(typeIssue);
    return found; // no constraint checks on type-invalid values
  }

  // ENV_INVALID_VALUE (enum / min / max)
  const valueIssue = checkInvalidValue(variable, entry, environment);
  if (valueIssue !== undefined) found.push(valueIssue);

  return found;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a parsed env file against a contract definition.
 *
 * Produces a {@link ValidationResult} containing all discovered issues.
 * Does not throw — every problem becomes a typed {@link ValidationIssue}.
 *
 * Issue codes checked:
 * - `ENV_MISSING`        — required contract var absent from env file
 * - `ENV_EXTRA`          — env file var not declared in contract
 * - `ENV_INVALID_TYPE`   — value cannot be coerced to declared type
 * - `ENV_INVALID_VALUE`  — enum or min/max constraint violated
 * - `ENV_SECRET_EXPOSED` — secret var has non-empty value in env file
 *
 * Note: `ENV_CONFLICT` is not emitted in V1 (requires multi-file comparison
 * which belongs to the `diff` command, Phase 4).
 *
 * @param parsed   — result of `parseEnvFile` for the env file under check
 * @param contract — the authoritative contract to validate against
 * @param opts     — optional check configuration (environment, strict mode)
 * @returns        — `{ issues: ValidationIssue[] }` — empty when all checks pass
 *
 * @public
 */
export function validateContract(
  parsed: ParsedEnvFile,
  contract: EnvContract,
  opts: ValidateContractOptions = {},
): ValidationResult {
  const environment = opts.environment ?? "local";
  const strict = opts.strict ?? true;

  const issues: ValidationIssue[] = [];

  // Build lookup maps for O(n) iteration
  const contractByName = new Map<string, EnvContractEntry>(
    contract.vars.map((entry) => [entry.name, entry]),
  );
  const parsedByKey = new Map<string, ParsedEnvVar>(parsed.vars.map((v) => [v.key, v]));

  // ---------------------------------------------------------------------------
  // Check 1: ENV_MISSING — required contract vars absent from the env file
  // ---------------------------------------------------------------------------
  for (const entry of contract.vars) {
    if (!entry.required) continue;
    if (parsedByKey.has(entry.name)) continue;

    issues.push({
      code: "ENV_MISSING",
      key: entry.name,
      expected: buildExpected(entry),
      environment,
      severity: "error",
    });
  }

  // ---------------------------------------------------------------------------
  // Check 2: Per-variable checks on vars that exist in both parsed and contract
  // ---------------------------------------------------------------------------
  const context: CheckVariableContext = { contractByName, environment, strict };
  for (const variable of parsed.vars) {
    const perVarIssues = checkVariable(variable, context);
    for (const issue of perVarIssues) {
      issues.push(issue);
    }
  }

  return { issues };
}
