import {
  addDuration,
  differenceInDays,
  formatDate,
  formatDateTime,
  formatRelative,
  isExpired,
  isFuture,
  parseToInstant,
  toISOString,
} from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fixed "now" used throughout time-sensitive tests.
const FIXED_NOW = new Date("2024-06-15T12:00:00.000Z");
const FIXED_NOW_MS = FIXED_NOW.getTime();

describe("parseToInstant", () => {
  it("should accept a native Date", () => {
    const date = new Date("2024-01-15T00:00:00.000Z");
    const instant = parseToInstant(date);
    expect(Number(instant.epochMilliseconds)).toBe(date.getTime());
  });

  it("should accept a unix millisecond timestamp", () => {
    const ms = 1_700_000_000_000;
    const instant = parseToInstant(ms);
    expect(Number(instant.epochMilliseconds)).toBe(ms);
  });

  it("should accept an ISO 8601 string with Z offset", () => {
    const instant = parseToInstant("2024-06-15T12:00:00Z");
    expect(Number(instant.epochMilliseconds)).toBe(
      new Date("2024-06-15T12:00:00Z").getTime(),
    );
  });

  it("should accept an ISO 8601 string with numeric offset", () => {
    const instant = parseToInstant("2024-06-15T14:00:00+02:00");
    // +02:00 → UTC 12:00
    expect(Number(instant.epochMilliseconds)).toBe(
      new Date("2024-06-15T12:00:00Z").getTime(),
    );
  });

  it("should accept a Temporal.Instant and return it as-is", () => {
    const original = Temporal.Instant.from("2024-06-15T12:00:00Z");
    const result = parseToInstant(original);
    expect(result).toBe(original);
  });

  it("should accept a Temporal.ZonedDateTime", () => {
    const zdt = Temporal.ZonedDateTime.from(
      "2024-06-15T14:00:00+02:00[Europe/Paris]",
    );
    const instant = parseToInstant(zdt);
    expect(Number(instant.epochMilliseconds)).toBe(
      new Date("2024-06-15T12:00:00Z").getTime(),
    );
  });

  it("should accept a Temporal.PlainDateTime (treated as UTC)", () => {
    const pdt = Temporal.PlainDateTime.from("2024-06-15T12:00:00");
    const instant = parseToInstant(pdt);
    expect(Number(instant.epochMilliseconds)).toBe(
      new Date("2024-06-15T12:00:00Z").getTime(),
    );
  });

  it("should accept a Temporal.PlainDate (midnight UTC)", () => {
    const pd = Temporal.PlainDate.from("2024-06-15");
    const instant = parseToInstant(pd);
    expect(Number(instant.epochMilliseconds)).toBe(
      new Date("2024-06-15T00:00:00Z").getTime(),
    );
  });

  it("should throw AppError for an invalid date string", () => {
    expect(() => parseToInstant("not-a-date")).toThrow(AppError);
    // Verify the typed error code (not the message string)
    let caught: unknown;
    try {
      parseToInstant("not-a-date");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe("INVALID_DATE");
  });

  it("should accept a plain YYYY-MM-DD string as midnight UTC (backward compat)", () => {
    // Common form-input pattern — treated as PlainDate → midnight UTC
    const instant = parseToInstant("2024-01-01");
    expect(Number(instant.epochMilliseconds)).toBe(
      new Date("2024-01-01T00:00:00Z").getTime(),
    );
  });
});

describe("formatDate", () => {
  it("should format a Date object with default options", () => {
    const date = new Date("2024-06-15T00:00:00.000Z");
    const result = formatDate(
      date,
      { year: "numeric", month: "long", day: "numeric" },
      "en-US",
    );
    expect(result).toContain("2024");
    expect(result).toContain("15");
    expect(result).toContain("June");
  });

  it("should accept a date string", () => {
    const result = formatDate(
      "2024-01-01T00:00:00Z",
      { year: "numeric" },
      "en-US",
    );
    expect(result).toBe("2024");
  });

  it("should accept a numeric timestamp", () => {
    const timestamp = new Date("2024-03-07T00:00:00Z").getTime();
    const result = formatDate(timestamp, { year: "numeric" }, "en-US");
    expect(result).toBe("2024");
  });

  it("should respect a custom locale", () => {
    const date = new Date("2024-06-15T00:00:00.000Z");
    const result = formatDate(
      date,
      { year: "numeric", month: "long", day: "numeric" },
      "de-DE",
    );
    expect(result).toContain("2024");
    expect(result).toContain("15");
  });

  it("should accept a Temporal.PlainDate", () => {
    const pd = Temporal.PlainDate.from("2024-12-25");
    const result = formatDate(pd, { month: "long", day: "numeric" }, "en-US");
    expect(result).toContain("December");
    expect(result).toContain("25");
  });
});

describe("formatDateTime", () => {
  it("should include time components by default", () => {
    const date = new Date("2024-06-15T14:30:45.000Z");
    const result = formatDateTime(date, undefined, "en-US");
    expect(result).toContain("2024");
    expect(result).toContain("June");
    expect(result).toContain("15");
    // Time should be present — "14", "2", "30", "45" depending on locale format
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it("should allow overriding time options", () => {
    const date = new Date("2024-06-15T14:30:00.000Z");
    const result = formatDateTime(
      date,
      { hour: "2-digit", minute: "2-digit" },
      "en-US",
    );
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["just now (0s)", 0, "now"],
    ["30 seconds ago", -30_000, "seconds ago"],
    ["2 minutes ago", -(2 * 60_000), "minutes ago"],
    ["3 hours ago", -(3 * 60 * 60_000), "hours ago"],
    ["1 day ago", -(1 * 24 * 60 * 60_000), "yesterday"],
    ["5 days ago", -(5 * 24 * 60 * 60_000), "days ago"],
    ["3 weeks ago", -(21 * 24 * 60 * 60_000), "weeks ago"],
    ["4 months ago", -(120 * 24 * 60 * 60_000), "months ago"],
    ["2 years ago", -(730 * 24 * 60 * 60_000), "years ago"],
  ])("should format %s correctly", (_label, offsetMs, expectedFragment) => {
    const date = new Date(FIXED_NOW_MS + offsetMs);
    const result = formatRelative(date, FIXED_NOW, "en-US");
    expect(result).toContain(expectedFragment);
  });

  it("should format a future date as 'in X'", () => {
    const futureDate = new Date(FIXED_NOW_MS + 3 * 24 * 60 * 60_000);
    const result = formatRelative(futureDate, FIXED_NOW, "en-US");
    expect(result).toMatch(/in \d+ days?/);
  });

  it("should default base to now when omitted", () => {
    const twoHoursAgo = new Date(FIXED_NOW_MS - 2 * 60 * 60_000);
    const result = formatRelative(twoHoursAgo, undefined, "en-US");
    expect(result).toContain("hours ago");
  });
});

describe("isExpired", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return true for a date in the past", () => {
    const yesterday = new Date(FIXED_NOW_MS - 24 * 60 * 60_000);
    expect(isExpired(yesterday)).toBe(true);
  });

  it("should return false for a date in the future", () => {
    const tomorrow = new Date(FIXED_NOW_MS + 24 * 60 * 60_000);
    expect(isExpired(tomorrow)).toBe(false);
  });
});

