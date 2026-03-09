import { requireAuth } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <main
      id="maincontent"
      className="mx-auto max-w-3xl px-6 py-20"
      tabIndex={-1}
    >
      <header className="mb-8">
        <p className="mb-1 text-sm font-medium tracking-widest text-zinc-400 uppercase">
          Dashboard
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back
          {session.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This is your dashboard. Build it out to suit your application.
        </p>
      </header>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Dashboard content goes here.
        </p>
      </div>
    </main>
  );
}
