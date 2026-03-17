import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { inferType, parseEnvFile, parseEnvFileContent } from "../../src/parser/env-parser.js";

const FIXTURES_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../fixtures");
const BASIC_FIXTURE = resolve(FIXTURES_DIR, "basic.env.example");
const NEXTJS_FIXTURE = resolve(FIXTURES_DIR, "nextjs.env.example");
const COMPLEX_FIXTURE = resolve(FIXTURES_DIR, "complex.env.example");

describe("inferType", () => {
  it("should return 'unknown' for an empty string", () => {
    expect(inferType("EMPTY", "")).toBe("unknown");
  });

  it("should return 'url' for keys ending in _URL (P2) regardless of value", () => {
    expect(inferType("REDIS_URL", "not-a-url")).toBe("url");
  });

  it("should return 'email' for keys ending in _EMAIL (P3) regardless of value", () => {
    expect(inferType("SUPPORT_EMAIL", "plain-text")).toBe("email");
  });

  it("should return 'email' for keys ending in _FROM (P3) regardless of value", () => {
    expect(inferType("SMTP_FROM", "service")).toBe("email");
  });

  it("should return 'boolean' for keys starting with ENABLE_ (P4)", () => {
    expect(inferType("ENABLE_CACHE", "disabled")).toBe("boolean");
  });

  it("should return 'boolean' for keys starting with DISABLE_ (P4)", () => {
    expect(inferType("DISABLE_LOGGING", "0")).toBe("boolean");
  });

  it("should return 'boolean' for keys starting with IS_ (P4)", () => {
    expect(inferType("IS_ENABLED", "nope")).toBe("boolean");
  });

  it("should return 'boolean' for keys starting with DEBUG (P4)", () => {
    expect(inferType("DEBUG_MODE", "3000")).toBe("boolean");
  });

  it("should return 'boolean' for keys starting with FEATURE_ (P4)", () => {
    expect(inferType("FEATURE_X", "https://example.com")).toBe("boolean");
  });

  it("should return 'number' for keys ending in _PORT (P5)", () => {
    expect(inferType("API_PORT", "disabled")).toBe("number");
  });

  it("should return 'number' for key PORT (P5)", () => {
    expect(inferType("PORT", "disabled")).toBe("number");
  });

  it("should return 'boolean' for 'true'", () => {
    expect(inferType("DEBUG_FLAG", "true")).toBe("boolean");
  });

  it("should return 'boolean' for 'false'", () => {
    expect(inferType("DEBUG_FLAG", "false")).toBe("boolean");
  });

  it("should return 'number' for an integer string", () => {
    expect(inferType("CONNECTIONS", "3000")).toBe("number");
  });

  it("should return 'number' for a decimal string", () => {
    expect(inferType("THRESHOLD", "3.14")).toBe("number");
  });

  it("should return 'semver' for a semver string", () => {
    expect(inferType("APP_VERSION", "1.0.0")).toBe("semver");
  });

  it("should return 'url' for an https URL", () => {
    expect(inferType("HOMEPAGE", "https://example.com")).toBe("url");
  });

  it("should return 'email' for a valid email address", () => {
    expect(inferType("ADMIN", "user@example.com")).toBe("email");
  });

  it("should return 'json' for a JSON object string", () => {
    expect(inferType("FLAGS", '{"analytics":true}')).toBe("json");
  });

  it("should return 'json' for a JSON array string", () => {
    expect(inferType("ITEMS", "[1,2,3]")).toBe("json");
  });

  it("should return 'string' for a plain word", () => {
    expect(inferType("NODE_ENV", "development")).toBe("string");
  });

  it("should prioritize key-based rules over value-based rules", () => {
    expect(inferType("ENABLE_FEATURE", "https://example.com")).toBe("boolean");
    expect(inferType("SMTP_FROM", "false")).toBe("email");
    expect(inferType("REDIS_URL", "3000")).toBe("url");
    expect(inferType("API_PORT", "true")).toBe("number");
  });

  it("should apply key-based rules case-insensitively", () => {
    expect(inferType("redis_url", "x")).toBe("url");
    expect(inferType("smtp_from", "x")).toBe("email");
    expect(inferType("is_enabled", "x")).toBe("boolean");
    expect(inferType("port", "x")).toBe("number");
  });
});

