# CLAUDE.md — Project Context for AI Assistants

This file is automatically discovered by Claude and other Anthropic-powered runtimes.

> **Primary instructions**: `.github/copilot-instructions.md` — read it first for stack, conventions, quality gates, and anti-patterns.

## Critical Project-Specific Conventions

These conventions are non-standard. Claude must follow them even without access to `copilot-instructions.md`.

- **Edge middleware is `proxy.ts`, NOT `middleware.ts`** — `proxy.ts` is the **official Next.js 16 standard**. `middleware.ts` was deprecated in Next.js 16 (official codemod: `npx @next/codemod@latest middleware-to-proxy .`). Never create or modify `middleware.ts`.
- **`auth()` is callable in `proxy.ts`** — `proxy.ts` runs on **Node.js runtime** by default (not Edge runtime). Call `auth()` from `@/auth` directly. Only use `getToken()` from `next-auth/jwt` if you explicitly opt proxy into Edge runtime.
- **No auth checks in `layout.tsx`** — layouts can be bypassed. Place authorization in `page.tsx` (resource-level) or `proxy.ts` (route-group-level).

## Extended Thinking Triggers

For these task types, take extra reasoning steps before writing code:

- **Auth flows** — check session handling, CSRF, and cookie attributes
- **Database schema changes** — consider migration safety and backward compatibility
- **API boundary changes** — verify all callers are updated
- **Performance-sensitive code** — profile mentally before optimizing

## Reasoning Guidance

1. **Read before writing** — always read relevant files before editing
2. **Prefer minimal changes** — don't refactor beyond the scope of the request
3. **Type safety first** — no `any`, no type assertions without a comment explaining why
4. **Security boundary** — validate ALL external input with Zod; never trust user data
5. **Server-first** — default to Server Components; add `"use client"` only when required
