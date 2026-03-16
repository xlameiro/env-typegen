"use client";

import { useAppStore } from "@/store/use-app-store";
import { useEffect, type ReactNode } from "react";

/**
 * Reads the persisted `theme` from the Zustand store and applies
 * `class="dark"` to `document.documentElement` accordingly.
 *
 * Wrap the children of RootLayout with this component to enable
 * user-toggled dark mode alongside `prefers-color-scheme`.
 */
export function ThemeProvider({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = globalThis.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const shouldBeDark =
      theme === "dark" || (theme === "system" && prefersDark);

    root.classList.toggle("dark", shouldBeDark);
  }, [theme]);

  return children;
}
