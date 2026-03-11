# AGENTS.md — Task Execution Guide

This file is automatically discovered by AI agent runtimes (OpenAI, GitHub Copilot coding agent, etc.).

> **Primary instructions**: `.github/copilot-instructions.md` — read it first for stack, conventions, file naming, quality gates, and anti-patterns.

> **Living document**: If you discover something about this codebase that would help future tasks (e.g., a convention, a quirk, a gotcha), update `.github/copilot-instructions.md` immediately under `## Learnings` or the relevant section.

## Critical Project-Specific Conventions

These conventions are non-standard and **must be followed**. AI agents reading only this file (without access to `.github/copilot-instructions.md`) still need to know them.

- **Edge middleware is `proxy.ts`, NOT `middleware.ts`** — `proxy.ts` is the **official Next.js 16 standard**. `middleware.ts` was deprecated in Next.js 16 (official codemod: `npx @next/codemod@latest middleware-to-proxy .`). Always use `proxy.ts`; never create or modify `middleware.ts`.
- **`auth()` is callable in `proxy.ts`** — unlike the old `middleware.ts` which ran on Edge runtime, `proxy.ts` runs on **Node.js runtime** by default in Next.js 16. Call `auth()` from `@/auth` directly in `proxy.ts`. Only use `getToken()` from `next-auth/jwt` if you explicitly opt the proxy into Edge runtime.
- **No auth checks in `layout.tsx`** — layouts can be bypassed. Place authorization in `page.tsx` (resource-level) or `proxy.ts` (route-group-level).

## Operations & Conventions

> **Allowed/prohibited operations, quality gates, branching strategy, and git best practices**: See `.github/copilot-instructions.md` §Boundaries, §Personal Preferences, and §Session Completion Checklist. The rules below are AGENTS.md-specific additions.

- Read hook configurations in `.github/hooks/*.json` — these run automatically at agent lifecycle events (PostToolUse, SessionStart, SessionEnd, etc.)
- Use `git add <filename>` instead of `git add .` — avoids accidentally staging unintended files
- Create PRs as drafts first: `gh pr create --draft` — lets the requester verify correctness before involving reviewers
- When remote has new changes, prefer `git fetch && git rebase origin/main` over merge commits
- Do NOT use `--no-verify` when committing — fix the lint/pre-commit issues instead

## PR Size Guidelines

- Keep PRs small and reviewable — aim for under 500 lines of code (additions + deletions)
- Keep PRs under 10 changed code files where possible
- Each PR should have a single clear purpose — one feature, one bug fix, or one refactor
- Split large changes by layer: schema/DB changes → service logic → UI components
- Do preparatory refactoring in a separate PR before adding new functionality that depends on it
- Lock files, auto-generated files, and documentation are excluded from the size count

## Task Execution Protocol

1. **Read** relevant files before making any change
2. **Plan** the approach in 2–3 sentences before writing code
3. **Implement** the smallest change that satisfies the requirement
4. **Verify** by running lint + tsc + test in order
5. **Report** with a clear summary of what was changed and why — keep PR descriptions concise; a few sentences is enough for simple changes
6. **Disclose AI assistance** in the PR description when the agent authored or significantly contributed: add `> This PR was created with AI assistance.`

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

| Scope         | File                              | Use for                                                       |
| ------------- | --------------------------------- | ------------------------------------------------------------- |
| Repository    | `.github/copilot-instructions.md` | Stack conventions, naming rules, quality gates                |
| Custom agents | `.github/agents/*.agent.md`       | Repeated workflows (e.g. `feature-builder`, `test-generator`) |
| Org-level     | GitHub org settings               | Cross-repo standards                                          |

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

| Humans                          | Coding Agent                                              |
| ------------------------------- | --------------------------------------------------------- |
| Understand _why_ a task exists  | Tireless parallel execution                               |
| Spot cross-repo impact          | Repetitive tasks without fatigue                          |
| Navigate business ambiguity     | Explore multiple implementation approaches simultaneously |
| Validate the result makes sense | Apply consistent patterns across many files               |

### Assigning an issue to the coding agent

1. Go to the issue on GitHub
2. In the right sidebar, under **Assignees**, assign **Copilot**
3. Or from the **Agents panel** (top-right on github.com) → New task → select repo + model
4. Choose your model: fast model for tests/formatting, powerful model (Claude) for refactors
5. Monitor progress in the session logs; the agent self-reviews with Copilot code review before opening the PR

### VS Code Local Agent Features (Preview)

These features in VS Code >= 1.110 significantly improve the agent's ability to develop, verify, and execute tasks without leaving the editor.

**Integrated Browser** — Enable in VS Code Settings (search "Integrated Browser"). Runs a full browser inside VS Code. Click **Share with agent** to give the agent Playwright-equivalent tools: navigate, screenshot, inspect, scroll. Best paired with Playwright tests so the agent can visually verify UI changes and self-correct in a tight feedback loop.

