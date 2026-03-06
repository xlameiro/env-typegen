# CLAUDE.md — Project Context for AI Assistants

This file is automatically discovered by Claude and other AI assistant runtimes.
See also `.github/copilot-instructions.md` for the primary instructions.

## Project Snapshot

**Next.js 16 Starter Template** — a production-ready foundation for web apps.

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.1.6 (App Router) |
| Runtime | React 19 |
| Language | TypeScript 5 strict mode |
| Styling | Tailwind CSS v4 |
| Auth | Auth.js v5 |
| Validation | Zod |
| State | Zustand (client only) |
| Tests | Vitest (unit) + Playwright (E2E) |
| Package manager | pnpm |

## Key File Conventions

```
app/                  # Next.js App Router (Server Components by default)
.github/agents/       # Custom AI agents for this project
.github/instructions/ # Instruction files (*.instructions.md)
.github/prompts/      # Reusable prompt files (*.prompt.md)
.github/hooks/        # Lifecycle hooks (pre-tool safety, session checks)
```

- File names: **kebab-case** everywhere
- Imports: use `@/` path alias (configured in `tsconfig.json`)
- Exports: named over default (except Next.js pages/layouts)

## Reasoning Guidance for Complex Tasks

When facing architectural decisions or cross-cutting changes:

1. **Read before writing** — always read relevant files before editing
2. **Prefer minimal changes** — don't refactor beyond the scope of the request
3. **Type safety first** — no `any`, no type assertions without comment explaining why
4. **Security boundary** — validate ALL external input with Zod; never trust user data
5. **Server-first** — default to Server Components; add `"use client"` only when required

## Quality Gates (ALL must pass before a task is done)

```bash
pnpm lint        # ESLint — zero errors
npx tsc --noEmit # TypeScript — zero type errors
pnpm test        # Vitest — all tests passing
pnpm build       # Next.js production build — successful
```

## Anti-Patterns to Avoid

- `any` type — use `unknown` + type narrowing or a proper Zod schema
- `useEffect` for data fetching — use Server Components or React Query
- Inline styles — use Tailwind utilities
- Client Components wrapping entire pages — keep `"use client"` boundary as small as possible
- Hardcoded secrets — always use `process.env.*`
- `SELECT *` equivalent — always select only the fields you need

## Extended Thinking Triggers

For these task types, take extra reasoning steps before writing code:
- **Auth flows** — check session handling, CSRF, and cookie attributes
- **Database schema changes** — consider migration safety and backward compatibility
- **API boundary changes** — verify all callers are updated
- **Performance-sensitive code** — profile mentally before optimizing
