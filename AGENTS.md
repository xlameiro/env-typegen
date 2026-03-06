# AGENTS.md — Task Execution Guide

This file is automatically discovered by AI agent runtimes (OpenAI, GitHub Copilot coding agent, etc.).

> **Primary instructions**: `.github/copilot-instructions.md` — read it first for stack, conventions, file naming, quality gates, and anti-patterns.

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

---

## GitHub Copilot Coding Agent — WRAP Methodology

Use the **WRAP** framework when assigning issues to the Copilot coding agent.

### W — Write effective issues

Write issues as if they are for someone brand new to the codebase:

- **Descriptive title** that explains where the work is being done (e.g. `[auth] Add rate limiting to login endpoint` not `Fix login`)
- **Include examples** of the pattern you want (paste a code snippet, link to an existing file that already does it right)
- **Specify scope** — what files/modules are affected, what tests should pass

```markdown
<!-- Good issue for coding agent -->
Title: [components] Add accessible error state to all form inputs

Context: We use Zod + React Hook Form. All <input> elements need `aria-invalid` and
`aria-describedby` linked to inline error messages when validation fails.

See app/components/ui/text-field.tsx for the existing pattern to follow.
Add unit tests with Vitest and update Playwright E2E smoke test.
```

### R — Refine your instructions

Use custom instructions to avoid repeating yourself across issues:

| Scope | File | Use for |
|-------|------|---------|
| Repository | `.github/copilot-instructions.md` | Stack conventions, naming rules, quality gates |
| Custom agents | `.github/agents/*.agent.md` | Repeated workflows (e.g. `feature-builder`, `test-generator`) |
| Org-level | GitHub org settings | Cross-repo standards |

Tip: Ask the coding agent itself to generate or improve `.github/copilot-instructions.md` from the codebase.

### A — Atomic tasks

Break large work into small, independent, reviewable units:

```markdown
<!-- Instead of: "Migrate everything to use the new design system" -->

✅ [ui] Replace all <button> usages in app/auth/ with <Button> component
✅ [ui] Replace all <input> usages in app/dashboard/ with <Input> component
✅ [ui] Update Storybook stories for Button and Input components
```

Each issue should result in a PR you can review in under 15 minutes.

### P — Pair with the coding agent

Know what humans do better vs. what the agent does better:

| Humans | Coding Agent |
|--------|--------------|
| Understand *why* a task exists | Tireless parallel execution |
| Spot cross-repo impact | Repetitive tasks without fatigue |
| Navigate business ambiguity | Explore multiple implementation approaches simultaneously |
| Validate the result makes sense | Apply consistent patterns across many files |

### Assigning an issue to the coding agent

1. Go to the issue on GitHub
2. In the right sidebar, under **Assignees**, assign **Copilot**
3. Or from the **Agents panel** (top-right on github.com) → New task → select repo + model
4. Choose your model: fast model for tests/formatting, powerful model (Claude) for refactors
5. Monitor progress in the session logs; the agent self-reviews with Copilot code review before opening the PR

### Good candidates for the coding agent in this project

- Adding/updating Vitest unit tests for existing utilities
- Applying a new ESLint rule consistently across the codebase
- Updating dependencies with `pnpm update`
- Generating or improving `copilot-instructions.md` from existing code
- Adding Zod validation schemas for new API boundaries
- Migrating components to follow new accessibility patterns
- Writing Playwright E2E tests for existing flows
