import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: (handler: (request: unknown) => unknown) => handler,
}));

import { getAuthRateLimitKey } from "./proxy";

describe("getAuthRateLimitKey", () => {
  it("should prioritize trusted provider IP headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.2",
      "x-vercel-ip": "203.0.113.10",
      "user-agent": "Mozilla/5.0",
    });

    expect(getAuthRateLimitKey(headers, "/auth/sign-in")).toBe(
      "auth-post:/auth/sign-in:ip:203.0.113.10",
    );
  });

  it("should include pathname in the generated key", () => {
    const headers = new Headers({
      "x-vercel-ip": "203.0.113.10",
    });

    expect(getAuthRateLimitKey(headers, "/auth/sign-up")).toBe(
      "auth-post:/auth/sign-up:ip:203.0.113.10",
    );
  });

  it("should ignore x-forwarded-for when trusted provider headers are absent", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.2",
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US",
      "sec-ch-ua": '"Chromium";v="122"',
      "sec-ch-ua-platform": '"macOS"',
    });
    const fingerprint = createHash("sha256")
      .update('Mozilla/5.0|en-US|"Chromium";v="122"|"macOS"')
      .digest("hex")
      .slice(0, 32);

    expect(getAuthRateLimitKey(headers, "/auth/sign-in")).toBe(
      `auth-post:/auth/sign-in:fp:${fingerprint}`,
    );
  });

  it("should use deterministic fingerprint fallback when no identifying header exists", () => {
    const fingerprint = createHash("sha256")
      .update("|||")
      .digest("hex")
      .slice(0, 32);

    expect(getAuthRateLimitKey(new Headers(), "/auth/sign-in")).toBe(
      `auth-post:/auth/sign-in:fp:${fingerprint}`,
    );
  });

  it("should ignore invalid IP values from forwarded headers", () => {
    const headers = new Headers({
      "x-vercel-ip": "not-an-ip",
      "x-forwarded-for": "still-not-an-ip",
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US",
      "sec-ch-ua": '"Chromium";v="122"',
      "sec-ch-ua-platform": '"macOS"',
    });
    const fingerprint = createHash("sha256")
      .update('Mozilla/5.0|en-US|"Chromium";v="122"|"macOS"')
      .digest("hex")
      .slice(0, 32);

    expect(getAuthRateLimitKey(headers, "/auth/sign-in")).toBe(
      `auth-post:/auth/sign-in:fp:${fingerprint}`,
    );
  });
});
