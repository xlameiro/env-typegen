import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { loadAdapter } from "../../src/adapters/loader.js";

describe("loadAdapter", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "env-typegen-loader-"));
  });

  // -----------------------------------------------------------------------
  // Relative path resolution
  // -----------------------------------------------------------------------

  it("should load a valid adapter from a relative path (default export)", async () => {
    await writeFile(
      path.join(dir, "valid-adapter.mjs"),
      `export default { name: "valid", pull: async () => ({ values: { FOO: "bar" } }) };\n`,
      "utf8",
    );

    const adapter = await loadAdapter("./valid-adapter.mjs", { cwd: dir });

    expect(adapter.name).toBe("valid");
    expect(typeof adapter.pull).toBe("function");
  });

  it("should load a valid adapter exported as the named 'adapter' export", async () => {
    await writeFile(
      path.join(dir, "named-adapter.mjs"),
      `export const adapter = { name: "named", pull: async () => ({ values: {} }) };\n`,
      "utf8",
    );

    const loaded = await loadAdapter("./named-adapter.mjs", { cwd: dir });

    expect(loaded.name).toBe("named");
  });

  it("should throw with an actionable message when relative-path module has wrong name type", async () => {
    await writeFile(
      path.join(dir, "bad-name.mjs"),
      `export default { name: 42, pull: async () => ({ values: {} }) };\n`,
      "utf8",
    );

    await expect(loadAdapter("./bad-name.mjs", { cwd: dir })).rejects.toThrow(
      /"name" must be a string/,
    );
  });

  it("should throw with an actionable message when relative-path module has no pull function", async () => {
    await writeFile(path.join(dir, "no-pull.mjs"), `export default { name: "nopull" };\n`, "utf8");

    await expect(loadAdapter("./no-pull.mjs", { cwd: dir })).rejects.toThrow(
      /"pull" must be a function/,
    );
  });

  it("should throw with an actionable message when relative-path module is not an object", async () => {
    await writeFile(path.join(dir, "not-object.mjs"), `export default "just a string";\n`, "utf8");

    await expect(loadAdapter("./not-object.mjs", { cwd: dir })).rejects.toThrow(/not an object/);
  });

  it("should throw when a relative path does not exist on disk", async () => {
    await expect(loadAdapter("./does-not-exist.mjs", { cwd: dir })).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // Absolute path resolution
  // -----------------------------------------------------------------------

  it("should load a valid adapter from an absolute path", async () => {
    const absPath = path.join(dir, "abs-adapter.mjs");
    await writeFile(
      absPath,
      `export default { name: "absolute", pull: async () => ({ values: { X: "1" } }) };\n`,
      "utf8",
    );

    const adapter = await loadAdapter(absPath, { cwd: dir });

    expect(adapter.name).toBe("absolute");
  });

  it("should throw with an actionable message when absolute-path module is missing pull", async () => {
    const absPath = path.join(dir, "abs-nopull.mjs");
    await writeFile(absPath, `export default { name: "abs-nopull" };\n`, "utf8");

    await expect(loadAdapter(absPath, { cwd: dir })).rejects.toThrow(/"pull" must be a function/);
  });

  // -----------------------------------------------------------------------
  // Package name resolution (expected failures for non-existent packages)
  // -----------------------------------------------------------------------

  it("should throw with the package name in the message when the package is not installed", async () => {
    const packageName = "@env-typegen/nonexistent-adapter-xyz";

    await expect(loadAdapter(packageName, { cwd: dir })).rejects.toThrow(packageName);
  });

  it("should throw with 'Unable to load adapter' when a package name cannot be resolved", async () => {
    await expect(loadAdapter("@env-typegen/unknown-adapter-abc", { cwd: dir })).rejects.toThrow(
      "Unable to load adapter",
    );
  });

  it("should include installation guidance in the error message for package resolution failures", async () => {
    await expect(loadAdapter("env-typegen-adapter-not-real", { cwd: dir })).rejects.toThrow(
      /Install the adapter package|relative path/,
    );
  });

  // -----------------------------------------------------------------------
  // Optional adapter methods
  // -----------------------------------------------------------------------

  it("should load an adapter that has push defined as a function", async () => {
    await writeFile(
      path.join(dir, "pushable.mjs"),
      `export default { name: "pushable", pull: async () => ({ values: {} }), push: async () => {} };\n`,
      "utf8",
    );

    const adapter = await loadAdapter("./pushable.mjs", { cwd: dir });

    expect(adapter.name).toBe("pushable");
    expect(typeof adapter.push).toBe("function");
  });

  it("should throw when push is defined but is not a function", async () => {
    await writeFile(
      path.join(dir, "bad-push.mjs"),
      `export default { name: "bad-push", pull: async () => ({ values: {} }), push: "not-a-function" };\n`,
      "utf8",
    );

    await expect(loadAdapter("./bad-push.mjs", { cwd: dir })).rejects.toThrow(
      /"push" must be a function when defined/,
    );
  });

  it("should load an adapter with all optional methods defined", async () => {
    await writeFile(
      path.join(dir, "full-adapter.mjs"),
      [
        "export default {",
        '  name: "full",',
        "  pull: async () => ({ values: {} }),",
        "  push: async () => {},",
        "  compare: async () => ({ missingInRemote: [], extraInRemote: [], mismatches: [] }),",
        "  meta: () => ({ name: 'full', capabilities: { pull: true, push: true, compare: true, redactValuesByDefault: true } }),",
        "};",
      ].join("\n"),
      "utf8",
    );

    const adapter = await loadAdapter("./full-adapter.mjs", { cwd: dir });

    expect(adapter.name).toBe("full");
    expect(typeof adapter.compare).toBe("function");
    expect(typeof adapter.meta).toBe("function");
  });
});
