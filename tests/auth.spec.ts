import { expect, test } from "@playwright/test";

test.describe("Auth — sign-in page", () => {
  test("should render sign-in page directly", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await expect(page).toHaveURL("/auth/sign-in");
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("should include returnTo param preserving the intended destination", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/returnTo=%2Fdashboard/);
  });

  test("should include a link to the sign-up page", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
  });
});

test.describe("Auth — sign-up page", () => {
  test("should render sign-up page directly", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await expect(page).toHaveURL("/auth/sign-up");
    await expect(
      page.getByRole("heading", { name: /create an account/i }),
    ).toBeVisible();
  });

  test("should include a link back to sign-in page", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });
});
