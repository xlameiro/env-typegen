---
name: nextjs-app-router-patterns
description: Master Next.js 16 App Router with Server Components, streaming, Cache Components (use cache), parallel routes, and advanced data fetching. Use when building Next.js applications, implementing SSR/SSG, or optimizing React Server Components.
---

# Next.js App Router Patterns

Comprehensive patterns for Next.js 16 App Router architecture, Server Components, Cache Components, and modern full-stack React development.

## When to Use This Skill

- Building new Next.js applications with App Router
- Migrating from Pages Router to App Router
- Implementing Server Components and streaming
- Setting up parallel and intercepting routes
- Optimizing data fetching and caching
- Building full-stack features with Server Actions

## Core Concepts

### 1. Rendering Modes

| Mode                  | Where        | When to Use                               |
| --------------------- | ------------ | ----------------------------------------- |
| **Server Components** | Server only  | Data fetching, heavy computation, secrets |
| **Client Components** | Browser      | Interactivity, hooks, browser APIs        |
| **Static**            | Build time   | Content that rarely changes               |
| **Dynamic**           | Request time | Personalized or real-time data            |
| **Streaming**         | Progressive  | Large pages, slow data sources            |

### 2. File Conventions

```
app/
├── layout.tsx       # Shared UI wrapper
├── page.tsx         # Route UI
├── loading.tsx      # Loading UI (Suspense)
├── error.tsx        # Error boundary
├── not-found.tsx    # 404 UI
├── route.ts         # API endpoint
├── template.tsx     # Re-mounted layout
├── default.tsx      # Parallel route fallback
└── opengraph-image.tsx  # OG image generation
```

## Quick Start

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: { default: 'My App', template: '%s | My App' },
  description: 'Built with Next.js App Router',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// app/page.tsx - Server Component by default
// Preferred in Next.js 16: use cache directive (requires cacheComponents: true in next.config)
import { cacheLife } from 'next/cache'

async function getProducts() {
  'use cache'
  cacheLife('hours') // cache for ~1 hour; 'default' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
  const res = await fetch('https://api.example.com/products')
  return res.json()
}

// Alternatively, using fetch cache option (still valid):
// async function getProducts() {
//   const res = await fetch('https://api.example.com/products', {
//     next: { revalidate: 3600 }, // ISR: revalidate every hour
//   })
//   return res.json()
// }

export default async function HomePage() {
  const products = await getProducts()

  return (
    <main>
      <h1>Products</h1>
      <ProductGrid products={products} />
    </main>
  )
}
```

## Patterns

> **Project-specific convention**: Examples below may reference `process.env.VARIABLE` directly. In this project, always import env vars from `@/lib/env` instead: `import { env } from '@/lib/env'`. Never access `process.env.*` outside `lib/env.ts`. See `copilot-instructions.md` §Boundaries.

### Pattern 1: Server Components with Data Fetching

```typescript
// app/products/page.tsx
import { Suspense } from 'react'
import { ProductList, ProductListSkeleton } from '@/components/products'
import { FilterSidebar } from '@/components/filters'

interface SearchParams {
  category?: string
  sort?: 'price' | 'name' | 'date'
  page?: string
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  return (
    <div className="flex gap-8">
      <FilterSidebar />
      <Suspense
        key={JSON.stringify(params)}
        fallback={<ProductListSkeleton />}
      >
        <ProductList
          category={params.category}
          sort={params.sort}
          page={Number(params.page) || 1}
        />
      </Suspense>
    </div>
  )
}

