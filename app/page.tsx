/**
 * @template-example
 * This is the starter template home page — it showcases the tech stack and dev commands.
 * Replace its content with your own home page when starting a new project.
 */
import { ButtonLink } from "@/components/ui/button-link";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/lib/constants";

const stack = [
  {
    label: "Next.js 16.1.6",
    desc: "App Router · Server Components · Turbopack",
  },
  { label: "React 19", desc: "Server Actions · use() · useActionState" },
  { label: "TypeScript 5", desc: "Strict mode · no any · path alias @/" },
  { label: "Tailwind CSS v4", desc: "CSS-first config · design tokens" },
  { label: "Auth.js v5", desc: "proxy.ts · Google OAuth · session management" },
  { label: "Zod v4", desc: "Schema validation at all boundaries" },
  { label: "Zustand v5", desc: "Client state only" },
  { label: "Vitest + Playwright", desc: "Unit + E2E testing" },
] as const;

const commands = [
  { cmd: "pnpm dev", desc: "Start dev server (Turbopack)" },
  { cmd: "pnpm build", desc: "Production build" },
  { cmd: "pnpm test", desc: "Vitest unit tests" },
  { cmd: "pnpm lint", desc: "ESLint — zero warnings" },
  { cmd: "pnpm type-check", desc: "TypeScript strict check" },
] as const;

export default function HomePage() {
  return (
    <main
      id="maincontent"
      tabIndex={-1}
      className="mx-auto max-w-3xl px-6 py-20"
    >
      <header className="mb-12">
        <p className="mb-2 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          v{APP_VERSION}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {APP_NAME}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{APP_DESCRIPTION}</p>
      </header>

      <section aria-labelledby="stack-heading" className="mb-12">
        <h2
          id="stack-heading"
          className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
        >
          Tech Stack
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {stack.map(({ label, desc }) => (
            <li
              key={label}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="block text-sm font-semibold text-foreground">
                {label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {desc}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="commands-heading" className="mb-12">
        <h2
          id="commands-heading"
          className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
        >
          Development Commands
        </h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {commands.map(({ cmd, desc }) => (
            <li key={cmd} className="flex items-center gap-4 px-4 py-3">
              <code className="min-w-fit rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
                {cmd}
              </code>
              <span className="text-sm text-muted-foreground">{desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Quick links" className="flex flex-wrap gap-3">
        <ButtonLink href="/auth/sign-in">Sign In →</ButtonLink>
        <ButtonLink
          href="https://nextjs.org/docs/app"
          variant="outline"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Next.js Docs (opens in new tab)"
        >
          Next.js Docs ↗
        </ButtonLink>
        <ButtonLink
          href="https://authjs.dev"
          variant="outline"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Auth.js Docs (opens in new tab)"
        >
          Auth.js Docs ↗
        </ButtonLink>
      </nav>
    </main>
  );
}
