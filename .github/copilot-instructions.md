# GitHub Copilot Instructions

## Project Overview

This is a professional Next.js 16 starter template. Use it as the foundation for building production-grade web applications.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Runtime**: React 19
- **Language**: TypeScript 5 (strict mode) — TypeScript 6.0 RC is available (`typescript@rc`); see Knowledge Reminders § TypeScript 5.x
- **Styling**: Tailwind CSS v4
- **Package Manager**: pnpm
- **Node.js**: >= 20 (enforced via `.nvmrc` and `session-start.sh` hook)
- **Unit Testing**: Vitest v4
- **E2E Testing**: Playwright
- **Authentication**: Auth.js v5 (NextAuth)
- **Validation**: Zod v4
- **Forms**: react-hook-form + @hookform/resolvers (Zod) — see `.agents/skills/react-hook-form/SKILL.md`
- **State Management**: Zustand (client state), nuqs (URL state) — see `.agents/skills/nuqs/SKILL.md`
- **Env Validation**: @t3-oss/env-nextjs — all env vars declared in `lib/env.ts`; never use `process.env.*` directly
- **Dead Code Detection**: knip — run `pnpm knip` to find unused files, exports, and dependencies
- **Bundle Analysis**: @next/bundle-analyzer — run `pnpm analyze` to inspect client bundle size
- **Cloud Provider**: AWS (preferred ecosystem — see § Infrastructure below)
- **AI/ML**: Amazon Bedrock (Claude / Titan) — preferred over direct OpenAI dependency
- **HTML Parsing / Scraping**: Cheerio v1 — server-side only (Route Handlers, Server Components, Lambda)

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
- Use `import type` for type-only imports — `import type { Foo } from './foo'` — keeps the runtime bundle clean
- Use `export type { Foo }` for type-only exports — mirrors `import type`, prevents accidental value exports
- Prefix boolean variables and props with `is`, `has`, `can`, or `should` (e.g., `isLoading`, `hasError`, `canSubmit`, `shouldRedirect`)
- No abbreviations in variable names — write `user` not `u`, `fieldMetadata` not `fm`, `event` not `e`
- Use descriptive lowercase names for generic type parameters instead of single uppercase letters — prefer `function map<item, result>(…)` over `function map<T, R>(…)`; reserve `T` only for utilities where a single-letter convention is widespread (e.g., `Array<T>`, `Promise<T>`)
- Prefix intentionally unused parameters or locals with `_` (e.g., `_event`, `_index`) — signals the omission is deliberate and satisfies `noUnusedLocals` / `noUnusedParameters` compiler checks
- Never use TypeScript enums — always use string union types: `type Status = 'active' | 'inactive'` instead of `enum Status { Active, Inactive }`
- Use early returns for readability — prefer guard clauses over deeply nested conditions
- Prefer destructuring over direct property access — `const { id, name } = user` not `user.id`, `user.name`
- Prefer `readonly` and `as const` for immutable data structures
- Add explicit return types to all exported functions in `lib/`, Server Actions (`'use server'`), and Route Handlers — they are library-like code used throughout the app, and explicit return types also help Copilot provide more accurate completions. Local helper functions and React components (`.tsx`) are exempt.
- Avoid non-null assertion operators (`!`) — use type narrowing or guards instead
- Use `Boolean(value)` instead of `!!value` for explicit boolean coercion — clarifies intent and avoids double-negation confusion
- Always use `type`; **never** use `interface`. To extend HTML attributes or library types, use intersections: `type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }` — the intersection pattern eliminates all valid reasons to reach for `interface`
- Infer types from Zod schemas using `z.infer<typeof schema>` — do not duplicate as separate interfaces
- Don't export types or interfaces that are only used within the same file

#### Type Placement Decision Matrix

Use this three-tier hierarchy when deciding where a new type lives:

| Tier                     | Location                         | Use when                                                            |
| ------------------------ | -------------------------------- | ------------------------------------------------------------------- |
| **1 — Inline**           | Same file, not exported          | Used only in this file (e.g., component props, local helper shapes) |
| **2 — Feature-scoped**   | `[feature]/types.ts`             | Shared across ≥ 2 files within the same feature folder              |
| **3a — Domain (schema)** | `lib/schemas/[domain].schema.ts` | Entity type derived from a Zod schema via `z.infer<>`               |
| **3b — Global utility**  | `types/index.ts`                 | Domain-agnostic structural utility types used across the entire app |

- Start at Tier 1 and promote only when a second consumer appears — premature promotion creates unnecessary coupling
- Never add domain entity types (`User`, `Order`, etc.) to `types/index.ts` — they belong in `lib/schemas/`
- `types/index.ts` is for framework-agnostic shapes; if a type references `next` or `react`, it probably does not belong there
- Feature-scoped `types.ts` uses regular kebab-case naming: `dashboard/types.ts`, consistent with `utils.ts` and `constants.ts` patterns

#### Next.js Page and Layout Prop Types

Always name page component props `PageProps` (inline local type, never exported). The named type is hoverable in VS Code and reusable inside `generateMetadata`:

```tsx
// ✅ Named — Copilot can hover over it; generateMetadata can reuse it
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
};
export default async function ProductPage({ params, searchParams }: Readonly<PageProps>) { ... }

// ❌ Anonymous inline — not hoverable, forces duplication when generateMetadata needs the same shape
export default async function ProductPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) { ... }
```

Never define `PageProps` in `types/index.ts` — it belongs inline in the page file that uses it.

- Organize module contents top-down: place exported/public functions before internal helpers — readers see the module's public API before implementation details
- Avoid premature abstraction — duplicating code 2–3 times is fine; extract only when a stable pattern emerges
- Do not reformat code unrelated to your change — only modify lines that are strictly necessary
- Batch related edits across multiple files first, then run the build/tests once — not after each micro-change
- Clarity over cleverness: when two approaches are equivalent, always choose the simpler, more readable one
- Verify solutions work for all relevant cases and edge cases, not just the happy path
- Do not describe a solution or pattern as "best practice", "widely used", or "the standard way" without verifying it in this codebase or citing a specific authoritative source
- Prefer pure functions — when a function must mutate state, return the mutated object instead of `void` so callers can chain and reason about state
- Limit functions to 2–3 parameters maximum — if more are needed, accept a single options object instead
- **Comments**: Only write inline comments that answer _why_ code was written this way (context, background, decisions). Never write comments that describe _what_ the code does — that should be self-evident. Reserve _how_ comments for genuinely complex logic with external constraints.
- Do not delete existing comments that explain non-obvious behavior or past decisions — update them as the surrounding code changes, but preserve the context they carry

### Components

- Server Components by default — only add `"use client"` when strictly necessary (event handlers, hooks, browser APIs)
- One component per file
- Co-locate component styles and tests with the component when possible
- Use Tailwind CSS utility classes — no inline styles, no CSS modules unless needed for complex animations
- Prefer event handlers over `useEffect` for state updates — `useEffect` should be a last resort for syncing with external systems
- Use functional state updates when new state depends on previous state — `setState(prev => ({ ...prev, field: newValue }))` avoids stale closure bugs
- Prefix event handler functions with `handle` (e.g., `handleClick` for `onClick`, `handleSubmit` for `onSubmit`)
- Custom query hooks follow `use[Resource]` naming (e.g., `useUser`, `useOrders`); mutation hooks follow `use[Action]` naming (e.g., `useDeleteUser`, `useUpdateOrder`)
- **File size limit: 300 non-blank/non-comment lines** (enforced by ESLint `max-lines`). This limit is calibrated for LLM context windows: a file longer than ~300 meaningful lines cannot be processed in full within a single reasoning pass, reducing completion quality and refactor safety. Split at ~250 lines along natural seams (sub-component, `*.utils.ts`, `actions.ts` + `queries.ts`). Config files (`*.config.*`) and test files are exempt.
- For complex components that legitimately approach 300 lines (stateful interactions like drag/zoom/multi-step, or history of regressions), create a co-located `[component-name].features.md` file that documents all user-visible features as a bullet-point inventory. This acts as a contract for future LLM prompts — always tag it when requesting changes and instruct the LLM not to break existing features. Use `.github/prompts/generate-feature-docs.prompt.md` to generate it and `.github/prompts/modify-complex-component.prompt.md` to safely iterate on it.

### File Naming

- All files use **kebab-case** (e.g., `user-card.tsx`, `use-auth.ts`, `format-date.ts`)
- Components: `kebab-case.tsx` (e.g., `user-card.tsx`)
- Hooks: `kebab-case.ts` prefixed with `use` (e.g., `use-auth.ts`)
- Utils/helpers: `kebab-case.ts` (e.g., `format-date.ts`)
- Route files: Next.js conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`)
- Test files: `*.test.ts` / `*.test.tsx` for unit, `*.spec.ts` for E2E, `*.test-d.ts` for type-level assertions
- Feature inventory files: `[component-name].features.md` (co-located, only for complex components — see `### Components`)

### Data Fetching

- Fetch data in Server Components whenever possible
- Use `fetch` with Next.js cache options (`cache: 'force-cache'`, `next: { revalidate }`) for server-side fetching
- Use Zustand for client-side UI state only — not for server data
- Validate all external data at boundaries with Zod

