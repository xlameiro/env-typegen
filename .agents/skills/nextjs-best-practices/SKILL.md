---
name: nextjs-best-practices
description: "Next.js App Router principles. Server Components, data fetching, routing patterns."
metadata:
  source: community
  date_added: "2026-02-27"
---

# Next.js Best Practices

> Principles for Next.js App Router development.

---

## 1. Server vs Client Components

### Decision Tree

```
Does it need...?
│
├── useState, useEffect, event handlers
│   └── Client Component ('use client')
│
├── Direct data fetching, no interactivity
│   └── Server Component (default)
│
└── Both?
    └── Split: Server parent + Client child
```

### By Default

| Type | Use |
|------|-----|
| **Server** | Data fetching, layout, static content |
| **Client** | Forms, buttons, interactive UI |

---

## 2. Data Fetching Patterns

### Fetch Strategy

> **Next.js 16 breaking change:** `fetch()` is **not cached by default** anymore.
> The default `auto` behavior fetches fresh on every request unless you explicitly opt in.

| Pattern | How | Use |
|---------|-----|-----|
| **`use cache`** (preferred) | `'use cache'` directive + `cacheLife` | Caching in Next.js 16; works for components, functions, data |
| **Force-cache** | `fetch(url, { cache: 'force-cache' })` | Explicitly cache a single fetch call |
| **Revalidate** | `fetch(url, { next: { revalidate: 60 } })` | ISR (time-based refresh) |
| **No-store** | `fetch(url, { cache: 'no-store' })` | Always fetch fresh (dynamic) |
| **No cache (default)** | `fetch(url)` | Not cached — runs on every request |

### Data Flow

| Source | Pattern |
|--------|---------|
| Database | Server Component fetch |
| API | fetch with caching |
| User input | Client state + server action |

---

## 3. Routing Principles

### File Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Route UI |
| `layout.tsx` | Shared layout |
| `loading.tsx` | Loading state |
| `error.tsx` | Error boundary |
| `not-found.tsx` | 404 page |

### Route Organization

| Pattern | Use |
|---------|-----|
| Route groups `(name)` | Organize without URL |
| Parallel routes `@slot` | Multiple same-level pages |
| Intercepting `(.)` | Modal overlays |

---

## 4. API Routes

### Route Handlers

| Method | Use |
|--------|-----|
| GET | Read data |
| POST | Create data |
| PUT/PATCH | Update data |
| DELETE | Remove data |

### Best Practices

- Validate input with Zod
- Return proper status codes
- Handle errors gracefully
- Use **Node.js runtime** (default); prefer Edge runtime only for ultra-low latency needs where its feature restrictions are acceptable
- Do not call your own Route Handlers from Server Components — extract shared logic into `lib/` modules and call directly

---

## 5. Performance Principles

### Image Optimization

- Use next/image component
- Set priority for above-fold
- Provide blur placeholder
- Use responsive sizes

### Bundle Optimization

- Dynamic imports for heavy components
- Route-based code splitting (automatic)
- Analyze with bundle analyzer

---

## 6. Metadata

### Static vs Dynamic

| Type | Use |
|------|-----|
| Static export | Fixed metadata |
| generateMetadata | Dynamic per-route |

### Essential Tags

- title (50-60 chars)
- description (150-160 chars)
- Open Graph images
- Canonical URL

---

## 7. Caching Strategy (Next.js 16)

### Recommended: `use cache` Directive (Cache Components)

Next.js 16 introduces Cache Components as the **primary caching mechanism**. Enable it in `next.config.ts`:

```typescript
const nextConfig: NextConfig = { cacheComponents: true }
```

Then use the `'use cache'` directive in components, Server Actions, or utility functions:

```typescript
import { cacheLife, cacheTag } from 'next/cache'

async function getProducts() {
  'use cache'
  cacheLife('hours')        // built-in profile: seconds / minutes / hours / days / max
  cacheTag('products')      // tag for on-demand invalidation
  return db.query('SELECT * FROM products')
}
```

### Cache Layers

| Layer | Control |
|-------|--------|
| Component/Function | `'use cache'` directive + `cacheLife` + `cacheTag` |
| Individual fetch | `fetch(url, { cache: 'force-cache' })` |
| Data tags | `cacheTag` / `revalidateTag` / `updateTag` |
| Full route | route segment config |

### Revalidation

| Method | Where | Use |
|--------|-------|-----|
| `revalidateTag(tag, 'max')` | Server Actions, Route Handlers | Stale-while-revalidate |
| `updateTag(tag)` | Server Actions **only** | Immediate expiry (read-your-own-writes) |
| `revalidatePath(path)` | Server Actions, Route Handlers | Invalidate a route's full cache |
| `cacheLife('hours')` | inside `'use cache'` scope | Time-based TTL |
| `fetch(url, { cache: 'no-store' })` | Server Components | Dynamic, never cached |

> **Legacy patterns still work** (`unstable_cache`, `fetch` with `next.revalidate`) but prefer `use cache` for new code.

---

## 8. Server Actions

### Use Cases

- Form submissions
- Data mutations
- Revalidation triggers

### Best Practices

- Mark with 'use server'
- Validate all inputs
- Return typed responses
- Handle errors

---

## 9. Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| 'use client' everywhere | Server by default |
| Fetch in client components | Fetch in server |
| Skip loading states | Use loading.tsx |
| Ignore error boundaries | Use error.tsx |
| Large client bundles | Dynamic imports |

---

## 10. Project Structure

```
app/
├── (marketing)/     # Route group
│   └── page.tsx
├── (dashboard)/
│   ├── layout.tsx   # Dashboard layout
│   └── page.tsx
├── api/
│   └── [resource]/
│       └── route.ts
└── components/
    └── ui/
```

---

> **Remember:** Server Components are the default for a reason. Start there, add client only when needed.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
