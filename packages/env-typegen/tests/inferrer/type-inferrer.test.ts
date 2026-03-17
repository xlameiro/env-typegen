import { describe, expect, it } from "vitest";

import { inferType } from "../../src/inferrer/type-inferrer.js";

describe("inferType (key-based)", () => {
  it("should infer url for keys ending in _URL", () => {
    expect(inferType("DATABASE_URL", "value")).toBe("url");
  });

  it("should infer email for keys ending in _EMAIL", () => {
    expect(inferType("SUPPORT_EMAIL", "value")).toBe("email");
  });

  it("should infer email for keys ending in _FROM", () => {
    expect(inferType("SMTP_FROM", "value")).toBe("email");
  });

  it("should infer boolean for keys starting with ENABLE_", () => {
    expect(inferType("ENABLE_FEATURE_X", "value")).toBe("boolean");
  });

  it("should infer boolean for keys starting with DISABLE_", () => {
    expect(inferType("DISABLE_FEATURE_X", "value")).toBe("boolean");
  });

  it("should infer boolean for keys starting with IS_", () => {
    expect(inferType("IS_ENABLED", "value")).toBe("boolean");
  });

  it("should infer boolean for keys starting with DEBUG", () => {
    expect(inferType("DEBUG_MODE", "value")).toBe("boolean");
  });

  it("should infer boolean for keys starting with FEATURE_", () => {
    expect(inferType("FEATURE_BETA", "value")).toBe("boolean");
  });

  it("should infer number for key PORT", () => {
    expect(inferType("PORT", "value")).toBe("number");
  });

  it("should infer number for keys ending in _PORT", () => {
    expect(inferType("HTTP_PORT", "value")).toBe("number");
  });

  it("should prioritize key-based rules over value-based rules", () => {
    expect(inferType("ENABLE_FLAG", "https://example.com")).toBe("boolean");
    expect(inferType("REDIS_URL", "3000")).toBe("url");
    expect(inferType("SMTP_FROM", "false")).toBe("email");
    expect(inferType("API_PORT", "true")).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// BUG-02 — comma-separated URL values must not be inferred as url
// ---------------------------------------------------------------------------

describe("BUG-02 — comma-separated URLs must not be inferred as url type", () => {
  it("should infer string for a comma-separated list of URLs", () => {
    // Pre-fix: the URL regex matched the leading scheme fragment and returned "url".
    // Values like ALLOWED_ORIGINS=https://a.com,https://b.com are CORS allowlists
    // that should be treated as plain strings, not URL types.
    expect(inferType("ALLOWED_ORIGINS", "https://example.com,https://www.example.com")).toBe(
      "string",
    );
  });

  it("should still infer url for a single valid URL value (non-regression)", () => {
    expect(inferType("HOMEPAGE_URL_VALUE", "https://example.com")).toBe("url");
  });

  it("should infer string for comma-separated values with mixed schemes", () => {
    expect(inferType("CORS_ORIGINS", "http://localhost:3000,https://app.example.com")).toBe(
      "string",
    );
  });
});