### Authentication

- Use Auth.js v5 patterns for all authentication flows
- Install with `pnpm add next-auth@beta` — package name is `next-auth` (v5 is currently beta; v4 is npm stable)
- Protect routes with `proxy.ts` — `proxy.ts` is the **official Next.js 16 file convention** for request interception (`middleware.ts` is deprecated in Next.js 16)
- Never expose sensitive session data to the client

#### Authorization Placement Matrix

| File         | Use when                                                   | Notes                                                                      |
| ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `proxy.ts`   | The same auth gate applies to a route group/prefix         | Prefer this for cross-cutting protection (`/dashboard/**`, `/settings/**`) |
| `page.tsx`   | Authorization depends on page-specific data or role checks | Safe location for resource-level decisions in App Router                   |
| `layout.tsx` | Never                                                      | Layout checks can be bypassed; do not put authorization here               |

### Internationalization

The template ships as **single-locale** (Tier 1) by default. Escalate only when needed:

| Tier                     | When to use                                                           | Approach                                                                      |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **1 — Single locale**    | App ships in one language                                             | `APP_LOCALE` constant + `<html lang>`. Nothing else.                          |
| **2 — DIY multi-locale** | ≤ 3 locales, no pluralization, no client switching                    | Official Next.js pattern: `app/[lang]/`, `getDictionary()`, JSON dictionaries |
| **3 — `next-intl`**      | ≥ 3 locales, pluralization, ICU messages, locale switcher, typed keys | `pnpm add next-intl` — first-class App Router support                         |

**Library recommendation**: `next-intl` is the community-consensus library for App Router i18n (5M weekly downloads, built from scratch for RSC, full TypeScript key safety). Do not use `next-i18next` — it is a Pages Router library.

**Critical rules for multi-locale apps**:

- All routes nest under `app/[locale]/` (or `app/[lang]/`) — there is no built-in i18n config in App Router
- Locale detection and redirect in `proxy.ts` must run **before** auth checks — so unauthenticated redirects land on `/es/auth/sign-in`, not `/auth/sign-in`
- `generateStaticParams` in `app/[locale]/layout.tsx` must return ≥ 1 locale — with `cacheComponents: true`, an empty array is a build error
- Mark `getDictionary` / `getMessages` modules with `import 'server-only'` — they must not run on the client
- `APP_LOCALE` in `lib/constants.ts` becomes the `defaultLocale` fallback — derive the active locale from `params.locale`, not `APP_LOCALE`, in Tier 2/3

See `.github/instructions/i18n.instructions.md` for full file structure, code patterns, and `proxy.ts` integration for both Tier 2 and Tier 3.

### Error Handling

- Use `error.tsx` boundaries for route-level errors
- Use `not-found.tsx` for 404 handling
- Throw typed errors — avoid generic `Error` objects
- Write error messages that explain: (1) what happened, (2) why it's a problem, and (3) how to fix it — vague messages like `"Invalid input"` waste debugging time
- Keep async logic linear — avoid nested `try/catch` blocks; prefer early returns from `catch` to reduce nesting
- No floating promises — always `await` or explicitly handle every async call; never fire-and-forget
  > Note: `@typescript-eslint/no-floating-promises` is intentionally disabled in ESLint — it produces false positives with `router.push()`, async event handlers, and Server Actions in Next.js. Enforce this rule manually via code review.

### Testing

- Write tests alongside code (TDD preferred); when fixing a bug, write the failing test first, verify it fails, then fix — a test that passes from the start proves nothing
- Unit tests with Vitest for utilities, hooks, and pure functions
- E2E tests with Playwright for user flows and critical paths
- Use `getByRole` and accessible locators in Playwright — never `getByTestId` unless no alternative
- Test behavior, not implementation — write assertions against user-observable outcomes (what renders, what events fire) rather than internal state or method calls
- Prefer `vi.spyOn` over `vi.mock` for isolating dependencies — less invasive, easier to restore
- Aim for 80%+ test coverage for new or modified code — AI excels at generating comprehensive tests
- Never commit `test.only`, `it.only`, or `describe.only` — they silently skip the rest of the suite
- Name test cases starting with "should" — e.g., `it('should return null when user not found')`
- Prefer a single top-level `describe` block per test file — nest sub-describes only when grouping genuinely different behaviors of the same unit
- Tests must be self-contained: clean up any state they create; use `afterEach` for shared cleanup logic
- One test should verify one behavior — keep `it` blocks focused and avoid asserting multiple unrelated things in a single test case
- No loops or conditionals (`for`, `if`, `switch`) inside `describe()` blocks — they break test isolation and prevent running individual tests by name
- Prefer parameterized tests (`it.each()` / `test.each()`) when asserting the same behavior across multiple inputs — avoid copying nearly-identical test blocks
- No `console.log` or `debugger` statements in tests or production code — remove before committing
- Do not write flaky tests — avoid `setTimeout` in tests; instead `await` the condition to be met
- Never remove, skip, or comment out tests to make them pass — fix the underlying code instead
- Never re-run the same failing test command without making a code change first — save and analyze the output instead of re-running
- Before writing tests, search the codebase for similar test files — follow established testing patterns already present in the repo
- Test both success and failure cases — a feature untested on failure paths is incomplete
- When updating test snapshots, review each change individually — never blindly accept all snapshot updates

### Security

- Never hardcode secrets — use environment variables
- Never print, log, or paste secret values (tokens, API keys, cookies) in chat responses, commits, or logs — this includes values _derived_ from secrets; summarize and redact; if a required secret is missing, stop and ask rather than inventing placeholder credentials
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

## Component-Specific Instructions

**IMPORTANT**: Before modifying any code in the directories listed below, you **MUST** first read the corresponding instruction file to understand the specific conventions, patterns, and requirements for that area.

Quick entry point: `.github/instructions/INDEX.md`.

**For AI/Copilot**: Always use the `read_file` tool to read the relevant instruction file(s) before analyzing, modifying, or creating code in these directories. This ensures adherence to project patterns and prevents architectural violations.

> **Conflict resolution**: Rules in this file (`copilot-instructions.md`) are always canonical. Directory-specific instruction files add context for their domain — they never override base rules. If a directory file contradicts this file, this file wins.

### Required Reading by Directory

