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

  it("should parse Cloudflare snapshot payload", async () => {
    const filePath = await makeJsonFixture(
      "cloudflare.json",
      JSON.stringify([{ name: "API_URL", text: "https://api.example.com" }]),
    );

    const values = await loadCloudSource({ provider: "cloudflare", filePath });
    expect(values.API_URL).toBe("https://api.example.com");
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
});
