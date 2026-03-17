import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

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

// ---------------------------------------------------------------------------
// UX-02 — missing target file must emit a warning when allowMissing=true
// ---------------------------------------------------------------------------

describe("UX-02 — missing target file emits a warning", () => {
  it("should call console.warn with the missing file path when allowMissing is true", async () => {
    const dir = await createTempDir("env-typegen-env-source-ux02-");
    const filePath = path.join(dir, ".env.missing");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await loadEnvSource({ filePath, allowMissing: true });
      // The warn() helper in logger.ts ultimately calls console.warn with a yellow-
      // formatted string. We check that the original message fragment is present.
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const callArg: string = warnSpy.mock.calls[0]?.[0] ?? "";
      expect(callArg).toContain("not found");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("should still return an empty object when file is missing and allowMissing is true (non-regression)", async () => {
    const dir = await createTempDir("env-typegen-env-source-ux02-");
    const filePath = path.join(dir, ".env.missing");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const values = await loadEnvSource({ filePath, allowMissing: true });
      expect(values).toEqual({});
    } finally {
      warnSpy.mockRestore();
    }
  });
});
