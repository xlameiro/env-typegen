import { expect, test } from "@playwright/test";

test.describe("Auth — unauthenticated redirect", () => {
  test("should redirect /dashboard to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("should redirect /profile to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("should redirect /settings to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("should include returnTo param preserving the intended destination", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/returnTo=%2Fdashboard/);
  });

  test("should show sign-in page content after redirect", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