// components/products/ProductList.tsx - Server Component
async function getProducts(filters: ProductFilters) {
  const res = await fetch(
    `${process.env.API_URL}/products?${new URLSearchParams(filters)}`,
    { next: { tags: ['products'] } }
  )
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function ProductList({ category, sort, page }: ProductFilters) {
  const { products, totalPages } = await getProducts({ category, sort, page })

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}
```

### Pattern 2: Client Components with 'use client'

```typescript
// components/products/AddToCartButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { addToCart } from '@/app/actions/cart'

export function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await addToCart(productId)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? 'Adding...' : 'Add to Cart'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
```

### Pattern 2b: `React.use()` — Unwrap Promises and Context in Client Components

`React.use()` is a React 19 API that lets you read a Promise or Context value **synchronously** inside a Client Component. Unlike `useEffect`, it integrates with Suspense — the component suspends while the promise resolves.

**Unwrap a Promise passed from a Server Component**:

```tsx
// app/product/page.tsx (Server Component)
import { Suspense } from "react";
import { ProductDetails } from "./product-details";
import { getProduct } from "@/lib/products";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Pass the un-awaited promise to the Client Component
  const productPromise = getProduct(params.then(({ id }) => id));
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails productPromise={productPromise} />
    </Suspense>
  );
}
```

```tsx
// app/product/product-details.tsx (Client Component)
"use client";
import { use } from "react";
import type { Product } from "@/types";

export function ProductDetails({
  productPromise,
}: {
  productPromise: Promise<Product>;
}) {
  const product = use(productPromise); // suspends until resolved; no useEffect needed
  return <div>{product.name}</div>;
}
```

**Unwrap Context**:

```tsx
"use client";
import { use } from "react";
import { ThemeContext } from "@/lib/theme-context";

// More ergonomic than useContext in conditional branches
export function ThemedButton({ children }: { children: React.ReactNode }) {
  const theme = use(ThemeContext);
  return <button data-theme={theme}>{children}</button>;
}
```

> `use()` can be called conditionally (unlike hooks). It suspends the component when the value is not yet ready — always wrap the calling component in `<Suspense>`. For Context, `use(Context)` behaves identically to `useContext(Context)` but is callable inside conditionals and loops.

### Pattern 3: Server Actions

```typescript
// app/actions/cart.ts
"use server";

import { updateTag } from "next/cache"; // updateTag for Server Actions (immediate expiry)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function addToCart(productId: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) {
    redirect("/login");
  }

  try {
    await db.cart.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      update: { quantity: { increment: 1 } },
      create: { sessionId, productId, quantity: 1 },
    });

    // updateTag: immediate cache expiry (read-your-own-writes). Only in Server Actions.
    // Use revalidateTag('cart', 'max') instead when stale-while-revalidate is acceptable.
    updateTag("cart");
    return { success: true };
  } catch (error) {
    return { error: "Failed to add item to cart" };
  }
}

export async function checkout(formData: FormData) {
  const address = formData.get("address") as string;
  const payment = formData.get("payment") as string;

  // Validate
  if (!address || !payment) {
    return { error: "Missing required fields" };
  }

  // Process order
  const order = await processOrder({ address, payment });

  // Redirect to confirmation
  redirect(`/orders/${order.id}/confirmation`);
}
```

### Pattern 3b: Server Actions + React 19 Hooks

Use `useActionState`, `useFormStatus`, and `useOptimistic` to connect Server Actions to the UI with built-in pending/error states.

**`useActionState` — bind action state to a form**:

```tsx
"use client";
import { useActionState } from "react";
import { addToCart } from "@/app/actions/cart";

type ActionState = { success?: boolean; error?: string };

export function AddToCartButton({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    addToCart.bind(null, productId),
    { success: false },
  );

  return (
    <form action={formAction}>
      <button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add to Cart"}
      </button>
      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-500">Added!</p>}
    </form>
  );
}
```

**`useFormStatus` — read pending state inside a form child**:

```tsx
"use client";
import { useFormStatus } from "react-dom";

// Must be a component rendered INSIDE a <form> — not the form component itself
export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Submitting…" : label}
    </button>
  );
}
```

**`useOptimistic` — instantly update UI before Server Action resolves**:

```tsx
"use client";
import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/actions/likes";

