import { SiteFooter } from "@/components/site-footer";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_VERSION,
  GITHUB_URL,
  LINKEDIN_URL,
  NPM_URL,
  SITE_URL,
} from "@/lib/constants";
import type { Route } from "next";
import Link from "next/link";

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: SITE_URL,
  softwareVersion: APP_VERSION,
  downloadUrl: NPM_URL,
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "CLI Tool",
  operatingSystem: "macOS, Linux, Windows",
  featureList: [
    "Generate TypeScript env types from .env.example",
    "Generate Zod v4 schemas and @t3-oss/env-nextjs config",
    "Validate environment contracts with check, diff, and doctor",
    "Detect drift across local and cloud snapshots (Vercel, Cloudflare, AWS)",
    "Emit CI-friendly JSON reports for governance pipelines",
  ],
  keywords:
    "env-typegen, environment variables, zod, t3-env, typescript, ci validation, config drift detection",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Xabier Lameiro",
    url: LINKEDIN_URL,
  },
  codeRepository: GITHUB_URL,
  sameAs: [GITHUB_URL, NPM_URL, LINKEDIN_URL],
};

const frequentlyAskedQuestions = [
  {
    question: "How is env-typegen different from plain dotenv usage?",
    answer:
      "dotenv loads values at runtime, but it does not enforce typed contracts or drift checks. env-typegen generates typed artifacts and adds validation commands that can be enforced in CI.",
  },
  {
    question: "Can I use env-typegen without Next.js?",
    answer:
      "Yes. The CLI and core generators work in any Node.js/TypeScript project. You can choose only the outputs you need, including TypeScript, Zod, declaration files, or t3-env configuration.",
  },
  {
    question: "Can env-typegen validate cloud environment snapshots?",
    answer:
      "Yes. Validation commands support cloud snapshot files from Vercel, Cloudflare, and AWS so teams can detect drift before deployment.",
  },
] as const;

const frequentlyAskedQuestionsJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: frequentlyAskedQuestions.map((questionAnswerPair) => ({
    "@type": "Question",
    name: questionAnswerPair.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: questionAnswerPair.answer,
    },
  })),
};

export default function HomePage() {
  return (
    <>
      {/*
       * JSON-LD structured data for Google Rich Results (SoftwareApplication).
       * type="application/ld+json" is treated as a data block by browsers
       * (not executable JS) — no script-src CSP hash needed.
       */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            softwareJsonLd,
            frequentlyAskedQuestionsJsonLd,
          ]),
        }}
      />
      <div className="flex min-h-dvh flex-col">
        <main
          id="maincontent"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-6 py-14 sm:px-10"
          tabIndex={-1}
        >
          <section className="flex flex-col gap-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Type-safe env generation + governance
            </p>
            <div className="mx-auto flex max-w-4xl flex-col gap-5">
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                Turn <code>.env.example</code> into typed contracts and
                production-ready checks
              </h1>
              <p className="mx-auto max-w-3xl text-pretty text-lg text-muted-foreground sm:text-xl">
                env-typegen generates TypeScript, Zod, t3-env, and declaration
                outputs, then validates real environment sources with contract
                checks, drift detection, and CI-friendly reports.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={"/docs" as Route}
                className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Read the docs
              </Link>
              <a
                href={NPM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                npm package
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                GitHub
              </a>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-border bg-card p-5 text-left">
              <h2 className="text-lg font-semibold">Single source of truth</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Generate typed artifacts directly from <code>.env.example</code>{" "}
                so code, runtime validation, and documentation stay aligned.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-card p-5 text-left">
              <h2 className="text-lg font-semibold">Governance by default</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use <code>check</code>, <code>diff</code>, and{" "}
                <code>doctor</code> to enforce contracts and detect drift across
                local and cloud environments.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-card p-5 text-left">
              <h2 className="text-lg font-semibold">CI-ready outputs</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Emit machine-readable JSON reports and integrate validation into
                pull requests, release workflows, and deployment gates.
              </p>
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-xl border border-border bg-muted/30 p-5">
              <h2 className="text-xl font-semibold">
                From generation to drift detection
              </h2>
              <ol className="mt-4 space-y-3 text-left text-sm text-muted-foreground">
                <li>
                  1. Generate typed outputs from <code>.env.example</code>.
                </li>
                <li>
                  2. Define a contract with expected types and requirements.
                </li>
                <li>3. Validate environments with strict checks in CI.</li>
                <li>4. Detect drift across targets and cloud snapshots.</li>
              </ol>
            </article>

            <article className="rounded-xl border border-border bg-muted p-5 text-left font-mono text-sm">
              <p className="text-muted-foreground">
                $ npx env-typegen --input .env.example --output env.generated.ts
              </p>
              <p className="mt-2 text-muted-foreground">
                $ npx env-typegen check --env .env --contract env.contract.ts
              </p>
              <p className="mt-2 text-muted-foreground">
                $ npx env-typegen diff --targets .env,.env.production --contract
                env.contract.ts
              </p>
              <p className="mt-2 text-muted-foreground">
                $ npx env-typegen doctor --env .env --targets
                .env,.env.production --json
              </p>
            </article>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {frequentlyAskedQuestions.map((questionAnswerPair) => (
                <article
                  key={questionAnswerPair.question}
                  className="rounded-xl border border-border bg-card p-5 text-left"
                >
                  <h3 className="text-base font-semibold">
                    {questionAnswerPair.question}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {questionAnswerPair.answer}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
