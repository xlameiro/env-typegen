import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { ROUTES } from "@/lib/constants";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes without conflicts.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

/**
 * Format a date to a locale string.
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}

/**
 * Format a number as currency.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

/**
 * Delay execution for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitise a redirect path to prevent open redirect attacks (OWASP A01).
 * Only accepts relative paths that start with "/" (not "//").
 * Returns the dashboard route as the safe fallback.
 */
export function sanitizeReturnTo(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) {
    return ROUTES.dashboard;
  }
  return url;
}
