import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runPullCommand } from "../../src/commands/pull-command.js";

describe("runPullCommand", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-pull-cmd-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function writeConfig(content: string): Promise<string> {
    const configPath = path.join(dir, "env-typegen.config.mjs");
    await writeFile(configPath, content, "utf8");
    return configPath;
  }

  async function writeAdapter(filename: string, content: string): Promise<string> {
    const adapterPath = path.join(dir, filename);
    await writeFile(adapterPath, content, "utf8");
    return adapterPath;
  }

  // -----------------------------------------------------------------------
  // Help flag
  // -----------------------------------------------------------------------

  it("should print help text and return 0 when --help is passed", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await runPullCommand(["--help"]);

    expect(code).toBe(0);
    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("env-typegen pull");
    expect(output).toContain("--provider");
    expect(output).toContain("Exit codes:");
  });

  it("should print help text and return 0 when -h shorthand is passed", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const code = await runPullCommand(["-h"]);

    expect(code).toBe(0);
    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("env-typegen pull");
  });

  // -----------------------------------------------------------------------
  // Error paths: provider resolution
  // -----------------------------------------------------------------------

  it("should return 1 and write to stderr when no provider argument is given", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const code = await runPullCommand([]);

    expect(code).toBe(1);
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderr).toContain("Provider is required");
  });

  it("should return 1 and write to stderr when provider is not defined in config", async () => {
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: {} };\n`,
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const code = await runPullCommand(["vercel", "--config", configPath]);

    expect(code).toBe(1);
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderr).toContain("vercel");
  });

  it("should return 1 and write to stderr when config file does not exist", async () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const code = await runPullCommand([
      "vercel",
      "--config",
      path.join(dir, "nonexistent.config.mjs"),
    ]);

    expect(code).toBe(1);
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderr.length).toBeGreaterThan(0);
  });

  it("should return 1 and write to stderr when adapter module cannot be loaded", async () => {
    const nonexistentPath = path.join(dir, "nonexistent-adapter.mjs");
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { broken: { adapter: '${nonexistentPath}' } } };\n`,
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const code = await runPullCommand(["broken", "--config", configPath]);

    expect(code).toBe(1);
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderr.length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // Success paths: human output
  // -----------------------------------------------------------------------

  it("should output human-readable text with variable count on success", async () => {
    const adapterPath = await writeAdapter(
      "test-adapter.mjs",
      `export default { name: "test", pull: async () => ({ values: { API_KEY: "secret", PORT: "3000" } }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { myprovider: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["myprovider", "--config", configPath]);

    expect(code).toBe(0);
    const output = writeSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("2 variable(s)");
    expect(output).toContain("myprovider");
  });

  it("should list sorted keys in human-readable output", async () => {
    const adapterPath = await writeAdapter(
      "sorted-adapter.mjs",
      `export default { name: "sorted", pull: async () => ({ values: { ZEBRA: "z", ALPHA: "a", MIDDLE: "m" } }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { sorted: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["sorted", "--config", configPath]);

    expect(code).toBe(0);
    const output = writeSpy.mock.calls.map((call) => String(call[0])).join("");
    const alphaIdx = output.indexOf("ALPHA");
    const middleIdx = output.indexOf("MIDDLE");
    const zebraIdx = output.indexOf("ZEBRA");
    expect(alphaIdx).toBeLessThan(middleIdx);
    expect(middleIdx).toBeLessThan(zebraIdx);
  });

  it("should use 'development' as default environment when --env is omitted", async () => {
    const adapterPath = await writeAdapter(
      "dev-adapter.mjs",
      `export default { name: "dev", pull: async () => ({ values: {} }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { dev: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["dev", "--config", configPath]);

    expect(code).toBe(0);
    const output = writeSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("development");
  });

  it("should honour --env flag and include it in human output", async () => {
    const adapterPath = await writeAdapter(
      "env-adapter.mjs",
      `export default { name: "env", pull: async () => ({ values: {} }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { env: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["env", "--config", configPath, "--env", "production"]);

    expect(code).toBe(0);
    const output = writeSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain("production");
  });

  // -----------------------------------------------------------------------
  // Success paths: JSON output
  // -----------------------------------------------------------------------

  it("should emit compact JSON with provider, keys, count when --json is passed", async () => {
    const adapterPath = await writeAdapter(
      "json-adapter.mjs",
      `export default { name: "json-test", pull: async () => ({ values: { DB_URL: "postgres://dev", REDIS_URL: "redis://localhost" } }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { cloud: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["cloud", "--config", configPath, "--json"]);

    expect(code).toBe(0);
    const raw = writeSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as {
      provider: string;
      environment: string;
      keys: string[];
      count: number;
    };
    expect(parsed.provider).toBe("cloud");
    expect(parsed.environment).toBe("development");
    expect(parsed.keys).toContain("DB_URL");
    expect(parsed.keys).toContain("REDIS_URL");
    expect(parsed.count).toBe(2);
  });

  it("should include warnings in JSON output when adapter returns them", async () => {
    const adapterPath = await writeAdapter(
      "warn-adapter.mjs",
      `export default { name: "warn", pull: async () => ({ values: { FOO: "bar" }, warnings: ["Token expiring soon", "Rate limit approaching"] }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { warn: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["warn", "--config", configPath, "--json"]);

    expect(code).toBe(0);
    const raw = writeSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as { warnings?: string[] };
    expect(parsed.warnings).toEqual(["Token expiring soon", "Rate limit approaching"]);
  });

  it("should omit warnings field from JSON output when adapter returns no warnings", async () => {
    const adapterPath = await writeAdapter(
      "clean-adapter.mjs",
      `export default { name: "clean", pull: async () => ({ values: { FOO: "bar" } }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { clean: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["clean", "--config", configPath, "--json"]);

    expect(code).toBe(0);
    const raw = writeSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as { warnings?: string[] };
    expect(parsed.warnings).toBeUndefined();
  });

  it("should omit warnings field from JSON output when adapter returns an empty warnings array", async () => {
    const adapterPath = await writeAdapter(
      "empty-warn-adapter.mjs",
      `export default { name: "empty-warn", pull: async () => ({ values: {}, warnings: [] }) };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { ew: { adapter: '${adapterPath}' } } };\n`,
    );
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["ew", "--config", configPath, "--json"]);

    expect(code).toBe(0);
    const raw = writeSpy.mock.calls
      .map((call) => String(call[0]))
      .join("")
      .trim();
    const parsed = JSON.parse(raw) as { warnings?: string[] };
    expect(parsed.warnings).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // Error paths: adapter runtime failure
  // -----------------------------------------------------------------------

  it("should return 1 when the adapter pull throws at runtime", async () => {
    const adapterPath = await writeAdapter(
      "failing-adapter.mjs",
      `export default { name: "failing", pull: async () => { throw new Error("Network timeout"); } };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { failing: { adapter: '${adapterPath}' } } };\n`,
    );
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const code = await runPullCommand(["failing", "--config", configPath]);

    expect(code).toBe(1);
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stderr).toContain("Network timeout");
  });

  it("should not write to stdout when the adapter pull throws at runtime", async () => {
    const adapterPath = await writeAdapter(
      "throw-adapter.mjs",
      `export default { name: "throw", pull: async () => { throw new Error("crash"); } };\n`,
    );
    const configPath = await writeConfig(
      `export default { input: '.env.example', providers: { thrower: { adapter: '${adapterPath}' } } };\n`,
    );
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const code = await runPullCommand(["thrower", "--config", configPath]);

    expect(code).toBe(1);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
