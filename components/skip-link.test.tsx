import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkipLink } from "./skip-link";

afterEach(() => {
  document.getElementById("maincontent")?.remove();
});

describe("SkipLink", () => {
  it("should render an anchor element", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toBeInTheDocument();
  });

  it("should have href pointing to #maincontent", () => {
    render(<SkipLink />);
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#maincontent");
  });

  it("should be visually hidden (sr-only) by default", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link.className).toContain("sr-only");
  });

  it("should call focus on #maincontent when clicked", () => {
    const main = document.createElement("main");
    main.id = "maincontent";
    main.tabIndex = -1;
    document.body.appendChild(main);
    const focusSpy = vi.spyOn(main, "focus");

    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    fireEvent.click(link);

    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it("should not throw when #maincontent does not exist", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(() => fireEvent.click(link)).not.toThrow();
  });
});
