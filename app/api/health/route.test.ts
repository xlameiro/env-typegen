import { describe, expect, it } from "vitest";
import { GET } from "./route";
import type { HealthResponse } from "./route";

describe("GET /api/health", () => {
  it("should return HTTP 200", () => {
    const response = GET();
    expect(response.status).toBe(200);
  });

  it("should return status ok", async () => {
    const response = GET();
    const body = (await response.json()) as HealthResponse;
    expect(body.status).toBe("ok");
  });

  it("should return a valid ISO 8601 timestamp", async () => {
    const response = GET();
    const body = (await response.json()) as HealthResponse;
    expect(typeof body.timestamp).toBe("string");
    // Temporal.Now.instant().toString() has nanosecond precision — new Date().toISOString()
    // only preserves milliseconds so a round-trip comparison would always fail.
    // Validate with ISO 8601 regex instead.
    expect(body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    );
  });
});
