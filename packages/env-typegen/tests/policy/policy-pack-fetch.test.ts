import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPolicyPackContent } from "../../src/policy/policy-pack-fetch.js";

const fixtureDirectory = path.resolve("tests/fixtures/policy/packs");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("policy pack fetch", () => {
  it("should read local policy pack content", async () => {
    const source = path.join(fixtureDirectory, "base-governance.policy.json");

    const content = await fetchPolicyPackContent({
      source,
      cwd: process.cwd(),
    });

    expect(content).toContain("base-governance");
  });

  it("should fetch remote content and cache it", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-pack-cache-"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response('{"id":"remote"}', { status: 200 });
      }),
    );

    const content = await fetchPolicyPackContent({
      source: "https://example.com/packs/remote.policy.json",
      cwd: process.cwd(),
      options: {
        cacheDir: temporaryDirectory,
        cacheTtlMs: 60_000,
      },
    });

    expect(content).toBe('{"id":"remote"}');

    const offlineContent = await fetchPolicyPackContent({
      source: "https://example.com/packs/remote.policy.json",
      cwd: process.cwd(),
      options: {
        cacheDir: temporaryDirectory,
        offline: true,
      },
    });

    expect(offlineContent).toBe('{"id":"remote"}');
  });

  it("should retry and use cached content when network remains unavailable", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-pack-fallback-"));
    const source = "https://example.com/packs/fallback.policy.json";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response('{"id":"seed"}', { status: 200 });
      }),
    );

    await fetchPolicyPackContent({
      source,
      cwd: process.cwd(),
      options: {
        cacheDir: temporaryDirectory,
        cacheTtlMs: 60_000,
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network-down");
      }),
    );

    const cachedContent = await fetchPolicyPackContent({
      source,
      cwd: process.cwd(),
      options: {
        cacheDir: temporaryDirectory,
        cacheTtlMs: 60_000,
        maxRetries: 1,
        retryDelayMs: 1,
      },
    });

    expect(cachedContent).toBe('{"id":"seed"}');
  });

  it("should fail in offline mode when cache is missing", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-pack-offline-"));

    await expect(
      fetchPolicyPackContent({
        source: "https://example.com/packs/missing.policy.json",
        cwd: process.cwd(),
        options: {
          cacheDir: temporaryDirectory,
          offline: true,
        },
      }),
    ).rejects.toThrowError(/offline/u);
  });

  it("should retry once on retryable HTTP status and then succeed", async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response("retry", { status: 503 }))
      .mockResolvedValueOnce(new Response('{"id":"recovered"}', { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-pack-retry-"));
    const content = await fetchPolicyPackContent({
      source: "https://example.com/packs/retry.policy.json",
      cwd: process.cwd(),
      options: {
        cacheDir: temporaryDirectory,
        maxRetries: 1,
        retryDelayMs: 1,
      },
    });

    expect(content).toBe('{"id":"recovered"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should use fallback cache when retry limit is exhausted", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "env-typegen-pack-cache-file-"),
    );
    const source = "https://example.com/packs/cache.policy.json";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response('{"id":"seed-cache"}', { status: 200 });
      }),
    );

    await fetchPolicyPackContent({
      source,
      cwd: process.cwd(),
      options: {
        cacheDir: temporaryDirectory,
        cacheTtlMs: 60_000,
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("unavailable", { status: 503 });
      }),
    );

    const content = await fetchPolicyPackContent({
      source,
      cwd: process.cwd(),
      options: {
        cacheDir: temporaryDirectory,
        cacheTtlMs: 60_000,
        maxRetries: 1,
        retryDelayMs: 1,
      },
    });

    expect(content).toBe('{"id":"seed-cache"}');
  });

  it("should support relative local file resolution from cwd", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-pack-local-"));
    const relativeSource = "packs/local.policy.json";
    const filePath = path.join(temporaryDirectory, relativeSource);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, '{"id":"relative"}', "utf8");

    const content = await fetchPolicyPackContent({
      source: relativeSource,
      cwd: temporaryDirectory,
    });

    expect(content).toBe('{"id":"relative"}');
  });
});
