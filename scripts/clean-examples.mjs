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
 *   README.md                     — replaced with a minimal stub (fill in real content for your project)
 *   package.json                  — "name" changed from "nextjs16-starter-template" to "your-project-name"
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
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Helpers ───────────────────────────────────────────────────────────────────

function info(msg) {
  process.stdout.write(msg + "\n");
}

/**
 * @typedef {"changed" | "already-clean" | "failed"} OperationStatus
 */

/**
 * @typedef {{status: OperationStatus, detail: string}} OperationResult
 */

/**
 * @param {string} relPath
 * @returns {Promise<OperationResult>}
 */
async function removeDir(relPath) {
  const abs = join(ROOT, relPath);
  if (existsSync(abs)) {
    await rm(abs, { recursive: true, force: true });
    return { status: "changed", detail: `Removed ${relPath}/` };
  }

  return { status: "already-clean", detail: `${relPath}/ not found` };
}

/**
 * @param {string} relPath
 * @returns {Promise<OperationResult>}
 */
async function removeFile(relPath) {
  const abs = join(ROOT, relPath);
  if (existsSync(abs)) {
    await unlink(abs);
    return { status: "changed", detail: `Removed ${relPath}` };
  }

  return { status: "already-clean", detail: `${relPath} not found` };
}

/**
 * @param {string} relPath
 * @param {string} content
 * @returns {Promise<OperationResult>}
 */
async function writeFileIfDifferent(relPath, content) {
  const abs = join(ROOT, relPath);
  const current = existsSync(abs) ? await readFile(abs, "utf-8") : null;

  if (current === content) {
    return { status: "already-clean", detail: `${relPath} already up to date` };
  }

  await writeFile(abs, content, "utf-8");
  return { status: "changed", detail: `Updated ${relPath}` };
}

/**
 * @param {string} relPath
 * @param {(input: string) => { output: string, changed: boolean }} transform
 * @returns {Promise<OperationResult>}
 */
async function patchFile(relPath, transform) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) {
    return { status: "already-clean", detail: `${relPath} not found` };
  }

  const current = await readFile(abs, "utf-8");
  const { output, changed } = transform(current);

  if (!changed) {
    return {
      status: "already-clean",
      detail: `${relPath} already matches cleaned state`,
    };
  }

  await writeFile(abs, output, "utf-8");
  return { status: "changed", detail: `Patched ${relPath}` };
}

/**
 * @param {OperationResult[]} results
 */
function printSummary(results) {
  for (const result of results) {
    if (result.status === "changed") {
      info(`  ✓ ${result.detail}`);
      continue;
    }

    if (result.status === "already-clean") {
      info(`  – ${result.detail}`);
      continue;
    }

    info(`  ✗ ${result.detail}`);
  }

  const changedCount = results.filter(
    (result) => result.status === "changed",
  ).length;
  const alreadyCleanCount = results.filter(
    (result) => result.status === "already-clean",
  ).length;
  const failedCount = results.filter(
    (result) => result.status === "failed",
  ).length;

  info("\nSummary:");
  info(`  Changed: ${changedCount}`);
  info(`  Already clean: ${alreadyCleanCount}`);
  info(`  Failed: ${failedCount}`);
}

/**
 * @returns {"keep-auth" | "no-auth"}
 */
function parseModeFromArgs() {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));

  if (!modeArg) {
    return "keep-auth";
  }

  const modeValue = modeArg.slice("--mode=".length);
  if (modeValue === "keep-auth") {
    return "keep-auth";
  }
  if (modeValue === "no-auth" || modeValue === "full-clean") {
    return "no-auth";
  }

  throw new Error(
    `Invalid mode '${modeValue}'. Use --mode=keep-auth, --mode=no-auth, or omit --mode (defaults to keep-auth; --mode=full-clean is a legacy alias for --mode=no-auth).`,
  );
}

/**
 * @returns {Promise<"keep-auth" | "no-auth">}
 */
