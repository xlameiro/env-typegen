import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadEnvSource } from "../../src/validation/env-source.js";

async function createTempDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

describe("loadEnvSource", () => {
  it("should parse env files including export syntax and wrapped quotes", async () => {
    const dir = await createTempDir("env-typegen-env-source-");
    const filePath = path.join(dir, ".env");
    await writeFile(
      filePath,
      [
        "# comment",
        'export API_URL="https://example.com"',
        "FEATURE_FLAG='true'",
        "PORT=3000",
        "INVALID LINE",
        "",
      ].join("\n"),
      "utf8",
    );

    const values = await loadEnvSource({ filePath });
    expect(values).toEqual({
      API_URL: "https://example.com",
      FEATURE_FLAG: "true",
      PORT: "3000",
    });
  });

  it("should return an empty source when file is missing and allowMissing is true", async () => {
    const dir = await createTempDir("env-typegen-env-source-");
    const filePath = path.join(dir, ".env.missing");

    const values = await loadEnvSource({ filePath, allowMissing: true });
    expect(values).toEqual({});
  });

  it("should throw when file is missing and allowMissing is false", async () => {
    const dir = await createTempDir("env-typegen-env-source-");
    const filePath = path.join(dir, ".env.missing");

    await expect(loadEnvSource({ filePath, allowMissing: false })).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
