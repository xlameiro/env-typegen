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
});
