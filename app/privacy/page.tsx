import { MarketingFooter } from "@/components/marketing-footer";
import { APP_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the privacy policy for env-typegen to understand what data is collected, how it is used, and the principles applied to protect user information.",
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
          {APP_NAME} is open-source software distributed through public package
          and source registries. The project itself does not require account
          creation or collect personal data directly through this website.
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          Third-party platforms used by this project, such as GitHub and npm,
          may process usage and account data under their own privacy policies.
          Please review their terms before sharing sensitive information.
        </p>
        <p className="text-sm leading-7 text-muted-foreground">
          If this policy changes materially, updates will be published in the
          repository history so they remain auditable.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
