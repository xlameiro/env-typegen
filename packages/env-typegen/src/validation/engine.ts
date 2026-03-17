import type {
  EnvContract,
  EnvContractVariable,
  Expected,
  IssueCode,
  IssueSeverity,
  IssueType,
  ValidationIssue,
  ValidationReport,
} from "./types.js";

type ValidateValueResult =
  | { isValid: true; receivedType: string }
  | { isValid: false; receivedType: string; issueType: "invalid_type" | "invalid_value" };

type ValidateAgainstContractOptions = {
  contract: EnvContract;
  values: Record<string, string>;
  environment: string;
  strict: boolean;
  debugValues: boolean;
};

type DiffEnvironmentSourcesOptions = {
  contract: EnvContract;
  sources: Record<string, Record<string, string>>;
  strict: boolean;
  debugValues: boolean;
};

type BuildDoctorReportOptions = {
  checkReport: ValidationReport;
  diffReport: ValidationReport;
};

// Dots are excluded from each domain-segment class so that the literal \.
// separators are unambiguous, eliminating super-linear backtracking.
const EMAIL_RE = /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/;
// Dots are excluded from inside [\w.-] groups: only the literal \. separator
// carries dot semantics, so there is no backtracking ambiguity (ReDoS-safe).
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

function detectReceivedType(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) return "unknown";
  if (["true", "false", "1", "0", "yes", "no"].includes(normalized.toLowerCase())) return "boolean";
  if (!Number.isNaN(Number(normalized)) && Number.isFinite(Number(normalized))) return "number";
  if (SEMVER_RE.test(normalized)) return "semver";
  try {
    const url = new URL(normalized);
    if (url.protocol.length > 0) return "url";
  } catch {
    // noop
  }
  if (EMAIL_RE.test(normalized)) return "email";
  try {
    const parsed: unknown = JSON.parse(normalized);
    if (typeof parsed === "object" && parsed !== null) return "json";
  } catch {
    // noop
  }
  return "string";
}

function validateNumber(
  expected: Extract<Expected, { type: "number" }>,
  normalized: string,
  receivedType: string,
): ValidateValueResult {
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return { isValid: false, receivedType, issueType: "invalid_type" };
  }
  if (expected.min !== undefined && parsed < expected.min) {
    return { isValid: false, receivedType, issueType: "invalid_value" };
  }
  if (expected.max !== undefined && parsed > expected.max) {
    return { isValid: false, receivedType, issueType: "invalid_value" };
  }
  return { isValid: true, receivedType };
}

function validateBoolean(normalized: string, receivedType: string): ValidateValueResult {
  if (!["true", "false", "1", "0", "yes", "no"].includes(normalized.toLowerCase())) {
    return { isValid: false, receivedType, issueType: "invalid_type" };
  }
  return { isValid: true, receivedType };
}

function validateEnum(
  expected: Extract<Expected, { type: "enum" }>,
  normalized: string,
  receivedType: string,
): ValidateValueResult {
  if (!expected.values.includes(normalized)) {
    return { isValid: false, receivedType, issueType: "invalid_value" };
  }
  return { isValid: true, receivedType };
}

function validateUrl(normalized: string, receivedType: string): ValidateValueResult {
  try {
    const value = new URL(normalized);
    if (value.protocol.length === 0)
      return { isValid: false, receivedType, issueType: "invalid_type" };
    return { isValid: true, receivedType };
  } catch {
    return { isValid: false, receivedType, issueType: "invalid_type" };
  }
}

function validateEmail(normalized: string, receivedType: string): ValidateValueResult {
  if (!EMAIL_RE.test(normalized))
    return { isValid: false, receivedType, issueType: "invalid_type" };
  return { isValid: true, receivedType };
}

function validateJson(normalized: string, receivedType: string): ValidateValueResult {
  try {
    const parsed: unknown = JSON.parse(normalized);
    if (typeof parsed === "object" && parsed !== null) return { isValid: true, receivedType };
    return { isValid: false, receivedType, issueType: "invalid_type" };
  } catch {
    return { isValid: false, receivedType, issueType: "invalid_type" };
  }
}