describe("parseEnvFileContent — basic parsing", () => {
  const content = [
    "DATABASE_URL=postgresql://localhost:5432/mydb",
    "PORT=3000",
    "DEBUG=false",
    "AUTH_SECRET=",
  ].join("\n");

  it("should parse all key=value lines", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars).toHaveLength(4);
  });

  it("should infer 'url' for DATABASE_URL", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    const variable = result.vars.find((v) => v.key === "DATABASE_URL");
    expect(variable?.inferredType).toBe("url");
  });

  it("should mark DATABASE_URL as required (non-empty value)", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    const variable = result.vars.find((v) => v.key === "DATABASE_URL");
    expect(variable?.isRequired).toBe(true);
    expect(variable?.isOptional).toBe(false);
  });

  it("should infer 'number' for PORT", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars.find((v) => v.key === "PORT")?.inferredType).toBe("number");
  });

  it("should infer 'boolean' for DEBUG", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars.find((v) => v.key === "DEBUG")?.inferredType).toBe("boolean");
  });

  it("should mark empty AUTH_SECRET as optional", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    const variable = result.vars.find((v) => v.key === "AUTH_SECRET");
    expect(variable?.isOptional).toBe(true);
    expect(variable?.isRequired).toBe(false);
    expect(variable?.inferredType).toBe("unknown");
  });

  it("should preserve filePath on the result", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.filePath).toBe("/test.env.example");
  });

  it("should return no groups when no section headers are present", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.groups).toHaveLength(0);
  });
});

describe("parseEnvFileContent — NEXT_PUBLIC_ detection", () => {
  const content = ["SERVER_VAR=secret-value", "NEXT_PUBLIC_APP_URL=https://example.com"].join("\n");

  it("should mark SERVER_VAR as server-side (not client-side)", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars.find((v) => v.key === "SERVER_VAR")?.isClientSide).toBe(false);
  });

  it("should mark NEXT_PUBLIC_APP_URL as client-side", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    const variable = result.vars.find((v) => v.key === "NEXT_PUBLIC_APP_URL");
    expect(variable?.isClientSide).toBe(true);
    expect(variable?.inferredType).toBe("url");
  });
});

describe("parseEnvFileContent — section headers", () => {
  const content = ["# --- Auth ---", "SECRET=abc", "", "# === Config ===", "TIMEOUT=30"].join("\n");

  it("should extract group names in declaration order", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.groups).toEqual(["Auth", "Config"]);
  });

  it("should assign 'Auth' group to SECRET", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars.find((v) => v.key === "SECRET")?.group).toBe("Auth");
  });

  it("should assign 'Config' group to TIMEOUT", () => {
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars.find((v) => v.key === "TIMEOUT")?.group).toBe("Config");
  });
});

describe("parseEnvFileContent — comment association", () => {
  it("should associate a description comment with the following variable", () => {
    const content = [
      "# @description Main database URL",
      "DATABASE_URL=postgresql://localhost/db",
    ].join("\n");
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars.find((v) => v.key === "DATABASE_URL")?.description).toBe(
      "Main database URL",
    );
  });

  it("should reset comment block on blank lines", () => {
    const content = ["# @description Orphan comment", "", "SOME_VAR=value"].join("\n");
    const result = parseEnvFileContent(content, "/test.env.example");
    expect(result.vars.find((v) => v.key === "SOME_VAR")?.description).toBeUndefined();
  });
});

describe("parseEnvFileContent — @required override", () => {
  it("should mark a variable as required when @required annotation is present even with empty value", () => {
    const content = ["# @required", "CRITICAL_KEY="].join("\n");
    const result = parseEnvFileContent(content, "/test.env.example");
    const variable = result.vars.find((v) => v.key === "CRITICAL_KEY");
    expect(variable?.isRequired).toBe(true);
    expect(variable?.isOptional).toBe(false);
  });
});

