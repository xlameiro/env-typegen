import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ButtonLink } from "./button-link";

describe("ButtonLink", () => {
  it("should render an anchor element", () => {
    render(<ButtonLink href="/">Go Home</ButtonLink>);
    const link = screen.getByRole("link", { name: "Go Home" });
    expect(link).toBeDefined();
    expect(link.tagName.toLowerCase()).toBe("a");
  });

  it("should apply button variant classes by default", () => {
    render(<ButtonLink href="/">Home</ButtonLink>);
    const link = screen.getByRole("link", { name: "Home" });
    expect(link.className).toContain("bg-foreground");
    expect(link.className).toContain("text-background");
    expect(link.className).toContain("inline-flex");
  });

  it("should apply secondary variant classes when specified", () => {
    render(
      <ButtonLink href="/auth/sign-in" variant="secondary">
        Settings
      </ButtonLink>,
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("bg-secondary");
  });

  it("should apply outline variant classes when specified", () => {
    render(
      <ButtonLink href="/auth/sign-in" variant="outline">
        Sign In
      </ButtonLink>,
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("border");
    expect(link.className).toContain("bg-transparent");
  });

  it("should apply sm size classes when specified", () => {
    render(
      <ButtonLink href="/auth/sign-up" size="sm">
        Profile Small
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Profile Small" });
    expect(link.className).toContain("h-8");
    expect(link.className).toContain("px-3");
  });

  it("should apply lg size classes when specified", () => {
    render(
      <ButtonLink href="/auth/sign-up" size="lg">
        Get Started
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Get Started" });
    expect(link.className).toContain("h-12");
    expect(link.className).toContain("px-6");
  });

  it("should merge custom className with variant classes", () => {
    render(
      <ButtonLink href="/" className="mt-4">
        Profile Custom
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Profile Custom" });
    expect(link.className).toContain("mt-4");
    expect(link.className).toContain("bg-foreground");
  });

  it("should set the href attribute correctly", () => {
    render(<ButtonLink href="/auth/sign-in">Sign In Link</ButtonLink>);
    const link = screen.getByRole("link", { name: "Sign In Link" });
    expect(link.getAttribute("href")).toBe("/auth/sign-in");
  });

  it("should render children content", () => {
    render(<ButtonLink href="/">Home</ButtonLink>);
    expect(screen.getByText("Home")).toBeDefined();
  });

  it("should accept external URLs via WithProtocol", () => {
    render(
      <ButtonLink
        href="https://nextjs.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        Next.js docs
      </ButtonLink>,
    );
    const link = screen.getByRole("link", { name: "Next.js docs" });
    expect(link.getAttribute("href")).toBe("https://nextjs.org");
  });
});
