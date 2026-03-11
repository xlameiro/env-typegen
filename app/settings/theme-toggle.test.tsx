import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/store/use-app-store";
import { ThemeToggle } from "./theme-toggle";

beforeEach(() => {
  useAppStore.setState({ theme: "system" });
});

describe("ThemeToggle", () => {
  it("should render all three theme buttons", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "System" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
  });

  it("should mark the active theme button as pressed", () => {
    useAppStore.setState({ theme: "light" });
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("should update the store theme when a button is clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    expect(useAppStore.getState().theme).toBe("dark");
  });

  it("should switch from dark to light when light is clicked", () => {
    useAppStore.setState({ theme: "dark" });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    expect(useAppStore.getState().theme).toBe("light");
  });

  it("should render with accessible section label", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("heading", { name: /theme/i })).toBeInTheDocument();
  });
});
