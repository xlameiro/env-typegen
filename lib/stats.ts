/**
 * @template-example
 * Fake stats data used by the example dashboard page.
 * Delete this file (and app/dashboard/) when building your real application.
 */
import "server-only";

import { sleep } from "@/lib/utils";
import { cacheLife, cacheTag } from "next/cache";

type Stat = {
  label: string;
  value: string;
  description: string;
};

/**
 * Fetch dashboard stats.
 *
 * Replace this stub with a real database query (e.g. from your ORM) when
 * building out the dashboard. The artificial delay demonstrates Next.js
 * streaming: the page shell renders immediately while this resolves.
 *
 * Because this runs in a Server Component, the delay is server-side only —
 * no extra client JS is shipped.
 */
export async function getStats(): Promise<Stat[]> {
  "use cache";
  // Cache for 1 hour; call revalidateTag('stats') after a mutation to invalidate.
  cacheLife("hours");
  cacheTag("stats");

  // Simulate a ~800ms database round-trip so streaming is visible in DevTools.
  // Remove or replace with `await db.query(...)` in a real application.
  await sleep(800);

  return [
    {
      label: "Total Users",
      value: "1,024",
      description: "Registered accounts",
    },
    {
      label: "Active Sessions",
      value: "48",
      description: "Currently online",
    },
    {
      label: "Requests Today",
      value: "3,291",
      description: "API calls in the last 24 h",
    },
  ];
}
