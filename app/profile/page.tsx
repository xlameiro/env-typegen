import { requireAuth } from "@/lib/auth";
import type { Metadata } from "next";
import { ProfileForm } from "./profile-form";

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

      {/* RHF + Zod example — demonstrates react-hook-form + @hookform/resolvers + Server Action */}
      <ProfileForm
        defaultValues={{
          name: session.user?.name ?? "",
          email: session.user?.email ?? "",
        }}
      />
    </main>
  );
}
