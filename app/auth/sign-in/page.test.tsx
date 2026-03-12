import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock @/auth to avoid NextAuth initialization in tests
vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import SignInPage from "./page";
import { sanitizeReturnTo } from "./page";

describe("SignInPage", () => {
  async function renderPage(returnTo?: string) {
    const searchParams = Promise.resolve({ returnTo });
    const jsx = await SignInPage({ searchParams });
    render(jsx);
  }

  it("should render the page heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { name: /sign in to your account/i }),
    ).toBeInTheDocument();
  });

  it("should render the Google sign-in button", async () => {
    await renderPage();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("should render a link to sign up", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });

  it("should render with a valid returnTo param", async () => {
    await renderPage("/dashboard");
    expect(
      screen.getByRole("heading", { name: /sign in to your account/i }),
    ).toBeInTheDocument();
  });
});

describe("sanitizeReturnTo", () => {
  it("should return the path when it is a valid relative URL", () => {
    expect(sanitizeReturnTo("/dashboard")).toBe("/dashboard");
  });

  it("should return the dashboard route when given an absolute URL (open redirect attempt)", () => {
    expect(sanitizeReturnTo("https://evil.com/steal")).toBe("/dashboard");
  });

  it("should return the dashboard route when given a protocol-relative URL (open redirect attempt)", () => {
    expect(sanitizeReturnTo("//evil.com")).toBe("/dashboard");
  });

  it("should return the dashboard route when given an empty string", () => {
    expect(sanitizeReturnTo("")).toBe("/dashboard");
  });

  it("should return the dashboard route when given undefined", () => {
    expect(sanitizeReturnTo(undefined)).toBe("/dashboard");
  });
});
