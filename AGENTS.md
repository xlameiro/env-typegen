# AGENTS.md — Task Execution Guide

This file is automatically discovered by AI agent runtimes (OpenAI, Copilot, etc.).
For full project context see `CLAUDE.md` and `.github/copilot-instructions.md`.

## Project: Next.js 16 Starter Template

TypeScript 5 strict · React 19 · Tailwind CSS v4 · Auth.js v5 · Zod · Vitest · Playwright · pnpm

## Allowed Operations

- Read and edit files in this repository freely
- Run: `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `pnpm build`
- Install packages with `pnpm add` or `pnpm add -D`

## Prohibited Operations

- Do NOT run `rm -rf`, `git push --force`, or `git reset --hard` without explicit user confirmation
- Do NOT hardcode secrets or API keys — use `process.env.*`
- Do NOT commit directly to `main` — create a branch first

## Task Execution Protocol

1. **Read** relevant files before making any change
2. **Plan** the approach in 2–3 sentences before writing code
3. **Implement** the smallest change that satisfies the requirement
4. **Verify** by running lint + tsc + test in order
5. **Report** with a clear summary of what was changed and why

## Code Standards

```typescript
// Always: named exports, kebab-case files, @/ imports, Zod validation at boundaries
import { z } from 'zod'
import { someUtil } from '@/lib/some-util'

export const mySchema = z.object({ name: z.string().min(1) })
export type MyType = z.infer<typeof mySchema>
```

## File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Component | `kebab-case.tsx` | `user-card.tsx` |
| Hook | `use-*.ts` | `use-auth.ts` |
| Util | `kebab-case.ts` | `format-date.ts` |
| Unit test | `*.test.ts(x)` | `user-card.test.tsx` |
| E2E test | `*.spec.ts` | `login.spec.ts` |

## Done Definition

A task is complete when ALL pass:
- `pnpm lint` — zero errors
- `npx tsc --noEmit` — zero type errors  
- `pnpm test` — all tests green
- `pnpm build` — build succeeds