function validateSemver(normalized: string, receivedType: string): ValidateValueResult {
  if (!SEMVER_RE.test(normalized))
    return { isValid: false, receivedType, issueType: "invalid_value" };
  return { isValid: true, receivedType };
}

function validateValueAgainstExpected(expected: Expected, rawValue: string): ValidateValueResult {
  const normalized = rawValue.trim();
  const receivedType = detectReceivedType(normalized);

  if (expected.type === "unknown" || expected.type === "string")
    return { isValid: true, receivedType };
  if (expected.type === "number") return validateNumber(expected, normalized, receivedType);
  if (expected.type === "boolean") return validateBoolean(normalized, receivedType);
  if (expected.type === "enum") return validateEnum(expected, normalized, receivedType);
  if (expected.type === "url") return validateUrl(normalized, receivedType);
  if (expected.type === "email") return validateEmail(normalized, receivedType);
  if (expected.type === "json") return validateJson(normalized, receivedType);
  if (expected.type === "semver") return validateSemver(normalized, receivedType);
  return { isValid: true, receivedType };
}

function toIssueCode(issueType: IssueType): IssueCode {
  if (issueType === "missing") return "ENV_MISSING";
  if (issueType === "extra") return "ENV_EXTRA";
  if (issueType === "invalid_type") return "ENV_INVALID_TYPE";
  if (issueType === "invalid_value") return "ENV_INVALID_VALUE";
  if (issueType === "conflict") return "ENV_CONFLICT";
  return "ENV_SECRET_EXPOSED";
}

function toIssueValue(value: string | undefined, debugValues: boolean): string | null {
  if (!debugValues) return null;
  if (value === undefined) return null;
  return value;
}

function createIssue(params: {
  type: IssueType;
  severity: IssueSeverity;
  key: string;
  environment: string;
  message: string;
  value?: string;
  debugValues: boolean;
  expected?: Expected;
  receivedType?: string;
}): ValidationIssue {
  return {
    code: toIssueCode(params.type),
    type: params.type,
    severity: params.severity,
    key: params.key,
    environment: params.environment,
    message: params.message,
    value: toIssueValue(params.value, params.debugValues),
    ...(params.expected !== undefined && { expected: params.expected }),
    ...(params.receivedType !== undefined && { receivedType: params.receivedType }),
  };
}

function dedupeIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  const unique: ValidationIssue[] = [];

  for (const issue of issues) {
    const token = [
      issue.code,
      issue.type,
      issue.severity,
      issue.environment,
      issue.key,
      issue.message,
      issue.receivedType ?? "",
    ].join("|");
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(issue);
  }

  return unique;
}

function buildReport(
  env: string,
  issues: ValidationIssue[],
  recommendations?: string[],
): ValidationReport {
  const dedupedIssues = dedupeIssues(issues);
  const errors = dedupedIssues.filter((item) => item.severity === "error").length;
  const warnings = dedupedIssues.filter((item) => item.severity === "warning").length;
  const status = errors > 0 ? "fail" : "ok";

  return {
    schemaVersion: 1,
    status,
    summary: {
      errors,
      warnings,
      total: dedupedIssues.length,
    },
    issues: dedupedIssues,
    meta: {
      env,
      timestamp: new Date().toISOString(),
    },
    ...(recommendations !== undefined && recommendations.length > 0 && { recommendations }),
  };
}

function isClientSecret(variable: EnvContractVariable, key: string): boolean {
  return variable.secret === true && (variable.clientSide || key.startsWith("NEXT_PUBLIC_"));
}

type ContractCheckContext = {
  options: ValidateAgainstContractOptions;
  issues: ValidationIssue[];
};

