import { LINKEDIN_URL } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="py-4 text-center text-sm text-[--muted-foreground]">
      by{" "}
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline transition-colors hover:text-[--foreground]"
      >
        xlameiro
      </a>
    </footer>
  );
}
