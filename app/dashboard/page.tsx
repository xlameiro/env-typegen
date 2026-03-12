/**
 * @template-example
 * Example dashboard page — demonstrates streaming Server Components with Suspense,
 * and nuqs URL state. Replace with your own dashboard or delete if not needed.
 */
import { requireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSearch } from "./dashboard-search";
import { StatsSection, StatsSectionSkeleton } from "./stats-section";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // requireAuth() is fast (reads the session cookie) — no Suspense needed here.
  const session = await requireAuth();

  return (
    <main
      id="maincontent"
      className="mx-auto max-w-3xl px-6 py-20"
      tabIndex={-1}
    >
      <header className="mb-8">
        <p className="mb-1 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back
          {session.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is your dashboard. Build it out to suit your application.
        </p>
      </header>

      {/*
       * Streaming example: StatsSection is an async Server Component that fetches
       * its own data. The <Suspense> boundary lets the page shell render immediately
       * while the stats stream in. Without this boundary, the entire page would
       * block until getStats() resolves — same as classic SSR.
       */}
      <Suspense fallback={<StatsSectionSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* nuqs example: typed URL search params with <Suspense> boundary */}
      <DashboardSearch />
    </main>
  );
}
