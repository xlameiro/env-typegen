---
name: nextjs-directives
description: >
  Next.js 16 App Router directives reference. Use this skill when working with
  'use cache', 'use cache: remote', 'use cache: private', 'use client', or
  'use server'. Covers all caching levels (file/component/function), cacheLife
  profiles, cache keys, dynamic content inside cache, Server Actions, and
  client-boundary rules. Trigger on any question about caching directives,
  server/client boundaries, or when implementing Server Actions in Next.js 16.
---

# Next.js 16 — Directives

> **Scope**: App Router only. All directives below are for Next.js 16+.

---

## Overview

| Directive              | Purpose                                                        | Context                               |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `'use cache'`          | Cache return value of a function/component                     | Server (async functions & components) |
| `'use cache: remote'`  | Like `'use cache'` but delegated to a platform cache handler   | Server                                |
| `'use cache: private'` | Caches sensitive/personalized data; not stored in shared cache | Server                                |
| `'use client'`         | Marks a Client Component boundary                              | Client                                |
| `'use server'`         | Marks a Server Action (callable from client)                   | Server                                |

---

## `'use cache'`

The `'use cache'` directive marks an async function or Server Component as cacheable. Requires `cacheComponents: true` (top-level, **not** under `experimental`) in `next.config.ts`.

### Activation

```ts
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  cacheComponents: true, // top-level — NOT under experimental
};
export default nextConfig;
```

### Scope Levels

```ts
// 1. File level — every async export in the file is cached
'use cache'

export default async function Page() { /* ... */ }
export async function getStats() { /* ... */ }

// 2. Component level — only this component is cached
export async function MyWidget() {
  'use cache'
  return <div>{await fetchData()}</div>
}

// 3. Function level — only this function's return value is cached
export async function getUser(id: string) {
  'use cache'
  return db.user.findUnique({ where: { id } })
}
```

### Cache Keys

Arguments and closed-over values automatically form the cache key. Different inputs → separate cache entries.

```ts
// These two calls produce independent cache entries
await getUser("user-1");
await getUser("user-2");
```

### `cacheLife` — Cache Lifetime Profiles

```ts
import { cacheLife } from "next/cache";

export async function getData() {
  "use cache";
  cacheLife("seconds"); // stale: 30s, revalidate: 1s, expire: 1min
  cacheLife("minutes"); // stale: 5min, revalidate: 1min, expire: 1h
  cacheLife("hours"); // stale: 5min, revalidate: 1h, expire: 1d
  cacheLife("days"); // stale: 5min, revalidate: 1d, expire: 1w
  cacheLife("weeks"); // stale: 5min, revalidate: 7d, expire: 30d
  cacheLife("max"); // stale: 5min, revalidate: 30d, expire: 1y
  // Custom profile
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
}
```

| Profile     | `stale` (client) | `revalidate` (server) | `expire` |
| ----------- | ---------------- | --------------------- | -------- |
| `'default'` | 5min             | 15min                 | never    |
| `'seconds'` | 30s              | 1s                    | 1min     |
| `'minutes'` | 5min             | 1min                  | 1h       |
| `'hours'`   | 5min             | 1h                    | 1d       |
| `'days'`    | 5min             | 1d                    | 1w       |
| `'weeks'`   | 5min             | 7d                    | 30d      |
| `'max'`     | 5min             | 30d                   | 1y       |

> The `'default'` profile is used implicitly when no `cacheLife()` call is made inside a `'use cache'` function. Its `expire` is effectively **never** — the cache entry does not expire by time unless a `revalidateTag` / `updateTag` invalidation fires.

> Minimum stale time of **30 seconds** is enforced for client-side prefetching — values below 30s are rounded up.

Custom profiles can be defined in `next.config.ts`:

```ts
// next.config.ts — cacheLife is a top-level key alongside cacheComponents
const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    editorial: { stale: 600, revalidate: 3600, expire: 86400 },
  },
};
```

### `cacheTag` — Cache Invalidation Tags

```ts
import { cacheTag } from "next/cache";

export async function getProduct(id: string) {
  "use cache";
  cacheTag(`product-${id}`, "products");
  return db.product.findUnique({ where: { id } });
}
```

Invalidate with `revalidateTag('products', 'max')` from Server Actions or Route Handlers. Use `updateTag('products')` inside Server Actions for **immediate** expiry (read-your-own-writes).

