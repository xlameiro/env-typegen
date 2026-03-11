import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "u1", name: "Alice", email: "alice@test.com" },
  }),
}));
vi.mock("./stats-section", () => ({
  StatsSection: () => null,
  StatsSectionSkeleton: () => null,
}));
vi.mock("./dashboard-search", () => ({
  DashboardSearch: () => null,
}));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("should render the dashboard heading", async () => {
    render(await DashboardPage());

    expect(
      screen.getByRole("heading", { name: /welcome back, alice/i }),
    ).toBeInTheDocument();
  });

  it("should render the description text", async () => {
    render(await DashboardPage());

    expect(screen.getByText(/this is your dashboard/i)).toBeInTheDocument();
  });

  it("should render without a name when user has no name", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: { id: "u2", email: "anon@test.com" },
    } as never);

    render(await DashboardPage());

    expect(
      screen.getByRole("heading", { name: /welcome back$/i }),
    ).toBeInTheDocument();
  });
});