export function LikeButton({
  postId,
  initialLiked,
}: {
  postId: string;
  initialLiked: boolean;
}) {
  const [optimisticLiked, addOptimistic] = useOptimistic(
    initialLiked,
    (_currentState: boolean, optimisticValue: boolean) => optimisticValue,
  );
  const [_isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          addOptimistic(!optimisticLiked); // instant UI update
          await toggleLike(postId); // actual server mutation
        });
      }}
    >
      {optimisticLiked ? "❤️" : "🤍"}
    </button>
  );
}
```

> `useActionState` is the primary hook for form-based Server Actions. `useFormStatus` reads pending state from a parent `<form>` — it must be in a child component, not the form component itself. `useOptimistic` is best for toggle/increment mutations where the optimistic result is predictable.

### Pattern 4: Parallel Routes

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside className="analytics-panel">{analytics}</aside>
      <aside className="team-panel">{team}</aside>
    </div>
  )
}

// app/dashboard/@analytics/page.tsx
export default async function AnalyticsSlot() {
  const stats = await getAnalytics()
  return <AnalyticsChart data={stats} />
}

// app/dashboard/@analytics/loading.tsx
export default function AnalyticsLoading() {
  return <ChartSkeleton />
}

// app/dashboard/@team/page.tsx
export default async function TeamSlot() {
  const members = await getTeamMembers()
  return <TeamList members={members} />
}
```

### Pattern 5: Intercepting Routes (Modal Pattern)

```typescript
// File structure for photo modal
// app/
// ├── @modal/
// │   ├── (.)photos/[id]/page.tsx  # Intercept
// │   └── default.tsx
// ├── photos/
// │   └── [id]/page.tsx            # Full page
// └── layout.tsx

// app/@modal/(.)photos/[id]/page.tsx
import { Modal } from '@/components/Modal'
import { PhotoDetail } from '@/components/PhotoDetail'

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)

  return (
    <Modal>
      <PhotoDetail photo={photo} />
    </Modal>
  )
}

// app/photos/[id]/page.tsx - Full page version
export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)

  return (
    <div className="photo-page">
      <PhotoDetail photo={photo} />
      <RelatedPhotos photoId={id} />
    </div>
  )
}

// app/layout.tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <html>
      <body>
        {children}
        {modal}
      </body>
    </html>
  )
}
```

### Pattern 6: Streaming with Suspense

```typescript
// app/product/[id]/page.tsx
import { Suspense } from 'react'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // This data loads first (blocking)
  const product = await getProduct(id)

  return (
    <div>
      {/* Immediate render */}
      <ProductHeader product={product} />

      {/* Stream in reviews */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={id} />
      </Suspense>

      {/* Stream in recommendations */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={id} />
      </Suspense>
    </div>
  )
}

// These components fetch their own data
async function Reviews({ productId }: { productId: string }) {
  const reviews = await getReviews(productId) // Slow API
  return <ReviewList reviews={reviews} />
}

async function Recommendations({ productId }: { productId: string }) {
  const products = await getRecommendations(productId) // ML-based, slow
  return <ProductCarousel products={products} />
}
```

### Pattern 6b: Partial Prerendering (PPR) — Next.js 16

PPR combines a **static shell** (pre-rendered at build time, served from CDN) with **dynamic holes** (streamed in at request time). It is enabled globally or per-route.

**Enable globally** in `next.config.ts`:

```ts
experimental: {
  ppr: true,
}
```

**Enable per-route (incremental)** when `ppr: 'incremental'`:

```ts
// next.config.ts
experimental: {
  ppr: "incremental";
}

// app/dashboard/page.tsx
export const experimental_ppr = true; // opts this page in
```

**Structure**: Static shell + Suspense holes for dynamic content:

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import { DashboardShell } from "./dashboard-shell";
import { UserActivity } from "./user-activity";
import { ActivitySkeleton } from "./activity-skeleton";

// Static shell rendered at build time — no async, no dynamic APIs
export default function DashboardPage() {
  return (
    <DashboardShell>
      {/* Suspense boundary creates the dynamic hole */}
      <Suspense fallback={<ActivitySkeleton />}>
        <UserActivity /> {/* Reads cookies() — dynamic, streams in */}
      </Suspense>
    </DashboardShell>
  );
}

