import { describe, expect, it } from "vitest";
import { getStats } from "./stats";

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
