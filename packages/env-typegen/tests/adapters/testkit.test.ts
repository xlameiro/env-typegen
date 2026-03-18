import { describe, expect, it } from "vitest";

import { evaluateAdapterContract } from "../../src/adapters/testkit.js";
import type { EnvAdapter } from "../../src/adapters/types.js";

describe("adapter testkit", () => {
  it("should validate a compliant adapter", async () => {
    const adapter: EnvAdapter = {
      name: "compliant",
      pull: async () => ({ values: { API_URL: "https://example.com" } }),
      compare: async (_context, localValues, remoteValues) => ({
        missingInRemote: Object.keys(localValues).filter((key) => !(key in remoteValues)),
        extraInRemote: Object.keys(remoteValues).filter((key) => !(key in localValues)),
        mismatches: [],
      }),
    };

    const result = await evaluateAdapterContract(adapter, {
      context: { environment: "development" },
      localValues: { API_URL: "https://example.com" },
    });

    expect(result.errors).toEqual([]);
    expect(result.hasPush).toBe(false);
    expect(result.pullValuesAreObject).toBe(true);
    expect(result.compareShapeIsValid).toBe(true);
    expect(result.metaCapabilitiesAreValid).toBe(false);
    expect(result.conformanceV3MetaIsValid).toBe(false);
    expect(result.conformanceV4MetaIsValid).toBe(false);
    expect(result.migrationToV4IsValid).toBe(false);
  });

  it("should surface compare shape violations", async () => {
    const adapter: EnvAdapter = {
      name: "bad-compare",
      pull: async () => ({ values: { API_URL: "https://example.com" } }),
      compare: async () => ({ missingInRemote: [], extraInRemote: [] }) as never,
    };

    const result = await evaluateAdapterContract(adapter, {
      context: { environment: "development" },
      localValues: { API_URL: "https://example.com" },
    });

    expect(result.errors.some((item) => item.includes("compare() must return"))).toBe(true);
    expect(result.compareShapeIsValid).toBe(false);
  });

  it("should validate push and write semantics when adapter is write-enabled", async () => {
    const adapter: EnvAdapter = {
      name: "write-enabled",
      pull: async () => ({ values: { API_KEY: "old" } }),
      push: async () => ({
        outcome: "applied",
        operations: [
          {
            key: "API_KEY",
            status: "applied",
            message: "written",
            failureKind: "none",
          },
        ],
        summary: {
          applied: 1,
          failed: 0,
          skipped: 0,
          total: 1,
        },
      }),
      meta: () => ({
        name: "write-enabled",
        capabilities: {
          pull: true,
          push: true,
          compare: false,
          redactValuesByDefault: true,
          writeSemantics: "idempotent",
          conformanceVersion: 3,
          reconciliationMode: "deterministic",
          idempotency: "idempotent",
        },
      }),
    };

    const result = await evaluateAdapterContract(adapter, {
      context: { environment: "production" },
      localValues: { API_KEY: "new" },
    });

    expect(result.errors).toEqual([]);
    expect(result.hasPush).toBe(true);
    expect(result.pushResultIsValid).toBe(true);
    expect(result.metaCapabilitiesAreValid).toBe(true);
    expect(result.conformanceV3MetaIsValid).toBe(true);
    expect(result.conformanceV4MetaIsValid).toBe(false);
    expect(result.migrationToV4IsValid).toBe(true);
  });

  it("should flag invalid partial-failure push results", async () => {
    const adapter: EnvAdapter = {
      name: "invalid-partial",
      pull: async () => ({ values: { API_KEY: "old" } }),
      push: async () => ({
        outcome: "partial-failure",
        operations: [
          {
            key: "API_KEY",
            status: "applied",
            message: "written",
            failureKind: "none",
          },
        ],
        summary: {
          applied: 1,
          failed: 0,
          skipped: 0,
          total: 1,
        },
      }),
    };

    const result = await evaluateAdapterContract(adapter, {
      context: { environment: "production" },
      localValues: { API_KEY: "new" },
    });

    expect(result.pushResultIsValid).toBe(false);
    expect(
      result.errors.some((item) =>
        item.includes(
          "push() must return operation-level result with outcome, operations, and summary",
        ),
      ),
    ).toBe(true);
    expect(result.migrationToV4IsValid).toBe(true);
  });

  it("should require v3 conformance metadata for write-enabled adapters", async () => {
    const adapter: EnvAdapter = {
      name: "missing-conformance",
      pull: async () => ({ values: { API_KEY: "old" } }),
      push: async () => ({
        outcome: "applied",
        operations: [
          {
            key: "API_KEY",
            status: "applied",
            message: "written",
            failureKind: "none",
          },
        ],
        summary: {
          applied: 1,
          failed: 0,
          skipped: 0,
          total: 1,
        },
      }),
      meta: () => ({
        name: "missing-conformance",
        capabilities: {
          pull: true,
          push: true,
          compare: false,
          redactValuesByDefault: true,
          writeSemantics: "best-effort",
        },
      }),
    };

    const result = await evaluateAdapterContract(adapter, {
      context: { environment: "production" },
      localValues: { API_KEY: "new" },
    });

    expect(result.conformanceV3MetaIsValid).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it("should validate adapters that expose v4 push contract", async () => {
    const adapter: EnvAdapter = {
      name: "v4-write-enabled",
      pull: async () => ({ values: { API_KEY: "old" } }),
      push: async () => ({
        contractVersion: 4,
        outcome: "applied",
        operations: [
          {
            key: "API_KEY",
            action: "upsert",
            status: "applied",
            message: "written",
            failureKind: "none",
            attempts: 1,
          },
        ],
        summary: {
          applied: 1,
          failed: 0,
          skipped: 0,
          total: 1,
        },
      }),
      meta: () => ({
        name: "v4-write-enabled",
        capabilities: {
          pull: true,
          push: true,
          compare: false,
          redactValuesByDefault: true,
          writeSemantics: "idempotent",
          conformanceVersion: 4,
          reconciliationMode: "deterministic",
          idempotency: "idempotent",
        },
      }),
    };

    const result = await evaluateAdapterContract(adapter, {
      context: { environment: "production" },
      localValues: { API_KEY: "new" },
    });

    expect(result.pushResultIsValid).toBe(true);
    expect(result.metaCapabilitiesAreValid).toBe(true);
    expect(result.conformanceV4MetaIsValid).toBe(true);
    expect(result.migrationToV4IsValid).toBe(true);
  });
});