> **Limits**: max tag string length is **256 characters**, max tags per cached entry is **128**.

### Dynamic Content Inside Cached Scopes

Cookies, headers, and `searchParams` must be read **outside** the cached scope and passed as arguments:

```ts
// ✅ Correct
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value
  return <ThemedWidget theme={theme} />
}

async function ThemedWidget({ theme }: { theme?: string }) {
  'use cache'
  cacheTag(`theme-${theme}`)
  return <div data-theme={theme}>{await fetchThemeData(theme)}</div>
}
```

---

## `'use cache: remote'`

Like `'use cache'` but stores cached values in an external/remote cache handler instead of in-memory. Use when distributed caching is needed across multiple server instances.

```ts
export async function getGlobalConfig() {
  "use cache: remote";
  cacheLife("days");
  return fetch("/api/config").then((r) => r.json());
}
```

**Trade-offs:**

- Survives server restarts and scales across instances
- Incurs network round-trip on cache check
- Typically incurs platform fees

**Nesting rules:**
| Combination | Allowed? |
|-------------|----------|
| `remote` inside `remote` | ✅ |
| `remote` inside `'use cache'` | ✅ |
| `remote` inside `'use cache: private'` | ❌ Error |
| `'use cache: private'` inside `remote` | ❌ Error |

---

## `'use cache: private'`

> ⚠️ **Experimental** — for compliance or personalized data requirements.

Caches data for the **browser** only — results are **never stored on the server**. Cached values live only in the browser's memory and do not persist across page reloads. Unlike `'use cache'`, this directive **allows** reading `cookies()`, `headers()`, and `searchParams` directly inside the cached scope.

```ts
export async function getUserProfile() {
  "use cache: private";
  cacheLife("minutes"); // stale must be ≥ 30 seconds
  const cookieStore = await cookies(); // ✅ allowed inside 'use cache: private'
  const userId = cookieStore.get("user-id")?.value;
  return db.userProfile.findUnique({ where: { id: userId } });
}
```

**APIs allowed inside `'use cache: private'` (unlike regular `'use cache'`):**

| API            | `'use cache'` | `'use cache: private'` |
| -------------- | :-----------: | :--------------------: |
| `cookies()`    |      ❌       |           ✅           |
| `headers()`    |      ❌       |           ✅           |
| `searchParams` |      ❌       |           ✅           |
| `connection()` |      ❌       |           ❌           |

> **Not available in Route Handlers.** Only works in Server Components.

Use when:

- Data contains PII and must not leave the browser
- You need to read `cookies()` or `headers()` inside a cached scope
- Compliance rules (GDPR, HIPAA) forbid server-side caching of personal data

---

## `'use client'`

Marks a **Client Component** boundary. Everything in the file (and its imports) is included in the client bundle.

### Rules

```ts
'use client'

import { useState } from 'react'

// ✅ Props must be serializable (no functions from Server -> Client)
export function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

| Rule                              | Detail                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Only add where strictly necessary | Entire subtree becomes client bundle                                            |
| Cannot import Server Components   | Can accept them as `children` prop                                              |
| Props must be serializable        | No plain JS functions, class instances; **Server Actions are allowed** as props |
| Hooks & browser APIs work here    | `useState`, `useEffect`, `window`, `document`                                   |

### When to Use `'use client'`

- Event handlers (`onClick`, `onChange`, `onSubmit`)
- React hooks (`useState`, `useEffect`, `useContext`, `useRef`)
- Browser-only APIs (`localStorage`, `window`, `document`)
- Third-party libraries that rely on client state

---

## `'use server'`

Marks a **Server Action** — an async function that executes on the server and can be called from Client Components or HTML forms.

### Placement

```ts
// Option 1: In a dedicated actions file (preferred)
// app/actions/user.ts
'use server'

export async function updateUser(formData: FormData) {
  const name = formData.get('name') as string
  // ✅ Validate at the boundary
  if (!name || name.length < 2) throw new Error('Invalid name')
  await db.user.update({ where: { id: getCurrentUserId() }, data: { name } })
  revalidatePath('/profile')
}

// Option 2: Inline in a Server Component
export default async function Page() {
  async function handleSubmit(formData: FormData) {
    'use server'
    await updateUser(formData)
  }
  return <form action={handleSubmit}>...</form>
}
```

### Security Rules

| Rule                                                   | Why                                      |
| ------------------------------------------------------ | ---------------------------------------- |
| Always validate inputs with Zod                        | Arguments come from untrusted clients    |
| Check authentication & authorization                   | Server Actions are public HTTP endpoints |
| Never return sensitive data to client                  | Return only what the UI needs            |
| Use `revalidatePath` / `revalidateTag` after mutations | Keeps UI in sync                         |

```ts
"use server";

