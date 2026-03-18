export type AdapterEnvironment = "development" | "preview" | "production" | (string & {});

export type EnvMap = Record<string, string | undefined>;

export type AdapterCapabilities = {
  pull: boolean;
  push: boolean;
  compare: boolean;
  /** Prevent accidental secret leaks in logs and reports. */
  redactValuesByDefault: boolean;
  /** Indicates expected provider write behavior when push is enabled. */
  writeSemantics?: "best-effort" | "idempotent";
  /** Governance conformance contract version supported by this adapter. */
  conformanceVersion?: 3 | 4;
  /** Reconciliation behavior exposed for deterministic governance planning. */
  reconciliationMode?: "deterministic" | "best-effort";
  /** Observable idempotency semantics for replay-safe apply operations. */
  idempotency?: "idempotent" | "non-idempotent";
};

export type AdapterMeta = {
  name: string;
  version?: string;
  supportedEnvironments?: AdapterEnvironment[];
  capabilities: AdapterCapabilities;
};

export type AdapterContext = {
  environment: AdapterEnvironment;
  projectId?: string;
  token?: string;
  /** Raw provider config from env-typegen.config.* */
  providerConfig?: Record<string, unknown>;
  /** When undefined, adapters should default to redacted output. */
  redactValues?: boolean;
};

export type AdapterPullResult = {
  values: EnvMap;
  warnings?: string[];
  metadata?: Record<string, unknown>;
};

export type AdapterDiffEntry = {
  key: string;
  reason: "missing" | "extra" | "mismatch";
};

export type AdapterCompareResult = {
  missingInRemote: string[];
  extraInRemote: string[];
  mismatches: AdapterDiffEntry[];
};

export type AdapterPushFailureKind = "none" | "transient" | "permanent";

export type AdapterPushOperationStatus = "applied" | "failed" | "skipped";

export type AdapterPushOperationResult = {
  key: string;
  status: AdapterPushOperationStatus;
  message: string;
  failureKind: AdapterPushFailureKind;
};

export type AdapterPushOperationAction = "upsert" | "delete" | "no-op";

export type AdapterPushOperationResultV4 = {
  key: string;
  action: AdapterPushOperationAction;
  status: AdapterPushOperationStatus;
  message: string;
  failureKind: AdapterPushFailureKind;
  attempts: number;
};

export type AdapterPushOutcome = "applied" | "partial-failure" | "no-change" | "blocked";

export type AdapterPushResult = {
  outcome: AdapterPushOutcome;
  operations: AdapterPushOperationResult[];
  summary: {
    applied: number;
    failed: number;
    skipped: number;
    total: number;
  };
};

export type AdapterPushResultV4 = {
  contractVersion: 4;
  outcome: AdapterPushOutcome;
  operations: AdapterPushOperationResultV4[];
  summary: {
    applied: number;
    failed: number;
    skipped: number;
    total: number;
  };
};

export type AdapterPushResultAny = AdapterPushResult | AdapterPushResultV4;

export type EnvAdapter = {
  name: string;
  pull: (context: AdapterContext) => Promise<AdapterPullResult>;
  push?: (context: AdapterContext, values: EnvMap) => Promise<AdapterPushResultAny>;
  compare?: (
    context: AdapterContext,
    localValues: EnvMap,
    remoteValues: EnvMap,
  ) => Promise<AdapterCompareResult>;
  meta?: () => AdapterMeta;
};
