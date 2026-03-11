import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

import AuthErrorPage from "./page";

describe("AuthErrorPage", () => {
  async function renderPage(error?: string) {
    const searchParams = Promise.resolve({ error });
    const jsx = await AuthErrorPage({ searchParams });
    render(jsx);
  }

  it("should render the heading", async () => {
    await renderPage();
    expect(
      screen.getByRole("heading", { name: /sign in failed/i }),
    ).toBeInTheDocument();
  });

  it("should show the default error message when no error param", async () => {
    await renderPage();
    expect(
      screen.getByText(/unexpected authentication error/i),
    ).toBeInTheDocument();
  });

  it("should show 'Configuration' error message", async () => {
    await renderPage("Configuration");
    expect(
      screen.getByText(/problem with the server configuration/i),
    ).toBeInTheDocument();
  });

  it("should show 'AccessDenied' error message", async () => {
    await renderPage("AccessDenied");
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });

  it("should show 'Verification' error message", async () => {
    await renderPage("Verification");
    expect(
      screen.getByText(/sign-in link is no longer valid/i),
    ).toBeInTheDocument();
  });

  it("should show the default message for an unknown error code", async () => {
    await renderPage("SomethingElse");
    expect(
      screen.getByText(/unexpected authentication error/i),
    ).toBeInTheDocument();
  });

  it("should render a link back to sign in", async () => {
    await renderPage();
    expect(
      screen.getByRole("link", { name: /back to sign in/i }),
    ).toBeInTheDocument();
  });
});
