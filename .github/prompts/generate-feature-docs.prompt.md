---
name: "Generate Feature Docs"
agent: "agent"
description: "Analyze a complex component and generate a shallow .features.md file documenting all its features and behaviors — so future LLM prompts don't accidentally break existing functionality."
tools: [vscode, execute, read, agent, edit, search, web, browser, todo]
---

You are a senior engineer documenting a complex component for a Next.js 16 codebase.

## Rule precedence

- Use `.github/copilot-instructions.md` as the canonical source for cross-cutting repository conventions.
- If this prompt conflicts with that source, follow the instruction file.

## Required inputs

Ask for these if not provided:

- **Component file path** (e.g., `app/dashboard/timeline.tsx`)
- **A screenshot** (optional but recommended — drag it into the chat to provide visual context)

## Goal

Generate a `[component-name].features.md` file co-located next to the component file.

This file is **not technical documentation**. It is a **business-level feature inventory** that:

- Tells any future LLM what the component does, so iterating on it doesn't accidentally destroy existing behavior
- Is **shallow and concise** — bullet points only, no prose paragraphs
- Describes features from the user's perspective (what it does), not implementation details (how it's coded)

## Output file format

```markdown
# [ComponentName] Features

## Overview

One-sentence description of what this component does from the user's perspective.

## Features

- Feature 1: brief description
- Feature 2: brief description
  - Edge case or sub-behavior (if important)

## Inputs / Props (summary only)

- `propName` — what it controls or affects

## Known constraints

- Any hard limits, performance considerations, or intentional omissions
```

## Workflow

### Step 1 — Read the component

- Read the target component file in full
- Read all direct subcomponents it imports (one level deep)
- If a screenshot was provided, use it to understand the rendered behavior

### Step 2 — Identify all features

Catalog every user-visible behavior:

- Interactions (click, drag, scroll, keyboard shortcuts)
- Visual states (loading, empty, error, active, disabled, selected)
- Animations or transitions
- Data display modes
- Edge cases the code explicitly handles

### Step 3 — Write the `.features.md`

- Co-locate it next to the component: same directory, same base name with `.features.md` extension
  - Example: `app/dashboard/timeline.tsx` → `app/dashboard/timeline.features.md`
- Keep each bullet to one line unless a sub-bullet is genuinely necessary
- Do **not** include implementation details (state variable names, hook names, class names)
- Write in English, imperative mood

### Step 4 — Confirm

Report back:

- Path of the generated file
- Count of features documented
- Any behavior you were uncertain about (ask the user to clarify before finalizing)

## When to create this file

Create a `.features.md` when the component meets **any** of these criteria:

- More than ~300 lines of code
- Has complex stateful interactions (drag, zoom, multi-step flows)
- Is shared across multiple routes
- Has been the source of regressions in past iterations
