import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "app/**/{page,layout,loading,error,not-found,global-error,icon,template,default,route}.{ts,tsx}",
    "app/api/**/*.{ts,tsx}",
    "lib/env.ts",
    "auth.ts",
    "proxy.ts",
    "next.config.ts",
    "vitest.config.ts",
    "vitest.setup.ts",
    "playwright.config.ts",
    "commitlint.config.ts",
    "lint-staged.config.ts",
    "postcss.config.mjs",
  ],
  project: [
    "app/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "types/**/*.{ts,tsx}",
  ],
  ignore: [
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    "**/*.test-d.{ts,tsx}",
    ".github/**",
    ".agents/**",
    "tests/**",
  ],
  ignoreDependencies: [
    // Peer dependencies loaded at runtime by Next.js
    "sharp",
  ],
};

export default config;
