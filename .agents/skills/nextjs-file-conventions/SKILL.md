---
name: nextjs-file-conventions
description: >
  Next.js 16 App Router file conventions reference. Use this skill when creating
  or working with layout.tsx, page.tsx, loading.tsx, error.tsx, not-found.tsx,
  forbidden.tsx, unauthorized.tsx, route.ts, template.tsx, default.tsx,
  proxy.ts, instrumentation.ts, opengraph-image, sitemap.ts, robots.ts, or
  manifest.ts. Covers all props, exports, TypeScript signatures, and sub-segment
  behavior. Trigger on any question about special files, routing, API routes,
  proxy, auth boundaries, or metadata files.
  See references/file-conventions-api.md for exhaustive per-file API details.
---

# Next.js 16 — File Conventions

> **Scope**: App Router only. Files live inside the `app/` directory unless noted.

---

## File Conventions Overview

```
app/
├── layout.tsx              # Shared UI wrapper (persists across navigations)
├── page.tsx                # Route page UI
├── loading.tsx             # Suspense loading UI
├── error.tsx               # Error boundary UI ('use client' required)
├── not-found.tsx           # 404 UI
├── global-not-found.tsx    # Global 404 UI (requires experimental.globalNotFound: true)
├── forbidden.tsx           # 403 UI (requires experimental.authInterrupts: true)
├── unauthorized.tsx        # 401 UI (requires experimental.authInterrupts: true)
├── route.ts                # API endpoint (HTTP handlers)
├── template.tsx            # Re-mounting layout alternative
├── default.tsx             # Parallel route slot fallback
├── proxy.ts                # Node.js proxy (runs before every request) — renamed from middleware.ts in Next.js 16
├── instrumentation.ts      # Telemetry hooks (at root, not inside app/)
├── mdx-components.tsx      # MDX component overrides (at root, not inside app/)
├── opengraph-image.tsx     # OG image generation
├── twitter-image.tsx       # Twitter card image generation
├── icon.tsx                # App icon
├── sitemap.ts              # XML sitemap
├── robots.ts               # robots.txt
└── manifest.ts             # Web app manifest (PWA)
```

> For full per-file API details, see `references/file-conventions-api.md`.

---

## `layout.tsx`

Wraps a route segment and its children. **Does not re-mount on navigation**.

### Required Exports

```ts
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
```

### Root Layout Requirements

The root `app/layout.tsx` **must** include `<html>` and `<body>` tags.

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### Props

| Prop       | Type                         | Description                                       |
| ---------- | ---------------------------- | ------------------------------------------------- |
| `children` | `React.ReactNode`            | ✅ Required — nested segments                     |
| `params`   | `Promise<{ [key]: string }>` | Dynamic segment params (only if route is dynamic) |

### Optional Exports

| Export             | Type                                   | Description      |
| ------------------ | -------------------------------------- | ---------------- |
| `metadata`         | `Metadata`                             | Static metadata  |
| `generateMetadata` | `(props, parent) => Promise<Metadata>` | Dynamic metadata |
| `viewport`         | `Viewport`                             | Viewport config  |
| `generateViewport` | `(props) => Promise<Viewport>`         | Dynamic viewport |

---

## `page.tsx`

Defines the unique UI for a route. Required to make a route publicly accessible.

### Props

| Prop           | Type                                                  | Description          |
| -------------- | ----------------------------------------------------- | -------------------- |
| `params`       | `Promise<{ [key]: string \| string[] }>`              | Dynamic route params |
| `searchParams` | `Promise<{ [key]: string \| string[] \| undefined }>` | URL query params     |

```tsx
// app/blog/[slug]/page.tsx
export default async function BlogPost({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "content" } = await searchParams;
  const post = await getPost(slug);
  return <Article post={post} activeTab={tab} />;
}
```

### Optional Exports

