import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readEnvFile, writeOutput } from "../../src/utils/file.js";

describe("readEnvFile", () => {
  it("should read a file and return its text content", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "envtypegen-"));
    const filePath = path.join(tempDir, ".env.example");
    await writeFile(filePath, "KEY=value\nOTHER=123");

    const content = await readEnvFile(filePath);
    expect(content).toBe("KEY=value\nOTHER=123");

    await rm(tempDir, { recursive: true });
  });

  it("should handle files with unicode content", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "envtypegen-"));
    const filePath = path.join(tempDir, ".env.example");
    await writeFile(filePath, "# Español — commentaire \nKEY=value", "utf8");

    const content = await readEnvFile(filePath);
    expect(content).toContain("Español");

    await rm(tempDir, { recursive: true });
  });

  it("should throw a user-friendly 'File not found' error when the file does not exist", async () => {
    await expect(readEnvFile("/nonexistent/path/.env.missing")).rejects.toThrow("File not found:");
  });

  it("should include the resolved absolute path in the error when a relative path is not found", async () => {
    const relativePath = ".env.nonexistent-typegen-test";
    const resolved = path.resolve(relativePath);
    await expect(readEnvFile(relativePath)).rejects.toThrow(
      `File not found: ${relativePath} (resolved: ${resolved})`,
    );
  });
});

describe("writeOutput", () => {
  it("should write content to a file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "envtypegen-"));
    const filePath = path.join(tempDir, "output.ts");

    await writeOutput(filePath, "export type Foo = string;");
    const content = await readFile(filePath, "utf8");
    expect(content).toBe("export type Foo = string;");

    await rm(tempDir, { recursive: true });
  });

  it("should create intermediate directories that do not exist", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "envtypegen-"));
    const filePath = path.join(tempDir, "nested", "deep", "output.ts");

    await writeOutput(filePath, "// generated");
    expect(existsSync(filePath)).toBe(true);

    await rm(tempDir, { recursive: true });
  });

  it("should overwrite an existing file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "envtypegen-"));
    const filePath = path.join(tempDir, "output.ts");

    await writeOutput(filePath, "first content");
    await writeOutput(filePath, "second content");
    const content = await readFile(filePath, "utf8");
    expect(content).toBe("second content");

    await rm(tempDir, { recursive: true });
  });

  it("should resolve relative paths against process.cwd()", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "envtypegen-abs-"));
    const absPath = path.join(tempDir, "out.ts");

    await writeOutput(absPath, "// abs");
    expect(existsSync(absPath)).toBe(true);

    await rm(tempDir, { recursive: true });
  });
});
