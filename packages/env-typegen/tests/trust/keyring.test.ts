import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  lookupKeyringEntry,
  mergePolicyPackKeyrings,
  parsePolicyPackKeyring,
} from "../../src/trust/keyring.js";

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

  it("should reject malformed keyring roots", () => {
    expect(() => parsePolicyPackKeyring("[]", "invalid.json")).toThrowError(
      /root must be an object/u,
    );
  });

  it("should reject malformed JSON keyrings", () => {
    expect(() => parsePolicyPackKeyring("{invalid", "broken.json")).toThrowError(
      /Failed to parse keyring/u,
    );
  });

  it("should reject unsupported keyring versions", () => {
    const raw = JSON.stringify({
      version: 2,
      keys: [],
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-version.json")).toThrowError(
      /version must be 1/u,
    );
  });

  it("should reject keyring files where keys is not an array", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: {},
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-keys.json")).toThrowError(
      /keys must be an array/u,
    );
  });

  it("should reject non-object key entries", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: [null],
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-entry.json")).toThrowError(
      /must be an object/u,
    );
  });

  it("should reject keys with missing keyId", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: [
        {
          signer: "governance-bot",
          provider: "aws-kms",
          algorithm: "rsa-sha256",
          publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----",
          status: "active",
        },
      ],
    });

    expect(() => parsePolicyPackKeyring(raw, "missing-key-id.json")).toThrowError(/keyId/u);
  });

  it("should reject keys with empty signer values", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: [
        {
          keyId: "aws-kms://env-typegen/governance/v1",
          signer: "   ",
          provider: "aws-kms",
          algorithm: "rsa-sha256",
          publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----",
          status: "active",
        },
      ],
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-signer.json")).toThrowError(/signer/u);
  });

  it("should reject keys with unsupported providers", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: [
        {
          keyId: "aws-kms://env-typegen/governance/v1",
          signer: "governance-bot",
          provider: "azure-kms",
          algorithm: "rsa-sha256",
          publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----",
          status: "active",
        },
      ],
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-provider.json")).toThrowError(/provider/u);
  });

  it("should reject keys with unsupported algorithms", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: [
        {
          keyId: "aws-kms://env-typegen/governance/v1",
          signer: "governance-bot",
          provider: "aws-kms",
          algorithm: "ed25519",
          publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----",
          status: "active",
        },
      ],
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-algorithm.json")).toThrowError(/algorithm/u);
  });

  it("should reject malformed public keys", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: [
        {
          keyId: "aws-kms://env-typegen/governance/v1",
          signer: "governance-bot",
          provider: "aws-kms",
          algorithm: "rsa-sha256",
          publicKeyPem: "invalid",
          status: "active",
        },
      ],
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-key.json")).toThrowError(/publicKeyPem/u);
  });

  it("should reject keys with unsupported status values", () => {
    const raw = JSON.stringify({
      version: 1,
      keys: [
        {
          keyId: "aws-kms://env-typegen/governance/v1",
          signer: "governance-bot",
          provider: "aws-kms",
          algorithm: "rsa-sha256",
          publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----",
          status: "inactive",
        },
      ],
    });

    expect(() => parsePolicyPackKeyring(raw, "invalid-status.json")).toThrowError(/status/u);
  });

  it("should return not-found when key does not exist", () => {
    const raw = readFileSync(path.join(trustFixtureDirectory, "public-keyring.valid.json"), "utf8");
    const keyring = parsePolicyPackKeyring(raw, "public-keyring.valid.json");

    const lookup = lookupKeyringEntry({
      keyring,
      keyId: "aws-kms://env-typegen/governance/missing",
      signer: "governance-bot",
    });

    expect(lookup.found).toBe(false);
    if (lookup.found) {
      throw new Error("Expected lookup to fail for missing key.");
    }

    expect(lookup.reason).toContain("not found");
  });

  it("should reject signer mismatches", () => {
    const raw = readFileSync(path.join(trustFixtureDirectory, "public-keyring.valid.json"), "utf8");
    const keyring = parsePolicyPackKeyring(raw, "public-keyring.valid.json");

    const lookup = lookupKeyringEntry({
      keyring,
      keyId: "aws-kms://env-typegen/governance/v1",
      signer: "unexpected-signer",
    });

    expect(lookup.found).toBe(false);
    if (lookup.found) {
      throw new Error("Expected lookup to fail for signer mismatch.");
    }

    expect(lookup.reason).toContain("signer mismatch");
  });

  it("should prioritize primary keys when merging keyrings", () => {
    const primary = parsePolicyPackKeyring(
      JSON.stringify({
        version: 1,
        keys: [
          {
            keyId: "aws-kms://env-typegen/governance/v1",
            signer: "primary-signer",
            provider: "aws-kms",
            algorithm: "rsa-sha256",
            publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----",
            status: "active",
          },
        ],
      }),
      "primary.json",
    );

    const secondary = parsePolicyPackKeyring(
      JSON.stringify({
        version: 1,
        keys: [
          {
            keyId: "aws-kms://env-typegen/governance/v1",
            signer: "secondary-signer",
            provider: "aws-kms",
            algorithm: "rsa-sha256",
            publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nsecondary\\n-----END PUBLIC KEY-----",
            status: "active",
          },
          {
            keyId: "aws-kms://env-typegen/governance/v2",
            signer: "secondary-unique",
            provider: "aws-kms",
            algorithm: "rsa-sha256",
            publicKeyPem: "-----BEGIN PUBLIC KEY-----\\nunique\\n-----END PUBLIC KEY-----",
            status: "active",
          },
        ],
      }),
      "secondary.json",
    );

    const merged = mergePolicyPackKeyrings({ primary, secondary });
    const mergedById = new Map(merged.keys.map((entry) => [entry.keyId, entry]));

    expect(mergedById.get("aws-kms://env-typegen/governance/v1")?.signer).toBe("primary-signer");
    expect(mergedById.get("aws-kms://env-typegen/governance/v2")?.signer).toBe("secondary-unique");
  });
});
