import { cn } from "@/lib/utils";

type SkeletonProps = {
  readonly className?: string;
};

/**
 * Animated placeholder used as a Suspense fallback while async Server Components load.
 * Rendered server-side — no client JS required.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}