async function resolveMode() {
  const explicitMode = process.argv.some((arg) => arg.startsWith("--mode="));
  if (explicitMode) {
    return parseModeFromArgs();
  }

  if (!process.stdin.isTTY) {
    return "keep-auth";
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await rl.question("Keep authentication scaffold? (y/N): "))
      .trim()
      .toLowerCase();

    if (answer === "y" || answer === "yes") {
      return "keep-auth";
    }

    return "no-auth";
  } finally {
    rl.close();
  }
}

// ── Minimal README stub ───────────────────────────────────────────────────────
// Real content should be generated by the /new-project prompt or written manually.

const MINIMAL_README = `# Your Project Name

> TODO: Replace this file with your project's README.

## Getting Started

\`\`\`bash
pnpm install   # also creates .env.local via postinstall
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).
`;

const MINIMAL_AGENTS = `# AGENTS.md

This repository is now a clean archetype scaffold.

## Local Workflow

1. Install dependencies: pnpm install
2. Start development server: pnpm dev
3. Before finishing work, run:
  - pnpm lint
  - pnpm type-check
  - pnpm test
  - pnpm build

## Project Notes

- Keep this file focused on project-specific decisions.
- Remove obsolete setup notes as your project evolves.
`;

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

const NO_AUTH_PROXY = [
  'import { NextResponse } from "next/server";',
  "",
  'const CSP_HEADER = "Content-Security-Policy";',
  "",
  "function buildCsp(nonce: string): string {",
  "  const self = \"'self'\";",
  "  return [",
  "    `default-src ${self}`,",
  "    `script-src ${self} 'nonce-${nonce}' 'sha256-PvQI9hLWSH+jZhaO+lhQHad1gRsx3/mgt3lOM7XygHE='`,",
  "    `style-src ${self} 'unsafe-inline'`,",
  "    `img-src ${self} blob: data:`,",
  "    `font-src ${self}`,",
  "    \"object-src 'none'\",",
  "    `base-uri ${self}`,",
  "    `form-action ${self}`,",
  "    \"frame-ancestors 'none'\",",
  "    \"worker-src 'none'\",",
  "    `manifest-src ${self}`,",
  '    "upgrade-insecure-requests",',
  '  ].join("; ");',
  "}",
  "",
  "export default function proxy(req: { headers: Headers }): NextResponse {",
  '  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");',
  "  const csp = buildCsp(nonce);",
  "",
  "  const requestHeaders = new Headers(req.headers);",
  '  requestHeaders.set("x-nonce", nonce);',
  "",
  "  const response = NextResponse.next({ request: { headers: requestHeaders } });",
  "  response.headers.set(CSP_HEADER, csp);",
  "  return response;",
  "}",
  "",
  "export const config = {",
  '  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],',
  "};",
  "",
].join("\n");

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

/**
 * @param {OperationResult[]} results
 * @returns {Promise<OperationResult[]>}
 */
async function applyNoAuthFullCleanup(results) {
  const targets = [
    "app/auth",
    "app/api/auth",
    "components/ui/google-icon.tsx",
    "components/ui/google-icon.test.tsx",
    "components/ui/form.tsx",
    "components/ui/form.test.tsx",
    "hooks/use-debounce.ts",
    "hooks/use-debounce.test.ts",
    "tests/auth.spec.ts",
    "tests/sign-in.spec.ts",
    "tests/auth.setup.ts",
    "auth.ts",
    "lib/auth.ts",
    "lib/auth.test.ts",
    "scripts/restore-ai-config.mjs",
    "scripts/strip-ai-config.mjs",
    "scripts/verify-skills.mjs",
  ];

  let nextResults = results;
  for (const relPath of targets) {
    if (
      relPath.endsWith(".ts") ||
      relPath.endsWith(".tsx") ||
      relPath.endsWith(".mjs")
    ) {
      nextResults = nextResults.concat([await removeFile(relPath)]);
      continue;
    }

    nextResults = nextResults.concat([await removeDir(relPath)]);
  }

  return nextResults;
}

/**
 * @param {boolean} removeAuth
 * @returns {Promise<OperationResult>}
 */