describe("parseEnvFile — reads fixture files from disk", () => {
  it("should parse the basic fixture and return vars", () => {
    const result = parseEnvFile(BASIC_FIXTURE);
    expect(result.vars.length).toBeGreaterThan(0);
    expect(result.filePath).toBe(BASIC_FIXTURE);
  });

  it("should detect NEXT_PUBLIC_ vars in the nextjs fixture", () => {
    const result = parseEnvFile(NEXTJS_FIXTURE);
    const clientVars = result.vars.filter((v) => v.isClientSide);
    expect(clientVars.length).toBeGreaterThan(0);
  });

  it("should parse the complex fixture and extract all groups", () => {
    const result = parseEnvFile(COMPLEX_FIXTURE);
    expect(result.groups).toContain("Database");
    expect(result.groups).toContain("Auth");
  });

  it("should parse DATABASE_URL in the complex fixture correctly", () => {
    const result = parseEnvFile(COMPLEX_FIXTURE);
    const dbVar = result.vars.find((v) => v.key === "DATABASE_URL");
    expect(dbVar?.group).toBe("Database");
    expect(dbVar?.isRequired).toBe(true);
    expect(dbVar?.inferredType).toBe("url");
  });

  it("should detect NEXT_PUBLIC_FEATURE_FLAGS as json and client-side in complex fixture", () => {
    const result = parseEnvFile(COMPLEX_FIXTURE);
    const flagsVar = result.vars.find((v) => v.key === "NEXT_PUBLIC_FEATURE_FLAGS");
    expect(flagsVar?.inferredType).toBe("json");
    expect(flagsVar?.isClientSide).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BUG-06 — duplicate keys must be deduplicated with last-wins semantics
// ---------------------------------------------------------------------------

describe("BUG-06 — duplicate key deduplication (last-wins)", () => {
  it("should keep only the last occurrence when a key appears twice", () => {
    const content = "PORT=3000\nPORT=4000\n";
    const result = parseEnvFileContent(content, "/test.env");
    expect(result.vars).toHaveLength(1);
    expect(result.vars[0]?.rawValue).toBe("4000");
  });

  it("should preserve the order of first occurrence when deduplicating", () => {
    // HOST comes first, PORT is duplicated (last value wins), DEBUG comes last.
    const content = "HOST=localhost\nPORT=3000\nPORT=4000\nDEBUG=false\n";
    const result = parseEnvFileContent(content, "/test.env");
    const keys = result.vars.map((v) => v.key);
    expect(keys).toEqual(["HOST", "PORT", "DEBUG"]);
    expect(result.vars.find((v) => v.key === "PORT")?.rawValue).toBe("4000");
  });

  it("should not modify the result when all keys are unique (non-regression)", () => {
    const content = "A=1\nB=2\nC=3\n";
    const result = parseEnvFileContent(content, "/test.env");
    expect(result.vars).toHaveLength(3);
    expect(result.vars.map((v) => v.key)).toEqual(["A", "B", "C"]);
  });

  it("should handle a key that is repeated three or more times", () => {
    const content = "KEY=first\nKEY=second\nKEY=third\n";
    const result = parseEnvFileContent(content, "/test.env");
    expect(result.vars).toHaveLength(1);
    expect(result.vars[0]?.rawValue).toBe("third");
  });
});

// ---------------------------------------------------------------------------
// F4 — ENV_DUPLICATE_KEY warnings
// ---------------------------------------------------------------------------

describe("parseEnvFileContent — ENV_DUPLICATE_KEY warnings", () => {
  it("should emit a warning for each duplicated key", () => {
    const result = parseEnvFileContent(
      "PORT=3000\nDATABASE_URL=postgres://\nPORT=4000\n",
      "test.env",
    );
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings?.[0]?.code).toBe("ENV_DUPLICATE_KEY");
    expect(result.warnings?.[0]?.key).toBe("PORT");
  });

  it("should include the earlier (discarded) line number in the warning", () => {
    // PORT appears at line 1 (discarded) and line 3 (kept).
    const result = parseEnvFileContent("PORT=3000\nFOO=bar\nPORT=4000\n", "test.env");
    expect(result.warnings?.[0]?.line).toBe(1);
  });

  it("should emit one warning per extra occurrence (key appears three times → two warnings)", () => {
    const result = parseEnvFileContent("K=1\nK=2\nK=3\n", "test.env");
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings?.every((w) => w.code === "ENV_DUPLICATE_KEY")).toBe(true);
    expect(result.warnings?.every((w) => w.key === "K")).toBe(true);
  });

  it("should keep the last occurrence (last-wins) when a warning is emitted", () => {
    const result = parseEnvFileContent("PORT=3000\nPORT=4000\n", "test.env");
    const portVar = result.vars.find((v) => v.key === "PORT");
    expect(portVar?.rawValue).toBe("4000");
  });

  it("should return no warnings when all keys are unique", () => {
    const result = parseEnvFileContent("PORT=3000\nDATABASE_URL=postgres://\n", "test.env");
    expect(result.warnings).toBeUndefined();
  });

  it("should include a descriptive message mentioning the key name in the warning", () => {
    const result = parseEnvFileContent("MY_KEY=a\nMY_KEY=b\n", "test.env");
    expect(result.warnings?.[0]?.message).toContain("MY_KEY");
  });
});
