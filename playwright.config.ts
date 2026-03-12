import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // 1 retry in CI handles genuine flakiness without tripling runtime on real failures.
  retries: process.env.CI ? 1 : 0,
  // 2 parallel workers keeps CI fast without overwhelming shared runners.
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html"], process.env.CI ? ["github"] : ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Chromium always runs — in CI this is the only browser to keep the suite fast.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Additional browsers run locally only — cross-browser coverage for development.
    ...(process.env.CI
      ? []
      : [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
          {
            name: "Mobile Chrome",
            use: { ...devices["Pixel 5"] },
          },
        ]),
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Auth.js requires AUTH_SECRET and a trusted host.
      // These values are only used for E2E testing — not production secrets.
      AUTH_SECRET:
        process.env.AUTH_SECRET ?? "e2e-test-secret-not-for-production",
      AUTH_TRUST_HOST: "true",
      // SKIP_ENV_VALIDATION bypasses .default() in @t3-oss/env-nextjs, so the
      // public URL must be supplied explicitly to prevent `new URL(undefined)`.
      SKIP_ENV_VALIDATION: "true",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? BASE_URL,
    },
  },
});
