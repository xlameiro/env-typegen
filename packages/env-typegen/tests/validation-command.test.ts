import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runValidationCommand } from "../src/validation-command.js";

async function createTempDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

async function createContractFile(dir: string): Promise<string> {
  const filePath = path.join(dir, "env.contract.ts");
  await writeFile(
    filePath,
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
  return filePath;
}

describe("validation command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should treat extras as errors by default in check command", async () => {
    const dir = await createTempDir("env-typegen-validation-cmd-");
    const contractPath = await createContractFile(dir);
    const envPath = path.join(dir, ".env");
    await writeFile(envPath, "PORT=3000\nEXTRA=true\n", "utf8");

    vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const strictExit = await runValidationCommand({
      command: "check",
      argv: ["--env", envPath, "--contract", contractPath, "--json"],
    });
    const relaxedExit = await runValidationCommand({
      command: "check",
      argv: ["--env", envPath, "--contract", contractPath, "--json", "--no-strict"],
    });

    expect(strictExit).toBe(1);
    expect(relaxedExit).toBe(0);
  });

  it("should run diff and doctor commands with JSON output", async () => {
    const dir = await createTempDir("env-typegen-validation-cmd-");
    const contractPath = await createContractFile(dir);
    const envLocal = path.join(dir, ".env");
    const envProd = path.join(dir, ".env.production");
    await writeFile(envLocal, "PORT=3000\n", "utf8");
    await writeFile(envProd, "PORT=not-a-number\n", "utf8");

    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    });

    const diffExit = await runValidationCommand({
      command: "diff",
      argv: ["--contract", contractPath, "--targets", `${envLocal},${envProd}`, "--json"],
    });

    const doctorExit = await runValidationCommand({
      command: "doctor",
      argv: [
        "--env",
        envLocal,
        "--contract",
        contractPath,
        "--targets",
        `${envLocal},${envProd}`,
        "--json=pretty",
      ],
    });

    const lastJson = writes[writes.length - 1] ?? "{}";
    const parsed = JSON.parse(lastJson) as { recommendations?: string[] };

    expect(diffExit).toBe(1);
    expect(doctorExit).toBe(1);
    expect((parsed.recommendations ?? []).length).toBeGreaterThan(0);
  });
});
