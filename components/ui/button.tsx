import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-foreground text-background hover:bg-foreground/90 focus-visible:outline-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-secondary",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground focus-visible:outline-foreground",
        ghost:
          "bg-transparent hover:bg-accent hover:text-accent-foreground focus-visible:outline-foreground",
        danger:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 dark:bg-red-500 dark:hover:bg-red-600",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
  };

export function Button({
  variant,
  size,
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: Readonly<ButtonProps>) {
  return (
    <button
      disabled={disabled ?? isLoading}
      aria-busy={isLoading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
