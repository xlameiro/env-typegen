"use client";

// nuqs example: URL-synced state for search and pagination.
// All state lives in the URL — shareable, bookmarkable, SSR-compatible.
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback } from "react";

const searchParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export function DashboardSearch() {
  const [{ q, page }, setSearch] = useQueryStates(searchParsers, {
    // shallow: false triggers a Server Component re-render when params change
    shallow: false,
  });

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch({ q: event.target.value, page: 1 });
    },
    [setSearch],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setSearch({ page: nextPage });
    },
    [setSearch],
  );

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <label htmlFor="dashboard-search" className="sr-only">
          Search
        </label>
        <input
          id="dashboard-search"
          type="search"
          value={q}
          onChange={handleSearch}
          placeholder="Search…"
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {q
          ? `Showing results for "${q}" (page ${page})`
          : "Type to search. State is stored in the URL — try refreshing."}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Previous
        </button>
        <span className="flex items-center px-2 text-sm text-zinc-500">
          Page {page}
        </span>
        <button
          type="button"
          onClick={() => handlePageChange(page + 1)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