Same as `layout.tsx`: `metadata`, `generateMetadata`, `viewport`, `generateViewport`, plus:

| Export                 | Type                                                                                                                      | Description                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `generateStaticParams` | `() => Promise<Params[]>`                                                                                                 | Static generation at build time                                                           |
| `dynamic`              | `'auto' \| 'force-dynamic' \| 'error' \| 'force-static'`                                                                  | Rendering mode override                                                                   |
| `dynamicParams`        | `boolean`                                                                                                                 | `true` (default): allow dynamic params not in `generateStaticParams`; `false`: return 404 |
| `revalidate`           | `number \| false`                                                                                                         | Revalidation interval in seconds (`false` = no ISR)                                       |
| `fetchCache`           | `'auto' \| 'default-cache' \| 'default-no-store' \| 'force-cache' \| 'force-no-store' \| 'only-cache' \| 'only-no-store'` | Override fetch caching behaviour for all fetches in this segment                          |
| `runtime`              | `'nodejs' \| 'edge'`                                                                                                      | Runtime environment                                                                       |
| `preferredRegion`      | `string \| string[]`                                                                                                      | Deployment region(s)                                                                      |
| `maxDuration`          | `number`                                                                                                                  | Max execution time in seconds                                                             |
| `unstable_prefetch`    | `Prefetch` (internal)                                                                                                     | Fine-grained prefetch config (unstable — internal use)                                    |
| `experimental_ppr`     | `true`                                                                                                                    | Opts this page into PPR when `experimental.ppr: 'incremental'` is set in `next.config.ts` |

---

## `loading.tsx`

Provides instant Suspense loading state for a segment. Automatically wraps `page.tsx` in a `<Suspense>` boundary.

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <DashboardSkeleton />;
}
```

No props. No required exports beyond the default export.

**HTTP behavior**: streaming responses return **200** status while loading.

---

## `error.tsx`

Client Component error boundary for a route segment. Catches errors thrown in Server Components, data fetches, and Client Components in the same segment.

```tsx
"use client"; // ← Required

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Props

| Prop    | Type                          | Description                                      |
| ------- | ----------------------------- | ------------------------------------------------ |
| `error` | `Error & { digest?: string }` | The thrown error; `digest` is a server-side hash |
| `reset` | `() => void`                  | Retry — re-renders the segment's children        |

> `global-error.tsx` at `app/` root catches errors in the root `layout.tsx`. It must render its own `<html>` and `<body>`.

---

## `not-found.tsx`

Rendered when `notFound()` is called or a route URL has no match.

```tsx
// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>404 — Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link href="/">Return home</Link>
    </main>
  );
}

// Optional metadata
export const metadata = { title: "Not Found" };
```

---

## `forbidden.tsx` ⚠️ Experimental

Rendered when `forbidden()` is called. Returns a **403** response. Requires `experimental.authInterrupts: true` in `next.config.ts`.

```tsx
// app/forbidden.tsx
export default function Forbidden() {
  return (
    <main>
      <h1>403 — Access Denied</h1>
      <p>You do not have permission to view this page.</p>
    </main>
  );
}

// Optional metadata
export const metadata = { title: "Forbidden" };
```

> Place at `app/forbidden.tsx` for app-wide coverage or inside a route segment folder for scoped coverage. Activated by `forbidden()` from `next/navigation`.

---

## `unauthorized.tsx` ⚠️ Experimental

Rendered when `unauthorized()` is called. Returns a **401** response. Requires `experimental.authInterrupts: true` in `next.config.ts`.

```tsx
// app/unauthorized.tsx
export default function Unauthorized() {
  return (
    <main>
      <h1>401 — Authentication Required</h1>
      <p>Please sign in to access this page.</p>
    </main>
  );
}

// Optional metadata
export const metadata = { title: "Unauthorized" };
```

> Activated by `unauthorized()` from `next/navigation`. Both `forbidden.tsx` and `unauthorized.tsx` require `experimental: { authInterrupts: true }` in `next.config.ts`.

