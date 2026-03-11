import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "u1", name: "Alice", email: "alice@test.com" },
  }),
}));
vi.mock("./theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("should render the Settings heading", async () => {
    render(await SettingsPage());

    expect(
      screen.getByRole("heading", { name: /^settings$/i }),
    ).toBeInTheDocument();
  });

  it("should render the ThemeToggle component", async () => {
    render(await SettingsPage());

    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("should call requireAuth to protect the page", async () => {
    const { requireAuth } = await import("@/lib/auth");

    await SettingsPage();

    expect(vi.mocked(requireAuth)).toHaveBeenCalled();
  });
});
