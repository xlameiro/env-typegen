/**
 * @template-example
 * Example settings page — demonstrates theme toggling with Zustand.
 * Replace with your own settings page or delete if not needed.
 */
import { requireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import { ThemeToggle } from "./theme-toggle";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await requireAuth();

  return (
    <main
      id="maincontent"
      className="mx-auto max-w-3xl px-6 py-20"
      tabIndex={-1}
    >
      <header className="mb-8">
        <p className="mb-1 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Settings
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your application preferences.
        </p>
      </header>

      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card px-6 py-8">
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}