---

## `route.ts`

API endpoint. Exports named HTTP method handlers; no default export.

```ts
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

### Supported Method Handlers

`GET` · `POST` · `PUT` · `PATCH` · `DELETE` · `HEAD` · `OPTIONS`

### Handler Signature

```ts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ [key]: string }> },
): Promise<Response>;
```

### Segment Config Exports

| Export              | Type                                                                                                                                                                    | Description                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `dynamic`           | `'auto' \| 'force-dynamic' \| 'error' \| 'force-static'`                                                                                                                | Caching behaviour                                                                         |
| `dynamicParams`     | `boolean`                                                                                                                                                               | Allow params not in `generateStaticParams` (`true`) or 404 (`false`)                      |
| `revalidate`        | `number \| false`                                                                                                                                                       | ISR revalidation interval                                                                 |
| `fetchCache`        | `'auto' \| 'default-cache' \| 'default-no-store' \| 'force-cache' \| 'force-no-store' \| 'only-cache' \| 'only-no-store'`                                               | Fetch caching mode                                                                        |
| `runtime`           | `'nodejs' \| 'edge'`                                                                                                                                                    | Runtime                                                                                   |
| `preferredRegion`   | `string \| string[]`                                                                                                                                                    | Deployment region                                                                         |
| `maxDuration`       | `number`                                                                                                                                                                | Max execution time (s)                                                                    |
| `unstable_prefetch` | `{ mode: 'static'; from?: string[]; expectUnableToVerify?: boolean } \| { mode: 'runtime'; samples: RuntimeSample[]; from?: string[]; expectUnableToVerify?: boolean }` | ⚠️ Unstable — prefetch hint: `'static'` = build-time, `'runtime'` = request-time sampling |

---

## `template.tsx`

Like `layout.tsx` but **re-mounts on every navigation** between children. Use for enter/exit animations or per-page state resets.

```tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

---

## `default.tsx`

Fallback UI for a parallel route slot when the slot has no active match after a full-page reload.

```tsx
// app/@modal/default.tsx
export default function ModalDefault() {
  return null; // or notFound()
}
```

---

## `proxy.ts`

> **Next.js 16**: `middleware.ts` was renamed to `proxy.ts`. The function is also renamed from `middleware` to `proxy`. Runtime changed from Edge to **Node.js**.

Runs before every request. Lives at the **project root** (next to `app/`).

```ts
// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

// Alternatively:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

### `matcher` Rules

```ts
export const config = {
  matcher: [
    // Match specific paths
    "/about",
    "/dashboard/:path*",
    // Exclude static files and _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
    // Conditional logic with has/missing
    {
      source: "/api/:path*",
      has: [{ type: "header", key: "x-my-header" }],
    },
  ],
};
```

> `proxy.ts` runs in the **Node.js runtime**. Full Node.js APIs available.
>
> ⚠️ **Do NOT export a `runtime` config variable from `proxy.ts`** — doing so throws an error. The runtime is always Node.js and cannot be overridden.

---

## `instrumentation.ts`

Server-side telemetry hooks. Lives at the **project root** or `src/`.

```ts
// instrumentation.ts
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "my-app" });
}

// Capture errors for observability
export function onRequestError(
  error: unknown, // In practice, an Error with an optional `digest` string property
  request: Readonly<{
    path: string;
    method: string;
    headers: { [key: string]: string | string[] };
  }>,
  context: Readonly<{
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "proxy";
    renderSource?:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering";
    revalidateReason: "on-demand" | "stale" | undefined;
  }>,
) {
  fetch("/api/errors", {
    method: "POST",
    body: JSON.stringify({
      message: error.message,
      digest: error.digest,
      path: request.path,
    }),
  });
}
```

### Exports

| Export           | Signature                                            | Description                            |
| ---------------- | ---------------------------------------------------- | -------------------------------------- |
| `register`       | `() => void \| Promise<void>`                        | Called once on server start            |
| `onRequestError` | `(error, request, context) => void \| Promise<void>` | Called on every unhandled server error |

### TypeScript helper types

```ts
// Importable from 'next' for typed instrumentation files
import type { Instrumentation } from "next";

