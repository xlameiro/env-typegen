import { expect, test } from "@playwright/test";

test.describe("Profile Page — unauthenticated", () => {
  test("should redirect to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test("should include returnTo=/profile in redirect URL", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/returnTo=%2Fprofile/);
  });

  test("should show sign-in page content after redirect", async ({ page }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i }),
    ).toBeVisible();
  });

  test("should show Continue with Google button after redirect", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });
});
