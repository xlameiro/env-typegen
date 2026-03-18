import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadExternalTrustRoot } from "../../src/trust/external-trust-root.js";

const trustFixtureDirectory = path.resolve("tests/fixtures/trust");

describe("external trust root", () => {
  it("should load a provider-scoped keyring from configured path", async () => {
    const keyring = await loadExternalTrustRoot({
      provider: "aws-kms",
      keyringPath: path.join(trustFixtureDirectory, "public-keyring.valid.json"),
    });

    expect(keyring?.version).toBe(1);
    expect(keyring?.keys[0]?.provider).toBe("aws-kms");
  });

  it("should return undefined when no keyring path is configured", async () => {
    const keyring = await loadExternalTrustRoot({
      provider: "external",
    });

    expect(keyring).toBeUndefined();
  });
});
