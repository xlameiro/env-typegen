/**
 * Canonical date/time utilities for this template.
 *
 * Conventions
 * -----------
 * • Use `DateInput` as the type for any parameter that accepts a date value.
 * • All functions accept `DateInput` and return immutable values — nothing mutates.
 * • Parsing is centralised in `parseToInstant`; every other function calls it first.
 * • Formatting delegates to the native `Intl` APIs — zero extra bundle cost.
 * • Default locale is taken from `APP_LOCALE` in `lib/constants.ts` — never hardcoded.
 *
 * Migration path
 * --------------
 * Temporal is a TC39 Stage 3 proposal. When native support lands in Node LTS
 * (expected ~2026/2027), this import line is the ONLY change needed:
 *
 *   Before: import { Temporal } from 'temporal-polyfill'
 *   After:  (remove — Temporal becomes a global)
 *
 * All call sites remain identical.
 */

import { APP_LOCALE } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { Temporal } from "temporal-polyfill";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

/**
 * Any value that represents a point in time.
 * Pass this type to any function that accepts a date in this module.
 */
export type DateInput =
  | Date
  | string
  | number
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime;

// ──────────────────────────────────────────
// Core: parsing
// ──────────────────────────────────────────

/**
 * Normalize any `DateInput` into a `Temporal.Instant`.
 *
 * All other utilities in this module call `parseToInstant` internally, so you
 * only need to call it directly when you need the raw `Temporal.Instant` value.
 *
 * @throws {AppError} when a string cannot be parsed as ISO 8601
 */
export function parseToInstant(input: DateInput): Temporal.Instant {
  if (input instanceof Temporal.Instant) {
    return input;
  }
  if (input instanceof Temporal.ZonedDateTime) {
    return input.toInstant();
  }
  if (input instanceof Temporal.PlainDateTime) {
    return input.toZonedDateTime("UTC").toInstant();
  }
  if (input instanceof Temporal.PlainDate) {
    return input
      .toZonedDateTime({
        timeZone: "UTC",
        plainTime: Temporal.PlainTime.from("00:00"),
      })
      .toInstant();
  }
  if (input instanceof Date) {
    return Temporal.Instant.fromEpochMilliseconds(input.getTime());
  }
  if (typeof input === "number") {
    return Temporal.Instant.fromEpochMilliseconds(input);
  }
  // string — try ISO 8601 with timezone offset first (e.g. "2024-01-01T00:00:00Z").
  // Fall back to plain date (YYYY-MM-DD) and plain datetime (YYYY-MM-DDTHH:mm:ss),
  // both treated as UTC midnight / UTC-time. This preserves backward compatibility
  // with the common pattern of passing date strings like "2024-01-01".
  try {
    return Temporal.Instant.from(input);
  } catch {
    // not a full Instant string — try plain date
  }
  try {
    const pd = Temporal.PlainDate.from(input);
    return pd
      .toZonedDateTime({
        timeZone: "UTC",
        plainTime: Temporal.PlainTime.from("00:00"),
      })
      .toInstant();
  } catch {
    // not a plain date — try plain datetime (no offset)
  }
  try {
    const pdt = Temporal.PlainDateTime.from(input);
    return pdt.toZonedDateTime("UTC").toInstant();
  } catch {
    throw new AppError(
      `Invalid date string: "${input}". Expected ISO 8601 (e.g. "2024-01-01T00:00:00Z", "2024-01-01T14:00:00", or "2024-01-01").`,
      "INVALID_DATE",
      400,
    );
  }
}

// ──────────────────────────────────────────
// Formatting
// ──────────────────────────────────────────

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const DEFAULT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
};

/** Shared formatting core used by `formatDate` and `formatDateTime`. */
function applyIntlFormat(
  input: DateInput,
  options: Intl.DateTimeFormatOptions,
  locale: string,
): string {
  const instant = parseToInstant(input);
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: options.timeZone ?? "UTC",
  }).format(new Date(Number(instant.epochMilliseconds)));
}

/**
 * Format a date value to a human-readable date string.
 *
 * @example
 * formatDate(new Date('2024-06-15T12:00:00Z')) // "June 15, 2024"
 * formatDate('2024-06-15T00:00:00Z', { month: 'short' }, 'de-DE') // "15. Juni 2024"
 */
export function formatDate(
  input: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
  locale: string = APP_LOCALE,
): string {
  return applyIntlFormat(input, options, locale);
}

/**
 * Format a date value to a human-readable date+time string.
 * Adds hour, minute, and second fields to the default output.
 *
 * @example
 * formatDateTime(new Date('2024-06-15T14:30:00Z')) // "June 15, 2024 at 2:30:00 PM"
 */
