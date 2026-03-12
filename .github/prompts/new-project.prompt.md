---
description: Initialize a new project from the Next.js 16 starter template — setup env, clean example code, scaffold first pages.
agent: "agent"
tools: [vscode, execute, read, edit, search]
---

You are initializing a brand-new project from the Next.js 16 starter template.
Read the user's project description from the chat, then follow these steps in order.

---

## Step 1 — Setup environment

Ensure `.env.local` exists:

```bash
pnpm setup
```

If it already exists, skip this step silently.

---

## Step 2 — Update project identity

Edit `lib/constants.ts`:

- Set `APP_NAME` to the project name from the user's description
- Set `APP_DESCRIPTION` to a one-sentence description
- Keep `APP_VERSION = "0.1.0"` unless the user specifies otherwise

---

## Step 3 — Determine authentication needs

Read the user's prompt carefully.

**If authentication IS needed** (user mentions login, sign-in, user accounts, OAuth, protected pages):

- Keep `app/auth/`, `proxy.ts`, and auth-related env vars
- Note which OAuth providers are needed — add them to `.env.local` with placeholder values and remind the user to fill them in

**If authentication is NOT needed**:

1. Delete `app/auth/` entirely (pages + tests)
2. Delete `app/dashboard/`, `app/profile/`, `app/settings/` entirely (pages, components, actions, tests within each)
3. Delete `lib/stats.ts` and `lib/stats.test.ts`
4. Replace `proxy.ts` with a passthrough:
   ```ts
   export default function () {}
   export const config = { matcher: [] };
   ```
5. Remove unused `ROUTES` keys from `lib/constants.ts` (`signIn`, `signUp`, `dashboard`, `settings`, `profile`) if those routes no longer exist

---

## Step 4 — Replace the home page

`app/page.tsx` is a template example showing the tech stack. **Replace its content** entirely with the real home page for this project based on the user's description.

Do NOT keep the stack list or dev commands section — those are purely template examples.

---

## Step 5 — Create real pages

Based on the user's description, create or replace pages as needed.

- Never create a new page at a route where an example page already exists — replace instead
- Use Server Components by default; only add `"use client"` when event handlers or browser APIs are required
- Validate all user input with Zod at API boundaries

---

## Step 6 — Run type check

```bash
pnpm type-check
```

Fix any errors before stopping. Do not leave type errors.

---

## Step 7 — Report

Output a summary with exactly:

1. **Files created** — list each new file
2. **Files replaced** — list each replaced file and what changed
3. **Files deleted** — list example files removed
4. **Environment** — list any env vars the user still needs to fill in manually

---

## Rules

- **Replace, never add alongside** — if an example page exists at a route, replace it directly
- **Delete tests with their pages** — when deleting an example page directory, delete its `*.test.tsx` files too
- **Never expose secrets** — all OAuth credentials go in `.env.local`, never in code
- **No floating `@template-example` markers** — if you replace a file, remove the marker from your new content
- **English only** — all code comments in English
