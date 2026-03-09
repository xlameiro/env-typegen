import { requireAuth } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await requireAuth();

  return (
    <main
      id="maincontent"
      className="mx-auto max-w-3xl px-6 py-20"
      tabIndex={-1}
    >
      <header className="mb-8">
        <p className="mb-1 text-sm font-medium tracking-widest text-zinc-400 uppercase">
          Profile
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account information.
        </p>
      </header>

      <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4 px-6 py-4">
          <dt className="w-24 shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Name
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-50">
            {session.user?.name ?? "—"}
          </dd>
        </div>
        <div className="flex items-center gap-4 px-6 py-4">
          <dt className="w-24 shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Email
          </dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-50">
            {session.user?.email ?? "—"}
          </dd>
        </div>
      </dl>
    </main>
  );
}
