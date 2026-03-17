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
});
