import { SiteFooter } from "@/components/site-footer";
import {
  APP_DESCRIPTION,
  APP_NAME,
  GITHUB_URL,
  LINKEDIN_URL,
  NPM_URL,
  SITE_URL,
} from "@/lib/constants";
import type { Route } from "next";
import Link from "next/link";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: SITE_URL,
  downloadUrl: NPM_URL,
  applicationCategory: "DeveloperApplication",
  applicationSubCategory: "CLI Tool",
  operatingSystem: "macOS, Linux, Windows",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex min-h-dvh flex-col">
        <main
          id="maincontent"
          tabIndex={-1}
          className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-5xl font-bold tracking-tight">env-typegen</h1>
            <p className="max-w-xl text-lg text-[--muted-foreground]">
              Generate TypeScript types, Zod schemas, t3-env configs, and
              declaration files from your <code>.env.example</code> in one
              command.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={"/docs" as Route}
              className="rounded-lg bg-[--primary] px-6 py-3 text-sm font-medium text-[--primary-foreground] transition-opacity hover:opacity-90"
            >
              Read the docs
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[--border] px-6 py-3 text-sm font-medium transition-colors hover:bg-[--muted]"
            >
              GitHub
            </a>
          </div>

          <div className="w-full max-w-lg rounded-xl border border-[--border] bg-[--muted] p-4 text-left font-mono text-sm">
            <span className="text-[--muted-foreground]">$</span>{" "}
            <span>
              env-typegen --input .env.example --output env.generated.ts
              --format ts
            </span>
          </div>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
