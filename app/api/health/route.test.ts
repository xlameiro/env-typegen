import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("should return HTTP 200", () => {
    const response = GET();
    expect(response.status).toBe(200);
  });

  it("should return status ok", async () => {
    const response = GET();
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  it("should return a valid ISO 8601 timestamp", async () => {
    const response = GET();
    const body = await response.json();
    expect(typeof body.timestamp).toBe("string");
    const parsed = new Date(body.timestamp);
    expect(parsed.toISOString()).toBe(body.timestamp);
  });
});