| Directory                                       | Instruction File                                                                             | When to Read                                                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/**`                                        | `.github/instructions/nextjs.instructions.md`                                                | Before modifying App Router pages, layouts, loading/error boundaries, or server components                                                      |
| `app/api/**`                                    | `.github/instructions/security-and-owasp.instructions.md`                                    | Before creating or modifying API route handlers — validate all inputs, never expose raw errors                                                  |
| `app/auth/**`                                   | `.github/instructions/security-and-owasp.instructions.md`                                    | Before touching authentication pages or flows — session handling, CSRF, cookie attributes                                                       |
| `components/**`                                 | `.github/instructions/reactjs.instructions.md` + `.github/instructions/a11y.instructions.md` | Before creating or modifying UI components — accessibility and React patterns both apply                                                        |
| `hooks/**`                                      | `.github/instructions/reactjs.instructions.md`                                               | Before creating or modifying custom React hooks — rules of hooks, naming, memoization                                                           |
| `lib/**`                                        | `.github/instructions/typescript-5-es2022.instructions.md`                                   | Before adding utilities, constants, or shared logic                                                                                             |
| `types/**`                                      | `.github/instructions/typescript-5-es2022.instructions.md`                                   | Before adding or modifying global utility types — verify the type belongs in Tier 3b, not Tier 2 or inline (see Type Placement Decision Matrix) |
| `app/[locale]/**`, `app/[lang]/**`              | `.github/instructions/i18n.instructions.md`                                                  | Before adding multi-locale routing — covers Tier 2 (DIY) and Tier 3 (next-intl), proxy.ts ordering, cacheComponents compatibility               |
| `i18n/**`, `messages/**`, `dictionaries/**`     | `.github/instructions/i18n.instructions.md`                                                  | Before creating locale routing, translation files, or locale navigation helpers                                                                 |
| `lib/schemas/**`                                | Use `zod` skill                                                                              | Before adding or updating Zod schemas — load skill for schema patterns                                                                          |
| `store/**`                                      | Use `zustand` skill                                                                          | Before modifying Zustand stores — load skill for store patterns                                                                                 |
| `*.test.ts(x)`                                  | `.github/instructions/nodejs-javascript-vitest.instructions.md`                              | Before writing or modifying Vitest unit tests                                                                                                   |
| `tests/**`                                      | `.github/instructions/playwright-typescript.instructions.md`                                 | Before writing or modifying Playwright E2E tests                                                                                                |
| `**/*.css`                                      | `.github/instructions/nextjs-tailwind.instructions.md`                                       | Before modifying styles — Tailwind v4 CSS-first config, design tokens                                                                           |
| `**/*.md`                                       | `.github/instructions/markdown.instructions.md`                                              | Before writing or editing Markdown documentation files (README, CONTRIBUTING, etc.)                                                             |
| `content/**`, `posts/**`, `**/*.mdx`            | `.github/instructions/mdx.instructions.md`                                                   | Before adding MDX/Markdown content rendering to the app — blog, docs, changelog, landing copy                                                   |
| `mdx-components.tsx`                            | `.github/instructions/mdx.instructions.md`                                                   | Before creating or modifying the global MDX component overrides file — required for App Router                                                  |
| Any code file                                   | `.github/instructions/performance-optimization.instructions.md`                              | Before performance-sensitive changes — rendering, caching, bundle size                                                                          |
| Any code file                                   | `.github/instructions/context7.instructions.md`                                              | Loaded automatically — provides Context7 MCP lookup guidance for external docs                                                                  |
| Any code file                                   | `.github/instructions/clean-code.instructions.md`                                            | Before any implementation — quality principles: naming, function design, error handling, state                                                  |
| Complex component (>3 interactions, >300 lines) | `.github/instructions/feature-context.instructions.md`                                       | Before adding a feature to a complex component — create/update `.context.md` invariant file                                                     |
| UI/UX polish                                    | `.agents/skills/ui-ux-pro/SKILL.md`                                                          | When asked to improve visuals — research design style first, then apply Tailwind v4 patterns                                                    |

## Boundaries

### Always do

- **Before writing any Next.js feature code, call `next-devtools-init` (next-devtools MCP) and load the relevant `nextjs-*` skill** — never rely on LLM training data for Next.js 16+ APIs; emit a Documentation Declaration before writing code
- Read the relevant instruction file before touching any directory listed in "Component-Specific Instructions"
- Run `pnpm lint && pnpm type-check && pnpm test` before concluding any session
- Use `@/` path alias for all internal imports
- Place authorization checks in `page.tsx` or `proxy.ts` — **never in `layout.tsx`**
- Validate all user input at API boundaries with Zod
- Use named exports for all modules except Next.js file conventions (`page.tsx`, `layout.tsx`, etc.)
- Import directly from source files — not from barrel `index.ts` re-exports
- Mark server-only modules with `import 'server-only'` at the top (e.g., `lib/auth.ts`) — do NOT add `server-only` to schema files in `lib/schemas/` that are also imported by Client Components (e.g., sign-in/sign-up form validation schemas); adding it there causes a runtime error at the client boundary
- Import env vars from `@/lib/env` — never access `process.env.*` directly outside of `lib/env.ts`

### Ask first before

- Starting any task scoped as "audit everything", "review the whole project", "exhaustive review", or any equivalent — first count total files and domains to declare Session Mode (A or B); never assume one session is sufficient for broad audits
- Deleting or renaming files — check for imports and transitive usages first
- Adding a new dependency — discuss alternatives and bundle impact
- Making breaking changes to shared types, API routes, or exported utilities — maintain backwards compatibility by default unless explicitly instructed otherwise
- Refactoring code beyond the scope of the request
- Implementing anything that requires a database schema change
- Introducing patterns not yet established in this codebase — check `lib/`, `components/`, and `hooks/` first

### Never do

- Use `class` for business logic, services, utilities, or scrapers — always use functions and types; the only permitted classes are `Error` subclasses in `lib/errors.ts`
- Use `enum` — always use string union types instead: `type Status = 'active' | 'inactive'`
- Hardcode secrets, API keys, or credentials — always use env vars via `@/lib/env`
- Use `process.env.*` directly anywhere other than `lib/env.ts` — import the validated `env` object from `@/lib/env` instead
- Prefix env vars with `NEXT_PUBLIC_` unless the value is safe to expose to every browser user — `NEXT_PUBLIC_*` vars are bundled into the client JavaScript bundle and visible to anyone; never use them for tokens, secrets, or cron keys
- Use `any` in TypeScript — use proper types, `unknown`, or a Zod-parsed result
- Disable ESLint rules (`// eslint-disable`) to suppress a lint error — fix the code instead
- Add `"use client"` without a clear reason — always default to Server Components
- Skip the Session Completion Checklist before marking a task done
- Use `window`, `document`, or other browser APIs in Server Components
- Perform authorization checks in `layout.tsx` — layouts can be bypassed
- Commit `test.only`, `it.only`, or `describe.only` — they silently disable the rest of the test suite
- Rewrite or duplicate code without first searching for an existing utility — look in `lib/` before writing new helpers
- Suppress TypeScript errors with `@ts-ignore` or `@ts-expect-error` — fix the root cause instead
- Proactively create documentation files (`.md`, README) — only create docs if explicitly requested by the user
- Leave temporary files, debug scripts, or scratch files in the repository — remove them before marking a task complete
- Modify auto-generated files directly (e.g., `next-env.d.ts`, generated type files) — find and edit the source that generates them, then regenerate
- Switch the package manager from pnpm to Bun or npm without explicit team discussion — pnpm is enforced via the `packageManager` field in `package.json`; Bun runtime is not supported (`.nvmrc` assumes Node.js, not Bun)

## Template Onboarding

> Read this section every time a prompt asks to "build", "create", "generate", or "scaffold" a new web application from this template.

### Initialization

`pnpm install` runs `postinstall` which auto-creates `.env.local` with a generated `AUTH_SECRET`. No manual `cp .env.example .env.local` needed. If skipped, run `pnpm setup`.

### AUTH_SECRET is optional

`AUTH_SECRET` is **not required to start the dev server**. The app boots without it. Auth.js only validates it when auth routes are hit. Only add `AUTH_SECRET` (and OAuth provider vars) when the project explicitly needs authentication.

### Replace, never add

The template ships with working **example pages** that demonstrate patterns. When building a real project:

- **Replace** `app/page.tsx` with the real home page
- **Delete** `app/dashboard/`, `app/profile/`, `app/settings/` (or replace with real content)
- **Delete** `lib/stats.ts` alongside `app/dashboard/`
- **Never** create `app/dashboard/new-page.tsx` alongside the existing example — replace the example directly

All example files carry a `@template-example` JSDoc marker. Find them all with:

```bash
grep -r "@template-example" app/ lib/
```

### Always update lib/constants.ts

Change `APP_NAME`, `APP_DESCRIPTION`, and `APP_VERSION` to match the new project before writing any other code.

### No auth → simplify proxy.ts

When authentication is not needed, replace the body of `proxy.ts` with a passthrough so unauthenticated users are never redirected:

```ts
export default function () {}
export const config = { matcher: [] };
```

See `AGENTS.md § Starting a New Project` for the full scaffold-vs-example table.

## Common Pitfalls

### 1. Adding `"use client"` unnecessarily

```tsx
// ❌ Bad: "use client" just because the component accepts props
"use client";
export function UserCard({ name }: { name: string }) {
  return <div>{name}</div>;
}

// ✅ Good: Only use "use client" when hooks, events, or browser APIs are needed
export function UserCard({ name }: { name: string }) {
  return <div>{name}</div>;
}
```

### 2. Barrel imports killing tree-shaking

```typescript
// ❌ Bad: importing from a barrel re-export
import { Button, Card } from "@/components/ui";

// ✅ Good: import directly from the source file
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

### 3. Client-side data fetching when Server Component would suffice

```tsx
// ❌ Bad: useEffect fetch in a Client Component
"use client";
export function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}

