---
applyTo: "**/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css"
description: "Performance optimization guidelines for this Next.js 16 / React 19 / TypeScript stack. Covers rendering, caching, bundle size, and API patterns."
---

# Performance Optimization — Next.js 16 / React 19

Measure first; optimize second. Profile with Lighthouse, Chrome DevTools Performance tab, and Next.js build output before making changes.

---

## Rendering

- Default to **Server Components** — zero client-side JS overhead.
- Add `"use client"` only when the component needs interactivity (hooks, events, browser APIs). Keep client boundaries as deep and narrow as possible.
- Wrap async Server Components with `<Suspense>` to enable streaming and avoid waterfall blocking.
- Use `loading.tsx` for route-level loading skeletons; it activates automatically without manual state.
- Use `React.memo` and `useCallback`/`useMemo` sparingly — measure before adding; they have overhead.

### Streaming with Suspense — the only way to unlock RSC performance gains

Making a Server Component `async` is not enough. Without a `<Suspense>` boundary, React waits for the entire tree before flushing any HTML — the same blocking profile as classic SSR. Streaming only activates when both conditions are met: async component + Suspense ancestor.

```tsx
// ❌ Bad: page-level await blocks all HTML until the slow fetch resolves
// ("forgotten Suspense" — the most common RSC performance mistake)
export default async function Page() {
  const stats = await getStats(); // 800ms wait → nothing renders meanwhile
  return <StatsPanel stats={stats} />;
}

// ✅ Good: shell renders immediately; StatsPanel streams in independently
import { Suspense } from "react";
export default function Page() {
  return (
    <>
      <FastHeader /> {/* renders right away */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsPanel /> {/* async — fetches its own data */}
      </Suspense>
    </>
  );
}

async function StatsPanel() {
  const stats = await getStats();
  {
    /* fetch lives here, inside the boundary */
  }
  return (
    <ul>
      {stats.map((s) => (
        <li key={s.label}>{s.value}</li>
      ))}
    </ul>
  );
}
```

**Checklist for the streaming pattern:**

- One `<Suspense>` **per independently-fetching component** — not one per page
- Each async component owns its data fetch — never pass slow data down as props from a blocking parent
- Design a matching skeleton component (`*Skeleton`) that mirrors the real layout to minimise layout shift
- Never put `use client` above an async component in the hierarchy — it converts all children to client components and breaks async support
- **Bundle size reduction is minimal in mixed apps** — RSC eliminates JS only for fully static, interaction-free pages; the real gain is streaming latency

See `app/dashboard/stats-section.tsx` + `app/dashboard/page.tsx` for the reference implementation.

## Caching (Next.js 16 Cache Components)

- Prefer `'use cache'` directive over `unstable_cache` for new code — see `nextjs.instructions.md §7`.
- Tag cached functions with `cacheTag(...)` so they can be invalidated precisely.
- Set lifetimes with `cacheLife(...)` using the appropriate preset (`minutes`, `hours`, `days`, `max`).
- Use `revalidateTag(tag, 'max')` (stale-while-revalidate) for background revalidation.
- Use `updateTag(tag)` inside Server Actions when you need immediate consistency after a mutation.
- Avoid `cache: 'no-store'` unless data genuinely must be fresh on every request — it disables all caching.

## Images and Assets

- Always use `<Image>` from `next/image` — auto-optimizes size, format (WebP/AVIF), and lazy loading.
- Always specify `width` and `height` (or `fill` + a positioned parent) to prevent layout shift (CLS).
- Serve fonts via `next/font` — eliminates FOUT and reduces layout shift.
- Inline small SVG icons as React components; avoid `<img>` for icons.

## JavaScript Bundle

- Keep client components small — the more logic lives on the server, the smaller the client bundle.
- Use `dynamic()` from `next/dynamic` for heavy client components that aren't needed on first render.
- Never import a large library just for one utility function — use tree-shakeable alternatives or write the 10-line version yourself.
- Audit bundle size with `pnpm build` and inspect `.next/analyze/` (add `@next/bundle-analyzer` when needed).

## Data Fetching

- Fetch in Server Components directly — never fetch from a Client Component what can be fetched on the server.
- Do NOT call your own Route Handlers from Server Components (`fetch('/api/...')`); call the underlying function directly.
- Parallel-fetch independent data with `Promise.all()` to reduce waterfall latency.
- Paginate all list queries — never return unbounded result sets from Route Handlers.

## API Route Handlers

- Keep handlers thin: validate input with Zod, call a service function, return a typed response.
- Set appropriate `cache` headers for GET handlers that return stable data.
- Use `NextResponse.json()` with explicit HTTP status codes.

## Bundle Analysis

Use `@next/bundle-analyzer` to identify client bundle bloat before shipping.

```bash
# Generate interactive bundle report (opens in browser)
pnpm analyze
```

This sets `ANALYZE=true` which activates the `withBundleAnalyzer` wrapper in `next.config.ts`. It opens two treemap reports: `client.html` and `server.html`.

**When to run:**

- After adding a new dependency to a Client Component
- When a Lighthouse audit flags a large JS payload
- Before any major release

**What to look for:**

- Unexpectedly large dependencies in the client bundle (moment.js, lodash, etc.)
- Server-only modules accidentally included in the client bundle
- Duplicate packages (two versions of the same library)

```ts
// next.config.ts — already configured
import withBundleAnalyzer from "@next/bundle-analyzer";
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(
  nextConfig,
);
```

## Lighthouse-Driven Audit Workflow

Use Lighthouse as the objective performance and accessibility baseline. Run it locally and let the agent apply the fixes.

```bash
# Generate a JSON report against the local dev server
npx lighthouse http://localhost:3000 --output=json --output-path=lighthouse-report.json --chrome-flags="--headless"
```

Then open `.github/prompts/lighthouse-audit.prompt.md` in VS Code Copilot Chat — paste the JSON at the bottom and the agent maps each finding to a code change.

**When to run a Lighthouse audit:**

- Before any major release
- After adding a new page or heavy component
- When a user reports a slow or inaccessible experience
- As part of the sprint "definition of done" for UI-facing features

**Interpreting Lighthouse scores for this stack:**

| Score  | Meaning for this project              |
| ------ | ------------------------------------- |
| < 70   | Blocking issues — fix before shipping |
| 70–89  | Address in the current sprint         |
| 90–100 | Acceptable — monitor on next release  |

> **Note**: Run `pnpm analyze` in parallel with Lighthouse to correlate JS bundle size findings with their source in the treemap.

## Code Review Checklist

- [ ] New components default to Server Component (no unnecessary `"use client"`)
- [ ] Images use `<Image>` with explicit dimensions
- [ ] Heavy components use `dynamic()` for lazy loading
- [ ] Data fetched server-side where possible; no `useEffect` data fetching
- [ ] Large lists are paginated
- [ ] Cached functions/routes have appropriate tags and lifetimes
- [ ] No entire library imported for a single util
- [ ] Run `pnpm analyze` after adding large dependencies to Client Components
- [ ] Lighthouse score ≥ 90 across Performance, Accessibility, SEO for new/modified pages

---

<!-- End of Performance Optimization Instructions -->

## Learnings
