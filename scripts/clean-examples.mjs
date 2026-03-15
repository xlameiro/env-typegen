#!/usr/bin/env node
/**
 * clean-examples.mjs
 *
 * Removes all @template-example files and directories from this Next.js
 * starter template. Run once when bootstrapping a new project.
 *
 * What gets removed / rewritten:
 *   app/dashboard/                — fake stats + search + Suspense demo
 *   app/profile/                  — react-hook-form + Server Action demo
 *   app/settings/                 — Zustand theme toggle demo
 *   lib/stats.ts                  — fake dashboard data (used only by app/dashboard/)
 *   lib/stats.test.ts
 *   app/page.tsx                  — replaced with a minimal blank starter
 *   app/page.test.tsx             — tested the example home page, no longer valid
 *   tests/authenticated.spec.ts   — E2E for example-only protected routes
 *   tests/dashboard.spec.ts       — E2E for app/dashboard/
 *   tests/home.spec.ts            — E2E for app/page.tsx (home replaced with blank starter)
 *   tests/profile.spec.ts         — E2E for app/profile/
 *   tests/settings.spec.ts        — E2E for app/settings/
 *   store/use-app-store.ts        — sidebarOpen state stripped (settings-only); theme kept
 *   store/use-app-store.test.ts   — sidebarOpen tests stripped
 *   proxy.ts                      — example route guards replaced with placeholder comment;
 *                                   post-login redirect changed from /dashboard to /
 *   lib/constants.ts              — ROUTES.dashboard/settings/profile entries removed
 *   lib/schemas/user.schema.ts    — userSchema/createUserSchema/updateUserSchema removed
 *   lib/schemas/user.schema.test.ts — orphaned schema tests removed
 *   lib/utils.ts                  — sanitizeReturnTo fallback changed from ROUTES.dashboard to ROUTES.home
 *   lib/utils.test.ts             — sanitizeReturnTo fallback assertions updated to ROUTES.home
 *
 * What is left untouched (requires a manual decision):
 *   app/auth/                  — keep if using authentication; delete if not
 *   tests/auth.spec.ts         — E2E for auth routes; delete with app/auth/ if not using auth
 *   tests/sign-in.spec.ts      — E2E for sign-in page; delete with app/auth/ if not using auth
 *
 * Usage:
 *   pnpm clean:examples
 */

