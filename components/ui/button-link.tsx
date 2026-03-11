import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { buttonVariants } from "./button";

// ButtonLink is generic over RouteType (same pattern as Next.js Link) so that
// typed routes (next.config.ts typedRoutes: true) are enforced at the call site.
// AnchorHTMLAttributes is included (minus href/children handled elsewhere) so
// that standard anchor props like target, rel, aria-*, and className are accepted.
type ButtonLinkProps<RouteType extends string> = PropsWithChildren<
  LinkProps<RouteType> &
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> &
    VariantProps<typeof buttonVariants>
>;

/**
 * A Next.js Link styled as a button.
 * Use when navigation is needed but the visual should match a button.
 * Renders a semantic <a> element — never a <button>.
 */
export function ButtonLink<RouteType extends string>({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonLinkProps<RouteType>) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
