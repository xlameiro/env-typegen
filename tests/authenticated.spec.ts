import { expect, test } from "@playwright/test";

type BrowserCookie = {
  name: string;
};

const AUTH_SESSION_COOKIE_MARKERS = [
  "authjs.session-token",
  "next-auth.session-token",
] as const;

function hasAuthSessionCookie(cookies: BrowserCookie[]): boolean {
  return cookies.some((cookie) =>
    AUTH_SESSION_COOKIE_MARKERS.some((marker) => cookie.name.includes(marker)),
  );
}

test.describe("Authenticated routes", () => {
  test.beforeEach(async ({ page }) => {
    const cookies = await page.context().cookies();

    test.skip(
      !hasAuthSessionCookie(cookies),
      "No authenticated session detected. Implement tests/auth.setup.ts to enable authenticated E2E assertions.",
    );
  });

  test("should redirect authenticated users away from sign-in", async ({
    page,
  }) => {
    await test.step("Navigate to the sign-in route", async () => {
      await page.goto("/auth/sign-in");
    });

    await test.step("Verify proxy redirect for authenticated users", async () => {
      await expect(page).toHaveURL("/");
    });
  });

  test("should avoid redirecting authenticated users back to sign-in from protected routes", async ({
    page,
  }) => {
    await test.step("Navigate to a protected route", async () => {
      await page.goto("/dashboard");
    });

    await test.step("Verify we do not bounce to sign-in when session exists", async () => {
      await expect(page).not.toHaveURL(/\/auth\/sign-in/);
    });
  });
});
