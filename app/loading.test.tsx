import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Loading from "./loading";

describe("Loading", () => {
  it("should render a main landmark compatible with the skip link target", () => {
    render(<Loading />);

    const main = screen.getByRole("main");

    expect(main).toHaveAttribute("id", "maincontent");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("should expose a screen-reader loading message", () => {
    render(<Loading />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
