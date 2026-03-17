import { LINKEDIN_URL, ROUTES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="py-4 text-center text-sm text-[--muted-foreground]">
      <nav
        aria-label="Documentation footer navigation"
        className="flex items-center justify-center gap-2"
      >
        <a
          href={ROUTES.privacy}
          className="underline transition-colors hover:text-[--foreground]"
        >
          Privacy
        </a>
        <span aria-hidden="true">·</span>
        <span>
          by{" "}
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-[--foreground]"
          >
            xlameiro
          </a>
        </span>
      </nav>
    </footer>
  );
}
