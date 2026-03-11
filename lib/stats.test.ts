import type * as UtilsModule from "@/lib/utils";
import { describe, expect, it, vi } from "vitest";
import { getStats } from "./stats";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const original = await importOriginal<typeof UtilsModule>();
  return { ...original, sleep: vi.fn().mockResolvedValue(undefined) };
});

describe("getStats", () => {
  it("should return an array of three stats", async () => {
    const stats = await getStats();
    expect(stats).toHaveLength(3);
  });

  it("should return stats with label, value, and description fields", async () => {
    const stats = await getStats();
    for (const stat of stats) {
      expect(stat).toHaveProperty("label");
      expect(stat).toHaveProperty("value");
      expect(stat).toHaveProperty("description");
      expect(typeof stat.label).toBe("string");
      expect(typeof stat.value).toBe("string");
      expect(typeof stat.description).toBe("string");
    }
  });

  it("should return non-empty string values for each stat", async () => {
    const stats = await getStats();
    for (const stat of stats) {
      expect(stat.label.length).toBeGreaterThan(0);
      expect(stat.value.length).toBeGreaterThan(0);
      expect(stat.description.length).toBeGreaterThan(0);
    }
  });
});
