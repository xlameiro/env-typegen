import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyPolicyPackTrustEnvelope } from "../../src/trust/crypto-verifier.js";
import type { PolicyPackKeyring } from "../../src/trust/keyring.js";

type CanonicalValue =
  | null
  | string
  | number
  | boolean
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function toCanonicalValue(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) {
    return value.map((entry) => toCanonicalValue(entry));
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, nested]) => [key, toCanonicalValue(nested)]));
  }

  return value;
}

function createSignedPackFixture(): {
  content: string;
  signature: string;
  keyring: PolicyPackKeyring;
} {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const content = JSON.stringify({
    id: "pack",
    version: 1,
    layer: "base",
    policy: { mode: "read-only" },
  });

  const signer = createSign("RSA-SHA256");
  signer.update(JSON.stringify(toCanonicalValue(JSON.parse(content) as CanonicalValue)), "utf8");
  signer.end();
  const signature = signer.sign(privateKey).toString("base64");

  return {
    content,
    signature,
    keyring: {
      version: 1,
      keys: [
        {
          keyId: "aws-kms://env-typegen/governance/v1",
          signer: "governance-bot",
          provider: "aws-kms",
          algorithm: "rsa-sha256",
          publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
          status: "active",
          fingerprint: "sha256:generated",
        },
      ],
    },
  };
}

describe("verifyPolicyPackTrustEnvelope", () => {
  it("should verify RSA signatures against external keyring", () => {
    const fixture = createSignedPackFixture();
    const result = verifyPolicyPackTrustEnvelope({
      trust: {
        signer: "governance-bot",
        algorithm: "rsa-sha256",
        keyId: "aws-kms://env-typegen/governance/v1",
        signature: fixture.signature,
        issuedAt: "2026-03-18T10:00:00.000Z",
      },
      content: fixture.content,
      keyring: fixture.keyring,
    });

    expect(result.isValid).toBe(true);
    expect(result.verifiedWith).toBe("rsa-signature");
  });

  it("should reject RSA signature when key is revoked", () => {
    const fixture = createSignedPackFixture();
    const result = verifyPolicyPackTrustEnvelope({
      trust: {
        signer: "governance-bot",
        algorithm: "rsa-sha256",
        keyId: "aws-kms://env-typegen/governance/v1",
        signature: fixture.signature,
        issuedAt: "2026-03-18T10:00:00.000Z",
      },
      content: fixture.content,
      keyring: {
        ...fixture.keyring,
        keys: fixture.keyring.keys.map((entry) => ({
          ...entry,
          status: "revoked" as const,
        })),
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.reasons.join(" ")).toContain("revoked");
  });

  it("should keep legacy checksum compatibility", () => {
    const content = JSON.stringify({
      id: "pack",
      version: 1,
      layer: "base",
      policy: {},
    });

    const result = verifyPolicyPackTrustEnvelope({
      trust: {
        signer: "legacy-bot",
        signatureChecksum: "7ae19929cb6cc1de8f72cc112d8b000d46802b2b853772f42da816d11d8a2fb8",
        issuedAt: "2026-03-18T10:00:00.000Z",
      },
      content,
    });

    expect(result.isValid).toBe(true);
    expect(result.verifiedWith).toBe("legacy-checksum");
  });
});
