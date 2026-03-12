"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

type ErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Report errors to your monitoring service here.
    // Initialize the SDK once in instrumentation.ts, then call the capture method:
    //   Sentry:    Sentry.captureException(error)
    //   Highlight: H.consumeError(error)
    //   Axiom:     log.error('Unhandled error', { error: error.message, digest: error.digest })
    console.error(error);
  }, [error]);

  return (
    <main
      id="maincontent"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center"
      tabIndex={-1}
    >
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. Please try again, or contact support if
          the issue persists.
        </p>
        {/* process.env.NODE_ENV is intentionally used here — this is a Client Component
            and NODE_ENV is inlined statically by Turbopack/webpack at build time.
            env.NODE_ENV from @/lib/env is server-only and would be undefined on the client. */}
        {process.env.NODE_ENV === "development" && error.message && (
          <pre className="mt-2 max-w-md overflow-auto rounded-md bg-destructive/10 p-4 text-left text-xs text-destructive">
            {error.message}
          </pre>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