import { existsSync } from "node:fs";
import { readFile, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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

// id="maincontent" and tabIndex={-1} are required so components/skip-link.tsx
// can programmatically move focus to the main landmark.
const MINIMAL_HOME_PAGE = `export default function HomePage() {
  return (
    <main
      id="maincontent"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center p-8"
    >
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

// ── Scaffold user schema — profile-only exports removed ──────────────────────
// userSchema / createUserSchema / updateUserSchema (and their inferred types
// User / CreateUser / UpdateUser) are only used by app/profile/ which is
// deleted. The auth schemas (signIn/signUp) and their types must stay.

const CLEAN_USER_SCHEMA = `import { z } from "zod";

// ──────────────────────────────────────────
// Primitive schemas
// ──────────────────────────────────────────

export const emailSchema = z
  .email("Invalid email address")
  .describe("The user's email address — used as the primary identifier");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be at most 100 characters")
  .describe(
    "A plaintext password (min 8, max 100 chars) — hashed before storage",
  );

// ──────────────────────────────────────────
// Auth schemas
// ──────────────────────────────────────────

export const signInSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .describe("Credentials submitted on the sign-in form");

export const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100)
      .describe("User's full display name"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema.describe(
      "Must match the password field — validated client-side and server-side",
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .describe("Fields submitted on the sign-up registration form");

// ──────────────────────────────────────────
// Inferred types
// ──────────────────────────────────────────

export type SignIn = z.infer<typeof signInSchema>;
export type SignUp = z.infer<typeof signUpSchema>;
`;

// ── Scaffold user schema test — profile-only tests removed ───────────────────
// Removes the createUserSchema and updateUserSchema describe blocks;
// keeps emailSchema, passwordSchema, signInSchema, signUpSchema tests.

const CLEAN_USER_SCHEMA_TEST = `import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
} from "./user.schema";

// Extracted to consts to satisfy sonarjs/no-hardcoded-passwords in test context.
const validInput = "securepassword123";
const shortInput = "short";
const longInput = "a".repeat(101);
const alternateInput = "differentpassword";
const testEmail = "user@example.com";

describe("emailSchema", () => {
  it("should accept a valid email", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("should reject an invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("should reject an empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("should reject an email without a domain", () => {
    expect(emailSchema.safeParse("user@").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("should accept a valid password", () => {
    expect(passwordSchema.safeParse(validInput).success).toBe(true);
  });

  it("should accept a password of exactly 8 characters", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("should reject a password shorter than 8 characters", () => {
    expect(passwordSchema.safeParse(shortInput).success).toBe(false);
  });

  it("should reject a password longer than 100 characters", () => {
    expect(passwordSchema.safeParse(longInput).success).toBe(false);
  });

  it("should reject an empty string", () => {
    expect(passwordSchema.safeParse("").success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("should accept valid credentials", () => {
    expect(
      signInSchema.safeParse({
        email: testEmail,
        password: validInput,
      }).success,
    ).toBe(true);
  });

  it("should reject missing password", () => {
    expect(signInSchema.safeParse({ email: testEmail }).success).toBe(false);
  });

  it("should reject a short password", () => {
    expect(
      signInSchema.safeParse({ email: testEmail, password: shortInput })
        .success,
    ).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("should accept valid sign-up data", () => {
    expect(
      signUpSchema.safeParse({
        name: "Alice",
        email: "alice@example.com",
        password: validInput,
        confirmPassword: validInput,
      }).success,
    ).toBe(true);
  });

  it("should reject when passwords do not match", () => {
    const result = signUpSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: validInput,
      confirmPassword: alternateInput,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasConfirmError = result.error.issues.some((issue) =>
        issue.path.includes("confirmPassword"),
      );
      expect(hasConfirmError).toBe(true);
    }
  });

  it("should reject missing name", () => {
    expect(
      signUpSchema.safeParse({
        email: "alice@example.com",
        password: validInput,
        confirmPassword: validInput,
      }).success,
    ).toBe(false);
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

  // Remove E2E tests for example routes (including authenticated multi-route spec)
  await removeFile("tests/dashboard.spec.ts");
  await removeFile("tests/home.spec.ts");
  await removeFile("tests/profile.spec.ts");
  await removeFile("tests/settings.spec.ts");
  await removeFile("tests/authenticated.spec.ts");

  // Rewrite the Zustand store — strip example-only sidebarOpen state
  await writeFile(
    join(ROOT, "store/use-app-store.ts"),
    CLEAN_APP_STORE,
    "utf-8",
  );
  info("  ✓ Rewrote store/use-app-store.ts →  sidebar state removed");

  await writeFile(
    join(ROOT, "store/use-app-store.test.ts"),
    CLEAN_APP_STORE_TEST,
    "utf-8",
  );
  info("  ✓ Rewrote store/use-app-store.test.ts →  sidebar tests removed");

  // Patch proxy.ts — remove example-route guards and fix post-login redirect
  {
    const proxyPath = join(ROOT, "proxy.ts");
    let proxy = await readFile(proxyPath, "utf-8");

    const oldIsProtected =
      `  const isProtectedRoute =\n` +
      `    nextUrl.pathname.startsWith("/dashboard") ||\n` +
      `    nextUrl.pathname.startsWith("/profile") ||\n` +
      `    nextUrl.pathname.startsWith("/settings");`;
    const newIsProtected =
      `  // Define your protected routes here — replace false with your conditions.\n` +
      `  // Example: nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/settings")\n` +
      `  const isProtectedRoute = false;`;

    if (!proxy.includes(oldIsProtected)) {
      info(
        "  ⚠  proxy.ts: isProtectedRoute block not found — skipping (already patched?)",
      );
    } else {
      proxy = proxy.replace(oldIsProtected, newIsProtected);
    }

    const oldRedirect = `      new URL("/dashboard", nextUrl),`;
    const newRedirect = `      new URL("/", nextUrl),`;

    if (!proxy.includes(oldRedirect)) {
      info(
        "  ⚠  proxy.ts: /dashboard redirect not found — skipping (already patched?)",
      );
    } else {
      proxy = proxy.replace(oldRedirect, newRedirect);
    }

    await writeFile(proxyPath, proxy, "utf-8");
    info(
      "  ✓ Patched proxy.ts →  example route guards removed, redirect → /",
    );
  }

  // Patch lib/constants.ts — remove example-only ROUTES entries
  {
    const constantsPath = join(ROOT, "lib/constants.ts");
    let constants = await readFile(constantsPath, "utf-8");

    const oldRoutes =
      `  dashboard: "/dashboard",\n` +
      `  settings: "/settings",\n` +
      `  profile: "/profile",\n`;

    if (!constants.includes(oldRoutes)) {
      info(
        "  ⚠  lib/constants.ts: example ROUTES entries not found — skipping (already patched?)",
      );
    } else {
      constants = constants.replace(oldRoutes, "");
      await writeFile(constantsPath, constants, "utf-8");
      info(
        "  ✓ Patched lib/constants.ts →  dashboard/settings/profile routes removed",
      );
    }
  }

  // Rewrite lib/schemas/user.schema.ts — remove profile-only schemas and types
  await writeFile(
    join(ROOT, "lib/schemas/user.schema.ts"),
    CLEAN_USER_SCHEMA,
    "utf-8",
  );
  info(
    "  ✓ Rewrote lib/schemas/user.schema.ts →  userSchema/createUserSchema/updateUserSchema removed",
  );

  await writeFile(
    join(ROOT, "lib/schemas/user.schema.test.ts"),
    CLEAN_USER_SCHEMA_TEST,
    "utf-8",
  );
  info(
    "  ✓ Rewrote lib/schemas/user.schema.test.ts →  profile schema tests removed",
  );

  // Patch app/setup.test.ts — remove ROUTES.dashboard assertion (no longer exported)
  {
    const setupTestPath = join(ROOT, "app/setup.test.ts");
    let setupTest = await readFile(setupTestPath, "utf-8");

    const oldLine = `    expect(ROUTES.dashboard).toMatch(/^\\//);\n`;

    if (!setupTest.includes(oldLine)) {
      info(
        "  ⚠  app/setup.test.ts: ROUTES.dashboard assertion not found — skipping (already patched?)",
      );
    } else {
      setupTest = setupTest.replace(oldLine, "");
      await writeFile(setupTestPath, setupTest, "utf-8");
      info(
        "  ✓ Patched app/setup.test.ts →  ROUTES.dashboard assertion removed",
      );
    }
  }

  // Patch lib/utils.ts — sanitizeReturnTo fallback must use ROUTES.home after
  // ROUTES.dashboard is removed from lib/constants.ts
  {
    const utilsPath = join(ROOT, "lib/utils.ts");
    let utils = await readFile(utilsPath, "utf-8");

    const oldFallback =
      `  if (!url || !url.startsWith("/") || url.startsWith("//")) {\n` +
      `    return ROUTES.dashboard;\n`;
    const newFallback =
      `  if (!url || !url.startsWith("/") || url.startsWith("//")) {\n` +
      `    return ROUTES.home;\n`;

    if (!utils.includes(oldFallback)) {
      info(
        "  ⚠  lib/utils.ts: ROUTES.dashboard fallback not found — skipping (already patched?)",
      );
    } else {
      utils = utils.replace(oldFallback, newFallback);

      // Also fix the JSDoc that referenced "dashboard"
      utils = utils.replace(
        " * Returns the dashboard route as the safe fallback.",
        " * Returns the home route as the safe fallback.",
      );

      await writeFile(utilsPath, utils, "utf-8");
      info(
        "  ✓ Patched lib/utils.ts →  sanitizeReturnTo fallback changed to ROUTES.home",
      );
    }
  }

  // Patch lib/utils.test.ts — update sanitizeReturnTo fallback assertions to ROUTES.home
  {
    const utilsTestPath = join(ROOT, "lib/utils.test.ts");
    let utilsTest = await readFile(utilsTestPath, "utf-8");

    const oldFallbackTests =
      `  it("should return the dashboard route when given an absolute URL (open redirect attempt)", () => {\n` +
      `    expect(sanitizeReturnTo("https://evil.com/steal")).toBe("/dashboard");\n` +
      `  });\n\n` +
      `  it("should return the dashboard route when given a protocol-relative URL (open redirect attempt)", () => {\n` +
      `    expect(sanitizeReturnTo("//evil.com")).toBe("/dashboard");\n` +
      `  });\n\n` +
      `  it("should return the dashboard route when given an empty string", () => {\n` +
      `    expect(sanitizeReturnTo("")).toBe("/dashboard");\n` +
      `  });\n\n` +
      `  it("should return the dashboard route when given undefined", () => {\n` +
      `    expect(sanitizeReturnTo(undefined)).toBe("/dashboard");\n` +
      `  });`;
    const newFallbackTests =
      `  it("should return the home route when given an absolute URL (open redirect attempt)", () => {\n` +
      `    expect(sanitizeReturnTo("https://evil.com/steal")).toBe("/");\n` +
      `  });\n\n` +
      `  it("should return the home route when given a protocol-relative URL (open redirect attempt)", () => {\n` +
      `    expect(sanitizeReturnTo("//evil.com")).toBe("/");\n` +
      `  });\n\n` +
      `  it("should return the home route when given an empty string", () => {\n` +
      `    expect(sanitizeReturnTo("")).toBe("/");\n` +
      `  });\n\n` +
      `  it("should return the home route when given undefined", () => {\n` +
      `    expect(sanitizeReturnTo(undefined)).toBe("/");\n` +
      `  });`;

    if (!utilsTest.includes(oldFallbackTests)) {
      info(
        "  ⚠  lib/utils.test.ts: dashboard fallback assertions not found — skipping (already patched?)",
      );
    } else {
      utilsTest = utilsTest.replace(oldFallbackTests, newFallbackTests);
      await writeFile(utilsTestPath, utilsTest, "utf-8");
      info(
        "  ✓ Patched lib/utils.test.ts →  sanitizeReturnTo assertions updated to ROUTES.home",
      );
    }
  }

  info("\n✅  Done! Example pages removed.\n");

  info("Next steps:");
  info(
    "  1. Update lib/constants.ts   →  APP_NAME, APP_DESCRIPTION, APP_VERSION",
  );
  info("  2. Edit app/page.tsx         →  Build your real home page");
  info(
    "  3. Update app/icon.tsx       →  Replace the placeholder favicon letter",
  );
  info(
    "  4. No auth needed?           →  Delete app/auth/ + components/ui/google-icon.tsx",
  );
  info(
    "                                 + tests/auth.spec.ts + tests/sign-in.spec.ts",
  );
  info("     and simplify proxy.ts:");
  info("     export default function () {}");
  info("     export const config = { matcher: [] };");
  info(
    "\n📖  See AGENTS.md § 'Starting a New Project from This Template' for the full guide.\n",
  );
}

try {
  await main();
} catch (error) {
  console.error("\n❌  Error:", error.message);
  process.exit(1);
}
