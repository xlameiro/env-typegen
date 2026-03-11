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

  it("should increment the page when the Next button is clicked", () => {
    renderWithNuqs("page=1");
    fireEvent.click(screen.getByRole("button", { name: /next →/i }));
    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });

  it("should decrement the page when the Previous button is clicked on page 2", () => {
    renderWithNuqs("page=2");
    fireEvent.click(screen.getByRole("button", { name: /← previous/i }));
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });

  it("should update the query and reset page to 1 when the user types", () => {
    // Covers handleSearch — setSearch({ q, page: 1 })
    renderWithNuqs("page=3");
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "react" },
    });
    expect(
      screen.getByText(/showing results for "react" \(page 1\)/i),
    ).toBeInTheDocument();
  });
});
