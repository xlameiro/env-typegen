# AGENTS.md — Task Execution Guide

This file is automatically discovered by AI agent runtimes (OpenAI, GitHub Copilot coding agent, etc.).

> **Primary instructions**: `.github/copilot-instructions.md` — read it first for stack, conventions, file naming, quality gates, and anti-patterns.

> **Living document**: If you discover something about this codebase that would help future tasks (e.g., a convention, a quirk, a gotcha), update `.github/copilot-instructions.md` immediately under `## Learnings` or the relevant section.

## Starting a New Project from This Template

> Read this section **before writing any code** when initializing a new project from this template.

### Initialization checklist

```bash
pnpm install    # also runs postinstall → auto-creates .env.local with a generated AUTH_SECRET
```

1. Fill in OAuth credentials in `.env.local` **only if the project uses authentication**
2. Update `lib/constants.ts` — change `APP_NAME`, `APP_DESCRIPTION`, `APP_VERSION`
   - `app/opengraph-image.tsx` is already wired to `APP_NAME` and `APP_DESCRIPTION` — updating constants is enough for OG image text
3. Replace or delete example pages (see table below)
4. Update `app/icon.tsx` with your favicon — the template ships a hardcoded "N" placeholder; change the letter and `stopColor` values to match your brand

### Template map — example vs scaffold

Files marked **Example** ship as working demonstrations. When starting a new project, **replace or delete them** — never add new pages alongside them.
Files marked **Scaffold** are infrastructure-level. Keep and extend them.

| File / Directory                 | Type                                            | Action                                                                                                                                     |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/page.tsx`                   | **Example** — template home page                | Replace with your home page                                                                                                                |
| `app/dashboard/`                 | **Example** — fake stats + search + Suspense    | Replace or delete entirely                                                                                                                 |
| `app/profile/`                   | **Example** — RHF + Server Action demo          | Replace or delete                                                                                                                          |
| `app/settings/`                  | **Example** — Zustand theme toggle demo         | Replace or delete                                                                                                                          |
| `app/auth/`                      | **Example** — Google OAuth pages                | Keep if using auth; delete if not                                                                                                          |
| `components/ui/google-icon.tsx`  | **Example** — Google SVG icon for OAuth buttons | Delete with `app/auth/` if removing auth                                                                                                   |
| `lib/stats.ts`                   | **Example** — fake dashboard data               | Delete with `app/dashboard/`                                                                                                               |
| `lib/constants.ts`               | **Scaffold**                                    | Keep — update `APP_NAME` etc.                                                                                                              |
| `lib/env.ts`                     | **Scaffold**                                    | Keep — add/remove env vars                                                                                                                 |
| `lib/errors.ts`                  | **Scaffold**                                    | Keep                                                                                                                                       |
| `lib/utils.ts`                   | **Scaffold**                                    | Keep                                                                                                                                       |
| `lib/schemas/`                   | **Scaffold** (partial example)                  | Keep; `userSchema`/`updateUserSchema` are only used by `app/profile/` — run `pnpm knip` after `clean:examples` to spot orphaned exports    |
| `components/ui/`                 | **Scaffold**                                    | Keep; build new UI on top                                                                                                                  |
| `hooks/`                         | **Scaffold**                                    | Keep; extend                                                                                                                               |
| `store/`                         | **Scaffold** (partial example)                  | Keep; `sidebarOpen` state is only used by `app/settings/` — `pnpm clean:examples` strips it automatically                                  |
| `proxy.ts`                       | **Scaffold**                                    | Keep with auth; simplify to passthrough if not                                                                                             |
| `app/layout.tsx`                 | **Scaffold**                                    | Keep — update metadata                                                                                                                     |
| `app/globals.css`                | **Scaffold**                                    | Keep — add design tokens                                                                                                                   |
| `app/error.tsx`                  | **Scaffold**                                    | Keep                                                                                                                                       |
| `app/not-found.tsx`              | **Scaffold**                                    | Keep                                                                                                                                       |
| `app/[locale]/` or `app/[lang]/` | **Not in template** — add for multi-locale      | See `.github/instructions/i18n.instructions.md` for the full Tier 2 (DIY) / Tier 3 (next-intl) setup. Adding this restructures ALL routes. |
| `i18n/`, `messages/`             | **Not in template** — add for multi-locale      | Created as part of Tier 3 (next-intl) setup. See i18n instructions before creating.                                                        |

### Rule: Replace, never add

**Never create a new page if an example page with the same route exists — replace it.**
The template ships with `app/page.tsx`, `app/dashboard/page.tsx`, etc. already. Adding a second `page.tsx` alongside them is a routing conflict.

### If the project does NOT use authentication

When the user says "no auth" or "no authentication":

1. Delete `app/auth/`
2. Delete `app/dashboard/`, `app/profile/`, `app/settings/` (all use `requireAuth()`)
3. Replace `proxy.ts` with a passthrough:
   ```ts
   export default function () {}
   export const config = { matcher: [] };
   ```
4. `AUTH_SECRET` is already optional — no `.env.local` change required
5. Remove `import { requireAuth }` from any page you create

### Example-vs-scaffold quick identification

All example files have a `@template-example` JSDoc marker at the top:

```ts
/**
 * @template-example
 * ...
 */
