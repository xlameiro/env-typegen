---
name: nextjs-navigation-functions
description: >
  Next.js 16 App Router navigation functions reference. Use this skill when
  working with redirect, permanentRedirect, notFound, forbidden, unauthorized,
  useRouter, usePathname, useSearchParams, useParams, useSelectedLayoutSegment, or useSelectedLayoutSegments. Covers server-side
  and client-side navigation APIs, HTTP status codes, history management, and
  Suspense requirements. Trigger for any Next.js routing, navigation, redirect,
  or programmatic URL change question.
---

# Next.js 16 — Navigation Functions

> **Scope**: App Router only. Server functions are not available in Pages Router.

---

## Server-Side Navigation

### `redirect(url, type?)`

Redirects to another URL. Throws `NEXT_REDIRECT` error internally — **do not call inside `try/catch`**.

```ts
import { redirect } from "next/navigation";
```

#### Signature

```ts
function redirect(url: string, type?: RedirectType): never;
```

#### Parameters

| Param  | Type           | Default           | Description                                       |
| ------ | -------------- | ----------------- | ------------------------------------------------- |
| `url`  | `string`       | —                 | ✅ Absolute URL or relative path                  |
| `type` | `RedirectType` | Context-dependent | `'push'` in Server Actions, `'replace'` elsewhere |

#### `RedirectType` enum

```ts
import { redirect, RedirectType } from "next/navigation";

redirect("/login", RedirectType.replace); // replace history entry
redirect("/dashboard", RedirectType.push); // push new history entry
```

#### HTTP Status Codes

| Context                | Status Code            |
| ---------------------- | ---------------------- |
| Server Component (GET) | 307 Temporary Redirect |
| Server Action (POST)   | 303 See Other          |

#### Usage

```ts
// Server Component
export default async function Page() {
  const session = await auth()
  if (!session) redirect('/login')
  return <Dashboard />
}

// Server Action
'use server'
export async function createPost(formData: FormData) {
  const id = await db.post.create({ data: parseForm(formData) })
  redirect(`/posts/${id}`) // automatically 303 in actions
}
```

> ⚠️ Calling `redirect()` inside `try/catch` will be caught as an error. Always call it after the try block.

---

### `permanentRedirect(url, type?)`

Like `redirect()` but issues a **permanent** redirect.

```ts
import { permanentRedirect } from "next/navigation";
```

#### Signature

```ts
function permanentRedirect(url: string, type?: RedirectType): never;
```

| Context                | Status Code            |
| ---------------------- | ---------------------- |
| Server Component (GET) | 308 Permanent Redirect |
| Server Action (POST)   | 303 See Other          |

```ts
// Use for URL migrations (old path → new canonical path)
export default async function OldPage({ params }: { params: { id: string } }) {
  permanentRedirect(`/new-path/${(await params).id}`);
}
```

---

### `notFound()`

Renders the closest `not-found.tsx` boundary and injects `<meta name="robots" content="noindex">`.

```ts
import { notFound } from "next/navigation";
```

#### Signature

```ts
function notFound(): never;
```

```ts
export default async function Page({ params }: { params: { slug: string } }) {
  const post = await getPost((await params).slug)
  if (!post) notFound()          // ← renders not-found.tsx
  return <Article post={post} />
}
```

> HTTP status: **404** for non-streamed responses, **200** for streamed responses.

---

### `forbidden()` ⚠️ Experimental

Renders the closest `forbidden.tsx` boundary with a 403 response. Requires `experimental.authInterrupts: true`.

```ts
import { forbidden } from "next/navigation";
```

#### Activation

```ts
// next.config.ts
experimental: {
  authInterrupts: true;
}
```

```ts
// app/forbidden.tsx — required boundary file
export default function Forbidden() {
  return <div>403 — Access Denied</div>
}

// Usage
export default async function AdminPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') forbidden()
  return <AdminDashboard />
}
```

---

### `unauthorized()` ⚠️ Experimental

Renders the closest `unauthorized.tsx` boundary with a 401 response. Requires `experimental.authInterrupts: true`.

```ts
import { unauthorized } from "next/navigation";
```

```ts
// app/unauthorized.tsx
export default function Unauthorized() {
  return <div>401 — Please log in</div>
}

// Usage
export default async function ProfilePage() {
  const session = await auth()
  if (!session) unauthorized()
  return <Profile user={session.user} />
}
```

---

## Client-Side Navigation Hooks

All hooks below are **Client Component only** (`'use client'`).

---

### `useRouter()`

Programmatic navigation in Client Components.

```ts
import { useRouter } from "next/navigation";
```

#### Signature

```ts
function useRouter(): AppRouterInstance;
```

#### `AppRouterInstance` Methods

