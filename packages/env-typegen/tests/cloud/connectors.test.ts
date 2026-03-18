import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadCloudSource } from "../../src/cloud/connectors.js";

async function makeJsonFixture(fileName: string, content: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "env-typegen-cloud-test-"));
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, content, "utf8");
  return filePath;
}

describe("cloud connectors", () => {
  it("should parse Vercel snapshot payload", async () => {
    const filePath = await makeJsonFixture(
      "vercel.json",
      JSON.stringify([{ key: "DATABASE_URL", value: "postgres://db" }]),
    );

    const values = await loadCloudSource({ provider: "vercel", filePath });
    expect(values.DATABASE_URL).toBe("postgres://db");
  });

  it("should skip malformed Vercel entries and fall back to content values", async () => {
    const filePath = await makeJsonFixture(
      "vercel-mixed.json",
      JSON.stringify({
        envs: [null, { value: "missing-key" }, { name: "TOKEN", content: "abc123" }],
      }),
    );

    const values = await loadCloudSource({ provider: "vercel", filePath });
    expect(values).toEqual({ TOKEN: "abc123" });
  });

  it("should parse Cloudflare snapshot payload", async () => {
    const filePath = await makeJsonFixture(
      "cloudflare.json",
      JSON.stringify([{ name: "API_URL", text: "https://api.example.com" }]),
    );

    const values = await loadCloudSource({ provider: "cloudflare", filePath });
    expect(values.API_URL).toBe("https://api.example.com");
  });

  it("should skip malformed Cloudflare entries and support secret fallback values", async () => {
    const filePath = await makeJsonFixture(
      "cloudflare-mixed.json",
      JSON.stringify({
        result: [true, { value: "missing-name" }, { key: "CF_SECRET", secret: "redacted" }],
      }),
    );

    const values = await loadCloudSource({ provider: "cloudflare", filePath });
    expect(values).toEqual({ CF_SECRET: "redacted" });
  });

  it("should parse alternate key/value shapes across providers", async () => {
    const vercelPath = await makeJsonFixture(
      "vercel-alt.json",
      JSON.stringify({ envs: [{ name: "PORT", targetValue: "3000" }] }),
    );
    const cloudflarePath = await makeJsonFixture(
      "cloudflare-alt.json",
      JSON.stringify({ result: [{ key: "FEATURE_FLAG", value: "true" }] }),
    );

    const vercelValues = await loadCloudSource({ provider: "vercel", filePath: vercelPath });
    const cloudflareValues = await loadCloudSource({
      provider: "cloudflare",
      filePath: cloudflarePath,
    });

    expect(vercelValues.PORT).toBe("3000");
    expect(cloudflareValues.FEATURE_FLAG).toBe("true");
  });

  it("should parse AWS snapshot payload", async () => {
    const filePath = await makeJsonFixture(
      "aws.json",
      JSON.stringify({
        Parameters: [{ Name: "/prod/REDIS_URL", Value: "redis://cache" }],
      }),
    );

    const values = await loadCloudSource({ provider: "aws", filePath });
    expect(values.REDIS_URL).toBe("redis://cache");
  });

  it("should skip malformed AWS entries and preserve raw slash-only names", async () => {
    const filePath = await makeJsonFixture(
      "aws-mixed.json",
      JSON.stringify({
        Parameters: [
          "not-an-object",
          { Name: "///", Value: "slash-key" },
          { Name: "/prod/API_TOKEN", Value: "token-value" },
          { name: "RAW_NAME", value: "raw-value" },
        ],
      }),
    );

    const values = await loadCloudSource({ provider: "aws", filePath });
    expect(values["///"]).toBe("slash-key");
    expect(values.API_TOKEN).toBe("token-value");
    expect(values.RAW_NAME).toBe("raw-value");
  });

  it("should normalize aws names and default missing values to empty strings", async () => {
    const filePath = await makeJsonFixture(
      "aws-empty-value.json",
      JSON.stringify({
        Parameters: [{ name: "RAW_KEY" }],
      }),
    );

    const values = await loadCloudSource({ provider: "aws", filePath });
    expect(values.RAW_KEY).toBe("");
  });

  it("should throw a user-friendly 'File not found' error when the cloud file does not exist", async () => {
    // D3: raw ENOENT must be wrapped with a user-friendly message that shows
    // the user-supplied path, not an internal node_modules path.
    await expect(
      loadCloudSource({ provider: "vercel", filePath: "nonexistent-cloud.json" }),
    ).rejects.toThrow("File not found:");
  });

  it("should include absolute path directly in not-found errors", async () => {
    const missingAbsolutePath = path.resolve(
      tmpdir(),
      "env-typegen-cloud-test-absolute",
      "missing.json",
    );

    await expect(
      loadCloudSource({ provider: "aws", filePath: missingAbsolutePath }),
    ).rejects.toThrow(`File not found: ${missingAbsolutePath}`);
  });

  it("should rethrow non-ENOENT file read errors", async () => {
    const directoryPath = await mkdtemp(path.join(tmpdir(), "env-typegen-cloud-dir-"));

    await expect(loadCloudSource({ provider: "vercel", filePath: directoryPath })).rejects.toThrow(
      /EISDIR|directory/u,
    );
  });

  it("should surface JSON parsing failures", async () => {
    const filePath = await makeJsonFixture("invalid-json.json", "{ invalid json ");

    await expect(loadCloudSource({ provider: "cloudflare", filePath })).rejects.toThrow(
      /Unexpected token|JSON/u,
    );
  });
});
