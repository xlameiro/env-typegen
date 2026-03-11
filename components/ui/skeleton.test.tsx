import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("should render with aria-hidden to hide from assistive technology", () => {
    render(<Skeleton />);
    const el = document.querySelector("[aria-hidden]");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("aria-hidden")).toBe("true");
  });

  it("should include pulse animation class by default", () => {
    render(<Skeleton />);
    const el = document.querySelector("[aria-hidden]");
    expect(el?.className).toContain("animate-pulse");
  });

  it("should merge custom className with defaults", () => {
    render(<Skeleton className="h-8 w-24" />);
    const el = document.querySelector("[aria-hidden]");
    expect(el?.className).toContain("animate-pulse");
    expect(el?.className).toContain("h-8");
    expect(el?.className).toContain("w-24");
  });

  it("should render a div element", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });
});