// Async Server Component with dynamic API — isolated behind Suspense
async function UserActivity() {
  const session = await getCookieSession(); // cookies() — dynamic!
  const activity = await fetchActivity(session.userId);
  return <ActivityFeed data={activity} />;
}
```

| Behaviour                        | Without PPR                   | With PPR                               |
| -------------------------------- | ----------------------------- | -------------------------------------- |
| Initial HTML delivery            | Waits for all async data      | Static shell arrives immediately       |
| Dynamic content                  | Blocks entire page            | Streams in after shell                 |
| CDN cacheability                 | Not cacheable (dynamic route) | Static shell is fully cacheable        |
| `cookies()` / `headers()` access | Anywhere in the tree          | Must be inside a `<Suspense>` boundary |

> With `cacheComponents: true` (default in Next.js 16), accessing `cookies()`, `headers()`, or `params` **outside** a `<Suspense>` boundary is a **build error**. Wrap dynamic components in `<Suspense>` explicitly.

### Pattern 7: Route Handlers (API Routes)

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");

  const products = await db.product.findMany({
    where: category ? { category } : undefined,
    take: 20,
  });

  return NextResponse.json(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const product = await db.product.create({
    data: body,
  });

  return NextResponse.json(product, { status: 201 });
}

// app/api/products/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}
```

### Pattern 8: Metadata and SEO

```typescript
// app/products/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) return {}

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  }
}

export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { slug: true } })
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) notFound()

  return <ProductDetail product={product} />
}
```

## Caching Strategies

### Data Cache

```typescript
// No cache (always fresh)
fetch(url, { cache: "no-store" });

// Cache forever (static)
fetch(url, { cache: "force-cache" });

// ISR - revalidate after 60 seconds
fetch(url, { next: { revalidate: 60 } });

// Tag-based invalidation
fetch(url, { next: { tags: ["products"] } });
```

```typescript
// actions/product-actions.ts — Invalidate via Server Action
"use server";
import { updateTag, revalidateTag, revalidatePath } from "next/cache";

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  // updateTag: immediate expiry in Server Actions (read-your-own-writes)
  updateTag("products");
  // OR for stale-while-revalidate (serves stale while regenerating in background):
  // revalidateTag("products", "max"); // second arg is a revalidation profile
  revalidatePath("/products"); // also invalidate the full route cache
}
```

### Per-Request Deduplication — `React.cache()`

Use `cache()` from `react` to deduplicate **non-`fetch()` async calls** (database queries, auth checks, computations) within a single render pass. Identical calls with the same arguments share one result — no extra DB round-trips.

```typescript
// lib/queries.ts
import { cache } from "react";

// Wrap the async function once — export the wrapped version
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

export const getCurrentSession = cache(async () => {
  return auth(); // session read happens once per request, regardless of how
  // many Server Components call getCurrentSession()
});
```

```typescript
// Any Server Component in the same request:
import { getUser, getCurrentSession } from "@/lib/queries";

export async function UserHeader() {
  const session = await getCurrentSession(); // DB: 1 query
  const user = await getUser(session.userId); // DB: 1 query
  return <header>Hello {user.name}</header>;
}

export async function UserSidebar() {
  const user = await getUser("same-id"); // Returns cached result — 0 extra queries
  return <aside>{user.email}</aside>;
}
```

**Cache-key rules — use primitives, not objects:**

```typescript
// ❌ Bad — inline object = new reference every call = cache miss
const getUser = cache(async (params: { id: string }) => ...);
getUser({ id: "1" }); getUser({ id: "1" }); // two separate DB calls

// ✅ Good — primitive uses value equality
const getUser = cache(async (id: string) => ...);
getUser("1"); getUser("1"); // one DB call, one cache hit
```

> `React.cache()` deduplicates **within one request only** — there is no cross-request sharing. For persistent multi-request caching, use `'use cache'` with `cacheLife()` (Pattern 9). `fetch()` deduplication is automatic in Next.js and does NOT need `React.cache()`.

### Pattern 9: Cache Components with `use cache` (Next.js 16)

