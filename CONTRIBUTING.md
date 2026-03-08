# Contributing

Thank you for your interest in contributing! This guide covers the conventions and workflow for this project.

## Branching strategy — Trunk-Based Development

This project uses **Trunk-Based Development (TBD)**. `main` is always releasable.

- Commit small, complete changes directly to `main`, or use a **short-lived branch** (merge within 1 day).
- Branch name format: `<type>/<short-description>` — e.g. `fix/login-redirect`, `feat/user-avatar`.
- No `develop`, `release/*`, or `hotfix/*` branches.
- Use **feature flags** to ship incomplete features safely.

## Development setup

```bash
# 1. Clone and install
git clone <repo-url>
cd <repo>
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET

# 3. Start the dev server
pnpm dev
```

## Quality gate

Every commit and PR must pass all four checks:

```bash
pnpm lint          # ESLint — zero errors
pnpm type-check    # TypeScript — zero errors
pnpm test          # Vitest — all tests passing
pnpm build         # Next.js production build — successful
```

Husky runs lint-staged on each commit (lint + type-check + prettier on staged files).

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>

[optional body]
```

**Types:** `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore` | `perf` | `ci`

Examples:

```
feat(auth): add GitHub OAuth provider
fix(proxy): redirect to sign-in on expired session
docs: update contributing guide
chore: update dependencies
```

Rules enforced by commitlint:

- Subject line ≤ 72 characters
- Body lines ≤ 100 characters
- No trailing period on subject

## Code conventions

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for the full list. Key points:

- **TypeScript strict mode** — no `any`, no unsafe assertions
- **File naming** — `kebab-case` for all files
- **Server Components by default** — add `"use client"` only when needed
- **Zod validation** — validate all external input at boundaries
- **Imports** — use `@/` path alias for all internal imports

## Pull requests

Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`). The quality gate must pass before merge.

## Reporting issues

Use the issue templates in `.github/ISSUE_TEMPLATE/` for bug reports and feature requests.
