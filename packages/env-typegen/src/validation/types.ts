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

export type EnvContractVariable = {
  expected: Expected;
  required: boolean;
  clientSide: boolean;
  description?: string;
  secret?: boolean;
};

export type EnvContract = {
  schemaVersion: 1;
  variables: Record<string, EnvContractVariable>;
};

export type IssueCode =
  | "ENV_MISSING"
  | "ENV_EXTRA"
  | "ENV_INVALID_TYPE"
  | "ENV_INVALID_VALUE"
  | "ENV_CONFLICT"
  | "ENV_SECRET_EXPOSED";

export type IssueType =
  | "missing"
  | "extra"
  | "invalid_type"
  | "invalid_value"
  | "conflict"
  | "secret_exposed";

export type IssueSeverity = "error" | "warning";

export type ValidationIssue = {
  code: IssueCode;
  type: IssueType;
  severity: IssueSeverity;
  key: string;
  environment: string;
  message: string;
  expected?: Expected;
  receivedType?: string;
  value: string | null;
};

export type ValidationSummary = {
  errors: number;
  warnings: number;
  total: number;
};

export type ValidationStatus = "ok" | "fail";

export type ValidationMeta = {
  env: string;
  timestamp: string;
};

export type ValidationReport = {
  schemaVersion: 1;
  status: ValidationStatus;
  summary: ValidationSummary;
  issues: ValidationIssue[];
  meta: ValidationMeta;
  recommendations?: string[];
};
