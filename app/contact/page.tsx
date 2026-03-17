import { MarketingFooter } from "@/components/marketing-footer";
import { GITHUB_URL, LINKEDIN_URL } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact and support for env-typegen users",
  description:
    "Get help with env-typegen setup, validation workflows, and governance questions through GitHub issues, discussions, and private security reporting channels.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="maincontent"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-14 sm:px-10"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Contact & Support</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          If you need help with setup, validation output, or governance
          workflows, the fastest path is to use the project repository channels
          first. Public threads keep context searchable, make troubleshooting
          easier for other users, and improve long-term documentation quality.
        </p>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Quick links</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              <a
                href={`${GITHUB_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Report a bug
              </a>{" "}
              — Found an issue? Open a GitHub issue with details.
            </li>
            <li>
              <a
                href={`${GITHUB_URL}/discussions`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Ask a question
              </a>{" "}
              — Have a setup or workflow question? Use discussions.
            </li>
            <li>
              <a
                href={`${GITHUB_URL}/security/advisories/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Report security issue
              </a>{" "}
              — Sensitive finding? Use private security reporting.
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Support channels</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">GitHub Repository</h3>
              <p className="mt-1">
                The central hub for issues, discussions, documentation, and
                source code.
              </p>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block underline hover:text-foreground"
              >
                {GITHUB_URL}
              </a>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">Maintainer Profile</h3>
              <p className="mt-1">
                Connect with the lead maintainer for collaboration, consulting,
                or feature discussions.
              </p>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block underline hover:text-foreground"
              >
                {LINKEDIN_URL}
              </a>
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Response expectations</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            This is a community-maintained open-source project. Responses may
            take a few days depending on availability. For urgent production
            issues, consider:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Checking existing issues and discussions for similar problems.
            </li>
            <li>Consulting the documentation and examples in the repository.</li>
            <li>Reviewing the README for common patterns and workarounds.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Before opening an issue
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Include enough context so maintainers can reproduce and triage the
            request quickly:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>The command you ran and the exact output or error.</li>
            <li>
              Your runtime context (Node.js version, package manager, CI
              provider).
            </li>
            <li>
              The expected behavior and what happened instead, including sample
              contract files when possible.
            </li>
          </ul>
          <p className="text-sm leading-7 text-muted-foreground">
            Reproduction-ready reports are the fastest way to get actionable
            help. If your case is environment-specific, include sanitized
            contract snippets or command flags rather than screenshots alone.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Collaboration and roadmap discussions
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            For larger integration ideas, governance use cases, or contribution
            proposals, use GitHub discussions first to align on scope before
            implementation. This keeps planning transparent and prevents
            duplicate work.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Security and private disclosures
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            For potentially sensitive vulnerabilities, avoid public issue
            threads and report through GitHub private security reporting from
            the repository security tab.
          </p>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
