import type { EnvVarType } from "../parser/types.js";

export type InferenceRule = {
  id: string;
  priority: number;
  match: (key: string, value: string) => boolean;
  type: EnvVarType;
};

export const inferenceRules: readonly InferenceRule[] = [
  {
    id: "P2_key_url_suffix",
    priority: 2,
    match: (key: string) => key.toUpperCase().endsWith("_URL"),
    type: "url",
  },
  {
    id: "P3_key_email_from_suffix",
    priority: 3,
    match: (key: string) => {
      const normalizedKey = key.toUpperCase();
      return normalizedKey.endsWith("_EMAIL") || normalizedKey.endsWith("_FROM");
    },
    type: "email",
  },
  {
    id: "P4_boolean_prefix",
    priority: 4,
    match: (key: string) => {
      const normalizedKey = key.toUpperCase();
      return (
        normalizedKey.startsWith("ENABLE_") ||
        normalizedKey.startsWith("DISABLE_") ||
        normalizedKey.startsWith("IS_") ||
        normalizedKey.startsWith("DEBUG") ||
        normalizedKey.startsWith("FEATURE_")
      );
    },
    type: "boolean",
  },
  {
    id: "P5_key_port",
    priority: 5,
    match: (key: string) => {
      const normalizedKey = key.toUpperCase();
      return normalizedKey.endsWith("_PORT") || normalizedKey === "PORT";
    },
    type: "number",
  },
  {
    id: "P6_empty_unknown",
    priority: 6,
    match: (_key: string, value: string) => value.length === 0,
    type: "unknown",
  },
  {
    id: "P7_boolean_literal",
    priority: 7,
    match: (_key: string, value: string) => {
      const lower = value.toLowerCase();
      return lower === "true" || lower === "false";
    },
    type: "boolean",
  },
  {
    id: "P8_numeric_literal",
    priority: 8,
    // Non-capturing group with \d keeps the dot/digit boundary unambiguous,
    // eliminating super-linear backtracking (ReDoS-safe).
    match: (_key: string, value: string) => /^\d+(?:\.\d+)?$/.test(value),
    type: "number",
  },
  {
    id: "P9_semver",
    priority: 9,
    match: (_key: string, value: string) => /^\d+\.\d+\.\d+/.test(value),
    type: "semver",
  },
  {
    id: "P10_url_scheme",
    priority: 10,
    // BUG-02: comma-separated URL lists (e.g. ALLOWED_ORIGINS) must NOT be inferred as
    // a single URL — they don't pass z.string().url() or new URL() validation at runtime.
    match: (_key: string, value: string) =>
      !value.includes(",") && /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value),
    type: "url",
  },
  {
    id: "P11_email_literal",
    priority: 11,
    // Dots are excluded from each domain-segment character class so that the
    // literal \. separators are unambiguous, preventing super-linear backtracking.
    match: (_key: string, value: string) => /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/.test(value),
    type: "email",
  },
  {
    id: "P12_json_object_array",
    priority: 12,
    match: (_key: string, value: string) => {
      try {
        const parsed: unknown = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null;
      } catch {
        return false;
      }
    },
    type: "json",
  },
] as const;
