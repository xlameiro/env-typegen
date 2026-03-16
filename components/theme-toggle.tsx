"use client";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import type { Theme } from "@/types";
import { cva } from "class-variance-authority";
import { useEffect, useRef } from "react";

/**
 * Theme toggle that integrates with our Zustand theme store.
 * Replaces fumadocs' built-in next-themes ThemeToggle so the entire app
 * uses a single source of truth for dark mode.
 *
 * Pass as `themeSwitch.component` in the DocsLayout to replace the default.
 */

const itemVariants = cva("size-6.5 p-1.5 rounded-full", {
  variants: {
    active: {
      true: "bg-fd-accent text-fd-accent-foreground",
      false: "text-fd-muted-foreground",
    },
  },
  defaultVariants: { active: false },
});

type Mode = "light-dark" | "light-dark-system";

type ThemeToggleProps = Readonly<{
  mode?: Mode;
  className?: string;
}>;

// Sun icon (lucide-compatible)
function SunIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// Moon icon (lucide-compatible)
function MoonIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// Monitor icon for "system" (lucide-compatible)
function MonitorIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

type ThemeEntry = [
  Theme,
  (props: Readonly<{ className?: string }>) => React.JSX.Element,
];

const allThemes: ThemeEntry[] = [
  ["light", SunIcon],
  ["dark", MoonIcon],
  ["system", MonitorIcon],
];

export function ThemeToggle({
  mode = "light-dark",
  className,
}: ThemeToggleProps) {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  // Track mounted state without triggering a re-render via setState.
  // isMounted.current is only read after the initial effect runs.
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
  }, []);

  const containerClass = cn(
    "inline-flex items-center rounded-full border p-1",
    className,
  );

  if (mode === "light-dark") {
    const prefersDark =
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    const resolved: "light" | "dark" = isDark ? "dark" : "light";

    return (
      <button
        className={containerClass}
        aria-label="Toggle theme"
        data-theme-toggle=""
        onClick={() => {
          setTheme(resolved === "light" ? "dark" : "light");
        }}
      >
        {allThemes
          .filter(([key]) => key !== "system")
          .map(([key, Icon]) => (
            <Icon
              key={key}
              className={itemVariants({ active: resolved === key })}
            />
          ))}
      </button>
    );
  }

  // light-dark-system: three-button toggle
  return (
    <div className={containerClass} data-theme-toggle="">
      {allThemes.map(([key, Icon]) => (
        <button
          key={key}
          aria-label={key}
          className={itemVariants({ active: theme === key })}
          onClick={() => {
            setTheme(key);
          }}
        >
          <Icon className="size-full" />
        </button>
      ))}
    </div>
  );
}
