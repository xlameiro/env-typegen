import { MarketingFooter } from "@/components/marketing-footer";
import { APP_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why env-typegen exists and who it helps",
  description:
    "Understand the goals behind env-typegen, the teams it serves, and the workflow it enables for typed environment contracts, validation, and CI governance.",
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
          {APP_NAME} started from a common pain point in TypeScript projects:
          environment variables are often documented in one place, validated in
          another, and consumed in code with little shared contract. That gap
          leads to broken deployments, onboarding friction, and configuration
          drift between local and cloud environments.
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          The project focuses on turning <code>.env.example</code> into a
          reliable source of truth. Instead of manually synchronizing docs,
          runtime checks, and TypeScript types, teams can generate those assets
          from one contract and enforce them consistently in CI.
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          Configuration errors are among the most avoidable causes of deployment
          failures. By treating environment contracts as code—typed, reviewed,
          and validated—teams can shift these errors left and catch them during
          development or in pull requests before they reach production.
        </p>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Who benefits</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {APP_NAME} is designed for teams that deploy often, operate multiple
            environments, and want predictable release gates around
            configuration:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <strong>Application teams</strong> building services with strict
              requirements for environment validation in staging and production,
              especially those using TypeScript and modern deployment patterns.
            </li>
            <li>
              <strong>Platform teams</strong> managing infrastructure that need
              drift detection across local and cloud snapshots (Vercel,
              Cloudflare, AWS, and more).
            </li>
            <li>
              <strong>Maintainers and SREs</strong> who want machine-readable,
              auditable checks inside pull requests and deployment pipelines for
              governance and compliance.
            </li>
            <li>
              <strong>Open-source projects</strong> seeking to improve contributor
              onboarding by making environment setup explicit and validated.
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            How teams usually adopt it
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Generate typed outputs from <code>.env.example</code> to remove
              contract duplication.
            </li>
            <li>
              Validate runtime values with strict checks before releases are
              promoted.
            </li>
            <li>
              Add drift and doctor commands to CI for auditable environment
              governance.
            </li>
          </ol>
          <p className="text-sm leading-7 text-muted-foreground">
            This phased path keeps adoption incremental: teams can start with
            type generation and add governance checks when they are ready.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Design principles
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Contract-first workflows: generated artifacts should mirror the
              source contract without hidden assumptions.
            </li>
            <li>
              Explicit failures: validation output should explain what failed,
              why it failed, and what to fix next.
            </li>
            <li>
              CI-friendly reporting: machine-readable diagnostics should be easy
              to enforce in pull requests and deployment gates.
            </li>
          </ul>
          <p className="text-sm leading-7 text-muted-foreground">
            These principles keep adoption practical for teams that need both
            developer ergonomics and operational confidence.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Open-source development model
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            {APP_NAME} is developed in the open. Feature requests, bug reports,
            and documentation improvements are tracked in public channels so
            teams can review decisions and contribute improvements over time.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Core principles</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <strong>Single source of truth:</strong> .env.example becomes the
              contract—not separate docs, schemas, or runtime validation code.
            </li>
            <li>
              <strong>Type safety first:</strong> Generate TypeScript, Zod, t3-env,
              and declaration files automatically to keep types in sync with
              actual requirements.
            </li>
            <li>
              <strong>Shift left on errors:</strong> Catch configuration problems
              in development or CI, not in production.
            </li>
            <li>
              <strong>Governance at scale:</strong> Enable teams to validate
              across local and cloud environments with machine-readable,
              auditable reports.
            </li>
          </ul>
        </section>
        <p className="text-sm leading-7 text-muted-foreground">
          The long-term goal is simple: reduce avoidable configuration
          incidents, make environment changes reviewable, and help teams ship
          with confidence. Every deployment should be predictable.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
