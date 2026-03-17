import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadValidationContract } from "../src/contract.js";

async function createTempDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

describe("loadValidationContract", () => {
  it("should load an explicit V1 contract file", async () => {
    const dir = await createTempDir("env-typegen-contract-");
    const contractPath = path.join(dir, "contracts", "env-contract.js");
    await mkdir(path.dirname(contractPath), { recursive: true });
    await writeFile(
      contractPath,
      [
        "export default {",
        "  schemaVersion: 1,",
        "  variables: {",
        '    PORT: { expected: { type: "number" }, required: true, clientSide: false },',
        "  },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const contract = await loadValidationContract({
      cwd: dir,
      contractPath: "./contracts/env-contract.js",
      fallbackExamplePath: ".env.example",
    });

    expect(contract.schemaVersion).toBe(1);
    expect(contract.variables.PORT).toMatchObject({
      expected: { type: "number" },
      required: true,
      clientSide: false,
    });
  });

  it("should discover env.contract.mjs automatically when contract path is omitted", async () => {
    const dir = await createTempDir("env-typegen-contract-");
    await writeFile(
      path.join(dir, "env.contract.mjs"),
      [
        "export const contract = {",
        "  schemaVersion: 1,",
        "  variables: {",
        '    NEXT_PUBLIC_BASE_URL: { expected: { type: "url" }, required: true, clientSide: true },',
        "  },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const contract = await loadValidationContract({
      cwd: dir,
      fallbackExamplePath: ".env.example",
    });

    expect(contract.variables.NEXT_PUBLIC_BASE_URL).toMatchObject({
      expected: { type: "url" },
      required: true,
      clientSide: true,
    });
  });

  it("should convert legacy contracts to the V1 validation contract shape", async () => {
    const dir = await createTempDir("env-typegen-contract-");
    await writeFile(
      path.join(dir, "env.contract.js"),
      [
        "export default {",
        "  vars: [",
        '    { name: "PORT", expectedType: "number", required: true, constraints: { min: 3000, max: 9000 } },',
        '    { name: "RUNTIME_MODE", expectedType: "string", required: true, enumValues: ["node", "edge"] },',
        '    { name: "API_SECRET", expectedType: "string", required: false },',
        "  ],",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const contract = await loadValidationContract({
      cwd: dir,
      fallbackExamplePath: ".env.example",
    });

    expect(contract.schemaVersion).toBe(1);
    expect(contract.variables.PORT?.expected).toEqual({
      type: "number",
      min: 3000,
      max: 9000,
    });
    expect(contract.variables.RUNTIME_MODE?.expected).toEqual({
      type: "enum",
      values: ["node", "edge"],
    });
    expect(contract.variables.API_SECRET?.secret).toBe(true);
  });

  it("should bootstrap from .env.example when no contract file exists", async () => {
    const dir = await createTempDir("env-typegen-contract-");
    await writeFile(
      path.join(dir, ".env.example"),
      [
        "NEXT_PUBLIC_BASE_URL=https://example.com",
        "APP_VERSION=1.2.3",
        "SECRET_TOKEN=placeholder",
        "OPTIONAL_FLAG=",
        "",
      ].join("\n"),
      "utf8",
    );

    const contract = await loadValidationContract({
      cwd: dir,
      fallbackExamplePath: ".env.example",
    });

    expect(contract.variables.NEXT_PUBLIC_BASE_URL).toMatchObject({
      expected: { type: "url" },
      required: true,
      clientSide: true,
    });
    expect(contract.variables.APP_VERSION?.expected.type).toBe("semver");
    expect(contract.variables.SECRET_TOKEN?.secret).toBe(true);
    expect(contract.variables.OPTIONAL_FLAG?.required).toBe(false);
  });

  it("should fail when the discovered contract does not match either supported schema", async () => {
    const dir = await createTempDir("env-typegen-contract-");
    await writeFile(
      path.join(dir, "env.contract.js"),
      "export default { invalid: true };\n",
      "utf8",
    );

    await expect(
      loadValidationContract({
        cwd: dir,
        fallbackExamplePath: ".env.example",
      }),
    ).rejects.toThrow("Invalid contract");
  });
});