// ✅ Good: fetch in a Server Component
export async function UserList() {
  const users = await getUsers(); // server-side
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

### 4. Auth checks in `layout.tsx`

```tsx
// ❌ Bad: layout auth can be bypassed by direct navigation / API calls
export default async function AdminLayout({ children }) {
  const session = await auth();
  if (!session) redirect("/sign-in"); // NOT reliable
  return <>{children}</>;
}

// ✅ Good: auth in page.tsx or proxy.ts (never layout.tsx)
export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/sign-in");
  return <main>...</main>;
}
```

### 5. Skipping Zod validation at API boundaries

```typescript
// ❌ Bad: trusting raw request body
export async function POST(req: Request) {
  const { email, password } = await req.json(); // unvalidated!
  await createUser(email, password);
}

// ✅ Good: parse and validate at the boundary
export async function POST(req: Request) {
  const body = CreateUserSchema.parse(await req.json());
  await createUser(body.email, body.password);
}
```

### 6. Using `any` to silence TypeScript

```typescript
// ❌ Bad: any defeats the type system
const data: any = await response.json();
console.log(data.user.email);

// ✅ Good: define a schema, parse, infer the type
const data = UserResponseSchema.parse(await response.json());
console.log(data.user.email); // fully typed
```

### 7. Generic error objects

```typescript
// ❌ Bad: unactionable error message
throw new Error("Something went wrong");

// ✅ Good: typed, descriptive error with context
throw new AppError("User not found", { userId, context: "getUser" });
// (use typed error classes from lib/errors.ts)
```

### 8. Hardcoding secrets

```typescript
// ❌ Bad: secret committed to source control
const apiKey = "sk-live-abc123";

// ✅ Good: read from environment, validate at startup
const apiKey = process.env.THIRD_PARTY_API_KEY;
if (!apiKey) throw new Error("THIRD_PARTY_API_KEY is not set");
```

### 9. Making a link look like a button using a disabled `<button>` hack

```tsx
// ❌ Bad: disabled button used for visual style — semantically wrong and inaccessible
<Button disabled tabIndex={0} onClick={() => router.push("/dashboard")}>
  Go to Dashboard
</Button>;

// ✅ Good: use ButtonLink — renders a semantic <a> with button styles
import { ButtonLink } from "@/components/ui/button-link";
<ButtonLink href="/dashboard">Go to Dashboard</ButtonLink>;

// ✅ Good: or use buttonVariants() directly if you need custom markup
import { buttonVariants } from "@/components/ui/button";
<a href="/dashboard" className={buttonVariants({ variant: "primary" })}>
  Go to Dashboard
</a>;
```

### 10. Implementing a new feature that silently deletes existing functionality

Powerful models (Sonnet, o3-Codex) can silently overwrite or remove existing logic when adding new features — especially in complex components with many interactions (timelines, editors, multi-step forms).

```markdown
// ❌ Bad: prompt the model to add drag-to-scroll without protecting existing click behavior
"Add drag-to-scroll to the timeline"
→ Model rewrites the event handler, deleting the existing click-to-seek logic

// ✅ Good: prime the model with the invariant list before any change
"Before making any change, list ALL the existing user interactions this component supports.
Then implement drag-to-scroll WITHOUT breaking any of the behaviors you listed."
```

For components with >3 interactive behaviors (drag, click, keyboard, resize, undo/redo…):

1. Create a `.context.md` file next to the component (see `feature-context.instructions.md`).
2. Tag it in every prompt that touches the component: `"Read timeline.context.md first. Do not break any listed invariant."`
3. After the change, ask the model: `"Confirm each behavior in timeline.context.md still works as described."`

### 11. Async Server Component without a Suspense boundary = blocked page

Any `async` Server Component that awaits a slow data call **blocks the entire page render** until it resolves — unless a `<Suspense>` boundary is placed above it. This is the root cause of "Next.js feels slow" complaints; the framework is streaming-ready, but the developer forgot the boundary.

```tsx
// ❌ Bad: the whole page waits for fetchStats() before anything renders
export default async function DashboardPage() {
  const stats = await fetchStats(); // slow DB call — blocks the page
  return <StatsPanel stats={stats} />;
}

// ✅ Good: shell renders immediately; StatsPanel streams in when data is ready
import { Suspense } from "react";
export default function DashboardPage() {
  return (
    <main>
      <PageHeader />
      <Suspense fallback={<StatsSkeleton />}>
        <StatsPanel /> {/* async component — fetches its own data */}
      </Suspense>
    </main>
  );
}

// async/await lives inside the leaf component, behind the boundary
async function StatsPanel() {
  const stats = await fetchStats();
  return <ul>{stats.map(/* ... */)}</ul>;
}
```

Rule: **Every slow async Server Component must have a `<Suspense>` ancestor.** The closer the boundary is to the data-fetching component, the more of the page can stream early. Use `loading.tsx` for route-level skeletons and `<Suspense fallback={<Skeleton />}>` for component-level boundaries.

Additional rules:

- Each async Server Component should **own its fetch** (not receive slow data as props from a blocking parent)
- Never put `use client` above an async component in the hierarchy — it converts all children to client components, breaking async support
- **Bundle size reduction from RSC alone is minimal in mixed apps** (shared libraries still ship to the client). The real performance gain is streaming latency, not bundle size. Significant bundle reduction only occurs on fully static pages with no interactivity whatsoever.
- See `app/dashboard/stats-section.tsx` for the reference implementation of this pattern in this template.

### 12. `generateStaticParams` returning an empty array with `cacheComponents: true`

With `cacheComponents` disabled, returning an empty array from `generateStaticParams` is a silent production bug — Next.js trusts it is static during build but never pre-renders the page, so dynamic API usage is never discovered. With `cacheComponents: true` this is now an **explicit build error**: Next.js requires at least one param set to be returned.

```tsx
// ❌ Bad: empty array = "trust me, this page is static" — silently broken in production,
//   explicit BUILD ERROR with cacheComponents: true
export function generateStaticParams() {
  return [];
}

// ✅ Good: return real params so Next.js can pre-render and discover dynamic API usage
export async function generateStaticParams() {
  const products = await getPopularProducts();
  return products.map((p) => ({ category: p.category, slug: p.slug }));
}
```

### 13. Accessing dynamic APIs outside a `<Suspense>` boundary with `cacheComponents: true`

With `cacheComponents: true`, accessing `cookies()`, `headers()`, `params`, or `searchParams` outside a `<Suspense>` boundary is now a **build error**. Previously it only failed silently in production. Wrap dynamic sections in `<Suspense>` so Next.js can produce a static shell and stream the dynamic content in afterwards.

```tsx
// ❌ Bad: reading cookies/headers/params outside Suspense → build error
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params; // dynamic access with no Suspense ancestor
  const region = (await headers()).get("x-user-region");
  return <ProductPage slug={slug} region={region} />;
}

// ✅ Good: static shell renders instantly; dynamic section streams in via Suspense
import { Suspense } from "react";

export default function Page() {
  return (
    <main>
      <ProductShell />
      {/* cached, serves statically from edge */}
      <Suspense fallback={<DealsSkeleton />}>
        <UserDealsSection />
        {/* reads headers() inside — streams in dynamically */}
      </Suspense>
    </main>
  );
}
```

### 14. MDX remark/rehype plugins break silently with Turbopack

Turbopack (the default compiler for `pnpm dev` in Next.js 16) runs in Rust. JavaScript functions cannot be serialized to Rust, so remark/rehype plugin objects are silently ignored — the plugin appears registered but never runs.

```ts
// ❌ Bad: imported function → silently ignored by Turbopack (no error, no effect)
import remarkGfm from "remark-gfm";
const withMDX = createMDX({
  options: { remarkPlugins: [remarkGfm] },
});

// ✅ Good: string package name → Turbopack-compatible
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
});
```

### 15. `@next/mdx` in App Router requires `mdx-components.tsx` at project root

```ts
// ❌ Bad: install @next/mdx and configure next.config.ts without creating mdx-components.tsx
// → Build error: "You don't have a mdx-components file. App Router requires mdx-components"

// ✅ Good: always create mdx-components.tsx at root (same level as app/)
// even if it just re-exports an empty object
export function useMDXComponents() {
  return {};
}
```

### 16. Missing `default.tsx` in a parallel route slot → 404 on hard navigation

In Next.js 16, every `@slot` directory must have a `default.tsx` that covers unmatched URLs. Without it, a hard navigation (browser refresh or direct URL) to any URL that doesn't exactly match a page in that slot causes a **404** — not a silent empty render.

```tsx
// ❌ Bad: @analytics/page.tsx exists but @analytics/default.tsx is missing
// Navigate to /dashboard/settings → hard reload → 404 for the entire page

// ✅ Good: every @slot directory has default.tsx
// app/@analytics/default.tsx
export default function Default() {
  return null; // render nothing when this slot has no match for the current URL
}
```

**Rule:** When creating any `@slot` directory, add `default.tsx` returning `null` as the **first** file — before `page.tsx`.

### 17. `(..)` in intercepting routes counts URL segments, not filesystem folders

The `(..)` interception convention counts **URL segment levels**, not directories on disk. `@slot` directories and route groups `(auth)` are both invisible to `(..)` — they don't count as levels.

```tsx
// ❌ Wrong: developer sees two filesystem levels and writes (..)(..)
// app/feed/@modal/(..)(..)photo/[id]/page.tsx
// Actual URL path to intercept: /photo/123 → one segment above /feed
// Correct answer: (..) not (..)(..)

// ✅ Correct: count URL segments the user sees in the browser bar only
// To intercept /photo/[id] from within /feed:
app/feed/@modal/(.. )photo/[id]/page.tsx  // one URL level up
// @modal is invisible (slot) — does not count
// (feed) route groups are also invisible — do not count
```

**Counting rules:**

- `@folder` (slot) → **does not count** as a URL level
- `(group)` (route group) → **does not count** as a URL level
- `folder` (regular segment) → **counts** as one URL level
- Using `(..)` at the root `app` level is a **build error** — use `(.)` instead

## Personal Preferences

### Branching Strategy — Trunk-Based Development (TBD)

- This project uses **Trunk-Based Development** — Git Flow is NOT used
- `main` is the trunk and must always be releasable
- Prefer committing directly to `main` for small, complete changes
- If a branch is needed, keep it **short-lived** (merge within 1 day)
- Branch names: `<type>/<short-description>` (e.g. `fix/login-redirect`, `feat/user-avatar`)
- No `develop`, `release`, or `hotfix` branches
- Use feature flags for incomplete work in progress

### Language and Comments

- All code comments must be written in **English**
- Commit messages in English
- Variable names, function names, and identifiers in English

### Operating System

- All terminal commands must target **macOS** (use `open`, `pbcopy`, `brew`, etc.)
- Do not suggest Linux-only or Windows-only commands
- Use `~` for home directory, macOS paths and conventions
- **Chain sequential commands with `&&` in a single terminal call** — e.g., `pnpm lint && pnpm type-check && pnpm test` instead of three separate calls. VS Code creates one "Chat Terminal" per `run_in_terminal` invocation; chaining minimises terminal proliferation in the Chat Terminals panel.

### Session Completion Checklist

Before ending any coding session or considering a task complete, the following commands MUST pass without errors:

```bash
pnpm lint        # ESLint — zero errors
pnpm type-check  # TypeScript type check — zero errors
pnpm test        # Vitest — all tests passing
pnpm build       # Next.js production build — successful
```

Never mark a task as done if any of these commands fail. Fix all errors before concluding.

> **Conditional security scan**: For sessions that touch `app/api/**`, `app/auth/**`, `auth.ts`, or `proxy.ts`, run a targeted security review using the [GitHub Security Lab Taskflow Agent](https://github.com/GitHubSecurityLab/gh-actions-workflows/tree/main/taskflow) to detect Auth Bypass, IDOR, and Token Leak patterns before marking the session complete. See the [accompanying blog post](https://github.blog/security/how-to-scan-for-vulnerabilities-with-github-security-labs-open-source-ai-powered-framework/) for setup instructions.

Enable **GitHub Copilot code review** on the repository as a mandatory automated PR quality gate. It complements the local lint/tsc/test/build checklist by catching issues before human reviewers are involved. To enable: go to **Settings → Code review → Copilot code review** and toggle it on for the default branch.

This repository also includes a `.coderabbit.yaml` config — for open-source repos, CodeRabbit is free and provides a second automated review layer. To activate: go to [coderabbit.ai](https://coderabbit.ai), sign in with GitHub, and install the App on this repo.

## When Stuck

If you are unsure how to proceed during a task:

1. **Check existing patterns first** — search the codebase for similar implementations before creating new ones
2. **Do not guess behavior** — verify assumptions by reading source code, existing tests, and established patterns before drawing conclusions
3. **Run the type checker** — `pnpm type-check` often pinpoints the exact issue; fix type errors before investigating test failures — they're often the root cause
4. **If type checking keeps failing** — run `pnpm clean` to clear build caches, then re-run `pnpm type-check`
5. **Read the relevant instruction file** — check the "Component-Specific Instructions" table for the directory you're working in
6. **Propose a plan before complex changes** — for multi-file refactors or anything touching shared types, outline the approach and ask for confirmation before proceeding
7. **Don't guess at security or business rules** — if access control or domain logic is unclear, ask rather than assume
8. **When unclear how to verify a change** — ask the user how they'd like it verified before proceeding; not every change fits the standard quality gate (lint + tsc + test)
9. **Never guess CLI flags** — always check `--help` before using an unfamiliar command or flag
10. **Prefer smaller reversible changes** — break large tasks into smaller committed steps that can be reviewed and rolled back independently
11. **Stop after 2–3 failed attempts** — if the same fix fails repeatedly, document what you tried and ask rather than continuing to guess
12. **Start a fresh chat when the context window feels overloaded** — more context is not always better. If the agent starts repeating itself, contradicting earlier decisions, or producing lower-quality output than before, open a new chat with a concise summary of what remains. A fresh context window consistently outperforms a "Hoarders-effect" one where every previous exchange is in scope.

> If you are about to change 5+ files, touch shared types or API contracts, or make a breaking change — stop and propose a plan first.

## Task Completion Guidelines

These define the expected artifacts for each task type. Use judgment — trivial fixes (typos, one-liners) may not need all steps.

### Bug Fixes

1. **Tests**: Add a failing test that reproduces the bug (regression guard)
2. **Implementation**: Fix the root cause — not just the symptom
3. **Verification**: Run the quality gate to confirm no regressions

### New Features

1. **Implementation**: Build the feature following project conventions
2. **Unit tests**: Cover new logic with Vitest — aim for 80%+
3. **E2E test** (if user-facing): Add or update a Playwright test
4. **Documentation**: Update relevant comments or docs for public APIs

### Refactoring / Internal Changes

- Write tests for any changed behavior
- No documentation needed for internal-only changes
- Do not change public APIs without updating all callers

### When to Deviate

These are guidelines, not rigid rules. Adjust based on scope and context. When uncertain, ask.

## Knowledge Reminders

> The AI training data frequently contains outdated patterns for the versions used in this project. Prefer the code patterns already present in this repo over your general knowledge when they conflict.

### Skills invocables con slash commands

Any skill in `.agents/skills/` can be loaded directly in the chat with `/skill-name` (e.g., `/zod`, `/vitest`, `/aws-ecosystem`). The agent loads the corresponding `SKILL.md` and follows its instructions. Combine multiple skills in one prompt: `/zod /vitest add validation tests`.

### Message Steering

While an agent is working, you can send a follow-up message in the chat with additional details or corrections — the agent incorporates it **mid-flight**, without stopping or waiting. No need to cancel and restart the session to add context.

### Fork Conversations (`/fork`)

Type `/fork` in the chat to create a new session with the full conversation history. Use it to explore an alternative approach (e.g., a more minimal design, a different data-fetching strategy) without losing the original context. Equivalent to branching the conversation.

### Tailwind CSS v4

- **Installed version**: v4.2.1 (`tailwindcss: ^4` in `package.json`)
- **Config**: No `tailwind.config.js` — configuration is CSS-first, inside `globals.css`
- **Directives**: Use `@import "tailwindcss"` (NOT the three `@tailwind base/components/utilities` directives from v3)
- **Plugins**: Use `@plugin` directive in CSS, not `plugins: []` in config
- **v4.1+ new utilities** (available in this project): `text-shadow-*` (e.g., `text-shadow-sm`, `text-shadow-lg`), `mask-*` (image/gradient masking), `inset-shadow-*`, `drop-shadow-*` — prefer these over custom CSS when available
- **v4.2+ new utilities** (available in this project): `pbs-*` / `pbe-*` (padding-block-start / padding-block-end logical properties), four new default-theme color palettes: `mauve`, `olive`, `mist`, `taupe` — use these before reaching for custom tokens

### CVA (class-variance-authority)

- **Purpose**: The standard Tailwind ecosystem library for typed, exportable component variants. Use it whenever a component accepts `variant` or `size` props.
- **Export `*Variants` from every component that has variants** — e.g., `buttonVariants`, `badgeVariants`. This lets any element adopt button/badge styles without using the component itself and without duplicating class strings.
- **`ButtonLink` pattern**: when a link must visually look like a button, use `<ButtonLink>` from `@/components/ui/button-link` (renders a `<Link>` with button styles). Never use a `<button disabled>` as a visual-only anchor.
- **Typing**: derive props from `VariantProps<typeof myVariants>` — do not define variant union types manually.
- **Merge with `cn()`**: always wrap CVA output with `cn()` when accepting an external `className` prop so `tailwind-merge` can deduplicate classes.

```ts
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva("base-classes", {
  variants: { variant: { primary: "...", secondary: "..." } },
  defaultVariants: { variant: "primary" },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

// In render:
className={cn(buttonVariants({ variant, size }), className)}
```

### Auth.js v5

- **Install**: `pnpm add next-auth@beta` — the npm package is still `next-auth`, version 5 is in beta. **Before installing, run `pnpm info next-auth dist-tags` to check whether v5 has a stable tag** — the `@beta` tag may become stale without notice. If `stable` or `latest` points to v5, drop the `@beta` suffix.
- **Server session**: Call `auth()` from `@/lib/auth` in Server Components and API routes
- **Route handler**: `GET` and `POST` exported from `app/api/auth/[...nextauth]/route.ts`
- **Middleware**: Use `auth` as middleware exported from `auth.ts` at root — do NOT use `withAuth` from v4
- **`proxy.ts` runs on Node.js runtime**: `auth()` can be called directly in `proxy.ts` (unlike `middleware.ts` which required the Edge-compatible `getToken()`). Only use `getToken()` from `next-auth/jwt` if you explicitly configure proxy to run on Edge runtime.

### Next.js 16

- **`'use cache'`**: This is a Next.js 16 directive for Cache Components — different from React's `cache()` import
- **`proxy.ts`**: The **official Next.js 16 file convention** for request interception, replacing the deprecated `middleware.ts`. Runs on **Node.js runtime** by default (not Edge runtime), so `auth()` from Auth.js can be called directly. Official migration: `npx @next/codemod@latest middleware-to-proxy .`
- **No `pages/` directory**: This project uses App Router only — never suggest Pages Router patterns
- **`export const revalidate` is deprecated** when `cacheComponents: true` — use `cacheLife()` called at the top of a `use cache` function instead. Lifetime is collocated with the data that creates it, not the page/layout that consumes it.
- **`export const dynamic = 'force-static'` is deprecated** when `cacheComponents: true` — use `use cache` + `<Suspense>` composition instead. `force-static` silently makes all request APIs (`cookies()`, `headers()`, `params`) return empty values, introducing subtle and hard-to-find bugs.
- **`generateStaticParams` must return ≥ 1 param set** when `cacheComponents: true` — an empty array is now a build error. Next.js requires pre-rendering at least one route to discover dynamic API usage at build time (see Common Pitfalls #12).
- **Dynamic API access outside `<Suspense>` is now a build error** when `cacheComponents: true` — wrapping dynamic components (`cookies()`, `headers()`, `params`) in `<Suspense>` is required for PPR to work (see Common Pitfalls #13).
- **Pages are no longer simply static or dynamic** — with `cacheComponents: true`, PPR is on by default. Pages are _both_: a static shell is served instantly from the edge while `<Suspense>`-bounded dynamic sections stream in. Compose behavior with code, not segment config options.

#### Next.js 16.1 (December 2025)

- **Turbopack filesystem caching for `next dev` is stable and on by default** — compiler artifacts are cached on disk across restarts; no configuration required. Significant improvement for large projects (Vercel's own apps saw major speedups). See [turbopackFileSystemCache docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache) if you need to customize the cache directory.
- **`next dev --inspect`**: Use this flag (now a proper Next.js CLI arg) to attach the Node.js debugger to the dev server. This replaces the old `NODE_OPTIONS=--inspect` workaround, which used to attach the inspector to _all_ spawned processes. `.vscode/launch.json` is pre-configured with this pattern.
- **Built-in Bundle Analyzer (experimental, Turbopack)**: Next.js 16.1 ships its own bundle analyzer that integrates with Turbopack — filters by route, traces full import chains across server/client boundaries. Access it by running `pnpm build` and following the output link. This is separate from `pnpm analyze` (`@next/bundle-analyzer` + webpack) which is still the stable option for production audits.
- **`browserDebugInfoInTerminal`**: This project's `next.config.ts` has `experimental.browserDebugInfoInTerminal` enabled. It forwards browser-side runtime errors, client warnings, and async errors to the terminal — making them visible to AI agents that can only see the terminal, not the browser. See the Next.js "agentic future" blog post for context.
- **Security (December 2025)**: Two critical RSC vulnerabilities (CVE-2025-66478 + Dec 11 advisory) were patched in `next@16.1.6`. Always stay on the latest Next.js minor release — security patches are not backported to older minors. Run `pnpm info next dist-tags` to verify you are on `latest`.

### TypeScript 5.x

- **Current stable**: TypeScript 5.9.3 (`latest` tag). TypeScript 6.0 RC is available via `typescript@rc` (since 2026-03-06); **do not upgrade until the team explicitly evaluates the RC**.
- **Before upgrading to 6.0**: run `pnpm info typescript dist-tags` to check whether `rc` has moved to `latest`; review TS 6.0 release notes for breaking changes in module resolution, decorator handling, or strict-mode behavior that could affect `tsconfig.json` assumptions.
- **`^5` range is intentional**: The project's `package.json` pins `"typescript": "^5"` — this will NOT auto-upgrade to 6.0. An explicit version bump is required.
- **TypeScript 7 (native port) is in development** — this is a separate effort from TS 6.0; the compiler is being ported to Go/native code for a 10x+ speed improvement. No release date yet. When TS7 preview packages appear on npm, evaluate separately — it may require `tsconfig.json` adjustments and is distinct from the TS6 upgrade path.

### Dates & Times

**Never use `new Date()` in business logic.** The native `Date` object has mutable state, 0-indexed months, and inconsistent string parsing — all sources of subtle bugs. This project uses the TC39 **Temporal API** via the `temporal-polyfill` package (FullCalendar edition, v0.3.2, updated March 2026).

- **Import Temporal**: `import { Temporal } from 'temporal-polyfill'` — required because Node 20 does not expose native Temporal globals
- **`DateInput` type**: use this type for _any_ parameter that accepts a date: `Date | string | number | Temporal.Instant | Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime`. It is exported from `@/lib/dates`.
- **Central module**: all date/time utilities live in `lib/dates.ts` — import from there: `import { formatDate, formatRelative, isExpired, addDuration } from '@/lib/dates'`
- **Do NOT use `new Date()` for arithmetic or comparisons** — use `differenceInDays`, `addDuration`, `isExpired`, `isFuture` from `@/lib/dates` instead
- **Do NOT import `formatDate` from `@/lib/utils`** in new code — import from `@/lib/dates` directly. The re-export in `lib/utils.ts` exists only for backward compatibility.
- **ISO strings**: always use `toISOString(input)` from `@/lib/dates` to serialise dates for APIs/DBs — it guarantees UTC regardless of input timezone
- **Formatting**: use `formatDate` / `formatDateTime` / `formatRelative` — they default locale to `APP_LOCALE` from `lib/constants.ts`, never hardcoded `"en-US"`
- **Server-safe**: all functions in `lib/dates.ts` are synchronous, have no browser-only APIs, and can be used in Server Components, Route Handlers, and Client Components
- **Bundle cost**: `temporal-polyfill` is ~35kB gzipped. Heavy date arithmetic should stay server-side. Display formatting via `Intl.DateTimeFormat` (used internally) is zero additional bundle cost.

**Migration path** — when native Temporal lands in Node LTS (~2027), the only change will be removing the import line:

```ts
// Before (current)
import { Temporal } from "temporal-polyfill";
// After (future — Temporal becomes a global)
// (remove import line)
// All call sites remain identical.
```

**Quick reference**:

```ts
import {
  parseToInstant,
  formatDate,
  formatRelative,
  isExpired,
  addDuration,
  differenceInDays,
  toISOString,
} from "@/lib/dates";
import type { DateInput } from "@/lib/dates";

// Safe parsing of any input
const instant = parseToInstant(userInput); // throws AppError for invalid strings

// Formatting
formatDate(new Date()); // "June 15, 2024"
formatDateTime(isoString); // "June 15, 2024 at 2:30:00 PM"
formatRelative(expiry); // "in 3 days" / "2 hours ago"

// Predicates
isExpired(token.expiresAt); // boolean
isFuture(scheduledAt); // boolean

// Serialisation (always UTC)
toISOString(new Date()); // "2024-06-15T12:00:00Z"

// Arithmetic
addDuration(now, { days: 7 }); // Temporal.Instant (7 days from now)
differenceInDays(start, end); // number (positive or negative)
```

### Zod v4

- **Import**: `import { z } from "zod"` — same as v3; for bundle-sensitive Client Components use `import { z } from "zod/mini"` (sub-path export of `zod`, NOT the old `@zod/mini` v3 package)
- **Current version**: Zod v4.3.6 (as of 2026-03-08)
- **Key breaking changes from v3**: `.transform()` and `.refine()` callback signatures are unchanged; `z.discriminatedUnion()` now requires a literal discriminator key and is stricter at compile time; `ZodError` shape is the same but `.format()` output may differ for nested errors — test existing Zod error display logic after upgrading from v3. `z.string().email()` and most validation methods remain compatible.
- **LLM metadata**: Add `.describe("...")` to every schema field that will be consumed by an LLM or exposed as a tool definition — this is the single most impactful pattern for AI-optimized schemas: `z.string().uuid().describe('User identifier')`
- **JSON Schema for tool calling**: `z.toJSONSchema(schema)` is **built-in in Zod v4** — no extra packages needed. Use it to generate tool/function specs for Amazon Bedrock (`tool_spec.inputSchema.json`), OpenAI function calling, or the Vercel AI SDK. Never write JSON Schema manually when a Zod schema already exists.
- **JSON Schema → Zod** (v4.3.0+): `z.fromJSONSchema(schema)` is the inverse — converts an existing JSON Schema or OpenAPI definition into a Zod schema. Pair with `z.toJSONSchema()` when round-tripping between external tool specs and internal validation.
- **Error display**: `z.prettifyError(result.error)` formats validation errors as readable text — replaces manual `.format()` calls
- **Input vs Output types**: Use `z.input<typeof schema>` for the pre-transform shape (what APIs send), `z.infer<typeof schema>` (= `z.output<>`) for the post-transform shape (what your code uses)

### React 19

- **New hooks**: `useActionState`, `useFormStatus`, `useOptimistic` are available directly from `react`
  - **`useOptimistic` is the App Router answer to React Query mutations**: when a Server Action is pending, show the expected result immediately to keep the UI responsive. Use it for list toggles, like/unlike, archive/unarchive, and any small inline mutation where the round-trip latency would feel sluggish. Pattern: call `addOptimistic(newItem)` before `await serverAction()`, then the real server state snaps in when the action completes. Works in Client Components only — wrap the mutation caller in `"use client"` and keep the Server Action in a separate `"use server"` file or `actions.ts`.
- **`use()` hook**: Can unwrap Promises and Context — useful in Server Components
- **No `React.FC`**: Just write `function MyComponent({ prop }: { prop: string })` — no type annotation needed for the component itself
- **React Compiler v1.0** (stable since Oct 2025): enabled in this template via `experimental.reactCompiler: true` in `next.config.ts`. The compiler automatically inserts `useMemo`, `useCallback`, and `memo` at compile time — **do not add these manually** unless you have measured a specific regression. The compiler is smarter than human judgment for most cases. If you see a lint rule or pattern suggesting to add `useMemo`/`useCallback`, verify the compiler hasn't already handled it. See `react.dev/learn/react-compiler`.

### Zustand v5

- **Install**: `pnpm add zustand` — current version is v5.0.11.
- **Client-only**: Use Zustand for client-side UI state only — never for server data or SSR-fetched content; see `store/**` skill.
- **`unstable_ssrSafe` middleware** (v5.0.9+): Experimental middleware designed for Next.js server rendering. Prevents hydration mismatches caused by Zustand stores being accessed during SSR. Usage: `create(unstable_ssrSafe(storeImplementation))`. Monitor until the `unstable_` prefix is dropped before adopting in production.

### GitHub Copilot Approval Modes & Model Selection

**Approval modes** (Chat input → **default approvals** dropdown):

| Mode              | What it does                                         | When to use                                         |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------- |
| Default Approvals | Prompts before every tool call                       | Infra, AWS, schema changes, irreversible operations |
| Bypass Approvals  | Auto-approves all tool calls (YOLO)                  | Speed + full trust in the agent                     |
| Autopilot         | Bypass + auto-retry API errors + forceful completion | **Default for all feature work**                    |
| Sandbox           | Bypass + process/network isolation                   | Running untrusted or external-facing code           |

> Switch to **Default Approvals** whenever the task involves AWS resources, database migrations, or secret rotation — never let Autopilot touch infra unattended.

**Recommended model assignments** (set via `Settings → Copilot → model preferences`):

| Task / Agent mode                   | Recommended model                             | Why                                                                                 |
| ----------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Plan / Planner                      | Claude Sonnet 4.6 or GPT-o3                   | Low time-to-first-token; strong at structured reasoning                             |
| Initial feature build (broadstroke) | Claude Sonnet 4.6 / o3-Codex                  | Best at one-shotting large multi-file features on the first attempt                 |
| Complex debugging / bug regression  | GPT o3 / Codex                                | Excels at isolating root causes in complex stateful or multi-layer bugs             |
| UI/UX visual polish                 | Gemini 3 Pro (or inline with ui-ux-pro skill) | Strongest model for design aesthetics; pair with `ui-ux-pro` skill for Tailwind v4  |
| Refactoring + test-fix loop         | Fast model (Haiku, GPT-4o mini)               | High iteration speed for split/reorganize tasks; see **Test-Fix Loop** in AGENTS.md |
| Ask / Explore                       | Fast model (Haiku, GPT-4o mini)               | Interactive Q&A benefits most from responsiveness                                   |
| Inline chat                         | Fast model                                    | Completions must feel instant                                                       |

> These are baseline recommendations based on VS Code team evals (March 2026). Thinking effort is already set high by default for Opus — do not blindly bump reasoning level upward, as it increases latency without always improving output. Verify your defaults via `Settings → Copilot → thinking effort`.
>
> **Multi-model workflow**: use the powerful model (Sonnet/o3-Codex) for the initial feature → switch to GPT o3 if debugging proves intractable → use Gemini / `ui-ux-pro` skill for UI polish → use a fast model for refactoring and the test-fix loop. Each model has a distinct strength; forcing one model to do everything leads to regressions (the powerful model may silently delete existing functionality when adding new features).

## VS Code Agent Hooks (Preview)

> **Requires VS Code >= 1.110 stable** (released 2026-03-07). VS Code 1.110 introduced agent skills (`.agents/skills/`) and session memory (`/memories/session/`) — both are already used by this project. If you are on an older version, skills and session memory will not be available.

Hooks execute shell commands at specific agent lifecycle points. Store hook configs in `.github/hooks/*.json` — they are committed to the repo and apply for all team members. VS Code also reads `.claude/settings.json` and `~/.claude/settings.json` for Claude Code compatibility.

| Event          | Use for                                                     |
| -------------- | ----------------------------------------------------------- |
| `PreToolUse`   | Block destructive operations (`rm -rf`, `DROP TABLE`)       |
| `SessionStart` | Inject branch/Node version context into every session       |
| `SessionEnd`   | Require full quality gate to pass before the agent finishes |

> **`PostToolUse` is intentionally disabled** in this project. Running lint + type-check after every individual file edit creates one Chat Terminal per edit (VS Code opens a new terminal per hook invocation), flooding the Chat Terminals panel. The `SessionEnd` hook already runs the full quality gate (`lint + type-check + test + build`) at the end of every session — that is sufficient.
>
> **Opt-in**: If you want `PostToolUse` enabled for your local workflow, add a `PostToolUse` entry to `.github/hooks/hooks.json`. A ready-made script is already available at `.github/hooks/scripts/post-tool-check.sh` — add the entry below to activate it:
>
> ```json
> {
>   "event": "PostToolUse",
>   "script": ".github/hooks/scripts/post-tool-check.sh"
> }
> ```
>
> VS Code 1.111.0 (stable, released 2026-03-09) is the current stable release. Terminal proliferation with PostToolUse hooks persists in 1.111 — each hook invocation still creates a new Chat Terminal. The project default (PostToolUse disabled) remains correct.
>
> A second opt-in hook is the **`Stop` auto-commit** — makes a commit of all pending changes when the agent session stops, preventing loss of generated work. A ready-made script is available at `.github/hooks/scripts/session-stop-autocommit.sh` — add the entry below to `.github/hooks/hooks.json` to activate:
>
> ```json
> {
>   "event": "Stop",
>   "script": ".github/hooks/scripts/session-stop-autocommit.sh"
> }
> ```
>
> The script only commits if there are pending changes, never uses `--no-verify`, and always appends `[skip ci]` to the commit message.

Example — auto-lint after any file edit (`.github/hooks/quality.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "pnpm lint",
        "timeout": 30
      }
    ]
  }
}
```

Generate hooks with AI: type `/create-hook` in Chat and describe the automation. Hooks can be diagnosed via **Configure Chat → Diagnostics** in VS Code.

> Hooks execute with full shell permissions — always review hook configs before enabling, especially in shared repos.

### Integrated Browser (Preview)

> **Enable:** VS Code Settings → search **"Integrated Browser"** → toggle on. Requires VS Code >= 1.110.

The integrated browser is a full Electron-based browser running inside VS Code — no external dependencies and no separate install. Unlike the older Simple Browser, it behaves like Chrome or Edge and exposes developer tools natively.

When you click **Share with agent** in the toolbar, the agent gets direct access to browser inspection tools (equivalent to Playwright): navigate, click, scroll, take screenshots, and read the DOM — all without leaving VS Code.

**When to use it:**

- Implementing UI features — the agent can verify rendering in real time and self-correct against the live page
- Iterating on styles or layout — agent takes a screenshot, compares against a design reference, then adjusts
- Visual regression checks alongside Playwright tests

**Best practice:** Use Playwright alongside the integrated browser. Playwright handles deterministic interactions (navigate, click, fill); the integrated browser's screenshot tool provides the visual feedback loop for the agent to compare rendered output against the intended design. The integrated browser can also **run Playwright code autonomously** — giving the agent a closed verify-and-fix loop without a separate test runner.

> **Do not interact with the integrated browser while the agent is running** — clicking or navigating during an agent run can interfere with in-progress tool calls. Enable VS Code's Do Not Disturb or wait for the agent to complete a step before interacting.

### Autopilot Mode (Preview)

Setting: `chat.autopilot.enabled`

> **Enable in Stable:** Set `chat.autopilot.enabled: true` in your VS Code settings, or select **Autopilot** from the Chat input → **default approvals** dropdown.

Autopilot combines auto-approval of all tool calls with auto-retry on API errors and forceful completion prompting — the agent keeps working until it has genuinely finished the task, not just until it returns a stop token. It does not pause between phases to ask "should I continue?" — matching the autonomous behavior of cloud agents (Copilot coding agent assigned via GitHub Issues).

**Approval mode quick reference:**

| Mode              | Auto-approve tools | Auto-retry errors | Forceful completion |
| ----------------- | ------------------ | ----------------- | ------------------- |
| Default Approvals | ❌                 | ❌                | ❌                  |
| Bypass Approvals  | ✅                 | ❌                | ❌                  |
| **Autopilot**     | ✅                 | ✅                | ✅                  |
| Sandbox           | ✅ + isolated      | ❌                | ❌                  |

**When to use:**

- After agreeing on a plan via Plan mode — the plan is written to session memory and stays in context even if the conversation compacts
- Multi-phase features where each phase logically follows the previous one
- When you prefer to review the full diff at the end rather than approving each step individually

**When NOT to use:**

- Exploratory sessions where you want to steer the agent at each decision point
- Tasks involving irreversible operations (destructive refactors, schema changes, AWS infra) — use Default Approvals so each step can be reviewed
- When running code from untrusted or external sources — use Sandbox mode instead

> **Recommended workflow:** Use **Plan mode** first → agree on the plan → verify it appears in session memory → enable **Autopilot** → the agent executes to completion without interruption.

## Agent Routing (Default Behaviour)

Routing logic and the full intent-to-agent decision table live in `.github/agents/router.agent.md`. Use the **Router** agent as the default entry point — it reads your intent and delegates to the appropriate specialist automatically.

Available specialist agents: **Feature Builder**, **Debug**, **Planner**, **Code Reviewer**, **Test Generator**, **Architect**, **ADR Generator**, **GitHub Actions**, **PRD Creator**.

If already inside a specialist agent context, skip routing and proceed directly with the work.

For running multiple independent agent tasks in parallel from the CLI, use the `/fleet` command — see `AGENTS.md` § Running Parallel Agent Tasks with `/fleet`.

## Infrastructure & Cloud

### AWS as Default Cloud Ecosystem

**Before reaching for a standalone SaaS tool, always check if AWS provides an equivalent managed service.** The goal is a unified ecosystem: single IAM control plane, one billing account, native VPC networking, and CloudWatch for all observability.

| Need                 | AWS Service                    | Non-AWS alternative (avoid unless justified) |
| -------------------- | ------------------------------ | -------------------------------------------- |
| Relational DB        | RDS Aurora Serverless v2       | PlanetScale, Supabase, Neon                  |
| NoSQL / Document     | DynamoDB                       | MongoDB Atlas, Firebase                      |
| Cache / sessions     | ElastiCache Serverless (Redis) | Upstash, Redis Cloud                         |
| Object storage       | S3                             | Cloudinary (media only OK), Uploadthing      |
| Queues               | SQS                            | BullMQ (local only), Inngest                 |
| Cron / scheduling    | EventBridge Scheduler          | Vercel Cron, EasyCron                        |
| Serverless functions | Lambda                         | Vercel Edge Functions, Cloudflare Workers    |
| AI text generation   | Amazon Bedrock (Claude/Titan)  | Direct OpenAI, Anthropic API                 |
| Vector search        | OpenSearch Serverless          | Pinecone, Weaviate                           |
| Email                | SES                            | Resend, SendGrid                             |
| Secrets              | Secrets Manager                | Vercel Env Vars (dev only)                   |

**Agent orchestration**: LangChain.js is explicitly excluded — use the custom agent router (`.github/agents/router.agent.md`) as the orchestration mechanism. Do not introduce `langchain` as a project dependency.

**OpenAI Node SDK**: If OpenAI Node SDK is used directly in a feature (not through Bedrock), require `>= v6.27.0` — `ComputerTool` reached GA in that release and `computer_use_preview` was deprecated. Prefer Amazon Bedrock over direct OpenAI SDK usage.

**AWS CLI is required** — use it for all infra operations; never click through the console for repeatable tasks.

```bash
# Verify setup
aws sts get-caller-identity

# Use named profiles for multi-account
export AWS_PROFILE=dev
```

**SDK**: Use AWS SDK v3 (`@aws-sdk/client-*`) — modular, tree-shakeable. Never import from the deprecated `aws-sdk` v2 package.

**IAM**: Assign IAM Roles to Lambda/ECS tasks — never use `AWS_ACCESS_KEY_ID` in production environment variables.

**Claude Code `modelOverrides`**: Claude Code v2.1.73+ supports a `modelOverrides` setting that maps model picker entries to custom provider model IDs — including Bedrock inference profile ARNs. Use this to route model picker selections to Bedrock, keeping model interactions within the AWS billing and VPC boundary instead of going directly to the Anthropic API.

See the `aws-ecosystem` skill (`.agents/skills/aws-ecosystem/SKILL.md`) for full CLI patterns and SDK code examples.

### Web Scraping — Cheerio

When a feature requires parsing HTML from external URLs, extracting data from web pages, reading RSS/Atom feeds, or transforming HTML content, use **Cheerio v1**.

- Server-side only — never import Cheerio in Client Components
- Prefer `$.extract({ ... })` over manual `.each()` traversal for structured data
- Always validate the target URL with Zod before scraping to prevent SSRF
- Cache scraped results — wrap in `'use cache'` (preferred in Next.js 16) or `unstable_cache` (legacy) to avoid repeated fetches
- At scale, run scrapers in AWS Lambda triggered by EventBridge and store results in DynamoDB/S3

See the `cheerio` skill (`.agents/skills/cheerio/SKILL.md`) for full patterns.

```bash
pnpm add cheerio
```

### MCP Servers — Exposing tools to AI agents

When a feature needs to be callable by an AI client (VS Code Copilot, Claude Desktop, Cursor), expose it as an **MCP (Model Context Protocol) server** via a Route Handler.

- MCP server Route Handler lives at `app/api/mcp/route.ts` — use Streamable HTTP transport
- Tool handler logic lives in `lib/mcp/tools.ts` (marked `import 'server-only'`) so it can be unit-tested in isolation
- All tool inputs validated with `inputSchema.parse(args)` using Zod — never trust raw MCP arguments
- Add `.describe("...")` to every Zod field in tool input schemas — this is what AI clients show users
- `z.toJSONSchema(schema)` is built-in in Zod v4 — no extra packages needed
- Protect endpoints with bearer token auth — never expose unauthenticated MCP tools in production
- Register the endpoint in `.vscode/mcp.json` for local VS Code Copilot discovery

See the `mcp-server` skill (`.agents/skills/mcp-server/SKILL.md`) for the full skeleton.

```bash
pnpm add @modelcontextprotocol/sdk
```

**Prefer generic batch tools over specialised tools**: Vercel's text-to-SQL agent collapsed months of specialised bespoke tooling into a single batch shell command tool (run `grep`, `npm run`, `eslint`, etc. natively). Result: **3.5× faster**, **37% fewer tokens**, success rate from **80% → 100%**. Anthropic's Claude Code team independently reached the same conclusion. When designing MCP servers, start with a single `run_command` tool that accepts a shell string — add specialised tools only when a generic approach demonstrably fails.

**Skills vs MCP servers — token cost**: MCP servers register all their tools into the model's context window on every request, even when not used. Skills add far fewer tokens. If you notice the agent compacting earlier than expected, run `/context` in the CLI to see tool token usage — then consider whether any MCP server could be replaced by a skill that documents how to call an equivalent CLI command instead.

## Convention Health Audit

Run this checklist before any template release or major merge to catch convention regressions before they reach downstream projects.

### Automated (must all pass)

```bash
pnpm lint --max-warnings=0   # catches all ESLint-enforced rules (including interface usage)
pnpm type-check              # catches structural type errors
pnpm knip                    # detects unused files, exports, and dependencies
```

### Manual spot-checks (conventions without lint enforcement)

| Convention                                      | Command                                                      | Expected                        |
| ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------- |
| No `interface` declarations                     | `grep -r "^interface " app/ components/ lib/ store/ types/`  | Zero results                    |
| No `enum` declarations                          | `grep -r "^enum " app/ components/ lib/ store/`              | Zero results                    |
| No `default export` outside Next.js conventions | `grep -rn "^export default " components/ lib/ hooks/ store/` | Zero results (pages/layouts OK) |
| No barrel re-exports used as import source      | `grep -rn "from \"@/components\"" app/ components/`          | Zero results                    |

### Instruction consistency check (when modifying instruction files)

Before changing a convention rule in any instruction file:

1. `grep -ri "interface\|type " .github/instructions/` — find all files that mention the topic
2. Update **all** files that reference the same rule — never change just one
3. Verify the change doesn't conflict with `copilot-instructions.md` (canonical)

### Convention compliance table

| Convention                                    | ESLint enforced                                          | Compliance target |
| --------------------------------------------- | -------------------------------------------------------- | ----------------- |
| No `any`                                      | ✅ `@typescript-eslint/no-explicit-any`                  | 100%              |
| `import type` for type-only imports           | ✅ `@typescript-eslint/consistent-type-imports`          | 100%              |
| `type` not `interface`                        | ✅ `@typescript-eslint/consistent-type-definitions`      | 100%              |
| No `enum` — use string union types            | ✅ `no-restricted-syntax` TSEnumDeclaration              | 100%              |
| No `class` outside `lib/errors.ts`            | ✅ `no-restricted-syntax` ClassDeclaration               | 100%              |
| No `React.FC` / `React.FunctionComponent`     | ✅ `no-restricted-imports`                               | 100%              |
| `export type` for type-only exports           | ✅ `@typescript-eslint/consistent-type-exports`          | 100%              |
| Function params ≤ 3                           | ✅ `max-params`                                          | 100%              |
| Files ≤ 300 lines (non-blank/comment)         | ✅ `max-lines`                                           | 100%              |
| No non-null assertions (`!`)                  | ✅ `@typescript-eslint/no-non-null-assertion`            | 100%              |
| `Boolean(value)` not `!!value`                | ✅ `no-implicit-coercion`                                | 100%              |
| No `eval()` / `new Function()`                | ✅ `no-eval` + `no-implied-eval`                         | 100%              |
| Boolean prefix (`is`, `has`, `can`, `should`) | ❌ manual                                                | ~100%             |
| No abbreviations in names                     | ❌ manual                                                | ~100%             |
| `@/` path alias for internal imports          | ❌ manual                                                | 100%              |
| No floating promises                          | ❌ manual (lint rule disabled — Next.js false positives) | 100%              |

## Learnings

_(Updated dynamically. When the user says `learn!`, extract the learning from the recent conversation and add it here as a bullet point under the most relevant section. Keep each entry brief — 1–2 sentences, actionable, generalizable.)_
