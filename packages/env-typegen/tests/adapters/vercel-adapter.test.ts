import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { evaluateAdapterContract } from "../../src/adapters/testkit.js";
import vercelAdapter from "../../src/adapters/vercel-adapter.js";

const currentFilePath = fileURLToPath(import.meta.url);
const fixturesDirectory = path.resolve(path.dirname(currentFilePath), "../fixtures/vercel");

async function readJsonFixture(fileName: string): Promise<unknown> {
  const filePath = path.join(fixturesDirectory, fileName);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as unknown;
}

function createSuccessfulResponse(payload: unknown): Response {
  return {
    ok: true,
    json: async () => payload,
  } as Response;
}

describe("vercel adapter", () => {
  it("should pull paginated variables with mixed payload shapes for the requested environment", async () => {
    const pageOne = await readJsonFixture("env-page-1.json");
    const pageTwo = await readJsonFixture("env-page-2.json");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createSuccessfulResponse(pageOne))
      .mockResolvedValueOnce(createSuccessfulResponse(pageTwo));

    vi.stubGlobal("fetch", fetchMock);

    const result = await vercelAdapter.pull({
      environment: "development",
      projectId: "project_123",
      token: "token_123",
    });

    expect(result.values).toMatchObject({
      DATABASE_URL: "postgres://dev",
      COMMON: "shared",
      QUEUE_URL: "https://sqs.local",
      FEATURE_FLAG: "enabled",
    });
    expect(result.values.API_URL).toBeUndefined();
    expect(result.values.MISSING_VALUE).toBeUndefined();
    expect(result.metadata?.pages).toBe(2);
    expect(result.warnings?.some((warning) => warning.includes("MISSING_VALUE"))).toBe(true);
  });

  it("should throw when required project context is missing", async () => {
    await expect(
      vercelAdapter.pull({
        environment: "production",
        token: "token_123",
      }),
    ).rejects.toThrow("projectId");
  });

  it("should compare local and remote values", async () => {
    const compare = vercelAdapter.compare;
    if (compare === undefined) {
      throw new Error("compare should be defined for vercel adapter");
    }

    const result = await compare(
      { environment: "preview" },
      { A: "1", B: "2" },
      { B: "9", C: "3" },
    );

    expect(result.missingInRemote).toEqual(["A"]);
    expect(result.extraInRemote).toEqual(["C"]);
    expect(result.mismatches).toEqual([{ key: "B", reason: "mismatch" }]);
  });

  it("should satisfy the adapter contract", async () => {
    const pageOne = await readJsonFixture("env-page-1.json");
    const pageTwo = await readJsonFixture("env-page-2.json");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createSuccessfulResponse(pageOne))
      .mockResolvedValueOnce(createSuccessfulResponse(pageTwo))
      .mockResolvedValueOnce(createSuccessfulResponse(pageOne))
      .mockResolvedValueOnce(createSuccessfulResponse(pageTwo));

    vi.stubGlobal("fetch", fetchMock);

    const contract = await evaluateAdapterContract(vercelAdapter, {
      context: {
        environment: "development",
        projectId: "project_123",
        token: "token_123",
      },
      localValues: {
        DATABASE_URL: "postgres://dev",
      },
    });

    expect(contract.errors).toEqual([]);
    expect(contract.hasPull).toBe(true);
    expect(contract.hasCompare).toBe(true);
    expect(contract.pullValuesAreObject).toBe(true);
    expect(contract.compareShapeIsValid).toBe(true);
  });

  it("should retry transient responses and eventually succeed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ envs: [{ key: "API_URL", value: "https://example.com" }] }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await vercelAdapter.pull({
      environment: "development",
      projectId: "project_123",
      token: "token_123",
    });

    expect(result.values.API_URL).toBe("https://example.com");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should fail after exhausting retries for transient responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      vercelAdapter.pull({
        environment: "production",
        projectId: "project_123",
        token: "token_123",
      }),
    ).rejects.toThrow("Vercel API request failed (503)");

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
