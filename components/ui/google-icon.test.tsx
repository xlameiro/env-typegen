import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoogleIcon } from "./google-icon";

describe("GoogleIcon", () => {
  it("should render an SVG element", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should have aria-hidden set to true (decorative icon)", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("should render with correct dimensions", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "18");
  });

  it("should render four path elements (Google logo colors)", () => {
    const { container } = render(<GoogleIcon />);
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(4);
  });

  it("should include the Google brand blue path", () => {
    const { container } = render(<GoogleIcon />);
    const paths = container.querySelectorAll("path");
    const fills = Array.from(paths).map((p) => p.getAttribute("fill"));
    expect(fills).toContain("#4285F4");
  });
});
