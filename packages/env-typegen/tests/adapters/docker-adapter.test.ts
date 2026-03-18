import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import dockerAdapter from "../../src/adapters/docker-adapter.js";
import { evaluateAdapterContract } from "../../src/adapters/testkit.js";

async function createTempDir(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

const currentFilePath = fileURLToPath(import.meta.url);
const fixturesDirectory = path.resolve(path.dirname(currentFilePath), "../fixtures/docker");

async function copyDockerFixtures(targetDirectory: string): Promise<void> {
  await cp(fixturesDirectory, targetDirectory, { recursive: true });
}

describe("docker adapter", () => {
  it("should read values from chained compose env_file and environment blocks with precedence", async () => {
    const dir = await createTempDir("env-typegen-docker-adapter-");
    await copyDockerFixtures(dir);

    const composeFile = path.join(dir, "compose-complex.yml");
    const baseFile = path.join(dir, "base.env");

    const result = await dockerAdapter.pull({
      environment: "development",
      providerConfig: {
        envFile: baseFile,
        composeFile,
      },
    });

    expect(result.values).toMatchObject({
      DB_HOST: "localhost",
      DB_PORT: "7000",
      COMMON: "compose",
      APP_ENV: "development",
      FEATURE_FLAG: "true",
      INLINE_TOKEN: "abc123",
    });
  });

  it("should report missing files as warnings", async () => {
    const result = await dockerAdapter.pull({
      environment: "development",
      providerConfig: {
        envFile: "/tmp/non-existent.env",
        composeFile: "/tmp/non-existent-docker-compose.yml",
      },
    });

    expect(result.values).toEqual({});
    expect(result.warnings?.length).toBe(2);
  });

  it("should compare local and remote values", async () => {
    const compare = dockerAdapter.compare;
    if (compare === undefined) {
      throw new Error("compare should be defined for docker adapter");
    }

    const result = await compare(
      { environment: "development" },
      { A: "1", B: "2" },
      { B: "2", C: "3" },
    );

    expect(result.missingInRemote).toEqual(["A"]);
    expect(result.extraInRemote).toEqual(["C"]);
    expect(result.mismatches).toEqual([]);
  });

  it("should satisfy the adapter contract", async () => {
    const dir = await createTempDir("env-typegen-docker-contract-");
    await copyDockerFixtures(dir);

    const contract = await evaluateAdapterContract(dockerAdapter, {
      context: {
        environment: "development",
        providerConfig: {
          envFile: [path.join(dir, "base.env")],
          composeFile: path.join(dir, "compose-complex.yml"),
        },
      },
      localValues: {
        DB_HOST: "localhost",
        DB_PORT: "7000",
      },
    });

    expect(contract.errors).toEqual([]);
    expect(contract.hasPull).toBe(true);
    expect(contract.hasCompare).toBe(true);
    expect(contract.pullValuesAreObject).toBe(true);
    expect(contract.compareShapeIsValid).toBe(true);
  });
});