// Types the onRequestError export directly:
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  await reportError({ error, path: request.path, kind: context.routerKind });
};
```

`Instrumentation.onRequestError` is a namespace alias for `InstrumentationOnRequestError` from `next/dist/server/instrumentation/types`.

---

## `mdx-components.tsx`

Lives at the **project root** (or `src/`). Required to use MDX with the App Router. Provides custom React component overrides for HTML elements rendered from `.mdx` files.

**Install dependencies**:

```bash
pnpm add @next/mdx @mdx-js/loader @mdx-js/react @types/mdx
```

**Enable MDX in `next.config.ts`**:

```ts
import createMDX from "@next/mdx";
const withMDX = createMDX({ extension: /\.mdx?$/ });

export default withMDX({
  pageExtensions: ["ts", "tsx", "md", "mdx"],
});
```

**`mdx-components.tsx`** at project root:

```tsx
import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";

// Required — App Router MDX support
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Override specific HTML elements with custom React components
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>
    ),
    img: (props) => (
      <Image
        sizes="100vw"
        className="w-full rounded-lg"
        {...(props as ImageProps)}
      />
    ),
    // Spread in any components passed from MDX files
    ...components,
  };
}
```

**Use in a Server Component**:

```tsx
// app/blog/[slug]/page.tsx
import { MDXRemote } from "next-mdx-remote/rsc";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const source = await getPostContent(slug);
  return <MDXRemote source={source} />;
}
```

| Export             | Signature                                      | Description                          |
| ------------------ | ---------------------------------------------- | ------------------------------------ |
| `useMDXComponents` | `(components: MDXComponents) => MDXComponents` | Returns merged component map for MDX |

> `mdx-components.tsx` is auto-discovered by Next.js. No import needed — the framework calls `useMDXComponents` automatically when rendering `.mdx` files.

---

## `global-not-found.tsx` ⚠️ Experimental

Requires `experimental.globalNotFound: true` in `next.config.ts`. Provides a **single global 404 page** used across all routes — replaces per-segment `not-found.tsx` for root-level 404 handling.

```ts
// next.config.ts
experimental: {
  globalNotFound: true,
}
```

```tsx
// app/global-not-found.tsx
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
      </body>
    </html>
  );
}
```

> Unlike `not-found.tsx`, `global-not-found.tsx` must render a complete `<html>` document — it is used for all unmatched routes before any layout is applied.

---

## Metadata Files

For full details see `references/file-conventions-api.md`.

| File                              | Output                 | Description                          |
| --------------------------------- | ---------------------- | ------------------------------------ |
| `opengraph-image.tsx`             | Image                  | Dynamic OG image via `ImageResponse` |
| `opengraph-image.png/jpg/gif`     | Static image           | Static OG image                      |
| `twitter-image.tsx`               | Image                  | Dynamic Twitter card image           |
| `apple-icon.tsx / apple-icon.png` | Image                  | Apple touch icon                     |
| `icon.tsx / icon.png`             | Favicon                | App icon                             |
| `favicon.ico`                     | Favicon                | Root-level browser favicon           |
| `sitemap.ts`                      | `sitemap.xml`          | XML sitemap                          |
| `robots.ts`                       | `robots.txt`           | Crawler config                       |
| `manifest.ts`                     | `manifest.webmanifest` | PWA manifest                         |

### `MetadataRoute.Robots` type

```ts
type MetadataRoute.Robots = {
  rules:
    | {
        userAgent?: string | string[]; // default '*'
        allow?: string | string[];
        disallow?: string | string[];
        crawlDelay?: number;           // seconds between requests
      }
    | Array<{ userAgent: string | string[]; allow?; disallow?; crawlDelay? }>;
  sitemap?: string | string[];         // sitemap URL(s)
  host?: string;                       // canonical domain
};
```

```ts
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "Googlebot", allow: "/", disallow: "/private/" },
      { userAgent: "*", disallow: "/admin/" },
    ],
    sitemap: "https://example.com/sitemap.xml",
    host: "https://example.com",
  };
}
```

### `MetadataRoute.Manifest` type

Full PWA Web App Manifest. All fields are optional.

```ts
type MetadataRoute.Manifest = {
  name?: string;
  short_name?: string;
  description?: string;
  start_url?: string;                  // default '/'
  scope?: string;
  id?: string;                         // unique app identity hash
  lang?: string;                       // BCP 47 language tag
  dir?: 'auto' | 'ltr' | 'rtl';
  display?: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  display_override?: Array<
    | 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'
    | 'window-controls-overlay' | 'tabbed'
  >;
  orientation?:
    | 'any' | 'natural' | 'landscape' | 'portrait'
    | 'landscape-primary' | 'landscape-secondary'
    | 'portrait-primary' | 'portrait-secondary';
  theme_color?: string;
  background_color?: string;
  icons?: Array<{
    src: string;
    sizes?: string;    // e.g. '192x192'
    type?: string;     // e.g. 'image/png'
    purpose?: 'any' | 'maskable' | 'monochrome' | 'badge';
  }>;
  screenshots?: Array<{
    src: string;
    sizes?: string;
    type?: string;
    label?: string;
    form_factor?: 'narrow' | 'wide';
  }>;
  shortcuts?: Array<{
    name: string;
    url: string;
    short_name?: string;
    description?: string;
    icons?: Array<{ src: string; sizes?: string; type?: string }>;
  }>;
  categories?: string[];
  prefer_related_applications?: boolean;
  related_applications?: Array<{
    platform: string;  // 'play' | 'itunes' | 'windows' etc.
    url: string;
    id?: string;
  }>;
  protocol_handlers?: Array<{ protocol: string; url: string }>;
  file_handlers?: Array<{
    action: string;
    accept: Record<string, string[]>; // MIME -> file extensions
    icons?: Array<{ src: string; sizes?: string; type?: string }>;
    launch_type?: 'single-client' | 'multiple-clients';
  }>;
  share_target?: {
    action: string;
    method?: 'GET' | 'POST';
    enctype?: string;
    params: {
      title?: string;
      text?: string;
      url?: string;
      files?: Array<{ name: string; accept: string | string[] }>;
    };
  };
  launch_handler?: {
    client_mode?: 'auto' | 'focus-existing' | 'navigate-existing' | 'navigate-new' | Array<string>;
  };
};
```

### `ServerRuntime` type

Exported from `next` — the valid values for the `runtime` segment config option:

```ts
import type { ServerRuntime } from "next";

// 'nodejs' | 'experimental-edge' | 'edge' | undefined
export const runtime: ServerRuntime = "edge";
```

> Prefer `'edge'` over the deprecated `'experimental-edge'`.

### `Route<RouteInferType>` type

Exported from `next` for type-safe route strings when `typedRoutes: true` is set in `next.config.ts`:

```ts
import type { Route } from "next";

// Route<string> = string & {} — narrows to valid app route paths
function navigate(path: Route<string>) {
  /* ... */
}
```

With `typedRoutes: true`, the compiler emits a `__next_router_prefetch_path__` type that lists all valid routes. Passing an invalid path causes a TypeScript error.

```ts
import Link from 'next/link';
// href is typed as Route<string> when typedRoutes: true
<Link href="/dashboard">Dashboard</Link>  // ✅
<Link href="/typo">Bad</Link>              // ❌ TypeScript error if route doesn't exist
```
