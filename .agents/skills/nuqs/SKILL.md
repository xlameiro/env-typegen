---
name: nuqs
description: URL-synced state management with nuqs. Use when managing search queries, filters, pagination, tabs, or any state that should survive page refresh, be shareable via URL, and work with SSR in Next.js App Router. Never use useState for values that belong in the URL.
---

# nuqs Skill

Use this skill when managing URL-synced state: search queries, filters, pagination, tabs, or any state that should survive page refresh, be shareable via URL, and work with SSR.

**Rule:** Use `nuqs` for URL state — never `useState` for values that belong in the URL.

## Setup (already done in this template)

`<NuqsAdapter>` is already wired in `app/layout.tsx`. No additional setup needed.

```tsx
// app/layout.tsx — already present
import { NuqsAdapter } from "nuqs/adapters/next/app";

// ...
<NuqsAdapter>
  <ThemeProvider>{children}</ThemeProvider>
</NuqsAdapter>;
```

## Pattern 1 — Single typed search param (Client Component)

```tsx
"use client";

import { parseAsString, useQueryState } from "nuqs";

export function SearchInput() {
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));

  return (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search…"
    />
  );
}
```

## Pattern 2 — Multiple params + pagination

```tsx
"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

const searchParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  status: parseAsString.withDefault("all"),
};

export function FilterBar() {
  const [{ q, page, status }, setSearch] = useQueryStates(searchParsers, {
    // shallow: false — triggers Server Component re-render on change
    shallow: false,
  });

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setSearch({ q: e.target.value, page: 1 })}
      />
      <select
        value={status}
        onChange={(e) => setSearch({ status: e.target.value })}
      >
        <option value="all">All</option>
        <option value="active">Active</option>
      </select>
    </div>
  );
}
```

## Pattern 3 — Reading params in a Server Component

```tsx
// app/users/page.tsx
import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
} from "nuqs/server";
import { Suspense } from "react";

const searchParamsCache = createSearchParamsCache({
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
});

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { q, page } = searchParamsCache.parse(await searchParams);

  // Use q and page to fetch data server-side
  return (
    <Suspense>{/* client filter component + server-fetched list */}</Suspense>
  );
}
```

## Pattern 4 — Available parsers

```ts
import {
  parseAsString, // ?q=hello → "hello"
  parseAsInteger, // ?page=2 → 2
  parseAsFloat, // ?price=9.99 → 9.99
  parseAsBoolean, // ?active=true → true
  parseAsIsoDateTime, // ?from=2024-01-01T00:00:00.000Z → Date
  parseAsArrayOf, // ?ids=1,2,3 → ["1","2","3"]
  parseAsJson, // ?filter={...} → parsed object (use sparingly)
} from "nuqs";
```

## Pattern 5 — Resetting params

```tsx
// Reset all search params to their defaults
setSearch({ q: "", page: 1, status: "all" });

// Clear a single param (remove from URL)
setQuery(null);
```

## Rules

- Always use `shallow: false` when URL changes should trigger a Server Component re-render with new data
- Always reset `page` to 1 when changing search/filter criteria
- Use `.withDefault()` so the type is `string` (not `string | null`) — avoids null checks throughout the UI
- Wrap pages that use `nuqs` in `<Suspense>` when using `useSearchParams` internally (Next.js requirement)
- Do NOT use `nuqs` for sensitive state (auth tokens, private data) — URL params are always visible
- See `app/dashboard/dashboard-search.tsx` for the canonical working example in this project