function checkContractVariable(
  key: string,
  variable: EnvContractVariable,
  context: ContractCheckContext,
): void {
  const { options, issues } = context;
  const value = options.values[key];
  // A key that is entirely absent from the file → undefined → truly missing.
  // A key present with an empty value (KEY=) → "" → present but empty; must NOT
  // be reported as ENV_MISSING because the user deliberately declared the key.
  const hasValue = value !== undefined;

  if (variable.required && !hasValue) {
    issues.push(
      createIssue({
        type: "missing",
        severity: "error",
        key,
        environment: options.environment,
        message: `Required variable ${key} is missing.`,
        debugValues: options.debugValues,
        expected: variable.expected,
      }),
    );
    return;
  }

  if (!hasValue) return;

  const validation = validateValueAgainstExpected(variable.expected, value);
  if (!validation.isValid) {
    const message =
      validation.issueType === "invalid_type"
        ? `Variable ${key} has invalid type.`
        : `Variable ${key} has invalid value.`;
    issues.push(
      createIssue({
        type: validation.issueType,
        severity: "error",
        key,
        environment: options.environment,
        message,
        value,
        debugValues: options.debugValues,
        expected: variable.expected,
        receivedType: validation.receivedType,
      }),
    );
  }

  if (isClientSecret(variable, key)) {
    issues.push(
      createIssue({
        type: "secret_exposed",
        severity: "error",
        key,
        environment: options.environment,
        message: `Secret variable ${key} is marked as client-side.`,
        value,
        debugValues: options.debugValues,
        expected: variable.expected,
      }),
    );
  }
}

export function validateAgainstContract(options: ValidateAgainstContractOptions): ValidationReport {
  const issues: ValidationIssue[] = [];
  const contractKeys = new Set(Object.keys(options.contract.variables));

  for (const [key, variable] of Object.entries(options.contract.variables)) {
    checkContractVariable(key, variable, { options, issues });
  }

  for (const [key, value] of Object.entries(options.values)) {
    if (contractKeys.has(key)) continue;
    const severity: IssueSeverity = options.strict ? "error" : "warning";
    issues.push(
      createIssue({
        type: "extra",
        severity,
        key,
        environment: options.environment,
        message: `Variable ${key} is not defined in the contract.`,
        value,
        debugValues: options.debugValues,
      }),
    );
  }

  return buildReport(options.environment, issues);
}

function collectUnionKeys(
  contract: EnvContract,
  sources: Record<string, Record<string, string>>,
): Set<string> {
  const union = new Set<string>(Object.keys(contract.variables));
  for (const source of Object.values(sources)) {
    for (const key of Object.keys(source)) {
      union.add(key);
    }
  }
  return union;
}

type SourceEntry = { sourceName: string; value: string | undefined };

type DiffKeyContext = {
  variable: EnvContractVariable | undefined;
  options: DiffEnvironmentSourcesOptions;
  issues: ValidationIssue[];
};

function diffMissingEntries(key: string, missing: SourceEntry[], context: DiffKeyContext): void {
  const { variable, options, issues } = context;
  for (const entry of missing) {
    issues.push(
      createIssue({
        type: "missing",
        severity: "error",
        key,
        environment: entry.sourceName,
        message: `Variable ${key} is missing in ${entry.sourceName}.`,
        debugValues: options.debugValues,
        ...(variable !== undefined && { expected: variable.expected }),
      }),
    );
  }
}

function diffTypeConflicts(key: string, present: SourceEntry[], context: DiffKeyContext): void {
  const { variable, options, issues } = context;
  const typeBySource = new Map<string, string>();
  for (const entry of present) {
    typeBySource.set(entry.sourceName, detectReceivedType(entry.value ?? ""));
  }
  if (new Set(typeBySource.values()).size <= 1) return;
  for (const [sourceName, detectedType] of typeBySource.entries()) {
    issues.push(
      createIssue({
        type: "conflict",
        severity: "error",
        key,
        environment: sourceName,
        message: `Variable ${key} has conflicting inferred type across environments.`,
        debugValues: options.debugValues,
        receivedType: detectedType,
        ...(options.sources[sourceName]?.[key] !== undefined && {
          value: options.sources[sourceName]?.[key],
        }),
        ...(variable !== undefined && { expected: variable.expected }),
      }),
    );
  }
}

