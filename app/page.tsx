import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/lib/constants";
import Link from "next/link";

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
        <p className="mb-2 text-sm font-medium tracking-widest text-zinc-400 uppercase">
          v{APP_VERSION}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {APP_NAME}
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {APP_DESCRIPTION}
        </p>
      </header>

      <section aria-labelledby="stack-heading" className="mb-12">
        <h2
          id="stack-heading"
          className="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase"
        >
          Tech Stack
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {stack.map(({ label, desc }) => (
            <li
              key={label}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {label}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">{desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="commands-heading" className="mb-12">
        <h2
          id="commands-heading"
          className="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase"
        >
          Development Commands
        </h2>
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {commands.map(({ cmd, desc }) => (
            <li key={cmd} className="flex items-center gap-4 px-4 py-3">
              <code className="min-w-fit rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {cmd}
              </code>
              <span className="text-sm text-zinc-500">{desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Quick links" className="flex flex-wrap gap-3">
        <Link
          href="/auth/sign-in"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Sign In →
        </Link>
        <a
          href="https://nextjs.org/docs/app"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Next.js Docs
        </a>
        <a
          href="https://authjs.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Auth.js Docs
        </a>
      </nav>
    </main>
  );
}
