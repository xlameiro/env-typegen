"use client";

// nuqs example: URL-synced state for search and pagination.
// All state lives in the URL — shareable, bookmarkable, SSR-compatible.
import { FormInput } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useCallback, type ChangeEvent } from "react";

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
    (event: ChangeEvent<HTMLInputElement>) => {
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
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div>
        <label htmlFor="dashboard-search" className="sr-only">
          Search
        </label>
        <FormInput
          id="dashboard-search"
          type="search"
          value={q}
          onChange={handleSearch}
          placeholder="Search…"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {q
          ? `Showing results for "${q}" (page ${page})`
          : "Type to search. State is stored in the URL — try refreshing."}
      </p>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          ← Previous
        </Button>
        <span className="flex items-center px-2 text-sm text-muted-foreground">
          Page {page}
        </span>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => handlePageChange(page + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
