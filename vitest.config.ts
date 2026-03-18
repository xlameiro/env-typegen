import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      ".agents",
      ".next",
      "e2e",
      "tests",
      // Workspace packages have their own vitest configs — exclude from root runner
      "packages/**",
    ],
    setupFiles: ["./vitest.setup.ts"],
    typecheck: {
      enabled: true,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // app/** pages/layouts/routes are Next.js integration concerns — they render
      // correctly only in a real HTTP context and are covered by Playwright E2E.
      // hooks/ is empty. Coverage tracks only pure-logic modules.
      include: ["components/**", "lib/**", "store/**"],
      exclude: [
        "**/*.test.*",
        "**/*.spec.*",
        "**/*.d.ts",
        // Fumadocs source loader — server-only boot config, no testable logic.
        "lib/source.ts",
        // Pure-markup presentational components — no branching logic to assert.
        "components/marketing-footer.tsx",
        "components/site-footer.tsx",
        // Theme toggle — rich interactive UI component; covered by Playwright E2E
        // (click light/dark/system and assert html.dark class toggles).
        "components/theme-toggle.tsx",
      ],
      thresholds: { lines: 80, branches: 75, functions: 80, statements: 80 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
