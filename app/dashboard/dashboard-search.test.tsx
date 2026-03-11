import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { DashboardSearch } from "./dashboard-search";

function renderWithNuqs(searchString = "") {
  return render(
    <NuqsTestingAdapter searchParams={new URLSearchParams(searchString)}>
      <DashboardSearch />
    </NuqsTestingAdapter>,
  );
}

describe("DashboardSearch", () => {
  it("should render the search input", () => {
    renderWithNuqs();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("should show placeholder text when empty", () => {
    renderWithNuqs();
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
  });

  it("should display the default hint text when no search query", () => {
    renderWithNuqs();
    expect(screen.getByText(/type to search/i)).toBeInTheDocument();
  });

  it("should display a results message when a query is present", () => {
    renderWithNuqs("q=hello&page=2");
    expect(
      screen.getByText(/showing results for "hello" \(page 2\)/i),
    ).toBeInTheDocument();
  });

  it("should render Previous and Next pagination buttons", () => {
    renderWithNuqs();
    expect(
      screen.getByRole("button", { name: /← previous/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next →/i })).toBeInTheDocument();
  });

  it("should disable the Previous button on page 1", () => {
    renderWithNuqs("page=1");
    expect(screen.getByRole("button", { name: /← previous/i })).toBeDisabled();
  });

  it("should enable the Previous button on page 2", () => {
    renderWithNuqs("page=2");
    expect(
      screen.getByRole("button", { name: /← previous/i }),
    ).not.toBeDisabled();
  });

  it("should update the search query when the user types", () => {
    renderWithNuqs();
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "react" } });
    // After typing, the results message should update
    expect(
      screen.getByText(/showing results for "react"/i),
    ).toBeInTheDocument();
  });
});