```typescript
// Enable in next.config.ts:
// const nextConfig: NextConfig = { cacheComponents: true }

import { cacheLife, cacheTag } from 'next/cache'

// Cache a Server Component
export default async function ProductsPage() {
  'use cache'
  cacheLife('hours')         // 'default' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'max'
  cacheTag('products')       // tag for on-demand invalidation

  const products = await db.query('SELECT * FROM products')
  return <ProductList products={products} />
}

// Cache a shared data function
async function getProductById(id: string) {
  'use cache'
  cacheLife('days')
  cacheTag(`product-${id}`, 'products')
  return db.product.findUnique({ where: { id } })
}

// Invalidate on mutation (Server Action)
'use server'
import { updateTag } from 'next/cache'

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } })
  updateTag('products')        // immediate expiry (read-your-own-writes)
  updateTag(`product-${id}`)
}

// Or allow stale-while-revalidate (Route Handlers or Server Actions):
// import { revalidateTag } from 'next/cache'
// revalidateTag('products', 'max') // serves stale, regenerates in background
```

### Pattern 10: `after()` for Non-Blocking Post-Response Work

```typescript
// app/layout.tsx or any Server Component / Route Handler
import { after } from 'next/server'
import { logAnalytics } from '@/lib/analytics'

export default function Layout({ children }: { children: React.ReactNode }) {
  after(() => {
    // Runs after response is sent — does not block the user
    logAnalytics({ event: 'page_view' })
  })
  return <>{children}</>
}

// In a Route Handler
export async function POST(request: Request) {
  const data = await request.json()
  const result = await processData(data)

  after(async () => {
    // e.g. send a webhook, update audit log without blocking the response
    await notifyWebhook(result)
  })

  return Response.json(result)
}
```

### Pattern 11: View Transitions (Next.js 16 + React canary)

Smoothly animate between page navigations and state changes using the React View Transitions API. Requires `experimental.viewTransition: true` in `next.config.ts`.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
};
```

```tsx
// Wrap any element you want to animate across navigations
// Must be a Client Component — ViewTransition is a React canary API
"use client";

import { unstable_ViewTransition as ViewTransition } from "react";

export function ProductCard({ product }: { product: Product }) {
  return (
    // name links this element to the same element on the destination page (shared-element transition)
    <ViewTransition name={`product-${product.id}`}>
      <img src={product.image} alt={product.name} />
    </ViewTransition>
  );
}
```

```tsx
// Trigger a named transition type to apply different CSS classes
"use client";

import { addTransitionType, startTransition } from "react";
import { unstable_ViewTransition as ViewTransition } from "react";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() =>
        startTransition(() => {
          addTransitionType("slide-right"); // signals this is a back-navigation
          router.back();
        })
      }
    >
      ← Back
    </button>
  );
}

// In your component:
<ViewTransition
  default={{ default: "fade" }}
  enter={{ "slide-right": "slide-in-from-right", default: "fade-in" }}
  exit={{ "slide-right": "slide-out-to-right", default: "fade-out" }}
>
  {children}
</ViewTransition>;
```

> `<ViewTransition>` from `react` is currently in canary — it is re-exported by Next.js when `experimental.viewTransition: true` is set. The import `unstable_ViewTransition` will become `ViewTransition` once React stabilises the API.

### Pattern 12: Auth Interrupts — `forbidden()` / `unauthorized()` ⚠️ Experimental

> **Requires `experimental.authInterrupts: true`** in `next.config.ts`. Replaces the older `redirect('/sign-in')` / `redirect('/403')` pattern with typed HTTP 401 / 403 responses.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: { authInterrupts: true },
};
```

```tsx
// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { forbidden, unauthorized } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  // 401 Unauthorized — not authenticated
  if (!session) unauthorized();

  // 403 Forbidden — authenticated but lacks permission
  if (!session.user.roles.includes("admin")) forbidden();

  return <main>Dashboard content</main>;
}
```

**Response files** — create these next to `not-found.tsx` to customize the rendered UI:

