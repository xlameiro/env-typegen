import path from "node:path";
import { test as setup } from "@playwright/test";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

/**
 * Authentication setup fixture — runs ONCE before all authenticated tests.
 *
 * Creates `playwright/.auth/user.json` with an authenticated browser session
 * that all tests in the `authenticated` project can reuse without re-logging in.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SETUP REQUIRED TO RUN AUTHENTICATED TESTS
 * ─────────────────────────────────────────────────────────────────────────────
 * This template uses Google OAuth by default. To run authenticated E2E tests:
 *
 * 1. Add test credentials to .env.local:
 *      TEST_USER_EMAIL=your-test@example.com
 *      TEST_USER_PASSWORD=your-password
 *
 * 2. Implement the sign-in flow below using your provider's login UI.
 *    See: https://playwright.dev/docs/auth
 *
 * 3. Run setup once to create the storage state file:
 *      pnpm exec playwright test --project=setup
 *
 * 4. Then run authenticated tests:
 *      pnpm exec playwright test --project=chromium-authenticated
 *
 * Note: playwright/.auth/user.json is gitignored — never commit it.
 *       In CI, generate it via a pre-test step or store it as an encrypted secret.
 * ─────────────────────────────────────────────────────────────────────────────
 */
setup("authenticate as test user", async ({ page }) => {
  // Replace this block with your authentication flow.
  //
  // Example for a credentials-based sign-in form:
  //   await page.goto("/auth/sign-in");
  //   await page.getByLabel("Email").fill(process.env.TEST_USER_EMAIL ?? "");
  //   await page.getByLabel("Password").fill(process.env.TEST_USER_PASSWORD ?? "");
  //   await page.getByRole("button", { name: /sign in/i }).click();
  //   await expect(page).toHaveURL("/dashboard");
  //
  // For Google OAuth, see:
  //   https://playwright.dev/docs/auth#authenticate-with-oauth

  // Save the authenticated session for reuse across tests.
  // This file is loaded by the `chromium-authenticated` project via `storageState`.
  await page.context().storageState({ path: authFile });
});