**Approval modes** (Chat input → **default approvals** dropdown):

| Mode              | What it does                                                                | When to use                                                     |
| ----------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Default Approvals | Prompts before each tool call (terminal, MCP, file write)                   | Infra, schema changes, AWS, irreversible operations             |
| Bypass Approvals  | Auto-approves all tool calls (YOLO)                                         | When you want speed and trust the agent fully                   |
| Autopilot         | Bypass Approvals + auto-retry on API errors + forceful completion prompting | Default for all feature work — runs until the job is truly done |
| Sandbox           | Bypass Approvals + process/network isolation                                | Testing untrusted code or external-facing operations            |

> **Default for this project**: use **Autopilot** for all feature work. Switch to **Default Approvals** whenever you are touching AWS resources, database schema, or environment secrets. Use **Sandbox** when the agent will execute code from untrusted sources.

> Both features are in preview as of VS Code 1.110. Check `configure chat → diagnostics` if either is not behaving as expected.

### Handling Review Feedback (AI Agents Only)

> **Note**: This section applies only to AI coding agents. Human contributors should push commits directly to their PR branches as usual.

When a reviewer requests changes on an open PR, the coding agent must create a **Sub-PR** (a new pull request that targets the original PR branch) to address those changes — instead of pushing commits directly to the existing PR branch.

**Why Sub-PRs for AI agents?**

- Allows reviewers to evaluate AI-generated revisions in isolation
- Maintains a clear separation between original work and AI-generated fixes
- Enables easy rollback if AI-generated changes introduce new issues
- Provides an additional review checkpoint specifically for AI changes

**Sub-PR and Trunk-Based Development (TBD) lifecycle rule:**

This project uses TBD (branches live < 1 day). Sub-PRs are an exception — they extend the source branch's life. To keep things manageable:

- **Maximum Sub-PR lifetime: 4 hours** from creation
- If the Sub-PR cannot be reviewed and merged within 4 hours: close the Sub-PR, merge the original PR to `main` as-is, then apply the AI-generated revisions as follow-up commits directly on `main`
- Never let a feature branch survive beyond 24 hours waiting on a Sub-PR review cycle

### Running Parallel Agent Tasks with `/fleet`

`/fleet` is a Copilot CLI slash command that dispatches **multiple agent tasks in parallel** from a single prompt. Ideal for maintenance cycles where several independent tasks are known upfront.

**Install the Copilot CLI** (once per machine):

```bash
npm install -g @githubnext/github-copilot-cli
github-copilot-cli auth
```

Verify: `github-copilot-cli --version`

**Example — dependency bump + issue fix in one shot:**

```
/fleet solve issue #42 and upgrade next and react to their latest stable versions and fix any breaking changes
```

**When to use `/fleet` vs assigning a single issue:**

| Scenario                                                         | Approach                                     |
| ---------------------------------------------------------------- | -------------------------------------------- |
| One well-defined issue                                           | Assign Copilot to the issue via GitHub UI    |
| 2+ independent tasks (dependency bumps, lint fixes, issue batch) | Use `/fleet` from the CLI                    |
| Tasks that depend on each other sequentially                     | Do NOT use `/fleet` — assign issues in order |

> **Note**: `/fleet` is a preview feature — verify availability with `github-copilot-cli --help` before using.

### Ralph Loops — Scripted Agent Automation

A **Ralph Loop** runs Copilot CLI non-interactively inside a `while` loop. Each iteration starts with a **fresh context window** — avoiding the "Hoarders effect" where accumulated context degrades agent output quality over long tasks.

**The key insight**: state lives in files (`progress.txt`, the PRD checkboxes), not in the context window. Each iteration reads the current state from disk, does one unit of work, persists the result, and exits — keeping the context window clean and focused.

**When to use:**

- Implementing a large PRD with 10+ sequential tasks that would overflow a single chat session
- Repetitive migrations (applying the same pattern to many files)
- Fully automated periodic workflows (weekly summaries, changelog generation, dependency audits)

**Pattern — `scripts/ralph.sh`:**

```bash
#!/usr/bin/env bash
# Run from project root: bash scripts/ralph.sh
# Requires Copilot CLI: npm install -g @githubnext/github-copilot-cli
PRD=".github/prd/feature.prd.md"
PROGRESS="progress.txt"
MAX=20
COUNT=0

[ -f "$PROGRESS" ] || touch "$PROGRESS"

while grep -q "\- \[ \]" "$PRD" && [ "$COUNT" -lt "$MAX" ]; do
  COUNT=$((COUNT + 1))
  echo "=== Ralph iteration $COUNT ==="
  # --yolo auto-approves all tool calls; -p submits the prompt non-interactively
  copilot --yolo -p "$(cat .github/prompts/ralph-loop.prompt.md)"
done

echo "Loop complete after $COUNT iterations."
# Run quality gates once after the loop — not inside each iteration
pnpm lint && pnpm type-check && pnpm test
```

