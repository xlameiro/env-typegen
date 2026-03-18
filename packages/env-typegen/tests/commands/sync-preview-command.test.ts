import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runSyncPreviewCommand } from "../../src/commands/sync-preview-command.js";

describe("runSyncPreviewCommand", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-sync-preview-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function writeAdapter(filename: string, content: string): Promise<string> {
    const adapterPath = path.join(dir, filename);
    await writeFile(adapterPath, content, "utf8");
    return adapterPath;
  }

  async function writeConfig(content: string): Promise<string> {
    const configPath = path.join(dir, "env-typegen.config.mjs");
    await writeFile(configPath, content, "utf8");
    return configPath;
  }

  it("should print help and return 0 when --help is passed", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await runSyncPreviewCommand(["--help"]);

    expect(code).toBe(0);
    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("Usage: env-typegen sync-preview");
  });

  it("should return 0 when no drift is detected", async () => {
    const adapterPath = await writeAdapter(
      "clean-adapter.mjs",
      `export default { name: "clean", pull: async () => ({ values: { PORT: "3000" } }) };\n`,
    );
    const configPath = await writeConfig(
      [
        "export default {",
        '  input: ".env.example",',
        "  providers: {",
        `    demo: { adapter: ${JSON.stringify(adapterPath)} },`,
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    const envPath = path.join(dir, ".env");
    await writeFile(envPath, "PORT=3000\n", "utf8");

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runSyncPreviewCommand([
      "demo",
      "--config",
      configPath,
      "--env-file",
      envPath,
      "--json",
    ]);

    expect(code).toBe(0);
    const raw = stdoutSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as {
      command: string;
      missingInRemote: string[];
      extraInRemote: string[];
      mismatches: string[];
      policy: { decision: string };
      changeSetHash: string;
      preflightProof: { provider: string; changeSetHash: string; proofId: string };
      preflightAttestation: {
        provider: string;
        changeSetHash: string;
        correlationId: string;
      };
      changeSet: {
        version: number;
        source: string;
        summary: { create: number; update: number; delete: number; noOp: number };
      };
    };

    expect(parsed.command).toBe("sync-preview");
    expect(parsed.missingInRemote).toEqual([]);
    expect(parsed.extraInRemote).toEqual([]);
    expect(parsed.mismatches).toEqual([]);
    expect(parsed.policy.decision).toBe("allow");
    expect(parsed.changeSetHash.length).toBeGreaterThan(0);
    expect(parsed.preflightProof.provider).toBe("demo");
    expect(parsed.preflightProof.changeSetHash).toBe(parsed.changeSetHash);
    expect(parsed.preflightProof.proofId.length).toBeGreaterThan(0);
    expect(parsed.preflightAttestation.provider).toBe("demo");
    expect(parsed.preflightAttestation.changeSetHash).toBe(parsed.changeSetHash);
    expect(parsed.preflightAttestation.correlationId).toContain("sync-preview:demo:development:");
    expect(parsed.changeSet.version).toBe(1);
    expect(parsed.changeSet.source).toBe("env-diff");
    expect(parsed.changeSet.summary.create).toBe(0);
    expect(parsed.changeSet.summary.update).toBe(0);
    expect(parsed.changeSet.summary.delete).toBe(0);
    expect(parsed.changeSet.summary.noOp).toBe(1);
  });

  it("should return 1 when drift exists under default policy", async () => {
    const adapterPath = await writeAdapter(
      "drift-adapter.mjs",
      `export default { name: "drift", pull: async () => ({ values: { PORT: "9999", EXTRA_REMOTE: "true" } }) };\n`,
    );
    const configPath = await writeConfig(
      [
        "export default {",
        '  input: ".env.example",',
        "  providers: {",
        `    demo: { adapter: ${JSON.stringify(adapterPath)} },`,
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    const envPath = path.join(dir, ".env");
    await writeFile(envPath, "PORT=3000\nLOCAL_ONLY=true\n", "utf8");

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runSyncPreviewCommand([
      "demo",
      "--config",
      configPath,
      "--env-file",
      envPath,
      "--json",
    ]);

    expect(code).toBe(1);
    const raw = stdoutSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as {
      missingInRemote: string[];
      extraInRemote: string[];
      mismatches: string[];
      policy: { decision: string };
      changeSet: {
        summary: { create: number; update: number; delete: number };
      };
    };

    expect(parsed.missingInRemote).toContain("LOCAL_ONLY");
    expect(parsed.extraInRemote).toContain("EXTRA_REMOTE");
    expect(parsed.mismatches).toContain("PORT");
    expect(parsed.policy.decision).toBe("block");
    expect(parsed.changeSet.summary.create).toBe(1);
    expect(parsed.changeSet.summary.update).toBe(1);
    expect(parsed.changeSet.summary.delete).toBe(1);
  });

  it("should allow drift in advisory mode with relaxed warning defaults", async () => {
    const adapterPath = await writeAdapter(
      "advisory-adapter.mjs",
      `export default { name: "advisory", pull: async () => ({ values: { PORT: "9999" } }) };\n`,
    );
    const configPath = await writeConfig(
      [
        "export default {",
        '  input: ".env.example",',
        "  providers: {",
        `    demo: { adapter: ${JSON.stringify(adapterPath)} },`,
        "  },",
        "  policy: {",
        '    mode: "advisory",',
        '    defaults: { onWarnings: "allow" },',
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    const envPath = path.join(dir, ".env");
    await writeFile(envPath, "PORT=3000\n", "utf8");

    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runSyncPreviewCommand([
      "demo",
      "--config",
      configPath,
      "--env-file",
      envPath,
      "--json",
    ]);

    expect(code).toBe(0);
    const raw = stdoutSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as { policy: { decision: string; mode: string } };

    expect(parsed.policy.decision).toBe("allow");
    expect(parsed.policy.mode).toBe("advisory");
  });
});
