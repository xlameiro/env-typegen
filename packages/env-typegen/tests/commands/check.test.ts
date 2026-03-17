import { afterEach, describe, expect, it, vi } from "vitest";

import type * as envParserModule from "../../src/parser/env-parser.js";
import type { ParsedEnvVar } from "../../src/parser/types.js";
import type * as schemaLoaderModule from "../../src/schema/schema-loader.js";
import type { EnvContract } from "../../src/schema/schema-model.js";
import type * as loggerModule from "../../src/utils/logger.js";

// ---------------------------------------------------------------------------
// Hoisted mocks (vi.hoisted runs before module resolution)
// ---------------------------------------------------------------------------

const { loadContractMock, parseEnvFileMock, logMock, errorMock, warnMock, successMock } =
  vi.hoisted(() => ({
    loadContractMock: vi.fn<(...args: unknown[]) => Promise<EnvContract | undefined>>(),
    parseEnvFileMock: vi.fn(),
    logMock: vi.fn<(msg: string) => void>(),
    errorMock: vi.fn<(msg: string) => void>(),
    warnMock: vi.fn<(msg: string) => void>(),
    successMock: vi.fn<(msg: string) => void>(),
  }));

vi.mock("../../src/schema/schema-loader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof schemaLoaderModule>();
  return { ...actual, loadContract: loadContractMock };
});

vi.mock("../../src/parser/env-parser.js", async (importOriginal) => {
  const actual = await importOriginal<typeof envParserModule>();
  return { ...actual, parseEnvFile: parseEnvFileMock };
});

vi.mock("../../src/utils/logger.js", async (importOriginal) => {
  const actual = await importOriginal<typeof loggerModule>();
  return { ...actual, log: logMock, error: errorMock, warn: warnMock, success: successMock };
});

// ---------------------------------------------------------------------------
// Module under test — imported AFTER vi.mock declarations
// ---------------------------------------------------------------------------

import { runCheck } from "../../src/commands/check.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeContract(vars: EnvContract["vars"] = []): EnvContract {
  return { vars };
}

function makeVar(overrides: Partial<ParsedEnvVar> & { key: string }): ParsedEnvVar {
  return {
    rawValue: "value",
    inferredType: "string",
    isRequired: false,
    isOptional: true,
    isClientSide: false,
    lineNumber: 1,
    ...overrides,
  };
}

function makeParsed(vars: ParsedEnvVar[] = []) {
  return { filePath: ".env.local", vars, groups: [] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runCheck — status", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return 'ok' when there are no validation issues", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    const status = await runCheck({ input: ".env.local" });

    expect(status).toBe("ok");
  });

  it("should return 'fail' when a required variable is missing", async () => {
    loadContractMock.mockResolvedValue(
      makeContract([{ name: "DATABASE_URL", expectedType: "url", required: true }]),
    );
    parseEnvFileMock.mockReturnValue(makeParsed([]));

    const status = await runCheck({ input: ".env.local" });

    expect(status).toBe("fail");
  });

  it("should return 'ok' when only warnings exist (strict=false, extra vars)", async () => {
    loadContractMock.mockResolvedValue(makeContract([]));
    parseEnvFileMock.mockReturnValue(makeParsed([makeVar({ key: "UNKNOWN_VAR" })]));

    const status = await runCheck({ input: ".env.local", strict: false });

    expect(status).toBe("ok");
  });
});

describe("runCheck — contract loading", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should throw when no contract is found and contract path is not provided", async () => {
    loadContractMock.mockResolvedValue(undefined);
    parseEnvFileMock.mockReturnValue(makeParsed());

    await expect(runCheck({ input: ".env.local" })).rejects.toThrow(/No contract file found/);
  });

  it("should pass cwd to loadContract when no explicit contract path", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.local", cwd: "/custom/dir" });

    expect(loadContractMock).toHaveBeenCalledWith("/custom/dir");
  });

  it("should forward input path to parseEnvFile", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.production" });

    expect(parseEnvFileMock).toHaveBeenCalledWith(".env.production");
  });
});

