import { APP_LOCALE, ROUTES } from "@/lib/constants";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes without conflicts.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Backward-compatible re-export. The implementation now lives in lib/dates.ts.
// Existing callers of `import { formatDate } from '@/lib/utils'` continue to work
// without any changes.
export { formatDate } from "@/lib/dates";

/**
 * Format a number as currency.
 */
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = APP_LOCALE,
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
 * Only accepts safe relative paths rooted at "/".
 * Returns the home route as the safe fallback.
 */
const RETURN_TO_DECODE_PASSES = 2;

function decodeReturnToValue(url: string): string | undefined {
  let decodedUrl = url;

  for (let index = 0; index < RETURN_TO_DECODE_PASSES; index++) {
    if (!/%[0-9A-Fa-f]{2}/.test(decodedUrl)) {
      break;
    }

    try {
      decodedUrl = decodeURIComponent(decodedUrl);
    } catch {
      // Invalid percent-encoding means the value is malformed and must be rejected.
      return undefined;
    }
  }

  return decodedUrl;
}

export function sanitizeReturnTo(url: string | undefined): string {
  const decodedUrl = decodeReturnToValue(url ?? "")?.trim();

  if (!decodedUrl) {
    return ROUTES.home;
  }

  if (!decodedUrl.startsWith("/") || decodedUrl.startsWith("//")) {
    return ROUTES.home;
  }

  if (decodedUrl.includes("\\")) {
    return ROUTES.home;
  }

  if (/[\u0000-\u001F\u007F]/.test(decodedUrl)) {
    return ROUTES.home;
  }

  return decodedUrl;
}
