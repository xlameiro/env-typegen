import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { lookupKeyringEntry, parsePolicyPackKeyring } from "../../src/trust/keyring.js";

const trustFixtureDirectory = path.resolve("tests/fixtures/trust");

describe("policy pack keyring", () => {
  it("should parse a valid keyring fixture", () => {
    const raw = readFileSync(path.join(trustFixtureDirectory, "public-keyring.valid.json"), "utf8");
    const keyring = parsePolicyPackKeyring(raw, "public-keyring.valid.json");

    expect(keyring.version).toBe(1);
    expect(keyring.keys[0]?.provider).toBe("aws-kms");
  });

  it("should resolve an active key", () => {
    const raw = readFileSync(path.join(trustFixtureDirectory, "public-keyring.valid.json"), "utf8");
    const keyring = parsePolicyPackKeyring(raw, "public-keyring.valid.json");

    const lookup = lookupKeyringEntry({
      keyring,
      keyId: "aws-kms://env-typegen/governance/v1",
      signer: "governance-bot",
    });

    expect(lookup.found).toBe(true);
  });

  it("should reject revoked keys", () => {
    const raw = readFileSync(
      path.join(trustFixtureDirectory, "public-keyring.revoked.json"),
      "utf8",
    );
    const keyring = parsePolicyPackKeyring(raw, "public-keyring.revoked.json");

    const lookup = lookupKeyringEntry({
      keyring,
      keyId: "aws-kms://env-typegen/governance/v1",
      signer: "governance-bot",
    });

    expect(lookup.found).toBe(false);
    if (lookup.found) {
      throw new Error("Expected revoked key to be rejected.");
    }

    expect(lookup.reason).toContain("revoked");
  });
});
