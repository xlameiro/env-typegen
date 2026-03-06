# GitHub Copilot Instructions

## Project Overview

This is a professional Next.js 16 starter template. Use it as the foundation for building production-grade web applications.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Runtime**: React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS v4
- **Package Manager**: pnpm
- **Unit Testing**: Vitest
- **E2E Testing**: Playwright
- **Authentication**: Auth.js v5 (NextAuth)
- **Validation**: Zod
- **State Management**: Zustand (client state)

## Project Structure

```
app/                    # Next.js App Router
  layout.tsx            # Root layout
  page.tsx              # Home page
  globals.css           # Global styles
public/                 # Static assets
.github/
  instructions/         # Copilot per-file instructions
  copilot-instructions.md
```

## Core Conventions

### General
- Always use TypeScript with strict mode — no `any`, no type assertions unless unavoidable
- Prefer named exports over default exports (except for Next.js pages/layouts/routes which require default exports)
- Use path alias `@/` for all internal imports (configured in `tsconfig.json`)
- Use `pnpm` for all package management commands

### Components
- Server Components by default — only add `"use client"` when strictly necessary (event handlers, hooks, browser APIs)
- One component per file
- Co-locate component styles and tests with the component when possible
- Use Tailwind CSS utility classes — no inline styles, no CSS modules unless needed for complex animations

### File Naming
- All files use **kebab-case** (e.g., `user-card.tsx`, `use-auth.ts`, `format-date.ts`)
- Components: `kebab-case.tsx` (e.g., `user-card.tsx`)
- Hooks: `kebab-case.ts` prefixed with `use` (e.g., `use-auth.ts`)
- Utils/helpers: `kebab-case.ts` (e.g., `format-date.ts`)
- Route files: Next.js conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`)
- Test files: `*.test.ts` / `*.test.tsx` for unit, `*.spec.ts` for E2E

### Data Fetching
- Fetch data in Server Components whenever possible
- Use `fetch` with Next.js cache options (`cache: 'force-cache'`, `next: { revalidate }`) for server-side fetching
- Use Zustand for client-side UI state only — not for server data
- Validate all external data at boundaries with Zod

### Authentication
- Use Auth.js v5 patterns for all authentication flows
- Protect routes with middleware (`middleware.ts`)
- Never expose sensitive session data to the client

### Error Handling
- Use `error.tsx` boundaries for route-level errors
- Use `not-found.tsx` for 404 handling
- Throw typed errors — avoid generic `Error` objects

### Testing
- Write tests alongside code (TDD preferred)
- Unit tests with Vitest for utilities, hooks, and pure functions
- E2E tests with Playwright for user flows and critical paths
- Use `getByRole` and accessible locators in Playwright — never `getByTestId` unless no alternative

### Security
- Never hardcode secrets — use environment variables
- Validate and sanitize all user input with Zod at API boundaries
- Follow OWASP guidelines — see `security-and-owasp.instructions.md`
- Use parameterized queries for any database operations

### Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML elements — `<button>`, `<nav>`, `<main>`, etc.
- Follow WCAG 2.2 Level AA — see `a11y.instructions.md`
- Every image must have descriptive `alt` text

### Performance
- Optimize images with `next/image`
- Use `next/font` for fonts (already configured with Geist)
- Lazy load non-critical components with `dynamic()` and `React.lazy()`
- Avoid large client-side bundles — keep `"use client"` boundaries minimal

## Personal Preferences

### Language and Comments
- All code comments must be written in **English**
- Commit messages in English
- Variable names, function names, and identifiers in English

### Operating System
- All terminal commands must target **macOS** (use `open`, `pbcopy`, `brew`, etc.)
- Do not suggest Linux-only or Windows-only commands
- Use `~` for home directory, macOS paths and conventions

### Session Completion Checklist
Before ending any coding session or considering a task complete, the following commands MUST pass without errors:

```bash
pnpm lint        # ESLint — zero errors
npx tsc --noEmit # TypeScript type check — zero errors
pnpm test        # Vitest — all tests passing
pnpm build       # Next.js production build — successful
```

Never mark a task as done if any of these commands fail. Fix all errors before concluding.
