import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ANTI_FOUC_SCRIPT } from "./anti-fouc-script";

describe("ANTI_FOUC_SCRIPT", () => {
  it("should match the sha256 hash declared in proxy.ts CSP", () => {
    const proxyContent = readFileSync(join(process.cwd(), "proxy.ts"), "utf-8");
    const match = /'sha256-([A-Za-z0-9+/]+=*)'/.exec(proxyContent);

    expect(
      match,
      "No sha256-* hash found in proxy.ts script-src — did you remove the anti-FOUC hash?",
    ).toBeTruthy();

    const expectedHash = match?.[1];
    const actualHash = createHash("sha256")
      .update(ANTI_FOUC_SCRIPT)
      .digest("base64");

    expect(
      actualHash,
      "CSP hash in proxy.ts is stale. Recompute after editing ANTI_FOUC_SCRIPT:\n  echo -n '<script>' | openssl dgst -sha256 -binary | base64",
    ).toBe(expectedHash);
  });
});
