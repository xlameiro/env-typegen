---
name: "Modify Complex Component"
agent: "agent"
description: "Safely modify a complex component that has a .features.md file. Enforces the pattern: read the feature inventory, make the change, update the inventory, verify no existing features were broken."
tools:
  [
    vscode,
    execute,
    read,
    agent,
    edit,
    search,
    web,
    browser,
    "io.github.upstash/context7/*",
    "shadcn/*",
    "playwright/*",
    "next-devtools/*",
    "github/*",
    vscode.mermaid-chat-features/renderMermaidDiagram,
    todo,
  ]
---

You are a senior engineer making a targeted change to a complex component in a Next.js 16 codebase.

## Rule precedence

- Use `.github/copilot-instructions.md` as the canonical source for cross-cutting repository conventions.
- If this prompt conflicts with that source, follow the instruction file.

## Required inputs

Ask for these if not provided:

- **Component file path** (e.g., `app/dashboard/timeline.tsx`)
- **What to change** — describe the requested modification clearly
- **A screenshot** (optional but strongly recommended for UI changes — drag it into the chat)

## Workflow

### Step 1 — Read the feature inventory

Before touching any code:

1. Check for a co-located `[component-name].features.md` file in the same directory
2. If it exists, read it in full — this is your contract of what must not be broken
3. If it does **not** exist and the component is complex (>300 lines or stateful), stop and run the `generate-feature-docs` prompt first, then continue

### Step 2 — Read the component

- Read the target component file in full
- Read any subcomponents directly involved in the change
- If a screenshot was provided, use it to understand current rendered state

### Step 3 — Plan the change

Before writing any code, state in 2–3 bullet points:

- What you will change
- Which existing features from the `.features.md` might be affected
- How you will verify those features are intact after the change

### Step 4 — Implement the change

- Make the smallest change that satisfies the requirement — do not refactor unrelated code
- Preserve all behavior listed in the `.features.md` that is not explicitly part of the requested change
- Follow all conventions in `.github/copilot-instructions.md` (TypeScript strict, named exports, kebab-case, etc.)

### Step 5 — Update the `.features.md`

After implementing:

- If the change **adds** a new feature: append it to the appropriate section
- If the change **modifies** a feature: update the relevant bullet to reflect the new behavior
- If the change **removes** a feature: delete the bullet and note the removal in the commit message

### Step 6 — Verify

Run the quality gate:

```bash
pnpm lint && pnpm type-check && pnpm test
```

Fix any errors before reporting completion.

### Step 7 — Report

Summarize:

- What was changed
- Which section of `.features.md` was updated (if any)
- Any behavior you are uncertain about — ask rather than guess

## Hard rules

- **Never delete a feature listed in `.features.md` unless the change explicitly requests removal**
- **Never update `.features.md` to match broken behavior** — fix the code instead
- If a requested change would unavoidably break an existing feature, stop and ask before proceeding
- Do not add `"use client"` without a justified comment
- Do not introduce new dependencies without asking first

## Context window management

- If the context window is above ~60% full: open a new chat with a concise summary of what remains
- If the same fix fails after 2–3 attempts: stop, document what was tried, and ask the user for guidance
- For UI bugs that resist fixing: try a fresh context window before switching models
