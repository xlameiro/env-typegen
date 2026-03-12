import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

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

import SignUpPage from "./page";

describe("SignUpPage", () => {
  async function renderPage(returnTo?: string) {
    const searchParams = Promise.resolve({ returnTo });
    const jsx = await SignUpPage({ searchParams });
    render(jsx);
  }

  it("should render the page heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { name: /create an account/i }),
    ).toBeInTheDocument();
  });

  it("should render the Google sign-up button", async () => {
    await renderPage();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("should render a link to sign in", async () => {
    await renderPage();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("should render with a valid returnTo param", async () => {
    await renderPage("/dashboard");
    expect(
      screen.getByRole("heading", { name: /create an account/i }),
    ).toBeInTheDocument();
  });
});
