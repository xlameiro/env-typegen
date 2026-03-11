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
  it("should render the page heading", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("heading", { name: /create an account/i }),
    ).toBeInTheDocument();
  });

  it("should render the Google sign-up button", () => {
    render(<SignUpPage />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("should render a link to sign in", () => {
    render(<SignUpPage />);
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });
});
