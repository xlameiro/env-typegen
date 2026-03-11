import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("should render the app name as the main heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: APP_NAME }),
    ).toBeInTheDocument();
  });

  it("should render the app description", () => {
    render(<HomePage />);

    expect(screen.getByText(APP_DESCRIPTION)).toBeInTheDocument();
  });

  it("should render the Tech Stack section", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /tech stack/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/next\.js/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/react 19/i).length).toBeGreaterThan(0);
  });

  it("should render the Development Commands section", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /development commands/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("pnpm dev")).toBeInTheDocument();
    expect(screen.getByText("pnpm build")).toBeInTheDocument();
  });

  it("should render the Sign In navigation link", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });
});
