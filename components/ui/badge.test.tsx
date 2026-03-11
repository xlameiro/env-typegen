import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, badgeVariants } from "./badge";

describe("badgeVariants", () => {
  it("should include base classes for every variant", () => {
    const result = badgeVariants({});
    expect(result).toContain("inline-flex");
    expect(result).toContain("rounded-full");
    expect(result).toContain("text-xs");
    expect(result).toContain("font-semibold");
  });

  it("should apply default variant classes when no variant is provided", () => {
    const result = badgeVariants({});
    expect(result).toContain("bg-foreground");
    expect(result).toContain("text-background");
  });

  it.each([
    ["secondary", "bg-secondary", "text-secondary-foreground"],
    ["success", "bg-green-100", "text-green-800"],
    ["warning", "bg-yellow-100", "text-yellow-800"],
    ["danger", "bg-red-100", "text-red-800"],
    ["outline", "border-current", "text-foreground"],
  ] as const)("should apply %s variant classes", (variant, ...expected) => {
    const result = badgeVariants({ variant });
    for (const cls of expected) {
      expect(result).toContain(cls);
    }
  });
});

describe("Badge", () => {
  it("should render a span element", () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText("Label").tagName).toBe("SPAN");
  });

  it("should render children content", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("should apply default variant by default", () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-foreground");
  });

  it.each([
    "default",
    "secondary",
    "success",
    "warning",
    "danger",
    "outline",
  ] as const)("should render %s variant without error", (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>);
    expect(screen.getByText(variant)).toBeInTheDocument();
  });

  it("should merge custom className", () => {
    render(
      <Badge className="custom-class" data-testid="badge">
        Custom
      </Badge>,
    );
    expect(screen.getByTestId("badge").className).toContain("custom-class");
  });

  it("should forward HTML span attributes", () => {
    render(
      <Badge aria-label="status badge" data-testid="badge">
        Status
      </Badge>,
    );
    expect(screen.getByTestId("badge")).toHaveAttribute(
      "aria-label",
      "status badge",
    );
  });
});