import { z } from "zod";
import { auth } from "@/auth";

const UpdateSchema = z.object({ name: z.string().min(2).max(100) });

export async function updateUser(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const data = UpdateSchema.parse({ name: formData.get("name") });
  await db.user.update({ where: { id: session.user.id }, data });
  revalidatePath("/profile");
}
```

### `bind()` — Pre-filling Arguments

Use `Function.prototype.bind` to pass additional arguments alongside form data:

```tsx
"use client";
import { updateUser } from "./actions";

export function UserProfile({ userId }: { userId: string }) {
  const updateUserWithId = updateUser.bind(null, userId);
  return (
    <form action={updateUserWithId}>
      <input type="text" name="name" />
      <button type="submit">Update</button>
    </form>
  );
}
```

### `useActionState` — Managing Action State

```tsx
"use client";
import { useActionState } from "react";
import { createPost } from "./actions";

export function CreatePostForm() {
  const [state, formAction, pending] = useActionState(createPost, {
    errors: {},
  });
  return (
    <form action={formAction}>
      <input name="title" aria-invalid={!!state.errors.title} />
      {state.errors.title && <span>{state.errors.title}</span>}
      <button type="submit" disabled={pending}>
        Create
      </button>
    </form>
  );
}
```

### Progressive Enhancement

Server Actions work with HTML forms without JavaScript:

```tsx
<form action={updateUser}>
  <input name="name" type="text" required />
  <button type="submit">Save</button>
</form>
```

### `useFormStatus` — Pending State of Parent Form

Tracks the pending state of the nearest parent `<form>`. Must be called in a **child** component of `<form>` — not in the same component.

```tsx
"use client";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const status = useFormStatus();
  // status.pending: boolean
  // status.data: FormData | null      — form data being submitted
  // status.method: string | null      — 'get' | 'post'
  // status.action: string | function | null — the action URL or function
  return (
    <button type="submit" disabled={status.pending}>
      {status.pending ? "Saving…" : "Save"}
    </button>
  );
}

export function ProfileForm() {
  return (
    <form action={updateProfile}>
      <input name="name" />
      <SubmitButton /> {/* useFormStatus reads this form's state */}
    </form>
  );
}
```

> Import from `react-dom`, not `react`. Only reads state of forms with a Server Action as `action` or inside a `startTransition`.

### `useOptimistic` — Optimistic UI Updates

Shows an optimistic (expected) value immediately while a Server Action is pending, then snaps to the real value when the action completes.

```tsx
"use client";
import { useOptimistic } from "react";
import { toggleLike } from "./actions";

export function LikeButton({ post }: { post: Post }) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(post.isLiked);

  async function handleClick() {
    setOptimisticLiked(!post.isLiked); // show new state instantly
    await toggleLike(post.id); // actual mutation; real state snaps in on completion
  }

  return <button onClick={handleClick}>{optimisticLiked ? "♥" : "♡"}</button>;
}
```

With a reducer for list mutations:

```tsx
const [optimisticItems, addOptimisticItem] = useOptimistic(
  items,
  (state, newItem: Item) => [...state, newItem],
);
```

> `useOptimistic` is the App Router answer to React Query's `onMutate`. Use it for inline mutations — likes, archive, delete — where the round-trip latency would feel sluggish.

### `use()` — Unwrap Promises and Context

Reads the value of a Promise or Context inside a component. Unlike hooks, `use()` **can be called conditionally**.

```tsx
"use client";
import { use } from "react";

// Unwrap a Promise passed as a prop from a Server Component
export function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends until resolved
  return <div>{user.name}</div>;
}

// Read Context (equivalent to useContext, but callable conditionally)
const theme = use(ThemeContext);
```

```tsx
// Signature
function use<T>(usable: Promise<T> | Context<T>): T;
```

> In Server Components, `await` the promise directly. `use()` is for Client Components that receive a Promise as a prop — it integrates with Suspense automatically.

---

## React DOM Resource Hint APIs

These functions from `react-dom` let React and Next.js schedule browser resource loading as early as possible — before the browser parses the full HTML. Call them from Server Components, Client Components, or Server Actions. Next.js deduplicates duplicate hints automatically.

```ts
import {
  prefetchDNS,
  preconnect,
  preload,
  preloadModule,
  preinit,
  preinitModule,
} from "react-dom";
```

### `prefetchDNS(href)`

Resolved DNS for a host so TCP connections start sooner. No credentials or crossOrigin needed.

```ts
function prefetchDNS(href: string): void;

