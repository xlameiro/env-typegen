"use client";

import "@/app/globals.css";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { APP_LOCALE } from "@/lib/constants";

type GlobalErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report errors to your monitoring service here.
    // Initialize the SDK once in instrumentation.ts, then call the capture method:
    //   Sentry:    Sentry.captureException(error)
    //   Highlight: H.consumeError(error)
    //   Axiom:     log.error('Critical error', { error: error.message, digest: error.digest })
    console.error(error);
  }, [error]);

  // Apply dark mode based on the user's stored preference.
  // useEffect runs after paint, so a brief flash is possible on the error page.
  // An inline <script> cannot be used here: global-error.tsx is a Client Component
  // rendered outside the root layout and has no access to the CSP nonce from proxy.ts.
  useEffect(() => {
    // String-check the serialized Zustand store — avoids JSON.parse and a try/catch.
    // Zustand persist serializes theme as `"theme":"dark"` which makes this safe.
    const stored = localStorage.getItem("app-store");
    if (stored?.includes('"theme":"dark"')) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    // global-error must include html and body tags.
    // lang is read from APP_LOCALE in lib/constants.ts — update it there when changing locale.
    <html lang={APP_LOCALE}>
      <body className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        {/* <main> landmark ensures screen readers can navigate to the error content.
            tabIndex={-1} enables programmatic focus (e.g. from a skip link) even on
            non-interactive elements. id="maincontent" matches the skip-link convention
            used across all other pages in this template. */}
        <main
          id="maincontent"
          tabIndex={-1}
          className="flex flex-col items-center gap-6 text-center"
        >
          <h1 className="text-2xl font-semibold text-destructive">
            Critical error
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            A critical error occurred. Please refresh the page or contact
            support.
          </p>
          <Button onClick={reset}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