| Method     | Signature                                           | Description                                  |
| ---------- | --------------------------------------------------- | -------------------------------------------- |
| `push`     | `(href: string, options?: NavigateOptions) => void` | Navigate to URL (adds history entry)         |
| `replace`  | `(href: string, options?: NavigateOptions) => void` | Navigate without history entry               |
| `back`     | `() => void`                                        | Go back in browser history                   |
| `forward`  | `() => void`                                        | Go forward in browser history                |
| `refresh`  | `() => void`                                        | Re-fetch Server Components for current route |
| `prefetch` | `(href: string, options?: PrefetchOptions) => void` | Prefetch URL in background                   |

```ts
type NavigateOptions = { scroll?: boolean };
type PrefetchOptions = {
  kind: "auto" | "full"; // 'auto' = partial for dynamic, full for static; 'full' = always full
  onInvalidate?: () => void; // callback fired when the prefetched entry is invalidated
};
```

```tsx
"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return <button onClick={() => router.back()}>← Back</button>;
}

export function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login"); // no back button to logged-in page
  };
  return <button onClick={handleLogout}>Logout</button>;
}
```

---

### `usePathname()`

Reads the current URL pathname reactively.

```ts
import { usePathname } from "next/navigation";
```

#### Signature

```ts
function usePathname(): string;
```

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={isActive ? "font-bold" : ""}
    >
      {children}
    </Link>
  );
}
```

---

### `useSearchParams()`

Reads the current URL query string reactively. **Must be wrapped in `<Suspense>`** when used in a component that might be statically rendered.

```ts
import { useSearchParams } from "next/navigation";
```

#### Signature

```ts
function useSearchParams(): ReadonlyURLSearchParams;
```

#### `ReadonlyURLSearchParams` Methods (extends `URLSearchParams`)

| Method     | Signature                                  | Description                |
| ---------- | ------------------------------------------ | -------------------------- |
| `get`      | `(name: string) => string \| null`         | First value for key        |
| `getAll`   | `(name: string) => string[]`               | All values for key         |
| `has`      | `(name: string) => boolean`                | Check if key exists        |
| `entries`  | `() => IterableIterator<[string, string]>` | All key/value pairs        |
| `keys`     | `() => IterableIterator<string>`           | All keys                   |
| `values`   | `() => IterableIterator<string>`           | All values                 |
| `toString` | `() => string`                             | Query string (without `?`) |
| `size`     | `number`                                   | Number of params           |

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  return (
    <div>
      Searching: {query} — Page {page}
    </div>
  );
}

// ✅ Always wrap in Suspense
export default function Page() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <SearchResults />
    </Suspense>
  );
}
```

---

### `useParams()`

Reads dynamic route parameters in Client Components.

```ts
import { useParams } from "next/navigation";
```

#### Signature

```ts
function useParams<T extends Record<string, string | string[]> = {}>(): T;
```

```tsx
"use client";

import { useParams } from "next/navigation";

// For route: app/blog/[slug]/page.tsx
export function PostActions() {
  const { slug } = useParams<{ slug: string }>();
  return <button onClick={() => copyLink(`/blog/${slug}`)}>Copy link</button>;
}

// Catch-all route: app/docs/[...path]/page.tsx
export function Breadcrumbs() {
  const { path } = useParams<{ path: string[] }>();
  // path = ['guide', 'installation']
  return (
    <nav>
      {path.map((segment) => (
        <span key={segment}>{segment}</span>
      ))}
    </nav>
  );
}
```

---

### `useSelectedLayoutSegment()`

Client Component hook that reads the active route segment **one level below** the Layout it is called from. Returns `null` when no child segment is active.

```ts
import { useSelectedLayoutSegment } from "next/navigation";
```

#### Signature

```ts
function useSelectedLayoutSegment(parallelRouteKey?: string): string | null;
```

#### Return values

| Condition                              | Return value                              |
| -------------------------------------- | ----------------------------------------- |
| Active child segment (e.g., `blog`)    | `"blog"`                                  |
| Leaf page (no further segments)        | `"page"`                                  |
| No active segment below current layout | `null`                                    |
| Accessing a parallel route slot        | Pass `parallelRouteKey` (e.g., `"modal"`) |

```tsx
"use client";
import { useSelectedLayoutSegment } from "next/navigation";

export function TabsNav() {
  const segment = useSelectedLayoutSegment(); // e.g., "dashboard", "settings", null

  return (
    <nav>
      {["dashboard", "settings"].map((tab) => (
        <a
          key={tab}
          href={`/${tab}`}
          aria-current={segment === tab ? "page" : undefined}
        >
          {tab}
        </a>
      ))}
    </nav>
  );
}
```

---

### `useSelectedLayoutSegments()`

Client Component hook that reads **all** active route segments below the Layout it is called from (full segment array, not just one level).

```ts
import { useSelectedLayoutSegments } from "next/navigation";
```

#### Signature

```ts
function useSelectedLayoutSegments(parallelRouteKey?: string): string[];
```

#### Behaviour

