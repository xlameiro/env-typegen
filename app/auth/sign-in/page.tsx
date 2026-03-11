import { signIn } from "@/auth";
import { GoogleIcon } from "@/components/ui/google-icon";
import { ROUTES } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

// Only allow relative paths to prevent open redirect attacks (OWASP A01).
function sanitizeReturnTo(url: string | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) {
    return ROUTES.dashboard;
  }
  return url;
}

export default async function SignInPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ returnTo?: string }>;
}>) {
  const { returnTo } = await searchParams;
  const redirectTo = sanitizeReturnTo(returnTo);
  return (
    <main
      id="maincontent"
      className="flex min-h-screen flex-col items-center justify-center p-8"
      tabIndex={-1}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a provider to continue
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Google */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo });
            }}
          >
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {/* Google icon */}
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a
            href={ROUTES.signUp}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
