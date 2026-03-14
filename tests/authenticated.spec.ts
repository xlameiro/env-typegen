import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Authenticated E2E tests — require a valid session in playwright/.auth/user.json.
 *
 * To generate the auth state, run the setup fixture first:
 *   pnpm exec playwright test --project=setup
 *
 * Then run these tests:
 *   pnpm exec playwright test --project=chromium-authenticated
 *
 * Tests are skipped automatically when no auth state file exists.
 */

const authStateFile = path.join(__dirname, "../playwright/.auth/user.json");
const hasAuthState = existsSync(authStateFile);
const skipMessage =
  "Auth state not available — run `pnpm exec playwright test --project=setup` first";

test.describe("Authenticated — Dashboard", () => {
  test("should display dashboard content when signed in", async ({ page }) => {
    test.skip(!hasAuthState, skipMessage);

    await page.goto("/dashboard");

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("Authenticated — Profile", () => {
  test("should display profile form when signed in", async ({ page }) => {
    test.skip(!hasAuthState, skipMessage);

    await page.goto("/profile");

    await expect(page).toHaveURL("/profile");
    await expect(page.getByRole("heading", { name: /profile/i })).toBeVisible();
  });
});

test.describe("Authenticated — Settings", () => {
  test("should display settings page when signed in", async ({ page }) => {
    test.skip(!hasAuthState, skipMessage);

    await page.goto("/settings");

    await expect(page).toHaveURL("/settings");
    await expect(
      page.getByRole("heading", { name: /settings/i }),
    ).toBeVisible();
  });
});

test.describe("Authenticated — Sign out", () => {
  test("should redirect to sign-in page after signing out", async ({
    page,
  }) => {
    test.skip(!hasAuthState, skipMessage);

    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");

    // Trigger sign-out (adjust selector to match your sign-out button)
    const signOutButton = page.getByRole("button", { name: /sign out/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await expect(page).toHaveURL(/\/auth\/sign-in/);
    }
  });
});
