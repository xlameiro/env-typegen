import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { PolicyPackKeyring } from "../../src/trust/keyring.js";
import { parsePolicyPackKeyring } from "../../src/trust/keyring.js";
import { resolveTrustRootKeyring } from "../../src/trust/trust-root-registry.js";

const trustFixtureDirectory = path.resolve("tests/fixtures/trust");

async function readFixtureKeyring(filename: string): Promise<PolicyPackKeyring> {
  const raw = await readFile(path.join(trustFixtureDirectory, filename), "utf8");
  return parsePolicyPackKeyring(raw, filename);
}

describe("trust-root-registry", () => {
  it("should return undefined when no trust roots are configured", async () => {
    const resolved = await resolveTrustRootKeyring({});
    expect(resolved).toBeUndefined();
  });

  it("should return local keyring when only local keyring is configured", async () => {
    const local = await readFixtureKeyring("public-keyring.valid.json");

    const resolved = await resolveTrustRootKeyring({ keyring: local });

    expect(resolved).toEqual(local);
  });

  it("should return external keyring when only external trust root is configured", async () => {
    const keyringPath = path.join(trustFixtureDirectory, "public-keyring.valid.json");

    const resolved = await resolveTrustRootKeyring({
      externalTrustRoot: {
        provider: "external",
        keyringPath,
      },
    });

    expect(resolved).toBeDefined();
    expect(resolved?.keys.length).toBeGreaterThan(0);
  });

  it("should merge local and external keyrings with local precedence", async () => {
    const external = await readFixtureKeyring("public-keyring.valid.json");
    const local: PolicyPackKeyring = {
      version: 1,
      keys: [
        {
          keyId: external.keys[0]?.keyId ?? "aws-kms://env-typegen/governance/v1",
          signer: "local-override",
          provider: "external",
          algorithm: "rsa-sha256",
          publicKeyPem:
            "-----BEGIN PUBLIC KEY-----\n" +
            "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAK0wq2L5Z5Q1H7wpiYt2U6QY9QjKx7mD\n" +
            "R8h4w2i2Pj8pD7xK4H6KJ1pQ1M8gYVwVv8y4hK8rR9h2fM6xY8mR8C8CAwEAAQ==\n" +
            "-----END PUBLIC KEY-----",
          status: "active",
        },
      ],
    };
    const externalPath = path.join(trustFixtureDirectory, "public-keyring.valid.json");

    const resolved = await resolveTrustRootKeyring({
      keyring: local,
      externalTrustRoot: {
        provider: "external",
        keyringPath: externalPath,
      },
    });

    expect(resolved).toBeDefined();
    expect(resolved?.keys.length).toBeGreaterThan(0);
    expect(resolved?.keys[0]?.signer).toBe("local-override");
  });
});
