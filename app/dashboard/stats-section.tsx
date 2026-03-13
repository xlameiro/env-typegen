/**
 * @template-example
 * Streaming/Suspense demo — delete with app/dashboard/ and lib/stats.ts.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { getStats } from "@/lib/stats";

/**
 * Streaming example — async Server Component that fetches its own data.
 *
 * Wrap this in <Suspense fallback={<StatsSectionSkeleton />}> at the call site
 * so the page shell renders immediately and this section streams in when ready.
 *
 * Key rule from the RSC performance model:
 *   - async/await lives INSIDE the component, not at the page level
 *   - the <Suspense> boundary above this component is what enables streaming
 *   - without a Suspense ancestor, React waits for everything before flushing HTML
 */
export async function StatsSection() {
  const stats = await getStats();

  return (
    <section aria-labelledby="stats-heading" className="mt-8">
      <h2
        id="stats-heading"
        className="mb-4 text-sm font-medium tracking-widest text-muted-foreground uppercase"
      >
        Overview
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="list">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="rounded-lg border border-border bg-card p-5"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stat.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Suspense fallback for StatsSection.
 * Matches the visual footprint of the real content to minimise layout shift
 * when the streamed chunk arrives.
 */
export function StatsSectionSkeleton() {
  return (
    <section aria-label="Loading overview stats" className="mt-8">
      <Skeleton className="mb-4 h-4 w-24" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["stat-a", "stat-b", "stat-c"] as const).map((id) => (
          <div key={id} className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        ))}
      </div>
    </section>
  );
}
