import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(CURRENT_DIR, "../..");
const DIST_CLI = path.resolve(PACKAGE_ROOT, "dist/cli.js");

/** Run the built CLI synchronously and return stdout+stderr as a string. */
function runBuiltCli(args: string[], cwd: string): string {
  const allArgs = args.map((a) => JSON.stringify(a)).join(" ");
  const command = `node ${JSON.stringify(DIST_CLI)} ${allArgs}`;
  try {
    return execSync(command, { cwd, stdio: "pipe", encoding: "utf8" });
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };
    throw new Error(
      `CLI exited with non-zero status.\nstdout: ${e.stdout ?? ""}\nstderr: ${e.stderr ?? ""}`,
    );
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

describe("cli integration", () => {
  beforeAll(() => {
    execSync("pnpm build", { cwd: PACKAGE_ROOT, stdio: "pipe" });
  });

  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("should generate typescript output using built dist/cli.js", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-int-test-"));
    const inputPath = path.join(dir, ".env.example");
    const outputPath = path.join(dir, "env.generated.ts");

    await writeFile(inputPath, "DATABASE_URL=postgres://localhost/db\n", "utf8");

    runBuiltCli(
      ["--input", inputPath, "--output", outputPath, "--generator", "typescript"],
      PACKAGE_ROOT,
    );

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("DATABASE_URL");
  });

  it("should generate all four output files when no --generator flag is given", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-int-test-"));
    const inputPath = path.join(dir, ".env.example");
    const outputBase = path.join(dir, "env.ts");

    await writeFile(inputPath, "API_KEY=secret\n", "utf8");

    runBuiltCli(["--input", inputPath, "--output", outputBase], PACKAGE_ROOT);

    // With 4 generators, names are suffixed: env.typescript.ts, env.zod.ts, etc.
    const stem = path.join(dir, "env");
    expect(await exists(`${stem}.typescript.ts`)).toBe(true);
    expect(await exists(`${stem}.zod.ts`)).toBe(true);
    expect(await exists(`${stem}.t3.ts`)).toBe(true);
    expect(await exists(`${stem}.declaration.d.ts`)).toBe(true);
  });

  it("should not write any files in --dry-run mode", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-int-test-"));
    const inputPath = path.join(dir, ".env.example");
    const outputPath = path.join(dir, "env.generated.ts");

    await writeFile(inputPath, "SECRET=abc\n", "utf8");

    runBuiltCli(
      ["--input", inputPath, "--output", outputPath, "--generator", "typescript", "--dry-run"],
      PACKAGE_ROOT,
    );

    expect(await exists(outputPath)).toBe(false);
  });

  it("should run without error when --no-format flag is given", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-int-test-"));
    const inputPath = path.join(dir, ".env.example");
    const outputPath = path.join(dir, "env.generated.ts");

    await writeFile(inputPath, "PORT=3000\n", "utf8");

    runBuiltCli(
      ["--input", inputPath, "--output", outputPath, "--generator", "typescript", "--no-format"],
      PACKAGE_ROOT,
    );

    const content = await readFile(outputPath, "utf8");
    expect(content).toContain("PORT");
  });

  it("should handle multiple --input files and produce one output per input", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-int-test-"));
    // Use non-dotfile names so derived outputs are clearly visible (not hidden files)
    const input1 = path.join(dir, "app.env.example");
    const input2 = path.join(dir, "local.env.example");
    const outputPath = path.join(dir, "out.ts");

    await writeFile(input1, "DATABASE_URL=postgres://localhost/db\n", "utf8");
    await writeFile(input2, "REDIS_URL=redis://localhost\n", "utf8");

    runBuiltCli(
      ["--input", input1, "--input", input2, "--output", outputPath, "--generator", "typescript"],
      PACKAGE_ROOT,
    );

    // Multi-input + 1 generator (isSingle=true): each output is named after the
    // input's basename-without-ext + the output extension.
    // app.env.example → app.env.ts ; local.env.example → local.env.ts
    const content1 = await readFile(path.join(dir, "app.env.ts"), "utf8");
    const content2 = await readFile(path.join(dir, "local.env.ts"), "utf8");

    expect(content1).toContain("DATABASE_URL");
    expect(content2).toContain("REDIS_URL");
  });
});