function diffPresentEntry(key: string, entry: SourceEntry, context: DiffKeyContext): void {
  const { variable, options, issues } = context;
  if (entry.value === undefined) return;

  if (variable === undefined) {
    const severity: IssueSeverity = options.strict ? "error" : "warning";
    issues.push(
      createIssue({
        type: "extra",
        severity,
        key,
        environment: entry.sourceName,
        message: `Variable ${key} is not defined in the contract.`,
        value: entry.value,
        debugValues: options.debugValues,
      }),
    );
    return;
  }

  const validation = validateValueAgainstExpected(variable.expected, entry.value);
  if (!validation.isValid) {
    const message =
      validation.issueType === "invalid_type"
        ? `Variable ${key} has invalid type in ${entry.sourceName}.`
        : `Variable ${key} has invalid value in ${entry.sourceName}.`;
    issues.push(
      createIssue({
        type: validation.issueType,
        severity: "error",
        key,
        environment: entry.sourceName,
        message,
        value: entry.value,
        debugValues: options.debugValues,
        expected: variable.expected,
        receivedType: validation.receivedType,
      }),
    );
  }

  if (isClientSecret(variable, key)) {
    issues.push(
      createIssue({
        type: "secret_exposed",
        severity: "error",
        key,
        environment: entry.sourceName,
        message: `Secret variable ${key} is marked as client-side.`,
        value: entry.value,
        debugValues: options.debugValues,
        expected: variable.expected,
      }),
    );
  }
}

export function diffEnvironmentSources(options: DiffEnvironmentSourcesOptions): ValidationReport {
  const issues: ValidationIssue[] = [];
  const sourceNames = Object.keys(options.sources);
  const unionKeys = collectUnionKeys(options.contract, options.sources);

  for (const key of unionKeys) {
    const variable = options.contract.variables[key];
    const valuesBySource: SourceEntry[] = sourceNames.map((sourceName) => ({
      sourceName,
      value: options.sources[sourceName]?.[key],
    }));
    // Presence is determined by key existence in the file, not value content.
    // A key with an empty value (KEY=) is "present" — not missing.
    const present = valuesBySource.filter((entry) => entry.value !== undefined);
    const missing = valuesBySource.filter((entry) => entry.value === undefined);

    if (present.length === 0 && variable?.required === true) {
      for (const entry of missing) {
        issues.push(
          createIssue({
            type: "missing",
            severity: "error",
            key,
            environment: entry.sourceName,
            message: `Required variable ${key} is missing in ${entry.sourceName}.`,
            debugValues: options.debugValues,
            expected: variable.expected,
          }),
        );
      }
      continue;
    }

    const ctx: DiffKeyContext = { variable, options, issues };
    if (present.length > 0) {
      diffMissingEntries(key, missing, ctx);
    }
    diffTypeConflicts(key, present, ctx);
    for (const entry of present) {
      diffPresentEntry(key, entry, ctx);
    }
  }

  return buildReport("diff", issues);
}

function buildRecommendations(issues: ValidationIssue[]): string[] {
  const codes = new Set<IssueCode>(issues.map((item) => item.code));
  const recommendations: string[] = [];

  if (codes.has("ENV_MISSING")) {
    recommendations.push("Add missing required variables to each target environment.");
  }
  if (codes.has("ENV_EXTRA")) {
    recommendations.push(
      "Remove undeclared variables or add them to env.contract.ts intentionally.",
    );
  }
  if (codes.has("ENV_INVALID_TYPE") || codes.has("ENV_INVALID_VALUE")) {
    recommendations.push(
      "Normalize variable values so they match the expected contract types and constraints.",
    );
  }
  if (codes.has("ENV_CONFLICT")) {
    recommendations.push("Align variable semantics across environments to avoid drift.");
  }
  if (codes.has("ENV_SECRET_EXPOSED")) {
    recommendations.push(
      "Move secret variables to server-only scope and avoid NEXT_PUBLIC_ exposure for secrets.",
    );
  }

  return recommendations;
}

export function buildDoctorReport(options: BuildDoctorReportOptions): ValidationReport {
  const merged = [...options.checkReport.issues, ...options.diffReport.issues];
  const recommendations = buildRecommendations(merged);
  return buildReport("doctor", merged, recommendations);
}