export function formatDateTime(
  input: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_TIME_OPTIONS,
  locale: string = APP_LOCALE,
): string {
  return applyIntlFormat(input, { ...options }, locale);
}

// ──────────────────────────────────────────
// Relative formatting
// ──────────────────────────────────────────

type RelativeUnit =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "year";

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

function pickRelativeUnit(diffMs: number): [RelativeUnit, number] {
  const abs = Math.abs(diffMs);
  if (abs < 45 * SECOND_MS) return ["second", Math.round(diffMs / SECOND_MS)];
  if (abs < 45 * MINUTE_MS) return ["minute", Math.round(diffMs / MINUTE_MS)];
  if (abs < 22 * HOUR_MS) return ["hour", Math.round(diffMs / HOUR_MS)];
  if (abs < 6 * DAY_MS) return ["day", Math.round(diffMs / DAY_MS)];
  if (abs < 10 * WEEK_MS) return ["week", Math.round(diffMs / WEEK_MS)];
  if (abs < 18 * MONTH_MS) return ["month", Math.round(diffMs / MONTH_MS)];
  return ["year", Math.round(diffMs / YEAR_MS)];
}

/**
 * Format a date relative to a base date (defaults to now).
 *
 * @example
 * formatRelative(twoHoursAgo)        // "2 hours ago"
 * formatRelative(inThreeDays)        // "in 3 days"
 * formatRelative(date, base, 'de')   // "vor 2 Stunden"
 */
export function formatRelative(
  input: DateInput,
  base: DateInput = new Date(),
  locale: string = APP_LOCALE,
): string {
  const inputMs = Number(parseToInstant(input).epochMilliseconds);
  const baseMs = Number(parseToInstant(base).epochMilliseconds);
  const diffMs = inputMs - baseMs;
  const [unit, value] = pickRelativeUnit(diffMs);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    value,
    unit,
  );
}

// ──────────────────────────────────────────
// Predicates
// ──────────────────────────────────────────

/**
 * Returns `true` when the input date is in the past relative to now.
 *
 * Useful for checking token/session/cache expiry.
 */
export function isExpired(input: DateInput): boolean {
  const inputMs = Number(parseToInstant(input).epochMilliseconds);
  return inputMs < Date.now();
}

/**
 * Returns `true` when the input date is in the future relative to now.
 */
export function isFuture(input: DateInput): boolean {
  const inputMs = Number(parseToInstant(input).epochMilliseconds);
  return inputMs > Date.now();
}

// ──────────────────────────────────────────
// Serialisation
// ──────────────────────────────────────────

/**
 * Always returns a UTC ISO 8601 string, regardless of the input type or timezone.
 *
 * Use this when storing dates in databases, APIs, or logs.
 *
 * @example
 * toISOString(new Date('2024-06-15T14:30:00+02:00')) // "2024-06-15T12:30:00Z"
 */
export function toISOString(input: DateInput): string {
  return parseToInstant(input).toString();
}

// ──────────────────────────────────────────
// Arithmetic
// ──────────────────────────────────────────

/**
 * Add a duration to a date, returning a new `Temporal.Instant`.
 *
 * The duration can be a `Temporal.Duration` instance or a plain object with
 * the same fields (e.g. `{ days: 7, hours: 4 }`).
 *
 * For durations containing months or years (which are calendar-dependent),
 * the calculation is performed in the UTC timezone.
 *
 * @example
 * addDuration(new Date(), { days: 7 })       // 7 days from now (Temporal.Instant)
 * addDuration(expiry, { hours: -1 })         // 1 hour before expiry
 */
export function addDuration(
  input: DateInput,
  duration: Temporal.Duration | Temporal.DurationLike,
): Temporal.Instant {
  const instant = parseToInstant(input);
  const dur =
    duration instanceof Temporal.Duration
      ? duration
      : Temporal.Duration.from(duration);
  // Perform calendar-aware arithmetic in UTC
  return instant.toZonedDateTimeISO("UTC").add(dur).toInstant();
}

/**
 * Returns the number of whole days between two dates.
 *
 * Positive when `to` is later than `from`, negative when earlier, 0 when same day.
 *
 * @example
 * differenceInDays(new Date('2024-01-01'), new Date('2024-01-10')) // 9
 * differenceInDays(new Date('2024-01-10'), new Date('2024-01-01')) // -9
 */
export function differenceInDays(from: DateInput, to: DateInput): number {
  const fromMs = Number(parseToInstant(from).epochMilliseconds);
  const toMs = Number(parseToInstant(to).epochMilliseconds);
  return Math.trunc((toMs - fromMs) / DAY_MS);
}
