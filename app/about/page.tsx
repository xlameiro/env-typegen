import { MarketingFooter } from "@/components/marketing-footer";
import { APP_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `About ${APP_NAME}`,
  description:
    "Learn why env-typegen exists, who it is for, and how it helps teams enforce type-safe environment governance across development and production workflows.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="maincontent"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-14 sm:px-10"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          About env-typegen
        </h1>
        <p className="text-sm leading-7 text-muted-foreground">
          env-typegen helps teams convert <code>.env.example</code> files into
          typed contracts and enforce those contracts through validation
          commands, drift checks, and CI-friendly reporting.
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          The goal is to reduce configuration mistakes, improve deployment
          confidence, and make environment governance easier for teams working
          across multiple environments and cloud providers.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
