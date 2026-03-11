import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatsSection, StatsSectionSkeleton } from "./stats-section";

vi.mock("@/lib/stats", () => ({
  getStats: vi.fn().mockResolvedValue([
    {
      label: "Total Revenue",
      value: "$12,345",
      description: "+20% from last month",
    },
    {
      label: "Active Users",
      value: "1,234",
      description: "+5% from last month",
    },
    { label: "New Signups", value: "89", description: "+12% from last month" },
  ]),
}));

describe("StatsSection", () => {
  it("should render the Overview heading", async () => {
    render(await StatsSection());

    expect(
      screen.getByRole("heading", { name: /overview/i }),
    ).toBeInTheDocument();
  });

  it("should render each stat card with label, value, and description", async () => {
    render(await StatsSection());

    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("$12,345")).toBeInTheDocument();
    expect(screen.getByText("+20% from last month")).toBeInTheDocument();

    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();

    expect(screen.getByText("New Signups")).toBeInTheDocument();
  });

  it("should render a list with the correct number of stat items", async () => {
    render(await StatsSection());

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("StatsSectionSkeleton", () => {
  it("should render the skeleton with an accessible label", () => {
    render(<StatsSectionSkeleton />);

    expect(
      screen.getByRole("region", { name: /loading overview stats/i }),
    ).toBeInTheDocument();
  });
});
