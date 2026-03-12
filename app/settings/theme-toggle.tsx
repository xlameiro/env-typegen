"use client";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import type { Theme } from "@/types";

type ThemeOption = {
  value: Theme;
  label: string;
};

const themeOptions: ReadonlyArray<ThemeOption> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore();

  return (
    <section aria-labelledby="theme-toggle-label">
      <h2
        id="theme-toggle-label"
        className="text-base font-semibold text-foreground"
      >
        Theme
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how the interface looks. Changes take effect immediately.
      </p>
      <div className="mt-4 flex gap-2" role="group" aria-label="Select theme">
        {themeOptions.map(({ value, label }) => (
          <Button
            key={value}
            variant={theme === value ? "primary" : "outline"}
            size="sm"
            onClick={() => setTheme(value)}
            aria-pressed={theme === value}
          >
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}