describe("isFuture", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return true for a date in the future", () => {
    const tomorrow = new Date(FIXED_NOW_MS + 24 * 60 * 60_000);
    expect(isFuture(tomorrow)).toBe(true);
  });

  it("should return false for a date in the past", () => {
    const yesterday = new Date(FIXED_NOW_MS - 24 * 60 * 60_000);
    expect(isFuture(yesterday)).toBe(false);
  });
});

describe("toISOString", () => {
  it("should return a UTC ISO 8601 string for a Date", () => {
    const date = new Date("2024-06-15T12:00:00.000Z");
    expect(toISOString(date)).toBe("2024-06-15T12:00:00Z");
  });

  it("should convert a UTC+2 input to UTC", () => {
    // 14:00 +02:00 = 12:00 UTC
    const result = toISOString("2024-06-15T14:00:00+02:00");
    expect(result).toBe("2024-06-15T12:00:00Z");
  });

  it("should return the same value for a Temporal.Instant", () => {
    const instant = Temporal.Instant.from("2024-06-15T12:00:00Z");
    expect(toISOString(instant)).toBe("2024-06-15T12:00:00Z");
  });

  it("should treat a PlainDate as midnight UTC", () => {
    const pd = Temporal.PlainDate.from("2024-06-15");
    expect(toISOString(pd)).toBe("2024-06-15T00:00:00Z");
  });
});

describe("addDuration", () => {
  it("should add days to a Date", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const result = addDuration(date, { days: 7 });
    expect(Number(result.epochMilliseconds)).toBe(
      new Date("2024-01-08T00:00:00Z").getTime(),
    );
  });

  it("should add months", () => {
    const date = new Date("2024-01-31T00:00:00Z");
    const result = addDuration(date, { months: 1 });
    // Jan 31 + 1 month in UTC: Feb has 29 days in 2024 (leap year) → Feb 29
    const resultDate = new Date(Number(result.epochMilliseconds));
    expect(resultDate.getUTCMonth()).toBe(1); // February = 1
  });

  it("should subtract hours using negative duration", () => {
    const date = new Date("2024-06-15T12:00:00Z");
    const result = addDuration(date, { hours: -1 });
    expect(Number(result.epochMilliseconds)).toBe(
      new Date("2024-06-15T11:00:00Z").getTime(),
    );
  });

  it("should accept a Temporal.Duration object", () => {
    const date = new Date("2024-06-15T00:00:00Z");
    const dur = Temporal.Duration.from({ days: 3 });
    const result = addDuration(date, dur);
    expect(Number(result.epochMilliseconds)).toBe(
      new Date("2024-06-18T00:00:00Z").getTime(),
    );
  });
});

describe("differenceInDays", () => {
  it("should return positive days when 'to' is later", () => {
    expect(
      differenceInDays(
        new Date("2024-01-01T00:00:00Z"),
        new Date("2024-01-10T00:00:00Z"),
      ),
    ).toBe(9);
  });

  it("should return negative days when 'to' is earlier", () => {
    expect(
      differenceInDays(
        new Date("2024-01-10T00:00:00Z"),
        new Date("2024-01-01T00:00:00Z"),
      ),
    ).toBe(-9);
  });

  it("should return 0 for the same instant", () => {
    const date = new Date("2024-06-15T06:00:00Z");
    expect(differenceInDays(date, date)).toBe(0);
  });

  it("should truncate partial days", () => {
    expect(
      differenceInDays(
        new Date("2024-01-01T00:00:00Z"),
        new Date("2024-01-01T20:00:00Z"),
      ),
    ).toBe(0);
  });

  it("should handle a leap-year boundary correctly", () => {
    // 2024 is a leap year: Jan 1 → Mar 1 = 31 (Jan) + 29 (Feb) = 60 days
    expect(
      differenceInDays(
        new Date("2024-01-01T00:00:00Z"),
        new Date("2024-03-01T00:00:00Z"),
      ),
    ).toBe(60);
  });
});
