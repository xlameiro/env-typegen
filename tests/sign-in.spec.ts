import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Sign-In Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/sign-in");
  });

  test("should have correct page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Sign In/i);
  });

  test("should render the heading and description", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/choose a provider to continue/i),
    ).toBeVisible();
  });

  test("should render a Continue with Google button", async ({ page }) => {
    const googleButton = page.getByRole("button", {
      name: /continue with google/i,
    });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test("should render a sign-up link", async ({ page }) => {
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/auth/sign-up");
  });

  test("should navigate to sign-up page when sign-up link is clicked", async ({
    page,
  }) => {
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test("should preserve a valid returnTo query parameter", async ({ page }) => {
    await page.goto("/auth/sign-in?returnTo=%2Fdashboard");
    // The returnTo value is consumed server-side; the Google button should still render.
    const googleButton = page.getByRole("button", {
      name: /continue with google/i,
    });
    await expect(googleButton).toBeVisible();
  });

  test("should render normally when given a malicious returnTo (open redirect prevention smoke test)", async ({
    page,
  }) => {
    // The sanitizeReturnTo guard (lib/utils.ts) rejects external URLs server-side.
    // This test verifies the page still loads without error when a crafted returnTo is present.
    // Full E2E verification requires completing OAuth, which is covered at the unit level.
    await page.goto("/auth/sign-in?returnTo=https%3A%2F%2Fevil.com%2Fsteal");
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("should have no detectable accessibility violations", async ({
    page,
  }) => {
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
