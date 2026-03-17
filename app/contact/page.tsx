import { MarketingFooter } from "@/components/marketing-footer";
import { GITHUB_URL, LINKEDIN_URL } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Find support and contact options for env-typegen, including GitHub issues and maintainer profile links for project questions and collaboration.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="maincontent"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-14 sm:px-10"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
        <p className="text-sm leading-7 text-muted-foreground">
          For bug reports, feature requests, or questions about usage, please
          use the GitHub repository channels first so discussions stay
          searchable and transparent for the community.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Repository and issues:{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {GITHUB_URL}
            </a>
          </li>
          <li>
            Maintainer profile:{" "}
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {LINKEDIN_URL}
            </a>
          </li>
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}
