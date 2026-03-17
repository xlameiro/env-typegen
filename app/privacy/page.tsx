import { MarketingFooter } from "@/components/marketing-footer";
import { APP_NAME, GITHUB_URL } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy and data handling practices",
  description:
    "Learn how env-typegen handles website data, third-party integrations, and best practices for responsible security disclosure when reporting issues.",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="maincontent"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-14 sm:px-10"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm leading-7 text-muted-foreground">
          {APP_NAME} is open-source software published through public source and
          package registries. This website is informational and does not require
          user accounts, direct sign-up forms, or direct submission of personal
          data to use the documentation and public project pages. We are
          committed to transparency about data handling and privacy practices.
        </p>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Website data collection
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            This website:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <strong>Does not track users</strong> with cookies, pixels, or
              persistent identifiers. We do not build user profiles.
            </li>
            <li>
              <strong>
                Does not store personally identifiable information
              </strong>{" "}
              from visitors.
            </li>
            <li>
              <strong>Does not require authentication</strong> to read
              documentation or view project pages.
            </li>
            <li>
              <strong>Does not process payments</strong> or financial
              information. The CLI is free and open-source.
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Third-party services and data processing
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Links and workflows route through third-party platforms that may
            process data:
          </p>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">GitHub</h3>
              <p className="mt-1">
                Issues, discussions, and source code are hosted on GitHub.
                GitHub may process account information, telemetry, and usage
                data under their{" "}
                <a
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  privacy policy.
                </a>
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">npm Registry</h3>
              <p className="mt-1">
                The CLI package is published to npm. Download telemetry is
                handled by npm under their{" "}
                <a
                  href="https://docs.npmjs.com/policies/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  privacy policy.
                </a>
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Review each platform&apos;s privacy policy before sharing sensitive
            information in issues, comments, or profile fields.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Infrastructure and technical logs
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Like most web services, infrastructure providers may retain
            aggregated technical logs such as request metadata, uptime traces,
            and delivery diagnostics. These records are used for reliability,
            security monitoring, and abuse prevention rather than profile-based
            advertising.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Responsible disclosure
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            When reporting security vulnerabilities or submitting bug reports:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <strong>Do not post secrets or credentials</strong> in public
              issues. Environment file contents, API keys, and infrastructure
              details should never be shared publicly.
            </li>
            <li>
              <strong>Use private security reporting</strong> for potential
              vulnerabilities. Visit the{" "}
              <a
                href={`${GITHUB_URL}/security`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Security tab
              </a>{" "}
              on GitHub to file a private advisory.
            </li>
            <li>
              <strong>Sanitize code examples</strong> before sharing. Replace
              real values with placeholder strings.
            </li>
            <li>
              <strong>Consider a staged disclosure</strong> when possible—report
              privately first, allow time for a fix, then publicize if
              appropriate.
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Data retention and policy questions
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Since this site does not operate user accounts, direct personal data
            retention is limited. If you have concerns about information you
            posted in public project channels, use the relevant platform tools
            (for example GitHub content controls) to manage or remove that
            content.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Policy updates
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Material updates to this policy are tracked in repository history so
            changes remain auditable over time. Continued use of this site after
            a published update implies acceptance of the revised policy.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
