import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runPlanCommand } from "../../src/commands/plan-command.js";

describe("runPlanCommand", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-plan-cmd-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function writeContract(): Promise<string> {
    const contractPath = path.join(dir, "env.contract.mjs");
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
    return contractPath;
  }

  async function writeConfig(content: string): Promise<string> {
    const configPath = path.join(dir, "env-typegen.config.mjs");
    await writeFile(configPath, content, "utf8");
    return configPath;
  }

  it("should print help and return 0 when --help is passed", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await runPlanCommand(["--help"]);

    expect(code).toBe(0);
    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("Usage: env-typegen plan");
  });

  it("should return 0 with ALLOW decision for a clean report", async () => {
    const contractPath = await writeContract();
    const envPath = path.join(dir, ".env");
    await writeFile(envPath, "PORT=3000\n", "utf8");

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPlanCommand([
      "--env",
      envPath,
      "--targets",
      envPath,
      "--contract",
      contractPath,
    ]);

    expect(code).toBe(0);
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Policy decision: ALLOW");
  });

  it("should return 1 with BLOCK decision when warnings exist under default policy", async () => {
    const contractPath = await writeContract();
    const envPath = path.join(dir, ".env");
    await writeFile(envPath, "PORT=3000\nEXTRA=true\n", "utf8");

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPlanCommand([
      "--env",
      envPath,
      "--targets",
      envPath,
      "--contract",
      contractPath,
      "--no-strict",
    ]);

    expect(code).toBe(1);
    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("Policy decision: BLOCK");
  });

  it("should emit JSON output and allow warnings when policy defaults are relaxed", async () => {
    const contractPath = await writeContract();
    const envPath = path.join(dir, ".env");
    await writeFile(envPath, "PORT=3000\nEXTRA=true\n", "utf8");

    const configPath = await writeConfig(
      [
        "export default {",
        '  input: ".env.example",',
        "  policy: {",
        '    defaults: { onWarnings: "allow" },',
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPlanCommand([
      "--env",
      envPath,
      "--targets",
      envPath,
      "--contract",
      contractPath,
      "--no-strict",
      "--config",
      configPath,
      "--json",
    ]);

    expect(code).toBe(0);
    const raw = stdoutSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as {
      command: string;
      policy: { decision: string; risk: string };
      summary: { warnings: number };
      changeSetHash: string;
      preflightProof: { provider: string; changeSetHash: string; proofId: string };
      preflightAttestation: {
        provider: string;
        changeSetHash: string;
        attestationId: string;
        correlationId: string;
      };
      changeSet: {
        version: number;
        source: string;
        summary: { total: number };
      };
    };

    expect(parsed.command).toBe("plan");
    expect(parsed.policy.decision).toBe("allow");
    expect(parsed.summary.warnings).toBeGreaterThan(0);
    expect(parsed.changeSetHash.length).toBeGreaterThan(0);
    expect(parsed.preflightProof.provider).toBe("local-validation");
    expect(parsed.preflightProof.changeSetHash).toBe(parsed.changeSetHash);
    expect(parsed.preflightProof.proofId.length).toBeGreaterThan(0);
    expect(parsed.preflightAttestation.provider).toBe("local-validation");
    expect(parsed.preflightAttestation.changeSetHash).toBe(parsed.changeSetHash);
    expect(parsed.preflightAttestation.attestationId.length).toBeGreaterThan(0);
    expect(parsed.preflightAttestation.correlationId).toBe(`plan:${parsed.changeSetHash}`);
    expect(parsed.changeSet.version).toBe(1);
    expect(parsed.changeSet.source).toBe("validation-report");
    expect(parsed.changeSet.summary.total).toBeGreaterThan(0);
  });
});
