---
description: "Best practices for building Next.js (App Router) apps with modern caching, tooling, and server/client boundaries (aligned with Next.js 16.1.6)."
applyTo: "**/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css"
---

# Next.js Best Practices for LLMs (2026)

_Last updated: March 2026 (aligned to Next.js 16.1.6)_

> **Note**: v16.1.6 is a **backport release** — it contains bug fixes cherry-picked from canary and does not include all pending features or changes available in canary builds. Do not adopt undocumented canary features without explicit evaluation against this version.

This document summarizes the latest, authoritative best practices for building, structuring, and maintaining Next.js applications. It is intended for use by LLMs and developers to ensure code quality, maintainability, and scalability.

---

## 1. Project Structure & Organization

- **Use the `app/` directory** (App Router) for all new projects. Prefer it over the legacy `pages/` directory.
- **Top-level folders:**
  - `app/` — Routing, layouts, pages, and route handlers
  - `public/` — Static assets (images, fonts, etc.)
  - `lib/` — Shared utilities, API clients, and logic
  - `components/` — Reusable UI components
  - `hooks/` — Custom React hooks
  - `types/` — TypeScript type definitions
- **Colocation:** Place files (components, styles, tests) near where they are used, but avoid deeply nested structures.
- **Route Groups:** Use parentheses (e.g., `(admin)`) to group routes without affecting the URL path.
- **Private Folders:** Prefix with `_` (e.g., `_internal`) to opt out of routing and signal implementation details.
- **Feature Folders:** For large apps, group by feature (e.g., `app/dashboard/`, `app/auth/`).
- **Use `src/`** (optional): Place all source code in `src/` to separate from config files.

## 2. Next.js 16+ App Router Best Practices

### 2.1. Server and Client Component Integration (App Router)

**Never use `next/dynamic` with `{ ssr: false }` inside a Server Component.** This is not supported and will cause a build/runtime error.

**Correct Approach:**

- If you need to use a Client Component (e.g., a component that uses hooks, browser APIs, or client-only libraries) inside a Server Component, you must:
  1. Move all client-only logic/UI into a dedicated Client Component (with `'use client'` at the top).
  2. Import and use that Client Component directly in the Server Component (no need for `next/dynamic`).
  3. If you need to compose multiple client-only elements (e.g., a navbar with a profile dropdown), create a single Client Component that contains all of them.

**Example:**

```tsx
// Server Component
import DashboardNavbar from "@/components/DashboardNavbar";

export default async function DashboardPage() {
  // ...server logic...
  return (
    <>
      <DashboardNavbar /> {/* This is a Client Component */}
      {/* ...rest of server-rendered page... */}
    </>
  );
}
```

**Why:**

- Server Components cannot use client-only features or dynamic imports with SSR disabled.
- Client Components can be rendered inside Server Components, but not the other way around.

**Summary:**
Always move client-only UI into a Client Component and import it directly in your Server Component. Never use `next/dynamic` with `{ ssr: false }` in a Server Component.

### 2.2. Next.js 16+ async request APIs (App Router)

- **Assume request-bound data is async in Server Components and Route Handlers.** In Next.js 16, APIs like `cookies()`, `headers()`, and `draftMode()` are async in the App Router.
- **Be careful with route props:** `params` / `searchParams` may be Promises in Server Components. Prefer `await`ing them instead of treating them as plain objects.
- **Avoid dynamic rendering by accident:** Accessing request data (cookies/headers/searchParams) opts the route into dynamic behavior. Read them intentionally and isolate dynamic parts behind `Suspense` boundaries when appropriate.

---

## 3. Component Best Practices

- **Component Types:**
  - **Server Components** (default): For data fetching, heavy logic, and non-interactive UI.
  - **Client Components:** Add `'use client'` at the top. Use for interactivity, state, or browser APIs.
- **When to Create a Component:**
  - If a UI pattern is reused more than once.
  - If a section of a page is complex or self-contained.
  - If it improves readability or testability.
