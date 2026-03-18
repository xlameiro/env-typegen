import { describe, expect, it } from "vitest";

import {
  calculateRetryDelayMs,
  classifyRetryFailure,
  runWithRetry,
  shouldRetry,
} from "../../src/sync/retry-policy.js";

describe("retry-policy", () => {
  it("should classify common network failures as transient", () => {
    expect(classifyRetryFailure(new Error("HTTP 503 timeout"))).toBe("transient");
    expect(classifyRetryFailure(new Error("rate limit exceeded"))).toBe("transient");
  });

  it("should classify unknown failures as permanent", () => {
    expect(classifyRetryFailure(new Error("validation failed"))).toBe("permanent");
  });

  it("should compute bounded exponential retry delay", () => {
    expect(calculateRetryDelayMs({ attempt: 1, baseDelayMs: 10, maxDelayMs: 100 })).toBe(10);
    expect(calculateRetryDelayMs({ attempt: 2, baseDelayMs: 10, maxDelayMs: 100 })).toBe(20);
    expect(calculateRetryDelayMs({ attempt: 5, baseDelayMs: 10, maxDelayMs: 100 })).toBe(100);
  });

  it("should retry transient failures and eventually succeed", async () => {
    let attempts = 0;

    const result = await runWithRetry({
      policy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 },
      task: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("HTTP 503 timeout");
        }

        return "ok";
      },
    });

    expect(result.status).toBe("fulfilled");
    expect(result.attempts).toBe(3);
    expect(attempts).toBe(3);
  });

  it("should stop retrying permanent failures", async () => {
    let attempts = 0;

    const result = await runWithRetry({
      policy: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2 },
      task: async () => {
        attempts += 1;
        throw new Error("schema mismatch");
      },
    });

    expect(result.status).toBe("rejected");
    if (result.status === "rejected") {
      expect(result.failureKind).toBe("permanent");
      expect(result.attempts).toBe(1);
    }
    expect(shouldRetry({ failureKind: "permanent", attempt: 1, maxAttempts: 3 })).toBe(false);
    expect(attempts).toBe(1);
  });
});