describe("runCheck — JSON output", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should output compact JSON when json=true", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.local", json: true });

    const calls = logMock.mock.calls.map(([msg]) => String(msg));
    const jsonOutput = calls.find((msg) => msg.trim().startsWith("{"));
    expect(jsonOutput).toBeDefined();
    const parsed = JSON.parse(jsonOutput ?? "{}");
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.status).toBe("ok");
  });

  it("should output pretty-printed JSON when json=true and pretty=true", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.local", json: true, pretty: true });

    const calls = logMock.mock.calls.map(([msg]) => String(msg));
    const jsonOutput = calls.find((msg) => msg.trim().startsWith("{"));
    expect(jsonOutput).toBeDefined();
    expect(jsonOutput).toContain("\n");
  });

  it("should not output JSON when json is not set", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.local" });

    const calls = logMock.mock.calls.map(([msg]) => String(msg));
    const jsonOutput = calls.find((msg) => msg.trim().startsWith("{"));
    expect(jsonOutput).toBeUndefined();
  });

  it("should include meta.env in JSON output", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.staging", json: true });

    const calls = logMock.mock.calls.map(([msg]) => String(msg));
    const jsonOutput = calls.find((msg) => msg.trim().startsWith("{"));
    const parsed = JSON.parse(jsonOutput ?? "{}");
    expect(parsed.meta.env).toBe(".env.staging");
  });
});

describe("runCheck — environment option", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should propagate environment to issues in the report", async () => {
    loadContractMock.mockResolvedValue(
      makeContract([{ name: "DATABASE_URL", expectedType: "url", required: true }]),
    );
    parseEnvFileMock.mockReturnValue(makeParsed([]));

    await runCheck({ input: ".env.local", environment: "production", json: true });

    const calls = logMock.mock.calls.map(([msg]) => String(msg));
    const jsonOutput = calls.find((msg) => msg.trim().startsWith("{"));
    const report = JSON.parse(jsonOutput ?? "{}");
    expect(report.issues?.[0]?.environment).toBe("production");
  });
});

describe("runCheck — strict option", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should treat extra vars as errors by default (strict defaults to true)", async () => {
    loadContractMock.mockResolvedValue(makeContract([]));
    parseEnvFileMock.mockReturnValue(makeParsed([makeVar({ key: "EXTRA_VAR" })]));

    const status = await runCheck({ input: ".env.local" });

    expect(status).toBe("fail");
  });

  it("should treat extra vars as warnings when strict=false", async () => {
    loadContractMock.mockResolvedValue(makeContract([]));
    parseEnvFileMock.mockReturnValue(makeParsed([makeVar({ key: "EXTRA_VAR" })]));

    const status = await runCheck({ input: ".env.local", strict: false });

    expect(status).toBe("ok");
  });
});

describe("runCheck — human-readable output", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should call success with a no-issues message when no issues found", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.local" });

    expect(successMock).toHaveBeenCalledWith(expect.stringContaining("No issues"));
  });

  it("should call error for error-severity issues in human-readable mode", async () => {
    loadContractMock.mockResolvedValue(
      makeContract([{ name: "DATABASE_URL", expectedType: "url", required: true }]),
    );
    parseEnvFileMock.mockReturnValue(makeParsed([]));

    await runCheck({ input: ".env.local" });

    expect(errorMock).toHaveBeenCalled();
  });

  it("should suppress output when silent=true", async () => {
    loadContractMock.mockResolvedValue(makeContract());
    parseEnvFileMock.mockReturnValue(makeParsed());

    await runCheck({ input: ".env.local", silent: true });

    expect(successMock).not.toHaveBeenCalled();
    expect(logMock).not.toHaveBeenCalled();
  });
});
