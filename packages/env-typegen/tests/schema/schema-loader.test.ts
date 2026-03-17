import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONTRACT_FILE_NAMES,
  defineContract,
  loadContract,
} from "../../src/schema/schema-loader.js";
import type { EnvContract } from "../../src/schema/schema-model.js";

describe("CONTRACT_FILE_NAMES", () => {
  it("should contain exactly three filenames", () => {
    expect(CONTRACT_FILE_NAMES).toHaveLength(3);
  });

  it("should list filenames in ESM-first search order (BUG-01: .mjs/.js before .ts)", () => {
    // .ts files cannot be dynamically imported by Node.js at runtime without a loader.
    // Searching .mjs first avoids a confusing ERR_UNKNOWN_FILE_EXTENSION failure
    // when both .ts and .mjs files coexist in the same directory.
    expect(CONTRACT_FILE_NAMES[0]).toBe("env.contract.mjs");
    expect(CONTRACT_FILE_NAMES[1]).toBe("env.contract.js");
    expect(CONTRACT_FILE_NAMES[2]).toBe("env.contract.ts");
  });
});

describe("defineContract", () => {
  it("should return the contract object unchanged (identity function)", () => {
    const contract: EnvContract = {
      vars: [
        { name: "DATABASE_URL", expectedType: "url", required: true },
        { name: "PORT", expectedType: "number", required: false },
      ],
    };
    const result = defineContract(contract);
    expect(result).toBe(contract);
  });

  it("should accept an empty vars array", () => {
    const contract: EnvContract = { vars: [] };
    const result = defineContract(contract);
    expect(result).toBe(contract);
  });
});

describe("loadContract", () => {
  it("should return undefined when no contract file exists in the directory", async () => {
    // Use the OS temp directory — it will never have an env.contract.* file
    const result = await loadContract(tmpdir());
    expect(result).toBeUndefined();
  });

  it("should return undefined for a non-existent directory", async () => {
    const result = await loadContract(path.join(tmpdir(), "__env_typegen_nonexistent__"));
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BUG-01 — .ts contract files must throw an actionable error
// ---------------------------------------------------------------------------

describe("BUG-01 — .ts contract file produces an actionable error", () => {
  it("should throw an error with a .mjs migration suggestion when only env.contract.ts exists", async () => {
    // Pre-fix: Node.js threw ERR_UNKNOWN_FILE_EXTENSION with no guidance.
    // Post-fix: env-typegen throws a human-readable error before calling import().
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const dir = await mkdtemp(path.join(tmpdir(), "env-typegen-bug01-"));
    // Write a minimal .ts contract so existsSync() returns true for it.
    await writeFile(path.join(dir, "env.contract.ts"), "export default { vars: [] };\n", "utf8");

    await expect(loadContract(dir)).rejects.toThrow(/Rename it to.*\.mjs/);
  });

  it("should include the original .ts file path in the error message", async () => {
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const dir = await mkdtemp(path.join(tmpdir(), "env-typegen-bug01-path-"));
    await writeFile(path.join(dir, "env.contract.ts"), "export default { vars: [] };\n", "utf8");

    await expect(loadContract(dir)).rejects.toThrow(/env\.contract\.ts/);
  });
});
