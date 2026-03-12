"use client";

import "@/app/globals.css";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type GlobalErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Replace with your error reporting service (e.g. Sentry.captureException(error), Axiom, Highlight)
    console.error(error);
  }, [error]);

  return (
    // global-error must include html and body tags.
    // Keep lang in sync with app/layout.tsx if the app locale changes.
    <html lang="en">
      {/*
       * Apply the dark class before first paint so users who manually set
       * dark mode via ThemeToggle don't see a flash of the light error page.
       * The root layout's ThemeProvider is bypassed when global-error fires.
       */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var s=localStorage.getItem('app-store');if(s&&JSON.parse(s).state?.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
        }}
      />
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
        <h1 className="text-2xl font-semibold text-destructive">
          Critical error
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          A critical error occurred. Please refresh the page or contact support.
        </p>
        <Button onClick={reset}>Try again</Button>
      </body>
    </html>
  );
}
