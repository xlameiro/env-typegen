import { LINKEDIN_URL, ROUTES } from "@/lib/constants";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
      <nav
        aria-label="Marketing footer navigation"
        className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6"
      >
        <a
          href={ROUTES.about}
          className="underline transition-colors hover:text-foreground"
        >
          About
        </a>
        <a
          href={ROUTES.contact}
          className="underline transition-colors hover:text-foreground"
        >
          Contact
        </a>
        <a
          href={ROUTES.privacy}
          className="underline transition-colors hover:text-foreground"
        >
          Privacy
        </a>
        <span aria-hidden="true">·</span>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline transition-colors hover:text-foreground"
        >
          xlameiro
        </a>
      </nav>
    </footer>
  );
}
