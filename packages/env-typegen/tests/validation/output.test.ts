import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { emitValidationReport } from "../../src/validation/output.js";
import type { ValidationReport } from "../../src/validation/types.js";

function createReport(): ValidationReport {
  return {
    schemaVersion: 1,
    status: "fail",
    summary: { errors: 1, warnings: 1, total: 2 },
    issues: [
      {
        code: "ENV_MISSING",
        type: "missing",
        severity: "error",
        key: "DATABASE_URL",
        environment: ".env",
        message: "Missing variable",
        expected: { type: "url" },
        value: null,
      },
      {
        code: "ENV_EXTRA",
        type: "extra",
        severity: "warning",
        key: "UNUSED_FLAG",
        environment: ".env",
        message: "Unexpected variable",
        receivedType: "string",
        value: null,
      },
    ],
    meta: {
      env: ".env",
      timestamp: "2026-03-17T00:00:00.000Z",
    },
    recommendations: ["Remove UNUSED_FLAG from .env"],
  };
}

describe("emitValidationReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should emit a human-readable report when json mode is off", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    });

    await emitValidationReport({
      report: createReport(),
      jsonMode: "off",
    });

    const text = writes.join("");
    expect(text).toContain("Status: FAIL (errors=1, warnings=1, total=2)");
    expect(text).toContain("ERROR [ENV_MISSING] .env:DATABASE_URL");
    expect(text).toContain("WARNING [ENV_EXTRA] .env:UNUSED_FLAG");
    expect(text).toContain("Recommendations:");
  });

  it("should emit compact json when json mode is compact", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    });

    await emitValidationReport({
      report: createReport(),
      jsonMode: "compact",
    });

    const output = writes.join("");
    expect(output.startsWith("{")).toBe(true);
    expect(output.includes("\n  ")).toBe(false);
    expect(JSON.parse(output)).toMatchObject({
      schemaVersion: 1,
      status: "fail",
      summary: { errors: 1, warnings: 1, total: 2 },
    });
  });

  it("should emit pretty json and persist to output file when requested", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    });

    const tempDir = await mkdtemp(path.join(tmpdir(), "env-typegen-output-"));
    const outputFile = path.join(tempDir, "reports", "validation.json");

    await emitValidationReport({
      report: createReport(),
      jsonMode: "pretty",
      outputFile,
    });

    const emitted = writes.join("");
    expect(emitted).toContain('\n  "schemaVersion": 1,\n');

    const persisted = await readFile(outputFile, "utf8");
    expect(persisted).toContain('\n  "status": "fail",\n');
    expect(JSON.parse(persisted)).toMatchObject({
      schemaVersion: 1,
      meta: { env: ".env" },
    });
  });
});
