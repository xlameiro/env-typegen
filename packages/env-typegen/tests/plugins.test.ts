import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  applyContractPlugins,
  applyReportPlugins,
  applySourcePlugins,
  loadPlugins,
  type EnvTypegenPlugin,
} from "../src/plugins.js";
import type { EnvContract, ValidationReport } from "../src/validation/types.js";

const baseContract: EnvContract = {
  schemaVersion: 1,
  variables: {
    PORT: {
      expected: { type: "number" },
      required: true,
      clientSide: false,
    },
  },
};

const baseReport: ValidationReport = {
  schemaVersion: 1,
  status: "ok",
  summary: { errors: 0, warnings: 0, total: 0 },
  issues: [],
  meta: { env: "local", timestamp: "2026-03-17T00:00:00.000Z" },
};

describe("plugins", () => {
  it("should load plugin modules from file paths", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "env-typegen-plugin-"));
    const pluginPath = path.join(dir, "plugin.mjs");
    await writeFile(
      pluginPath,
      [
        "export default {",
        '  name: "module-plugin",',
        "  transformSource: ({ values }) => ({ ...values, ENABLED: 'true' }),",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const loaded = await loadPlugins({
      pluginPaths: [pluginPath],
      cwd: process.cwd(),
    });
    const transformed = applySourcePlugins({ environment: ".env", values: {} }, loaded);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.name).toBe("module-plugin");
    expect(transformed.ENABLED).toBe("true");
  });

  it("should load inline plugins from config references", async () => {
    const plugin: EnvTypegenPlugin = {
      name: "inline",
    };

    const loaded = await loadPlugins({
      pluginPaths: [],
      configPlugins: [plugin],
      cwd: process.cwd(),
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.name).toBe("inline");
  });

  it("should transform contract, source, and report through hooks", () => {
    const plugin: EnvTypegenPlugin = {
      name: "transformer",
      transformContract: (contract) => ({
        ...contract,
        variables: {
          ...contract.variables,
          NEXT_PUBLIC_API_URL: {
            expected: { type: "url" },
            required: true,
            clientSide: true,
          },
        },
      }),
      transformSource: ({ values }) => ({
        ...values,
        PORT: "3000",
      }),
      transformReport: (report) => ({
        ...report,
        recommendations: ["Plugin recommendation"],
      }),
    };

    const transformedContract = applyContractPlugins(baseContract, [plugin]);
    const transformedSource = applySourcePlugins({ environment: "local", values: {} }, [plugin]);
    const transformedReport = applyReportPlugins(baseReport, [plugin]);

    expect(Object.keys(transformedContract.variables)).toContain("NEXT_PUBLIC_API_URL");
    expect(transformedSource.PORT).toBe("3000");
    expect(transformedReport.recommendations).toEqual(["Plugin recommendation"]);
  });

  it("should throw when a plugin module exports an invalid shape", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "env-typegen-plugin-"));
    const pluginPath = path.join(dir, "bad-plugin.mjs");
    await writeFile(pluginPath, "export default { bad: true };\n", "utf8");

    await expect(
      loadPlugins({
        pluginPaths: [pluginPath],
        cwd: process.cwd(),
      }),
    ).rejects.toThrow("Invalid plugin");
  });
});
