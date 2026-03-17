import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RunGenerateOptions } from "../src/cli.js";
import { runCli, runGenerate } from "../src/cli.js";

const _require = createRequire(import.meta.url);
const EXPECTED_VERSION = String((_require("../package.json") as { version: string }).version);

// ---------------------------------------------------------------------------
// runGenerate — pipeline unit tests (all using real temp dirs)
// ---------------------------------------------------------------------------

describe("runGenerate", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-gen-test-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function makeInput(content: string): Promise<string> {
    const p = path.join(dir, ".env.example");
    await writeFile(p, content);
    return p;
  }

  function opts(overrides: Partial<RunGenerateOptions> & { input: string }): RunGenerateOptions {
    return {
      output: path.join(dir, "env.generated.ts"),
      generators: ["typescript"],
      format: false,
      ...overrides,
    };
  }

  it("should write TypeScript types to the output file", async () => {
    const input = await makeInput("DATABASE_URL=postgres://localhost/db\n");
    const output = path.join(dir, "env.generated.ts");

    await runGenerate(opts({ input, output, generators: ["typescript"] }));

    const content = await readFile(output, "utf8");
    expect(content).toContain("DATABASE_URL");
    expect(content).toContain("string");
  });

  it("should write Zod schema to the output file", async () => {
    const input = await makeInput("PORT=3000\n");
    const output = path.join(dir, "env.generated.ts");

    await runGenerate(opts({ input, output, generators: ["zod"] }));

    const content = await readFile(output, "utf8");
    expect(content).toContain("PORT");
    expect(content).toContain("z.coerce.number");
  });

  it("should write t3 env config to the output file", async () => {
    const input = await makeInput("SECRET_KEY=abcdefgh\n");
    const output = path.join(dir, "env.generated.ts");

    await runGenerate(opts({ input, output, generators: ["t3"] }));

    const content = await readFile(output, "utf8");
    expect(content).toContain("createEnv");
    expect(content).toContain("SECRET_KEY");
  });

  it("should write a declaration file to the output path", async () => {
    const input = await makeInput("API_URL=https://api.example.com\n");
    const output = path.join(dir, "env.generated.d.ts");

    await runGenerate(opts({ input, output, generators: ["declaration"] }));

    const content = await readFile(output, "utf8");
    expect(content).toContain("API_URL");
    expect(content).toContain("ProcessEnv");
  });

  it("should format output with prettier when format is true", async () => {
    const input = await makeInput("PORT=3000\n");
    const output = path.join(dir, "env.generated.ts");

    await runGenerate(opts({ input, output, generators: ["typescript"], format: true }));

    const content = await readFile(output, "utf8");
    expect(content.endsWith("\n")).toBe(true);
  });

  it("should create intermediate output directories that do not exist", async () => {
    const input = await makeInput("KEY=value\n");
    const output = path.join(dir, "nested", "deep", "env.generated.ts");

    await runGenerate(opts({ input, output, generators: ["typescript"] }));

    const content = await readFile(output, "utf8");
    expect(content).toContain("KEY");
  });

  it("should write separate files when multiple generators are specified", async () => {
    const input = await makeInput("APP_SECRET=mysecret\n");
    const output = path.join(dir, "env.generated.ts");

    await runGenerate(opts({ input, output, generators: ["typescript", "zod"] }));

    // Multi-generator: files are named <base>.<generator><ext>
    const tsContent = await readFile(path.join(dir, "env.generated.typescript.ts"), "utf8");
    const zodContent = await readFile(path.join(dir, "env.generated.zod.ts"), "utf8");

    expect(tsContent).toContain("APP_SECRET");
    expect(zodContent).toContain("APP_SECRET");
    expect(zodContent).toContain("z.string");
  });

  it("should reject when the input file does not exist", async () => {
    await expect(
      runGenerate(opts({ input: path.join(dir, "nonexistent.env"), generators: ["typescript"] })),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// runCli — argument parsing and top-level behaviour
// ---------------------------------------------------------------------------

describe("runCli", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-cli-test-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should print the package version when --version is passed", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["--version"]);

    expect(spy).toHaveBeenCalledWith(EXPECTED_VERSION);
  });

  it("should print the package version when -v is passed", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["-v"]);

    expect(spy).toHaveBeenCalledWith(EXPECTED_VERSION);
  });

  it("should print help text when --help is passed", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["--help"]);

    const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("env-typegen");
    expect(output).toContain("--input");
    expect(output).toContain("--generator");
    expect(output).toContain("--format");
    expect(output).toContain("--watch");
  });

  it("should print help text when -h is passed", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["-h"]);

    const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("env-typegen");
    expect(output).toContain("--input");
  });

  it("should call process.exit(1) and print an error when --input is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((_code) => {
      throw new Error(`process.exit(${String(_code)})`);
    });

    await expect(runCli([])).rejects.toThrow("process.exit(1)");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should run the generate pipeline when --input and --output are provided", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "MY_VAR=hello\n");
    const outputPath = path.join(dir, "out.ts");

    await runCli(["--input", inputPath, "--output", outputPath, "--generator", "typescript"]);

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("MY_VAR");
  });

  it("should use the --generator flag to select the generator", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "API_KEY=abc\n");
    const outputPath = path.join(dir, "out.ts");

    await runCli(["--input", inputPath, "--output", outputPath, "--generator", "zod"]);

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("z.string");
  });

  it("should use the --format flag to select the generator", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "API_KEY=abc\n");
    const outputPath = path.join(dir, "out.ts");

    await runCli(["--input", inputPath, "--output", outputPath, "--format", "zod"]);

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("z.string");
  });

  it("should use -g shorthand for the generator flag", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "TOKEN=xyz\n");
    const outputPath = path.join(dir, "out.ts");

    await runCli(["-i", inputPath, "-o", outputPath, "-g", "zod"]);

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("TOKEN");
    expect(content).toContain("z.string");
  });

  it("should default to all four generators when no --generator is specified", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "DB_HOST=localhost\n");
    const outputPath = path.join(dir, "out.ts");

    await runCli(["--input", inputPath, "--output", outputPath]);

    // With multiple generators, each produces a suffixed file
    const tsContent = await readFile(path.join(dir, "out.typescript.ts"), "utf8");
    expect(tsContent).toContain("ProcessEnv");
    expect(tsContent).toContain("DB_HOST");

    const zodContent = await readFile(path.join(dir, "out.zod.ts"), "utf8");
    expect(zodContent).toContain("z.");
  });

  it("should support --stdout without writing files", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "PUBLIC_URL=https://example.com\n");
    const outputPath = path.join(dir, "out.ts");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["--input", inputPath, "--output", outputPath, "--stdout"]);

    await expect(readFile(outputPath, "utf8")).rejects.toThrow();
    const printed = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(printed).toContain("PUBLIC_URL");
  });

  it("should support --dry-run without writing files", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "PUBLIC_URL=https://example.com\n");
    const outputPath = path.join(dir, "out.ts");

    await runCli(["--input", inputPath, "--output", outputPath, "--dry-run"]);

    await expect(readFile(outputPath, "utf8")).rejects.toThrow();
  });

  it("should print generated content to stdout in --dry-run mode", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "PUBLIC_URL=https://example.com\n");
    const outputPath = path.join(dir, "out.ts");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli([
      "--input",
      inputPath,
      "--output",
      outputPath,
      "--generator",
      "typescript",
      "--dry-run",
    ]);

    const printed = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(printed).toContain("PUBLIC_URL");
  });

  it("should disable formatting with --no-format", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "APP_NAME=my-app\n");
    const outputPath = path.join(dir, "out.ts");

    await runCli([
      "--input",
      inputPath,
      "--output",
      outputPath,
      "--generator",
      "typescript",
      "--no-format",
    ]);

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("APP_NAME");
  });

  it("should suppress success logs with --silent", async () => {
    const inputPath = path.join(dir, ".env.example");
    await writeFile(inputPath, "APP_NAME=my-app\n");
    const outputPath = path.join(dir, "out.ts");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["--input", inputPath, "--output", outputPath, "--silent"]);

    const logs = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logs).not.toContain("Generated");
  });

  it("should document the multi-generator output suffix convention in --help", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["--help"]);

    const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("typescript.ts");
  });

  it("should document config file auto-discovery order in --help", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["--help"]);

    const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("Config file:");
    expect(output).toContain("env-typegen.config.mjs");
  });

  it("should document exit codes in generate --help", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["--help"]);

    const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("Exit codes:");
  });

  it("should document exit codes in check --help", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["check", "--help"]);

    const output = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(output).toContain("Exit codes:");
    expect(output).toContain("status: ok or warn");
  });
});
