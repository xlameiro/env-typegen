import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { ROUTES } from "@/lib/constants";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignUpPage() {
  return (
    <main
      id="maincontent"
      className="flex min-h-screen flex-col items-center justify-center p-8"
      tabIndex={-1}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create an account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a provider to get started
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Google */}
          <form
            action={async () => {
              /* c8 ignore next 2 -- server action body cannot run in jsdom */
              "use server";
              await signIn("google", { redirectTo: ROUTES.dashboard });
            }}
          >
            <Button type="submit" variant="outline" className="w-full gap-3">
              {/* Google icon */}
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={ROUTES.signIn}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