// Usage — in a Server Component or layout
prefetchDNS("https://fonts.googleapis.com");
```

### `preconnect(href, options?)`

Opens a connection to a host (DNS + TCP + TLS) without fetching a resource.

```ts
interface PreconnectOptions {
  crossOrigin?: "anonymous" | "use-credentials" | "" | undefined;
}
function preconnect(href: string, options?: PreconnectOptions): void;

preconnect("https://cdn.example.com", { crossOrigin: "anonymous" });
```

### `preload(href, options)`

Tells the browser to fetch a resource at high priority without evaluating it. `as` is required.

```ts
type PreloadAs =
  | "audio"
  | "document"
  | "embed"
  | "fetch"
  | "font"
  | "image"
  | "object"
  | "track"
  | "script"
  | "style"
  | "video"
  | "worker";

interface PreloadOptions {
  as: PreloadAs; // required
  crossOrigin?: "anonymous" | "use-credentials" | "";
  fetchPriority?: "high" | "low" | "auto";
  imageSizes?: string; // only with as: 'image'
  imageSrcSet?: string; // only with as: 'image'
  integrity?: string;
  type?: string;
  nonce?: string;
  referrerPolicy?: ReferrerPolicy;
  media?: string;
}
function preload(href: string, options: PreloadOptions): void;

preload("/fonts/inter.woff2", { as: "font", crossOrigin: "anonymous" });
preload("/hero.jpg", { as: "image", fetchPriority: "high" });
```

### `preloadModule(href, options)`

Preloads an ES module without executing it. `as` defaults to `"script"`.

```ts
interface PreloadModuleOptions {
  as: RequestDestination; // defaults to "script"
  crossOrigin?: "anonymous" | "use-credentials" | "";
  integrity?: string;
  nonce?: string;
}
function preloadModule(href: string, options: PreloadModuleOptions): void;
```

### `preinit(href, options)`

Fetches **and evaluates** a script or stylesheet eagerly. Different from `preload` — the resource is actually executed, not just downloaded.

```ts
type PreinitAs = "script" | "style";

interface PreinitOptions {
  as: PreinitAs; // required
  crossOrigin?: "anonymous" | "use-credentials" | "";
  fetchPriority?: "high" | "low" | "auto";
  precedence?: string; // for stylesheets: insertion order
  integrity?: string;
  nonce?: string;
}
function preinit(href: string, options: PreinitOptions): void;

preinit("/analytics.js", { as: "script" });
preinit("/critical.css", { as: "style", precedence: "high" });
```

### `preinitModule(href, options?)`

Fetches **and evaluates** an ES module eagerly. `as` defaults to `"script"`.

```ts
interface PreinitModuleOptions {
  as?: "script"; // default "script"
  crossOrigin?: "anonymous" | "use-credentials" | "";
  integrity?: string;
  nonce?: string;
}
function preinitModule(href: string, options?: PreinitModuleOptions): void;
```

### `requestFormReset(form)`

Programmatically resets a form element — useful after a Server Action completes to clear input fields.

```ts
function requestFormReset(form: HTMLFormElement): void;

// Usage with useRef in a Client Component
const formRef = useRef<HTMLFormElement>(null);
// after Server Action resolves:
if (formRef.current) requestFormReset(formRef.current);
```

> **Hint hierarchy**: `prefetchDNS` → `preconnect` → `preload` → `preinit` (increasing eagerness). Use the least eager hint that satisfies the performance goal.

---

## Common Pitfalls

| Issue                                                          | Fix                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Reading `cookies()` / `headers()` inside `'use cache'`         | Read outside the cached scope; pass as argument             |
| Using `'use cache'` without enabling `cacheComponents`         | Add `cacheComponents: true` (top-level) to `next.config.ts` |
| Returning non-serializable values from cached functions        | Only return JSON-serializable values                        |
| Missing auth check in `'use server'` action                    | Always check session before mutation                        |
| Placing `'use client'` on a file that imports server-only code | Separate concerns; keep server imports in server files      |
