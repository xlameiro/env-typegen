---
description: "Guidelines for TypeScript Development targeting TypeScript 5.x and ES2022 output"
applyTo: "**/*.ts"
---

# TypeScript Development

> These instructions assume projects are built with TypeScript 5.x (or newer) compiling to an ES2022 JavaScript baseline. Adjust guidance if your runtime requires older language targets or down-level transpilation.
>
> **TypeScript 6.0 RC** is available via `typescript@rc` (as of 2026-03-06). The project intentionally pins `"typescript": "^5"` and will NOT auto-upgrade to 6.0. Before any upgrade: run `pnpm info typescript dist-tags` and review TS 6.0 release notes for breaking changes in module resolution, decorator handling, or strict-mode behavior.

## Core Intent

- Respect the existing architecture and coding standards.
- Prefer readable, explicit solutions over clever shortcuts.
- Extend current abstractions before inventing new ones.
- Prioritize maintainability and clarity, short focused functions, clean code.

## General Guardrails

- Target TypeScript 5.x / ES2022 and prefer native features over polyfills.
- Use pure ES modules; never emit `require`, `module.exports`, or CommonJS helpers.
- Rely on the project's build, lint, and test scripts unless asked otherwise.
- Note design trade-offs when intent is not obvious.

## Project Organization

- Follow the repository's folder and responsibility layout for new code.
- Use kebab-case filenames (e.g., `user-session.ts`, `data-service.ts`) unless told otherwise.
- Keep tests, types, and helpers near their implementation when it aids discovery.
- Reuse or extend shared utilities before adding new ones.

## Naming & Style

> Follow the naming conventions defined in `.github/copilot-instructions.md` §Core Conventions (kebab-case files, boolean prefixes, no abbreviations, descriptive generics). The rules below are TypeScript-specific additions.

- Use PascalCase for type aliases (and only for `Error` subclasses in `lib/errors.ts`); camelCase for everything else. **Never use `interface`, `enum`, or `class` outside `lib/errors.ts`** — use `type`, string union types, and functions instead. ESLint enforces all three.
- Avoid `interface` entirely — use `type` instead; avoid `enum` entirely — use string union types instead.
- Name things for their behavior or domain meaning, not implementation.

## Formatting & Style

- Run the repository's lint/format scripts (e.g., `npm run lint`) before submitting.
- Match the project's indentation, quote style, and trailing comma rules.
- Keep functions focused; extract helpers when logic branches grow.
- Favor immutable data and pure functions when practical.

## Type System Expectations

- Avoid `any` (implicit or explicit); prefer `unknown` plus narrowing.
- Use discriminated unions for realtime events and state machines.
- Centralize shared contracts instead of duplicating shapes.
- Express intent with TypeScript utility types (e.g., `Readonly`, `Partial`, `Record`).

## Async, Events & Error Handling

- Use `async/await`; wrap awaits in try/catch with structured errors.
- Guard edge cases early to avoid deep nesting.
- Send errors through the project's logging/telemetry utilities.
- Surface user-facing errors via the repository's notification pattern.
- Debounce configuration-driven updates and dispose resources deterministically.

## Architecture & Patterns

- Follow the repository's dependency injection or composition pattern; keep modules single-purpose.
- Observe existing initialization and disposal sequences when wiring into lifecycles.
- Keep transport, domain, and presentation layers decoupled with clear interfaces.
- Supply lifecycle hooks (e.g., `initialize`, `dispose`) and targeted tests when adding services.

## External Integrations

- Instantiate clients outside hot paths and inject them for testability.
- Never hardcode secrets; load them from secure sources.
- Apply retries, backoff, and cancellation to network or IO calls.
- Normalize external responses and map errors to domain shapes.

## Security Practices

- Validate and sanitize external input with schema validators or type guards.
- Avoid dynamic code execution and untrusted template rendering.
- Encode untrusted content before rendering HTML; use framework escaping or trusted types.
- Use parameterized queries or prepared statements to block injection.
- Keep secrets in secure storage, rotate them regularly, and request least-privilege scopes.
- Favor immutable flows and defensive copies for sensitive data.
- Use vetted crypto libraries only.
- Patch dependencies promptly and monitor advisories.

## Configuration & Secrets

- Reach configuration through shared helpers and validate with schemas or dedicated validators.
- Handle secrets via the project's secure storage; guard `undefined` and error states.
- Document new configuration keys and update related tests.

## UI & UX Components

- Sanitize user or external content before rendering.
- Keep UI layers thin; push heavy logic to services or state managers.
- Use messaging or events to decouple UI from business logic.

## Testing Expectations

- Add or update unit tests with the project's framework and naming style.
- Expand integration or end-to-end suites when behavior crosses modules or platform APIs.
- Run targeted test scripts for quick feedback before submitting.
- Avoid brittle timing assertions; prefer fake timers or injected clocks.

## Performance & Reliability

- Lazy-load heavy dependencies and dispose them when done.
- Defer expensive work until users need it.
- Batch or debounce high-frequency events to reduce thrash.
- Track resource lifetimes to prevent leaks.