```tsx
// app/unauthorized.tsx — rendered for 401 responses
export default function Unauthorized() {
  return (
    <main>
      <h1>401 — Sign in required</h1>
      <a href="/sign-in">Sign in</a>
    </main>
  );
}

// app/forbidden.tsx — rendered for 403 responses
export default function Forbidden() {
  return (
    <main>
      <h1>403 — Access denied</h1>
    </main>
  );
}
```

| Function         | HTTP Status | When to use                                |
| ---------------- | ----------- | ------------------------------------------ |
| `unauthorized()` | 401         | User is not authenticated                  |
| `forbidden()`    | 403         | User is authenticated but lacks permission |

> Auth interrupts throw a special error caught by Next.js — the response files are rendered instead of propagating to `error.tsx`. Use `unstable_rethrow()` in try/catch blocks to ensure these internal errors are not swallowed.

```tsx
// ✅ Correct: rethrow Next.js internal errors inside try/catch
try {
  await riskyOperation();
} catch (error) {
  unstable_rethrow(error); // lets forbidden/unauthorized pass through
  // handle application errors below
  logger.error(error);
}
```

## Best Practices

### Do's

- **Start with Server Components** - Add 'use client' only when needed
- **Use `use cache` for Next.js 16** - Prefer it over `unstable_cache` or manual `fetch` cache options
- **Colocate data fetching** - Fetch data where it's used
- **Use Suspense boundaries** - Enable streaming for slow data
- **Leverage parallel routes** - Independent loading states
- **Use Server Actions** - For mutations with progressive enhancement
- **Use `after()`** - For analytics, webhooks, and logging that shouldn't block the response

### Don'ts

- **Don't pass non-serializable data** - Server → Client boundary only accepts serializable values
- **Don't use hooks in Server Components** - No useState, useEffect
- **Don't fetch in Client Components** - Use Server Components; for client mutations use `useOptimistic` / `useTransition` with Server Actions
- **Don't over-nest layouts** - Each layout adds to the component tree
- **Don't ignore loading states** - Always provide loading.tsx or Suspense
- **Don't call your own Route Handlers from Server Components** - Extract shared logic into `lib/` modules
- **Don't use `unstable_cache` for new code** - Use `use cache` directive instead

## `useReportWebVitals()` — Web Performance Measurement

Sends Core Web Vitals metrics to your analytics endpoint. Must be used in a **Client Component**.

```ts
import { useReportWebVitals } from "next/web-vitals";

type Metric = {
  id: string;
  name: "TTFB" | "FCP" | "LCP" | "FID" | "CLS" | "INP" | string;
  value: number;
  delta: number;
  rating: "good" | "needs-improvement" | "poor";
  entries: PerformanceEntry[];
  navigationType:
    | "navigate"
    | "reload"
    | "back-forward"
    | "back-forward-cache"
    | "prerender";
};

function useReportWebVitals(reportFn: (metric: Metric) => void): void;
```

Place in the root `layout.tsx` via a thin Client Component wrapper:

```tsx
// app/web-vitals.tsx — 'use client' wrapper
"use client";
import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics — e.g. console, Datadog, Vercel Analytics
    console.log(metric.name, metric.value, metric.rating);
  });
  return null;
}

// app/layout.tsx
import { WebVitals } from "./web-vitals";
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

> **Note**: `useReportWebVitals` is a thin wrapper over the [web-vitals](https://github.com/GoogleChrome/web-vitals) library bundled with Next.js. Prefer Vercel Speed Insights (`@vercel/speed-insights`) or Datadog RUM for production — they handle batching and sampling automatically.

## Resources

- [Next.js 16 App Router Documentation](https://nextjs.org/docs/app)
- [Cache Components (use cache)](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [cacheTag / cacheLife / updateTag](https://nextjs.org/docs/app/api-reference/functions/cacheTag)
- [after() function](https://nextjs.org/docs/app/api-reference/functions/after)
- [Upgrading to Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Vercel Templates](https://vercel.com/templates/next.js)