```

Search the codebase: `grep -r "@template-example" app/ lib/` to find every file that must be replaced.

---

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

### Branch Protection (required for safe Dependabot auto-merge)

Branch protection on `main` ensures Dependabot PRs can only auto-merge after CI passes. Without it, `dependabot-automerge.yml` merges immediately regardless of test results. Enable once with the GitHub CLI:

```bash
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["Quality Gate", "E2E Tests"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

Or via the UI: **Settings → Branches → Branch protection rules** → add rule for `main` → **Require status checks to pass** → select `Quality Gate` and `E2E Tests`.

### Rate Limiter — Single-Instance Limitation

The rate limiter in `lib/rate-limit.ts` uses an **in-memory** sliding window (a `Map` scoped to the Node.js process). This works correctly for:

- Local development
- Single-container / single-Vercel-function deployments

It does **not** share state across multiple replicas or horizontally scaled deployments. If you deploy with multiple instances, replace the in-memory store with a distributed store such as **Upstash Redis** or **Vercel KV**. The `createRateLimiter` API stays the same — only the backing store changes.

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

## Large-Scope Planning: Multi-Session Chaining

When you ask the Planner to cover a broad scope ("audit the whole project", "review all components", "analyse everything"), a single session may not be enough to read every file. The Planner detects this via its **Scope and Context Fit Check** (Step 0) and declares one of two modes:

| Mode                   | When                                                | Behaviour                                                                               |
| ---------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **A — Single Session** | ≤ 40 files, ≤ 3 domains                             | Reads all files, produces the complete plan in one pass                                 |
| **B — Multi-Session**  | > 40 files, > 3 domains, or any "audit all" request | Splits work into batches; each session ends with a checkpoint and a handoff instruction |

### How to chain sessions (Mode B)

1. **Session 1** — scope inventory + domain classification. The Planner saves a checkpoint to session memory and ends with: `"Batch 1 of M complete. Continue with [Planner — Batch 2: <next domain>]"`.
2. **Sessions 2…N** — domain analysis. Each one reads the prior checkpoint, covers one domain, updates the checkpoint, and hands off to the next.
3. **Final session** — consolidation. Reads all checkpoints and produces the complete plan with Coverage Report and Confidence & Limits.

### What makes a plan trustworthy

Every Planner output includes two mandatory sections:

- **Coverage Report** — directories/files actually read, which were skipped and why, estimated coverage percentage.
- **Confidence and Limits** — confidence level (High / Medium / Low), assumptions made for unread areas, and residual risks.

A plan that omits these sections should be treated as a draft that requires further investigation before implementation starts.

### Execution Phases — brownfield and large-migration plans

Mode B handles **analysis** in batches (how the Planner reads the codebase). Execution Phases handle **implementation** in sessions — preventing the Feature Builder from losing focus mid-migration.

When a plan contains an `## Execution Phases` section, the Feature Builder implements **one phase per session** and then stops. After passing the quality gate, it emits a **Continuation Block** — a self-contained block of text you paste into a fresh session to start the next phase with exactly the context needed and none of the noise.

**Why not `/fork`?** `/fork` copies the full conversation history. After a long planning session, that history is already large — pasting it into the next session recreates the same "Hoarders-effect" context overload that caused the original problem. The Continuation Block gives the new session only the essential delta: files changed, key decisions, quality gate status, and the next phase's scope.

| Pattern          | Handles                 | Use when                                             |
| ---------------- | ----------------------- | ---------------------------------------------------- |
| Mode B sessions  | Analysis batching       | Codebase too large to analyse in one pass            |
| Execution Phases | Implementation batching | Plan > 8 steps, > 1 domain, or brownfield migration  |
| Ralph Loop       | Automated repetition    | Same pattern applied to many files, fully unattended |
| Test-Fix Loop    | Quality gate repair     | All implementation done, tests still failing         |

**Phase boundary rule:** Every phase boundary must be a point where `pnpm build` succeeds and all existing tests pass. Good split points: after data layer (schemas + DB functions), after API routes, after Server Components, after Client Components + tests.

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
5. Monitor progress in the session logs; the agent self-reviews its own PR and runs built-in security scanning before opening the PR — a separate `gh pr review --request-review copilot` call is no longer needed for the initial review

**Batch-assign the backlog** — Don't limit yourself to one ticket at a time. Identify a chunk of low-risk issues (UI polish, accessibility fixes, missing tests, deprecated API updates) and assign them all to Copilot at once. The agent works on each in parallel or sequentially and opens individual PRs per issue. Use `/fleet` from the CLI for the same effect without going through the GitHub UI:

```
/fleet solve issues #12, #18, #24, and #31
```

This is especially effective for issues that "nobody wants to deal with" — backlog debt that accumulates because no single ticket justifies interrupting focused work.

### VS Code Local Agent Features (Preview)

These features in VS Code >= 1.110 significantly improve the agent's ability to develop, verify, and execute tasks without leaving the editor.

**Integrated Browser** — Enable in VS Code Settings (search "Integrated Browser"). Runs a full browser inside VS Code. Click **Share with agent** to give the agent Playwright-equivalent tools: navigate, screenshot, inspect, scroll. Best paired with Playwright tests so the agent can visually verify UI changes and self-correct in a tight feedback loop.

**Approval modes** (Chat input → **default approvals** dropdown):

| Mode              | What it does                                                                                 | When to use                                                             |
| ----------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Default Approvals | Prompts before each tool call (terminal, MCP, file write)                                    | Infra, schema changes, AWS, irreversible operations                     |
| Bypass Approvals  | Auto-approves tool calls but **still pauses for clarifying questions and terminal input**    | When you want speed without approving each tool call; still interactive |
| Autopilot         | Bypass + auto-retry on API errors + forceful completion; **never asks clarifying questions** | Default for all feature work — fully unattended execution               |
| Sandbox           | Bypass Approvals + process/network isolation                                                 | Testing untrusted code or external-facing operations                    |

> **Default for this project**: use **Autopilot** for all feature work. Switch to **Default Approvals** whenever you are touching AWS resources, database schema, or environment secrets. Use **Sandbox** when the agent will execute code from untrusted sources.

> Both features are available in VS Code 1.111 Stable. Check `configure chat → diagnostics` if either is not behaving as expected. Enable Autopilot via the `chat.autopilot.enabled` setting or from the Chat input → **default approvals** dropdown.

**Auto-commit hook (opt-in)** — When an agent session stops, you can automatically commit all pending changes to prevent losing generated work. A ready-made script lives at `.github/hooks/scripts/session-stop-autocommit.sh`. To activate, add the following entry to `.github/hooks/hooks.json`:

```json
{
  "event": "Stop",
  "script": ".github/hooks/scripts/session-stop-autocommit.sh"
}
```

The script only commits if there are pending changes, never uses `--no-verify`, and always appends `[skip ci]` to the commit message. See `copilot-instructions.md § VS Code Agent Hooks` for the full hooks reference.

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

### Recommended Multi-Model Workflow

The most robust implementation flow — validated by GitHub Copilot CLI's own PM team:

1. **Generate the plan** — open the CLI in plan mode and describe the feature. Answer the clarifying questions the agent presents (this saves tokens vs. back-and-forth).
2. **Multi-model plan review** — before implementing, ask the agent to spin up three parallel sub-agents to review the plan independently:
   ```
   Spin up parallel sub-agents using Opus 4.6, Codex, and Gemini to review the plan and give feedback.
   ```
   The agent will report where the three models agreed, where they diverged, and offer to merge the best recommendations into the plan.
3. **Fleet implement** — once the plan is approved, enable autopilot mode and run:
   ```
   /fleet implement the plan
   ```
   Fleet dispatches parallel agents for independent tasks; autopilot keeps looping until the to-do list is empty.
4. **Multi-model code review** — after implementation, run a final parallel review:
   ```
   Spin up parallel sub-agents using Opus 4.6, Codex, and Gemini to review the changes before I push.
   ```
   Agents often surface different classes of issues — race conditions, thread safety, logic bugs — that a single model misses.

This workflow works identically from the VS Code integrated terminal and from a standalone terminal session.

### Ralph Loops — Scripted Agent Automation

A **Ralph Loop** runs Copilot CLI non-interactively inside a `while` loop. Each iteration starts with a **fresh context window** — avoiding the "Hoarders effect" where accumulated context degrades agent output quality over long tasks.

**The key insight**: state lives in files (`progress.txt`, the task list), not in the context window. Each iteration reads the current state from disk, does one unit of work, persists the result, and exits — keeping the context window clean and focused.

**When to use:**

- Implementing a large PRD with 10+ sequential tasks that would overflow a single chat session
- Repetitive migrations (applying the same pattern to many files)
- Fully automated periodic workflows (weekly summaries, changelog generation, dependency audits)

> **Claude Code native alternative**: Claude Code v2.1.71+ includes a built-in `/loop <interval> <prompt>` command (e.g. `/loop 5m check the deploy`) and cron scheduling tools. For simple recurring prompts within a live session, `/loop` is lighter than the shell script. The full Ralph Loop (`scripts/ralph.sh` + `features.json`) remains the right pattern for complex PRD-driven sequences where each iteration needs a fresh context window.

#### Phase 0 — Initializer agent (run once before the loop)

Before starting a Ralph Loop, run a one-shot **initializer agent** to bootstrap the environment. Based on Anthropic's Claude Code experiments, this dramatically reduces the "agent guesses at state" problem:

```
/init-agent <goal>
```

Or invoke `.github/prompts/init-agent.prompt.md` directly:

```bash
copilot --yolo -p "$(cat .github/prompts/init-agent.prompt.md)" -- "$GOAL"
```

The initializer produces:

1. **`init.sh`** — starts the dev server so every subsequent session can boot immediately without setup
2. **`features.json`** — machine-readable task list with `pass`/`fail` state per task (see schema below)
3. **`progress.txt`** — empty file for the loop to append summaries into
4. **Initial git commit** — records which files exist at baseline so agents can read `git log` to understand what changed

**`features.json` schema** (machine-readable, preferred over markdown checkboxes for precision):

```json
[
  {
    "id": "feat-001",
    "title": "User authentication with email/password",
    "spec": "Implement sign-in and sign-up pages using Auth.js v5 credentials provider. Validate inputs with Zod. Return typed errors. Cover with Vitest unit tests and a Playwright E2E test.",
    "priority": 1,
    "status": "fail"
  },
  {
    "id": "feat-002",
    "title": "Dashboard page with stats section",
    "spec": "Server Component. Fetch stats from lib/stats.ts. Wrap in <Suspense> with a skeleton fallback. No 'use client'.",
    "priority": 2,
    "status": "fail"
  }
]
```

> All tasks start as `"status": "fail"`. The agent marks each `"pass"` after verifying the implementation works end-to-end. This prevents premature completion claims — a common failure mode when using markdown checkboxes.

**When to use `features.json` vs markdown `- [ ]` checkboxes:**

| Approach         | Best for                                                       |
| ---------------- | -------------------------------------------------------------- |
| `features.json`  | 10+ tasks, long-running loops, when spec detail matters        |
| Markdown `- [ ]` | Short PRDs (≤10 tasks), human-readable tracking, quick scripts |

#### Pattern — `scripts/ralph.sh` (markdown PRD variant)

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
2. Read `features.json` (preferred) or `.github/prd/feature.prd.md` to find the FIRST incomplete task.
   - In `features.json`: pick the lowest-priority `"status": "fail"` entry.
   - In markdown PRD: find the FIRST unchecked item (`- [ ]`).
3. Implement that one task completely. Do not start the next task.
4. Mark it done:
   - In `features.json`: set `"status": "pass"`.
   - In markdown PRD: change `- [ ]` to `- [x]`.
5. Run `init.sh` to start the dev server (if not already running), then verify the feature works end-to-end.
6. Append a one-line summary to `progress.txt`.
7. Commit: `git add <changed files> && git commit -m "feat(<id>): <short description>"`.
8. Run `pnpm type-check` — fix any type errors before stopping.
9. Stop. Do not ask for confirmation.
```

**Safe-to-run checklist before starting a Ralph Loop:**

- [ ] Phase 0 complete: `init.sh`, `features.json` (or markdown PRD), and `progress.txt` exist
- [ ] No infra, AWS, or schema migrations are in the loop — use Default Approvals for those
- [ ] Quality gate (`pnpm lint && pnpm type-check && pnpm test`) runs after the loop, not inside each iteration
- [ ] `MAX` iterations is set conservatively — start at 20 and increase if needed

### Test-Fix Loop — Automated Quality Gate Cycle

A **Test-Fix Loop** uses a fast model (Haiku, GPT-4o mini) in Autopilot mode to run the test suite, fix any failing tests, and re-run until everything is green. Each iteration is cheap and fast — ideal for the final stage after a feature is functionally complete.

**When to use:**

- After a feature is implemented but tests are still failing (compile errors, broken assertions)
- When refactoring a module and tests break unexpectedly
- When a dependency upgrade causes test regressions across many files
- For quick iteration on test correctness without touching business logic

**Starter prompt (in VS Code Chat with Autopilot + fast model):**

```
Run `pnpm test -- --run --reporter=verbose`. For every failing test:
1. Read the failure message carefully.
2. Determine whether the source code or the test is wrong.
   - If the source code has a bug, fix it.
   - If the test has a wrong assertion, fix the test.
3. Do NOT skip or comment out failing tests.
4. After all fixes, run `pnpm test -- --run` again.
5. Repeat until the full test suite passes.
6. Run `pnpm type-check` as a final check. Stop only when both pass.
```

**Rules for keeping the loop safe:**

- Use a **fast model** — iteration speed matters more than reasoning depth here
- Use **Autopilot mode** — the loop must run without interruption
- Never use `test.skip`, `it.only`, or `describe.only` to force green — fix the root cause
- If the same test fails 3 times in different ways, stop and escalate to a more powerful model (Sonnet/o3-Codex) — the root cause is likely architectural, not a simple fix

> **Difference from Ralph Loop**: A Ralph Loop implements features sequentially from a PRD. A Test-Fix Loop only repairs a broken test suite — it does not add functionality. Keep them separate.

### Good candidates for the coding agent in this project

- Adding/updating Vitest unit tests for existing utilities
- Applying a new ESLint rule consistently across the codebase
- Updating dependencies with `pnpm update`
- Generating or improving `copilot-instructions.md` from existing code
- Adding Zod validation schemas for new API boundaries
- Migrating components to follow new accessibility patterns
- Writing Playwright E2E tests for existing flows — use `.agents/skills/playwright-expert/SKILL.md` or the official [Playwright CLI skills](https://playwright.dev/docs/cli) mode (token-efficient, shipped in v1.58.0 at `playwright-cli`)
- Running batch maintenance tasks (dependency updates + multiple issue fixes at once) — use `/fleet` from Copilot CLI
- Running a full OWASP security audit — use `.github/prompts/security-audit.prompt.md`
- Applying Lighthouse performance/accessibility fixes — use `.github/prompts/lighthouse-audit.prompt.md`
- Extracting design tokens from a mockup — use `.github/prompts/extract-design-tokens.prompt.md`
- Creating PRs with embedded UI screenshots — ask the agent to use the integrated browser (shared with agent) to navigate the running app, take screenshots, commit the assets, and open a PR via the GitHub CLI with the screenshots embedded in the description: _"Take screenshots of the changes and open a PR with those images"_

### Cross-Functional Team Workflows

AI agents don't only accelerate solo developer work — they unlock new collaboration patterns where designers, PMs, and developers hand off directly through the codebase instead of through meeting notes and design mockups.

**The core shift**: instead of the traditional waterfall (meetings → specs → designs → implementation → review), each role contributes directly to code and hands off to the next person at the code level.

| Role      | What they can do with agents                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------- |
| PM        | Assign backlog tickets directly to Copilot; provide a working prototype for engineers to build on top of |
| Designer  | Open a branch, use a visual editor (Builder.io, V0, Lovable) to polish UI, send a PR                     |
| Developer | Review PR from designer/PM, tag the bot in comments for cleanups, merge                                  |

**What this means for developers in this project**

- When handing off a first-pass UI implementation, share the running preview URL (via `pnpm dev`) rather than a screenshot
- When a designer sends a PR with visual changes, tag Copilot in the review to clean up any structural or naming issues before you merge — don't reject the PR just because the component structure isn't perfect
- When a PM opens an issue or attaches a prototype, treat it as a valid starting point for `/fleet` or a Copilot issue assignment — close the loop by merging, not by rewriting from scratch

---

### Daily Developer Workflow (VS Code + CLI)

This template is optimized to work with both **VS Code Copilot** (side panel + inline chat) and the **GitHub Copilot CLI** (terminal). Use whichever surface fits the task — they share context via `.github/copilot-instructions.md` and `.agents/skills/`.

**Morning standup** (CLI only):

```bash
gh copilot chronicle standup
```

Summarizes open sessions and unresolved tasks from the previous day — your AI-powered standup.

**End of day — improve your prompting** (CLI only):

```bash
gh copilot chronicle tips
```

Copilot indexes your sessions, checks the docs, and tells you how you could have prompted more efficiently. Treats patterns it spots (recurring tasks, long prompts that should be skills, underused features) as actionable tips.

**Editing long prompts in your editor**:
Press `Ctrl+G` in the CLI to open the current prompt in `$EDITOR` (VS Code, Vim, etc.) — useful when the prompt spans multiple paragraphs.

**Checking context window usage**:

```bash
/context
```

Shows what percentage of the model's context window is consumed by installed tools and MCP servers. If you're hitting compaction earlier than expected, this is the first thing to check.

**VS Code ↔ CLI continuity**: open the CLI inside VS Code's integrated terminal — it reads open files and shows diffs in VS Code's diff viewer. Sessions can be resumed from either surface with `gh copilot resume`.

**Request Copilot code review from the terminal**:

```bash
gh pr review --request-review copilot
```

Requests a Copilot review on the open PR directly from the terminal — no need to visit GitHub.com. Combine with `gh pr create --draft` for a fully terminal-driven PR workflow: open draft → Copilot reviews → address comments → mark ready.

**Message Steering — ajustar al vuelo**:
While the agent is working, send a follow-up message in the chat with additional details or corrections — the agent incorporates it **mid-flight** without stopping or waiting. No need to cancel and restart the session to add context.

**Fork de conversación** (`/fork`):
Type `/fork` in the chat to create a new session with the full conversation history. Ideal for exploring an alternative approach (e.g., a more minimal design, a different implementation strategy) without losing the original context.

---

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

## Agentic Workflows — GitHub Actions in Markdown

> **Reference**: [github.github.com/ghaww](https://github.github.com/ghaww) — official examples library.

Agentic Workflows let you write GitHub Actions workflows as **Markdown files** instead of YAML, placed in `.github/workflows/`. The AI agent reads the Markdown instructions and executes CI/CD tasks — running tests, generating reports, triaging issues — without you writing a single line of YAML.

### How they work

A Markdown workflow file lives at `.github/workflows/<name>.md`. Its frontmatter declares permissions, imported tools, and steps; the Markdown body contains natural-language instructions for the agent:

```markdown
---
name: Nightly Issue Triage
on:
  schedule:
    - cron: "0 2 * * *"
permissions:
  issues: write
  contents: read
---

## Instructions

Review all open issues labeled `needs-triage`. For each:

1. Identify if it's a bug, feature request, or question.
2. Add the appropriate label.
3. Leave a comment asking for reproduction steps if it's a bug with no steps provided.
```

### Guard rails

Guard rails are declared in the workflow frontmatter and enforced **outside the agent loop** — the agentic workflow compiler acts as a firewall between the agent and the outside world. The agent cannot override them via prompt.

**`safe-outputs`** — constrain what the agent is allowed to produce per run:

```yaml
safe-outputs:
  - type: pull-request
    max: 1 # at most 1 PR per execution; prevents runaway PR spam
  - type: nothing # agent may also decide no action is needed
```

**`tools` allowlist** — restrict which domains the web-fetch tool can reach. Any domain not listed is blocked, even if the agent tries to access it:

```yaml
tools:
  - web-fetch:
      domains:
        - docs.nextjs.org
        - github.com
        - npmjs.com
```

> **Security note**: these constraints are structurally enforced — not prompt instructions the agent could reason its way around. Always declare `safe-outputs` before enabling any workflow that can write to the repository or open PRs. See `security-and-owasp.instructions.md` for the broader principle of least-privilege.

### Good candidates for Agentic Workflows in this project

| Use case                                                                                                                                                            | Trigger                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Auto-label and triage new issues                                                                                                                                    | `issues: opened`              |
| Generate a weekly changelog from merged PRs                                                                                                                         | `schedule` (weekly cron)      |
| Check that `pnpm knip` reports zero unused exports                                                                                                                  | `push` to `main`              |
| Post a dependency audit summary as a PR comment                                                                                                                     | `pull_request`                |
| Close stale issues after 30 days of inactivity                                                                                                                      | `schedule` (daily cron)       |
| **Super-dependabot**: detect new `next`/`react` releases, review changelog, handle breaking changes, open upgrade PR                                                | `schedule` (weekly cron)      |
| **CI doctor**: when a CI workflow fails on `main`, diagnose the root cause and open a fix PR                                                                        | `workflow_run: completed`     |
| **Documentation drift**: detect when `README.md` or `/docs` diverge from the actual exported API or file structure                                                  | `push` to `main`              |
| **Accessibility review**: scan modified `*.tsx` components against WCAG 2.2 AA rules and comment violations on the PR                                               | `pull_request`                |
| **Bug fix from stack trace**: read exception stack traces in new bug reports, determine if the fault is in project code, open fix PR                                | `issues: labeled (bug)`       |
| **Automated bug triage**: label an issue `ai-triage` → agent locates root cause, writes failing test, fixes, opens draft PR — see `.github/workflows/bug-triage.md` | `issues: labeled (ai-triage)` |

### When to use vs. standard GitHub Actions YAML

| Scenario                                                                             | Use                         |
| ------------------------------------------------------------------------------------ | --------------------------- |
| Complex CI/CD with shell commands, matrix builds, Docker                             | Standard YAML workflow      |
| High-level automation driven by natural language (triage, reports, issue management) | Agentic Workflow (Markdown) |

> Run a workflow manually from the GitHub UI: **Actions → select workflow → Run workflow**.

---

## Harness Engineering — Long-Running Agent Systems

> **Harness engineering** (coined by the Anthropic team, 2025–2026) is the discipline of designing the _system around_ an agent rather than optimising a single prompt. Prompt/context engineering maximised the output of one session; harness engineering targets multi-session coordination — how each fresh session starts with a legible environment, how the agent verifies its own output, and what tooling it needs to operate reliably across sessions.

Three principles derived from Anthropic, OpenAI Codex, and Vercel internal evals:

| Principle                  | What it means                                                                                       | Implementation in this template                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Legible environment**    | Every new session must quickly understand the state of work without relying on conversation history | `AGENTS.md` as documentation ToC, `progress.txt`, `features.json` task list, descriptive git commits |
| **Fast verification loop** | The agent must be able to test its own output end-to-end — unit tests alone are insufficient        | Closed Agent Loop (`pnpm test + build`), Playwright/Puppeteer MCP for browser verification           |
| **Generic tooling**        | Large models perform better with generic shell commands than bespoke JSON tool-call schemas         | Prefer a single batch shell command tool over multiple specialised domain tools                      |

### Repository as System of Record

Treat the repository as the definitive source of truth for every agent session — not the conversation history or a human's memory. If information cannot be accessed from the repository, the agent effectively doesn't know it.

**Documentation index pattern** — for large or long-running projects, `AGENTS.md` should be a lightweight _table of contents_ linking to separate docs files rather than a monolithic reference. Create a `docs/` directory and link to it from `AGENTS.md` as the project grows:

```
docs/
  architecture.md      # Component boundaries, data flows, key decisions
  execution-plan.md    # Current sprint tasks, feature roadmap
  db-schema.md         # Database schema and migration notes
  security.md          # Auth model, threat model summary
  frontend-plan.md     # UI component inventory, design system notes
```

When these files exist, add a `## Documentation Index` section at the top of `AGENTS.md`:

```markdown
## Documentation Index

- Architecture: `docs/architecture.md`
- Current execution plan: `docs/execution-plan.md`
- DB schema: `docs/db-schema.md`
- Security model: `docs/security.md`
```

> OpenAI's Codex team failed with a single giant `AGENTS.md` — too much context for any agent session to manage. Splitting into linked documents with `AGENTS.md` as an index solved the problem.

### Generic Tools Over Specialised Tools

Vercel's text-to-SQL agent replaced months of bespoke tooling with a **single batch shell command tool** (run `grep`, `npm run`, `eslint`, etc. natively):

- **3.5× faster** execution
- **37% fewer tokens** consumed
- Success rate: **80% → 100%**

Anthropics Claude Code team reported the same finding independently: one batch command tool outperformed multiple specialised JSON tool-call definitions.

**Why it works**: large models have billions of training tokens on `grep`, `curl`, `npm run`, and shell pipelines. They execute these reliably. Bespoke JSON schemas require the model to produce structured output it has seen far less of.

**Implication for MCP server design**: expose a single `run_command` tool rather than multiple specialised tools by default. Add specialisation only when a generic approach demonstrably fails. See also § MCP Servers in `copilot-instructions.md`.

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

### Browser DevTools MCP for end-to-end verification

Unit tests (`pnpm test`) and TypeScript checking catch structural bugs, but they repeatedly fail to detect integration issues: a feature that passes all unit tests can still render broken UI, produce ARIA violations, or navigate incorrectly in the real browser.

For long-running agent tasks, wire a browser automation tool into the agent runtime so it can verify E2E correctness autonomously:

**Option 1 — VS Code Integrated Browser (already available)**: Enable in VS Code Settings → search "Integrated Browser". Click **Share with agent** to give the agent Playwright-equivalent access: navigate, screenshot, inspect, scroll. The agent can take screenshots and compare rendered output against the intended design.

**Option 2 — Playwright MCP**: The `mcp_microsoft_pla_*` tools (already registered in this project) give the agent programmatic browser control. Instruct the agent to:

```
After implementing a UI change, use mcp_microsoft_pla_browser_navigate to open the dev server,
take a screenshot with mcp_microsoft_pla_browser_take_screenshot, and verify the feature works visually.
```

**Option 3 — Puppeteer MCP**: For headless CI environments, a Puppeteer MCP server provides DOM snapshots and navigation without a display. Add to `.vscode/mcp.json` if needed.

> Anthropic's Claude Code experiments showed that agents wiring browser tools caught and fixed bugs that were completely invisible from code analysis alone — including layout shifts, broken navigation, and missing ARIA attributes.

### Why this matters for AI agents

When the agent loop is fully closed, an AI coding agent (GitHub Copilot, Cursor cloud agent, etc.) can:

- Run tests after every change without human approval
- Self-correct when tests fail
- Open PRs only when all quality gates pass
- Iterate with CodeRabbit/Copilot review bots autonomously

A broken loop (missing mocks, real credentials required, flaky tests) forces a human back into the loop at each step, negating most of the automation benefit.

---

## AI Safety Controls

A consolidated reference of all guardrails that prevent the AI development system from producing broken, insecure, or convention-violating code. Read this before adding, removing, or changing any agent, hook, or workflow.

### Pre-generation guardrails (prevent bad output)

| Control                    | Where                                              | What it does                                                                                                                                                                   |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `preToolUse` hook          | `.github/hooks/scripts/session-start.sh`           | Scans every file write for 21 secret patterns (tokens, keys, DSNs) before content reaches disk                                                                                 |
| Feature Builder pre-flight | `.github/agents/feature-builder.agent.md`          | Forces `next-devtools-init` → skill load → Documentation Declaration **before any code is written** — prevents stale Next.js 13/14 patterns                                    |
| Context-map pre-flight     | `.github/agents/feature-builder.agent.md` step 0.3 | Invokes `context-map` skill to identify blast radius; reads `.context.md` invariants for complex components — prevents Pitfall #10 (silent deletion of existing functionality) |
| Instruction files (15)     | `.github/instructions/`                            | Per-directory coding standards auto-applied by Copilot (React, Next.js, TypeScript, a11y, security, testing, etc.)                                                             |
| Prompt injection guard     | `.github/workflows/bug-triage.md`                  | Issue content treated as untrusted; halts and labels `invalid` if prompt-injection patterns detected                                                                           |

### Post-generation guardrails (catch bad output before merge)

| Control                | Where                                        | What it does                                                                                                         |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `sessionEnd` hook      | `.github/hooks/scripts/session-end-check.sh` | Full quality gate (`pnpm lint && pnpm type-check && pnpm test && pnpm build`) runs at the end of every agent session |
| git pre-commit         | `.husky/pre-commit`                          | Commitlint enforces conventional commits; lint-staged runs ESLint on staged files                                    |
| Skills integrity check | `scripts/verify-skills.mjs` + CI `ci.yml`    | SHA-256 hashes of all 43 external SKILL.md files verified in CI — detects tampering or unreviewed updates            |
| CodeQL SAST            | `.github/workflows/codeql.yml`               | Static security analysis on every push and PR                                                                        |
| Copilot code review    | GitHub Settings → Code review                | Automated PR review by Copilot before human reviewers                                                                |
| CodeRabbit review      | `.coderabbit.yaml`                           | Second automated review layer (free for open-source repos)                                                           |

### Agentic workflow guardrails

| Control                                       | Where                                         | What it does                                                                                                                |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `safe-outputs`                                | `.github/workflows/bug-triage.md` frontmatter | Limits agent to at most 1 PR per run; permits "nothing" — prevents runaway PR spam                                          |
| Domain allowlist                              | `.github/workflows/bug-triage.md` frontmatter | `web-fetch` limited to `github.com` and `npmjs.com` — prevents data exfiltration                                            |
| `safe-outputs` / `tools` compiler enforcement | Agentic workflow runtime                      | These constraints are structurally enforced outside the agent loop — the agent cannot reason its way around them via prompt |

### Updating the skills baseline

When skills are intentionally updated (e.g., after `pnpm skills:update`), commit the updated `skills-lock.json` as part of the same PR that updates the SKILL.md files:

```bash
node scripts/verify-skills.mjs --update   # regenerate hashes from current local SKILL.md files
git add skills-lock.json
git commit -m "chore: update skills-lock.json hashes"
```

The CI step (`pnpm skills:verify`) will then pass against the new baseline.
