import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EnvTypegenConfig } from "../src/config.js";
import { defineConfig, loadConfig } from "../src/config.js";

describe("defineConfig", () => {
  it("should return the same config object by reference", () => {
    const config: EnvTypegenConfig = { input: ".env.example" };
    expect(defineConfig(config)).toBe(config);
  });

  it("should accept only the required input field", () => {
    const config = defineConfig({ input: ".env.example" });
    expect(config.input).toBe(".env.example");
  });

  it("should accept all optional fields", () => {
    const config = defineConfig({
      input: ".env.example",
      output: "./generated",
      generators: ["typescript", "zod"],
      format: true,
    });
    expect(config.output).toBe("./generated");
    expect(config.generators).toEqual(["typescript", "zod"]);
    expect(config.format).toBe(true);
  });

  it("should accept all four generator names", () => {
    const config = defineConfig({
      input: ".env",
      generators: ["typescript", "zod", "t3", "declaration"],
    });
    expect(config.generators).toHaveLength(4);
    expect(config.generators).toContain("typescript");
    expect(config.generators).toContain("zod");
    expect(config.generators).toContain("t3");
    expect(config.generators).toContain("declaration");
  });

  it("should accept format: false", () => {
    const config = defineConfig({ input: ".env", format: false });
    expect(config.format).toBe(false);
  });

  it("should accept an absolute path as input", () => {
    const config = defineConfig({ input: "/project/.env.production" });
    expect(config.input).toBe("/project/.env.production");
  });
});

describe("loadConfig", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-config-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("should return undefined when no config file exists in the directory", async () => {
    // The OS temp directory will not contain any env-typegen config files
    const result = await loadConfig(tmpdir());
    expect(result).toBeUndefined();
  });

  it("should return undefined when called with a non-existent directory", async () => {
    const result = await loadConfig("/tmp/__env_typegen_no_such_dir__");
    expect(result).toBeUndefined();
  });

  it("should load config from env-typegen.config.mjs", async () => {
    const configPath = path.join(dir, "env-typegen.config.mjs");
    await writeFile(
      configPath,
      `export default { input: ".env.example", format: false };\n`,
      "utf8",
    );

    const config = await loadConfig(dir);
    expect(config).toEqual({ input: ".env.example", format: false });
  });

  it("should load config with array input from env-typegen.config.mjs", async () => {
    const configPath = path.join(dir, "env-typegen.config.mjs");
    await writeFile(
      configPath,
      `export default { input: [".env.example", ".env.local.example"] };\n`,
      "utf8",
    );

    const config = await loadConfig(dir);
    expect(config).toEqual({ input: [".env.example", ".env.local.example"] });
  });

  it("should ignore env-typegen.config.ts during auto-discovery", async () => {
    const configPath = path.join(dir, "env-typegen.config.ts");
    await writeFile(configPath, `export default { input: ".env.example" };\n`, "utf8");

    const config = await loadConfig(dir);
    expect(config).toBeUndefined();
  });

  it("should prefer env-typegen.config.mjs over .js when both exist", async () => {
    await writeFile(
      path.join(dir, "env-typegen.config.js"),
      `export default { input: "js-input.env" };\n`,
      "utf8",
    );
    await writeFile(
      path.join(dir, "env-typegen.config.mjs"),
      `export default { input: ".env.example", format: false };\n`,
      "utf8",
    );

    const result = await loadConfig(dir);
    expect(result).not.toBeUndefined();
    expect(result?.input).toBe(".env.example");
    expect(result?.format).toBe(false);
  });
});
