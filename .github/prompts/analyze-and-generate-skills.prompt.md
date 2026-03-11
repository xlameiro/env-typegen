---
name: "Analyze & Generate Skills"
agent: "agent"
description: "Analyze the codebase and auto-generate project-specific skills. Launches 8 parallel sub-agents — one per domain — that read real project code and produce SKILL.md files anchored to the actual patterns used here. Run once after cloning the template or after a significant refactor. Output goes to .agents/skills/project-*/SKILL.md."
tools: [vscode, execute, read, agent, edit, search, web, "github/*", todo]
---

You are a senior Next.js 16 engineer generating project-specific skills for this codebase. These skills will be loaded by GitHub Copilot on future tasks, giving the agent a deep, concrete understanding of the actual patterns used here — not generic best practices.

## Rule precedence

- Use `.github/copilot-instructions.md` as the canonical source for cross-cutting repository conventions.
- Use `.github/instructions/INDEX.md` to load directory-specific instructions before writing any skill.
- If this prompt conflicts with those sources, follow the instruction files and update this prompt accordingly.

## What you will produce

8 new skills under `.agents/skills/`, each in its own subdirectory with a `SKILL.md` file. Each skill is anchored to the **actual code in this repository** — not invented examples.

```
.agents/skills/
  project-auth-patterns/SKILL.md
  project-server-actions/SKILL.md
  project-ui-components/SKILL.md
  project-zustand-store/SKILL.md
  project-zod-schemas/SKILL.md
  project-api-routes/SKILL.md
  project-testing-patterns/SKILL.md
  project-page-patterns/SKILL.md
```

## SKILL.md format

Every generated skill must follow this exact structure:

```markdown
---
name: "project-<domain>"
description: "<trigger-aware description — explain WHEN Copilot should load this skill>"
---

# Project <Domain> Patterns

## Overview

2–3 sentences describing how <domain> is implemented in this specific codebase.

## Key Files

List of actual files in this repo relevant to this domain.

## Patterns

### Pattern 1 — <Name>

Explanation + real code snippet copied from the repo.

### Pattern 2 — <Name>

...

## BAD / GOOD Examples

At least 2 pairs showing what NOT to do vs. the actual project convention.

## Quick Reference

A checklist or table for fast scanning.
```

## Step-by-step process

### Step 1 — Read project conventions

Read these files before doing anything else:

- `.github/copilot-instructions.md` (canonical rules)
- `.github/instructions/INDEX.md` (directory-specific rules)

### Step 2 — Launch 8 parallel sub-agents

Dispatch all 8 analysis sub-agents simultaneously. Each sub-agent is responsible for one domain. Give each sub-agent the following instruction template, substituting the domain-specific values:

---

**Sub-agent instruction template:**

```
You are analyzing the <DOMAIN> patterns in a Next.js 16 codebase.

Your job: read the files listed below, extract the real patterns used, and write a SKILL.md file to `.agents/skills/<SKILL-NAME>/SKILL.md`.

Files to read:
<FILE-LIST>

The skill must:
1. Have a YAML frontmatter with `name` and `description` fields
2. Use ONLY code and patterns found in the files above — no invented examples
3. Include a "Key Files" list, "Patterns" section, "BAD/GOOD Examples" (2+ pairs), and "Quick Reference"
4. The `description` field must explain WHEN to trigger this skill (what user phrases or task types should load it)

Write the file when done. Do not ask for confirmation.
```

---

### Domain assignments for sub-agents

| Sub-agent | Skill name                 | Files to read                                                                                                                                       |
| --------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | `project-auth-patterns`    | `auth.ts`, `lib/auth.ts`, `proxy.ts`, `app/auth/**`, `.github/instructions/security-and-owasp.instructions.md`                                      |
| 2         | `project-server-actions`   | `app/**/actions.ts`, `app/profile/actions.ts`, `.github/copilot-instructions.md` (§Server Actions section)                                          |
| 3         | `project-ui-components`    | `components/ui/**`, `.github/instructions/reactjs.instructions.md`, `.github/instructions/a11y.instructions.md`                                     |
| 4         | `project-zustand-store`    | `store/**`, `.agents/skills/zustand/SKILL.md`                                                                                                       |
| 5         | `project-zod-schemas`      | `lib/schemas/**`, `.agents/skills/zod/SKILL.md`                                                                                                     |
| 6         | `project-api-routes`       | `app/api/**`, `.github/instructions/security-and-owasp.instructions.md`                                                                             |
| 7         | `project-testing-patterns` | `**/*.test.ts`, `**/*.test.tsx`, `tests/**`, `vitest.setup.ts`, `vitest.config.ts`, `.github/instructions/nodejs-javascript-vitest.instructions.md` |
| 8         | `project-page-patterns`    | `app/**/page.tsx`, `app/**/layout.tsx`, `app/**/loading.tsx`, `app/**/error.tsx`, `.github/instructions/nextjs.instructions.md`                     |

### Step 3 — Wait for all sub-agents to complete

Do not proceed until all 8 sub-agents have written their skill files.

### Step 4 — Validate each skill

For each generated `.agents/skills/project-*/SKILL.md`, verify:

- [ ] YAML frontmatter has `name` and `description`
- [ ] `description` explains WHEN to trigger (not just what it does)
- [ ] At least 2 BAD/GOOD example pairs, using actual repo code
- [ ] "Key Files" lists real paths from this repo
- [ ] No invented code — all snippets copied from the codebase
- [ ] No `interface` keyword — uses `type` (project convention)
- [ ] No `any` type annotations

If any skill fails validation, fix it inline before reporting.

### Step 5 — Report

Print a summary table:

```
## Skills Generated ✅

| Skill | Key Patterns Captured | File |
|---|---|---|
| project-auth-patterns | Auth.js v5, proxy.ts auth, sign-in/sign-up flow | .agents/skills/project-auth-patterns/SKILL.md |
| project-server-actions | ... | ... |
| ... | ... | ... |

Run `/skills` in Copilot chat to confirm all 8 skills are loaded.
```

## Important constraints

- **Never invent code** — every snippet must come from the actual files explored
- **Anchored to this version** — capture how things are done today; do not suggest migrations
- **English only** — all skill content in English
- **Existing generic skills still apply** — these project skills complement (not replace) the existing skills in `.agents/skills/`
- **Do not modify existing skills** — only create new `project-*` prefixed files

## When to re-run this prompt

- After adding a new domain (e.g. adding DynamoDB, adding a new auth provider)
- After a significant refactor that changes patterns in 3+ files
- After updating major dependencies (Next.js, Auth.js, Zod major version)