async function updatePackageForCleanup(removeAuth) {
  const pkgPath = join(ROOT, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  let pkgChanged = false;

  if (pkg.name === "nextjs16-starter-template") {
    pkg.name = "your-project-name";
    pkgChanged = true;
  }

  if (removeAuth) {
    for (const scriptKey of [
      "strip:ai",
      "restore:ai",
      "skills:verify",
      "skills:update",
      "clean:examples:full",
      "test:e2e",
      "test:e2e:ui",
      "test:e2e:headed",
    ]) {
      if (pkg.scripts?.[scriptKey]) {
        delete pkg.scripts[scriptKey];
        pkgChanged = true;
      }
    }

    for (const dependencyKey of [
      "next-auth",
      "react-hook-form",
      "@hookform/resolvers",
    ]) {
      if (pkg.dependencies?.[dependencyKey]) {
        delete pkg.dependencies[dependencyKey];
        pkgChanged = true;
      }
    }
  }

  if (!pkgChanged) {
    return {
      status: "already-clean",
      detail: "package.json cleanup already applied",
    };
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  return { status: "changed", detail: "Patched package.json cleanup fields" };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const mode = await resolveMode();
  const removeAuth = mode === "no-auth";
  /** @type {OperationResult[]} */
  let results = [];

  info("\n🧹  Cleaning example files from the template…\n");
  info(`Mode: ${mode}\n`);

  // Example route directories (each includes co-located tests)
  results = results.concat([
    await removeDir("app/dashboard"),
    await removeDir("app/profile"),
    await removeDir("app/settings"),
  ]);

  // Example library file and its test
  results = results.concat([
    await removeFile("lib/stats.ts"),
    await removeFile("lib/stats.test.ts"),
  ]);

  // Replace the example home page with a blank starter
  results = results.concat([
    await writeFileIfDifferent("app/page.tsx", MINIMAL_HOME_PAGE),
  ]);

  // Delete the test that was coupled to the example home page
  results = results.concat([await removeFile("app/page.test.tsx")]);

  // Remove E2E tests for example routes (including authenticated multi-route spec)
  results = results.concat([
    await removeFile("tests/dashboard.spec.ts"),
    await removeFile("tests/home.spec.ts"),
    await removeFile("tests/profile.spec.ts"),
    await removeFile("tests/settings.spec.ts"),
    await removeFile("tests/authenticated.spec.ts"),
  ]);

  // Rewrite the Zustand store — strip example-only sidebarOpen state
  results = results.concat([
    await writeFileIfDifferent("store/use-app-store.ts", CLEAN_APP_STORE),
    await writeFileIfDifferent(
      "store/use-app-store.test.ts",
      CLEAN_APP_STORE_TEST,
    ),
  ]);

  if (removeAuth) {
    results = results.concat([
      await writeFileIfDifferent("proxy.ts", NO_AUTH_PROXY),
    ]);
  } else {
    results = results.concat([
      await patchFile("proxy.ts", (input) => {
        let output = input;
        let changed = false;

        const protectedRoutePattern =
          /const isProtectedRoute =\s*\n\s*nextUrl\.pathname\.startsWith\("\/dashboard"\)\s*\|\|\s*\n\s*nextUrl\.pathname\.startsWith\("\/settings"\)\s*\|\|\s*\n\s*nextUrl\.pathname\.startsWith\("\/profile"\);/;

        if (protectedRoutePattern.test(output)) {
          output = output.replace(
            protectedRoutePattern,
            [
              "const isProtectedRoute = false;",
              "",
              "  // TODO: Replace this placeholder with your real protected route rules.",
            ].join("\n  "),
          );
          changed = true;
        }

        if (output.includes('new URL("/dashboard", nextUrl)')) {
          output = output.replace(
            'new URL("/dashboard", nextUrl)',
            'new URL("/", nextUrl)',
          );
          changed = true;
        }

        return { output, changed };
      }),
    ]);
  }

  // Patch lib/constants.ts — remove example-only ROUTES entries
  results = results.concat([
    await patchFile("lib/constants.ts", (input) => {
      let output = input;
      let changed = false;

      for (const routeKey of ["dashboard", "settings", "profile"]) {
        const routeLine = `  ${routeKey}: "/${routeKey}",\n`;
        if (output.includes(routeLine)) {
          output = output.replace(routeLine, "");
          changed = true;
        }
      }

      return { output, changed };
    }),
  ]);

  // Rewrite lib/schemas/user.schema.ts — remove profile-only schemas and types
  results = results.concat([
    await writeFileIfDifferent("lib/schemas/user.schema.ts", CLEAN_USER_SCHEMA),
    await writeFileIfDifferent(
      "lib/schemas/user.schema.test.ts",
      CLEAN_USER_SCHEMA_TEST,
    ),
  ]);

  // Patch app/setup.test.ts — remove ROUTES.dashboard assertion (no longer exported)
  results = results.concat([
    await patchFile("app/setup.test.ts", (input) => {
      const oldLine = `    expect(ROUTES.dashboard).toMatch(/^\\//);\n`;
      if (!input.includes(oldLine)) {
        return { output: input, changed: false };
      }

      return { output: input.replace(oldLine, ""), changed: true };
    }),
  ]);

  // Patch lib/utils.ts — sanitizeReturnTo fallback must use ROUTES.home after
  // ROUTES.dashboard is removed from lib/constants.ts
  results = results.concat([
    await patchFile("lib/utils.ts", (input) => {
      let output = input;
      let changed = false;

      const oldFallback =
        `  if (!url || !url.startsWith("/") || url.startsWith("//")) {\n` +
        `    return ROUTES.dashboard;\n`;
      const newFallback =
        `  if (!url || !url.startsWith("/") || url.startsWith("//")) {\n` +
        `    return ROUTES.home;\n`;

      if (output.includes(oldFallback)) {
        output = output.replace(oldFallback, newFallback);
        changed = true;
      }

      const oldJsdoc = " * Returns the dashboard route as the safe fallback.";
      const newJsdoc = " * Returns the home route as the safe fallback.";
      if (output.includes(oldJsdoc)) {
        output = output.replace(oldJsdoc, newJsdoc);
        changed = true;
      }

      return { output, changed };
    }),
  ]);

  // Patch lib/utils.test.ts — update sanitizeReturnTo fallback assertions to ROUTES.home
  results = results.concat([
    await patchFile("lib/utils.test.ts", (input) => {
      let output = input;
      let changed = false;

      if (output.includes("/dashboard")) {
        output = output.replaceAll("/dashboard", "/");
        output = output.replaceAll("dashboard route", "home route");
        changed = true;
      }

      return { output, changed };
    }),
  ]);

  if (removeAuth) {
    results = await applyNoAuthFullCleanup(results);
  }

  // Replace README.md with a minimal stub
  results = results.concat([
    await writeFileIfDifferent("README.md", MINIMAL_README),
  ]);

  if (removeAuth) {
    results = results.concat([
      await writeFileIfDifferent("AGENTS.md", MINIMAL_AGENTS),
    ]);
  }

  results = results.concat([await updatePackageForCleanup(removeAuth)]);

  printSummary(results);

  info("\n✅  Done! Example cleanup complete.\n");

  info("Next steps:");
  info(
    "  1. Update lib/constants.ts   →  APP_NAME, APP_DESCRIPTION, APP_VERSION",
  );
  info(
    '  2. Update package.json       →  set real "name", "description", "repository", "author"',
  );
  info("  3. Edit app/page.tsx         →  Build your real home page");
  info(
    "  4. Update README.md          →  Replace the stub with your project's content",
  );
  info(
    "  5. Update app/icon.tsx       →  Replace the placeholder favicon letter",
  );
  info("  6. Run full cleanup without auth:");
  info("     pnpm clean:examples:full");
  if (removeAuth) {
    info(
      "  7. Review AGENTS.md        →  keep only conventions relevant to your project",
    );
  }

  info("");
}

try {
  await main();
} catch (error) {
  console.error("\n❌  Error:", error.message);
  process.exit(1);
}