- **Naming Conventions:**
  - Use **`kebab-case` for all file names** (e.g., `user-card.tsx`, `use-auth.ts`) — this is the project-wide convention.
  - Use `PascalCase` for component **function/class name** exports (e.g., `export function UserCard`).
  - Use `camelCase` for the hook **function name** and `kebab-case` for the **file name** (e.g., file: `use-user.ts`, function: `export function useUser`).
  - Use `snake_case` or `kebab-case` for static assets (e.g., `logo-dark.svg`).
  - Name context providers as `XyzProvider` (e.g., `ThemeProvider`).
- **File Naming:**
  - Match the component name to the file name.
  - Always use **named exports** — even for single-export files. (The only exceptions are Next.js file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and similar route files that Next.js requires as default exports.)
  - Never use `index.ts` barrel files for re-exporting — import directly from the source file (see `copilot-instructions.md` Common Pitfall #2).
- **Component Location:**
  - Place shared components in `components/`.
  - Place route-specific components inside the relevant route folder.
- **Props:**
  - Use TypeScript `type` for props — **never `interface`**. Use intersections to extend library types: `type CardProps = HTMLAttributes<HTMLDivElement> & { variant?: string }`. (ESLint enforced — see `copilot-instructions.md`).
  - Prefer explicit prop types and default values.
- **Testing:**
  - Co-locate tests with components (e.g., `UserCard.test.tsx`).

## 4. Naming Conventions (General)

- **Folders:** `kebab-case` (e.g., `user-profile/`)
- **Files:** `kebab-case` for **all files** (e.g., `user-card.tsx`, `use-auth.ts`, `format-date.ts`) — project-wide rule
- **Component exports:** `PascalCase` function/class names (e.g., `export function UserCard`)
- **Variables/Functions:** `camelCase`
- **Types:** `PascalCase` (never use `interface` — always `type`; never use `enum` — always string union types)
- **Constants:** `UPPER_SNAKE_CASE`

## 5. API Routes (Route Handlers)

- **Prefer API Routes over Edge Functions** unless you need ultra-low latency or geographic distribution.
- **Location:** Place API routes in `app/api/` (e.g., `app/api/users/route.ts`).
- **HTTP Methods:** Export async functions named after HTTP verbs (`GET`, `POST`, etc.).
- **Request/Response:** Use the Web `Request` and `Response` APIs. Use `NextRequest`/`NextResponse` for advanced features.
- **Dynamic Segments:** Use `[param]` for dynamic API routes (e.g., `app/api/users/[id]/route.ts`).
- **Validation:** Always validate and sanitize input. Use libraries like `zod` or `yup`.
- **Error Handling:** Return appropriate HTTP status codes and error messages.
- **Authentication:** Protect sensitive routes using `proxy.ts` (Next.js 16) or server-side session checks in `page.tsx`.

### Route Handler usage note (performance)

- **Do not call your own Route Handlers from Server Components** (e.g., `fetch('/api/...')`) just to reuse logic. Prefer extracting shared logic into modules (e.g., `lib/`) and calling it directly to avoid extra server hops.

## 6. General Best Practices

- **TypeScript:** Use TypeScript for all code. Enable `strict` mode in `tsconfig.json`.
- **ESLint & Prettier:** Enforce code style and linting. Use the official Next.js ESLint config. In Next.js 16, prefer running ESLint via the ESLint CLI (not `next lint`).
- **Environment Variables:** Store secrets in `.env.local`. Never commit secrets to version control.
  - In Next.js 16, `serverRuntimeConfig` / `publicRuntimeConfig` are removed. Use environment variables instead.
  - `NEXT_PUBLIC_` variables are **inlined at build time** (changing them after build won’t affect a deployed build).
  - If you truly need runtime evaluation of env in a dynamic context, follow Next.js guidance (e.g., call `connection()` before reading `process.env`).
- **Testing:** Use **Vitest** + React Testing Library for unit/component tests. Use **Playwright** for E2E tests. Write tests for all critical logic and components.
- **Accessibility:** Use semantic HTML and ARIA attributes. Test with screen readers.
- **Performance:**
  - Use built-in Image and Font optimization.
  - Prefer **Cache Components** (`cacheComponents` + `use cache`) over legacy caching patterns.
  - Use Suspense and loading states for async data.
  - Avoid large client bundles; keep most logic in Server Components.
- **Security:**
  - Sanitize all user input.
  - Use HTTPS in production.
  - Set secure HTTP headers.
  - Prefer server-side authorization for Server Actions and Route Handlers; never trust client input.
  - Place authorization checks in `page.tsx` or `proxy.ts` — **never in `layout.tsx`** (layouts can be bypassed). See the Authorization Placement Matrix in `.github/copilot-instructions.md`.
- **Documentation:**
  - Write clear README and code comments.
  - Document public APIs and components.

## 7. Caching & Revalidation (Next.js 16 Cache Components)

- **Prefer Cache Components for memoization/caching** in the App Router.
  - Enable in `next.config.*` via `cacheComponents: true`.
  - Use the **`use cache` directive** to opt a component/function into caching.
- **Use cache tagging and lifetimes intentionally:**
  - Use `cacheTag(...)` to associate cached results with tags.
  - Use `cacheLife(...)` to control cache lifetime (presets or configured profiles).
- **Revalidation guidance:**
  - Prefer `revalidateTag(tag, 'max')` (stale-while-revalidate) for most cases.
  - The single-argument form `revalidateTag(tag)` is legacy/deprecated.
  - Use `updateTag(...)` inside **Server Actions** when you need “read-your-writes” / immediate consistency.
- **Avoid `unstable_cache`** for new code; treat it as legacy and migrate toward Cache Components.

### Deprecated caching patterns (do NOT use with `cacheComponents: true`)

| Old pattern                                        | Replacement                                     | Why deprecated                                                              |
| -------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `export const revalidate = 86400` in a page/layout | `cacheLife('days')` inside `use cache` function | Lifetime must be collocated with the data, not the route segment            |
| `export const dynamic = 'force-static'`            | `use cache` + `<Suspense>` composition          | Silently returns empty values for all request APIs — introduces subtle bugs |
| `unstable_cache(fn, ...)`                          | `use cache` directive on the function           | Cache Components is the unified, stable replacement                         |

### `cacheLife` colocation pattern

Collocate the cache lifetime _inside_ the function that fetches the data — not in the page or layout that uses it. This keeps caching visible next to the code that creates the cached content.

```ts
// lib/products.ts
import { cacheLife, cacheTag } from "next/cache";

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("hours"); // ← lifetime lives next to the data
  cacheTag(`product-${slug}`); // ← tag enables targeted revalidation
  return db.product.findUnique({ where: { slug } });
}
```

### Partial Pre-Rendering is automatic with `cacheComponents: true`

With Cache Components enabled, pages are **no longer simply static or dynamic — they are both**. Next.js produces a static shell that is served instantly from the edge, then streams `<Suspense>`-bounded dynamic sections in afterwards.

- Compose rendering behavior with **code** (`use cache` + `<Suspense>`) — not segment config options.
- The static shell is derived from all content _outside_ `<Suspense>` boundaries that is either cached or has no dynamic API access.
- Accessing `cookies()`, `headers()`, `params`, or `searchParams` outside a `<Suspense>` boundary is a **build error** — wrap dynamic components in `<Suspense>` to produce a fallback for the static shell.

## 8. Tooling updates (Next.js 16)

- **Turbopack is the default bundler for both `next dev` and `next build`.** Configure via the top-level `turbopack` field in `next.config.*` (do not use the removed `experimental.turbo`). The `--turbopack` flag is no longer needed.
- **Typed routes are stable** via `typedRoutes` (TypeScript required).

## 9. Server-Only Modules

Modules that must never run in the browser must include `import 'server-only'` at the top. This causes a build-time error if accidentally imported from a Client Component.

**Apply to:**

- `lib/auth.ts` — session and auth helpers
- Any `lib/` module that calls a database, reads secrets, or contains sensitive logic that must never reach the browser

**Do NOT apply to:**

- `lib/schemas/*.schema.ts` — Zod schemas are used by react-hook-form on the client for validation; they run in both environments by design

```ts
import "server-only"; // <- first line

import { z } from "zod";
// ...
```

## 10. URL State with nuqs

Use `nuqs` for any state that should be reflected in the URL (search, filters, pagination, tabs).

**Rule:** Never use `useState` for URL-synced state.

```tsx
// ✅ Good — state in URL, shareable and SSR-compatible
import { parseAsString, parseAsInteger, useQueryStates } from "nuqs";

const [{ q, page }, setSearch] = useQueryStates(
  {
    q: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
  },
  { shallow: false },
); // shallow: false triggers Server Component re-render
```

- `<NuqsAdapter>` is already in `app/layout.tsx` — no additional setup
- Use `shallow: false` when URL changes should trigger a Server Component re-render
- Reset `page` to 1 when search/filter criteria change
- Use `createSearchParamsCache` from `nuqs/server` to read params in Server Components
- See `.agents/skills/nuqs/SKILL.md` for full patterns

Do not create example/demo files (like ModalExample.tsx) in the main codebase unless the user specifically requests a live example, Storybook story, or explicit documentation component. Keep the repository clean and production-focused by default.

## 11. Always Use the Latest Documentation and Guides

- For every Next.js related request, begin by searching for the most up-to-date Next.js documentation, guides, and examples.
- Use the following tools to fetch and search documentation if they are available:
  - `resolve_library_id` to resolve the package/library name in the docs.
  - `get_library_docs` for up-to-date documentation.

## 12. Parallel Routes & Intercepting Routes

### 12.1 Decision Matrix — When to use each pattern

**Use Parallel Routes when:**

- A dashboard needs multiple independent sections that fetch data at different speeds — each slot gets its own `loading.tsx` and streams independently
- Different sections of the same URL must independently handle errors (`error.tsx` per slot)
- You need to conditionally render entirely different UI trees based on user role (admin vs user layout) at the same URL
- You need tab groups where independent sub-navigation lives inside a slot

**Use Intercepting Routes (combined with Parallel Routes) when:**

- Clicking an item in a list/gallery should open a modal that has its own deep-linkable URL
- Refreshing that URL should show a standalone full page — not the modal overlay
- A login/auth flow should optionally appear as a modal overlay on the current page but also work as a standalone page at `/login`

**Do NOT use Parallel/Intercepting Routes when:**

- You need a simple toggle-open dialog — use Radix UI `<Dialog>` or shadcn/ui `<Dialog>` with `useState` instead
- Navigation state doesn't need to be in the URL (e.g., a settings panel opened by a button)
- The modal content has no shareable URL requirement
- The team is unfamiliar with the pattern — incorrect `default.tsx` placement causes build failures that are hard to diagnose

### 12.2 Parallel Routes — `@slot` convention

Parallel routes use the `@folder` convention. Slots are passed as props to the parent layout and do **not** affect the URL structure.

```
app/
  @analytics/
    page.tsx           ← rendered as `analytics` prop in layout
    loading.tsx        ← independent loading state for this slot
    error.tsx          ← independent error boundary for this slot
    default.tsx        ← REQUIRED: fallback on hard navigation (see §12.3)
  @team/
    page.tsx
    default.tsx        ← REQUIRED
  layout.tsx           ← receives { children, analytics, team } as props
  page.tsx
```

The layout receives slots as props:

```tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      {children}
      {analytics}
      {team}
    </div>
  );
}
```

`children` is an implicit slot — `app/page.tsx` is equivalent to `app/@children/page.tsx`. If sub-routes exist that don't have a matching `page.tsx` for a given URL, you may also need `default.tsx` for the implicit `children` slot.

**Conditional routes (role-based layout):** Parallel routes can render different UI trees based on user role at the same URL — render `admin` or `user` slot based on `checkUserRole()` inside the layout. See Pattern 4 in `.agents/skills/nextjs-app-router-patterns/SKILL.md` for the full code.

### 12.3 `default.tsx` is required — build error without it

In Next.js 16, every `@slot` directory must have a `default.tsx` for URLs that don't match a page in that slot. Without it, hard navigation (browser refresh or direct URL) causes a **404 build failure** — not a silent empty render.

```tsx
// app/@modal/default.tsx — renders nothing when no modal is active
export default function Default() {
  return null;
}
```

**Soft vs hard navigation behavior:**

| Navigation type             | Slot behavior                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Soft (`<Link>` client-side) | Next.js remembers the last active subpage — unmatched slots keep their previous state |
| Hard (refresh / direct URL) | Falls back to `default.tsx` — 404 if absent                                           |

**Rule:** When creating any `@slot` directory, add `default.tsx` returning `null` before adding `page.tsx`.

### 12.4 All slots at the same level must share the same render mode

With `cacheComponents: true`, if one `@slot` page uses `cookies()`, `headers()`, or other dynamic APIs, **all other slots at the same URL segment level must also be dynamic**. Mixing static and dynamic slots at the same segment level is a build error.

- Put data-fetching and caching logic inside each slot's own `page.tsx` or data functions — not in the shared parent layout
- Use `cacheLife()` + `cacheTag()` inside each slot's data functions to control caching per-slot independently where possible
- If one slot must be dynamic, wrap it in `<Suspense>` with a skeleton fallback so the static shell still renders quickly

**`useSelectedLayoutSegment` for tab groups** — reads the active route segment inside a named slot. The parent layout must be a Client Component to call this hook:

```tsx
"use client";
import { useSelectedLayoutSegment } from "next/navigation";

export default function DashboardLayout({
  children,
  analytics,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
}) {
  // Pass the slot name (without @) as the parallelRoutesKey
  const activeTab = useSelectedLayoutSegment("analytics"); // e.g. 'page-views' | 'visitors' | null
  return (
    <div>
      <main>{children}</main>
      <aside>{analytics}</aside>
    </div>
  );
}
```

> Note: using `useSelectedLayoutSegment` forces the layout to be a Client Component. If the layout also does data fetching, extract that logic into a separate async Server Component child.

### 12.5 Intercepting Routes — conventions and modal pattern

Intercepting routes allow you to display a route's content inside the current layout as an overlay, while the URL updates to the target route. On hard navigation (refresh/direct URL), the full standalone page renders instead — no overlay.

**The four conventions (based on URL segments, not filesystem depth):**

| Convention       | Matches                | Example                                                                  |
| ---------------- | ---------------------- | ------------------------------------------------------------------------ |
| `(.)folder`      | Same URL segment level | `app/@modal/(.)photos/[id]` intercepts `app/photos/[id]`                 |
| `(..)folder`     | One URL level up       | `app/feed/@modal/(..)photo/[id]` intercepts `app/photo/[id]`             |
| `(..)(..)folder` | Two URL levels up      | Rarely needed                                                            |
| `(...)folder`    | Root `app` directory   | `app/feed/@modal/(...)photo/[id]` intercepts `/photo/[id]` from anywhere |

> **Critical:** `(..)` counts **URL segments**, not filesystem folders. `@slot` directories are invisible to `(..)`. Route groups `(auth)` are also invisible. Count only real URL-visible segments. Using `(..)` at the root `app` level is a build error — use `(.)` instead.

**File structure for the photo-modal pattern:**

```
app/
  @modal/
    (.)photos/[id]/
      page.tsx       ← shown as modal on soft navigation (client-side <Link>)
    default.tsx      ← REQUIRED: returns null when no modal is active
  photos/
    [id]/
      page.tsx       ← shown as full standalone page on hard navigation
  layout.tsx         ← exposes the @modal slot alongside children
```

**Closing the modal:**

```tsx
// Option A — router.back(): uses browser history
// ✅ Correct when the user navigated to the modal from the gallery
"use client";
import { useRouter } from "next/navigation";
export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <>
      <button onClick={() => router.back()}>Close</button>
      {children}
    </>
  );
}

// Option B — catch-all null route: required when using <Link> to navigate away
// Client-side navigations don't auto-reset unmatched slots — the modal stays visible
// unless the slot has a matching route that returns null
// app/@modal/[...catchAll]/page.tsx
export default function CatchAll() {
  return null;
}
```

> `router.back()` without prior history (user opened modal URL directly) navigates to `browser:blank`. Guard against this with `window.history.length > 1` if needed. See Pattern 5 in `.agents/skills/nextjs-app-router-patterns/SKILL.md` for the full implementation.

See `.agents/skills/nextjs-app-router-patterns/SKILL.md` (Pattern 4 and Pattern 5) for complete, copy-paste-ready code examples.

## Learnings
