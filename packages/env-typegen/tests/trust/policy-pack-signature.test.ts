import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validatePolicyPackSignature } from "../../src/trust/policy-pack-signature.js";

const trustFixtureDirectory = path.resolve("tests/fixtures/trust");

describe("validatePolicyPackSignature", () => {
  it("should validate a signed pack in strict mode", async () => {
    const content = '{"id":"pack","version":1,"layer":"base","policy":{}}';
    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content,
      trust: {
        signer: "governance-bot",
        signatureChecksum: "7ae19929cb6cc1de8f72cc112d8b000d46802b2b853772f42da816d11d8a2fb8",
        issuedAt: "2026-03-18T10:00:00.000Z",
      },
      lockProvenance: {
        expectedSigner: "governance-bot",
      },
      config: {
        mode: "strict",
        allowedSigners: ["governance-bot"],
      },
    });

    expect(validation.isValid).toBe(true);
    expect(validation.reasons).toEqual([]);
    expect(validation.enforcement).toBe("shadow");
  });

  it("should reject missing trust metadata in strict mode", async () => {
    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content: '{"id":"pack"}',
      trust: undefined,
      lockProvenance: undefined,
      config: {
        mode: "strict",
      },
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("missing trust signature");
  });

  it("should tolerate missing trust metadata in tolerant mode", async () => {
    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content: '{"id":"pack"}',
      trust: undefined,
      lockProvenance: undefined,
      config: {
        mode: "tolerant",
      },
    });

    expect(validation.isValid).toBe(true);
  });

  it("should reject expired signatures when enforceExpiry is enabled", async () => {
    const content = '{"id":"pack","version":1,"layer":"base","policy":{}}';
    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content,
      trust: {
        signer: "governance-bot",
        signatureChecksum: "7ae19929cb6cc1de8f72cc112d8b000d46802b2b853772f42da816d11d8a2fb8",
        issuedAt: "2026-03-18T10:00:00.000Z",
        expiresAt: "2026-03-18T10:00:01.000Z",
      },
      lockProvenance: undefined,
      config: {
        mode: "strict",
        enforceExpiry: true,
      },
      now: new Date("2026-03-18T10:05:00.000Z"),
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("expired");
  });

  it("should reject lock provenance signer mismatch", async () => {
    const content = '{"id":"pack","version":1,"layer":"base","policy":{}}';
    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content,
      trust: {
        signer: "governance-bot",
        signatureChecksum: "7ae19929cb6cc1de8f72cc112d8b000d46802b2b853772f42da816d11d8a2fb8",
        issuedAt: "2026-03-18T10:00:00.000Z",
      },
      lockProvenance: {
        expectedSigner: "release-bot",
      },
      config: {
        mode: "strict",
      },
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("Lock provenance signer mismatch");
  });

  it("should reject fixture trust envelope when checksum does not match content", async () => {
    const content = '{"id":"pack","version":1,"layer":"base","policy":{}}';
    const raw = readFileSync(
      path.join(trustFixtureDirectory, "policy-pack-signature-valid.json"),
      "utf8",
    );
    const fixture = JSON.parse(raw) as {
      signer: string;
      signatureChecksum: string;
      issuedAt: string;
      expiresAt?: string;
    };

    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content,
      trust: fixture,
      lockProvenance: {
        expectedSigner: fixture.signer,
      },
      config: {
        mode: "strict",
        allowedSigners: [fixture.signer],
        enforceExpiry: true,
      },
      now: new Date("2026-03-18T10:00:00.000Z"),
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.join(" ")).toContain("checksum mismatch");
  });

  it("should reject invalid fixture trust envelope in strict mode", async () => {
    const content = '{"id":"pack","version":1,"layer":"base","policy":{}}';
    const raw = readFileSync(
      path.join(trustFixtureDirectory, "policy-pack-signature-invalid.json"),
      "utf8",
    );
    const fixture = JSON.parse(raw) as {
      signer: string;
      signatureChecksum: string;
      issuedAt: string;
      expiresAt?: string;
    };

    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content,
      trust: fixture,
      lockProvenance: {
        expectedSigner: "governance-bot",
      },
      config: {
        mode: "strict",
        allowedSigners: ["governance-bot"],
        enforceExpiry: true,
      },
      now: new Date("2026-03-18T10:00:00.000Z"),
    });

    expect(validation.isValid).toBe(false);
    expect(validation.reasons.length).toBeGreaterThan(0);
  });

  it("should allow strict mode to run in enforce mode when explicitly configured", async () => {
    const content = '{"id":"pack","version":1,"layer":"base","policy":{}}';
    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content,
      trust: {
        signer: "governance-bot",
        signatureChecksum: "7ae19929cb6cc1de8f72cc112d8b000d46802b2b853772f42da816d11d8a2fb8",
        issuedAt: "2026-03-18T10:00:00.000Z",
      },
      lockProvenance: undefined,
      config: {
        mode: "strict",
        enforcement: "enforce",
      },
    });

    expect(validation.enforcement).toBe("enforce");
  });

  it("should resolve keyring from external trust root config", async () => {
    const content = '{"id":"pack","version":1,"layer":"base","policy":{}}';
    const validation = await validatePolicyPackSignature({
      source: "./pack.json",
      content,
      trust: {
        signer: "governance-bot",
        algorithm: "rsa-sha256",
        keyId: "aws-kms://env-typegen/governance/v1",
        signature: "invalid-signature",
        issuedAt: "2026-03-18T10:00:00.000Z",
      },
      lockProvenance: undefined,
      config: {
        mode: "strict",
        externalTrustRoot: {
          provider: "aws-kms",
          keyringPath: path.join(trustFixtureDirectory, "public-keyring.valid.json"),
        },
      },
    });

    expect(validation.verifiedWith).toBe("rsa-signature");
    expect(validation.reasons.join(" ")).toContain("RSA signature validation failed");
  });
});