**Starter prompt — `.github/prompts/ralph-loop.prompt.md`:**

```markdown
You are running inside a Ralph Loop. Your context window is fresh each run.

1. Read `progress.txt` to understand what has already been done.
2. Read `.github/prd/feature.prd.md` and find the FIRST unchecked item (`- [ ]`).
3. Implement that one item completely. Do not start the next item.
4. Mark it done in the PRD: change `- [ ]` to `- [x]`.
5. Append a one-line summary to `progress.txt`.
6. Run `pnpm type-check` — fix any type errors before stopping.
7. Stop. Do not ask for confirmation.
```

**Safe-to-run checklist before starting a Ralph Loop:**

- [ ] The PRD uses `- [ ]` / `- [x]` checkboxes for every task
- [ ] `progress.txt` exists in the project root (empty is fine)
- [ ] No infra, AWS, or schema migrations are in the loop — use Default Approvals for those
- [ ] Quality gate (`pnpm lint && pnpm type-check && pnpm test`) runs after the loop, not inside each iteration
- [ ] `MAX` iterations is set conservatively — start at 20 and increase if needed

### Good candidates for the coding agent in this project

- Adding/updating Vitest unit tests for existing utilities
- Applying a new ESLint rule consistently across the codebase
- Updating dependencies with `pnpm update`
- Generating or improving `copilot-instructions.md` from existing code
- Adding Zod validation schemas for new API boundaries
- Migrating components to follow new accessibility patterns
- Writing Playwright E2E tests for existing flows
- Running batch maintenance tasks (dependency updates + multiple issue fixes at once) — use `/fleet` from Copilot CLI

### The 3-repetition rule

> If a task has been done manually 3 or more times, it is a candidate for automation with a coding agent.

Before starting a repetitive task (migration, bulk rename, pattern enforcement, data transformation), ask first: "Can I describe this as an agent task?" If yes, write it as an issue and assign it to Copilot instead of doing it by hand.

Examples of tasks that cross the threshold:

- You have renamed 3+ components to follow a new naming convention → agent task
- You have added the same Zod boundary check to 3+ API routes → agent task
- You have manually run the same data migration script 3+ times → automate it

### Copilot Code Review

Enable **GitHub Copilot code review** on the repository as a mandatory automated PR quality gate. It complements the local lint/tsc/test/build checklist by catching issues before human reviewers are involved. To enable: go to **Settings → Code review → Copilot code review** and toggle it on for the default branch.

### CodeRabbit Automated Review

This repository includes a `.coderabbit.yaml` configuration. For open-source repos, CodeRabbit is free and provides a second automated review layer that catches edge cases the Copilot code review may miss.

To activate: go to [coderabbit.ai](https://coderabbit.ai), sign in with GitHub, and install the GitHub App on this repository. On the first PR, CodeRabbit will pick up `.coderabbit.yaml` automatically.

**Copilot code review + CodeRabbit together**: when an agent opens a PR, both bots comment independently. The coding agent should iterate on both sets of comments before requesting human review.

---

## Closed Agent Loop

One of the most important patterns for effective autonomous coding is the **closed agent loop**: the agent can verify its own work end-to-end, without human intervention and without real credentials.

### How it works in this repo

1. **`pnpm test`** — Vitest covers all units. External services (auth, DB, third-party APIs) are mocked so the agent runs the full suite with zero credentials.
2. **`pnpm type-check`** — TypeScript catches structural errors before runtime.
3. **`pnpm lint`** — ESLint enforces every architecture convention automatically.
4. **`pnpm build`** — Next.js production build verifies server/client boundaries and bundle correctness.

The agent completes this loop (`pnpm lint && pnpm type-check && pnpm test && pnpm build`) before opening a PR. No human has to verify basic correctness — the gates do it.

### Rules for keeping the loop closed

- **Never commit real credentials** — use `.env.local` (gitignored). Mock external services in tests with `vi.mock()` or `vi.spyOn()`.
- **All external service calls must have a mock** — if you add a new third-party integration, add a corresponding `vi.mock()` in the test file and update `vitest.setup.ts` if it's shared.
- **Server Actions and Route Handlers must be testable in isolation** — extract logic into pure functions in `lib/` so they can be unit-tested without spinning up a server.
- **Do not add `test.skip` or `it.only` to make the loop pass** — fix the underlying issue.

### Example: mocking Auth.js in tests

```typescript
// Vitest — mock the auth() call so tests run without a real session
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "test-user-id", email: "test@example.com", name: "Test User" },
  }),
}));
```

### Why this matters for AI agents

When the agent loop is fully closed, an AI coding agent (GitHub Copilot, Cursor cloud agent, etc.) can:

- Run tests after every change without human approval
- Self-correct when tests fail
- Open PRs only when all quality gates pass
- Iterate with CodeRabbit/Copilot review bots autonomously

A broken loop (missing mocks, real credentials required, flaky tests) forces a human back into the loop at each step, negating most of the automation benefit.