## Return Types

- **Exported functions** must declare an explicit return type — they are library-like code consumed throughout the app, and explicit types prevent accidental signature drift. They also help AI tools (Copilot) provide more accurate completions without having to infer the return shape from the function body.
- **Server Actions** (`'use server'` files) must always declare their return type (e.g., `Promise<ActionResult>`) — they cross the client/server boundary and callers cannot verify the shape otherwise.
- **Route Handler exports** must declare `Promise<Response> | Response` or use `NextResponse` explicitly.
- **Recursive functions** must always declare a return type — TypeScript cannot infer them and defaults to `any`.
- **Tuple returns** must declare the tuple type explicitly (e.g., `[string, boolean]`) — without it TypeScript widens to `(string | boolean)[]`.
- **Discriminated union returns** (e.g., `{ success: true; data: T } | { success: false; error: string }`) must use an explicit return type — TypeScript merges the shapes otherwise, losing the discriminant narrowing.

**Do NOT add return types to:**

- Local (non-exported) helper functions — inferred types are fine for locally scoped code
- React components (`.tsx`) — JSX inference handles them; adding `JSX.Element` is verbose noise
- Simple inline arrow functions / callbacks

## Next.js 16 Type Patterns

Use these canonical patterns when writing Next.js 16 App Router code. They ensure Copilot can hover and autocomplete types correctly and that `generateMetadata` can reuse the same prop shape without duplication.

### Page props (static route, with searchParams)

```tsx
// app/dashboard/page.tsx
type PageProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Dashboard" };
}

export default async function DashboardPage({
  searchParams,
}: Readonly<PageProps>) {
  const { q, page } = await searchParams;
  // ...
}
```

### Page props (dynamic route, params + searchParams as Promises)

```tsx
// app/products/[slug]/page.tsx
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
};

export default async function ProductPage({
  params,
  searchParams,
}: Readonly<PageProps>) {
  const { slug } = await params;
  const { variant } = await searchParams;
  // ...
}
```

### Layout props

```tsx
// Standard layout — children only
type LayoutProps = {
  children: React.ReactNode;
};

// Parameterized layout (e.g., locale or tenant routing)
type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AppLayout({ children, params }: Readonly<LayoutProps>) { ... }
```

### Route Handler (with typed response)

Route Handlers have no props type — use `NextRequest` directly. Always declare the return type using `NextResponse<T>` or `Response`:

```ts
// app/api/users/route.ts
import { type NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<ApiResponse<User[]>>> {
  const users = await getUsers();
  return NextResponse.json({ success: true, data: users });
}
```

### Server Action return type

Always declare an explicit return type. Use the `ApiResponse<T>` utility type from `types/index.ts` for actions that return data, or a simple `{ error: string } | null` for form mutations:

```ts
// app/profile/actions.ts
"use server";
import type { ApiResponse } from "@/types";

export async function updateProfile(
  data: UpdateUser,
): Promise<ApiResponse<User>> {
  // ...
  return { success: true, data: updatedUser };
}
```

### `PageProps` naming rules

- **Always name the type `PageProps`** — it is a local inline type (never exported from the file)
- Never put `PageProps` in `types/index.ts` — it is page-specific
- Use `Readonly<PageProps>` on the function parameter — **never** `Readonly<{...}>` as an anonymous inline type
- `params` and `searchParams` are **always** `Promise<{...}>` in Next.js 16 (async params)
- `generateMetadata` can receive the same `PageProps` type directly (without `Readonly<>`) — it is a regular async function, not a component

## Type File Locations

Follow the three-tier hierarchy defined in `.github/copilot-instructions.md` § Type Placement Decision Matrix. Quick reference:

| Type location                     | Use when                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Inline in the file (not exported) | Used only in that file (e.g., `PageProps`, local helper shapes)                 |
| `[feature]/types.ts`              | Shared within a feature folder (≥ 2 files)                                      |
| `lib/schemas/[domain].schema.ts`  | Entity types inferred with `z.infer<typeof schema>`                             |
| `types/index.ts`                  | Domain-agnostic structural utilities (`ApiResponse<T>`, `PaginatedResponse<T>`) |

## Declaration Files (`.d.ts`)

- Use `.d.ts` files **only** for module augmentation — e.g., extending `next-auth` session types or declaring ambient shapes for CSS/SVG/JSON modules
- **Never write application types in `.d.ts` files** — use regular `.ts` modules so the types are importable with `import type`
- `next-env.d.ts` is auto-generated by Next.js — do not edit it directly; it is re-created on every build
- Example of a legitimate `.d.ts` use (session augmentation):

```ts
// types/next-auth.d.ts
import "next-auth";
declare module "next-auth" {
  interface Session {
    user: { id: string; role: "admin" | "user" };
  }
}
```

- Add JSDoc to public APIs; include `@remarks` or `@example` when helpful.
- Write comments that capture intent, and remove stale notes during refactors.
- Update architecture or design docs when introducing significant patterns.

## Learnings
