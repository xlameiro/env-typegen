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

  it("should list filenames in TypeScript-first search order", () => {
    expect(CONTRACT_FILE_NAMES[0]).toBe("env.contract.ts");
    expect(CONTRACT_FILE_NAMES[1]).toBe("env.contract.mjs");
    expect(CONTRACT_FILE_NAMES[2]).toBe("env.contract.js");
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
