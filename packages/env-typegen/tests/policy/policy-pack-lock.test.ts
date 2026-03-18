import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { computePolicyPackChecksum } from "../../src/policy/policy-pack.js";
import {
  parsePolicyPackLock,
  readPolicyPackLock,
  validatePolicyPackLockEntry,
} from "../../src/policy/policy-pack-lock.js";

describe("policy pack lock", () => {
  it("should parse a valid policy pack lock file", () => {
    const lock = parsePolicyPackLock(
      JSON.stringify({
        version: 1,
        entries: [
          {
            source: "./tests/fixtures/policy/packs/base-governance.policy.json",
            checksum: computePolicyPackChecksum("base"),
          },
        ],
      }),
      "policy-pack.lock.json",
    );

    expect(lock.version).toBe(1);
    expect(lock.entries).toHaveLength(1);
    expect(lock.entries[0]?.source).toBe(
      "./tests/fixtures/policy/packs/base-governance.policy.json",
    );
    expect(lock.entries[0]?.provenance).toBeUndefined();
  });

  it("should parse lock entry provenance when provided", () => {
    const lock = parsePolicyPackLock(
      JSON.stringify({
        version: 1,
        entries: [
          {
            source: "./packs/base.policy.json",
            checksum: computePolicyPackChecksum("base"),
            provenance: {
              expectedSigner: "governance-bot",
              expectedSignatureChecksum: computePolicyPackChecksum("signature"),
              expectedKeyId: "aws-kms://env-typegen/governance/v1",
              expectedFingerprint: "fingerprint",
              sourceType: "http",
            },
          },
        ],
      }),
      "policy-pack.lock.json",
    );

    expect(lock.entries[0]?.provenance?.expectedSigner).toBe("governance-bot");
    expect(lock.entries[0]?.provenance?.sourceType).toBe("http");
  });

  it("should read lock file from disk", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "env-typegen-lock-"));
    const lockPath = path.join(temporaryDirectory, "policy-pack.lock.json");

    await writeFile(
      lockPath,
      JSON.stringify({
        version: 1,
        entries: [{ source: "./base.policy.json", checksum: computePolicyPackChecksum("base") }],
      }),
      "utf8",
    );

    const lock = await readPolicyPackLock({
      lockFilePath: lockPath,
      cwd: temporaryDirectory,
    });

    expect(lock.version).toBe(1);
    expect(lock.entries).toHaveLength(1);
  });

  it("should reject remote lock file paths", async () => {
    await expect(
      readPolicyPackLock({
        lockFilePath: "https://example.com/policy-pack.lock.json",
        cwd: process.cwd(),
      }),
    ).rejects.toThrowError(/local file path/u);
  });

  it("should validate lock checksum for a referenced source", () => {
    const content = '{"id":"pack"}';
    const checksum = computePolicyPackChecksum(content);

    expect(() => {
      validatePolicyPackLockEntry({
        source: "./packs/base.policy.json",
        content,
        lock: {
          version: 1,
          entries: [{ source: "./packs/base.policy.json", checksum }],
        },
        cwd: process.cwd(),
        strict: true,
      });
    }).not.toThrow();
  });

  it("should block when lock entry is missing in strict mode", () => {
    expect(() => {
      validatePolicyPackLockEntry({
        source: "./packs/base.policy.json",
        content: "{}",
        lock: {
          version: 1,
          entries: [],
        },
        cwd: process.cwd(),
        strict: true,
      });
    }).toThrowError(/missing entry/u);
  });

  it("should allow missing lock entries in non-strict mode", () => {
    const result = validatePolicyPackLockEntry({
      source: "./packs/base.policy.json",
      content: "{}",
      lock: {
        version: 1,
        entries: [],
      },
      cwd: process.cwd(),
      strict: false,
    });

    expect(result).toBeUndefined();
  });

  it("should block when lock checksum mismatches", () => {
    expect(() => {
      validatePolicyPackLockEntry({
        source: "./packs/base.policy.json",
        content: '{"id":"changed"}',
        lock: {
          version: 1,
          entries: [
            {
              source: "./packs/base.policy.json",
              checksum: computePolicyPackChecksum('{"id":"old"}'),
            },
          ],
        },
        cwd: process.cwd(),
        strict: true,
      });
    }).toThrowError(/lock mismatch/u);
  });

  it("should reject malformed lock JSON content", () => {
    expect(() => parsePolicyPackLock("{", "policy-pack.lock.json")).toThrowError(
      /Failed to parse policy pack lock/u,
    );
  });

  it("should reject non-object lock roots", () => {
    expect(() => parsePolicyPackLock("[]", "policy-pack.lock.json")).toThrowError(
      /root must be an object/u,
    );
  });

  it("should reject non-integer lock version", () => {
    expect(() =>
      parsePolicyPackLock(
        JSON.stringify({
          version: 1.5,
          entries: [],
        }),
        "policy-pack.lock.json",
      ),
    ).toThrowError(/version/u);
  });

  it("should reject non-array entries", () => {
    expect(() =>
      parsePolicyPackLock(
        JSON.stringify({
          version: 1,
          entries: {},
        }),
        "policy-pack.lock.json",
      ),
    ).toThrowError(/entries/u);
  });

  it("should reject malformed entries", () => {
    expect(() =>
      parsePolicyPackLock(
        JSON.stringify({
          version: 1,
          entries: ["invalid"],
        }),
        "policy-pack.lock.json",
      ),
    ).toThrowError(/must be an object/u);
  });
});