- Returns an array of all active child segments in order (e.g., `["blog", "my-post"]`)
- Returns an empty array when no child segments are active
- Accepts an optional `parallelRouteKey` to read segments from a named parallel route slot

```tsx
"use client";
import { useSelectedLayoutSegments } from "next/navigation";

export function Breadcrumbs() {
  const segments = useSelectedLayoutSegments(); // e.g., ["blog", "my-post"]

  return (
    <ol>
      {segments.map((segment, index) => (
        <li key={index}>{segment}</li>
      ))}
    </ol>
  );
}
```

---

### `unstable_rethrow()`

Rethrows internal Next.js control-flow errors — redirects, not-found signals, forbidden, and unauthorized — so the framework can handle them correctly. **Must be called before any custom error handling in a `catch` block.** Without it, a `try/catch` around data-fetching code will silently swallow `redirect()` and `notFound()` calls.

```ts
import { unstable_rethrow } from "next/navigation";
```

#### Signature

```ts
function unstable_rethrow(error: unknown): void;
```

#### When to use

| Thrown by                           | Internal error type        |
| ----------------------------------- | -------------------------- |
| `redirect()`, `permanentRedirect()` | `NEXT_REDIRECT`            |
| `notFound()`                        | `NEXT_NOT_FOUND`           |
| `forbidden()`                       | `NEXT_HTTP_ERROR_FALLBACK` |
| `unauthorized()`                    | `NEXT_HTTP_ERROR_FALLBACK` |

```tsx
import { notFound, unstable_rethrow } from "next/navigation";

async function getPost(id: string) {
  try {
    const post = await db.post.findUnique({ where: { id } });
    if (!post) notFound(); // throws internally
    return post;
  } catch (err) {
    unstable_rethrow(err); // ← re-throw before your own handling
    // Only reaches here for genuine application errors
    console.error("DB error fetching post", err);
    throw err;
  }
}
```

> Also exported from `next/server` for use in Route Handlers.

---

### `unstable_isUnrecognizedActionError()`

Checks whether a Server Action call failed because the server does not recognize the action — typically because the client and server are from different deployments (e.g., rolling update with active clients from the previous version).

```ts
import { unstable_isUnrecognizedActionError } from "next/navigation";
```

#### Signature

```ts
function unstable_isUnrecognizedActionError(
  error: unknown,
): error is UnrecognizedActionError;
```

```tsx
"use client";
try {
  await myServerAction();
} catch (err) {
  if (unstable_isUnrecognizedActionError(err)) {
    // Client is from a different deployment — prompt user to refresh
    alert("Please refresh the page and try again.");
    return;
  }
  throw err; // re-throw all other errors
}
```

> Use this to give a clear user-facing message instead of a generic error when a stale client calls a Server Action that no longer exists on the current server.

---

### `useServerInsertedHTML()`

Allows style library authors (e.g., `styled-jsx`, `emotion`) to inject styles into the server-streamed HTML. Called inside a Client Component, the callback runs on the server during streaming and its output is inserted into the HTML output before the component's content.

> **Note**: This is a library-author API — you only need this if building styling primitives. Application code should use Tailwind CSS or CSS Modules instead.

```ts
import { useServerInsertedHTML } from "next/navigation";
```

#### Signature

```ts
function useServerInsertedHTML(callback: () => React.ReactNode): void;
```

```tsx
"use client";
import { useServerInsertedHTML } from "next/navigation";

// Inside a custom style provider component
useServerInsertedHTML(() => (
  <style dangerouslySetInnerHTML={{ __html: extractCriticalCss() }} />
));
```

---

## Quick Reference

| Function                                  | Where             | Returns                              | HTTP Code |
| ----------------------------------------- | ----------------- | ------------------------------------ | --------- |
| `redirect(url)`                           | Server            | `never`                              | 307 / 303 |
| `permanentRedirect(url)`                  | Server            | `never`                              | 308 / 303 |
| `notFound()`                              | Server            | `never`                              | 404       |
| `forbidden()`                             | Server            | `never`                              | 403       |
| `unauthorized()`                          | Server            | `never`                              | 401       |
| `useRouter()`                             | Client            | `AppRouterInstance`                  | —         |
| `usePathname()`                           | Client            | `string`                             | —         |
| `useSearchParams()`                       | Client + Suspense | `ReadonlyURLSearchParams`            | —         |
| `useParams()`                             | Client            | `Record<string, string \| string[]>` | —         |
| `useSelectedLayoutSegment()`              | Client            | `string \| null`                     | —         |
| `useSelectedLayoutSegments()`             | Client            | `string[]`                           | —         |
| `unstable_rethrow(err)`                   | Server            | `void`                               | —         |
| `unstable_isUnrecognizedActionError(err)` | Client            | `boolean`                            | —         |
| `useServerInsertedHTML(cb)`               | Client/Server     | `void`                               | —         |
