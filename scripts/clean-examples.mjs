#!/usr/bin/env node
/**
 * clean-examples.mjs
 *
 * Removes all @template-example files and directories from this Next.js
 * starter template. Run once when bootstrapping a new project.
 *
 * What gets removed / rewritten:
 *   app/dashboard/           — fake stats + search + Suspense demo
 *   app/profile/             — react-hook-form + Server Action demo
 *   app/settings/            — Zustand theme toggle demo
 *   lib/stats.ts             — fake dashboard data (used only by app/dashboard/)
 *   lib/stats.test.ts
 *   app/page.tsx             — replaced with a minimal blank starter
 *   app/page.test.tsx        — tested the example home page, no longer valid
 *   tests/dashboard.spec.ts  — E2E for app/dashboard/
 *   tests/home.spec.ts       — E2E for app/page.tsx (home replaced with blank starter)
 *   tests/profile.spec.ts    — E2E for app/profile/
 *   tests/settings.spec.ts   — E2E for app/settings/
 *   store/use-app-store.ts   — sidebarOpen state stripped (settings-only); theme kept
 *   store/use-app-store.test.ts — sidebarOpen tests stripped
 *
 * What is left untouched (requires a manual decision):
 *   app/auth/                 — keep if using authentication; delete if not
 *   tests/auth.spec.ts        — E2E for auth routes; delete with app/auth/ if not using auth
 *   tests/sign-in.spec.ts     — E2E for sign-in page; delete with app/auth/ if not using auth
 *   lib/schemas/user.schema.ts — userSchema/updateUserSchema become unused exports
 *                               after profile is deleted; run `pnpm knip` to find them
 *
 * Usage:
 *   pnpm clean:examples
 */

import { rm, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Helpers ───────────────────────────────────────────────────────────────────

function info(msg) {
  process.stdout.write(msg + "\n");
}

async function removeDir(relPath) {
  const abs = join(ROOT, relPath);
  if (existsSync(abs)) {
    await rm(abs, { recursive: true, force: true });
    info(`  ✓ Removed  ${relPath}/`);
  } else {
    info(`  – Skipped  ${relPath}/ (not found)`);
  }
}

async function removeFile(relPath) {
  const abs = join(ROOT, relPath);
  if (existsSync(abs)) {
    await unlink(abs);
    info(`  ✓ Removed  ${relPath}`);
  } else {
    info(`  – Skipped  ${relPath} (not found)`);
  }
}

// ── Minimal home page stub ────────────────────────────────────────────────────

const MINIMAL_HOME_PAGE = `export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <h1 className="text-4xl font-bold">Hello World</h1>
    </main>
  );
}
`;

// ── Scaffold store — sidebar state removed, theme preserved ──────────────────
// sidebarOpen / toggleSidebar / setSidebarOpen were only used by app/settings/
// (the Zustand theme-toggle example). theme + setTheme are kept because
// ThemeProvider (components/theme-provider.tsx) reads `theme` from this store.

const CLEAN_APP_STORE = `import type { Theme } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppState = {
  // UI State
  theme: Theme;

  // Actions
  setTheme: (theme: Theme) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      theme: "system",

      // Actions
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "app-store", // localStorage key
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
`;

// ── Scaffold store test — sidebar tests removed ───────────────────────────────

const CLEAN_APP_STORE_TEST = `import { useAppStore } from "@/store/use-app-store";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("useAppStore", () => {
  beforeEach(() => {
    // Clear persisted state to prevent cross-test hydration
    localStorage.clear();
    act(() => {
      useAppStore.setState({ theme: "system" });
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("theme", () => {
    it("should have 'system' as the initial theme", () => {
      const { result } = renderHook(() => useAppStore((state) => state.theme));
      expect(result.current).toBe("system");
    });

    it("should update theme when setTheme is called with 'dark'", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
    });

    it("should update theme when setTheme is called with 'light'", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
    });
  });
});
`;

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  info("\n🧹  Cleaning example files from the template…\n");

  // Example route directories (each includes co-located tests)
  await removeDir("app/dashboard");
  await removeDir("app/profile");
  await removeDir("app/settings");

  // Example library file and its test
  await removeFile("lib/stats.ts");
  await removeFile("lib/stats.test.ts");

  // Replace the example home page with a blank starter
  await writeFile(join(ROOT, "app/page.tsx"), MINIMAL_HOME_PAGE, "utf-8");
  info("  ✓ Replaced app/page.tsx →  minimal blank starter");

  // Delete the test that was coupled to the example home page
  await removeFile("app/page.test.tsx");

  // Remove E2E tests for example routes
  await removeFile("tests/dashboard.spec.ts");
  await removeFile("tests/home.spec.ts");
  await removeFile("tests/profile.spec.ts");
  await removeFile("tests/settings.spec.ts");

  // Rewrite the Zustand store — strip example-only sidebarOpen state
  await writeFile(join(ROOT, "store/use-app-store.ts"), CLEAN_APP_STORE, "utf-8");
  info("  ✓ Rewrote store/use-app-store.ts →  sidebar state removed");

  await writeFile(join(ROOT, "store/use-app-store.test.ts"), CLEAN_APP_STORE_TEST, "utf-8");
  info("  ✓ Rewrote store/use-app-store.test.ts →  sidebar tests removed");

  info("\n✅  Done! Example pages removed.\n");

  info(
    "⚠️   Orphaned exports remain in lib/schemas/user.schema.ts:\n" +
    "    userSchema, createUserSchema, updateUserSchema (only used by app/profile/).\n" +
    "    Run `pnpm knip` to locate and remove them.\n",
  );

  info("Next steps:");
  info(
    "  1. Update lib/constants.ts   →  APP_NAME, APP_DESCRIPTION, APP_VERSION",
  );
  info("  2. Edit app/page.tsx         →  Build your real home page");
  info(
    "  3. Update app/icon.tsx       →  Replace the placeholder favicon letter",
  );
  info(
    "  4. Run pnpm knip             →  Find and remove orphaned schema exports",
  );
  info(
    "  5. No auth needed?           →  Delete app/auth/ + components/ui/google-icon.tsx",
  );
  info("                                 + tests/auth.spec.ts + tests/sign-in.spec.ts");
  info("     and simplify proxy.ts:");
  info("     export default function () {}");
  info("     export const config = { matcher: [] };");
  info(
    "\n📖  See AGENTS.md § 'Starting a New Project from This Template' for the full guide.\n",
  );
}

main().catch((error) => {
  console.error("\n❌  Error:", error.message);
  process.exit(1);
});
