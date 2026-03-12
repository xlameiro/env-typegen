/**
 * @template-example
 * Example profile page — demonstrates react-hook-form + Zod + Server Actions.
 * Replace with your own profile page or delete if not needed.
 */
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
        <p className="mb-1 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Profile
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
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
