import type { EnvVarType } from "../parser/types.js";

/**
 * Runtime scope for an environment variable.
 * Controls which part of the application has access to the variable.
 *
 * - `"server"` — accessible only in server-side code (Node.js process)
 * - `"client"` — accessible in browser code (must be safe to expose publicly)
 * - `"edge"`   — accessible in Edge runtime (limited Node.js API surface)
 *
 * @public
 */
export type EnvVarRuntime = "server" | "client" | "edge";

/**
 * A single entry in the env contract: the canonical, authoritative declaration
 * for one environment variable.
 *
 * In contract-first mode (`schemaMode: "contract-first"`) this is the source of
 * truth. The inference engine acts only as a fallback when no contract entry
 * exists for a given variable.
 *
 * @public
 */
export type EnvContractEntry = {
  /** The environment variable name as it appears in the env file (e.g. `DATABASE_URL`). */
  name: string;
  /** The expected TypeScript type for this variable's runtime value. */
  expectedType: EnvVarType;
  /** Whether this variable must be present. Overrides inference-based required detection. */
  required: boolean;
  /** Static default value used when the variable is absent from the env file. */
  default?: string;
  /** Allowed literal values for `enum`-typed variables (e.g. `["development", "staging", "production"]`). */
  enumValues?: string[];
  /** Numeric range constraints for `number`-typed variables. */
  constraints?: { min?: number; max?: number };
  /** Which runtime this variable is available to. Used to enforce NEXT_PUBLIC_ boundaries. */
  runtime?: EnvVarRuntime;
  /**
   * When true, the variable's value is never included in reports, logs, or
   * generated type file comments — it is treated as a secret.
   */
  isSecret?: boolean;
  /** Human-readable description used in documentation generation and error messages. */
  description?: string;
};

/**
 * The full environment contract — a collection of all declared variables
 * and their expected shape.
 *
 * Used as the source of truth in contract-first mode (`schemaMode: "contract-first"`).
 * Create a contract file at `env.contract.ts` and define this with {@link defineContract}
 * from the schema loader for type safety.
 *
 * @public
 */
export type EnvContract = {
  /** All declared environment variable contracts, in declaration order. */
  vars: EnvContractEntry[];
};
