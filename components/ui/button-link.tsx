import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import Link, { type LinkProps } from "next/link";
import type { PropsWithChildren } from "react";
import { buttonVariants } from "./button";

// ButtonLink is generic over RouteType (same pattern as Next.js Link) so that
// typed routes (next.config.ts typedRoutes: true) are enforced at the call site.
// PropsWithChildren and className are added explicitly because LinkProps does
// not extend AnchorHTMLAttributes — children and className must be declared.
type ButtonLinkProps<RouteType extends string> = PropsWithChildren<
  LinkProps<RouteType> &
    VariantProps<typeof buttonVariants> & { className?: string }
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
