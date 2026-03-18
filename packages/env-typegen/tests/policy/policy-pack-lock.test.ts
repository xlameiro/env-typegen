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
});
